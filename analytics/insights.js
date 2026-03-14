(function () {
  class AnalyticsInsights {
    static readText(id, fallback = '0') {
      const el = document.getElementById(id);
      return el ? el.textContent.trim() : fallback;
    }

    static sync() {
      const weeklyAvg = this.readText('shadow-weekly-average', '0h 00m');
      const score = this.readText('shadow-score', 'Monthly Score: You 0 - Shadow 0');
      const streak = this.readText('streak-display', '0');
      const rank = this.readText('shadow-rank', 'Rank: Initiate').replace('Rank: ', '');
      const duel = this.readText('shadow-duel', 'Leader: Even').replace('Leader: ', '');

      const winRateMatch = score.match(/You\s+(\d+)\s+-\s+Shadow\s+(\d+)/i);
      let winRate = '0%';
      if (winRateMatch) {
        const wins = Number(winRateMatch[1]);
        const losses = Number(winRateMatch[2]);
        const total = wins + losses;
        winRate = total > 0 ? `${Math.round((wins / total) * 100)}%` : '0%';
      }

      this.write('analytics-rolling-avg', weeklyAvg);
      this.write('analytics-win-rate', winRate);
      this.write('analytics-streak', streak);
      this.write('analytics-level', rank);
      this.write('analytics-shadow-compare', duel);
    }

    static write(id, value) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }
  }

  window.AnalyticsInsights = AnalyticsInsights;
})();
