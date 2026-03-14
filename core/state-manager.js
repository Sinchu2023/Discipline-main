(function () {
  class CentralStateManager {
    constructor(app) {
      this.app = app;
    }

    getSnapshot() {
      const tasks = this.app?.state?.tasks || [];
      return {
        wakeTime: this.app?.state?.flow?.lastWakeAt || null,
        sleepTracking: tasks.filter(t => t.category === 'Sleep'),
        timerLogs: tasks,
        shadow: {
          gap: this.read('shadow-gap'),
          needToLead: this.read('shadow-needed-lead'),
          pressure: this.read('shadow-pressure'),
          target: this.read('shadow-target')
        },
        productivity: this.read('productive-time'),
        missionScore: this.read('shadow-mission-score'),
        streak: this.read('streak-display')
      };
    }

    read(id) {
      const el = document.getElementById(id);
      return el ? el.textContent.trim() : '';
    }
  }

  window.CentralStateManager = CentralStateManager;
})();
