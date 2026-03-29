class UIManager {
        constructor(app) {
          this.app = app;
          this.currentMotivationIndex = 0;
        }
        initialize() {
    try {
      console.group('UIManager Initialization');

          this.updateDateTime();
          this.startMotivationRotation();
    } catch (error) {
      console.error('[UIManager] Initialization failed:', error);
    } finally {
      console.groupEnd();
    }
        }
        updateDateTime() {
          const updateTime = () => {
            const now = new Date();
            const dEl = this.app.elements["current-date"];
            if (dEl) {
              dEl.textContent =
                now.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
            }
            const tEl = this.app.elements["current-time"];
            if (tEl) {
              tEl.textContent =
                now.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });
            }
          };
          updateTime();
          setInterval(updateTime, 1000);
        }
        startMotivationRotation() {
          this.updateMotivation();
          setInterval(
            () => this.updateMotivation(),
            CONFIG.MOTIVATION_INTERVAL,
          );
        }
        updateMotivation() {
          const e = this.app.elements["motivation-line"];
          if (e) e.style.opacity = "0";
          setTimeout(() => {
            let n;
            do {
              n = Math.floor(Math.random() * MOTIVATION_LINES.length);
            } while (
              n === this.currentMotivationIndex &&
              MOTIVATION_LINES.length > 1
            );
            this.currentMotivationIndex = n;
            if (e) {
              e.textContent = MOTIVATION_LINES[n];
              e.style.opacity = "1";
            }
          }, 500);
        }
        showStreakPopup() {
          const streak = this.app.state.streak;
          const countEl = this.app.elements["streak-count"];
          if (countEl) countEl.textContent = streak;
          
          const msgEl = this.app.elements["streak-message"];
          if (msgEl) msgEl.textContent = STREAK_MESSAGES[streak] || `${streak} days strong. Keep going.`;
          
          const popup = this.app.elements["streak-popup"];
          if (popup) popup.style.display = "flex";
        }
        hideStreakPopup() {
          const popup = this.app.elements["streak-popup"];
          if (popup) popup.style.display = "none";
        }
        showYearlyReport(year = new Date().getFullYear()) {
          const r = AnalyticsService.buildYearlyReport(this.app.state.tasks, year);
          
          // 1. Total Dashboard Header
          const growthColor = r.growthScore >= 0 ? "var(--success)" : "var(--danger)";
          const growthIcon = r.growthScore >= 0 ? "fa-arrow-up" : "fa-arrow-down";
          
          const dashboardHtml = `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:2rem;">
              <div class="stat-card">
                <div class="stat-label">Total Annual Productive</div>
                <div class="stat-value stat-productive">${this.app.formatDuration(r.totalProductive)}</div>
                <div style="font-size:0.85rem; color:${growthColor};"><i class="fas ${growthIcon}"></i> ${Math.abs(r.growthScore).toFixed(1)}% vs H1</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total Annual Sleep</div>
                <div class="stat-value stat-sleep">${this.app.formatDuration(r.totalSleep)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Iron Streak</div>
                <div class="stat-value stat-streak">${r.ironStreak} Days</div>
                <div class="stat-label">Longest Consistent Focus</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Annual Efficiency</div>
                <div class="stat-value stat-total">${((r.totalProductive / Math.max(1, r.totalMinutes - r.totalSleep)) * 100).toFixed(1)}%</div>
              </div>
            </div>
          `;

          // 2. Heatmap Rendering (365 Days)
          const heatmapHtml = this.renderYearlyHeatmap(r.daily, year);

          // 3. Monthly Trend Chart (SVG)
          const trendHtml = this.renderMonthlyTrend(r.monthlyData);

          // 4. Hall of Fame & Gateway
          const goldenMonthName = new Date(year, r.goldenMonth?.month || 0).toLocaleString("default", { month: "long" });
          const hallOfFameHtml = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; margin-top:2rem;">
              <div class="stat-card" style="background:rgba(255,193,7,0.05); border-color:rgba(255,193,7,0.2);">
                <h4 style="color:var(--warning); margin-bottom:1rem;"><i class="fas fa-crown"></i> Hall of Fame</h4>
                <div style="margin-bottom:0.8rem;"><strong>Golden Month:</strong> ${goldenMonthName} (${(r.goldenMonth?.ratio * 100).toFixed(1)}%)</div>
                <div style="margin-bottom:0.8rem;"><strong>Most Focused Area:</strong> ${r.topCategory ? r.topCategory[0] : "N/A"}</div>
                <div><strong>Annual Productivity:</strong> ${Math.round(r.totalProductive / 60)} Hours</div>
              </div>
              <div class="stat-card" style="background:rgba(220,53,45,0.05); border-color:rgba(220,53,45,0.2);">
                <h4 style="color:var(--danger); margin-bottom:1rem;"><i class="fas fa-biohazard"></i> Gateway Activities</h4>
                <ul style="list-style:none; font-size:0.9rem;">
                  ${r.topGateways.map(([name, count]) => `<li style="margin-bottom:0.4rem; color:var(--text-secondary);">${name} <span style="float:right; color:var(--danger);">${count}x</span></li>`).join("")}
                </ul>
              </div>
            </div>
          `;

          // 5. Correlation Analysis
          const correlationHtml = `
            <div style="margin-top:2rem; padding:1.5rem; background:rgba(255,255,255,0.03); border-radius:12px; border:1px solid var(--border);">
              <h4 style="margin-bottom:1rem;"><i class="fas fa-project-diagram"></i> Sleep vs. Productivity Correlation</h4>
              <p style="font-size:0.85rem; color:var(--text-tertiary); margin-bottom:1rem;">Analyzing how your sleep on Night N impacts your productive focus on Day N+1.</p>
              ${this.renderCorrelationChart(r.correlations)}
            </div>
          `;

          const contentEl = this.app.elements["report-content"];
          if (contentEl) {
            contentEl.innerHTML = `
              <h2 style="margin-bottom:1.5rem; border-bottom:1px solid var(--border); padding-bottom:0.5rem;">${year} Annual Performance Audit</h2>
              ${dashboardHtml}
              <h4 style="margin-bottom:1rem;"><i class="fas fa-th"></i> 365-Day Productivity Heatmap</h4>
              ${heatmapHtml}
              <h4 style="margin-top:2rem; margin-bottom:1rem;"><i class="fas fa-chart-bar"></i> Monthly Productivity Trends</h4>
              ${trendHtml}
              ${hallOfFameHtml}
              ${correlationHtml}
            `;
          }

          const modal = this.app.elements["report-modal"];
          if (modal) {
            modal.style.display = "flex";
            // Scroll to top
            modal.querySelector(".modal").scrollTop = 0;
          }
        }

        renderYearlyHeatmap(daily, year) {
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const daysPerRow = 7;
          const cellSize = 12;
          const gap = 3;
          
          let svgContent = "";
          
          // Generate days of the year
          const startDate = new Date(year, 0, 1);
          const startDayOfWeek = startDate.getDay(); // 0(Sun) to 6(Sat)
          
          // We'll align it so each column is a week
          // GitHub style: Rows = Day of week (Sun-Sat), Columns = Weeks
          
          for (let week = 0; week <= 53; week++) {
            for (let day = 0; day < 7; day++) {
              const currentDayOffset = week * 7 + day - startDayOfWeek;
              const d = new Date(year, 0, 1 + currentDayOffset);
              
              if (d.getFullYear() !== year) continue;
              
              const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              const data = daily[dateStr] || { productive: 0 };
              const hours = data.productive / 60;
              
              let color = "rgba(42, 42, 42, 0.4)"; // Empty
              if (hours > 0) color = "rgba(40, 167, 69, 0.2)";
              if (hours >= 2) color = "rgba(40, 167, 69, 0.4)";
              if (hours >= 4) color = "rgba(40, 167, 69, 0.7)";
              if (hours >= 7) color = "rgba(40, 167, 69, 1.0)";
              
              const x = week * (cellSize + gap);
              const y = day * (cellSize + gap);
              
              svgContent += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${color}" rx="2" title="${dateStr}: ${hours.toFixed(1)}h">
                <title>${dateStr}: ${hours.toFixed(1)}h</title>
              </rect>`;
            }
          }
          
          return `
            <div style="overflow-x:auto; padding:10px; background:rgba(0,0,0,0.2); border-radius:8px;">
              <svg width="${54 * (cellSize + gap)}" height="${7 * (cellSize + gap)}" style="display:block;">
                ${svgContent}
              </svg>
            </div>
          `;
        }

        renderMonthlyTrend(monthlyData) {
          const maxProd = Math.max(...monthlyData.map(m => m.productive), 1);
          const height = 150;
          const barWidth = 40;
          const gap = 15;
          const totalWidth = 12 * (barWidth + gap);
          
          let bars = "";
          monthlyData.forEach((m, i) => {
            const h = (m.productive / maxProd) * height;
            const x = i * (barWidth + gap);
            const y = height - h;
            const monthLabel = new Date(2024, i).toLocaleString("default", { month: "short" });
            
            bars += `
              <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="var(--primary)" rx="4" opacity="0.8">
                <title>${this.app.formatDuration(m.productive)}</title>
              </rect>
              <text x="${x + barWidth/2}" y="${height + 15}" fill="var(--text-tertiary)" font-size="10" text-anchor="middle">${monthLabel}</text>
            `;
          });
          
          return `
            <div style="overflow-x:auto; padding:20px 0;">
              <svg width="${totalWidth}" height="${height + 25}" style="overflow:visible;">
                ${bars}
              </svg>
            </div>
          `;
        }

        renderCorrelationChart(correlations) {
          // Simple visualization: Group sleep into bands and show average productive next day
          const bands = {
             "<5h": { sum: 0, count: 0 },
             "5-6h": { sum: 0, count: 0 },
             "6-7h": { sum: 0, count: 0 },
             "7-8h": { sum: 0, count: 0 },
             ">8h": { sum: 0, count: 0 }
          };
          
          correlations.forEach(c => {
            const h = c.sleep / 60;
            let band = "";
            if (h < 5) band = "<5h";
            else if (h < 6) band = "5-6h";
            else if (h < 7) band = "6-7h";
            else if (h < 8) band = "7-8h";
            else band = ">8h";
            
            bands[band].sum += c.productiveNextDay;
            bands[band].count++;
          });
          
          const rows = Object.entries(bands).map(([label, data]) => {
            const avg = data.count > 0 ? data.sum / data.count : 0;
            const width = Math.min(100, (avg / 600) * 100); // Scale to 10h (600m)
            return `
              <div style="margin-bottom:0.8rem;">
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.3rem;">
                  <span>${label} Sleep</span>
                  <span>${this.app.formatDuration(avg)} productive focus</span>
                </div>
                <div style="height:6px; background:var(--border); border-radius:3px; overflow:hidden;">
                  <div style="width:${width}%; height:100%; background:var(--primary); transition:width 1s ease;"></div>
                </div>
              </div>
            `;
          }).join("");
          
          return `<div>${rows}</div>`;
        }

        showReport() {
          const now = new Date();
          const r = AnalyticsService.buildMonthlyReport(
            this.app.state.tasks,
            now.getFullYear(),
            now.getMonth(),
          );
          const monthName = now.toLocaleString("default", { month: "long" });
          const rows = Object.keys(r.daily)
            .sort()
            .map((date) => {
              const d = r.daily[date];
              return `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(d.productive)}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(d.sleep)}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(d.waste)}</td></tr>`;
            })
            .join("");
          const catRows = Object.entries(r.totals)
            .map(
              ([k, v]) =>
                `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${k}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(v)}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${r.pctByCategory[k].toFixed(1)}%</td></tr>`,
            )
            .join("");
          const prodBreak =
            Object.entries(r.productiveBreakdown)
              .map(
                ([k, v]) =>
                  `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${k}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(v)}</td></tr>`,
              )
              .join("") ||
            '<tr><td style="padding:0.75rem;" colspan="2">No entries</td></tr>';
          const trainBreak =
            Object.entries(r.trainingBreakdown)
              .map(
                ([k, v]) =>
                  `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${k}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(v)}</td></tr>`,
              )
              .join("") ||
            '<tr><td style="padding:0.75rem;" colspan="2">No entries</td></tr>';
          const best = r.bestProductiveDay
            ? `${r.bestProductiveDay[0]} (${this.app.formatDuration(r.bestProductiveDay[1].productive)})`
            : "N/A";
          const worst = r.worstWasteDay
            ? `${r.worstWasteDay[0]} (${this.app.formatDuration(r.worstWasteDay[1].waste)})`
            : "N/A";
          const sleepInsights = AnalyticsService.buildSleepInsights(
            this.app.state.tasks,
          );
          const summaryRows = [
            ["Total Sleep", this.app.formatDuration(r.sleepMinutes)],
            ["Total Productive", this.app.formatDuration(r.productiveMinutes)],
            [
              "Total Waste",
              `${this.app.formatDuration(r.wasteMinutes)} (Untracked: ${this.app.formatDuration(r.inferredWasteMinutes)})`,
            ],
            ["Total Awake", this.app.formatDuration(r.awakeMinutes)],
            [
              "Productivity Ratio",
              `${(r.productivityRatio * 100).toFixed(1)}%`,
            ],
            ["Daily Avg Sleep", this.app.formatDuration(r.dailyAverageSleep)],
            [
              "Daily Avg Productive",
              this.app.formatDuration(r.dailyAverageProductive),
            ],
            [
              "Improvement vs Previous Month",
              `Productive ${this.app.formatDuration(r.improvement.productiveDeltaMinutes)} | Waste ${this.app.formatDuration(r.improvement.wasteDeltaMinutes)}`,
            ],
            ["Best Productive Day", best],
            ["Worst Waste Day", worst],
            [
              "Sleep Consistency",
              `Longest >=7h streak: ${r.sleepConsistency.longestStreakDays} days`,
            ],
            [
              "Sleep Last 7 Days",
              `Avg ${this.app.formatDuration(sleepInsights.averageLast7)} | ${sleepInsights.sleepDebt > 0 ? `Debt ${this.app.formatDuration(sleepInsights.sleepDebt)}` : `Surplus ${this.app.formatDuration(Math.abs(sleepInsights.sleepDebt))}`} | Consistency ${sleepInsights.consistency}`,
            ],
            [
              "Alerts",
              r.alerts.underProductivity
                ? `Under productivity (${r.alerts.underProductiveDays} days below ${this.app.formatDuration(r.alerts.thresholdMinutes)})`
                : "None",
            ],
          ]
            .map(
              ([label, value]) =>
                `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);font-weight:600;">${label}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${value}</td></tr>`,
            )
            .join("");
          const contentEl = this.app.elements["report-content"];
          if (contentEl) {
            contentEl.innerHTML = `
            <h3 style="margin-bottom:1rem;">${monthName} ${r.year} Monthly Report</h3>
            <h4 style="margin-top:1rem;">Summary</h4>
            <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><tbody>${summaryRows}</tbody></table></div>
            <h4 style="margin-top:1rem;">Category Totals</h4>
            <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Category</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Duration</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Share</th></tr></thead><tbody>${catRows}</tbody></table></div>
            <h4 style="margin-top:1rem;">Productive Work Breakdown</h4>
            <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Subcategory</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Duration</th></tr></thead><tbody>${prodBreak}</tbody></table></div>
            <h4 style="margin-top:1rem;">Physical Training Breakdown</h4>
            <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Subcategory</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Duration</th></tr></thead><tbody>${trainBreak}</tbody></table></div>
            <h4>Daily Breakdown</h4>
            <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Date</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Productive</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Sleep</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Total Waste</th></tr></thead><tbody>${rows}</tbody></table></div>`;
          }
          
          const modal = this.app.elements["report-modal"];
          if (modal) modal.style.display = "flex";
        }
        hideReport() {
          const modal = this.app.elements["report-modal"];
          if (modal) modal.style.display = "none";
        }
        exportData() {
          const now = new Date();
          const report = AnalyticsService.buildMonthlyReport(
            this.app.state.tasks,
            now.getFullYear(),
            now.getMonth(),
          );
          const csvContent = [
            [
              "Date",
              "Category",
              "Subcategory",
              "Start Time",
              "End Time",
              "Duration (minutes)",
              "Description",
            ].join(","),
            ...this.app.state.tasks.map((task) =>
              [
                task.date,
                `"${task.category}"`,
                `"${task.subcategory}"`,
                new Date(task.startTime).toLocaleString(),
                new Date(task.endTime).toLocaleString(),
                task.duration,
                `"${(task.description || "").replace(/"/g, '""')}"`,
              ].join(","),
            ),
          ].join("\n");
          const csvBlob = new Blob([csvContent], { type: "text/csv" });
          const jsonBlob = new Blob(
            [
              JSON.stringify(
                {
                  schemaVersion: CONFIG.DB_SCHEMA_VERSION,
                  exportedAt: new Date().toISOString(),
                  entries: this.app.state.tasks,
                  monthlyReport: report,
                },
                null,
                2,
              ),
            ],
            { type: "application/json" },
          );
          [
            ["csv", csvBlob],
            ["json", jsonBlob],
          ].forEach(([ext, blob]) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `discipline-data-${this.app.getDateString()}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          });
        }

        triggerImportPicker() {
          const input = this.app.elements["import-file"];
          if (!input) return;
          input.value = "";
          input.click();
        }

        parseCsvLine(line) {
          const out = [];
          let curr = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              if (inQuotes && line[i + 1] === '"') {
                curr += '"';
                i += 1;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (ch === "," && !inQuotes) {
              out.push(curr);
              curr = "";
            } else {
              curr += ch;
            }
          }
          out.push(curr);
          return out;
        }

        importFromJsonText(text) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) return parsed;
          if (parsed && Array.isArray(parsed.entries)) return parsed.entries;
          return [];
        }

        importFromCsvText(text) {
          const lines = text.split(/\r?\n/).filter(Boolean);
          if (lines.length < 2) return [];
          const headers = this.parseCsvLine(lines[0]).map((h) => h.trim());
          const idx = Object.fromEntries(headers.map((h, i) => [h, i]));

          const hasNewSchema =
            headers.includes("Category") && headers.includes("Subcategory");
          const imported = [];

          for (let i = 1; i < lines.length; i++) {
            const cols = this.parseCsvLine(lines[i]);
            if (!cols.length) continue;

            if (hasNewSchema) {
              const date = cols[idx["Date"]] || this.app.getDateString();
              const category = cols[idx["Category"]] || "Miscellaneous";
              const subcategory = cols[idx["Subcategory"]] || "General";
              const startRaw = cols[idx["Start Time"]] || "";
              const endRaw = cols[idx["End Time"]] || "";
              const duration = Number(cols[idx["Duration (minutes)"]] || 0);
              const description = cols[idx["Description"]] || "";
              const startTime = Date.parse(startRaw) || Date.now();
              const endTime =
                Date.parse(endRaw) || startTime + duration * 60000;
              imported.push({
                id: `${Date.now()}-${i}`,
                date,
                category,
                subcategory,
                startTime,
                endTime,
                duration: Number.isFinite(duration)
                  ? duration
                  : Math.max(0, Math.round((endTime - startTime) / 60000)),
                description,
              });
            } else {
              // Legacy CSV fallback
              const date = cols[idx["Date"]] || this.app.getDateString();
              const name = cols[idx["Task Name"]] || "Imported Task";
              const startTime =
                Date.parse(cols[idx["Start Time"]] || "") || Date.now();
              const endTime =
                Date.parse(cols[idx["End Time"]] || "") || startTime;
              const duration = Number(
                cols[idx["Duration (minutes)"]] ||
                  Math.max(0, Math.round((endTime - startTime) / 60000)),
              );
              const type = (cols[idx["Type"]] || "").toLowerCase();
              const category = type.includes("sleep")
                ? "Sleep"
                : "Miscellaneous";
              imported.push({
                id: `${Date.now()}-${i}`,
                date,
                category,
                subcategory: category === "Sleep" ? "Night Sleep" : "General",
                startTime,
                endTime,
                duration,
                description: name,
              });
            }
          }

          return imported;
        }

        async importDataFromFile(file) {
          if (!file) return;
          try {
            const text = await file.text();
            const isJson =
              file.name.toLowerCase().endsWith(".json") ||
              file.type.includes("json");
            const rawEntries = isJson
              ? this.importFromJsonText(text)
              : this.importFromCsvText(text);
            if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
              alert("Import file has no valid entries.");
              return;
            }
            const normalized = rawEntries.map((entry) =>
              this.app.normalizeTask(entry),
            );
            this.app.taskManager.mergeTasks(normalized);
            alert(`Imported ${normalized.length} entries successfully.`);
          } catch (error) {
            console.error("Import failed:", error);
            alert(
              "Import failed. Please provide a valid exported JSON/CSV file.",
            );
          }
        }
      }
