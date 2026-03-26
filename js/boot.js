window.classifyActivity = (userInput) => ActivityClassifier.classify(userInput);
window.app = new DisciplineTracker();

document.addEventListener("DOMContentLoaded", () => window.app.initialize());

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && window.app.taskManager) {
        window.app.taskManager.updateStats();
        window.app.taskManager.renderTasks();
        window.app.taskManager.renderFavorites();
        if (window.app.shadowEngine) window.app.shadowEngine.refresh(false);
    }
});

window.addEventListener("beforeunload", () => {
    if (window.app?.stopwatch?.tickIntervalId) {
        clearInterval(window.app.stopwatch.tickIntervalId);
    }
});
