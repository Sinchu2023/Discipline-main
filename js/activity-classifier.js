class ActivityClassifier {
        static classify(activityInput) {
          const activity = (activityInput || "").trim();
          const text = activity.toLowerCase();

          const strongDistraction = [
            "random",
            "scrolling",
            "reels",
            "timepass",
            "doomscroll",
            "binge",
            "procrastination",
          ];
          const distractionKeywords = [
            "instagram",
            "tiktok",
            "youtube shorts",
            "gaming",
            "games",
            "twitter",
            "x app",
            "reddit",
            "netflix",
            "series",
            "memes",
            "chatting",
          ];
          const productiveKeywords = [
            "coding",
            "project",
            "study",
            "learning",
            "course",
            "workout",
            "exercise",
            "gym",
            "chest",
            "back",
            "legs",
            "pcb",
            "analog",
            "control systems",
            "research",
            "writing",
            "build",
          ];
          const neutralKeywords = [
            "commute",
            "cleaning",
            "meal",
            "eating",
            "shopping",
            "family",
            "chores",
            "admin",
            "errands",
            "restroom",
          ];

          let productiveScore = 0;
          let distractionScore = 0;
          let neutralScore = 0;

          strongDistraction.forEach((k) => {
            if (text.includes(k)) distractionScore += 5;
          });
          distractionKeywords.forEach((k) => {
            if (text.includes(k)) distractionScore += 3;
          });
          productiveKeywords.forEach((k) => {
            if (text.includes(k)) productiveScore += 3;
          });
          neutralKeywords.forEach((k) => {
            if (text.includes(k)) neutralScore += 2;
          });

          if (!text) neutralScore += 1;

          let category = "NEUTRAL";
          let graph_tag = "neutral";
          if (
            distractionScore > productiveScore &&
            distractionScore >= neutralScore
          ) {
            category = "DISTRACTION";
            graph_tag = "distraction";
          } else if (
            productiveScore > distractionScore &&
            productiveScore >= neutralScore
          ) {
            category = "PRODUCTIVE";
            graph_tag = "productivity";
          }

          const maxScore = Math.max(
            productiveScore,
            distractionScore,
            neutralScore,
            1,
          );
          const secondScore =
            [productiveScore, distractionScore, neutralScore].sort(
              (a, b) => b - a,
            )[1] || 0;
          const confidence = Math.max(
            40,
            Math.min(100, Math.round(55 + (maxScore - secondScore) * 9)),
          );

          let waste_level = "NONE";
          if (category === "DISTRACTION") {
            if (
              strongDistraction.some((k) => text.includes(k)) ||
              distractionScore >= 8
            )
              waste_level = "HIGH";
            else if (distractionScore >= 5) waste_level = "MODERATE";
            else waste_level = "LOW";
          }

          return {
            activity,
            category,
            confidence,
            waste_level,
            graph_tag,
          };
        }
      }
