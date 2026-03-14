(function () {
  class StateSyncService {
    constructor(app) {
      this.app = app;
      this.stateManager = new window.CentralStateManager(app);
      this.trainer = new window.TrainerRecommendationEngine();
    }

    start() {
      this.tick();
      this.timer = setInterval(() => this.tick(), 1500);
    }

    tick() {
      const snapshot = this.stateManager.getSnapshot();
      window.ShadowPanel?.sync?.();
      window.AnalyticsInsights?.sync?.();
      this.syncMission(snapshot);
      this.syncTrainer(snapshot);
    }

    syncMission(snapshot) {
      const wakeEl = document.getElementById('mission-wake-time');
      if (wakeEl) {
        wakeEl.textContent = snapshot.wakeTime
          ? new Date(snapshot.wakeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '--:--';
      }

      const nextAction = document.getElementById('mission-next-action');
      if (!nextAction) return;
      const needsLead = snapshot.shadow.needToLead || '0h 00m';
      nextAction.textContent = needsLead === '0h 00m'
        ? 'Maintain momentum: log your next high-value task and manually start the timer.'
        : `You are trailing. Move to Execution Mode and manually start a focused block. Remaining to lead: ${needsLead}.`;
    }

    syncTrainer(snapshot) {
      const trainerEl = document.getElementById('trainer-inline-advice');
      if (!trainerEl) return;
      trainerEl.textContent = this.trainer.buildInstruction(snapshot);
    }
  }

  window.StateSyncService = StateSyncService;
})();
