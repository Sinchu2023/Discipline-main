(function () {
  class FocusBuilder {
    static initialize() {
      document.querySelectorAll('.quick-preset').forEach(btn => {
        btn.addEventListener('click', () => {
          const input = document.getElementById('task-input');
          if (input) {
            input.value = btn.dataset.task || '';
            input.focus();
          }
        });
      });
    }
  }

  window.FocusBuilder = FocusBuilder;
})();
