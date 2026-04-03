(function () {
  class ShellManager {
    initialize() {
      if (!this.hasShellDom()) return;
      this.bindNav();
      this.bindMissionActions();
      if (window.FocusBuilder) window.FocusBuilder.initialize();
      if (window.app && this.hasSyncTargets()) {
        this.syncService = new window.StateSyncService(window.app);
        this.syncService.start();
      }
    }

    hasShellDom() {
      return !!document.querySelector('.shell-nav-btn, .quick-preset, #mission-start-work');
    }

    hasSyncTargets() {
      return !!document.getElementById('trainer-inline-advice')
        || !!document.getElementById('mission-next-action')
        || !!document.getElementById('mission-wake-time')
        || !!document.getElementById('shadow-summary-gap');
    }

    bindNav() {
      document.querySelectorAll('.shell-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => this.activateSection(btn.dataset.section));
      });
    }

    activateSection(sectionId) {
      document.querySelectorAll('.app-section').forEach(section => {
        section.classList.toggle('active', section.id === sectionId);
      });
      document.querySelectorAll('.shell-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionId);
      });
    }

    bindMissionActions() {
      const startWork = document.getElementById('mission-start-work');
      if (!startWork) return;
      startWork.addEventListener('click', () => {
        this.activateSection('execution-mode');
        const input = document.getElementById('task-input');
        if (input) input.focus();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const shell = new ShellManager();
    shell.initialize();
  });
})();
