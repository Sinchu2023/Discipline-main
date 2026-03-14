/**
 * app.js
 * ------------------------------------------------------------
 * Purpose:
 *  - Document the app-layer boundary for modular architecture.
 *  - Provide a tiny bridge helper for future full extraction of index inline logic.
 *
 * Note:
 *  - Existing UI/task/stopwatch logic still lives in index.html inline script today.
 *  - This file is intentionally minimal and non-breaking.
 */

/**
 * Wait for authenticated user before running Firebase-dependent callback.
 */
export function runAfterAuth(callback) {
  const services = window.FirebaseServices;
  if (!services?.auth || typeof services.onAuthStateChanged !== "function") return;

  services.onAuthStateChanged(services.auth, (user) => {
    if (!user) return;
    callback(user, services);
  });
}

window.AppModule = { runAfterAuth };
