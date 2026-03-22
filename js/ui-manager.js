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
