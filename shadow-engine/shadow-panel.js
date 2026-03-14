(function () {
  class ShadowPanel {
    static sync() {
      this.copy('shadow-gap', 'shadow-summary-gap');
      this.copy('shadow-needed-lead', 'shadow-summary-win');
      this.copy('shadow-pressure', 'shadow-summary-pressure');
      this.copy('shadow-target', 'shadow-summary-target');
      this.copy('shadow-gap', 'mission-shadow-gap');
      this.copy('shadow-needed-lead', 'mission-minutes-to-win');
    }

    static copy(from, to) {
      const fromEl = document.getElementById(from);
      const toEl = document.getElementById(to);
      if (fromEl && toEl) toEl.textContent = fromEl.textContent.trim();
    }
  }

  window.ShadowPanel = ShadowPanel;
})();
