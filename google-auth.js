/**
 * google-auth.js
 * ------------------------------------------------------------
 * Purpose:
 *  - Isolate Google sign-in flow from UI/task logic.
 *  - Keep popup/redirect decision and fallback behavior in one place.
 *
 * Required public function:
 *  - startGoogleLogin()
 */

/**
 * Decide if current device is mobile-like, where redirect auth is more reliable.
 */
function isMobileClient() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

/**
 * Decide if popup error should fallback to redirect.
 */
function shouldFallbackToRedirect(code) {
  const nonRecoverableCodes = new Set([
    "auth/unauthorized-domain",
    "auth/operation-not-allowed",
    "auth/invalid-api-key",
    "auth/app-not-authorized",
  ]);
  return !nonRecoverableCodes.has(code || "");
}

/**
 * Start Google login flow.
 *
 * Params are bundled to keep call sites explicit and testable.
 */
export async function startGoogleLogin({
  auth,
  loginButton,
  redirectLoginKey = "discipline_google_redirect_started",
  googleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} = {}) {
  if (!auth || !googleAuthProvider || !signInWithPopup || !signInWithRedirect) {
    const err = new Error("Google auth dependencies are not initialized");
    err.code = "auth/dependencies-missing";
    throw err;
  }

  if (location.protocol === "file:") {
    const err = new Error("Google login is not supported on file:// origins");
    err.code = "auth/operation-not-supported-in-this-environment";
    throw err;
  }

  const provider = new googleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  if (loginButton) loginButton.disabled = true;

  try {
    if (isMobileClient()) {
      sessionStorage.setItem(redirectLoginKey, "1");
      await signInWithRedirect(auth, provider);
      return null;
    }

    const credential = await signInWithPopup(auth, provider);
    return credential?.user || null;
  } catch (error) {
    if (!shouldFallbackToRedirect(error?.code)) throw error;

    sessionStorage.setItem(redirectLoginKey, "1");
    await signInWithRedirect(auth, provider);
    return null;
  } finally {
    if (loginButton) loginButton.disabled = false;
  }
}

// Expose globally so existing inline app code can call it without a full rewrite.
window.GoogleAuthModule = {
  isMobileClient,
  shouldFallbackToRedirect,
  startGoogleLogin,
};
