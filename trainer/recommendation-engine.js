(function () {
  class TrainerRecommendationEngine {
    buildInstruction(snapshot) {
      const gap = snapshot.shadow.gap || '0h 00m';
      const lead = snapshot.shadow.needToLead || '0h 00m';
      return `Start a 45 minute deep work block on Project Work to close the Shadow gap (${gap}) and move toward a lead (${lead}).`;
    }
  }

  window.TrainerRecommendationEngine = TrainerRecommendationEngine;
})();
