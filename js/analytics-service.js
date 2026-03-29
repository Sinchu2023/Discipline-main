class AnalyticsService {
        static buildMonthlyReport(
          tasks,
          year,
          month,
          thresholdMinutes = CONFIG.DAILY_PRODUCTIVITY_THRESHOLD_MINUTES,
        ) {
          const monthTasks = tasks.filter((t) => {
            const d = new Date(t.startTime);
            return d.getFullYear() === year && d.getMonth() === month;
          });
          const pm = month === 0 ? 11 : month - 1;
          const py = month === 0 ? year - 1 : year;
          const prevTasks = tasks.filter((t) => {
            const d = new Date(t.startTime);
            return d.getFullYear() === py && d.getMonth() === pm;
          });
          const totals = Object.fromEntries(
            Object.keys(CATEGORY_DEFINITIONS).map((c) => [c, 0]),
          );
          const daily = {};
          const daysInMonth = new Date(year, month + 1, 0).getDate();

          for (let day = 1; day <= daysInMonth; day++) {
            const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            daily[date] = {
              productive: 0,
              sleep: 0,
              waste: 0,
              total: 0,
              inferredWaste: 0,
            };
          }

          monthTasks.forEach((t) => {
            totals[t.category] = (totals[t.category] || 0) + t.duration;
            const day =
              daily[t.date] ||
              (daily[t.date] = {
                productive: 0,
                sleep: 0,
                waste: 0,
                total: 0,
                inferredWaste: 0,
              });
            if (PRODUCTIVE_CATEGORIES.has(t.category))
              day.productive += t.duration;
            if (t.category === "Sleep") day.sleep += t.duration;
            if (t.category === "Time Waste / Distraction")
              day.waste += t.duration;
            day.total += t.duration;
          });

          let inferredWasteMinutes = 0;
          Object.values(daily).forEach((day) => {
            const inferredWaste = Math.max(0, 1440 - Math.min(1440, day.total));
            day.inferredWaste = inferredWaste;
            day.waste += inferredWaste;
            day.total += inferredWaste;
            inferredWasteMinutes += inferredWaste;
          });
          totals["Time Waste / Distraction"] =
            (totals["Time Waste / Distraction"] || 0) + inferredWasteMinutes;

          const totalMinutes = Object.values(totals).reduce((a, b) => a + b, 0);
          const productiveMinutes = Object.entries(totals)
            .filter(([k]) => PRODUCTIVE_CATEGORIES.has(k))
            .reduce((a, [, v]) => a + v, 0);
          const sleepMinutes = totals["Sleep"] || 0;
          const wasteMinutes = totals["Time Waste / Distraction"] || 0;
          const awakeMinutes = Math.max(0, totalMinutes - sleepMinutes);
          const activeDays = (() => {
            const now = new Date();
            if (now.getFullYear() === year && now.getMonth() === month) {
              return Math.max(1, now.getDate()); // elapsed days this month
            }
            return Math.max(1, daysInMonth);
          })();
          const productivityRatio = awakeMinutes
            ? productiveMinutes / awakeMinutes
            : 0;
          const pctByCategory = Object.fromEntries(
            Object.keys(totals).map((k) => [
              k,
              totalMinutes ? (totals[k] / totalMinutes) * 100 : 0,
            ]),
          );
          const bestProductiveDay =
            Object.entries(daily).sort(
              (a, b) => b[1].productive - a[1].productive,
            )[0] || null;
          const worstWasteDay =
            Object.entries(daily).sort((a, b) => b[1].waste - a[1].waste)[0] ||
            null;
          const sleepStreak = AnalyticsService.longestSleepConsistencyStreak(
            daily,
            420,
          );
          const underProductiveDays = Object.entries(daily).filter(
            ([, v]) => v.productive < thresholdMinutes,
          ).length;
          const prevProductive = prevTasks
            .filter((t) => PRODUCTIVE_CATEGORIES.has(t.category))
            .reduce((a, t) => a + t.duration, 0);
          const prevDaysInMonth = new Date(py, pm + 1, 0).getDate();
          const prevDailyTotals = {};
          for (let day = 1; day <= prevDaysInMonth; day++) {
            const date = `${py}-${String(pm + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            prevDailyTotals[date] = 0;
          }
          prevTasks.forEach((t) => {
            prevDailyTotals[t.date] =
              (prevDailyTotals[t.date] || 0) + t.duration;
          });
          const prevInferredWaste = Object.values(prevDailyTotals).reduce(
            (sum, tracked) => sum + Math.max(0, 1440 - Math.min(1440, tracked)),
            0,
          );
          const prevWaste =
            prevTasks
              .filter((t) => t.category === "Time Waste / Distraction")
              .reduce((a, t) => a + t.duration, 0) + prevInferredWaste;
          const productiveBreakdown = AnalyticsService.breakdown(
            monthTasks,
            "Productive Work",
          );
          const trainingBreakdown = AnalyticsService.breakdown(
            monthTasks,
            "Physical Training",
          );
          return {
            year,
            month,
            totals,
            totalMinutes,
            productiveMinutes,
            sleepMinutes,
            wasteMinutes,
            inferredWasteMinutes,
            awakeMinutes,
            pctByCategory,
            dailyAverageSleep: sleepMinutes / activeDays,
            dailyAverageProductive: productiveMinutes / activeDays,
            productivityRatio,
            daily,
            productiveBreakdown,
            trainingBreakdown,
            bestProductiveDay,
            worstWasteDay,
            sleepConsistency: { longestStreakDays: sleepStreak },
            alerts: {
              underProductivity:
                productiveMinutes < thresholdMinutes * activeDays,
              underProductiveDays,
              thresholdMinutes,
            },
            improvement: {
              productiveDeltaMinutes: productiveMinutes - prevProductive,
              wasteDeltaMinutes: wasteMinutes - prevWaste,
            },
          };
        }
        static breakdown(tasks, category) {
          const out = {};
          tasks
            .filter((t) => t.category === category)
            .forEach(
              (t) =>
                (out[t.subcategory] = (out[t.subcategory] || 0) + t.duration),
            );
          return out;
        }
        static longestSleepConsistencyStreak(daily, targetMin) {
          const days = Object.keys(daily).sort();
          let best = 0;
          let run = 0;
          days.forEach((d) => {
            if ((daily[d].sleep || 0) >= targetMin) {
              run += 1;
              best = Math.max(best, run);
            } else run = 0;
          });
          return best;
        }

        static buildYearlyReport(tasks, year) {
          const yearTasks = tasks.filter((t) => {
            const d = new Date(t.startTime);
            return d.getFullYear() === year;
          });

          const monthlyData = Array.from({ length: 12 }, (_, i) => ({
            month: i,
            productive: 0,
            sleep: 0,
            waste: 0,
          }));

          const daily = {};
          
          yearTasks.forEach((t) => {
            const d = new Date(t.startTime);
            const m = d.getMonth();
            const dateStr = t.date;

            if (!daily[dateStr]) {
              daily[dateStr] = { productive: 0, sleep: 0, waste: 0, total: 0 };
            }

            if (PRODUCTIVE_CATEGORIES.has(t.category)) {
              monthlyData[m].productive += t.duration;
              daily[dateStr].productive += t.duration;
            } else if (t.category === "Sleep") {
              monthlyData[m].sleep += t.duration;
              daily[dateStr].sleep += t.duration;
            } else if (t.category === "Time Waste / Distraction") {
              monthlyData[m].waste += t.duration;
              daily[dateStr].waste += t.duration;
            }
            daily[dateStr].total += t.duration;
          });

          // Inferred waste
          let totalInferredWaste = 0;
          Object.values(daily).forEach((day) => {
            const inferred = Math.max(0, 1440 - Math.min(1440, day.total));
            day.waste += inferred;
            day.total += inferred;
            totalInferredWaste += inferred;
          });

          const totalProductive = monthlyData.reduce((a, b) => a + b.productive, 0);
          const totalSleep = monthlyData.reduce((a, b) => a + b.sleep, 0);
          const totalWaste = monthlyData.reduce((a, b) => a + b.waste, 0) + totalInferredWaste;

          // Golden Month
          const goldenMonth = [...monthlyData]
            .map(m => ({
                ...m,
                ratio: m.productive / Math.max(1, (m.productive + m.waste))
            }))
            .sort((a, b) => b.ratio - a.ratio)[0];

          // Most Focused Category
          const focusedBreakdown = AnalyticsService.breakdown(yearTasks, "Productive Work");
          const topCategory = Object.entries(focusedBreakdown).sort((a, b) => b[1] - a[1])[0];

          // Iron Streak
          let currentStreak = 0;
          let maxStreak = 0;
          const sortedDates = Object.keys(daily).sort();
          sortedDates.forEach((date) => {
            if (daily[date].productive >= CONFIG.DAILY_PRODUCTIVITY_THRESHOLD_MINUTES) {
              currentStreak++;
              maxStreak = Math.max(maxStreak, currentStreak);
            } else {
              currentStreak = 0;
            }
          });

          // Sleep vs Work Correlation
          const correlations = [];
          for (let i = 0; i < sortedDates.length - 1; i++) {
            correlations.push({
              sleep: daily[sortedDates[i]].sleep,
              productiveNextDay: daily[sortedDates[i + 1]].productive,
            });
          }

          // Growth Score (H2 vs H1)
          const h1Prod = monthlyData.slice(0, 6).reduce((a, b) => a + b.productive, 0);
          const h2Prod = monthlyData.slice(6).reduce((a, b) => a + b.productive, 0);
          const growthScore = h1Prod > 0 ? ((h2Prod - h1Prod) / h1Prod) * 100 : 0;

          // Gateway Activities
          const gateways = {};
          const sortedTasks = [...yearTasks].sort((a, b) => a.startTime - b.startTime);
          for (let i = 0; i < sortedTasks.length - 1; i++) {
            const curr = sortedTasks[i];
            const next = sortedTasks[i+1];
            if (PRODUCTIVE_CATEGORIES.has(curr.category) && next.category === "Time Waste / Distraction") {
              const key = `${curr.subcategory} → ${next.subcategory}`;
              gateways[key] = (gateways[key] || 0) + 1;
            }
          }
          const topGateways = Object.entries(gateways).sort((a, b) => b[1] - a[1]).slice(0, 5);

          return {
            year,
            totalProductive,
            totalSleep,
            totalWaste,
            totalMinutes: totalProductive + totalSleep + totalWaste,
            monthlyData,
            daily,
            goldenMonth,
            topCategory,
            ironStreak: maxStreak,
            correlations,
            growthScore,
            topGateways
          };
        }

        static buildSleepInsights(tasks) {
          const today = new Date();
          const daily = new Map();
          for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            daily.set(
              `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
              0,
            );
          }
          tasks.forEach((t) => {
            if (t.category !== "Sleep") return;
            if (daily.has(t.date))
              daily.set(t.date, daily.get(t.date) + t.duration);
          });
          const values = [...daily.values()];
          const avg =
            values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);
          const target = 480;
          const debt = target - avg;
          const variance =
            values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) /
            Math.max(values.length, 1);
          const std = Math.sqrt(variance);
          let consistency = "High";
          if (std > 90) consistency = "Low";
          else if (std > 45) consistency = "Moderate";
          return { averageLast7: avg, sleepDebt: debt, consistency, values };
        }
      }
