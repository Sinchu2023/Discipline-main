class GraphManager {
  constructor(app) {
    this.app = app;
    this.charts = { productivity: null, sleep: null };
    this.totalCounterAnimation = null;
    this.lastFilteredTotalMinutes = 0;
  }
  initialize() {
    try {
      console.group('GraphManager Initialization');

      if (!window.Chart) return;
      this.createCharts();
      this.setupChartControls();
      this.lastFilteredTotalMinutes = this.getCurrentFilteredTotalMinutes();
      this.animateFilteredTotal(0, this.lastFilteredTotalMinutes);
      this.updateGraphKpis();
    } catch (error) {
      console.error('[GraphManager] Initialization failed:', error);
    } finally {
      console.groupEnd();
    }
  }

  getRangeDates(range) {
    const days =
      range === "weekly" ? 84 : CONFIG.CHART_RANGES[range] || 7;
    const today = new Date();
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(this.app.getDateString(d));
    }
    return dates;
  }

  updateGraphKpis() {
    const range = this.app.elements["prod-range"].value;
    const rangeDates = this.getRangeDates(range);
    const dateSet = new Set(rangeDates);

    const productivity = this.app.state.tasks
      .filter(
        (t) =>
          dateSet.has(t.date) &&
          this.app.isProductiveCategory(t.category),
      )
      .reduce((sum, t) => sum + t.duration, 0);

    const loggedDistraction = this.app.state.tasks
      .filter(
        (t) =>
          dateSet.has(t.date) &&
          (t.category === "Time Waste / Distraction" ||
            t.graph_tag === "distraction"),
      )
      .reduce((sum, t) => sum + t.duration, 0);

    const untrackedDistraction = rangeDates.reduce((sum, dateStr) => {
      return (
        sum +
        this.app.getInferredWasteMinutesForDate(
          dateStr,
          this.app.state.tasks,
        )
      );
    }, 0);

    const totalDistraction = loggedDistraction + untrackedDistraction;

    this.app.elements["graph-productivity-total"].textContent =
      this.app.formatDuration(productivity);
    this.app.elements["graph-total-distraction"].textContent =
      this.app.formatDuration(totalDistraction);
    this.app.elements["graph-logged-distraction"].textContent =
      this.app.formatDuration(loggedDistraction);
  }

  getCurrentFilter() {
    return "productivity";
  }

  passesProductivityFilter(task, filter) {
    if (task.category === "Sleep") return false;
    const tag = task.graph_tag || "neutral";
    if (filter === "productivity") return tag === "productivity";
    if (filter === "logged_distraction")
      return (
        tag === "distraction" ||
        task.category === "Time Waste / Distraction"
      );
    if (filter === "total_distraction")
      return (
        tag === "distraction" ||
        task.category === "Time Waste / Distraction"
      );
    return true;
  }

  getColorScheme() {
    return {
      border: "rgb(40, 180, 99)",
      fill: "rgba(40, 180, 99, 0.16)",
    };
  }

  createCharts() {
    const prodCtx =
      this.app.elements["productivity-chart"].getContext("2d");
    const initialRange = this.app.elements["prod-range"]?.value || "7d";
    this.charts.productivity = new Chart(prodCtx, {
      type: "line",
      data: this.getProductivityData(
        initialRange,
        this.getCurrentFilter(),
      ),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 420, easing: "easeOutCubic" },
        transitions: {
          active: { animation: { duration: 320 } },
          resize: { animation: { duration: 320 } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            mode: "nearest",
            intersect: false,
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: ${this.app.formatDecimalTime(ctx.parsed.y || 0)}`,
            },
          },
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (v) => v + "h" } },
        },
        interaction: { mode: "nearest", intersect: false, axis: "x" },
        elements: {
          point: {
            radius: 0,
            hoverRadius: 0,
            pointStyle: "circle",
            hoverBorderWidth: 2,
          },
          line: { tension: 0.34, borderWidth: 2.5 },
        },
      },
    });

    const sleepCtx = this.app.elements["sleep-chart"].getContext("2d");
    this.charts.sleep = new Chart(sleepCtx, {
      type: "bar",
      data: this.getSleepData("7d"),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 380, easing: "easeOutQuad" },
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            max: 12,
            ticks: { callback: (v) => v + "h" },
          },
        },
      },
    });
  }

  getProductivityData(range = "7d", filter = "productivity") {
    const activeFilter = "productivity";
    const data = [];
    const labels = [];
    const today = new Date();
    const days = range === "weekly" ? 84 : CONFIG.CHART_RANGES[range] || 7;

    const dailyVolume = new Map();
    const dailyProductiveMap = new Map();

    this.app.state.tasks.forEach(task => {
      if (this.passesProductivityFilter(task, activeFilter)) {
        dailyVolume.set(task.date, (dailyVolume.get(task.date) || 0) + task.duration);
      }
      if (this.app.isProductiveCategory(task.category)) {
        dailyProductiveMap.set(task.date, (dailyProductiveMap.get(task.date) || 0) + task.duration);
      }
    });

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = this.app.getDateString(d);

      let mins = 0;
      if (range === "weekly") {
        let weekMinutes = 0;
        for (let w = 0; w < 7; w++) {
          const wd = new Date(today);
          wd.setDate(today.getDate() - i - w);
          const wds = this.app.getDateString(wd);
          weekMinutes += dailyVolume.get(wds) || 0;
        }
        mins = weekMinutes / 7;
      } else {
        mins = dailyVolume.get(ds) || 0;
      }

      labels.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
      data.push(parseFloat((mins / 60).toFixed(2)));
    }

    const colors = this.getColorScheme();

    let shadowData = labels.map((_, i) => {
      const pointDate = new Date(today);
      pointDate.setDate(today.getDate() - (days - 1 - i));
      let rollingSum = 0;
      for (let w = 0; w < 7; w++) {
        const wd = new Date(pointDate);
        wd.setDate(pointDate.getDate() - w);
        rollingSum += dailyProductiveMap.get(this.app.getDateString(wd)) || 0;
      }
      return parseFloat(((rollingSum / 7) / 60).toFixed(2));
    });

    if (!shadowData.some(v => v > 0)) {
      const fallback = parseFloat((Math.max(0, Number(this.app.shadowEngine?.shadowSevenDayAverage || 0)) / 60).toFixed(2));
      shadowData = Array.from({ length: labels.length }, () => fallback);
    }

    return {
      labels,
      datasets: [
        {
          label: "Productivity",
          data,
          borderColor: colors.border,
          backgroundColor: colors.fill,
          pointBackgroundColor: colors.border,
          pointRadius: 0,
          pointHoverRadius: 0,
          pointBorderColor: colors.border,
          borderWidth: 2.5,
          tension: 0.34,
          fill: true,
        },
        {
          label: "Shadow",
          data: shadowData,
          borderColor: "rgb(0, 140, 255)",
          backgroundColor: "rgba(0, 140, 255, 0.14)",
          pointBackgroundColor: "rgb(0, 140, 255)",
          pointRadius: 0,
          pointHoverRadius: 0,
          pointBorderColor: "rgb(0, 140, 255)",
          borderWidth: 2,
          tension: 0.2,
          fill: false,
          borderDash: [7, 5],
        },
      ],
    };
  }

  getSleepData(range = "7d") {
    const days = CONFIG.CHART_RANGES[range] || 7,
      data = [],
      labels = [],
      today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = this.app.getDateString(d);
      const mins = this.app.state.tasks
        .filter((t) => t.date === ds && t.category === "Sleep")
        .reduce((a, t) => a + t.duration, 0);
      labels.push(
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      );
      data.push(parseFloat((mins / 60).toFixed(1)));
    }
    return {
      labels,
      datasets: [
        {
          label: "Sleep Hours",
          data,
          backgroundColor: "rgba(111, 66, 193, 0.7)",
          borderColor: "rgb(111,66,193)",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }

  formatHoursForTooltip(hours = 0) {
    const safe = Math.max(0, Number(hours) || 0);
    return this.app.formatDecimalTime(safe);
  }



  getCurrentFilteredTotalMinutes() {
    const range = this.app.elements["prod-range"].value;
    const rangeDates = this.getRangeDates(range);
    const dateSet = new Set(rangeDates);
    return this.app.state.tasks
      .filter(
        (t) =>
          dateSet.has(t.date) &&
          this.passesProductivityFilter(t, "productivity"),
      )
      .reduce((sum, t) => sum + t.duration, 0);
  }

  animateFilteredTotal(fromMinutes, toMinutes) {
    if (!this.app.elements["prod-filter-total"]) return;
    const el = this.app.elements["prod-filter-total"];
    const start = performance.now();
    const duration = 450;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromMinutes + (toMinutes - fromMinutes) * eased;
      el.textContent = this.app.formatDuration(current);
      if (progress < 1)
        this.totalCounterAnimation = requestAnimationFrame(tick);
    };
    if (this.totalCounterAnimation)
      cancelAnimationFrame(this.totalCounterAnimation);
    this.totalCounterAnimation = requestAnimationFrame(tick);
  }

  updateCharts() {
    if (!this.charts.productivity || !this.charts.sleep) return;
    const prodRange = this.app.elements["prod-range"].value;
    const sleepRange = this.app.elements["sleep-range"].value;
    const filter = this.getCurrentFilter();

    const prodContainer = this.app.elements["productivity-chart"].closest(
      ".graph-canvas-container",
    );
    if (prodContainer) prodContainer.classList.add("filter-updating");

    const fromMinutes = this.lastFilteredTotalMinutes;
    this.charts.productivity.data = this.getProductivityData(
      prodRange,
      filter,
    );
    this.charts.sleep.data = this.getSleepData(sleepRange);
    this.charts.productivity.update();
    this.charts.sleep.update();

    const toMinutes = this.getCurrentFilteredTotalMinutes();
    this.lastFilteredTotalMinutes = toMinutes;
    this.animateFilteredTotal(fromMinutes, toMinutes);
    this.updateGraphKpis();
    setTimeout(() => {
      if (prodContainer)
        prodContainer.classList.remove("filter-updating");
    }, 360);

    // Fulfill explicit schema write request for productivity stats
    if (this.app.cloudManager && this.app.cloudManager.isReady) {
      try {
        const dailyData = this.getProductivityData("7d", filter);
        const weeklyData = this.getProductivityData("weekly", filter);
        const dailyScores = dailyData.labels.map((l, i) => ({ label: l, value: dailyData.datasets[0].data[i] || 0 }));
        const weeklyStats = weeklyData.labels.map((l, i) => ({ label: l, value: weeklyData.datasets[0].data[i] || 0 }));
        const docRef = window.FirebaseServices.doc(this.app.cloudManager.db, "users", this.app.cloudManager.user.uid, "productivity", "stats");
        window.FirebaseServices.setDoc(docRef, { dailyScores, weeklyStats, updatedAt: Date.now() }, { merge: true });
      } catch (e) { console.warn("Failed to sync proxy productivity schema", e); }
    }
  }

  setupChartControls() {
    this.app.elements["prod-range"].addEventListener("change", () =>
      this.updateCharts(),
    );
    this.app.elements["sleep-range"].addEventListener("change", () =>
      this.updateCharts(),
    );
  }
}
