/**
 * firebase-service.js
 * ------------------------------------------------------------
 * Purpose:
 *  - Isolate Firebase setup from app logic.
 *  - Expose a clean service object that other modules can consume.
 *
 * Why this file exists:
 *  - Makes debugging login/data sync easier with clear boundaries.
 *  - Allows sharing one focused file with senior engineers.
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Central Firebase configuration for this app.
const firebaseConfig = {
  apiKey: "AIzaSyBIdVzFFqSlaHKfaob9_kcB_OgLJTCw9-M",
  authDomain: "discipline-tracker-e8e8a.firebaseapp.com",
  projectId: "discipline-tracker-e8e8a",
  storageBucket: "discipline-tracker-e8e8a.firebasestorage.app",
  messagingSenderId: "382793676796",
  appId: "1:382793676796:web:1a2f749697bf6cb68fe479",
};

/**
 * Initialize Firebase services once and expose a uniform API.
 */
export function initializeFirebaseServices() {
  const hasConfig = !Object.values(firebaseConfig).some((v) =>
    String(v).startsWith("REPLACE_WITH_"),
  );

  if (!hasConfig) {
    console.warn("Firebase config placeholders detected. Cloud sync disabled until configured.");
    return null;
  }

  // Reuse existing app if already initialized.
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  return {
    app,
    auth,
    db,

    // Auth utilities
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged,

    // Firestore utilities
    doc,
    getDoc,
    getDocs,
    setDoc,
    collection,
    deleteDoc,
  };
}

/**
 * Load basic user profile document from Firestore.
 */
export async function loadUserData(services, uid) {
  if (!services?.db || !uid) return null;
  const ref = doc(services.db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/**
 * Sync a single task document for authenticated user.
 */
export async function syncTask(services, uid, task) {
  if (!services?.db || !uid || !task?.id) return;
  const ref = doc(services.db, "users", uid, "tasks", String(task.id));
  await setDoc(ref, task, { merge: true });
}

/**
 * Write a generic state update into user's state collection.
 */
export async function writeUserState(services, uid, key, value) {
  if (!services?.db || !uid || !key) return;
  const ref = doc(services.db, "users", uid, "state", key);
  await setDoc(ref, value, { merge: true });
}

// Expose globally for existing non-module app code compatibility.
window.FirebaseServices = initializeFirebaseServices();
if (window.FirebaseServices) {
  window.dispatchEvent(new Event("firebase-services-ready"));
}
window.FirebaseServiceModule = {
  initializeFirebaseServices,
  loadUserData,
  syncTask,
  writeUserState,
};
