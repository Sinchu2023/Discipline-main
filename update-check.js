/**
 * update-check.js
 * ------------------------------------------------------------
 * Purpose:
 *  - Show a tiny, removable deployment status indicator on the page.
 *  - Fetch the latest commit timestamp from GitHub and display it.
 *
 * Design goals:
 *  - Fully standalone.
 *  - Zero dependency on app internals.
 *  - Safe to remove by deleting only the script include line.
 */
(function deploymentUpdateCheck() {
  const BANNER_ID = "deployment-update-banner";

  /**
   * Try to infer owner/repo from common GitHub Pages URL format:
   *   https://<owner>.github.io/<repo>/...
   *
   * Fallback:
   *   window.UPDATE_CHECK_REPO = { owner: "...", repo: "..." }
   */
  function detectRepoInfo() {
    if (window.UPDATE_CHECK_REPO?.owner && window.UPDATE_CHECK_REPO?.repo) {
      return window.UPDATE_CHECK_REPO;
    }

    const host = location.hostname || "";
    const pathParts = (location.pathname || "").split("/").filter(Boolean);

    // Default for GitHub Pages project sites.
    if (host.endsWith(".github.io")) {
      const owner = host.split(".")[0];
      const repo = pathParts[0] || owner + ".github.io";
      return { owner, repo };
    }

    // No safe inference possible (custom domain without explicit mapping).
    return null;
  }

  /**
   * Convert ISO commit date to local YYYY-MM-DD HH:MM display.
   */
  function formatDate(isoString) {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "unknown";

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }

  /**
   * Render/update tiny fixed status element in bottom-right corner.
   */
  function renderBanner(text) {
    let el = document.getElementById(BANNER_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = BANNER_ID;
      el.style.position = "fixed";
      el.style.right = "10px";
      el.style.bottom = "10px";
      el.style.zIndex = "99999";
      el.style.padding = "6px 8px";
      el.style.borderRadius = "6px";
      el.style.fontSize = "11px";
      el.style.lineHeight = "1.2";
      el.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      el.style.background = "rgba(0, 0, 0, 0.75)";
      el.style.color = "#d7f9d1";
      el.style.pointerEvents = "none";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.35)";
      document.body.appendChild(el);
    }
    el.textContent = text;
  }

  async function run() {
    try {
      renderBanner("Last update: checking...");
      const repoInfo = detectRepoInfo();
      if (!repoInfo) {
        renderBanner("Last update: repo not detected");
        return;
      }

      const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/commits?sha=main&per_page=1`;
      const res = await fetch(url, {
        headers: { Accept: "application/vnd.github+json" },
      });

      if (!res.ok) {
        renderBanner(`Last update: unavailable (${res.status})`);
        return;
      }

      const commits = await res.json();
      const latestDate = commits?.[0]?.commit?.committer?.date || commits?.[0]?.commit?.author?.date;
      if (!latestDate) {
        renderBanner("Last update: not found");
        return;
      }

      renderBanner(`Last update: ${formatDate(latestDate)}`);
    } catch (error) {
      console.warn("update-check failed:", error);
      renderBanner("Last update: check failed");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
