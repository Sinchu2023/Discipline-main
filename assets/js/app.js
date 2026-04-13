window.AppModule = {
  runAfterAuth(callback) {
    const services = window.FirebaseServices;
    if (!services?.auth || typeof services.onAuthStateChanged !== "function") {
      return;
    }

    services.onAuthStateChanged(services.auth, (user) => {
      if (!user) return;
      callback(user, services);
    });
  },
};

// ==============================================
// Discipline Tracker Pro - Extended Logic/Data/Reporting
// ==============================================
const CONFIG = {
  DB_SCHEMA_VERSION: 2,
  CLIENT_VERSION: "2026.03.12.3",
  DAILY_PRODUCTIVITY_THRESHOLD_MINUTES: 240,
  DISTRACTION_BUDGET_MINUTES: 90,

  // â”€â”€ Shadow Engine 2.0 constants (Â§6 of improve.md) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  LEARNING_RATE_FAILURE_SEVERE: 0.1,   // RECOVERY state
  LEARNING_RATE_FAILURE_MODERATE: 0.2,   // moderate slippage
  LEARNING_RATE_STABLE: 0.3,   // STABLE / GROWTH state
  EFFORT_SUCCESS_THRESHOLD: 0.7,   // actual/target >= 0.7 = success
  FLEXIBLE_TASK_MULTIPLIER: 1.5,   // buffer for flexible tasks
  MAX_DAILY_SHIFT_MINUTES: 30,    // max schedule shift per day
  MIN_SLEEP_MINUTES: 360,   // 6 h absolute floor
  MAX_SLEEP_COMPROMISES_PER_7_DAYS: 2,

  // Ideal target times (used by time-shift engine)
  IDEAL_WAKE_HOUR: 6,   // 06:00 AM
  IDEAL_SLEEP_HOUR: 23,  // 11:00 PM
  IDEAL_DEEP_WORK_HOUR: 8,   // 08:00 AM

  // Mission time-windows for expiry logic (24-h, [startH, endH])
  MISSION_TIME_WINDOWS: {
    learning: [9, 13],  // 09:00 â€“ 13:00
    project: [14, 18],  // 14:00 â€“ 18:00
    revision: [19, 21],  // 19:00 â€“ 21:00
    default: [8, 22],
  },
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    STORAGE_KEYS: {
    TASKS: "discipline_tracker_tasks",
    FAVORITES: "discipline_tracker_favorites",
    STREAK: "discipline_tracker_streak",
    LAST_ACTIVITY: "discipline_tracker_last_activity",
    ACTIVE_TASK: "discipline_tracker_active_task",
    SCHEMA_VERSION: "discipline_tracker_schema_version",
    SYNC_ENDPOINT: "discipline_tracker_sync_endpoint",
    SYNC_DEVICE_ID: "discipline_tracker_device_id",
    SYNC_QUEUE: "discipline_tracker_sync_queue",
    SHADOW_AVG: "discipline_tracker_shadow_avg",
    TRAINER_STATE: "discipline_tracker_trainer_state",
    FLOW_PROTOCOL: "discipline_tracker_flow_protocol",
    ROADMAP_STATE: "discipline_tracker_roadmap_state",
      JOURNAL_ENTRIES: "discipline_tracker_journal_entries",
      FIREBASE_USER: "discipline_tracker_firebase_user",
      CLIENT_VERSION: "discipline_tracker_client_version",
      TIMER_CLOUD_STATE: "discipline_tracker_timer_cloud_state",
      SHADOW_ENGINE_STATE: "discipline_tracker_shadow_engine_state",
      ROADMAP_PROMPT_DRAFT: "discipline_tracker_roadmap_prompt_draft",
      ROADMAP_RESPONSE_DRAFT: "discipline_tracker_roadmap_response_draft",
      TASK_PROMPT_DRAFT: "discipline_tracker_task_prompt_draft",
      TASK_RESPONSE_DRAFT: "discipline_tracker_task_response_draft",
    },
  MOTIVATION_INTERVAL: 15000,
  CHART_RANGES: { "7d": 7, "30d": 30, "3m": 90, "6m": 180, "1y": 365 },
  FIREBASE_PROTECTION: {
    MAX_WRITES_PER_MINUTE: 60,
    WRITE_DEBOUNCE_MS: 1200,
    MAX_TASKS_SYNC: 2000,
    MAX_FAVORITES_SYNC: 200,
    MAX_TEXT_LEN: 180,
    MIN_MISSION_UPDATE_INTERVAL_MS: 2500,
  },
};

const ANALOG_IC_ROADMAP_TEMPLATE = [
  {
    module: "MODULE 1 - FOUNDATIONS",
    days: [
      "Set one clear goal",
      "Learn the basic concepts",
      "Write short notes",
      "Review key definitions",
      "Do one simple practice set",
    ],
  },
  {
    module: "MODULE 2 - CORE LEARNING",
    days: [
      "Study the main topic",
      "Break topic into sub-parts",
      "Solve easy examples",
      "Check weak points",
    ],
  },
  {
    module: "MODULE 3 - PRACTICE",
    days: [
      "Do guided practice",
      "Do independent practice",
      "Review mistakes",
      "Repeat key questions",
    ],
  },
  {
    module: "MODULE 4 - BUILD AND REVIEW",
    days: [
      "Build something small",
      "Revise the full topic",
      "Plan the next cycle",
      "Take a light recovery day",
    ],
  },
];

const MISSION_THRESHOLDS = {
  default: 30,
  "basic semiconductor physics": 30,
  "different models of diodes": 30,
  "project work": 45,
  revision: 20,
};
const CATEGORY_DEFINITIONS = {
  Sleep: ["Night Sleep", "Nap", "Recovery"],
  "Productive Work": [
    "Analog",
    "PCB",
    "Coding",
    "Control Systems",
    "Planning",
    "Execution",
  ],
  "Physical Training": [
    "Chest",
    "Back",
    "Legs",
    "Arms",
    "Conditioning",
    "Mobility",
  ],
  "Study / Skill Development": [
    "Reading",
    "Course",
    "Practice",
    "Research",
  ],
  "Time Waste / Distraction": [
    "Social Media",
    "Streaming",
    "Gaming",
    "Browsing",
    "Idle",
  ],
  Miscellaneous: ["Admin", "Commute", "Family", "Other"],
};
const CATEGORY_ALIASES = {
  sleep: "Sleep",
  rest: "Sleep",
  productive: "Productive Work",
  work: "Productive Work",
  training: "Physical Training",
  physical: "Physical Training",
  workout: "Physical Training",
  study: "Study / Skill Development",
  skill: "Study / Skill Development",
  learning: "Study / Skill Development",
  waste: "Time Waste / Distraction",
  distraction: "Time Waste / Distraction",
  misc: "Miscellaneous",
  miscellaneous: "Miscellaneous",
};
const PRODUCTIVE_CATEGORIES = new Set([
  "Productive Work",
  "Physical Training",
  "Study / Skill Development",
]);
// Logical schema (local + cloud payload)
// activity_entry: {
//   id, category, subcategory, startTime, endTime, duration, date,
//   description(optional), sourceDevice, createdAt, updatedAt
// }
const MOTIVATION_LINES = [
  "Excellence is not a singular act, but a habit. You are what you repeatedly do.",
  "Discipline is the bridge between goals and accomplishment.",
  "The comeback is always stronger than the setback. Keep grinding.",
  "No shortcuts. No excuses. Just relentless execution.",
  "Consistency beats intensity every single time. Show up daily.",
  "Pain is temporary. Quitting lasts forever. Choose your hard.",
  "Your discipline today is your freedom tomorrow.",
  "Grind in silence, let success make the noise.",
  "Fall seven times, stand up eight. This is discipline.",
  "Small daily improvements lead to staggering long-term results.",
  "The only limit is the one you set yourself. Break it.",
  "Action is the antidote to anxiety. Keep moving forward.",
  "Don't stop when you're tired. Stop when you're done.",
  "The only bad workout is the one that didn't happen.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Your future is created by what you do today, not tomorrow.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Discipline is doing what needs to be done even when you don't want to.",
  "Be so good they can't ignore you. Master your craft.",
  "The only way to achieve the impossible is to believe it is possible.",
];
const STREAK_MESSAGES = {
  1: "Day one. This is where it begins.",
  3: "Three days strong. Momentum is building.",
  7: "One week! Discipline is becoming a habit.",
  14: "Two weeks. You're building something real.",
  21: "Three weeks. This is who you are now.",
  30: "One month of discipline. Elite status.",
  60: "Two months. You've transformed.",
  90: "Three months. Unstoppable.",
  100: "Century streak. This is your identity.",
  365: "One year. You've mastered yourself.",
};

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
class SyncManager {
  constructor(app) {
    this.app = app;
  }
  get endpoint() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.SYNC_ENDPOINT);
  }
  getDeviceId() {
    let id = localStorage.getItem(CONFIG.STORAGE_KEYS.SYNC_DEVICE_ID);
    if (!id) {
      id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(CONFIG.STORAGE_KEYS.SYNC_DEVICE_ID, id);
    }
    return id;
  }
  queue(change) {
    const q =
      this.app.loadFromStorage(CONFIG.STORAGE_KEYS.SYNC_QUEUE) || [];
    q.push(change);
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.SYNC_QUEUE, q);
  }
  async flushQueue() {
    if (!navigator.onLine || !this.endpoint) return;
    const queue =
      this.app.loadFromStorage(CONFIG.STORAGE_KEYS.SYNC_QUEUE) || [];
    if (!queue.length) return;
    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: this.getDeviceId(),
          changes: queue,
        }),
      });
      this.app.saveToStorage(CONFIG.STORAGE_KEYS.SYNC_QUEUE, []);
    } catch (e) {
      console.warn("Sync flush failed:", e);
    }
  }
  async pullLatest() {
    if (!navigator.onLine || !this.endpoint) return;
    try {
      const res = await fetch(
        `${this.endpoint}?deviceId=${encodeURIComponent(this.getDeviceId())}`,
      );
      if (!res.ok) return;
      const payload = await res.json();
      if (!Array.isArray(payload.entries)) return;
      this.app.taskManager.mergeTasks(
        payload.entries.map((t) => this.app.normalizeTask(t)),
      );
    } catch (e) {
      console.warn("Cloud pull failed:", e);
    }
  }
  async syncNow() {
    await this.flushQueue();
    await this.pullLatest();
  }
}

class FirebaseCloudManager {
  constructor(app) {
    this.app = app;
    this.auth = null;
    this.db = null;
    this.user = null;
    this.redirectLoginKey = "discipline_google_redirect_started";
    this.authButtonsBound = false;
    this.firebaseReadyListenerBound = false;
    this.timerUnsub = null;
    this.tasksUnsub = null;
    this.roadmapUnsub = null;
    this.favoritesUnsub = null;
    this.userUnsub = null;
    this.hasHydratedTasks = false;
    this.firebaseInitCompleted = false;
  }

  get isReady() {
    return !!(this.auth && this.db && this.user);
  }

  updateAuthButtonState() {
    const loginBtn = this.app.elements["google-login-btn"];
    const gateBtn = document.getElementById("login-gate-google-btn");
    const isModuleReady = !!window.GoogleAuthModule?.startGoogleLogin;
    const isFirebaseReady = !!this.auth;
    const ready = isModuleReady && isFirebaseReady;

    if (loginBtn) {
      loginBtn.disabled = !ready;
      loginBtn.title = ready ? "Sign in with Google" : "Initializing authentication...";
    }
    if (gateBtn) {
      gateBtn.disabled = !ready;
      gateBtn.title = ready ? "Sign in with Google" : "Initializing authentication...";
    }
    console.log(`Auth readiness check: Module=${isModuleReady}, Firebase=${isFirebaseReady}`);
  }

  stopLeaderLoop() {
    if (!this.leaderLoopIntervalId) return;
    clearInterval(this.leaderLoopIntervalId);
    this.leaderLoopIntervalId = null;
  }

  installFirestoreInstrumentation() {
    if (!window.FirebaseServices || window.FirebaseServices.__instrumented) return;
    const wrap = (name) => {
      const original = window.FirebaseServices[name];
      if (typeof original !== "function") return;
      window.FirebaseServices[name] = (...args) => {
        console.count(`Firestore ${name.toUpperCase()}`);
        return original(...args);
      };
    };
    ["setDoc", "getDoc", "onSnapshot", "getDocs", "deleteDoc"].forEach(wrap);
    window.FirebaseServices.__instrumented = true;
  }

  attachFirebaseServicesIfAvailable() {
    if (!window.FirebaseServices) return false;
    this.auth = window.FirebaseServices.auth;
    this.db = window.FirebaseServices.db;
    return !!(this.auth && this.db);
  }

  bindFirebaseReadyListener() {
    if (this.firebaseReadyListenerBound) return;
    this.firebaseReadyListenerBound = true;
    window.addEventListener("firebase-services-ready", async () => {
      console.log("Firebase services ready event received");
      await this.completeFirebaseInitialization();
    });
    window.addEventListener("google-auth-ready", () => {
      console.log("Google auth module ready event received");
      this.updateAuthButtonState();
    });
  }

  async completeFirebaseInitialization() {
    if (this.firebaseInitCompleted) return true;
    if (!this.attachFirebaseServicesIfAvailable()) return false;

    this.installFirestoreInstrumentation();
    this.ensureClientVersion();

    try {
      const redirectResult =
        await window.FirebaseServices.getRedirectResult(this.auth);
      if (redirectResult?.user) {
        sessionStorage.removeItem(this.redirectLoginKey);
      }
    } catch (error) {
      this.handleAuthError(error);
    }

    this.initializeAuthObservers();
    this.firebaseInitCompleted = true;
    this.updateAuthButtonState();
    return true;
  }

  initializeAuthObservers() {
    if (!this.auth || !window.FirebaseServices) return;
    if (this.authObserverInitialized) return;
    this.authObserverInitialized = true;
    window.FirebaseServices.onAuthStateChanged(
      this.auth,
      async (user) => {
        this.stopLeaderLoop();
        this.detachTimerListener();
        this.detachTasksListener();
        this.detachRoadmapListener();
        this.detachFavoritesListener();
        this.user = user || null;
        if (user) sessionStorage.removeItem(this.redirectLoginKey);
        this.renderAuthState();
        if (!user) return;
        try {
          await this.bootstrapUserData();
          this.listenToTimerState();
          this.listenToTasks();
          this.listenToRoadmap();
          this.listenToFavorites();
        } catch (error) {
          console.error("Post-login bootstrap failed:", error);
          alert(
            "Login succeeded, but cloud data sync failed. Check Firestore rules and browser console.",
          );
        }
      },
    );
  }

  ensureClientVersion() {
    const key = CONFIG.STORAGE_KEYS.CLIENT_VERSION;
    const current = localStorage.getItem(key);
    if (current === CONFIG.CLIENT_VERSION) return;
    localStorage.setItem(key, CONFIG.CLIENT_VERSION);
    // Avoid interrupting Firebase redirect sign-in processing.
    if (sessionStorage.getItem(this.redirectLoginKey)) return;
    const reloadFlag = `${key}_reloaded`;
    if (sessionStorage.getItem(reloadFlag)) return;
    sessionStorage.setItem(reloadFlag, "1");
    location.reload();
  }

  async initialize() {
    this.bindAuthButtons();
    this.bindFirebaseReadyListener();
    const initialized = await this.completeFirebaseInitialization();
    if (!initialized) {
      console.warn(
        "Firebase services not configured yet. Waiting for module initialization.",
      );
    }
  }

  isAuthInitialized() {
    return !!(this.auth && window.FirebaseServices);
  }

  shouldBlockLoginOnFileProtocol() {
    return location.protocol === "file:";
  }

  async handleGoogleLogin(loginButton = this.app.elements["google-login-btn"]) {
    if (!this.auth || !window.FirebaseServices) {
      alert("Login service is still initializing. Please try again in a moment.");
      return;
    }

    if (!window.GoogleAuthModule?.startGoogleLogin) {
      alert("Authentication module not loaded yet. Please wait a second and try again.");
      return;
    }

    try {
      await window.GoogleAuthModule.startGoogleLogin({
        auth: this.auth,
        loginButton,
        redirectLoginKey: this.redirectLoginKey,
        googleAuthProvider: window.FirebaseServices.GoogleAuthProvider,
        signInWithPopup: window.FirebaseServices.signInWithPopup,
        signInWithRedirect: window.FirebaseServices.signInWithRedirect,
      });
    } catch (moduleError) {
      this.handleAuthError(moduleError);
    }
  }

  bindAuthButtons() {
    if (this.authButtonsBound) return;
    this.authButtonsBound = true;

    const gateBtn = document.getElementById("login-gate-google-btn");
    if (gateBtn) {
      gateBtn.addEventListener("click", () =>
        this.handleGoogleLogin(gateBtn),
      );
    }

    this.app.elements["google-login-btn"]?.addEventListener(
      "click",
      () => this.handleGoogleLogin(this.app.elements["google-login-btn"]),
    );
    this.app.elements["google-logout-btn"]?.addEventListener(
      "click",
      async () => {
        try {
          await window.FirebaseServices.signOut(this.auth);
        } catch (e) {
          console.error(e);
        }
        this.user = null;
        this.renderAuthState();
      },
    );

    this.app.elements["profile-menu-toggle"]?.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
        this.toggleProfileMenu();
      },
    );

    document.addEventListener("click", (e) => {
      const container = this.app.elements["profile-menu-container"];
      if (!container || container.contains(e.target)) return;
      this.closeProfileMenu();
    });
  }

  toggleProfileMenu() {
    const menu = this.app.elements["profile-menu"];
    if (!menu) return;
    menu.classList.toggle("open");
  }

  closeProfileMenu() {
    this.app.elements["profile-menu"]?.classList.remove("open");
  }

  renderAuthState() {
    const loginBtn = this.app.elements["google-login-btn"];
    const logoutBtn = this.app.elements["google-logout-btn"];
    const nameEl = this.app.elements["auth-user-name"];
    const profileMenu = this.app.elements["profile-menu-container"];
    const loginGate = document.getElementById("login-gate");
    const appContainer = document.getElementById("app-container");
    const motivationContainer = document.getElementById("motivation-container");
    if (!loginBtn || !logoutBtn || !nameEl || !profileMenu) return;
    if (this.user) {
      // Hide login gate, show app
      if (loginGate) loginGate.classList.add("hidden");
      if (appContainer) appContainer.style.display = "block";
      if (motivationContainer) motivationContainer.style.display = "block";
      loginBtn.style.display = "none";
      profileMenu.style.display = "block";
      logoutBtn.style.display = "inline-flex";
      nameEl.textContent =
        this.user.displayName || this.user.email || this.user.uid;
      this.app.saveToStorage(CONFIG.STORAGE_KEYS.FIREBASE_USER, {
        uid: this.user.uid,
        email: this.user.email,
        displayName: this.user.displayName || "",
      });
    } else {
      // Show login gate, hide app
      if (loginGate) loginGate.classList.remove("hidden");
      if (appContainer) appContainer.style.display = "none";
      if (motivationContainer) motivationContainer.style.display = "none";
      loginBtn.style.display = "inline-flex";
      profileMenu.style.display = "none";
      logoutBtn.style.display = "none";
      nameEl.textContent = "";
      this.closeProfileMenu();
      // Clear local app state for privacy
      this.app.state.tasks = [];
      this.app.state.favorites = [];
      this.app.state.activeTask = null;
      Object.keys(CONFIG.STORAGE_KEYS).forEach(k => {
        if (k !== "FIREBASE_USER") localStorage.removeItem(CONFIG.STORAGE_KEYS[k]);
      });
    }
  }

  userDoc() {
    return window.FirebaseServices.doc(this.db, "users", this.user.uid);
  }

  timerDoc() {
    return window.FirebaseServices.doc(
      this.db,
      "users",
      this.user.uid,
      "state",
      "timer",
    );
  }

  handleAuthError(error) {
    const code = error?.code || "unknown";
    const messageByCode = {
      "auth/popup-blocked": "Login popup was blocked by the browser. Please allow popups and try again.",
      "auth/popup-closed-by-user": "Login popup closed before authentication finished. Please try again.",
      "auth/cancelled-popup-request": "Another sign-in is already in progress. Please wait and try again.",
      "auth/network-request-failed": "Network error during login. Check your internet connection and retry.",
      "auth/unauthorized-domain": "This domain is not authorized in Firebase Authentication settings. If running locally, ensure you use a server (not file://) and add your domain to Firebase console.",
      "auth/operation-not-allowed": "Google sign-in is not enabled for this Firebase project.",
      "auth/operation-not-supported-in-this-environment": "Google Sign-In is NOT supported on file:// origins. Please use a local server (e.g. Live Server for VS Code or 'python -m http.server').",
      "auth/dependencies-missing": "Login services are not fully initialized. Refresh the page and try again.",
    };
    const message =
      messageByCode[code] ||
      `Login failed (${code}). Please retry.`;
    console.error("Google sign-in failed:", error);
    alert(message);
  }

  tasksCollection() {
    return window.FirebaseServices.collection(
      this.db,
      "users",
      this.user.uid,
      "tasks",
    );
  }

  taskDoc(taskId) {
    return window.FirebaseServices.doc(
      this.db,
      "users",
      this.user.uid,
      "tasks",
      String(taskId),
    );
  }

  favoritesCollection() {
    return window.FirebaseServices.collection(
      this.db,
      "users",
      this.user.uid,
      "favorites",
    );
  }

  favoriteDoc(index) {
    return window.FirebaseServices.doc(
      this.db,
      "users",
      this.user.uid,
      "favorites",
      `fav-${index}`,
    );
  }

  async bootstrapUserData() {
    const ref = this.userDoc();
    const snap = await window.FirebaseServices.getDoc(ref);
    if (!snap.exists()) {
      await window.FirebaseServices.setDoc(
        ref,
        {
          profile: {
            uid: this.user.uid,
            email: this.user.email || "",
            displayName: this.user.displayName || "",
          },
          roadmap: {
            currentDay: 1,
            module: "MODULE 1 â€” DIODES",
            completedDays: [],
          },
          revision: { status: "pending", timeSpent: 0 },
          flowProtocol: this.app.flowEngine?.state || { byDate: {} },
          trainerState: this.app.trainerEngine?.state || {},
          shadowAvg: this.app.shadowEngine?.shadowSevenDayAverage || 0,
          roadmapPromptDraft:
            this.app.loadFromStorage(CONFIG.STORAGE_KEYS.ROADMAP_PROMPT_DRAFT) || "",
          roadmapResponseDraft:
            this.app.loadFromStorage(CONFIG.STORAGE_KEYS.ROADMAP_RESPONSE_DRAFT) || "",
          taskPromptDraft:
            this.app.loadFromStorage(CONFIG.STORAGE_KEYS.TASK_PROMPT_DRAFT) || "",
          taskResponseDraft:
            this.app.loadFromStorage(CONFIG.STORAGE_KEYS.TASK_RESPONSE_DRAFT) || "",
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    }

    const data = snap.exists() ? snap.data() || {} : {};
    if (data.flowProtocol) this.app.flowEngine.state = data.flowProtocol;
    if (data.trainerState) {
      const localTrainerState = this.app.trainerEngine.state || {};
      const cloudTrainerState = data.trainerState || {};
      this.app.trainerEngine.state = {
        ...localTrainerState,
        ...cloudTrainerState,
        // Keep freshest local day-check and day-slot snapshots to prevent
        // stale cloud reads from clearing just-ticked mission checkboxes.
        manualMissionChecks: {
          ...(cloudTrainerState.manualMissionChecks || {}),
          ...(localTrainerState.manualMissionChecks || {}),
        },
        roadmapSlotsDate:
          localTrainerState.roadmapSlotsDate ||
          cloudTrainerState.roadmapSlotsDate ||
          null,
        roadmapSlots:
          localTrainerState.roadmapSlots ||
          cloudTrainerState.roadmapSlots ||
          null,
      };
    }
    if (Number.isFinite(data.shadowAvg))
      this.app.shadowEngine.shadowSevenDayAverage = data.shadowAvg;
    this.app.saveToStorage(
      CONFIG.STORAGE_KEYS.ROADMAP_PROMPT_DRAFT,
      typeof data.roadmapPromptDraft === "string" ? data.roadmapPromptDraft : "",
    );
    this.app.saveToStorage(
      CONFIG.STORAGE_KEYS.ROADMAP_RESPONSE_DRAFT,
      typeof data.roadmapResponseDraft === "string" ? data.roadmapResponseDraft : "",
    );
    this.app.saveToStorage(
      CONFIG.STORAGE_KEYS.TASK_PROMPT_DRAFT,
      typeof data.taskPromptDraft === "string" ? data.taskPromptDraft : "",
    );
    this.app.saveToStorage(
      CONFIG.STORAGE_KEYS.TASK_RESPONSE_DRAFT,
      typeof data.taskResponseDraft === "string" ? data.taskResponseDraft : "",
    );

    await this.hydrateTasksFromCloudIfNeeded();
    await this.hydrateFavoritesFromCloudIfNeeded();
    await this.hydrateRoadmapFromCloudIfNeeded();

    this.app.taskManager.initialize();
    this.app.shadowEngine.refresh(false);
    this.app.trainerEngine.refresh();
    this.app.flowEngine.refresh();
  }

  async hydrateTasksFromCloudIfNeeded() {
    if (!this.isReady) return;
    const tasksSnap = await window.FirebaseServices.getDocs(this.tasksCollection());
    this.app.state.tasks = tasksSnap.docs
      .map((d) => this.app.normalizeTask({ id: d.id, ...(d.data() || {}) }))
      .sort((a, b) => a.startTime - b.startTime);
    this.hasHydratedTasks = true;
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.TASKS, this.app.state.tasks);
  }

  async hydrateFavoritesFromCloudIfNeeded() {
    if (!this.isReady) return;
    // Read from the dedicated favorites doc
    const ref = window.FirebaseServices.doc(this.db, "users", this.user.uid, "state", "favorites");
    const snap = await window.FirebaseServices.getDoc(ref);
    if (snap.exists() && snap.data().list) {
      this.app.state.favorites = snap.data().list.filter(f => !!f.label);
      this.app.saveToStorage(CONFIG.STORAGE_KEYS.FAVORITES, this.app.state.favorites);
    } else {
      // Fall back to old subcollection for migration
      const favSnap = await window.FirebaseServices.getDocs(this.favoritesCollection());
      this.app.state.favorites = favSnap.docs
        .map((d) => d.data() || {})
        .filter((f) => !!f.label);
      if (this.app.state.favorites.length) {
        this.app.saveToStorage(CONFIG.STORAGE_KEYS.FAVORITES, this.app.state.favorites);
      }
    }
  }

  async hydrateRoadmapFromCloudIfNeeded() {
    if (!this.isReady) return;
    const ref = window.FirebaseServices.doc(this.db, "users", this.user.uid, "roadmap", "main");
    const snap = await window.FirebaseServices.getDoc(ref);
    if (snap.exists() && snap.data().modules) {
      this.app.trainerEngine.state.roadmap = snap.data();
      this.app.saveToStorage(CONFIG.STORAGE_KEYS.ROADMAP_STATE, snap.data());
    } else {
      // Empty state: roadmap not generated yet
      this.app.trainerEngine.state.roadmap = { modules: [], editMode: false };
      this.app.saveToStorage(CONFIG.STORAGE_KEYS.ROADMAP_STATE, this.app.trainerEngine.state.roadmap);
    }
  }

  async writePatch(patch) {
    if (!this.isReady || this.isHydratingCloudState) return;
    try {
      await window.FirebaseServices.setDoc(
        this.userDoc(),
        { ...patch, updatedAt: Date.now() },
        { merge: true },
      );
    } catch (e) {
      console.warn("firebase write failed", e);
    }
  }

  async syncByStorageKey(key, value) {
    if (!this.isReady) return;
    const patch = {};
    // Keep cloud writes minimal to preserve Firestore quota.
    if (key === CONFIG.STORAGE_KEYS.FAVORITES) {
      // Write favorites to dedicated doc for cross-device sync
      const ref = window.FirebaseServices.doc(this.db, "users", this.user.uid, "state", "favorites");
      window.FirebaseServices.setDoc(ref, { list: value || [] }, { merge: false })
        .catch(e => console.warn("Favorites sync failed", e));
    }
    if (key === CONFIG.STORAGE_KEYS.ROADMAP_STATE) {
      // Write roadmap entirely separate from generic state
      const ref = window.FirebaseServices.doc(this.db, "users", this.user.uid, "roadmap", "main");
      window.FirebaseServices.setDoc(ref, value || { modules: [], editMode: false }, { merge: true })
        .catch(e => console.warn("Roadmap sync failed", e));
    }
    if (key === CONFIG.STORAGE_KEYS.FLOW_PROTOCOL)
      patch.flowProtocol = value || { byDate: {} };
    if (key === CONFIG.STORAGE_KEYS.TRAINER_STATE)
      patch.trainerState = value || {};
    if (key === CONFIG.STORAGE_KEYS.SHADOW_AVG)
      patch.shadowAvg = Number(value) || 0;
    if (key === CONFIG.STORAGE_KEYS.ROADMAP_PROMPT_DRAFT)
      patch.roadmapPromptDraft = String(value || "");
    if (key === CONFIG.STORAGE_KEYS.ROADMAP_RESPONSE_DRAFT)
      patch.roadmapResponseDraft = String(value || "");
    if (key === CONFIG.STORAGE_KEYS.TASK_PROMPT_DRAFT)
      patch.taskPromptDraft = String(value || "");
    if (key === CONFIG.STORAGE_KEYS.TASK_RESPONSE_DRAFT)
      patch.taskResponseDraft = String(value || "");
    if (key === CONFIG.STORAGE_KEYS.ACTIVE_TASK) {
      const mission =
        value?.missionTopic ||
        value?.description?.replace(/^Topic:\s*/i, "") ||
        value?.name ||
        "";
      const isRevision = String(mission)
        .toLowerCase()
        .includes("revision");
      if (isRevision)
        patch.revision = {
          status: value ? "running" : "completed",
          timeSpent: 0,
        };
    }
    if (Object.keys(patch).length) await this.writePatch(patch);
  }

  async setTimerState(state) {
    if (!this.isReady) return;
    await window.FirebaseServices.setDoc(this.timerDoc(), state, {
      merge: true,
    });
  }

  async getTimerState() {
    if (!this.isReady) return null;
    const snap = await window.FirebaseServices.getDoc(this.timerDoc());
    return snap.exists() ? (snap.data() || null) : null;
  }

  listenToTimerState() {
    if (!this.isReady) return;
    this.detachTimerListener();
    // Defensive guard: fall back to getDoc if onSnapshot not yet loaded
    if (typeof window.FirebaseServices.onSnapshot !== "function") {
      console.warn("onSnapshot not available â€” falling back to one-time timer restore");
      window.FirebaseServices.getDoc(this.timerDoc()).then(snap => {
        if (snap.exists()) this.app.stopwatch.restoreFromCloud(snap.data());
      }).catch(e => console.warn("Timer restore failed", e));
      return;
    }
    this.timerUnsub = window.FirebaseServices.onSnapshot(
      this.timerDoc(),
      (snap) => {
        if (!snap.exists()) return;
        const timerState = snap.data();
        if (timerState.status === "paused") {
          this.app.stopwatch.stopFromRemote();
        } else if (timerState.status === "running") {
          this.app.stopwatch.restoreFromCloud(timerState);
        }
      },
      (err) => console.warn("Timer sync listener failed", err)
    );
  }

  listenToRoadmap() {
    if (!this.isReady) return;
    this.detachRoadmapListener();
    // Defensive guard: skip if onSnapshot not yet loaded
    if (typeof window.FirebaseServices.onSnapshot !== "function") {
      return;
    }
    const ref = window.FirebaseServices.doc(this.db, "users", this.user.uid, "roadmap", "main");
    this.roadmapUnsub = window.FirebaseServices.onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const roadmapData = snap.data();
        if (roadmapData && roadmapData.modules) {
          this.app.trainerEngine.state.roadmap = roadmapData;
          this.app.saveToStorage(CONFIG.STORAGE_KEYS.ROADMAP_STATE, roadmapData);
          this.app.trainerEngine.refresh();
        }
      },
      (err) => console.warn("Roadmap sync listener failed", err)
    );
  }

  listenToTasks() {
    if (!this.isReady) return;
    this.detachTasksListener();
    if (typeof window.FirebaseServices.onSnapshot !== "function") return;
    let isInitialSnapshot = true;
    this.tasksUnsub = window.FirebaseServices.onSnapshot(
      this.tasksCollection(),
      (snap) => {
        if (
          isInitialSnapshot &&
          this.hasHydratedTasks &&
          snap.docs.length === this.app.state.tasks.length &&
          snap.docChanges().every((change) => change.type === "added")
        ) {
          isInitialSnapshot = false;
          return;
        }
        isInitialSnapshot = false;
        const changes = snap.docChanges().map((change) => ({
          type: change.type,
          id: change.doc.id,
          data: change.type === "removed" ? null : (change.doc.data() || {}),
        }));
        if (!changes.length) return;
        this.app.taskManager.applyRemoteTaskChanges(changes);
      },
      (err) => console.warn("Task sync listener failed", err),
    );
  }

  detachTimerListener() {
    if (!this.timerUnsub) return;
    this.timerUnsub();
    this.timerUnsub = null;
  }

  detachRoadmapListener() {
    if (!this.roadmapUnsub) return;
    this.roadmapUnsub();
    this.roadmapUnsub = null;
  }

  listenToFavorites() {
    if (!this.isReady) return;
    this.detachFavoritesListener();
    if (typeof window.FirebaseServices.onSnapshot !== "function") return;
    const ref = window.FirebaseServices.doc(this.db, "users", this.user.uid, "state", "favorites");
    this.favoritesUnsub = window.FirebaseServices.onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (!data || !Array.isArray(data.list)) return;
        // Only update if different from local state to avoid loops
        const incoming = JSON.stringify(data.list);
        const current = JSON.stringify(this.app.state.favorites);
        if (incoming === current) return;
        this.app.state.favorites = data.list.filter(f => !!f.label);
        // Save to local storage WITHOUT triggering another cloud write
        localStorage.setItem(CONFIG.STORAGE_KEYS.FAVORITES, JSON.stringify(this.app.state.favorites));
        // Re-render favorites panel
        this.app.taskManager?.renderFavorites();
      },
      (err) => console.warn("Favorites sync listener failed", err)
    );
  }

  detachFavoritesListener() {
    if (!this.favoritesUnsub) return;
    this.favoritesUnsub();
    this.favoritesUnsub = null;
  }

  detachUserListener() {
    if (!this.userUnsub) return;
    this.userUnsub();
    this.userUnsub = null;
  }

  detachTasksListener() {
    if (!this.tasksUnsub) return;
    this.tasksUnsub();
    this.tasksUnsub = null;
  }

  async syncTaskUpsert(task) {
    if (!this.isReady || !task?.id) return;
    const normalized = this.app.normalizeTask(task);
    await window.FirebaseServices.setDoc(this.taskDoc(normalized.id), {
      ...normalized,
      updatedAt: Date.now(),
    });
  }

  async syncTaskDelete(taskId) {
    if (!this.isReady || !taskId) return;
    await window.FirebaseServices.deleteDoc(this.taskDoc(taskId));
  }
}
class DisciplineTracker {
  constructor() {
    this.state = {
      tasks: (this.loadFromStorage(CONFIG.STORAGE_KEYS.TASKS) || []).map(
        (t) => this.normalizeTask(t),
      ),
      selectedTaskDate:
        this.loadFromStorage("discipline_tracker_selected_task_date") ||
        this.getDateString(),
      favorites:
        this.loadFromStorage(CONFIG.STORAGE_KEYS.FAVORITES) || [],
      streak:
        parseInt(this.loadFromStorage(CONFIG.STORAGE_KEYS.STREAK)) || 0,
      lastActivityDate: this.loadFromStorage(
        CONFIG.STORAGE_KEYS.LAST_ACTIVITY,
      ),
      journalEntries:
        this.loadFromStorage(CONFIG.STORAGE_KEYS.JOURNAL_ENTRIES) || {},
      activeTask: this.loadFromStorage(CONFIG.STORAGE_KEYS.ACTIVE_TASK),
      charts: { productivity: null, sleep: null },
    };
    this.elements = this.initializeElements();
    this.syncManager = new SyncManager(this);
    this.cloudManager = new FirebaseCloudManager(this);
    this.stopwatch = new StopwatchManager(this);
    this.taskManager = new TaskManager(this);
    this.uiManager = new UIManager(this);
    this.shadowEngine = new ShadowEngine(this);
    this.trainerEngine = new TrainerEngine(this);
    this.flowEngine = new FlowProtocolEngine(this);
    this.graphManager = new GraphManager(this);
    this.eventManager = new EventManager(this);
    this.migrateSchema();
  }
  initializeElements() {
    const elements = {};
    [
      "stopwatch",
      "task-input",
      "start-btn",
      "stop-btn",
      "sleep-btn",
      "add-favorite",
      "active-task-indicator",
      "active-task-name",
      "active-task-start",
      "favorites-grid",
      "tasks-prev-day",
      "tasks-next-day",
      "tasks-today-btn",
      "tasks-date-picker",
      "tasks-date-label",
      "tasks-list",
      "productive-time",
      "sleep-time",
      "total-time",
      "streak-display",
      "current-date",
      "current-time",
      "motivation-line",
      "prod-range",
      "prod-filter",
      "prod-filter-total",
      "graph-productivity-total",
      "graph-total-distraction",
      "graph-logged-distraction",
      "sleep-range",
      "productivity-chart",
      "sleep-chart",
      "streak-popup",
      "streak-count",
      "streak-message",
      "close-streak",
      "view-report",
      "export-data",
      "import-data",
      "open-shadow-ranks",
      "import-file",
      "report-modal",
      "report-content",
      "close-modal",
      "print-report",
      "close-report",
      "shadow-ranks-modal",
      "shadow-ranks-content",
      "close-shadow-ranks",
      "close-shadow-ranks-modal",
      "open-trainer",
      "trainer-modal",
      "generator-panel",
      "generator-panel-toggle",
      "ai-roadmap-topic",
      "generate-roadmap-btn",
      "copy-roadmap-prompt-btn",
      "ai-roadmap-output",
      "ai-roadmap-response",
      "apply-roadmap-response-btn",
      "ai-roadmap-status",
      "ai-task-topic",
      "generate-task-prompt-btn",
      "copy-task-prompt-btn",
      "ai-task-output",
      "ai-task-response",
      "save-task-response-btn",
      "ai-task-status",
      "trainer-overview",
      "trainer-content",
      "close-trainer",
      "close-trainer-modal",
      "refresh-trainer",
      "copy-trainer",
      "sleep-journal-panel",
      "sleep-journal-date",
      "sleep-journal-mood",
      "sleep-journal-rating",
      "sleep-journal-thoughts",
      "sleep-journal-highlight",
      "sleep-journal-tomorrow",
      "sleep-journal-status",
      "journal-save-btn",
      "journal-save-sleep-btn",
      "journal-download-btn",
      "shadow-current-card",
      "shadow-standard-card",
      "shadow-current-minutes",
      "shadow-percent",
      "shadow-gap",
      "shadow-status",
      "shadow-progress-fill",
      "shadow-average",
      "shadow-rank",
      "shadow-badge",
      "shadow-duel",
      "shadow-battle-you",
      "shadow-battle-shadow",
      "shadow-next-rank",
      "shadow-next-rank-sub",
      "shadow-rank-state",
      "shadow-shield-status",
      "shadow-promotion-trial",
      "shadow-promotion-requirements",
      "shadow-rank-note",
      "shadow-rank-note-sub",
      "shadow-rank-ladder",
      "shadow-note",
      "shadow-weekly-average",
      "shadow-momentum",
      "shadow-weekly-gap",
      "shadow-target",
      "shadow-pressure",
      "shadow-score",
      "shadow-needed-tie",
      "shadow-needed-lead",
      "shadow-defense-target",
      "shadow-verdict",
      "shadow-trend",
      "shadow-lead-margin",
      "shadow-duel-you-fill",
      "shadow-duel-shadow-fill",
      "shadow-penalty",
      "shadow-penalty-reason",
      "shadow-penalty-expiry",
      "shadow-distraction-budget",
      "shadow-win-ladder",
      "shadow-mission-score",
      "flow-blockers-status",
      "flow-proneness-status",
      "flow-triggers-status",
      "flow-cycle-status",
      "wake-now-btn",
      "first-action-btn",
      "kill-switch-btn",
      "kill-switch-countdown",
      "flow-before-phone-check",
      "attention-minus-btn",
      "attention-plus-btn",
      "attention-stretch-value",
      "war-score",
      "flow-action-steps",
      "mission-task-1",
      "mission-task-2",
      "mission-task-3",
      "mission-task-4",
      "shadow-standard-metric",
      "shadow-momentum-score",
      "shadow-consistency-index",
      "shadow-growth-trend",
      "roadmap-penalty-timer",
      "google-login-btn",
      "google-logout-btn",
      "auth-user-name",
      "profile-menu-container",
      "profile-menu-toggle",
      "profile-menu",
    ].forEach((id) => (elements[id] = document.getElementById(id)));
    return elements;
  }
  loadFromStorage(key) {
    try {
      const d = localStorage.getItem(key);
      return d ? JSON.parse(d) : null;
    } catch (error) {
      console.warn("storage parse failed", key, error);
      try {
        localStorage.removeItem(key);
      } catch (removeError) {
        console.warn("storage cleanup failed", key, removeError);
      }
      return null;
    }
  }
  saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error("storage save failed", e);
    }
    this.cloudManager?.syncByStorageKey?.(key, data);
  }
  setSelectedTaskDate(dateStr) {
    this.state.selectedTaskDate = dateStr || this.getDateString();
    this.saveToStorage(
      "discipline_tracker_selected_task_date",
      this.state.selectedTaskDate,
    );
  }
  escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  getJournalEntry(dateStr = this.getDateString()) {
    return this.state.journalEntries?.[dateStr] || null;
  }
  isJournalEntryComplete(entry) {
    if (!entry || typeof entry !== "object") return false;
    return !!(String(entry.mood || "").trim() && String(entry.thoughts || "").trim());
  }
  saveJournalEntry(dateStr, entry) {
    if (!dateStr || !entry) return;
    this.state.journalEntries = {
      ...(this.state.journalEntries || {}),
      [dateStr]: {
        ...entry,
        updatedAt: Date.now(),
      },
    };
    this.saveToStorage(
      CONFIG.STORAGE_KEYS.JOURNAL_ENTRIES,
      this.state.journalEntries,
    );
  }
  ensureJournalBeforeSleep() {
    const todayEntry = this.getJournalEntry(this.getDateString());
    if (this.isJournalEntryComplete(todayEntry)) return true;
    this.uiManager?.promptRequiredJournalForSleep?.();
    return false;
  }
  migrateSchema() {
    const current =
      parseInt(
        this.loadFromStorage(CONFIG.STORAGE_KEYS.SCHEMA_VERSION),
      ) || 1;
    if (current < CONFIG.DB_SCHEMA_VERSION) {
      this.state.tasks = this.state.tasks.map((t) =>
        this.normalizeTask(t),
      );
      this.saveToStorage(CONFIG.STORAGE_KEYS.TASKS, this.state.tasks);
      this.saveToStorage(
        CONFIG.STORAGE_KEYS.SCHEMA_VERSION,
        CONFIG.DB_SCHEMA_VERSION,
      );
    }
  }
  normalizeTask(task) {
    const isLegacySleep =
      task.isSleep === true || task.category === "Sleep";
    const category = this.resolveCategory(
      task.category || (isLegacySleep ? "Sleep" : "Miscellaneous"),
    );
    const fallbackSub = CATEGORY_DEFINITIONS[category]?.[0] || "General";
    const subcategory =
      task.subcategory || (isLegacySleep ? "Night Sleep" : fallbackSub);
    const description = task.description || task.name || "";
    const startTime = Number(task.startTime || Date.now());
    const endTime = Number(task.endTime || startTime);
    const rawDuration =
      task.duration ?? Math.round((endTime - startTime) / 60000);
    const duration = Math.min(
      24 * 60,
      Math.max(0, Number.isFinite(rawDuration) ? rawDuration : 0),
    );

    const classifierInput = (task.description || task.name || "").trim();
    const classification = ActivityClassifier.classify(classifierInput);

    // Context-aware correction so graph filters remain reliable:
    // category intent from user selection is respected over weak text hints.
    if (category === "Time Waste / Distraction") {
      classification.category = "DISTRACTION";
      classification.graph_tag = "distraction";
      if (classification.waste_level === "NONE")
        classification.waste_level =
          duration >= 90 ? "HIGH" : duration >= 30 ? "MODERATE" : "LOW";
      classification.confidence = Math.max(75, classification.confidence);
    } else if (PRODUCTIVE_CATEGORIES.has(category)) {
      classification.category = "PRODUCTIVE";
      classification.graph_tag = "productivity";
      classification.waste_level = "NONE";
      classification.confidence = Math.max(70, classification.confidence);
    } else if (category === "Sleep" || category === "Miscellaneous") {
      classification.category = "NEUTRAL";
      classification.graph_tag = "neutral";
      classification.waste_level = "NONE";
      classification.confidence = Math.max(60, classification.confidence);
    }

    const graphTag = task.graph_tag || classification.graph_tag;
    const wasteLevel = task.waste_level || classification.waste_level;
    const growthCategory =
      task.growth_category || classification.category;
    const confidence = Number(
      task.confidence ?? classification.confidence,
    );

    return {
      id:
        task.id ||
        `${startTime}-${Math.random().toString(36).slice(2, 8)}`,
      category,
      subcategory,
      description,
      startTime,
      endTime,
      duration,
      date: task.date || this.getDateString(new Date(startTime)),
      sourceDevice:
        task.sourceDevice || this.syncManager?.getDeviceId?.() || "local",
      createdAt: task.createdAt || Date.now(),
      updatedAt: Date.now(),
      growth_category: growthCategory,
      confidence,
      waste_level: wasteLevel,
      graph_tag: graphTag,
      missionTopic: task.missionTopic || task.topic || "",
      missionType: task.missionType || "",
      sourceAgnostic: !!task.sourceAgnostic,
      classification_json: {
        activity: task.description || task.name || "",
        category: growthCategory,
        confidence,
        waste_level: wasteLevel,
        graph_tag: graphTag,
      },
    };
  }
  getDateString(date = new Date()) {
    const d = new Date(date);
    if (d.getHours() < 5) d.setDate(d.getDate() - 1); // Bind 12AM-5AM metrics natively to previous active day
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  getInferredWasteMinutesForDate(
    dateStr,
    sourceTasks = this.state.tasks,
  ) {
    const trackedMinutes = sourceTasks
      .filter(
        (task) =>
          task.date === dateStr &&
          Number.isFinite(task.duration) &&
          task.duration > 0,
      )
      .reduce((sum, task) => sum + task.duration, 0);
    return Math.max(0, 1440 - Math.min(1440, trackedMinutes));
  }
  formatDuration(minutes) {
    const h = Math.floor(minutes / 60),
      m = Math.floor(minutes % 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }
  formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  isProductiveCategory(category) {
    return PRODUCTIVE_CATEGORIES.has(category);
  }
  resolveCategory(inputCategory) {
    const categories = Object.keys(CATEGORY_DEFINITIONS);
    if (!inputCategory) return "Miscellaneous";
    const normalized = String(inputCategory).trim().toLowerCase();
    const exact = categories.find((c) => c.toLowerCase() === normalized);
    if (exact) return exact;
    if (CATEGORY_ALIASES[normalized]) return CATEGORY_ALIASES[normalized];
    const loose = categories.find(
      (c) =>
        c.toLowerCase().includes(normalized) ||
        normalized.includes(c.toLowerCase()),
    );
    return loose || "Miscellaneous";
  }
  async initialize() {
    if (!window.Chart) {
      try {
        await this.loadChartJS();
      } catch { }
    }
    this.uiManager.initialize();
    this.taskManager.initialize();
    this.shadowEngine.initialize();
    this.trainerEngine.initialize();
    this.flowEngine.initialize();
    this.graphManager.initialize();
    this.eventManager.initialize();
    this.updateStreak();
    if (this.state.activeTask)
      this.stopwatch.resumeActiveTask(this.state.activeTask);
    window.addEventListener("online", () => this.syncManager.syncNow());
    await this.syncManager.syncNow();
    await this.cloudManager.initialize();
  }
  loadChartJS() {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  updateStreak(showPopup = false) {
    const productiveDates = [
      ...new Set(
        this.state.tasks
          .filter(
            (t) =>
              this.isProductiveCategory(t.category) &&
              Number.isFinite(t.duration) &&
              t.duration > 0,
          )
          .map((t) => t.date),
      ),
    ].sort();
    const today = this.getDateString();
    const hasAnyTaskToday = this.state.tasks.some(
      (t) =>
        t.date === today &&
        Number.isFinite(t.duration) &&
        t.duration > 0,
    );
    const hasProductiveTaskToday = productiveDates.includes(today);
    if (
      !productiveDates.length ||
      (hasAnyTaskToday && !hasProductiveTaskToday)
    ) {
      this.state.streak = 0;
      this.saveToStorage(CONFIG.STORAGE_KEYS.STREAK, 0);
      this.elements["streak-display"].textContent = 0;
      return;
    }
    const set = new Set(productiveDates);
    let streak = 0;
    let cursor = hasProductiveTaskToday
      ? today
      : this.getDateString(new Date(Date.now() - 86400000));
    while (set.has(cursor)) {
      streak++;
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = this.getDateString(d);
    }
    const old = this.state.streak;
    this.state.streak = streak;
    this.saveToStorage(CONFIG.STORAGE_KEYS.STREAK, streak);
    this.elements["streak-display"].textContent = streak;
    if (showPopup && streak > old && streak > 1)
      this.uiManager.showStreakPopup();
  }
}
class StopwatchManager {
  constructor(app) {
    this.app = app;
    this.startTime = null;
    this.elapsedBeforePause = 0;
    this.elapsedTime = 0;
    this.tickIntervalId = null;
    this.isRunning = false;
    this.pendingMeta = null;
    this.lastRenderedTime = null;
    this.startGuardInFlight = false;
  }
  formatElapsed(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  getElapsedNow() {
    if (!this.startTime) return this.elapsedBeforePause;
    return this.elapsedBeforePause + Math.max(0, Date.now() - this.startTime);
  }

  renderTime() {
    const elapsed = this.getElapsedNow();
    this.elapsedTime = elapsed;
    const newFormatted = this.formatElapsed(elapsed);
    if (this.lastRenderedTime !== newFormatted) {
      this.app.elements["stopwatch"].textContent = newFormatted;
      this.lastRenderedTime = newFormatted;
    }
  }

  startTicking() {
    if (this.tickIntervalId) clearInterval(this.tickIntervalId);
    this.renderTime();
    this.tickIntervalId = setInterval(() => this.renderTime(), 1000);
  }

  stopTicking() {
    if (!this.tickIntervalId) return;
    clearInterval(this.tickIntervalId);
    this.tickIntervalId = null;
  }

  getTaskInputValue() {
    return (this.app.elements["task-input"]?.value || "").trim();
  }

  promptForCategory() {
    const categoryInput = window.prompt(
      "Choose task category: Productive Work / Study / Physical Training / Time Waste / Sleep / Miscellaneous",
      "Productive Work",
    );
    if (categoryInput === null) return null;
    return this.app.resolveCategory(categoryInput.trim()) || "Productive Work";
  }

  promptForSubcategory(category) {
    const subList = CATEGORY_DEFINITIONS[category] || ["General"];
    const defaultSubcategory = subList[0] || "General";
    const subcategoryInput = window.prompt(
      `Choose subcategory for ${category} (${subList.join(" / ")})`,
      defaultSubcategory,
    );
    if (subcategoryInput === null) return null;
    return (subcategoryInput.trim() || defaultSubcategory).slice(0, 60);
  }

  collectEntryMetadata(taskName, forceCategory = null) {
    const description = (
      this.getTaskInputValue() ||
      taskName ||
      ""
    ).slice(0, 120);

    const category = forceCategory
      ? this.app.resolveCategory(forceCategory) || "Productive Work"
      : this.promptForCategory();
    if (!category) return null;

    const subcategory = forceCategory
      ? (CATEGORY_DEFINITIONS[category]?.[0] || "General")
      : this.promptForSubcategory(category);
    if (!subcategory) return null;

    return { category, subcategory, description };
  }
  async start(taskName = null, meta = null) {
    if (this.startGuardInFlight) return;
    if (this.isRunning)
      return alert("A task is already running. Stop it first.");
    this.startGuardInFlight = true;
    try {
      const remoteTimerState =
        await this.app.cloudManager?.getTimerState?.();
      if (
        remoteTimerState?.status === "running" &&
        remoteTimerState?.activeTask?.startTime
      ) {
        this.restoreFromCloud(remoteTimerState);
        alert(
          "A timer is already running on another device. Stop that timer before starting a new one.",
        );
        return;
      }
    const rawName = (taskName || this.getTaskInputValue() || "").trim();
    if (!meta && !rawName) {
      alert("Task name cannot be empty.");
      return;
    }
    const name = rawName;
    const resolvedMeta = meta || this.collectEntryMetadata(name, null);
    if (!resolvedMeta) return;
    this.startTime = Date.now();
    this.isRunning = true;
    this.elapsedBeforePause = 0;
    this.elapsedTime = 0;
    this.app.state.activeTask = {
      name: name || resolvedMeta.subcategory,
      startTime: this.startTime,
      ...resolvedMeta,
    };
    this.app.saveToStorage(
      CONFIG.STORAGE_KEYS.ACTIVE_TASK,
      this.app.state.activeTask,
    );
    this.app.elements["start-btn"].disabled = true;
    this.app.elements["stop-btn"].disabled = false;
    this.app.elements["task-input"].disabled = true;
    this.app.elements["active-task-name"].textContent =
      `${this.app.state.activeTask.category} â€¢ ${this.app.state.activeTask.subcategory}`;
    this.app.elements["active-task-start"].textContent =
      this.app.formatTime(this.startTime);
    this.app.elements["active-task-indicator"].style.display = "block";
    // Fire-and-forget to avoid blocking UI on network
    if (this.app.cloudManager?.setTimerState) {
      setTimeout(() => {
        this.app.cloudManager.setTimerState({
          status: "running",
          startTime: this.startTime,
          elapsedBeforePause: 0,
          activeTask: this.app.state.activeTask,
        }).catch(e => console.warn("Timer start cloud sync delayed", e));
      }, 0);
    }
    if (this.app.trainerEngine?.syncMissionFromRoadmap) {
      this.app.trainerEngine.syncMissionFromRoadmap({ skipRender: true });
    }
    this.startTicking();
    } finally {
      this.startGuardInFlight = false;
    }
  }
  startSleep() {
    if (!this.app.ensureJournalBeforeSleep()) return;
    if (this.app.trainerEngine?.armRoadmapSlotRollover) {
      this.app.trainerEngine.armRoadmapSlotRollover();
    }
    this.start("Sleep", {
      category: "Sleep",
      subcategory: "Night Sleep",
      description: "Sleep Session",
    });
  }
  stop() {
    if (!this.isRunning) return;
    this.stopTicking();
    const totalElapsed = this.getElapsedNow();
    this.elapsedBeforePause = totalElapsed;
    this.isRunning = false;
    const endTime = Date.now();
    const entry = this.app.normalizeTask({
      id: `${Date.now()}`,
      ...this.app.state.activeTask,
      startTime: this.startTime,
      endTime,
      duration: Math.max(
        1,
        Math.round(totalElapsed / 60000),
      ),
      date: this.app.getDateString(new Date(this.startTime)),
    });
    this.app.taskManager.addTask(entry);

    // Execute network update asynchronously, unblocking UI thread immediately
    if (this.app.cloudManager?.setTimerState) {
      setTimeout(() => {
        this.app.cloudManager.setTimerState({
          status: "paused",
          startTime: null,
          elapsedBeforePause: 0,
          activeTask: null,
        }).catch(e => console.warn("Timer stop cloud sync delayed", e));
      }, 0);
    }
    if (this.app.trainerEngine?.syncMissionFromRoadmap) {
      this.app.trainerEngine.syncMissionFromRoadmap({ skipRender: true });
    }
    this.reset();
  }
  reset() {
    this.isRunning = false;
    this.startTime = null;
    this.elapsedBeforePause = 0;
    this.elapsedTime = 0;
    this.stopTicking();
    this.app.state.activeTask = null;
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.ACTIVE_TASK, null);
    this.app.elements["stopwatch"].textContent = "00:00:00";
    this.app.elements["start-btn"].disabled = false;
    this.app.elements["stop-btn"].disabled = true;
    this.app.elements["task-input"].disabled = false;
    this.app.elements["active-task-indicator"].style.display = "none";
    this.app.elements["task-input"].value = "";
    if (this.app.trainerEngine?.syncMissionFromRoadmap) {
      this.app.trainerEngine.syncMissionFromRoadmap({ skipRender: true });
    }
  }
  resumeActiveTask(activeTask) {
    if (!activeTask?.startTime || this.isRunning) return;
    this.startTime = Number(activeTask.startTime);
    this.elapsedBeforePause = Number(activeTask.elapsedBeforePause || 0);
    this.isRunning = true;
    this.app.state.activeTask = activeTask;
    this.app.elements["start-btn"].disabled = true;
    this.app.elements["stop-btn"].disabled = false;
    this.app.elements["task-input"].disabled = true;
    this.app.elements["active-task-name"].textContent =
      `${activeTask.category || "Productive Work"} â€¢ ${activeTask.subcategory || "General"}`;
    this.app.elements["active-task-start"].textContent =
      this.app.formatTime(activeTask.startTime);
    this.app.elements["active-task-indicator"].style.display = "block";
    this.startTicking();
  }

  resumeRemoteMission(activeTask) {
    this.resumeActiveTask(activeTask);
    this.app.state.activeTask = activeTask;
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.ACTIVE_TASK, activeTask);
  }

  stopFromRemote() {
    if (!this.isRunning) return;
    this.reset();
  }

  restoreFromCloud(timerState) {
    if (this.isRunning || !timerState || timerState.status !== "running")
      return;
    const activeTask = timerState.activeTask;
    const startTime = Number(timerState.startTime);
    if (!activeTask || !startTime) return;

    // Check if we are already perfectly synced
    if (this.isRunning && this.startTime === startTime) return;

    this.resumeActiveTask({
      ...activeTask,
      startTime,
      elapsedBeforePause: Number(timerState.elapsedBeforePause || 0),
    });
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.ACTIVE_TASK, {
      ...activeTask,
      startTime,
    });
  }
}
class TaskManager {
  constructor(app) {
    this.app = app;
  }
  initialize() {
    if (!this.app.state.selectedTaskDate)
      this.app.setSelectedTaskDate(this.app.getDateString());
    this.syncTaskDateControls();
    this.updateStats();
    this.renderTasks();
    this.renderFavorites();
  }
  formatCalendarDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  formatTaskDateLabel(dateStr) {
    if (!dateStr) return "Today";
    const today = this.app.getDateString();
    if (dateStr === today) return "Today";
    const yesterday = this.app.getDateString(
      new Date(Date.now() - 86400000),
    );
    if (dateStr === yesterday) return "Yesterday";
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  syncTaskDateControls() {
    const selectedDate =
      this.app.state.selectedTaskDate || this.app.getDateString();
    if (this.app.elements["tasks-date-picker"])
      this.app.elements["tasks-date-picker"].value = selectedDate;
    if (this.app.elements["tasks-date-picker"])
      this.app.elements["tasks-date-picker"].max =
        this.app.getDateString();
    if (this.app.elements["tasks-date-label"])
      this.app.elements["tasks-date-label"].textContent =
        this.formatTaskDateLabel(selectedDate);
    if (this.app.elements["tasks-next-day"]) {
      this.app.elements["tasks-next-day"].disabled =
        selectedDate >= this.app.getDateString();
    }
  }
  setTaskViewDate(dateStr) {
    this.app.setSelectedTaskDate(dateStr);
    this.syncTaskDateControls();
    this.renderTasks();
  }
  shiftTaskViewDate(offsetDays) {
    const selectedDate =
      this.app.state.selectedTaskDate || this.app.getDateString();
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + offsetDays);
    const nextDate = this.formatCalendarDate(d);
    const today = this.app.getDateString();
    this.setTaskViewDate(nextDate > today ? today : nextDate);
  }
  mergeTasks(incoming) {
    const map = new Map(this.app.state.tasks.map((t) => [t.id, t]));
    incoming.forEach((t) => map.set(t.id, this.app.normalizeTask(t)));
    this.app.state.tasks = [...map.values()].sort(
      (a, b) => a.startTime - b.startTime,
    );
    incoming.forEach((t) => this.app.cloudManager?.syncTaskUpsert?.(t));
    this.app.saveToStorage(
      CONFIG.STORAGE_KEYS.TASKS,
      this.app.state.tasks,
    );
    this.refreshViews();
  }

  refreshViews(updateStreakWithActivity = false) {
    this.updateStats();
    this.renderTasks();
    this.app.graphManager.updateCharts();
    this.app.updateStreak(updateStreakWithActivity);
  }

  applyRemoteTaskChanges(changes) {
    let changed = false;
    const byId = new Map(this.app.state.tasks.map((t) => [String(t.id), t]));
    changes.forEach((change) => {
      const id = String(change.id);
      if (change.type === "removed") {
        if (byId.delete(id)) changed = true;
        return;
      }
      const normalized = this.app.normalizeTask({ id, ...(change.data || {}) });
      const existing = byId.get(id);
      if (
        existing &&
        Number(existing.updatedAt || 0) >= Number(normalized.updatedAt || 0) &&
        Number(existing.endTime || 0) === Number(normalized.endTime || 0) &&
        Number(existing.duration || 0) === Number(normalized.duration || 0)
      )
        return;
      byId.set(id, normalized);
      changed = true;
    });
    if (!changed) return;
    this.app.state.tasks = [...byId.values()].sort((a, b) => a.startTime - b.startTime);
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.TASKS, this.app.state.tasks);
    this.refreshViews();
  }

  addTask(task) {
    this.app.state.tasks.push(this.app.normalizeTask(task));
    this.app.saveToStorage(
      CONFIG.STORAGE_KEYS.TASKS,
      this.app.state.tasks,
    );
    this.app.cloudManager?.syncTaskUpsert?.(task);
    this.app.syncManager.queue({
      type: "upsert",
      entry: task,
      ts: Date.now(),
    });
    this.app.syncManager.flushQueue();
    this.refreshViews(true);
  }
  deleteTask(taskId) {
    this.app.state.tasks = this.app.state.tasks.filter(
      (task) => task.id !== taskId,
    );
    this.app.saveToStorage(
      CONFIG.STORAGE_KEYS.TASKS,
      this.app.state.tasks,
    );
    this.app.cloudManager?.syncTaskDelete?.(taskId);
    this.app.syncManager.queue({
      type: "delete",
      id: taskId,
      ts: Date.now(),
    });
    this.refreshViews();
  }
  updateStats() {
    const today = this.app.getDateString();
    const todayTasks = this.app.state.tasks.filter(
      (task) => task.date === today,
    );
    const productiveTime = todayTasks
      .filter((task) => this.app.isProductiveCategory(task.category))
      .reduce((t, task) => t + task.duration, 0);
    const sleepTime = todayTasks
      .filter((task) => task.category === "Sleep")
      .reduce((t, task) => t + task.duration, 0);
    const totalTime = todayTasks.reduce(
      (t, task) => t + task.duration,
      0,
    );
    this.app.elements["productive-time"].textContent =
      this.app.formatDuration(productiveTime);
    this.app.elements["sleep-time"].textContent =
      this.app.formatDuration(sleepTime);
    this.app.elements["total-time"].textContent =
      this.app.formatDuration(totalTime);

    if (this.app.shadowEngine) this.app.shadowEngine.refresh();
    if (this.app.flowEngine) this.app.flowEngine.refresh();
  }
  renderTasks() {
    const selectedDate =
      this.app.state.selectedTaskDate || this.app.getDateString();
    const tasks = this.app.state.tasks
      .filter((task) => task.date === selectedDate)
      .sort((a, b) => b.startTime - a.startTime);
    const c = this.app.elements["tasks-list"];
    this.syncTaskDateControls();
    c.innerHTML = "";
    if (!tasks.length) {
      const label =
        selectedDate === this.app.getDateString()
          ? "today"
          : this.formatTaskDateLabel(selectedDate);
      c.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-secondary);"><i class="fas fa-clipboard-list" style="font-size: 3rem; margin-bottom: 1rem;"></i><p>No tasks recorded for ${this.app.escapeHtml(label)}</p><p style="font-size: 0.9rem;">Choose another date or start tracking a task</p></div>`;
      return;
    }
    tasks.forEach((task) => {
      const el = document.createElement("div");
      const isSleep = task.category === "Sleep";
      const editLabel = isSleep ? "Edit Sleep" : "Edit Task";
      const editClass = isSleep ? "edit-sleep-btn" : "edit-task-btn";
      el.className = `task-card ${isSleep ? "sleep" : "productive"}`;
      el.innerHTML = `<div class="task-header"><div class="task-name">${isSleep ? "[SLEEP]" : "[TASK]"} ${this.app.escapeHtml(task.category)} - ${this.app.escapeHtml(task.subcategory)}</div><div class="task-duration">${this.app.formatDuration(task.duration)}</div></div><div class="task-time">${this.app.formatTime(task.startTime)} - ${this.app.formatTime(task.endTime)}</div><div class="task-time">${this.app.escapeHtml(task.description || "")}</div><div class="task-actions"><button class="btn ${editClass}" data-id="${this.app.escapeHtml(task.id)}"><i class="fas fa-pen"></i> ${editLabel}</button><button class="btn delete-task-btn" data-id="${this.app.escapeHtml(task.id)}"><i class="fas fa-trash"></i> Delete</button></div>`;
      c.appendChild(el);
    });
    document
      .querySelectorAll(".delete-task-btn")
      .forEach((btn) =>
        btn.addEventListener("click", (e) =>
          this.deleteTask(e.currentTarget.getAttribute("data-id")),
        ),
      );
    document
      .querySelectorAll(".edit-task-btn")
      .forEach((btn) =>
        btn.addEventListener("click", (e) =>
          this.editTask(e.currentTarget.getAttribute("data-id")),
        ),
      );
    document
      .querySelectorAll(".edit-sleep-btn")
      .forEach((btn) =>
        btn.addEventListener("click", (e) =>
          this.editSleepTask(e.currentTarget.getAttribute("data-id")),
        ),
      );
  }

  toEditableDateTime(ts) {
    const d = new Date(ts);
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, "0");
    const D = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${Y}-${M}-${D} ${h}:${m}`;
  }

  parseEditableDateTime(value) {
    if (!value) return null;
    const parsed = new Date(value.replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  persistTaskUpdate(task) {
    task.updatedAt = Date.now();
    this.app.saveToStorage(
      CONFIG.STORAGE_KEYS.TASKS,
      this.app.state.tasks,
    );
    this.app.cloudManager?.syncTaskUpsert?.(task);
    this.app.syncManager.queue({
      type: "upsert",
      entry: task,
      ts: Date.now(),
    });
    this.app.syncManager.flushQueue();
    this.refreshViews();
  }

  editTask(taskId) {
    const task = this.app.state.tasks.find(
      (t) => t.id === taskId && t.category !== "Sleep",
    );
    if (!task) return;

    const categoryOptions = Object.keys(CATEGORY_DEFINITIONS).filter(
      (category) => category !== "Sleep",
    );
    const categoryInput = prompt(
      `Task category (${categoryOptions.join(" / ")})`,
      task.category,
    );
    if (categoryInput === null) return;

    const category =
      this.app.resolveCategory(categoryInput.trim()) || task.category;
    const subcategoryOptions = CATEGORY_DEFINITIONS[category] || ["General"];
    const subcategoryInput = prompt(
      `Subcategory for ${category} (${subcategoryOptions.join(" / ")})`,
      task.subcategory,
    );
    if (subcategoryInput === null) return;

    const descriptionInput = prompt(
      "Task description",
      task.description || "",
    );
    if (descriptionInput === null) return;

    const startInput = prompt(
      "Task start (YYYY-MM-DD HH:mm)",
      this.toEditableDateTime(task.startTime),
    );
    if (startInput === null) return;

    const endInput = prompt(
      "Task end (YYYY-MM-DD HH:mm)",
      this.toEditableDateTime(task.endTime),
    );
    if (endInput === null) return;

    const newStart = this.parseEditableDateTime(startInput.trim());
    const newEnd = this.parseEditableDateTime(endInput.trim());
    if (!newStart || !newEnd || newEnd <= newStart) {
      alert("Invalid task time range.");
      return;
    }

    task.category = category;
    task.subcategory =
      (subcategoryInput.trim() || subcategoryOptions[0] || "General").slice(
        0,
        60,
      );
    task.description = descriptionInput.trim().slice(0, 120);
    task.startTime = newStart;
    task.endTime = newEnd;
    task.duration = Math.min(
      24 * 60,
      Math.max(1, Math.round((newEnd - newStart) / 60000)),
    );
    task.date = this.app.getDateString(new Date(newStart));

    Object.assign(task, this.app.normalizeTask(task));
    this.persistTaskUpdate(task);
  }

  editSleepTask(taskId) {
    const task = this.app.state.tasks.find(
      (t) => t.id === taskId && t.category === "Sleep",
    );
    if (!task) return;

    const startInput = prompt(
      "Sleep start (YYYY-MM-DD HH:mm)",
      this.toEditableDateTime(task.startTime),
    );
    if (startInput === null) return;
    const endInput = prompt(
      "Sleep end (YYYY-MM-DD HH:mm)",
      this.toEditableDateTime(task.endTime),
    );
    if (endInput === null) return;

    const newStart = this.parseEditableDateTime(startInput.trim());
    const newEnd = this.parseEditableDateTime(endInput.trim());
    if (!newStart || !newEnd || newEnd <= newStart) {
      alert("Invalid sleep time range.");
      return;
    }

    task.startTime = newStart;
    task.endTime = newEnd;
    task.duration = Math.min(
      24 * 60,
      Math.max(1, Math.round((newEnd - newStart) / 60000)),
    );
    task.date = this.app.getDateString(new Date(newStart));

    Object.assign(task, this.app.normalizeTask(task));
    this.persistTaskUpdate(task);
  }
  renderFavorites() {
    const container = this.app.elements["favorites-grid"];
    container.innerHTML = "";
    if (!this.app.state.favorites.length) {
      container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);"><i class="far fa-star" style="font-size: 2rem; margin-bottom: 0.5rem;"></i><p>No favorites yet</p><p style="font-size: 0.9rem;">Add tasks to favorites for quick start</p></div>`;
      return;
    }
    this.app.state.favorites.forEach((f, idx) => {
      const fav =
        typeof f === "string"
          ? {
            label: f,
            category: "Productive Work",
            subcategory: "Execution",
          }
          : f;
      const el = document.createElement("div");
      el.className = "favorite-card";
      el.innerHTML = `<div class="favorite-name">${this.app.escapeHtml(fav.label)}</div><div class="favorite-actions"><button class="btn start-favorite-btn" data-index="${idx}"><i class="fas fa-play"></i></button><button class="btn remove-favorite-btn" data-index="${idx}"><i class="fas fa-times"></i></button></div>`;
      container.appendChild(el);
    });
    document.querySelectorAll(".start-favorite-btn").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        const fav =
          this.app.state.favorites[
          parseInt(e.currentTarget.getAttribute("data-index"), 10)
          ];
        const f =
          typeof fav === "string"
            ? {
              label: fav,
              category: "Productive Work",
              subcategory: "Execution",
            }
            : fav;
        this.app.stopwatch.start(f.label, {
          category: f.category,
          subcategory: f.subcategory,
          description: f.label,
        });
      }),
    );
    document
      .querySelectorAll(".remove-favorite-btn")
      .forEach((btn) =>
        btn.addEventListener("click", (e) =>
          this.removeFavorite(
            parseInt(e.currentTarget.getAttribute("data-index"), 10),
          ),
        ),
      );
  }
  addFavorite() {
    const label = this.app.elements["task-input"].value.trim();
    if (!label)
      return alert("Please enter a task name to add to favorites");
    const category = this.app.resolveCategory(
      prompt("Favorite category", "Productive Work"),
    );
    const subcategory =
      prompt(
        "Favorite subcategory",
        CATEGORY_DEFINITIONS[category]?.[0] || "General",
      ) || "General";
    const fav = { label, category, subcategory };
    this.app.state.favorites.push(fav);
    this.app.saveToStorage(
      CONFIG.STORAGE_KEYS.FAVORITES,
      this.app.state.favorites,
    );
    this.renderFavorites();
  }
  removeFavorite(index) {
    this.app.state.favorites.splice(index, 1);
    this.app.saveToStorage(
      CONFIG.STORAGE_KEYS.FAVORITES,
      this.app.state.favorites,
    );
    this.renderFavorites();
  }
}
class AnalyticsService {
  static buildMonthlyReport(
    tasks,
    year,
    month,
    thresholdMinutes = CONFIG.DAILY_PRODUCTIVITY_THRESHOLD_MINUTES,
  ) {
    const monthTasks = tasks.filter((t) => {
      const d = new Date(t.startTime);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    const prevTasks = tasks.filter((t) => {
      const d = new Date(t.startTime);
      return d.getFullYear() === py && d.getMonth() === pm;
    });
    const totals = Object.fromEntries(
      Object.keys(CATEGORY_DEFINITIONS).map((c) => [c, 0]),
    );
    const daily = {};
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      daily[date] = {
        productive: 0,
        sleep: 0,
        waste: 0,
        total: 0,
        inferredWaste: 0,
      };
    }

    monthTasks.forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.duration;
      const day =
        daily[t.date] ||
        (daily[t.date] = {
          productive: 0,
          sleep: 0,
          waste: 0,
          total: 0,
          inferredWaste: 0,
        });
      if (PRODUCTIVE_CATEGORIES.has(t.category))
        day.productive += t.duration;
      if (t.category === "Sleep") day.sleep += t.duration;
      if (t.category === "Time Waste / Distraction")
        day.waste += t.duration;
      day.total += t.duration;
    });

    let inferredWasteMinutes = 0;
    Object.values(daily).forEach((day) => {
      const inferredWaste = Math.max(0, 1440 - Math.min(1440, day.total));
      day.inferredWaste = inferredWaste;
      day.waste += inferredWaste;
      day.total += inferredWaste;
      inferredWasteMinutes += inferredWaste;
    });
    totals["Time Waste / Distraction"] =
      (totals["Time Waste / Distraction"] || 0) + inferredWasteMinutes;

    const totalMinutes = Object.values(totals).reduce((a, b) => a + b, 0);
    const productiveMinutes = Object.entries(totals)
      .filter(([k]) => PRODUCTIVE_CATEGORIES.has(k))
      .reduce((a, [, v]) => a + v, 0);
    const sleepMinutes = totals["Sleep"] || 0;
    const wasteMinutes = totals["Time Waste / Distraction"] || 0;
    const awakeMinutes = Math.max(0, totalMinutes - sleepMinutes);
    const activeDays = Math.max(1, daysInMonth);
    const productivityRatio = awakeMinutes
      ? productiveMinutes / awakeMinutes
      : 0;
    const pctByCategory = Object.fromEntries(
      Object.keys(totals).map((k) => [
        k,
        totalMinutes ? (totals[k] / totalMinutes) * 100 : 0,
      ]),
    );
    const bestProductiveDay =
      Object.entries(daily).sort(
        (a, b) => b[1].productive - a[1].productive,
      )[0] || null;
    const worstWasteDay =
      Object.entries(daily).sort((a, b) => b[1].waste - a[1].waste)[0] ||
      null;
    const sleepStreak = AnalyticsService.longestSleepConsistencyStreak(
      daily,
      420,
    );
    const underProductiveDays = Object.entries(daily).filter(
      ([, v]) => v.productive < thresholdMinutes,
    ).length;
    const prevProductive = prevTasks
      .filter((t) => PRODUCTIVE_CATEGORIES.has(t.category))
      .reduce((a, t) => a + t.duration, 0);
    const prevDaysInMonth = new Date(py, pm + 1, 0).getDate();
    const prevDailyTotals = {};
    for (let day = 1; day <= prevDaysInMonth; day++) {
      const date = `${py}-${String(pm + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      prevDailyTotals[date] = 0;
    }
    prevTasks.forEach((t) => {
      prevDailyTotals[t.date] =
        (prevDailyTotals[t.date] || 0) + t.duration;
    });
    const prevInferredWaste = Object.values(prevDailyTotals).reduce(
      (sum, tracked) => sum + Math.max(0, 1440 - Math.min(1440, tracked)),
      0,
    );
    const prevWaste =
      prevTasks
        .filter((t) => t.category === "Time Waste / Distraction")
        .reduce((a, t) => a + t.duration, 0) + prevInferredWaste;
    const productiveBreakdown = AnalyticsService.breakdown(
      monthTasks,
      "Productive Work",
    );
    const missionBreakdown = AnalyticsService.missionBreakdown(monthTasks);
    const trainingBreakdown = AnalyticsService.breakdown(
      monthTasks,
      "Physical Training",
    );
    return {
      year,
      month,
      totals,
      totalMinutes,
      productiveMinutes,
      sleepMinutes,
      wasteMinutes,
      inferredWasteMinutes,
      awakeMinutes,
      pctByCategory,
      dailyAverageSleep: sleepMinutes / activeDays,
      dailyAverageProductive: productiveMinutes / activeDays,
      productivityRatio,
      daily,
      productiveBreakdown,
      missionBreakdown,
      trainingBreakdown,
      bestProductiveDay,
      worstWasteDay,
      sleepConsistency: { longestStreakDays: sleepStreak },
      alerts: {
        underProductivity:
          productiveMinutes < thresholdMinutes * activeDays,
        underProductiveDays,
        thresholdMinutes,
      },
      improvement: {
        productiveDeltaMinutes: productiveMinutes - prevProductive,
        wasteDeltaMinutes: wasteMinutes - prevWaste,
      },
    };
  }
  static breakdown(tasks, category) {
    const out = {};
    tasks
      .filter((t) => t.category === category)
      .forEach(
        (t) =>
          (out[t.subcategory] = (out[t.subcategory] || 0) + t.duration),
      );
    return out;
  }
  static missionBreakdown(tasks) {
    const out = {};
    tasks
      .filter(
        (t) =>
          PRODUCTIVE_CATEGORIES.has(t.category) &&
          String(t.missionTopic || "").trim(),
      )
      .forEach((t) => {
        const key = String(t.missionTopic || "").trim();
        out[key] = (out[key] || 0) + t.duration;
      });
    return Object.fromEntries(
      Object.entries(out).sort((a, b) => b[1] - a[1]),
    );
  }
  static longestSleepConsistencyStreak(daily, targetMin) {
    const days = Object.keys(daily).sort();
    let best = 0;
    let run = 0;
    days.forEach((d) => {
      if ((daily[d].sleep || 0) >= targetMin) {
        run += 1;
        best = Math.max(best, run);
      } else run = 0;
    });
    return best;
  }

  static buildSleepInsights(tasks) {
    const today = new Date();
    const daily = new Map();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      daily.set(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        0,
      );
    }
    tasks.forEach((t) => {
      if (t.category !== "Sleep") return;
      if (daily.has(t.date))
        daily.set(t.date, daily.get(t.date) + t.duration);
    });
    const values = [...daily.values()];
    const avg =
      values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);
    const target = 480;
    const debt = target - avg;
    const variance =
      values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) /
      Math.max(values.length, 1);
    const std = Math.sqrt(variance);
    let consistency = "High";
    if (std > 90) consistency = "Low";
    else if (std > 45) consistency = "Moderate";
    return { averageLast7: avg, sleepDebt: debt, consistency, values };
  }
}
class UIManager {
  constructor(app) {
    this.app = app;
    this.currentMotivationIndex = 0;
    this.pendingSleepAfterJournal = false;
  }
  initialize() {
    this.updateDateTime();
    this.startMotivationRotation();
    this.renderSleepJournal();
  }
  updateDateTime() {
    const updateTime = () => {
      const now = new Date();
      this.app.elements["current-date"].textContent =
        now.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      this.app.elements["current-time"].textContent =
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
    };
    updateTime();
    setInterval(updateTime, 1000);
  }
  startMotivationRotation() {
    this.updateMotivation();
    setInterval(
      () => this.updateMotivation(),
      CONFIG.MOTIVATION_INTERVAL,
    );
  }
  updateMotivation() {
    const e = this.app.elements["motivation-line"];
    e.style.opacity = "0";
    setTimeout(() => {
      let n;
      do {
        n = Math.floor(Math.random() * MOTIVATION_LINES.length);
      } while (
        n === this.currentMotivationIndex &&
        MOTIVATION_LINES.length > 1
      );
      this.currentMotivationIndex = n;
      e.textContent = MOTIVATION_LINES[n];
      e.style.opacity = "1";
    }, 500);
  }
  showStreakPopup() {
    const streak = this.app.state.streak;
    this.app.elements["streak-count"].textContent = streak;
    this.app.elements["streak-message"].textContent =
      STREAK_MESSAGES[streak] || `${streak} days strong. Keep going.`;
    this.app.elements["streak-popup"].style.display = "flex";
  }
  hideStreakPopup() {
    this.app.elements["streak-popup"].style.display = "none";
  }
  showReport() {
    const now = new Date();
    const r = AnalyticsService.buildMonthlyReport(
      this.app.state.tasks,
      now.getFullYear(),
      now.getMonth(),
    );
    const monthName = now.toLocaleString("default", { month: "long" });
    const rows = Object.keys(r.daily)
      .sort()
      .map((date) => {
        const d = r.daily[date];
        return `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(d.productive)}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(d.sleep)}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(d.waste)}</td></tr>`;
      })
      .join("");
    const catRows = Object.entries(r.totals)
      .map(
        ([k, v]) =>
          `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.escapeHtml(k)}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(v)}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${r.pctByCategory[k].toFixed(1)}%</td></tr>`,
      )
      .join("");
    const prodBreak =
      Object.entries(r.productiveBreakdown)
        .map(
          ([k, v]) =>
            `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.escapeHtml(k)}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(v)}</td></tr>`,
        )
        .join("") ||
      '<tr><td style="padding:0.75rem;" colspan="2">No entries</td></tr>';
    const missionBreak =
      Object.entries(r.missionBreakdown || {})
        .map(
          ([k, v]) =>
            `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.escapeHtml(k)}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(v)}</td></tr>`,
        )
        .join("") ||
      '<tr><td style="padding:0.75rem;" colspan="2">No mission-linked entries</td></tr>';
    const trainBreak =
      Object.entries(r.trainingBreakdown)
        .map(
          ([k, v]) =>
            `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.escapeHtml(k)}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(v)}</td></tr>`,
        )
        .join("") ||
      '<tr><td style="padding:0.75rem;" colspan="2">No entries</td></tr>';
    const best = r.bestProductiveDay
      ? `${r.bestProductiveDay[0]} (${this.app.formatDuration(r.bestProductiveDay[1].productive)})`
      : "N/A";
    const worst = r.worstWasteDay
      ? `${r.worstWasteDay[0]} (${this.app.formatDuration(r.worstWasteDay[1].waste)})`
      : "N/A";
    const sleepInsights = AnalyticsService.buildSleepInsights(
      this.app.state.tasks,
    );
    const summaryRows = [
      ["Total Sleep", this.app.formatDuration(r.sleepMinutes)],
      ["Total Productive", this.app.formatDuration(r.productiveMinutes)],
      [
        "Total Waste",
        `${this.app.formatDuration(r.wasteMinutes)} (Untracked: ${this.app.formatDuration(r.inferredWasteMinutes)})`,
      ],
      ["Total Awake", this.app.formatDuration(r.awakeMinutes)],
      [
        "Productivity Ratio",
        `${(r.productivityRatio * 100).toFixed(1)}%`,
      ],
      ["Daily Avg Sleep", this.app.formatDuration(r.dailyAverageSleep)],
      [
        "Daily Avg Productive",
        this.app.formatDuration(r.dailyAverageProductive),
      ],
      [
        "Improvement vs Previous Month",
        `Productive ${this.app.formatDuration(r.improvement.productiveDeltaMinutes)} | Waste ${this.app.formatDuration(r.improvement.wasteDeltaMinutes)}`,
      ],
      ["Best Productive Day", best],
      ["Worst Waste Day", worst],
      [
        "Sleep Consistency",
        `Longest >=7h streak: ${r.sleepConsistency.longestStreakDays} days`,
      ],
      [
        "Sleep Last 7 Days",
        `Avg ${this.app.formatDuration(sleepInsights.averageLast7)} | ${sleepInsights.sleepDebt > 0 ? `Debt ${this.app.formatDuration(sleepInsights.sleepDebt)}` : `Surplus ${this.app.formatDuration(Math.abs(sleepInsights.sleepDebt))}`} | Consistency ${sleepInsights.consistency}`,
      ],
      [
        "Alerts",
        r.alerts.underProductivity
          ? `Under productivity (${r.alerts.underProductiveDays} days below ${this.app.formatDuration(r.alerts.thresholdMinutes)})`
          : "None",
      ],
    ]
      .map(
        ([label, value]) =>
          `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);font-weight:600;">${this.app.escapeHtml(label)}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.escapeHtml(value)}</td></tr>`,
      )
      .join("");
    this.app.elements["report-content"].innerHTML = `
          <h3 style="margin-bottom:1rem;">${this.app.escapeHtml(`${monthName} ${r.year} Monthly Report`)}</h3>
          <h4 style="margin-top:1rem;">Summary</h4>
          <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><tbody>${summaryRows}</tbody></table></div>
          <h4 style="margin-top:1rem;">Category Totals</h4>
          <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Category</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Duration</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Share</th></tr></thead><tbody>${catRows}</tbody></table></div>
           <h4 style="margin-top:1rem;">Productive Work Breakdown</h4>
           <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Subcategory</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Duration</th></tr></thead><tbody>${prodBreak}</tbody></table></div>
           <h4 style="margin-top:1rem;">Mission Progress</h4>
           <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Mission Topic</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Tracked Time</th></tr></thead><tbody>${missionBreak}</tbody></table></div>
           <h4 style="margin-top:1rem;">Physical Training Breakdown</h4>
           <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Subcategory</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Duration</th></tr></thead><tbody>${trainBreak}</tbody></table></div>
          <h4>Daily Breakdown</h4>
          <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Date</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Productive</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Sleep</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Total Waste</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    this.app.elements["report-modal"].style.display = "flex";
  }
  hideReport() {
    this.app.elements["report-modal"].style.display = "none";
  }
  showShadowRanksGuide() {
    const shadowRanks = this.app.shadowEngine.rankTiers
      .map(
        (rank) => `
          <article class="shadow-rank-card">
            <div class="shadow-rank-card-head">
              <div class="shadow-rank-name">${this.app.escapeHtml(rank.title)}</div>
              <div class="shadow-rank-threshold">${this.app.escapeHtml(`${rank.min}+ rating`)}</div>
            </div>
            <div class="shadow-rank-tagline">${this.app.escapeHtml(rank.tagline)}</div>
            <div class="shadow-rank-copy">${this.app.escapeHtml(rank.profile)}</div>
            <div class="shadow-rank-famous"><strong>Why it is famous:</strong> ${this.app.escapeHtml(rank.fame)}</div>
          </article>`,
      )
      .join("");

    this.app.elements["shadow-ranks-content"].innerHTML = `
      <div class="shadow-ranks-intro">
        Each SHADOW rank is named after a well-known missile system and mapped to a discipline tier. Open this window any time from the profile menu to understand what each rank means and why that name was chosen.
      </div>
      <div class="shadow-ranks-grid">${shadowRanks}</div>
    `;
    this.app.elements["shadow-ranks-modal"].style.display = "flex";
  }
  hideShadowRanksGuide() {
    this.app.elements["shadow-ranks-modal"].style.display = "none";
  }
  getSleepJournalDraft() {
    return {
      date: this.app.getDateString(),
      mood: this.app.elements["sleep-journal-mood"]?.value || "",
      rating: this.app.elements["sleep-journal-rating"]?.value || "",
      thoughts: (this.app.elements["sleep-journal-thoughts"]?.value || "").trim(),
      highlight: (this.app.elements["sleep-journal-highlight"]?.value || "").trim(),
      tomorrow: (this.app.elements["sleep-journal-tomorrow"]?.value || "").trim(),
    };
  }

  setSleepJournalStatus(message, tone = "") {
    const el = this.app.elements["sleep-journal-status"];
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("is-error", "is-success");
    if (tone) el.classList.add(tone);
  }

  renderSleepJournal(dateStr = this.app.getDateString()) {
    const entry = this.app.getJournalEntry(dateStr) || {};
    const dateLabel = this.app.elements["sleep-journal-date"];
    if (dateLabel) {
      const date = new Date(`${dateStr}T00:00:00`);
      dateLabel.textContent = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
    if (this.app.elements["sleep-journal-mood"])
      this.app.elements["sleep-journal-mood"].value = entry.mood || "";
    if (this.app.elements["sleep-journal-rating"])
      this.app.elements["sleep-journal-rating"].value = entry.rating || "";
    if (this.app.elements["sleep-journal-thoughts"])
      this.app.elements["sleep-journal-thoughts"].value = entry.thoughts || "";
    if (this.app.elements["sleep-journal-highlight"])
      this.app.elements["sleep-journal-highlight"].value = entry.highlight || "";
    if (this.app.elements["sleep-journal-tomorrow"])
      this.app.elements["sleep-journal-tomorrow"].value = entry.tomorrow || "";

    if (this.app.isJournalEntryComplete(entry)) {
      this.setSleepJournalStatus("Tonight's journal is saved.", "is-success");
    } else {
      this.setSleepJournalStatus(
        "Mood and daily thoughts are required before sleep starts.",
      );
    }
  }

  saveSleepJournal({ startSleepAfterSave = false } = {}) {
    const draft = this.getSleepJournalDraft();
    if (!this.app.isJournalEntryComplete(draft)) {
      this.setSleepJournalStatus(
        "Select your mood and write your daily thoughts before sleep.",
        "is-error",
      );
      this.app.elements["sleep-journal-thoughts"]?.focus();
      return false;
    }
    this.app.saveJournalEntry(draft.date, draft);
    this.setSleepJournalStatus("Night journal saved.", "is-success");
    this.pendingSleepAfterJournal = false;
    if (startSleepAfterSave) {
      this.app.trainerEngine.hideWindow();
      this.app.stopwatch.startSleep();
    }
    return true;
  }

  promptRequiredJournalForSleep() {
    this.pendingSleepAfterJournal = true;
    this.app.trainerEngine.showWindow();
    this.renderSleepJournal();
    this.setSleepJournalStatus(
      "Complete tonight's journal first, then use Save And Sleep.",
      "is-error",
    );
    this.app.elements["sleep-journal-panel"]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    this.app.elements["sleep-journal-thoughts"]?.focus();
  }

  buildJournalTextExport(entries) {
    const dates = Object.keys(entries || {}).sort();
    return dates
      .map((dateStr) => {
        const entry = entries[dateStr] || {};
        return [
          `Date: ${dateStr}`,
          `Mood: ${entry.mood || "-"}`,
          `Day Score: ${entry.rating || "-"}/10`,
          `Thoughts: ${entry.thoughts || "-"}`,
          `Best Part: ${entry.highlight || "-"}`,
          `Tomorrow Focus: ${entry.tomorrow || "-"}`,
          "",
        ].join("\n");
      })
      .join("\n");
  }

  downloadJournalEntries() {
    const entries = this.app.state.journalEntries || {};
    const dates = Object.keys(entries);
    if (!dates.length) {
      this.setSleepJournalStatus("No notes saved yet.", "is-error");
      return;
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      entries,
    };
    const files = [
      [
        "json",
        new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json",
        }),
      ],
      [
        "txt",
        new Blob([this.buildJournalTextExport(entries)], {
          type: "text/plain",
        }),
      ],
    ];
    files.forEach(([ext, blob]) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `discipline-journal-${this.app.getDateString()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    this.setSleepJournalStatus("Journal downloaded.", "is-success");
  }
  exportData() {
    const now = new Date();
    const report = AnalyticsService.buildMonthlyReport(
      this.app.state.tasks,
      now.getFullYear(),
      now.getMonth(),
    );
    const csvContent = [
      [
        "Date",
        "Category",
        "Subcategory",
        "Start Time",
        "End Time",
        "Duration (minutes)",
        "Description",
      ].join(","),
      ...this.app.state.tasks.map((task) =>
        [
          task.date,
          `"${task.category}"`,
          `"${task.subcategory}"`,
          new Date(task.startTime).toLocaleString(),
          new Date(task.endTime).toLocaleString(),
          task.duration,
          `"${(task.description || "").replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ].join("\n");
    const csvBlob = new Blob([csvContent], { type: "text/csv" });
    const jsonBlob = new Blob(
      [
        JSON.stringify(
          {
            schemaVersion: CONFIG.DB_SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            entries: this.app.state.tasks,
            journalEntries: this.app.state.journalEntries || {},
            monthlyReport: report,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    [
      ["csv", csvBlob],
      ["json", jsonBlob],
    ].forEach(([ext, blob]) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `discipline-data-${this.app.getDateString()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  triggerImportPicker() {
    const input = this.app.elements["import-file"];
    if (!input) return;
    input.value = "";
    input.click();
  }

  parseCsvLine(line) {
    const out = [];
    let curr = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          curr += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(curr);
        curr = "";
      } else {
        curr += ch;
      }
    }
    out.push(curr);
    return out;
  }

  importFromJsonText(text) {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed))
      return parsed.filter(
        (entry) =>
          entry && typeof entry === "object" && !Array.isArray(entry),
      );
    if (parsed && Array.isArray(parsed.entries))
      return parsed.entries.filter(
        (entry) =>
          entry && typeof entry === "object" && !Array.isArray(entry),
      );
    return [];
  }

  importFromCsvText(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = this.parseCsvLine(lines[0]).map((h) => h.trim());
    const idx = Object.fromEntries(headers.map((h, i) => [h, i]));

    const hasNewSchema =
      headers.includes("Category") && headers.includes("Subcategory");
    const imported = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i]);
      if (!cols.length) continue;

      if (hasNewSchema) {
        const date = cols[idx["Date"]] || this.app.getDateString();
        const category = cols[idx["Category"]] || "Miscellaneous";
        const subcategory = cols[idx["Subcategory"]] || "General";
        const startRaw = cols[idx["Start Time"]] || "";
        const endRaw = cols[idx["End Time"]] || "";
        const duration = Number(cols[idx["Duration (minutes)"]] || 0);
        const description = cols[idx["Description"]] || "";
        const startTime = Date.parse(startRaw) || Date.now();
        const endTime =
          Date.parse(endRaw) || startTime + duration * 60000;
        imported.push({
          id: `${Date.now()}-${i}`,
          date,
          category,
          subcategory,
          startTime,
          endTime,
          duration: Number.isFinite(duration)
            ? duration
            : Math.max(0, Math.round((endTime - startTime) / 60000)),
          description,
        });
      } else {
        // Legacy CSV fallback
        const date = cols[idx["Date"]] || this.app.getDateString();
        const name = cols[idx["Task Name"]] || "Imported Task";
        const startTime =
          Date.parse(cols[idx["Start Time"]] || "") || Date.now();
        const endTime =
          Date.parse(cols[idx["End Time"]] || "") || startTime;
        const duration = Number(
          cols[idx["Duration (minutes)"]] ||
          Math.max(0, Math.round((endTime - startTime) / 60000)),
        );
        const type = (cols[idx["Type"]] || "").toLowerCase();
        const category = type.includes("sleep")
          ? "Sleep"
          : "Miscellaneous";
        imported.push({
          id: `${Date.now()}-${i}`,
          date,
          category,
          subcategory: category === "Sleep" ? "Night Sleep" : "General",
          startTime,
          endTime,
          duration,
          description: name,
        });
      }
    }

    return imported;
  }

  async importDataFromFile(file) {
    if (!file) return;
    try {
      if (Number(file.size || 0) > 5 * 1024 * 1024) {
        alert("Import file is too large. Please use a file under 5 MB.");
        return;
      }
      const text = await file.text();
      const isJson =
        file.name.toLowerCase().endsWith(".json") ||
        file.type.includes("json");
      const rawEntries = isJson
        ? this.importFromJsonText(text)
        : this.importFromCsvText(text);
      if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
        alert("Import file has no valid entries.");
        return;
      }
      const normalized = rawEntries
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => this.app.normalizeTask(entry));
      if (!normalized.length) {
        alert("Import file has no valid entries.");
        return;
      }
      this.app.taskManager.mergeTasks(normalized);
      alert(`Imported ${normalized.length} entries successfully.`);
    } catch (error) {
      console.error("Import failed:", error);
      alert(
        "Import failed. Please provide a valid exported JSON/CSV file.",
      );
    }
  }
}

class ShadowEngine {
  constructor(app) {
    this.app = app;
    this.shadowSevenDayAverage = 0;
    this.rankTiers = [
      {
        min: 0,
        title: "Stinger",
        tagline: "Reactive, mobile, and just entering the fight.",
        profile:
          "This is the first rank. It represents a user who has started building discipline but is still inconsistent and operating in short bursts.",
        fame:
          "Named after the Stinger missile, famous for being lightweight, fast to deploy, and effective in the hands of a prepared operator.",
      },
      {
        min: 100,
        title: "Javelin",
        tagline: "You are learning to strike with intent, not impulse.",
        profile:
          "Javelin marks a stronger base. You are no longer only reacting to the day. You are beginning to plan, aim, and deliver effort with more control.",
        fame:
          "Named after the Javelin anti-tank missile, famous for its fire-and-forget precision and its ability to punish stronger targets through good guidance.",
      },
      {
        min: 180,
        title: "Exocet",
        tagline: "Focused pressure is starting to matter.",
        profile:
          "At Exocet, your output is visible. You are putting together enough serious work to affect your weekly momentum and create noticeable progress.",
        fame:
          "Named after the Exocet missile, famous for low-altitude sea-skimming attacks and for becoming known worldwide through decisive real combat impact.",
      },
      {
        min: 260,
        title: "Astra",
        tagline: "Your discipline is getting faster, cleaner, and more self-directed.",
        profile:
          "Astra represents improved control. You are building the ability to stay on task with less drag and better recovery after distractions.",
        fame:
          "Named after Astra, Indiaâ€™s beyond-visual-range air-to-air missile, known for speed, range, and homegrown precision engineering.",
      },
      {
        min: 350,
        title: "Tomahawk",
        tagline: "Long-range consistency has started to define you.",
        profile:
          "Tomahawk means you can hold productive behavior across longer windows. You are not just having good days, you are sustaining campaigns.",
        fame:
          "Named after the Tomahawk cruise missile, famous for long-range precision strikes and for being used when accuracy over distance matters.",
      },
      {
        min: 450,
        title: "Prithvi",
        tagline: "You now have grounded power and dependable delivery.",
        profile:
          "Prithvi marks solid operational discipline. Your routines are becoming dependable, and your output is less dependent on mood or external pressure.",
        fame:
          "Named after Prithvi, one of Indiaâ€™s first indigenous ballistic missile systems, famous as a foundational milestone in strategic capability.",
      },
      {
        min: 560,
        title: "Agni",
        tagline: "You are becoming dangerous in a disciplined way.",
        profile:
          "Agni means intensity with structure. Your effort, recovery, and mission focus are now combining into a serious long-term profile.",
        fame:
          "Named after the Agni missile series, famous for strategic reach, technological maturity, and its role in symbolizing credible deterrence.",
      },
      {
        min: 680,
        title: "Trident",
        tagline: "Pressure, precision, and reliability are all present now.",
        profile:
          "Trident is an elite consistency rank. You are delivering under pressure, keeping standards high, and stacking wins without needing constant resets.",
        fame:
          "Named after the Trident submarine-launched ballistic missile, famous for stealth deployment, survivability, and high strategic reliability.",
      },
      {
        min: 800,
        title: "Minuteman",
        tagline: "You are battle-ready on demand.",
        profile:
          "Minuteman reflects top-tier readiness. Your system is resilient, your discipline is stable, and you can produce when it matters without warm-up chaos.",
        fame:
          "Named after the Minuteman missile, famous for rapid readiness and for borrowing its name from colonial militia who had to be ready at a minuteâ€™s notice.",
      },
      {
        min: 900,
        title: "BrahMos",
        tagline: "Maximum speed, maximum pressure, minimum hesitation.",
        profile:
          "BrahMos is the apex rank. It means your execution is fast, repeatable, and respected. You are not merely disciplined; you operate with force and clarity.",
        fame:
          "Named after the BrahMos supersonic cruise missile, famous for extreme speed, precision, and its reputation as one of the fastest in its class.",
      },
    ];
  }

  initialize() {
    const stored = parseFloat(
      this.app.loadFromStorage(CONFIG.STORAGE_KEYS.SHADOW_AVG),
    );
    this.shadowSevenDayAverage = Number.isFinite(stored) ? stored : 0;
    this.refresh(false);
  }

  getRankIndexByTitle(title) {
    return this.rankTiers.findIndex((tier) => tier.title === title);
  }

  getRankTierByIndex(index) {
    return this.rankTiers[Math.max(0, Math.min(index, this.rankTiers.length - 1))] || null;
  }

  getRankProgressState() {
    const stored = this.app.loadFromStorage(CONFIG.STORAGE_KEYS.SHADOW_ENGINE_STATE) || {};
    const rankProgress = stored.rankProgress || {};
    return {
      unlockedRankIndex:
        Number.isInteger(rankProgress.unlockedRankIndex)
          ? rankProgress.unlockedRankIndex
          : null,
      shieldCharges:
        Number.isInteger(rankProgress.shieldCharges)
          ? rankProgress.shieldCharges
          : 1,
      decayStreak:
        Number.isInteger(rankProgress.decayStreak)
          ? rankProgress.decayStreak
          : 0,
      srPenalty:
        Number.isFinite(rankProgress.srPenalty) && rankProgress.srPenalty > 0
          ? Math.round(rankProgress.srPenalty)
          : 0,
      trainingCamp: this.normalizeTrainingCampState(rankProgress.trainingCamp),
      lastProcessedDate: rankProgress.lastProcessedDate || null,
      eventNote: rankProgress.eventNote || "",
    };
  }

  saveRankProgressState(rankProgress) {
    const stored = this.app.loadFromStorage(CONFIG.STORAGE_KEYS.SHADOW_ENGINE_STATE) || {};
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.SHADOW_ENGINE_STATE, {
      ...stored,
      rankProgress,
    });
  }

  normalizeTrainingCampState(trainingCamp = null) {
    return {
      active: Boolean(trainingCamp?.active),
      provisionalRankIndex: Number.isInteger(trainingCamp?.provisionalRankIndex)
        ? trainingCamp.provisionalRankIndex
        : null,
      previousRankIndex: Number.isInteger(trainingCamp?.previousRankIndex)
        ? trainingCamp.previousRankIndex
        : null,
      startDate: trainingCamp?.startDate || null,
      targetMinutes:
        Number.isFinite(trainingCamp?.targetMinutes) && trainingCamp.targetMinutes > 0
          ? Math.round(trainingCamp.targetMinutes)
          : 0,
      daysCompleted:
        Number.isInteger(trainingCamp?.daysCompleted) && trainingCamp.daysCompleted >= 0
          ? trainingCamp.daysCompleted
          : 0,
      successDays:
        Number.isInteger(trainingCamp?.successDays) && trainingCamp.successDays >= 0
          ? trainingCamp.successDays
          : 0,
      failDays:
        Number.isInteger(trainingCamp?.failDays) && trainingCamp.failDays >= 0
          ? trainingCamp.failDays
          : 0,
      consecutiveFails:
        Number.isInteger(trainingCamp?.consecutiveFails) && trainingCamp.consecutiveFails >= 0
          ? trainingCamp.consecutiveFails
          : 0,
      lastEvaluatedDate: trainingCamp?.lastEvaluatedDate || null,
    };
  }

  getTrainingCampLength() {
    return 10;
  }

  getTrainingCampSuccessRequirement() {
    return 7;
  }

  getTrainingCampSrPenalty() {
    return 15;
  }

  getPromotionTargetMinutes(shadowStandard, shadowAvg, nextRank) {
    let baseline = Math.max(
      120,
      Math.round(Math.max(shadowStandard || 0, (shadowAvg || 0) * 0.9)),
    );
    if (nextRank?.min >= 560) baseline = Math.max(baseline, 240);
    return baseline;
  }

  getConsecutiveDaysOverMinutes(dailyMap, targetMinutes, lookback = 7) {
    let streak = 0;
    for (let i = 0; i < lookback; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = this.app.getDateString(d);
      const minutes = dailyMap.get(date) || 0;
      if (minutes >= targetMinutes) streak++;
      else break;
    }
    return streak;
  }

  getDateStringsBetween(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) return [];

    const start = new Date(`${startDateStr}T12:00:00`);
    const end = new Date(`${endDateStr}T12:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end)
      return [];

    const dates = [];
    for (
      const cursor = new Date(start);
      cursor <= end;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      dates.push(this.app.getDateString(cursor));
    }
    return dates;
  }

  resolveRankProgress({
    rawRating,
    rawRank,
    gate,
    dailyMap,
    productiveDays7,
    shadowStandard,
    shadowAvg,
  }) {
    const today = this.app.getDateString(new Date());
    const rawRankIndex = this.getRankIndexByTitle(rawRank.title);
    const progress = this.getRankProgressState();

    if (!Number.isInteger(progress.unlockedRankIndex)) {
      progress.unlockedRankIndex = rawRankIndex;
      progress.shieldCharges = 1;
      progress.decayStreak = 0;
    }

    progress.unlockedRankIndex = Math.max(0, progress.unlockedRankIndex);
    progress.shieldCharges = Math.max(0, Math.min(1, progress.shieldCharges));
    progress.srPenalty = Math.max(0, Math.round(progress.srPenalty || 0));
    progress.trainingCamp = this.normalizeTrainingCampState(progress.trainingCamp);

    let currentRank = this.getRankTierByIndex(progress.unlockedRankIndex);
    let nextRank = this.rankTiers[progress.unlockedRankIndex + 1] || null;
    let eventNote = progress.eventNote || "";
    let effectiveRating = Math.max(0, rawRating - progress.srPenalty);
    let rankState = "confirmed";

    const trialTargetMinutes = this.getPromotionTargetMinutes(
      shadowStandard,
      shadowAvg,
      nextRank,
    );
    const trainingCampLength = this.getTrainingCampLength();
    const trainingCampSuccessRequirement =
      this.getTrainingCampSuccessRequirement();
    const stableDaysNeeded = 0;
    const canPromote = Boolean(
      nextRank &&
      effectiveRating >= nextRank.min &&
      gate.met,
    );
    const atRisk = rawRating < currentRank.min;
    let trainingCamp = progress.trainingCamp;

    if (!trainingCamp.active && canPromote && nextRank) {
      trainingCamp = this.normalizeTrainingCampState({
        active: true,
        provisionalRankIndex: progress.unlockedRankIndex + 1,
        previousRankIndex: progress.unlockedRankIndex,
        startDate: today,
        targetMinutes: trialTargetMinutes,
        daysCompleted: 0,
        successDays: 0,
        failDays: 0,
        consecutiveFails: 0,
        lastEvaluatedDate: null,
      });
      progress.trainingCamp = trainingCamp;
      progress.unlockedRankIndex = trainingCamp.provisionalRankIndex;
      currentRank = this.getRankTierByIndex(progress.unlockedRankIndex);
      nextRank = this.rankTiers[progress.unlockedRankIndex + 1] || null;
      rankState = "provisional";
      eventNote = `${currentRank.title} provisional. Training camp started.`;
    }

    if (trainingCamp.active) {
      const provisionalRank = this.getRankTierByIndex(
        trainingCamp.provisionalRankIndex,
      );
      const previousRank = this.getRankTierByIndex(trainingCamp.previousRankIndex);
      currentRank = provisionalRank || currentRank;
      rankState = "provisional";

      const pendingDates = trainingCamp.lastEvaluatedDate
        ? this.getDateStringsBetween(
            this.app.getDateString(
              new Date(
                new Date(`${trainingCamp.lastEvaluatedDate}T12:00:00`).getTime() +
                  86400000,
              ),
            ),
            today,
          )
        : this.getDateStringsBetween(trainingCamp.startDate, today);

      for (const date of pendingDates) {
        if (trainingCamp.daysCompleted >= trainingCampLength) break;

        const dayMinutes = dailyMap.get(date) || 0;
        const passedDay = dayMinutes >= trainingCamp.targetMinutes;

        trainingCamp.daysCompleted += 1;
        trainingCamp.lastEvaluatedDate = date;

        if (passedDay) {
          trainingCamp.successDays += 1;
          trainingCamp.consecutiveFails = 0;
          eventNote = `Shadow Buddy says ${currentRank.title} training camp day ${trainingCamp.daysCompleted}/${trainingCampLength} clear.`;
        } else {
          trainingCamp.failDays += 1;
          trainingCamp.consecutiveFails += 1;
          const consecutiveFailTriggered = trainingCamp.consecutiveFails >= 2;
          const totalFailTriggered = trainingCamp.failDays >= 3;

          if (progress.shieldCharges > 0) {
            progress.shieldCharges = 0;
            eventNote = `${currentRank.title} training camp miss ${trainingCamp.failDays}/3. Shield damaged.`;
          } else {
            progress.srPenalty += this.getTrainingCampSrPenalty();
            eventNote = `${currentRank.title} training camp miss ${trainingCamp.failDays}/3. SR penalty -${this.getTrainingCampSrPenalty()}.`;
          }

          if (consecutiveFailTriggered || totalFailTriggered) {
            progress.unlockedRankIndex = Math.max(
              0,
              trainingCamp.previousRankIndex ?? progress.unlockedRankIndex - 1,
            );
            currentRank =
              previousRank || this.getRankTierByIndex(progress.unlockedRankIndex);
            progress.shieldCharges = 1;
            progress.srPenalty = 0;
            progress.decayStreak = 0;
            progress.lastProcessedDate = today;
            progress.trainingCamp = this.normalizeTrainingCampState();
            trainingCamp = progress.trainingCamp;
            rankState = "confirmed";
            eventNote = consecutiveFailTriggered
              ? `${provisionalRank?.title || "Provisional rank"} training camp failed with 2 consecutive misses. Demoted to ${currentRank.title}.`
              : `${provisionalRank?.title || "Provisional rank"} training camp failed at 3 misses. Demoted to ${currentRank.title}.`;
            break;
          }
        }

        if (trainingCamp.daysCompleted >= trainingCampLength) {
          if (trainingCamp.successDays >= trainingCampSuccessRequirement) {
            progress.unlockedRankIndex = trainingCamp.provisionalRankIndex;
            currentRank = provisionalRank || currentRank;
            progress.srPenalty = 0;
            progress.decayStreak = 0;
            progress.lastProcessedDate = today;
            progress.trainingCamp = this.normalizeTrainingCampState();
            trainingCamp = progress.trainingCamp;
            rankState = "confirmed";
            eventNote = `${currentRank.title} confirmed after clearing the 10-day training camp.`;
          } else {
            progress.unlockedRankIndex = Math.max(
              0,
              trainingCamp.previousRankIndex ?? progress.unlockedRankIndex - 1,
            );
            currentRank =
              previousRank || this.getRankTierByIndex(progress.unlockedRankIndex);
            progress.shieldCharges = 1;
            progress.srPenalty = 0;
            progress.decayStreak = 0;
            progress.lastProcessedDate = today;
            progress.trainingCamp = this.normalizeTrainingCampState();
            trainingCamp = progress.trainingCamp;
            rankState = "confirmed";
            eventNote = `${provisionalRank?.title || "Provisional rank"} training camp ended below ${trainingCampSuccessRequirement}/10 successful days. Demoted to ${currentRank.title}.`;
          }
          break;
        }
      }
    }

    if (!progress.trainingCamp.active && progress.lastProcessedDate !== today) {
      if (atRisk) {
        progress.decayStreak += 1;
        if (progress.decayStreak >= 2) {
          if (progress.shieldCharges > 0) {
            progress.shieldCharges = 0;
            progress.decayStreak = 0;
            eventNote = `${currentRank.title} shield absorbed the decay hit.`;
          } else if (progress.unlockedRankIndex > 0) {
            progress.unlockedRankIndex -= 1;
            progress.shieldCharges = 1;
            progress.decayStreak = 0;
            currentRank = this.getRankTierByIndex(progress.unlockedRankIndex);
            eventNote = `Rank slipped to ${currentRank.title}. Rebuild the floor.`;
          }
        } else {
          eventNote = `${currentRank.title} is under decay watch. One more weak day breaks the shield.`;
        }
      } else {
        progress.decayStreak = 0;
        if (
          progress.shieldCharges === 0 &&
          rawRating >= currentRank.min + 25 &&
          productiveDays7 >= 4
        ) {
          progress.shieldCharges = 1;
          eventNote = `${currentRank.title} shield restored through stable work.`;
        }
      }

      progress.lastProcessedDate = today;
      currentRank = this.getRankTierByIndex(progress.unlockedRankIndex);
      nextRank = this.rankTiers[progress.unlockedRankIndex + 1] || null;
    }

    effectiveRating = Math.max(0, rawRating - progress.srPenalty);
    if (progress.trainingCamp.active) {
      currentRank =
        this.getRankTierByIndex(progress.trainingCamp.provisionalRankIndex) ||
        currentRank;
      nextRank = this.rankTiers[progress.trainingCamp.provisionalRankIndex + 1] || null;
      rankState = "provisional";
    }

    const reasons = [];
    if (progress.trainingCamp.active) {
      const camp = progress.trainingCamp;
      if (camp.successDays < trainingCampSuccessRequirement)
        reasons.push(`${camp.successDays}/${trainingCampSuccessRequirement} successful days`);
      if (camp.failDays > 0) reasons.push(`${camp.failDays}/2 misses used`);
      if (camp.consecutiveFails > 0)
        reasons.push(`${camp.consecutiveFails}/2 consecutive fails`);
      if (camp.targetMinutes > 0)
        reasons.push(`Daily floor ${this.app.formatDuration(camp.targetMinutes)}`);
    } else if (nextRank) {
      const srGap = Math.max(0, nextRank.min - effectiveRating);
      if (srGap > 0) reasons.push(`${srGap} SR short`);
      if (stableDaysNeeded > 0 && productiveDays7 < stableDaysNeeded)
        reasons.push(`${productiveDays7}/${stableDaysNeeded} productive days`);
      if (!gate.met) reasons.push(gate.reason);
    }

    progress.eventNote = eventNote;
    this.saveRankProgressState(progress);

    return {
      progress,
      effectiveRank: currentRank,
      nextRank,
      trialProgress: progress.trainingCamp.active
        ? progress.trainingCamp.daysCompleted
        : 0,
      trialRequired: progress.trainingCamp.active ? trainingCampLength : 0,
      trialTargetMinutes,
      stableDaysNeeded,
      reasons,
      eventNote,
      rawRankIndex,
      adjustedRating: effectiveRating,
      rankState,
      trainingCamp: progress.trainingCamp,
    };
  }

  renderRankLadder(activeRankIndex, rawRankIndex) {
    return this.rankTiers
      .map((tier, index) => {
        const classes = ["shadow-ladder-step"];
        if (index < activeRankIndex) classes.push("completed");
        if (index === activeRankIndex) classes.push("current");
        if (index > activeRankIndex) classes.push("locked");
        if (index > activeRankIndex && index <= rawRankIndex)
          classes.push("raw-eligible");

        let tag = "Locked";
        if (index < activeRankIndex) tag = "Cleared";
        if (index === activeRankIndex) tag = "Current";
        if (index > activeRankIndex && index <= rawRankIndex) tag = "Trial pending";

        return `
          <div class="${classes.join(" ")}">
            <div class="shadow-ladder-name">${this.app.escapeHtml(tier.title)}</div>
            <div class="shadow-ladder-meta">${this.app.escapeHtml(`${tier.min}+ SR`)}</div>
            <div class="shadow-ladder-tag">${this.app.escapeHtml(tag)}</div>
          </div>
        `;
      })
      .join("");
  }

  getDailyProductiveMap() {
    const dailyMap = new Map();
    this.app.state.tasks.forEach((task) => {
      if (!this.app.isProductiveCategory(task.category)) return;
      dailyMap.set(
        task.date,
        (dailyMap.get(task.date) || 0) + task.duration,
      );
    });
    return dailyMap;
  }

  getTodayGoalProgress(dateStr = this.app.getDateString(new Date())) {
    const missionTasks =
      this.app.trainerEngine?.getDailyMissionTasks?.() || [];

    return missionTasks.map((item, index) => {
      const topic = item?.topic || item?.label || `mission-${index + 1}`;
      const tracked =
        this.app.trainerEngine?.getTopicProgress?.(topic, dateStr) || {
          minutes: 0,
          sessions: 0,
        };
      const minutesTarget = Math.max(0, Number(item?.target_minutes || 0));
      const scoreWeight = Math.max(0, Number(item?.score_weight || 0));

      return {
        id: String(item?.label || item?.topic || `mission-${index + 1}`),
        label: item?.label || topic,
        topic,
        minutes: Number(tracked.minutes || 0),
        sessions: Number(tracked.sessions || 0),
        minutesTarget,
        scoreWeight,
        done: minutesTarget > 0 && Number(tracked.minutes || 0) >= minutesTarget,
        secondary: !!item?.secondary,
      };
    });
  }

  calculateMissionScore(progress) {
    const items = Array.isArray(progress) ? progress : Object.values(progress || {});
    let totalWeight = 0;
    let completedWeight = 0;

    items.forEach((item) => {
      const weight = Math.max(0, Number(item?.scoreWeight || 0));
      totalWeight += weight;
      if (item?.done) completedWeight += weight;
    });

    if (totalWeight <= 0) return 0;
    return Math.round((completedWeight / totalWeight) * 100);
  }

  getTodayDistractionMinutes(
    dateStr = this.app.getDateString(new Date()),
  ) {
    return this.app.state.tasks
      .filter(
        (task) =>
          task.date === dateStr &&
          (task.category === "Time Waste / Distraction" ||
            task.graph_tag === "distraction"),
      )
      .reduce((sum, task) => sum + task.duration, 0);
  }

  getHistoricalShadowThresholdMap(
    startDateStr = null,
    endDateStr = this.app.getDateString(new Date()),
  ) {
    const dailyMap = this.getDailyProductiveMap();
    const baseline = Math.max(
      1,
      Number(CONFIG.DAILY_PRODUCTIVITY_THRESHOLD_MINUTES || 240),
    );
    const firstTrackedDate = [...dailyMap.keys()].sort()[0] || endDateStr;
    const startDate = new Date(
      `${(startDateStr && startDateStr < firstTrackedDate)
        ? startDateStr
        : firstTrackedDate}T12:00:00`,
    );
    const endDate = new Date(`${endDateStr}T12:00:00`);
    const days = [];
    const thresholdMap = new Map();

    for (
      const cursor = new Date(startDate);
      cursor <= endDate;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      days.push(this.app.getDateString(cursor));
    }

    const prefix = new Array(days.length + 1).fill(0);
    let bestAvg = 0;
    for (let i = 0; i < days.length; i++) {
      const dateStr = days[i];
      thresholdMap.set(
        dateStr,
        Math.max(1, Math.round(bestAvg > 0 ? bestAvg : baseline)),
      );
      prefix[i + 1] = prefix[i] + (dailyMap.get(dateStr) || 0);
      const completedDays = i + 1;
      const candidate =
        completedDays < 7
          ? prefix[completedDays] / 7
          : (prefix[completedDays] - prefix[completedDays - 7]) / 7;
      if (candidate > bestAvg) bestAvg = candidate;
    }

    return thresholdMap;
  }

  getWinLadder(dailyMap, shadowAvg) {
    const thresholdMap = this.getHistoricalShadowThresholdMap(
      this.app.getDateString(new Date(Date.now() - 6 * 86400000)),
    );
    const days = [];
    const today = new Date(this.app.getDateString());
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = this.app.getDateString(d);
      const minutes = dailyMap.get(ds) || 0;
      const threshold = thresholdMap.get(ds) || shadowAvg;
      days.push({ date: ds, win: minutes >= threshold, threshold });
    }
    const winsIn5 = days.slice(-5).filter((d) => d.win).length;
    const winsIn7 = days.filter((d) => d.win).length;
    return {
      winsIn5,
      winsIn7,
      status3in5: `${winsIn5}/3`,
      status5in7: `${winsIn7}/5`,
      clear3in5: winsIn5 >= 3,
      clear5in7: winsIn7 >= 5,
    };
  }

  buildDailyProductiveSeries() {
    const dailyMap = this.getDailyProductiveMap();
    if (dailyMap.size === 0) return [];

    const sorted = [...dailyMap.keys()].sort();
    const start = new Date(sorted[0]);
    const end = new Date(this.app.getDateString());
    const series = [];

    for (
      let cursor = new Date(start);
      cursor <= end;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const key = this.app.getDateString(cursor);
      series.push(dailyMap.get(key) || 0);
    }
    return series;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Â§7  Phase 2 â€” Behavioral State Detection
  // Returns: 'RECOVERY' | 'STABLE' | 'GROWTH'
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  detectBehavioralState() {
    const series7 = [];
    const dailyMap = this.getDailyProductiveMap();
    const today = new Date(this.app.getDateString());
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      series7.push(dailyMap.get(this.app.getDateString(d)) || 0);
    }
    const target = Math.max(1, this.shadowSevenDayAverage || 120);
    // ratio = how many minutes completed vs target, average over 7 days
    const avgRatio = series7.reduce((s, m) => s + m / target, 0) / 7;
    // success = days where actual/target >= EFFORT_SUCCESS_THRESHOLD
    const successDays = series7.filter(m => m / target >= CONFIG.EFFORT_SUCCESS_THRESHOLD).length;
    // momentum: last3 > prev3?
    const last3 = series7.slice(4).reduce((s, v) => s + v, 0) / 3;
    const prev3 = series7.slice(0, 3).reduce((s, v) => s + v, 0) / 3;

    let state;
    if (avgRatio < 0.6 || successDays <= 2) {
      state = "RECOVERY";
    } else if (avgRatio >= 0.9 && last3 >= prev3 && successDays >= 5) {
      state = "GROWTH";
    } else {
      state = "STABLE";
    }

    // store for other methods to consume
    this._behavioralState = state;
    return state;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Â§3/4  Phase 3 â€” Progressive Time-Shift Engine
  // Shifts currentHour toward idealHour using learning_rate.
  // Cap: MAX_DAILY_SHIFT_MINUTES. Returns next hour (fractional).
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  applyTimeShift(currentHour, idealHour, state) {
    const rates = {
      RECOVERY: CONFIG.LEARNING_RATE_FAILURE_SEVERE,   // 0.1
      STABLE: CONFIG.LEARNING_RATE_STABLE,           // 0.3
      GROWTH: CONFIG.LEARNING_RATE_STABLE,           // 0.3
    };
    const rate = rates[state] || CONFIG.LEARNING_RATE_STABLE;
    const rawShift = (idealHour - currentHour) * rate;   // hours
    const maxShiftH = CONFIG.MAX_DAILY_SHIFT_MINUTES / 60;
    const clampedShift = Math.sign(rawShift) * Math.min(Math.abs(rawShift), maxShiftH);
    return currentHour + clampedShift;
  }

  // Compute recommended schedule targets for today
  // Returns { wakeHour, sleepHour, deepWorkHour, state }
  computeAdaptiveSchedule() {
    const stored = this.app.loadFromStorage(CONFIG.STORAGE_KEYS.SHADOW_ENGINE_STATE) || {};
    const state = this.detectBehavioralState();
    // fallback to ideal if no history
    const currentWake = stored.wakeHour ?? CONFIG.IDEAL_WAKE_HOUR;
    const currentSleep = stored.sleepHour ?? CONFIG.IDEAL_SLEEP_HOUR;
    const currentDeepWork = stored.deepWorkHour ?? CONFIG.IDEAL_DEEP_WORK_HOUR;

    const nextWake = this.applyTimeShift(currentWake, CONFIG.IDEAL_WAKE_HOUR, state);
    const nextSleep = this.applyTimeShift(currentSleep, CONFIG.IDEAL_SLEEP_HOUR, state);
    const nextDeepWork = this.applyTimeShift(currentDeepWork, CONFIG.IDEAL_DEEP_WORK_HOUR, state);

    const schedule = { wakeHour: nextWake, sleepHour: nextSleep, deepWorkHour: nextDeepWork, state };
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.SHADOW_ENGINE_STATE, { ...stored, ...schedule });
    return schedule;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Â§10  Phase 4 â€” Sleep Compromise Tracker
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  getSleepCompromiseData() {
    const today = new Date(this.app.getDateString());
    const results = [];
    // Target matches behavioral state logic
    const target = Math.max(1, this.shadowSevenDayAverage || 120);
    const highValueKeys = ["study", "project work", "work", "learning", "coding", "nptel", "project"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = this.app.getDateString(d);

      const dayTasks = this.app.state.tasks.filter(t => t.date === ds);
      const sleepTasks = dayTasks.filter(t => t.category === "Sleep");
      const totalSleep = sleepTasks.reduce((s, t) => s + t.duration, 0);

      const prodTasks = dayTasks.filter(t => this.app.isProductiveCategory(t.category));
      const effort = prodTasks.reduce((s, t) => s + t.duration, 0);

      const hasEffort = (effort / target) >= CONFIG.EFFORT_SUCCESS_THRESHOLD;
      const hasHighValue = prodTasks.some(t => {
        const cat = (t.category || "").toLowerCase();
        const topic = (t.missionTopic || t.topic || "").toLowerCase();
        return highValueKeys.some(k => cat.includes(k) || topic.includes(k));
      });

      const isShortSleep = totalSleep > 0 && totalSleep < CONFIG.MIN_SLEEP_MINUTES;
      // Phase 5: must have effort >= 70% and high value tasks
      const compromised = isShortSleep && hasEffort && hasHighValue;
      results.push({ date: ds, totalSleep, compromised, hasEffort, hasHighValue });
    }
    return results;
  }

  countSleepCompromisesLast7() {
    return this.getSleepCompromiseData().filter(d => d.compromised).length;
  }

  // Returns load multiplier (1.0 normal, 0.85 if yesterday was compromised)
  getTodayLoadMultiplier() {
    const data = this.getSleepCompromiseData();
    const yesterday = data[data.length - 2]; // index 5 = yesterday
    if (yesterday?.compromised) return 0.85; // Â§10: reduce 15% next day
    return 1.0;
  }

  // Is another sleep compromise allowed today?
  sleepCompromiseAllowed() {
    const count = this.countSleepCompromisesLast7();
    return count < CONFIG.MAX_SLEEP_COMPROMISES_PER_7_DAYS;
  }

  computeRollingMetrics() {
    const series = this.buildDailyProductiveSeries();
    if (!series.length)
      return {
        bestAvg: 0,
        currentAvg: 0,
        previousAvg: 0,
        todayMinutes: 0,
        hasMomentumBaseline: false,
      };

    const prefix = new Array(series.length + 1).fill(0);
    for (let i = 0; i < series.length; i++)
      prefix[i + 1] = prefix[i] + series[i];

    const lastIdx = series.length - 1;
    const todayMinutes = series[lastIdx] || 0;

    // Historical shadow excludes today (completed history only)
    const historicalEnd = Math.max(0, lastIdx);
    let bestAvg = 0;
    if (historicalEnd > 0) {
      if (historicalEnd < 7) bestAvg = prefix[historicalEnd] / 7;
      else {
        for (let i = 7; i <= historicalEnd; i++) {
          const avg = (prefix[i] - prefix[i - 7]) / 7;
          if (avg > bestAvg) bestAvg = avg;
        }
      }
    }

    const endIdx = series.length;
    const currentAvg =
      (prefix[endIdx] - prefix[Math.max(0, endIdx - 7)]) / 7;

    const prevEnd = Math.max(0, endIdx - 7);
    const prevStart = Math.max(0, prevEnd - 7);
    const previousAvg =
      prevEnd > 0 ? (prefix[prevEnd] - prefix[prevStart]) / 7 : 0;
    const hasMomentumBaseline = prevEnd - prevStart >= 4;

    return {
      bestAvg,
      currentAvg,
      previousAvg,
      todayMinutes,
      hasMomentumBaseline,
    };
  }

  getShadowRank(score) {
    let selected = this.rankTiers[0];
    for (const tier of this.rankTiers)
      if (score >= tier.min) selected = tier;
    return selected;
  }

  getNextShadowRank(score) {
    return this.rankTiers.find((tier) => score < tier.min) || null;
  }

  clampScore(value) {
    return Math.max(0, Math.min(100, value));
  }

  getRankGate({
    nextRank,
    consistency,
    mission,
    battle,
    recovery,
    currentRank,
  }) {
    if (!nextRank) return { met: true, reason: "Top rank secured" };

    const eliteRanks = new Set(["Agni", "Trident"]);
    const apexRanks = new Set(["Minuteman", "BrahMos"]);

    if (eliteRanks.has(nextRank.title)) {
      if (consistency < 60)
        return { met: false, reason: "Raise consistency above 60" };
      if (mission < 55)
        return { met: false, reason: "Raise mission discipline above 55" };
    }

    if (apexRanks.has(nextRank.title)) {
      if (consistency < 75)
        return { met: false, reason: "Need elite consistency above 75" };
      if (battle < 60)
        return { met: false, reason: "Win rate must clear 60%" };
      if (recovery < 65)
        return { met: false, reason: "Recovery control is too weak" };
    }

    if (currentRank?.title === "BrahMos")
      return { met: true, reason: "Top rank secured" };

    return { met: true, reason: "Gate clear" };
  }

  getShadowRating({
    currentAvg,
    missionScore,
    competition,
    penalty,
    sleepCompromises,
    productiveDays7,
    currentRank,
  }) {
    const output = this.clampScore((currentAvg / 360) * 100);
    const consistency = this.clampScore((productiveDays7 / 7) * 100);
    const mission = this.clampScore(missionScore);
    const monthlyWinRate = competition.activeDays
      ? competition.myWins / competition.activeDays
      : 0;
    const battle = this.clampScore(
      (competition.recentWinRate * 0.65 + monthlyWinRate * 0.35) * 100,
    );
    const distractionPenalty = penalty.budget
      ? Math.min(60, (penalty.overBudget / penalty.budget) * 60)
      : 0;
    const recovery = this.clampScore(
      100 - sleepCompromises * 18 - distractionPenalty,
    );
    const stabilityRatio = productiveDays7 / 7;
    const disciplineDepth = 0.15 + stabilityRatio * 0.85;
    const battleReadiness =
      productiveDays7 >= 3 ? battle : battle * (productiveDays7 / 3);

    const rawRating = Math.round(
      (output * 0.35 +
        consistency * 0.25 +
        mission * 0.15 +
        battleReadiness * 0.15 +
        recovery * 0.10) * 10,
    );
    const rating = Math.round(rawRating * disciplineDepth);
    const nextRank = this.getNextShadowRank(rating);
    const gate = this.getRankGate({
      nextRank,
      consistency,
      mission,
      battle,
      recovery,
      currentRank,
    });

    return {
      rating,
      nextRank,
      gate,
      factors: {
        output,
        consistency,
        mission,
        battle,
        recovery,
      },
    };
  }

  getCurrentStatus(percentage) {
    if (percentage >= 100) return "STANDARD BROKEN";
    if (percentage >= 90) return "AT THE GATE";
    if (percentage >= 70) return "TRAILING";
    return "OUT OF RANGE";
  }

  getProgressStyle(percentage) {
    if (percentage >= 100)
      return {
        color: "#28a745",
        shadow: "0 0 12px rgba(40,167,69,0.45)",
      };
    if (percentage >= 90) return { color: "#007bff", shadow: "none" };
    if (percentage >= 70) return { color: "#ffc107", shadow: "none" };
    return { color: "#dc3545", shadow: "none" };
  }

  getMomentum(currentAvg, previousAvg, hasBaseline) {
    if (!hasBaseline)
      return {
        label: "Insufficient history",
        cls: "shadow-momentum-flat",
      };
    const delta = currentAvg - previousAvg;
    if (delta > 8)
      return {
        label: `Rising (+${this.app.formatDuration(delta)})`,
        cls: "shadow-momentum-positive",
      };
    if (delta < -8)
      return {
        label: `Drifting (-${this.app.formatDuration(Math.abs(delta))})`,
        cls: "shadow-momentum-negative",
      };
    return { label: "Stable", cls: "shadow-momentum-flat" };
  }

  getPressure(percentage, weeklyGap, recentWinRate, missionScore = 100) {
    // Penalty-only pressure model: no positive buff reductions.
    const weeklyPenalty = weeklyGap > 0 ? 1 : 0;
    const trendPenalty =
      recentWinRate < 0.35 ? 2 : recentWinRate < 0.55 ? 1 : 0;

    let level = 0; // 0 controlled, 1 elevated, 2 high, 3 critical
    if (percentage >= 100) level = 0;
    else if (percentage >= 90) level = 1;
    else if (percentage >= 70) level = 2;
    else level = 3;

    const missionPenalty = missionScore < 50 ? 1 : 0;
    level = Math.min(
      3,
      level + weeklyPenalty + trendPenalty + missionPenalty,
    );

    const reasons = [];
    if (weeklyGap > 0) reasons.push("7d avg below shadow");
    if (recentWinRate < 0.35) reasons.push("monthly win rate collapsing");
    else if (recentWinRate < 0.55) reasons.push("monthly win rate weak");
    if (missionScore < 50) reasons.push("mission score too low");
    if (percentage < 70) reasons.push("today is far below target");
    else if (percentage < 100) reasons.push("today is still below target");

    if (level <= 0)
      return {
        label: "Pressure: Controlled",
        cls: "shadow-pressure-low",
        reasons,
      };
    if (level === 1)
      return {
        label: "Pressure: Elevated",
        cls: "shadow-pressure-mid",
        reasons,
      };
    if (level === 2)
      return { label: "Pressure: High", cls: "shadow-pressure-mid", reasons };
    return {
      label: "Pressure: Critical",
      cls: "shadow-pressure-high",
      reasons,
    };
  }

  countShadowWinsThisMonth(dailyMap, shadowAvg) {
    if (shadowAvg <= 0 && dailyMap.size === 0)
      return {
        myWins: 0,
        shadowWins: 0,
        activeDays: 0,
        recentWinRate: 0,
      };
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const monthDays = [];
    let myWins = 0;
    const activeDays = now.getDate(); // elapsed days in current month
    const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const thresholdMap = this.getHistoricalShadowThresholdMap(monthStart);

    for (let day = 1; day <= activeDays; day++) {
      const d = new Date(year, month, day);
      const date = this.app.getDateString(d);
      const minutes = dailyMap.get(date) || 0;
      const threshold = thresholdMap.get(date) || shadowAvg;
      const isWin = minutes >= threshold;
      if (isWin) myWins++;
      monthDays.push({ date, isWin, threshold });
    }

    monthDays.sort((a, b) => a.date.localeCompare(b.date));
    const recent = monthDays.slice(-7);
    const recentWins = recent.filter((d) => d.isWin).length;
    const recentWinRate = recent.length ? recentWins / recent.length : 0;

    const shadowWins = Math.max(0, activeDays - myWins);
    return { myWins, shadowWins, activeDays, recentWinRate };
  }

  getPenalty(
    todayMinutes,
    shadowAvg,
    weeklyGap,
    recentWinRate,
    distractionMinutes = 0,
    missionScore = 0,
  ) {
    let points = 0;
    const reasons = [];
    if (todayMinutes < shadowAvg) {
      points += 1;
      reasons.push("Behind daily shadow target");
    }
    if (weeklyGap > 0) {
      points += 1;
      reasons.push("Weekly average below shadow standard");
    }
    if (recentWinRate < 0.5) {
      points += 1;
      reasons.push("Monthly win-rate under 50%");
    }
    if (missionScore < 60) {
      points += 1;
      reasons.push("Mission score below 60/100");
    }
    const today = this.app.getDateString();
    const untracked = this.app.getInferredWasteMinutesForDate(
      today,
      this.app.state.tasks,
    );
    if (untracked >= 300) {
      points += 2;
      reasons.push("High untracked time today (5h+)");
    } else if (untracked >= 120) {
      points += 1;
      reasons.push("Untracked time today (2h+)");
    }

    const budget = CONFIG.DISTRACTION_BUDGET_MINUTES;
    const overBudget = Math.max(0, distractionMinutes - budget);
    if (overBudget > 0) {
      const overPoints = Math.max(1, Math.ceil(overBudget / 30));
      points += overPoints;
      reasons.push(
        `Distraction budget exceeded by ${this.app.formatDuration(overBudget)}`,
      );
    }

    const minutes = points * 15;
    return {
      points,
      minutes,
      untracked,
      reasons,
      budget,
      distractionMinutes,
      overBudget,
    };
  }

  render({
    todayMinutes,
    shadowAvg,
    currentAvg,
    previousAvg,
    hasMomentumBaseline,
    isNewStandard,
  }) {
    const safeShadow = shadowAvg > 0 ? shadowAvg : 1;
    const gap = shadowAvg - todayMinutes;
    const weeklyGap = shadowAvg - currentAvg;
    const percentage = (todayMinutes / safeShadow) * 100;

    const dailyMap = this.getDailyProductiveMap();
    const competition = this.countShadowWinsThisMonth(
      dailyMap,
      shadowAvg,
    );
    const scoreDiff = competition.myWins - competition.shadowWins;
    const targetToday = shadowAvg > 0 ? Math.ceil(shadowAvg + 1) : 0;
    const neededTie = Math.max(0, shadowAvg - todayMinutes);
    const neededLead = Math.max(0, shadowAvg - todayMinutes + 1);
    const todayDate = this.app.getDateString(new Date());
    const goalProgress = this.getTodayGoalProgress(todayDate);
    const missionScore = this.calculateMissionScore(goalProgress);
    const distractionMinutes = this.getTodayDistractionMinutes(todayDate);
    const penalty = this.getPenalty(
      todayMinutes,
      shadowAvg,
      weeklyGap,
      competition.recentWinRate,
      distractionMinutes,
      missionScore,
    );
    const ladder = this.getWinLadder(dailyMap, shadowAvg);
    const defenseTarget = Math.max(
      0,
      Math.ceil(shadowAvg + penalty.minutes),
    );
    const totalDuel = Math.max(
      1,
      competition.myWins + competition.shadowWins,
    );
    const youShare = Math.max(
      0,
      Math.min(100, (competition.myWins / totalDuel) * 100),
    );
    const shadowShare = Math.max(
      0,
      Math.min(100, (competition.shadowWins / totalDuel) * 100),
    );

    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = this.app.getDateString(d);
      last7.push(dailyMap.get(ds) || 0);
    }
    const sorted7 = [...last7].sort((a, b) => a - b);
    const p70Index = Math.max(0, Math.ceil(0.7 * sorted7.length) - 1);
    const shadowStandard = sorted7[p70Index] || shadowAvg;
    const momentumScore =
      shadowStandard > 0 ? todayMinutes / shadowStandard : 0;
    const daysAboveShadow = last7.filter(
      (v) => v >= shadowStandard && shadowStandard > 0,
    ).length;
    const consistencyIndex = `${daysAboveShadow}/7`;
    const xMean = 3;
    const yMean = last7.reduce((a, b) => a + b, 0) / 7;
    let num = 0;
    let den = 0;
    last7.forEach((v, i) => {
      const dx = i - xMean;
      num += dx * (v - yMean);
      den += dx * dx;
    });
    const slope = den ? num / den : 0;
    const growthTrend = slope > 2 ? "UP" : slope < -2 ? "DOWN" : "STABLE";
    const productiveDays7 = last7.filter((v) => v > 0).length;
    const sleepCompromises = this.countSleepCompromisesLast7();
    const shadowRating = this.getShadowRating({
      currentAvg,
      missionScore,
      competition,
      penalty,
      sleepCompromises,
      productiveDays7,
      currentRank: null,
    });
    const rank = this.getShadowRank(shadowRating.rating);
    shadowRating.gate = this.getRankGate({
      nextRank: shadowRating.nextRank,
      consistency: shadowRating.factors.consistency,
      mission: shadowRating.factors.mission,
      battle: shadowRating.factors.battle,
      recovery: shadowRating.factors.recovery,
      currentRank: rank,
    });
    const rankProgress = this.resolveRankProgress({
      rawRating: shadowRating.rating,
      rawRank: rank,
      gate: shadowRating.gate,
      dailyMap,
      productiveDays7,
      shadowStandard,
      shadowAvg,
    });
    const activeRank = rankProgress.effectiveRank;
    const nextRank = rankProgress.nextRank;
    const srGap = nextRank
      ? Math.max(0, nextRank.min - rankProgress.adjustedRating)
      : 0;
    const campActive = rankProgress.trainingCamp.active;
    const camp = rankProgress.trainingCamp;
    const activeRankLabel = campActive
      ? `${activeRank.title} Provisional`
      : `${activeRank.title} Confirmed`;
    const shieldLabel =
      rankProgress.progress.shieldCharges > 0 ? "Ready" : "Broken";

    this.app.elements["shadow-current-minutes"].textContent =
      this.app.formatDuration(todayMinutes);
    this.app.elements["shadow-average"].textContent =
      this.app.formatDuration(shadowAvg);
    this.app.elements["shadow-weekly-average"].textContent =
      this.app.formatDuration(currentAvg);
    if (this.app.elements["shadow-standard-metric"])
      this.app.elements["shadow-standard-metric"].textContent =
        this.app.formatDuration(shadowStandard);
    if (this.app.elements["shadow-momentum-score"])
      this.app.elements["shadow-momentum-score"].textContent =
        `${momentumScore.toFixed(2)}x`;
    if (this.app.elements["shadow-consistency-index"])
      this.app.elements["shadow-consistency-index"].textContent =
        consistencyIndex;
    if (this.app.elements["shadow-growth-trend"])
      this.app.elements["shadow-growth-trend"].textContent = growthTrend;
    this.app.elements["shadow-target"].textContent =
      this.app.formatDuration(targetToday);
    this.app.elements["shadow-needed-tie"].textContent =
      neededTie > 0 ? this.app.formatDuration(neededTie) : "Already cleared";
    this.app.elements["shadow-needed-lead"].textContent =
      neededLead > 0 ? this.app.formatDuration(neededLead) : "Already ahead";
    this.app.elements["shadow-defense-target"].textContent =
      this.app.formatDuration(defenseTarget);
    this.app.elements["shadow-penalty"].textContent =
      `-${this.app.formatDuration(penalty.minutes)}`;
    this.app.elements["shadow-penalty-reason"].textContent = penalty.reasons.length
      ? penalty.reasons.slice(0, 2).join(" | ")
      : "Pressure clear";
    const expiryEl = this.app.elements["shadow-penalty-expiry"];
    const updateCountdown = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const ms = Math.max(0, end - now);
      const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
      const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
      expiryEl.textContent = `${h}:${m}:${s}`;
    };
    if (this.penaltyCountdownTimer) clearInterval(this.penaltyCountdownTimer);
    updateCountdown();
    this.penaltyCountdownTimer = setInterval(updateCountdown, 1000);












    const budgetEl = this.app.elements["shadow-distraction-budget"];
    budgetEl.textContent = `${this.app.formatDuration(penalty.distractionMinutes)} / ${this.app.formatDuration(penalty.budget)}`;
    budgetEl.className =
      penalty.overBudget > 0 ? "shadow-overbudget" : "";
    this.app.elements["shadow-win-ladder"].textContent =
      `3/5 ${ladder.status3in5}  5/7 ${ladder.status5in7}`;
    this.app.elements["shadow-mission-score"].textContent =
      `${missionScore}/100`;
    this.app.elements["shadow-weekly-gap"].textContent =
      `${weeklyGap >= 0 ? "-" : "+"}${this.app.formatDuration(Math.abs(weeklyGap))}`;
    this.app.elements["shadow-weekly-gap"].className =
      weeklyGap > 0
        ? "shadow-gap-positive"
        : weeklyGap < 0
          ? "shadow-gap-negative"
          : "shadow-gap-equal";

    const momentum = this.getMomentum(
      currentAvg,
      previousAvg,
      hasMomentumBaseline,
    );
    const momentumEl = this.app.elements["shadow-momentum"];
    const momentumDelta = Math.round(currentAvg - previousAvg);
    const momentumDeltaText = `${momentumDelta >= 0 ? "+" : "-"}${this.app.formatDuration(Math.abs(momentumDelta))}`;
    momentumEl.textContent = `${momentum.label} (${momentumDeltaText})`;
    momentumEl.className = momentum.cls;

    const gapEl = this.app.elements["shadow-gap"];
    gapEl.textContent = `${gap >= 0 ? "-" : "+"}${this.app.formatDuration(Math.abs(gap))}`;
    gapEl.className =
      `shadow-mini-value ${gap > 0
        ? "shadow-gap-positive"
        : gap < 0
          ? "shadow-gap-negative"
          : "shadow-gap-equal"
      }`;

    this.app.elements["shadow-status"].textContent =
      this.getCurrentStatus(percentage);
    const pressure = this.getPressure(
      percentage,
      weeklyGap,
      competition.recentWinRate,
      missionScore,
    );
    const pressureEl = this.app.elements["shadow-pressure"];
    pressureEl.textContent = pressure.reasons.length
      ? `${pressure.label} â€¢ ${pressure.reasons.slice(0, 2).join(", ")}`
      : pressure.label;
    pressureEl.className = `shadow-mini-sub ${pressure.cls}`;

    this.app.elements["shadow-rank"].textContent = activeRankLabel;
    this.app.elements["shadow-badge"].textContent =
      `SR: ${rankProgress.adjustedRating} | Shield ${shieldLabel}`;
    this.app.elements["shadow-score"].textContent =
      `Monthly Score (days): You ${competition.myWins} - Shadow ${competition.shadowWins}`;
    if (this.app.elements["shadow-battle-you"])
      this.app.elements["shadow-battle-you"].textContent = `${competition.myWins}`;
    if (this.app.elements["shadow-battle-shadow"])
      this.app.elements["shadow-battle-shadow"].textContent = `${competition.shadowWins}`;
    this.app.elements["shadow-duel"].textContent =
      scoreDiff === 0
        ? "Monthly battle tied"
        : scoreDiff > 0
          ? `You lead by ${Math.abs(scoreDiff)} day-win(s)`
          : `Shadow leads by ${Math.abs(scoreDiff)} day-win(s)`;

    if (this.app.elements["shadow-next-rank"])
      this.app.elements["shadow-next-rank"].textContent = nextRank
        ? nextRank.title
        : "Top rank secured";
    if (this.app.elements["shadow-next-rank-sub"])
      this.app.elements["shadow-next-rank-sub"].textContent = nextRank
        ? shadowRating.gate.met
          ? `Need ${srGap} SR`
          : `Need ${srGap} SR â€¢ ${shadowRating.gate.reason}`
        : "BrahMos ceiling held";

    if (this.app.elements["shadow-next-rank-sub"] && nextRank)
      this.app.elements["shadow-next-rank-sub"].textContent =
        shadowRating.gate.met
          ? `${srGap} to go`
          : `${srGap} to go | ${shadowRating.gate.reason}`;

    this.app.elements["shadow-lead-margin"].textContent =
      `Lead Margin: ${Math.abs(scoreDiff)}`;
    this.app.elements["shadow-trend"].textContent =
      `Monthly trend: ${(competition.recentWinRate * 100).toFixed(0)}% win rate`;
    this.app.elements["shadow-verdict"].textContent =
      scoreDiff >= 0
        ? `You lead monthly by ${Math.abs(scoreDiff)} day-win(s); hold at least ${this.app.formatDuration(defenseTarget)} tomorrow. Mission ${missionScore}/100.`
        : `You are behind by ${this.app.formatDuration(neededTie)} today and ${Math.abs(scoreDiff)} monthly day-win(s). Mission ${missionScore}/100.`;

    if (this.app.elements["shadow-next-rank-sub"])
      this.app.elements["shadow-next-rank-sub"].textContent = nextRank
        ? rankProgress.reasons.length
          ? rankProgress.reasons.join(" | ")
          : `${srGap} to go`
        : "BrahMos ceiling held";
    if (this.app.elements["shadow-rank-state"])
      this.app.elements["shadow-rank-state"].textContent =
        `${activeRank.title} active`;
    if (this.app.elements["shadow-shield-status"])
      this.app.elements["shadow-shield-status"].textContent =
        rankProgress.progress.shieldCharges > 0
          ? `Shield ready | Decay watch ${rankProgress.progress.decayStreak}/2`
          : `Shield broken | Decay watch ${rankProgress.progress.decayStreak}/2`;
    if (this.app.elements["shadow-promotion-trial"])
      this.app.elements["shadow-promotion-trial"].textContent = nextRank
        ? `${rankProgress.trialProgress}/${rankProgress.trialRequired} days`
        : "Apex secured";
    if (this.app.elements["shadow-promotion-requirements"])
      this.app.elements["shadow-promotion-requirements"].textContent = nextRank
        ? rankProgress.reasons.length
          ? rankProgress.reasons.join(" | ")
          : `Trial clear at ${this.app.formatDuration(rankProgress.trialTargetMinutes)}`
        : "No further trial required";
    if (this.app.elements["shadow-rank-note"])
      this.app.elements["shadow-rank-note"].textContent =
        rankProgress.eventNote || activeRank.tagline;
    if (this.app.elements["shadow-rank-note-sub"])
      this.app.elements["shadow-rank-note-sub"].textContent = nextRank
        ? `Need ${srGap} SR and ${rankProgress.stableDaysNeeded}/7 stable days. Daily trial target: ${this.app.formatDuration(rankProgress.trialTargetMinutes)}.`
        : "BrahMos held. Focus on maintaining the floor.";
    if (campActive) {
      if (this.app.elements["shadow-next-rank"])
        this.app.elements["shadow-next-rank"].textContent =
          `${activeRank.title} Confirmed`;
      if (this.app.elements["shadow-next-rank-sub"])
        this.app.elements["shadow-next-rank-sub"].textContent =
          `${camp.successDays}/${this.getTrainingCampSuccessRequirement()} clears | ${camp.failDays}/2 misses`;
      if (this.app.elements["shadow-rank-state"])
        this.app.elements["shadow-rank-state"].textContent = activeRankLabel;
      if (this.app.elements["shadow-shield-status"])
        this.app.elements["shadow-shield-status"].textContent =
          `Shield ${shieldLabel} | Fail streak ${camp.consecutiveFails}/2`;
      if (this.app.elements["shadow-promotion-trial"])
        this.app.elements["shadow-promotion-trial"].textContent =
          `Day ${camp.daysCompleted}/${this.getTrainingCampLength()}`;
      if (this.app.elements["shadow-promotion-requirements"])
        this.app.elements["shadow-promotion-requirements"].textContent =
          `${camp.successDays}/${this.getTrainingCampSuccessRequirement()} success | ${camp.failDays}/2 misses | Floor ${this.app.formatDuration(camp.targetMinutes)}`;
      if (this.app.elements["shadow-rank-note-sub"])
        this.app.elements["shadow-rank-note-sub"].textContent =
          `Shadow Buddy says ${activeRank.title} training camp day ${camp.daysCompleted}/${this.getTrainingCampLength()}. Need ${this.getTrainingCampSuccessRequirement()}/10 clears. Instant demotion on 2 consecutive failed days.`;
    } else {
      if (this.app.elements["shadow-rank-state"])
        this.app.elements["shadow-rank-state"].textContent = activeRankLabel;
      if (this.app.elements["shadow-promotion-trial"] && nextRank)
        this.app.elements["shadow-promotion-trial"].textContent =
          "Camp not started";
      if (this.app.elements["shadow-promotion-requirements"] && nextRank)
        this.app.elements["shadow-promotion-requirements"].textContent =
          rankProgress.reasons.length
            ? rankProgress.reasons.join(" | ")
            : `Promotion opens at ${nextRank.min} SR`;
      if (this.app.elements["shadow-rank-note-sub"] && nextRank)
        this.app.elements["shadow-rank-note-sub"].textContent =
          `Need ${srGap} SR to enter ${nextRank.title} provisional. Camp floor: ${this.app.formatDuration(rankProgress.trialTargetMinutes)} for 10 days.`;
    }
    if (this.app.elements["shadow-rank-ladder"])
      this.app.elements["shadow-rank-ladder"].innerHTML = this.renderRankLadder(
        this.getRankIndexByTitle(activeRank.title),
        rankProgress.rawRankIndex,
      );


    if (this.app.trainerEngine?.syncMissionFromRoadmap)
      this.app.trainerEngine.syncMissionFromRoadmap();
    if (this.app.trainerEngine?.updatePenaltyTimer)
      this.app.trainerEngine.updatePenaltyTimer();

    this.app.elements["shadow-duel-you-fill"].style.width =
      `${youShare}%`;
    this.app.elements["shadow-duel-shadow-fill"].style.width =
      `${shadowShare}%`;
    this.app.elements["shadow-note"].textContent =
      "Real data";

    const fill = this.app.elements["shadow-progress-fill"];
    const cappedWidth = Math.min(130, Math.max(0, percentage));
    const style = this.getProgressStyle(percentage);
    fill.style.width = `${cappedWidth}%`;
    fill.style.background = style.color;
    fill.style.boxShadow = style.shadow;

    if (isNewStandard) {
      const card = this.app.elements["shadow-standard-card"];
      card.classList.remove("shadow-new-standard");
      void card.offsetWidth;
      card.classList.add("shadow-new-standard");
    }
  }

  refresh(allowAnimation = true) {
    const metrics = this.computeRollingMetrics();
    const historicalBest = metrics.bestAvg;
    const resolvedShadow = Math.max(
      this.shadowSevenDayAverage,
      historicalBest,
    );
    const isNewStandard = resolvedShadow > this.shadowSevenDayAverage;

    if (resolvedShadow !== this.shadowSevenDayAverage) {
      this.shadowSevenDayAverage = resolvedShadow;
      this.app.saveToStorage(
        CONFIG.STORAGE_KEYS.SHADOW_AVG,
        resolvedShadow,
      );
    }

    this.render({
      todayMinutes: metrics.todayMinutes,
      shadowAvg: resolvedShadow,
      currentAvg: metrics.currentAvg,
      previousAvg: metrics.previousAvg,
      hasMomentumBaseline: metrics.hasMomentumBaseline,
      isNewStandard: allowAnimation && isNewStandard,
    });
    if (this.app.trainerEngine) this.app.trainerEngine.refresh();
  }
}

class TrainerEngine {
  constructor(app) {
    this.app = app;
    this.state = this.loadState();
    this.state.roadmap = this.getRoadmapState();
    this.levels = [
      { name: "Dormant", min: 0, max: 60 },
      { name: "Initiate", min: 60, max: 120 },
      { name: "Competitor", min: 120, max: 180 },
      { name: "Dominator", min: 180, max: 240 },
      { name: "Elite", min: 240, max: Infinity },
    ];
  }

  loadState() {
    return (
      this.app.loadFromStorage(CONFIG.STORAGE_KEYS.TRAINER_STATE) || {
        penaltyMinutes: 0,
        shadowBuffDays: 0,
        userBuffDays: 0,
        lastProcessedDate: null,
        manualMissionChecks: {},
        flexAbuseDays: 0,
        antiMisuseMult: CONFIG.FLEXIBLE_TASK_MULTIPLIER
      }
    );
  }

  initialize() {
    this.refresh();
  }

  getDailyProductiveMap() {
    const map = new Map();
    this.app.state.tasks.forEach((task) => {
      if (!this.app.isProductiveCategory(task.category)) return;
      map.set(task.date, (map.get(task.date) || 0) + task.duration);
    });
    return map;
  }

  getDailySeries(days = 14) {
    const map = this.getDailyProductiveMap();
    const series = [];
    const today = new Date(this.app.getDateString());
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = this.app.getDateString(d);
      series.push({ date: key, minutes: map.get(key) || 0 });
    }
    return series;
  }

  getLevel(minutes) {
    let current = this.levels[0];
    for (const l of this.levels) if (minutes >= l.min) current = l;
    const idx = this.levels.findIndex((l) => l.name === current.name);
    const next = this.levels[idx + 1] || null;
    return { current, next };
  }

  getMicroLevel(minutes) {
    const clamped = Math.max(
      0,
      Math.min(100, Math.floor((minutes / 600) * 100) + 1),
    );
    return clamped;
  }

  getMilestoneProgress(level, sevenDayAvg, winsInLast5) {
    const series5 = this.getDailySeries(5);
    const maintainedDays = series5.filter(
      (d) => d.minutes >= level.min,
    ).length;
    const daysRemaining = Math.max(0, 5 - maintainedDays);
    const winsRemaining = Math.max(0, 3 - winsInLast5);
    const nextTarget = this.levels.find((l) => l.min > level.min);
    const toNext = nextTarget
      ? Math.max(0, Math.ceil(nextTarget.min - sevenDayAvg))
      : 0;
    return `Maintain: ${maintainedDays}/5 days, Wins: ${winsInLast5}/3, Days remaining: ${daysRemaining}, Wins remaining: ${winsRemaining}${nextTarget ? `, +${toNext}m to ${nextTarget.name}` : ", Top level locked"}`;
  }

  getShadowTrend(last3, prev3) {
    if (last3 > prev3 + 5) return "Rising";
    if (last3 < prev3 - 5) return "Declining";
    return "Stable";
  }

  getMode(currentMinutes, effectiveShadow, requiredPace) {
    if (currentMinutes > effectiveShadow * 1.15) return "DOMINANCE";
    if (currentMinutes >= effectiveShadow) return "CONTROL";
    if (requiredPace <= 45) return "RECOVERY";
    return "COLLAPSE";
  }

  getConsecutiveSignal(series, predicate) {
    let run = 0;
    let triggerDate = null;
    for (const day of series) {
      if (predicate(day)) {
        run += 1;
        triggerDate = day.date;
      } else {
        run = 0;
      }
    }
    return { run, triggerDate };
  }

  getDaysSince(dateStr) {
    if (!dateStr) return Infinity;
    const d = new Date(dateStr);
    const t = new Date(this.app.getDateString());
    d.setHours(0, 0, 0, 0);
    t.setHours(0, 0, 0, 0);
    return Math.round((t - d) / 86400000);
  }

  computeAntiSandbagSignals(baseShadow) {
    const threshold = Math.max(1, baseShadow);
    const recentSeries = this.getDailySeries(45);
    const withMargin = recentSeries.map((day) => {
      const margin = day.minutes - threshold;
      const pct = margin / threshold;
      return { ...day, margin, pct, win: margin >= 0 };
    });

    const minimalSignal = this.getConsecutiveSignal(
      withMargin,
      (day) => day.win && day.pct > 0 && day.pct < 0.03,
    );
    const squeezeSignal = this.getConsecutiveSignal(
      withMargin,
      (day) => day.win && day.margin <= 5,
    );

    const daysSinceMinimal = this.getDaysSince(minimalSignal.triggerDate);
    const adaptiveActive =
      minimalSignal.run >= 3 &&
      daysSinceMinimal >= 1 &&
      daysSinceMinimal <= 5;
    const adaptiveDaysLeft = adaptiveActive ? 6 - daysSinceMinimal : 0;

    const daysSinceSqueeze = this.getDaysSince(squeezeSignal.triggerDate);
    const aggressionActive =
      squeezeSignal.run >= 5 &&
      daysSinceSqueeze >= 1 &&
      daysSinceSqueeze <= 3;
    const aggressionDaysLeft = aggressionActive
      ? 4 - daysSinceSqueeze
      : 0;

    return {
      minimalDominanceDetected:
        minimalSignal.run >= 3 || squeezeSignal.run >= 5,
      adaptivePressure: {
        active: adaptiveActive,
        daysLeft: adaptiveDaysLeft,
        buffPct: adaptiveActive ? 0.03 : 0,
      },
      aggressionMode: {
        active: aggressionActive,
        daysLeft: aggressionDaysLeft,
        minWinPct: aggressionActive ? 0.05 : 0,
      },
      minimalRun: minimalSignal.run,
      squeezeRun: squeezeSignal.run,
    };
  }

  buildTrainerSnapshot() {
    const metrics = this.app.shadowEngine.computeRollingMetrics();
    const shadow7DayAverage = Math.max(
      this.app.shadowEngine.shadowSevenDayAverage || 0,
      metrics.bestAvg || 0,
    );
    const map = this.getDailyProductiveMap();
    const competition = this.app.shadowEngine.countShadowWinsThisMonth(
      map,
      shadow7DayAverage,
    );
    const now = new Date();
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    const timeRemainingToday = Math.max(
      0,
      Math.round((dayEnd - now) / 60000),
    );

    const recent = this.getDailySeries(6);
    const last3DayAverage =
      recent.slice(-3).reduce((s, d) => s + d.minutes, 0) / 3;
    const previous3DayAverage =
      recent.slice(0, 3).reduce((s, d) => s + d.minutes, 0) / 3;

    const antiSandbag = this.computeAntiSandbagSignals(shadow7DayAverage);
    const lossChainBuffPct = this.state.shadowBuffDays > 0 ? 0.05 : 0;
    const adaptiveBuffPct = antiSandbag.adaptivePressure.buffPct;
    const effectiveShadow =
      shadow7DayAverage * (1 + lossChainBuffPct + adaptiveBuffPct);
    const userEffectiveToday =
      metrics.todayMinutes *
      (1 + (this.state.userBuffDays > 0 ? 0.05 : 0));
    const effectiveWinTarget = antiSandbag.aggressionMode.active
      ? effectiveShadow * 1.05
      : effectiveShadow + 1;
    const weeklyGap = effectiveShadow - metrics.currentAvg;
    const todayDate = this.app.getDateString(new Date());
    const missionProgress =
      this.app.shadowEngine.getTodayGoalProgress(todayDate);
    const missionScore =
      this.app.shadowEngine.calculateMissionScore(missionProgress);
    const distractionMinutes =
      this.app.shadowEngine.getTodayDistractionMinutes(todayDate);
    const computedPenalty = this.app.shadowEngine.getPenalty(
      metrics.todayMinutes,
      effectiveShadow,
      weeklyGap,
      competition.recentWinRate,
      distractionMinutes,
      missionScore,
    );
    const ladder = this.app.shadowEngine.getWinLadder(
      map,
      effectiveShadow,
    );

    const gap = effectiveShadow - userEffectiveToday;
    const minutesToTie = Math.max(0, Math.ceil(gap));
    const minutesToWin = Math.max(
      0,
      Math.ceil(effectiveWinTarget - userEffectiveToday),
    );
    const hoursLeft = Math.max(1, timeRemainingToday / 60);
    const requiredPace = Math.ceil(minutesToWin / hoursLeft);

    const winsInLast5 = this.getDailySeries(5).filter(
      (d) => d.minutes >= effectiveShadow,
    ).length;
    const userLevel = this.getLevel(metrics.currentAvg);
    const shadowLevel = this.getLevel(effectiveShadow);

    return {
      currentMinutesToday: metrics.todayMinutes,
      shadow7DayAverage,
      monthlyScoreUser: competition.myWins,
      monthlyScoreShadow: competition.shadowWins,
      monthlyWinRate: competition.activeDays
        ? competition.myWins / competition.activeDays
        : 0,
      timeRemainingToday,
      penaltyMinutes: computedPenalty.minutes,
      penaltyPoints: computedPenalty.points,
      penaltyReasons: computedPenalty.reasons,
      strongestHistorical7DayAverage: shadow7DayAverage,
      last3DayAverage,
      previous3DayAverage,
      currentStreakDays: this.app.state.streak,
      effectiveShadow,
      effectiveWinTarget,
      userEffectiveToday,
      gap,
      minutesToTie,
      minutesToWin,
      requiredPace,
      mode: this.getMode(
        userEffectiveToday,
        effectiveShadow,
        requiredPace,
      ),
      userLevel,
      shadowLevel,
      winsInLast5,
      antiSandbag,
      userMicroLevel: this.getMicroLevel(metrics.currentAvg),
      shadowMicroLevel: this.getMicroLevel(effectiveShadow),
      missionScore,
      distractionMinutes,
      distractionOverBudget: computedPenalty.overBudget,
      winLadder: ladder,
    };
  }

  buildReport(d = this.buildTrainerSnapshot()) {
    const trend = this.getShadowTrend(
      d.last3DayAverage,
      d.previous3DayAverage,
    );
    const userMilestone = this.getMilestoneProgress(
      d.userLevel.current,
      d.currentMinutesToday,
      d.winsInLast5,
    );
    const shadowMilestone = this.getMilestoneProgress(
      d.shadowLevel.current,
      d.effectiveShadow,
      Math.max(0, 5 - d.winsInLast5),
    );
    const nextPenalty = Math.max(15, Math.ceil(d.penaltyMinutes * 1.1));
    const streakBuff =
      d.currentStreakDays >= 7
        ? "Active: USER +5% for next 7 days"
        : `Locked: ${7 - Math.min(7, d.currentStreakDays)} consecutive wins remaining`;
    const threeLossBuff =
      "If 3 consecutive losses confirmed: SHADOW +5% effective average for next 3 days";

    const anti = d.antiSandbag;
    const antiBuffStatus = anti.adaptivePressure.active
      ? `Adaptive Pressure Buff active (+3%) for ${anti.adaptivePressure.daysLeft} day(s)`
      : `Adaptive Pressure Buff inactive (trigger: 3 consecutive wins <3% margin, current run ${anti.minimalRun})`;
    const aggressionStatus = anti.aggressionMode.active
      ? `Aggression Mode active (minimum +5% win margin) for ${anti.aggressionMode.daysLeft} day(s)`
      : `Aggression Mode inactive (trigger: 5 consecutive wins <=5m margin, current run ${anti.squeezeRun})`;
    const minimalLabel = anti.minimalDominanceDetected
      ? "Minimal Dominance Detected"
      : "Dominance Quality Acceptable";

    const phase1 = Math.min(
      60,
      Math.max(45, Math.ceil(d.minutesToWin * 0.5)),
    );
    const phase2 = Math.max(0, d.minutesToTie - phase1);
    const safetyTarget = Math.ceil(d.minutesToWin * 1.15);
    const phase3 = Math.max(
      0,
      safetyTarget - Math.max(0, phase1 + phase2),
    );

    return `=== SHADOW STATUS ===
Level: ${d.shadowLevel.current.name} | L${d.shadowMicroLevel}/100
Active Buffs: ${this.state.shadowBuffDays > 0 ? `+5% for ${this.state.shadowBuffDays} day(s)` : "None"}; ${antiBuffStatus}; ${aggressionStatus}
Effective Average: ${this.app.formatDuration(d.effectiveShadow)}
Trend: ${trend}
Strength: Highest proven 7-day average at ${this.app.formatDuration(d.strongestHistorical7DayAverage)}
Vulnerability: Shadow weakens when your monthly win rate rises above 60%
Next Level Milestone: ${shadowMilestone}

=== USER STATUS ===
Level: ${d.userLevel.current.name} | L${d.userMicroLevel}/100
Active Penalties: ${this.app.formatDuration(d.penaltyMinutes)} (${d.penaltyPoints}pt) | ${d.penaltyReasons.length ? d.penaltyReasons.join(" | ") : "No active penalty triggers"}
Mission Score: ${d.missionScore}/100
Distraction Budget: ${this.app.formatDuration(d.distractionMinutes)} / ${this.app.formatDuration(CONFIG.DISTRACTION_BUDGET_MINUTES)}${d.distractionOverBudget > 0 ? ` (+${this.app.formatDuration(d.distractionOverBudget)} over)` : ""}
Win Ladder: 3/5 ${d.winLadder.status3in5}${d.winLadder.clear3in5 ? " [CLEAR]" : ""} | 5/7 ${d.winLadder.status5in7}${d.winLadder.clear5in7 ? " [CLEAR]" : ""}
Mode: ${d.mode}
Gap: ${d.gap > 0 ? "-" : "+"}${this.app.formatDuration(Math.abs(d.gap))}
Minutes to Tie: ${this.app.formatDuration(d.minutesToTie)}
Minutes to Win: ${this.app.formatDuration(d.minutesToWin)} (target ${this.app.formatDuration(d.effectiveWinTarget)})
Required Pace: ${d.requiredPace} min/hour
Next Level Milestone: ${userMilestone}

=== SYSTEM EFFECTS ===
If You Lose Today: Next penalty becomes ${this.app.formatDuration(nextPenalty)} (+10%) because current penalty triggers remain active.
If You Win Today: ${minimalLabel}; Shadow effective average remains ${this.app.formatDuration(d.effectiveShadow)} unless anti-sandbag trigger extends pressure.
If 7-Day Streak Achieved: ${streakBuff}.
If 3 Consecutive Losses: ${threeLossBuff}.

=== CRUSH PLAN ===
Phase 1: ${this.app.formatDuration(phase1)} immediate high-impact deep work block.
Phase 2: ${this.app.formatDuration(phase2)} tie-securing block to reach ${this.app.formatDuration(d.minutesToTie)}.
Phase 3: ${this.app.formatDuration(phase3)} safety buffer block (15% above win target).

=== LONG-TERM DOMINATION ===
Surpass Shadow level by lifting your rolling 7-day average above ${this.app.formatDuration((d.shadowLevel.next || d.shadowLevel.current).min)} and sustaining milestone rules (5 days, 3 wins). Maintain next level by protecting monthly win rate above 60% and keeping required pace below 45 min/hour. Break Shadow momentum by converting today into a win and chaining 3 of next 5 days above ${this.app.formatDuration(d.effectiveWinTarget)} under current anti-sandbag pressure. Secure the next milestone immediately: ${d.userLevel.next ? d.userLevel.next.name : "Top level retention"}.

=== COMMAND ===
Execute Phase 1 now and close only after logging the full ${this.app.formatDuration(phase1)}.`;
  }

  escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  renderStructuredReport(reportText, snapshot) {
    const overview = this.app.elements["trainer-overview"];
    const content = this.app.elements["trainer-content"];
    if (!overview || !content) return;

    overview.innerHTML = `
          <div class="trainer-overview-card"><div class="trainer-overview-label">Mode</div><div class="trainer-overview-value">${this.escapeHtml(snapshot.mode)}</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Minutes to Win</div><div class="trainer-overview-value">${this.escapeHtml(this.app.formatDuration(snapshot.minutesToWin))}</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Required Pace</div><div class="trainer-overview-value">${this.escapeHtml(String(snapshot.requiredPace))} min/hour</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Effective Shadow</div><div class="trainer-overview-value">${this.escapeHtml(this.app.formatDuration(snapshot.effectiveShadow))}</div></div>
        `;

    const sections = reportText.split(/^===\s*(.+?)\s*===\s*$/gm);
    let html = "";
    for (let i = 1; i < sections.length; i += 2) {
      const title = sections[i];
      const body = (sections[i + 1] || "").trim();
      if (!body) continue;
      const lines = body.split("\n").filter(Boolean);
      let rows = "";
      lines.forEach((line) => {
        const idx = line.indexOf(":");
        if (idx > 0) {
          const key = this.escapeHtml(line.slice(0, idx).trim());
          const val = this.escapeHtml(line.slice(idx + 1).trim());
          rows += `<div class="trainer-row"><div class="trainer-key">${key}</div><div class="trainer-val">${val}</div></div>`;
        } else {
          rows += `<div class="trainer-row"><div class="trainer-val">${this.escapeHtml(line)}</div></div>`;
        }
      });
      if (title.trim() === "COMMAND") {
        html += `<section class="trainer-section"><div class="trainer-section-title">${this.escapeHtml(title)}</div><div class="trainer-command">${this.escapeHtml(lines.join(" "))}</div></section>`;
      } else {
        html += `<section class="trainer-section"><div class="trainer-section-title">${this.escapeHtml(title)}</div>${rows}</section>`;
      }
    }
    content.innerHTML = html;
  }

  getRoadmapState() {
    const createFromTemplate = () => ({
      modules: ANALOG_IC_ROADMAP_TEMPLATE.map((m) => ({
        name: m.module,
        days: m.days.map((task) => ({
          day: "",
          text: task,
          completed: false,
        })),
      })),
      editMode: false,
      startedAt: Date.now(),
    });

    const stored = this.app.loadFromStorage(
      CONFIG.STORAGE_KEYS.ROADMAP_STATE,
    );
    if (!stored?.modules?.length) return createFromTemplate();

    const allCompleted = stored.modules.every(
      (mod) => mod.days?.length && mod.days.every((day) => day.completed),
    );
    if (allCompleted) return createFromTemplate();

    const merged = createFromTemplate();
    merged.editMode = !!stored.editMode;
    merged.startedAt = stored.startedAt || merged.startedAt;
    merged.modules.forEach((module, mi) => {
      const fromStored = stored.modules[mi];
      if (!fromStored) return;
      module.name = fromStored.name || module.name;
      module.days.forEach((day, di) => {
        const storedDay = fromStored.days?.[di];
        if (!storedDay) return;
        day.text = storedDay.text || day.text;
        day.completed = !!storedDay.completed;
      });
    });
    return merged;
  }

  normalizeRoadmapDays() {
    let counter = 1;
    this.state.roadmap.modules.forEach((mod) => {
      mod.days.forEach((day) => {
        day.day = `Day ${counter++}`;
        if (
          day.day === "Day 29" &&
          typeof day.text === "string" &&
          day.text.includes("Differential Amplifier using OpAmp")
        ) {
          day.text = "Differential Amplifier using OpAmp\nActive Load";
        }
      });
    });
  }

  ensureRoadmap() {
    if (!this.state.roadmap) this.state.roadmap = this.getRoadmapState();
    this.normalizeRoadmapDays();
  }

  normalizeTopic(text = "") {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  saveTrainerState() {
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.TRAINER_STATE, this.state);
  }

  invalidateRoadmapSlots() {
    this.state.roadmapSlotsDate = null;
    this.state.roadmapSlots = null;
    this.saveTrainerState();
  }

  armRoadmapSlotRollover() {
    this.state.roadmapAdvanceAfterDate = this.app.getDateString(new Date());
    this.saveTrainerState();
  }

  getTodayManualMissionChecks() {
    const today = this.app.getDateString(new Date());
    if (!this.state.manualMissionChecks) {
      this.state.manualMissionChecks = {};
    }
    if (!this.state.manualMissionChecks[today]) {
      this.state.manualMissionChecks[today] = {};
    }
    return this.state.manualMissionChecks[today];
  }

  getMissionCheckId(topic = "", idx = null) {
    const base = this.normalizeTopic(topic).replace(/\s+/g, "-") || "mission";
    return Number.isInteger(idx) ? `${base}-${idx + 1}` : base;
  }

  getThresholdForTopic(topic = "") {
    const key = this.normalizeTopic(topic);
    return MISSION_THRESHOLDS[key] || MISSION_THRESHOLDS.default;
  }

  getRoadmapProgress() {
    this.ensureRoadmap();
    let moduleIndex = 0;
    while (moduleIndex < this.state.roadmap.modules.length) {
      const mod = this.state.roadmap.modules[moduleIndex];
      if (!mod.days.every((d) => d.completed)) break;
      moduleIndex += 1;
    }
    const activeModule =
      this.state.roadmap.modules[
      Math.min(moduleIndex, this.state.roadmap.modules.length - 1)
      ] || null;
    return { moduleIndex, activeModule };
  }

  getActiveRoadmapDay() {
    const { moduleIndex } = this.getRoadmapProgress();
    const module = this.state.roadmap.modules[moduleIndex];
    if (!module) return null;
    const dayIndex = module.days.findIndex((d) => !d.completed);
    if (dayIndex < 0) return null;
    return { moduleIndex, dayIndex, day: module.days[dayIndex], module };
  }

  findRoadmapDayByTopic(topic = "") {
    this.ensureRoadmap();
    const normalizedTopic = this.normalizeTopic((topic || "").split("\n")[0].trim());
    if (!normalizedTopic) return null;
    for (let mi = 0; mi < this.state.roadmap.modules.length; mi += 1) {
      const module = this.state.roadmap.modules[mi];
      for (let di = 0; di < module.days.length; di += 1) {
        const day = module.days[di];
        const dayTopic = this.normalizeTopic(((day.text || "").split("\n")[0] || "").trim());
        if (dayTopic === normalizedTopic) {
          return { moduleIndex: mi, dayIndex: di, day, module };
        }
      }
    }
    return null;
  }

  syncRoadmapDayFromMissionTopic(topic = "", completed = false) {
    const match = this.findRoadmapDayByTopic(topic);
    if (!match || !!match.day.completed === !!completed) return false;
    match.day.completed = !!completed;
    this.app.saveToStorage(
      CONFIG.STORAGE_KEYS.ROADMAP_STATE,
      this.state.roadmap,
    );
    return true;
  }

  getTopicProgress(topic, dateStr = this.app.getDateString(new Date())) {
    const normalizedTopic = this.normalizeTopic(topic);
    const topicWords = normalizedTopic
      .split(" ")
      .filter((w) => w.length > 3);
    let minutes = 0;
    let sessions = 0;

    this.app.state.tasks.forEach((task) => {
      if (
        !task ||
        task.date !== dateStr ||
        !this.app.isProductiveCategory(task.category)
      )
        return;
      const taskTopic = this.normalizeTopic(
        task.missionTopic || task.topic || "",
      );
      const haystack = this.normalizeTopic(
        `${task.description || ""} ${task.subcategory || ""} ${task.category || ""}`,
      );
      const matchesTopic =
        taskTopic === normalizedTopic ||
        topicWords.some((w) => haystack.includes(w));
      if (!matchesTopic) return;
      minutes += Number(task.duration || 0);
      sessions += 1;
    });

    return {
      minutes,
      sessions,
      threshold: this.getThresholdForTopic(topic),
    };
  }

  getMissionPhaseLabel(phase = "") {
    const labels = {
      Morning: "AM",
      "Core Study": "Focus",
      Breaks: "Reset",
      Evening: "PM",
    };
    return labels[phase] || phase;
  }

  getDailyMissionTasks() {
    const active = this.getActiveRoadmapDay();
    const today = this.app.getDateString(new Date());
    const rolloverArmedDate = this.state.roadmapAdvanceAfterDate || null;
    const canAdvanceToday = !!rolloverArmedDate && rolloverArmedDate !== today;
    let learningSlots = null;

    if (this.state.roadmapSlotsDate === today) {
      learningSlots = this.state.roadmapSlots;
    } else if (this.state.roadmapSlots && !canAdvanceToday) {
      learningSlots = this.state.roadmapSlots;
    }

    if (!learningSlots && active) {
      const uncompleted = active.module.days.filter(d => !d.completed);
      learningSlots = uncompleted
        .slice(0, 4)
        .map(d => (d.text || "").split("\n")[0].trim());
      this.state.roadmapSlotsDate = today;
      this.state.roadmapSlots = learningSlots;
      if (canAdvanceToday) this.state.roadmapAdvanceAfterDate = null;
      this.saveTrainerState();
    }

    const getTopic = (idx, fallback) => {
      if (learningSlots && learningSlots[idx]) return learningSlots[idx];
      return fallback;
    };

    const focusTopic1 = getTopic(0, "Main topic");
    const focusTopic2 = getTopic(1, "Practice set");
    const focusTopic3 = getTopic(2, "Review topic");
    const focusTopic4 = getTopic(3, "Weak area");

    const makeTask = (labelPrefix, topic, win, priority, dType, target, phase, secondary = false, scoreWeight = 0) => {
      const progress = this.getTopicProgress(topic);
      const done = progress.minutes >= target;
      let label = labelPrefix || topic;
      if (labelPrefix && topic && labelPrefix !== topic) {
        label = `${labelPrefix}: ${topic}`;
      }
      return {
        type: "custom",
        topic,
        label,
        progress,
        done,
        win,
        priority,
        discipline_type: dType,
        phase,
        secondary,
        score_weight: scoreWeight,
        target_minutes: target,
        estimated_minutes: dType === "FLEXIBLE" ? Math.round(target * (this.state.antiMisuseMult || CONFIG.FLEXIBLE_TASK_MULTIPLIER)) : target
      };
    };
    return [
      makeTask("START", "Plan the day", [6, 6.5], "LOW", "FLEXIBLE", 30, "Morning", false, 3),
      makeTask("FOCUS BLOCK 1", focusTopic1, [6.5, 8], "MEDIUM", "STRICT", 90, "Morning", false, 10),
      makeTask("BREAK", "Break + Hydration", [8, 8.25], "LOW", "FLEXIBLE", 15, "Breaks", true, 1),
      makeTask("FOCUS BLOCK 2", focusTopic2, [8.25, 9.5], "MEDIUM", "STRICT", 75, "Core Study", false, 9),
      makeTask("PRACTICE", "Practice session", [10, 11], "MEDIUM", "FLEXIBLE", 60, "Morning", false, 8),
      makeTask("LUNCH", "Lunch", [12.5, 13], "LOW", "FLEXIBLE", 30, "Breaks", true, 1),
      makeTask("BUILD", "Build / Project / Assignment", [14, 15], "MEDIUM", "FLEXIBLE", 60, "Core Study", false, 7),
      makeTask("REVIEW", focusTopic3, [16, 17], "MEDIUM", "FLEXIBLE", 60, "Evening", false, 6),
      makeTask("WALK", "Walk / Reset", [17, 17.5], "LOW", "FLEXIBLE", 30, "Evening", true, 2),
      makeTask("WEAK AREA", focusTopic4, [18, 19], "LOW", "FLEXIBLE", 60, "Evening", true, 5),
      makeTask("DINNER", "Dinner", [19.5, 20], "LOW", "FLEXIBLE", 30, "Breaks", true, 1),
      makeTask("LIGHT RECAP", "Quick recap", [20.5, 21], "LOW", "FLEXIBLE", 30, "Evening", false, 3),
      makeTask("WIND DOWN", "Wind down", [21, 22], "LOW", "FLEXIBLE", 60, "Evening", true, 1),
      makeTask("REST", "Sleep", [22.5, 30], "HIGH", "STRICT", 450, "Evening", true, 2),
    ];
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Phase 0 â€” Performance & UI Stability
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  // Â§16/17/18: resolve time-window for a mission item
  getMissionTimeWindow(item) {
    return item.win || [8, 22];
  }

  formatTimeWindow([startH, endH]) {
    const fmt = (h) => {
      const normalized = ((h % 24) + 24) % 24; // handle times >24 (overnight REST block)
      const totalMinutes = Math.round(normalized * 60);
      const hour = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const period = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      return `${hour12}:${mins.toString().padStart(2, "0")} ${period}`;
    };
    return `${fmt(startH)}â€“${fmt(endH)}`;
  }

  // â”€â”€ Phase 0.2: local mission state cache (Map) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Never recomputed on checkbox click â€” only rebuilt on topology change.
  _buildMissionCache(tasks, checks, nowH) {
    const cache = new Map();
    tasks.forEach((item, idx) => {
      const checkId = this.getMissionCheckId(item.topic, idx);
      const legacyId = this.getMissionCheckId(item.topic);
      const autoDone = !!item.done;
      const manualDone = !!checks[checkId] || !!checks[legacyId];
      const done = autoDone || manualDone;
      const win = this.getMissionTimeWindow(item);
      const [startH, endH] = win;
      const expired = !done && nowH > endH;
      const activeNow = !done && !expired && nowH >= startH && nowH <= endH;
      cache.set(checkId, { idx, item, checkId, done, win, startH, endH, expired, activeNow });
    });
    return cache;
  }

  updateMissionChecklistScore(cache = this._missionStateCache) {
    const scoreEl = this.app?.elements?.["shadow-mission-score"];
    if (!scoreEl || !cache || cache.size === 0) return;
    let totalWeight = 0;
    let doneWeight = 0;
    cache.forEach((entry) => {
      const weight = Math.max(0, Number(entry?.item?.score_weight ?? 0));
      totalWeight += weight;
      if (entry?.done) doneWeight += weight;
    });
    const score = totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0;
    scoreEl.textContent = `${score}/100`;
  }
  _applyRowState(row, done, expired, activeNow) {
    row.classList.toggle("shadow-goal-done", done);
    row.classList.toggle("mission-expired", expired && !done);
    row.classList.toggle("mission-active-now", activeNow && !done && !expired);
  }

  // â”€â”€ Phase 0.4: live expiry ticker â€” only CSS toggles, never innerHTML â”€
  applyMissionTimeStates(container) {
    if (!container) return;
    const now = new Date();
    let nowH = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    if (nowH < 5) nowH += 24; // map cross-midnight REST tasks
    container.querySelectorAll(".shadow-goal-item[data-win-start]").forEach(el => {
      const startH = parseFloat(el.dataset.winStart);
      const endH = parseFloat(el.dataset.winEnd);
      const done = el.classList.contains("shadow-goal-done");
      this._applyRowState(el, done, !done && nowH > endH, !done && nowH >= startH && nowH <= endH);
    });
  }

  getCurrentMissionDateKey(now = new Date()) {
    return this.app.getDateString(now);
  }

  getNextBoundaryDelayMs(cache = this._missionStateCache) {
    if (!cache || cache.size === 0) return null;
    const now = new Date();
    const nowMs = now.getTime();
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);
    let minDelay = null;

    cache.forEach((entry) => {
      if (!entry) return;
      [entry.startH, entry.endH].forEach((h) => {
        if (!Number.isFinite(h)) return;
        const candidate = new Date(base);
        candidate.setTime(base.getTime() + h * 3600000);
        let delta = candidate.getTime() - nowMs;
        if (delta <= 0) delta += 24 * 3600000;
        if (minDelay === null || delta < minDelay) minDelay = delta;
      });
    });

    if (minDelay === null) return null;
    return Math.max(200, Math.floor(minDelay) + 20);
  }

  scheduleMissionBoundaryPulse() {
    if (this._missionBoundaryTimeoutId) clearTimeout(this._missionBoundaryTimeoutId);
    const delay = this.getNextBoundaryDelayMs();
    if (!Number.isFinite(delay)) return;
    this._missionBoundaryTimeoutId = setTimeout(() => {
      this.syncMissionFromRoadmap({ skipRender: true, rebuild: false });
      this.scheduleMissionBoundaryPulse();
    }, delay);
  }

  // â”€â”€ Phase 0.5: live loop â€” 1s precision, no structural re-render â”€â”€â”€â”€â”€â”€
  startMissionLiveLoop() {
    if (this._missionLiveLoopId) return; // only one loop ever â€” never restart on re-render
    this._missionLastDateKey = this.getCurrentMissionDateKey();
    this._missionLiveLoopId = setInterval(() => {
      const currentDateKey = this.getCurrentMissionDateKey();
      if (currentDateKey !== this._missionLastDateKey) {
        this._missionLastDateKey = currentDateKey;
        this.syncMissionFromRoadmap();
        return;
      }
      this.syncMissionFromRoadmap({ skipRender: true, rebuild: false });
    }, 1000);
    this.scheduleMissionBoundaryPulse();
  }

  // â”€â”€ Phase 0.1: single delegated listener â€” attached ONCE, never re-added
  _initMissionDelegation() {
    if (this._missionDelegationBound) return;
    this._missionDelegationBound = true;
    // Use document-level delegation so re-renders never break the listener
    document.addEventListener("change", (e) => {
      if (!e.target.classList.contains("mission-check")) return;
      const checkId = e.target.getAttribute("data-mission-check-id");
      if (!checkId) return;

      // Phase 0.2: update local cache immediately (< 1ms)
      const cached = this._missionStateCache?.get(checkId);
      if (cached) cached.done = !!e.target.checked;

      // Phase 0.3: update only THIS row â€” no innerHTML, no loop
      const row = e.target.closest(".shadow-goal-item");
      if (row) {
        let nowH = new Date().getHours() + new Date().getMinutes() / 60;
        if (nowH < 5) nowH += 24;
        const endH = parseFloat(row.dataset.winEnd || "22");
        const startH = parseFloat(row.dataset.winStart || "8");
        const done = !!e.target.checked;
        this._applyRowState(row, done, !done && nowH > endH, !done && nowH >= startH && nowH <= endH);
      }

      // Persist manual check state
      const checks = this.getTodayManualMissionChecks();
      checks[checkId] = !!e.target.checked;
      this.saveTrainerState();
      this.updateMissionChecklistScore();

      if (this.syncRoadmapDayFromMissionTopic(cached?.item?.topic, !!e.target.checked)) {
        this.renderRoadmap();
        this.syncMissionFromRoadmap();
        this.app.shadowEngine?.refresh(false);
      }
    }, { passive: true });
  }

  // â”€â”€ Main sync: rebuilds innerHTML ONLY when task topology changes â”€â”€â”€â”€â”€
  syncMissionFromRoadmap({ skipRender = false, rebuild = true } = {}) {
    const primaryContainer =
      document.getElementById("shadow-goal-list-primary") ||
      document.querySelector(".shadow-goal-list");
    const secondaryContainer = document.getElementById(
      "shadow-goal-list-secondary",
    );
    if (!primaryContainer) return;

    // Phase 0.1: guarantee ONE delegated listener â€” never per-element
    this._initMissionDelegation();

    const currentMissionDateKey = this.getCurrentMissionDateKey();
    const forceDateRebuild =
      this._missionCacheDateKey &&
      this._missionCacheDateKey !== currentMissionDateKey;

    let tasks = null;
    if (rebuild || forceDateRebuild || !this._missionStateCache) {
      tasks = this.getDailyMissionTasks();
      const checks = this.getTodayManualMissionChecks();
      let nowH = new Date().getHours() + new Date().getMinutes() / 60;
      if (nowH < 5) nowH += 24;
      // Phase 0.2: rebuild local state cache
      this._missionStateCache = this._buildMissionCache(tasks, checks, nowH);
      this._missionCacheDateKey = currentMissionDateKey;
    }
    this.updateMissionChecklistScore(this._missionStateCache);
    this.scheduleMissionBoundaryPulse();

    if (skipRender) {
      this.applyMissionTimeStates(primaryContainer);
      this.applyMissionTimeStates(secondaryContainer);
      return;
    }

    const taskIds = ["mission-task-1", "mission-task-2", "mission-task-3", "mission-task-4", "mission-task-5", "mission-task-6", "mission-task-7"];
    const timeIds = ["mission-time-1", "mission-time-2", "mission-time-3", "mission-time-4", "mission-time-5", "mission-time-6", "mission-time-7"];
    const phaseOrder = ["Morning", "Core Study", "Breaks", "Evening"];
    const renderTask = (item, idx) => {
      const checkId = this.getMissionCheckId(item.topic, idx);
      const state = this._missionStateCache.get(checkId);
      const labelId = idx < 7 ? ` id="${taskIds[idx]}"` : "";
      const timeId = idx < 7 ? ` id="${timeIds[idx]}"` : "";
      let cls = "shadow-goal-item";
      if (item.secondary) cls += " mission-secondary";
      if (state.done) cls += " shadow-goal-done";
      if (state.expired) cls += " mission-expired";
      if (state.activeNow) cls += " mission-active-now";
      const badge = `<span class="mission-time-badge"${timeId}>${this.formatTimeWindow(state.win)}</span>`;
      const labelledBy = idx < 7 ? `${taskIds[idx]} ${timeIds[idx]}` : "";
      const ariaLabel = labelledBy ? ` aria-labelledby="${labelledBy}"` : ` aria-label="${this.escapeHtml(item.label || item.topic)} ${this.formatTimeWindow(state.win)}"`;
      return `<div class="${cls}" data-win-start="${state.startH}" data-win-end="${state.endH}" data-check-id="${this.escapeHtml(checkId)}"${ariaLabel}>` +
        `<div class="mission-copy">${badge}<span class="mission-title"${labelId}>${idx + 1}. ${this.escapeHtml(item.label || item.topic)}</span></div>` +
        `<input class="mission-check" type="checkbox" data-mission-check-id="${this.escapeHtml(checkId)}" ${state.done ? "checked" : ""} />` +
        `</div>`;
    };

    const orderedEntries = tasks.map((item, idx) => ({ item, idx }));
    const primaryEntries = orderedEntries.filter((_, visualIdx) => visualIdx % 2 === 0);
    const secondaryEntries = orderedEntries.filter((_, visualIdx) => visualIdx % 2 === 1);

    const renderEntrySet = (entries, secondary = false) => {
      if (!entries.length) return "";
      return `<div class="mission-phase-items${secondary ? " secondary" : ""}">${entries.map(({ item, idx }) => renderTask(item, idx)).join("")}</div>`;
    };

    // Phase 0.3: structural innerHTML render â€” ONLY called here, never on interaction
    primaryContainer.innerHTML = renderEntrySet(primaryEntries);
    if (secondaryContainer) {
      secondaryContainer.innerHTML = renderEntrySet(secondaryEntries, true);
    }














    // Phase 0.5: start live loop (guard inside prevents duplicate)
    this.startMissionLiveLoop();

    // Auto-complete active roadmap day if progress crosses threshold
    const active = this.getActiveRoadmapDay();
    if (active) {
      const topic = (active.day.text || "").split("\n")[0].trim();
      const progress = this.getTopicProgress(topic);
      if (!active.day.completed && progress.minutes >= this.getThresholdForTopic(topic)) {
        active.day.completed = true;
        this.app.saveToStorage(CONFIG.STORAGE_KEYS.ROADMAP_STATE, this.state.roadmap);
        this.normalizeRoadmapDays();
        this.renderRoadmap();
        this.syncMissionFromRoadmap({ rebuild: true });
        this.app.shadowEngine?.refresh(false);
      }
    }
  }

  updatePenaltyTimer() {
    const el = this.app.elements["roadmap-penalty-timer"];
    if (!el) return;
    const { activeModule } = this.getRoadmapProgress();
    if (!activeModule) {
      el.textContent = "0 tasks  Hold";
      return;
    }
    const pending = activeModule.days.filter((d) => !d.completed).length;
    if (!pending) {
      el.textContent = "0 tasks  Clear";
      return;
    }

    const due = new Date();
    due.setHours(23, 59, 59, 999);
    const ms = Math.max(0, due - new Date());
    const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
    const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
    const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
    el.textContent = `${pending} tasks  Reset if loss`;
  }

  setGeneratorStatus(key, message, kind = "idle") {
    const el = this.app.elements[key];
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("is-success", "is-error");
    if (kind === "success") el.classList.add("is-success");
    if (kind === "error") el.classList.add("is-error");
  }

  buildTopicTokens(rawTopic = "") {
    const cleaned = String(rawTopic)
      .replace(/[|]/g, "/")
      .replace(/\s+/g, " ")
      .trim();
    const parts = cleaned
      .split(/,|\/|\+|&/)
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length ? parts : [cleaned || "Focused Study"];
  }

  titleCase(text = "") {
    return String(text)
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  buildGeneratedRoadmap(topic) {
    const tokens = this.buildTopicTokens(topic);
    const primary = this.titleCase(tokens[0] || topic);
    const secondary = this.titleCase(tokens[1] || `${primary} Practice`);
    const tertiary = this.titleCase(tokens[2] || `${primary} Revision`);

    return {
      modules: [
        {
          module: `${primary.toUpperCase()} FOUNDATIONS`,
          days: [
            { day: 1, topic: `${primary}: core principles and vocabulary` },
            { day: 2, topic: `${primary}: baseline notes and concept map` },
            { day: 3, topic: `${primary}: worked examples and first pass problems` },
          ],
        },
        {
          module: `${primary.toUpperCase()} CORE SYSTEMS`,
          days: [
            { day: 4, topic: `${primary}: key mechanisms and patterns` },
            { day: 5, topic: `${secondary}: guided problem solving` },
            { day: 6, topic: `${secondary}: error log and correction pass` },
          ],
        },
        {
          module: `${primary.toUpperCase()} EXECUTION`,
          days: [
            { day: 7, topic: `${primary}: timed deep-work block` },
            { day: 8, topic: `${tertiary}: spaced revision and active recall` },
            { day: 9, topic: `${primary}: mock application or mini project` },
          ],
        },
        {
          module: `${primary.toUpperCase()} CONSOLIDATION`,
          days: [
            { day: 10, topic: `${secondary}: weak-area repair` },
            { day: 11, topic: `${tertiary}: exam-style recap` },
            { day: 12, topic: `${primary}: final review and next-cycle planning` },
          ],
        },
      ],
    };
  }

  setGeneratorOutput(key, value) {
    const el = this.app.elements[key];
    if (!el) return;
    el.value = value || "";
    const storageMap = {
      "ai-roadmap-output": CONFIG.STORAGE_KEYS.ROADMAP_PROMPT_DRAFT,
      "ai-roadmap-response": CONFIG.STORAGE_KEYS.ROADMAP_RESPONSE_DRAFT,
      "ai-task-output": CONFIG.STORAGE_KEYS.TASK_PROMPT_DRAFT,
      "ai-task-response": CONFIG.STORAGE_KEYS.TASK_RESPONSE_DRAFT,
    };
    const storageKey = storageMap[key];
    if (storageKey) this.app.saveToStorage(storageKey, el.value);
  }

  copyGeneratorOutput(outputKey, statusKey, emptyMessage, successMessage) {
    const el = this.app.elements[outputKey];
    const value = el?.value?.trim();
    if (!value) {
      this.setGeneratorStatus(statusKey, emptyMessage, "error");
      return;
    }
    navigator.clipboard
      .writeText(value)
      .then(() => {
        this.setGeneratorStatus(statusKey, successMessage, "success");
      })
      .catch(() => {
        this.setGeneratorStatus(
          statusKey,
          "Copy failed. Select the text and copy it manually.",
          "error",
        );
      });
  }

  hydrateGeneratorDrafts() {
    [
      ["ai-roadmap-output", CONFIG.STORAGE_KEYS.ROADMAP_PROMPT_DRAFT],
      ["ai-roadmap-response", CONFIG.STORAGE_KEYS.ROADMAP_RESPONSE_DRAFT],
      ["ai-task-output", CONFIG.STORAGE_KEYS.TASK_PROMPT_DRAFT],
      ["ai-task-response", CONFIG.STORAGE_KEYS.TASK_RESPONSE_DRAFT],
    ].forEach(([elementKey, storageKey]) => {
      const value = this.app.loadFromStorage(storageKey);
      const el = this.app.elements[elementKey];
      if (el && typeof value === "string") el.value = value;
    });
  }

  normalizeExternalText(raw = "") {
    return String(raw)
      .replace(/```json/gi, "")
      .replace(/```javascript/gi, "")
      .replace(/```js/gi, "")
      .replace(/```/g, "")
      .trim();
  }

  applyRoadmapResponse() {
    const responseEl = this.app.elements["ai-roadmap-response"];
    const raw = responseEl?.value?.trim();
    if (!raw) {
      this.setGeneratorStatus("ai-roadmap-status", "Paste roadmap JSON first.", "error");
      return;
    }

    try {
      const parsed = JSON.parse(this.normalizeExternalText(raw));
      if (!Array.isArray(parsed.modules) || !parsed.modules.length) {
        throw new Error("Missing modules array.");
      }

      const roadmap = {
        modules: parsed.modules.map((module) => ({
          name: String(module.module || module.name || "MODULE").trim(),
          days: Array.isArray(module.days)
            ? module.days.map((day, index) => ({
                day: `Day ${Number(day.day || index + 1)}`,
                text: String(day.topic || day.text || "").trim() || `Step ${index + 1}`,
                completed: false,
              }))
            : [],
        })).filter((module) => module.days.length),
        editMode: false,
        startedAt: Date.now(),
      };

      if (!roadmap.modules.length) {
        throw new Error("No valid roadmap modules found.");
      }

      this.state.roadmap = roadmap;
      this.app.saveToStorage(CONFIG.STORAGE_KEYS.ROADMAP_STATE, this.state.roadmap);
      this.app.saveToStorage(CONFIG.STORAGE_KEYS.ROADMAP_RESPONSE_DRAFT, raw);
      this.refresh();
      this.setGeneratorStatus("ai-roadmap-status", "Roadmap applied.", "success");
    } catch (error) {
      this.setGeneratorStatus("ai-roadmap-status", `Invalid roadmap JSON. ${error.message}`, "error");
    }
  }

  saveTaskResponse() {
    const responseEl = this.app.elements["ai-task-response"];
    const raw = responseEl?.value?.trim();
    if (!raw) {
      this.setGeneratorStatus("ai-task-status", "Paste makeTask code first.", "error");
      return;
    }
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.TASK_RESPONSE_DRAFT, raw);
    this.setGeneratorStatus("ai-task-status", "Code saved.", "success");
  }

  buildRoadmapPromptSpec(topic) {
    const roadmapJson = this.buildGeneratedRoadmap(topic);
    return `You are helping me create a study roadmap for "${topic}".

Return ONLY valid JSON.
Do not wrap the answer in markdown.
Do not add explanations before or after the JSON.

Use this exact structure:
{
  "modules": [
    {
      "module": "MODULE NAME",
      "days": [
        { "day": 1, "topic": "Topic name", "status": "active" },
        { "day": 2, "topic": "Topic name", "status": "locked" }
      ]
    }
  ]
}

Rules:
1. Day numbers must continue sequentially across all modules.
2. Only the very first day can have "status": "active".
3. Every other day must have "status": "locked".
4. Create 4 modules.
5. Create 3 days per module.
6. Keep module names uppercase and concise.
7. Keep each topic practical and specific.
8. Output JSON only.

Reference example:
${JSON.stringify(roadmapJson, null, 2)}`;
  }

  buildTaskPromptSpec(topic) {
    return `You are helping me create a daily scheduler code block for "${topic}".

Return ONLY code.
Do not use markdown.
Do not explain anything.
Do not add comments.

You must return the final answer in this exact shape:
return [
  makeTask("TITLE", "FOCUS", [startHour, endHour], "HIGH", "STRICT", 120, "Morning", false, 10),
  makeTask("TITLE", "FOCUS", [startHour, endHour], "MEDIUM", "FLEXIBLE", 60, "Evening", true, 3)
];

Rules:
1. Use only makeTask(...) lines inside one return array.
2. Keep tasks in chronological order.
3. Use decimal hours like 6.25 for 6:15 and 8.5 for 8:30.
4. Duration must be in minutes.
5. Priority must be one of "HIGH", "MEDIUM", "LOW".
6. Discipline type must be one of "STRICT", "FLEXIBLE".
7. Phase must be one of "Morning", "Core Study", "Breaks", "Evening".
8. Optional flag must be true or false.
9. Score must be an integer.
10. Output only the code block, nothing else.

Use this exact style reference:
return [
  makeTask("IB CORE", "CA + Reasoning + Quant", [4, 6.25], "HIGH", "STRICT", 135, "Morning", false, 17),
  makeTask("ANALOG SET 1", analog1Topic, [6.25, 8.25], "HIGH", "STRICT", 120, "Core Study", false, 11),
  makeTask("BREAK", "Break + Hydration", [8.25, 8.5], "LOW", "FLEXIBLE", 15, "Breaks", true, 1),
  makeTask("ANALOG SET 2", analog2Topic, [8.5, 10.5], "HIGH", "STRICT", 120, "Core Study", false, 11),
  makeTask("IB PRACTICE", "IB Practice", [10.5, 12], "MEDIUM", "FLEXIBLE", 90, "Morning", false, 14),
  makeTask("LUNCH", "Lunch", [12, 12.5], "LOW", "FLEXIBLE", 30, "Breaks", true, 1),
  makeTask("BUILD", "Project / Circuits", [12.5, 14.5], "MEDIUM", "FLEXIBLE", 120, "Core Study", false, 10),
  makeTask("ANALOG SET 3", analog3Topic, [14.5, 16.5], "HIGH", "STRICT", 120, "Core Study", false, 11),
  makeTask("IB REVISION", "IB Revision", [16.5, 17.5], "MEDIUM", "FLEXIBLE", 60, "Evening", false, 5),
  makeTask("ANALOG REVISION", analogRevisionTopic, [17.5, 18.5], "MEDIUM", "FLEXIBLE", 60, "Evening", false, 5),
  makeTask("DINNER", "Dinner", [18.5, 19], "LOW", "FLEXIBLE", 30, "Breaks", true, 1),
  makeTask("WEAK AREA REVIEW", "Weak-area review", [19, 20], "LOW", "FLEXIBLE", 60, "Evening", true, 4),
  makeTask("TRAINING", "Training", [20, 21], "MEDIUM", "FLEXIBLE", 60, "Evening", true, 3),
  makeTask("FINAL REVISION", "Final revision / recap", [21, 22], "MEDIUM", "FLEXIBLE", 60, "Evening", false, 3),
  makeTask("WIND DOWN", "Wind down", [22, 23], "LOW", "FLEXIBLE", 60, "Evening", true, 1),
  makeTask("REST", "Sleep", [23, 28], "HIGH", "STRICT", 300, "Evening", true, 2),
];

Now create a new schedule for this topic set:
${topic}`;
  }

  generateAIRoadmap() {
    const topicEl = this.app.elements["ai-roadmap-topic"];
    const topic = topicEl?.value.trim();

    if (!topic) {
      this.setGeneratorStatus(
        "ai-roadmap-status",
        "Enter a roadmap topic first.",
        "error",
      );
      return;
    }

    this.setGeneratorOutput(
      "ai-roadmap-output",
      this.buildRoadmapPromptSpec(topic),
    );
    this.setGeneratorStatus(
      "ai-roadmap-status",
      "Prompt ready.",
      "success",
    );
  }

  generateTaskPrompt() {
    const topicEl = this.app.elements["ai-task-topic"];
    const topic = topicEl?.value.trim();

    if (!topic) {
      this.setGeneratorStatus(
        "ai-task-status",
        "Enter your task/topic set first.",
        "error",
      );
      return;
    }

    this.setGeneratorOutput(
      "ai-task-output",
      this.buildTaskPromptSpec(topic),
    );
    this.setGeneratorStatus(
      "ai-task-status",
      "Prompt ready.",
      "success",
    );
  }

  renderRoadmap() {
    this.ensureRoadmap();
    const overview = this.app.elements["trainer-overview"];
    const content = this.app.elements["trainer-content"];
    if (!overview || !content) return;

    if (!this.state.roadmap || !this.state.roadmap.modules || this.state.roadmap.modules.length === 0) {
      overview.innerHTML = ``;
      content.innerHTML = `
               <div style="text-align: center; padding: 40px 20px;">
                 <h3 style="color: var(--text-accent); margin-bottom: 12px;">Roadmap not generated yet</h3>
                 <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 0.95rem;">Use the helpers above to generate copy-ready roadmap JSON prompts and exact makeTask code prompts.</p>
               </div>
             `;
      return;
    }

    const { moduleIndex, activeModule } = this.getRoadmapProgress();
    const completedModules = this.state.roadmap.modules.filter((m) =>
      m.days.every((d) => d.completed),
    ).length;
    overview.innerHTML = `
          <div class="trainer-overview-card"><div class="trainer-overview-label">Active Module</div><div class="trainer-overview-value">${this.escapeHtml(activeModule?.name || "Completed")}</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Modules Complete</div><div class="trainer-overview-value">${completedModules}/${this.state.roadmap.modules.length}</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Unlocked Module</div><div class="trainer-overview-value">${moduleIndex + 1}</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Edit Mode</div><div class="trainer-overview-value">${this.state.roadmap.editMode ? "ON" : "OFF"}</div></div>
        `;

    let html = "";
    this.state.roadmap.modules.forEach((mod, mi) => {
      const unlocked = mi <= moduleIndex;
      const done = mod.days.every((d) => d.completed);
      const moduleTitle = this.state.roadmap.editMode
        ? `<input class="roadmap-module-edit" data-module="${mi}" value="${this.escapeHtml(mod.name)}"/>`
        : this.escapeHtml(mod.name);
      html += `<section class="trainer-section"><div class="trainer-section-title">${moduleTitle}${done ? " [DONE]" : ""}</div>`;
      mod.days.forEach((day, di) => {
        const dayUnlocked =
          unlocked && (di === 0 || mod.days[di - 1].completed);
        const disabled = dayUnlocked ? "" : "disabled";
        const checked = day.completed ? "checked" : "";
        const stateIcon = day.completed ? "[DONE]" : dayUnlocked ? "[OPEN]" : "[LOCKED]";
        const stateLabel = day.completed
          ? "Completed"
          : dayUnlocked
            ? "Active"
            : "Locked";
        if (this.state.roadmap.editMode) {
          html += `<div class="trainer-row"><div class="trainer-key">${day.day} ${stateIcon}</div><div class="trainer-val"><textarea data-module="${mi}" data-day="${di}" class="roadmap-edit">${this.escapeHtml(day.text)}</textarea></div><label><input type="checkbox" data-module="${mi}" data-day="${di}" class="roadmap-check" ${checked} ${disabled}/> ${stateLabel}</label></div>`;
        } else {
          html += `<div class="trainer-row"><div class="trainer-key">${day.day} ${stateIcon}</div><div class="trainer-val">${this.escapeHtml(day.text)}</div><label><input type="checkbox" data-module="${mi}" data-day="${di}" class="roadmap-check" ${checked} ${disabled}/> ${stateLabel}</label></div>`;
        }
      });
      html += `</section>`;
    });
    content.innerHTML = html;

    content.querySelectorAll(".roadmap-check").forEach((cb) =>
      cb.addEventListener("change", (e) => {
        const m = Number(e.target.getAttribute("data-module"));
        const d = Number(e.target.getAttribute("data-day"));
        const day = this.state.roadmap.modules[m]?.days[d];
        if (!day) return;
        day.completed = !!e.target.checked;
        this.app.saveToStorage(
          CONFIG.STORAGE_KEYS.ROADMAP_STATE,
          this.state.roadmap,
        );
        this.renderRoadmap();
        this.syncMissionFromRoadmap();
        this.updatePenaltyTimer();
        this.app.shadowEngine?.refresh(false);
      }),
    );

    if (this.state.roadmap.editMode) {
      content.querySelectorAll(".roadmap-module-edit").forEach((inp) =>
        inp.addEventListener("change", (e) => {
          const m = Number(e.target.getAttribute("data-module"));
          if (this.state.roadmap.modules[m])
            this.state.roadmap.modules[m].name =
              e.target.value.trim() || this.state.roadmap.modules[m].name;
        }),
      );

      content.querySelectorAll(".roadmap-edit").forEach((area) =>
        area.addEventListener("change", (e) => {
          const m = Number(e.target.getAttribute("data-module"));
          const d = Number(e.target.getAttribute("data-day"));
          const day = this.state.roadmap.modules[m]?.days[d];
          if (!day) return;
          day.text = e.target.value.trim() || day.text;
        }),
      );
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Â§8  Phase 6 â€” Full 7-Step Daily Sequence Pipeline
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  // Step 1: read today's raw data
  readTodayData() {
    const today = this.app.getDateString(new Date());
    const tasks = this.app.state.tasks.filter(t => t.date === today);
    const sleepTasks = tasks.filter(t => t.category === "Sleep");
    const prodTasks = tasks.filter(t => this.app.isProductiveCategory(t.category));
    const totalSleep = sleepTasks.reduce((s, t) => s + t.duration, 0);
    const totalProd = prodTasks.reduce((s, t) => s + t.duration, 0);
    const latestWake = sleepTasks.length
      ? Math.max(...sleepTasks.map(t => t.endTime))
      : null;
    return { today, tasks, totalSleep, totalProd, latestWake };
  }

  // Step 2: analyze behavior (skips, delays, completion ratio)
  analyzeBehavior(todayData) {
    const shadow = Math.max(1, this.app.shadowEngine?.shadowSevenDayAverage || 120);
    const completionRatio = todayData.totalProd / shadow;
    const skipCount = todayData.tasks.filter(t =>
      t.category !== "Sleep" && t.duration === 0
    ).length;
    // check if user woke late vs adaptive schedule
    const schedState = this.app.shadowEngine?.computeAdaptiveSchedule();
    let wakeDelayMins = 0;
    if (todayData.latestWake && schedState) {
      const targetWakeMs = new Date().setHours(schedState.wakeHour, 0, 0, 0);
      wakeDelayMins = Math.max(0, Math.round((todayData.latestWake - targetWakeMs) / 60000));
    }
    return { completionRatio, skipCount, wakeDelayMins, schedState };
  }

  // Step 3: detect behavioral state (delegates to ShadowEngine)
  detectStateForSequence() {
    return this.app.shadowEngine?.detectBehavioralState() || "STABLE";
  }

  // Step 4: apply corrections (load multiplier + schedule shift)
  applyCorrection(state) {
    const sleepMultiplier = this.app.shadowEngine?.getTodayLoadMultiplier() || 1.0;
    const loadMultipliers = { RECOVERY: 0.8, STABLE: 1.0, GROWTH: 1.05 };
    const stateMultiplier = loadMultipliers[state] || 1.0;
    const effectiveLoad = sleepMultiplier * stateMultiplier;
    return { effectiveLoad, sleepMultiplier, stateMultiplier };
  }

  // Step 5: generate missions â€” adjusts threshold based on load
  generateMissions(effectiveLoad) {
    const missionTasks = this.getDailyMissionTasks();
    return missionTasks.map(task => ({
      ...task,
      adjustedThreshold: Math.max(
        15,
        this.getThresholdForTopic(task.topic) * effectiveLoad
      ),
    }));
  }

  // Step 6: apply strict / flexible / sleep rules (Â§9, Â§10)
  applyRules(missions, behaviorData) {
    const compromisesLeft = CONFIG.MAX_SLEEP_COMPROMISES_PER_7_DAYS -
      (this.app.shadowEngine?.countSleepCompromisesLast7() || 0);
    // Â§11 anti-misuse: track how many missions used full 1.5x buffer
    return missions.map(m => {
      const progress = this.getTopicProgress(m.topic);
      const ratio = progress.minutes / Math.max(1, m.adjustedThreshold);
      // Â§9: strict tasks: delay >5 min = failure signal
      const isStrict = m.discipline_type === "STRICT";
      const strictFail = isStrict && behaviorData.wakeDelayMins > 5;
      // Â§11: detect flexibility abuse (ratio < 0.7 by buffer window end)
      const abused = !isStrict && ratio < CONFIG.EFFORT_SUCCESS_THRESHOLD;
      return { ...m, progress, ratio, strictFail, abused, compromisesLeft };
    });
  }

  // Step 7: produce the final mission plan object
  outputPlan(missions, state, correction, todayData) {
    return {
      state,
      effectiveLoad: correction.effectiveLoad,
      sleepStatus: {
        totalSleep: todayData.totalSleep,
        belowMin: todayData.totalSleep > 0 && todayData.totalSleep < CONFIG.MIN_SLEEP_MINUTES,
        compromisesAllowed: this.app.shadowEngine?.sleepCompromiseAllowed() ?? true,
      },
      missions,
      generatedAt: Date.now(),
    };
  }

  // Full pipeline â€” run once per day (Â§17: separated from UI re-renders)
  runDailySequence() {
    const today = this.app.getDateString(new Date());
    // Â§17: skip if already ran today
    if (this._lastSequenceDate === today) return this._lastPlan || null;

    const todayData = this.readTodayData();                          // Step 1
    const behaviorData = this.analyzeBehavior(todayData);               // Step 2
    const state = this.detectStateForSequence();                 // Step 3
    const correction = this.applyCorrection(state);                   // Step 4
    const rawMissions = this.generateMissions(correction.effectiveLoad); // Step 5
    const finalMissions = this.applyRules(rawMissions, behaviorData);    // Step 6
    const plan = this.outputPlan(finalMissions, state, correction, todayData); // Step 7

    this._lastSequenceDate = today;
    this._lastPlan = plan;

    // Â§11 Phase 7: anti-misuse â€” count abused flexible tasks
    this.state.flexAbuseDays = this.state.flexAbuseDays || 0;
    const abuseCount = finalMissions.filter(m => m.abused && !m.isStrict).length;
    if (abuseCount > 0) {
      this.state.flexAbuseDays += 1;
    } else {
      this.state.flexAbuseDays = Math.max(0, this.state.flexAbuseDays - 1);
    }
    // Â§11: if abused 3+ days, tighten flexible multiplier
    if (this.state.flexAbuseDays >= 3) {
      // reduce buffer: approaching strict (1.0x instead of 1.5x)
      const tighter = Math.max(1.0, CONFIG.FLEXIBLE_TASK_MULTIPLIER - 0.1 * this.state.flexAbuseDays);
      this.state.antiMisuseMult = tighter;
    } else {
      this.state.antiMisuseMult = CONFIG.FLEXIBLE_TASK_MULTIPLIER;
    }
    this.saveTrainerState();

    return plan;
  }

  refresh() {
    this.ensureRoadmap();
    this.renderRoadmap();
    this.syncMissionFromRoadmap();
    this.updatePenaltyTimer();
    // Â§8/Â§17: run full pipeline once per calendar day, not on every render
    this.runDailySequence();
  }

  showWindow() {
    this.hydrateGeneratorDrafts();
    this.refresh();
    this.app.uiManager?.renderSleepJournal?.();
    this.app.elements["trainer-modal"].style.display = "flex";
  }

  copyPlan() {
    this.ensureRoadmap();
    this.app.saveToStorage(
      CONFIG.STORAGE_KEYS.ROADMAP_STATE,
      this.state.roadmap,
    );
  }

  hideWindow() {
    this.app.elements["trainer-modal"].style.display = "none";
  }
}

class FlowProtocolEngine {
  constructor(app) {
    this.app = app;
    this.state = this.app.loadFromStorage(
      CONFIG.STORAGE_KEYS.FLOW_PROTOCOL,
    ) || { byDate: {} };
    this.killTimer = null;
  }

  initialize() {
    this.ensureTodayRecord();
    this.refresh();
  }

  save() {
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.FLOW_PROTOCOL, this.state);
  }

  ensureTodayRecord() {
    const today = this.app.getDateString(new Date());
    if (!this.state.byDate[today]) {
      this.state.byDate[today] = {
        flowBeforePhone: false,
        wakeAt: null,
        firstActionAt: null,
        attentionStretchMin: 0,
        warMode: {
          cold_shower: false,
          pushups: false,
          deep_work_30: false,
          speak_up: false,
          wake_before_sun: false,
        },
      };
      this.save();
    }
    return this.state.byDate[today];
  }

  getTodayRecord() {
    return this.ensureTodayRecord();
  }

  markWakeNow() {
    const r = this.getTodayRecord();
    r.wakeAt = Date.now();
    this.save();
    this.refresh();
  }

  markFirstActionNow() {
    const r = this.getTodayRecord();
    const now = Date.now();
    if (!r.wakeAt) r.wakeAt = now;
    r.firstActionAt = now;
    this.save();
    this.refresh();
  }

  toggleFlowBeforePhone(checked) {
    const r = this.getTodayRecord();
    r.flowBeforePhone = !!checked;
    this.save();
    this.refresh();
  }

  incrementAttentionStretch() {
    const r = this.getTodayRecord();
    r.attentionStretchMin = Math.min(
      180,
      (r.attentionStretchMin || 0) + 1,
    );
    this.save();
    this.refresh();
  }

  decrementAttentionStretch() {
    const r = this.getTodayRecord();
    r.attentionStretchMin = Math.max(0, (r.attentionStretchMin || 0) - 1);
    this.save();
    this.refresh();
  }

  toggleWarMode(key, checked) {
    const r = this.getTodayRecord();
    if (!r.warMode) r.warMode = {};
    r.warMode[key] = !!checked;
    this.save();
    this.refresh();
  }

  getWarScore() {
    const r = this.getTodayRecord();
    const vals = Object.values(r.warMode || {});
    const done = vals.filter(Boolean).length;
    return { done, total: vals.length || 5 };
  }

  getFlowCycleStatus() {
    if (!this.app.stopwatch?.isRunning) return "Recovery / Reset";
    const elapsedMin = Math.max(
      0,
      Math.round(
        (Date.now() - (this.app.stopwatch.startTime || Date.now())) /
        60000,
      ),
    );
    if (elapsedMin < 10) return "Struggle phase (persist)";
    if (elapsedMin < 15) return "Release phase";
    if (elapsedMin < 90) return "Flow phase";
    return "Recovery needed";
  }

  getBlockersStatus() {
    const today = this.app.getDateString(new Date());
    const untracked = this.app.getInferredWasteMinutesForDate(
      today,
      this.app.state.tasks,
    );
    if (untracked >= 240) return "High blockers";
    if (untracked >= 90) return "Moderate blockers";
    return "Low blockers";
  }

  getPronenessStatus() {
    const r = this.getTodayRecord();
    if (r.wakeAt && r.firstActionAt) {
      const delta = Math.round((r.firstActionAt - r.wakeAt) / 60000);
      if (delta < 0)
        return "Invalid timing detected (re-log wake/first action)";
      if (delta <= 90) return `High (${delta}m from wake)`;
      return `Medium (${delta}m from wake)`;
    }
    return "Set wake + first action";
  }

  getTriggersStatus() {
    const goalProgress =
      this.app.shadowEngine?.getTodayGoalProgress?.() || {};
    const missionScore =
      this.app.shadowEngine?.calculateMissionScore?.(goalProgress) || 0;
    if (missionScore >= 80) return "Strong (clear goals active)";
    if (missionScore >= 50) return "Moderate (add challenge +4%)";
    return "Weak (define clear goal + feedback)";
  }

  getActionSteps() {
    const r = this.getTodayRecord();
    const steps = [];
    if (!r.wakeAt)
      steps.push(
        "Log wake time now, then start first focused action within 90 minutes.",
      );
    if (r.wakeAt && !r.firstActionAt)
      steps.push(
        "Press First Action when your first meaningful work block starts.",
      );
    if (!r.flowBeforePhone)
      steps.push(
        "Complete one 120+ minute priority block before phone exposure.",
      );
    if ((r.attentionStretchMin || 0) < 10)
      steps.push(
        "Add attention stretch reps until you hit at least 10 minutes today.",
      );
    const war = this.getWarScore();
    if (war.done < 3)
      steps.push(
        `Complete at least ${3 - war.done} more war-mode ritual(s) to hit minimum daily pressure training.`,
      );
    const triggers = this.getTriggersStatus();
    if (triggers.startsWith("Weak"))
      steps.push(
        "Define one clear output for current block and set immediate feedback checkpoint at 25 minutes.",
      );
    if (!steps.length)
      steps.push(
        "Protocol green: run next deep-work block at +4% difficulty and protect recovery after 90 minutes.",
      );
    return steps.slice(0, 5);
  }

  async runKillSwitch() {
    if (this.app.stopwatch?.isRunning) {
      alert("Stop current task first to run Kill Switch.");
      return;
    }
    const el = this.app.elements["kill-switch-countdown"];
    if (!el) return;
    const seq = ["3", "2", "1", "MOVE"];
    let i = 0;
    if (this.killTimer) clearInterval(this.killTimer);
    el.textContent = seq[0];
    this.killTimer = setInterval(() => {
      i += 1;
      if (i >= seq.length) {
        clearInterval(this.killTimer);
        this.killTimer = null;
        this.markFirstActionNow();
        this.app.stopwatch.start("Kill Switch Deep Work", {
          category: "Productive Work",
          subcategory: "Execution",
          description: "3-second kill switch deep work block",
        });
        el.textContent = "Deep work started";
        return;
      }
      el.textContent = seq[i];
    }, 700);
  }

  refresh() {
    const r = this.getTodayRecord();
    const blockersEl = this.app.elements["flow-blockers-status"];
    const pronenessEl = this.app.elements["flow-proneness-status"];
    const triggersEl = this.app.elements["flow-triggers-status"];
    const cycleEl = this.app.elements["flow-cycle-status"];
    const stretchEl = this.app.elements["attention-stretch-value"];
    const warScoreEl = this.app.elements["war-score"];
    const flowBeforeEl = this.app.elements["flow-before-phone-check"];
    const stepsEl = this.app.elements["flow-action-steps"];
    if (blockersEl) blockersEl.textContent = this.getBlockersStatus();
    if (pronenessEl) pronenessEl.textContent = this.getPronenessStatus();
    if (triggersEl) triggersEl.textContent = this.getTriggersStatus();
    if (cycleEl) cycleEl.textContent = this.getFlowCycleStatus();
    if (stretchEl)
      stretchEl.textContent = `${r.attentionStretchMin || 0} min`;
    const ws = this.getWarScore();
    if (warScoreEl) warScoreEl.textContent = `${ws.done}/${ws.total}`;
    if (flowBeforeEl) flowBeforeEl.checked = !!r.flowBeforePhone;
    if (stepsEl)
      stepsEl.innerHTML = this.getActionSteps()
        .map((step) => `<li>${step}</li>`)
        .join("");

    document.querySelectorAll(".war-mode-check").forEach((cb) => {
      const key = cb.getAttribute("data-key");
      cb.checked = !!(r.warMode && r.warMode[key]);
    });
  }
}

class GraphManager {
  constructor(app) {
    this.app = app;
    this.charts = { productivity: null, sleep: null };
    this.totalCounterAnimation = null;
    this.lastFilteredTotalMinutes = 0;
  }
  initialize() {
    if (!window.Chart) return;
    this.createCharts();
    this.applyProductivityChartViewport(
      this.app.elements["prod-range"]?.value || "7d",
    );
    this.setupChartControls();
    this.lastFilteredTotalMinutes = this.getCurrentFilteredTotalMinutes();
    this.animateFilteredTotal(0, this.lastFilteredTotalMinutes);
    this.updateGraphKpis();
    this.renderGithubHeatmap();
  }

  getRangeDates(range) {
    const today = new Date();
    if (range === "weekly") {
      return this.buildTrailingDateRange(84, today);
    }
    if (range === "15davg") {
      return this.buildTrailingDateRange(180, today);
    }
    if (range === "monthlyavg") {
      const start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      return this.buildDateRange(start, today);
    }
    return this.buildTrailingDateRange(CONFIG.CHART_RANGES[range] || 7, today);
  }

  buildTrailingDateRange(days, endDate = new Date()) {
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(endDate.getDate() - i);
      dates.push(this.app.getDateString(d));
    }
    return dates;
  }

  buildDateRange(startDate, endDate) {
    const dates = [];
    for (
      const cursor = new Date(startDate);
      cursor <= endDate;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      dates.push(this.app.getDateString(cursor));
    }
    return dates;
  }

  updateGraphKpis() {
    const range = this.app.elements["prod-range"].value;
    const filter = this.getCurrentFilter();
    const rangeDates = this.getRangeDates(range);
    const dateSet = new Set(rangeDates);

    const productivity = this.app.state.tasks
      .filter(
        (t) =>
          dateSet.has(t.date) &&
          this.passesProductivityFilter(t, filter),
      )
      .reduce((sum, t) => sum + t.duration, 0);

    const loggedDistraction = this.app.state.tasks
      .filter(
        (t) =>
          dateSet.has(t.date) &&
          (t.category === "Time Waste / Distraction" ||
            t.graph_tag === "distraction"),
      )
      .reduce((sum, t) => sum + t.duration, 0);

    const untrackedDistraction = rangeDates.reduce((sum, dateStr) => {
      return (
        sum +
        this.app.getInferredWasteMinutesForDate(
          dateStr,
          this.app.state.tasks,
        )
      );
    }, 0);

    const totalDistraction = loggedDistraction + untrackedDistraction;

    this.app.elements["graph-productivity-total"].textContent =
      this.app.formatDuration(productivity);
    this.app.elements["graph-total-distraction"].textContent =
      this.app.formatDuration(totalDistraction);
    this.app.elements["graph-logged-distraction"].textContent =
      this.app.formatDuration(loggedDistraction);
  }

  getCurrentFilter() {
    return this.app.elements["prod-filter"]?.value || "productivity";
  }

  passesProductivityFilter(task, filter) {
    if (task.category === "Sleep") return false;
    const tag = task.graph_tag || "neutral";
    if (filter === "productivity") return tag === "productivity";
    if (filter === "logged_distraction")
      return (
        tag === "distraction" ||
        task.category === "Time Waste / Distraction"
      );
    if (filter === "total_distraction")
      return (
        tag === "distraction" ||
        task.category === "Time Waste / Distraction"
      );
    return true;
  }

  getFilteredMinutesForDate(dateStr, filter = "productivity") {
    return this.app.state.tasks
      .filter(
        (t) =>
          t.date === dateStr &&
          this.passesProductivityFilter(t, filter),
      )
      .reduce((sum, t) => sum + t.duration, 0);
  }

  getColorScheme() {
    return {
      border: "rgb(40, 180, 99)",
      fill: "rgba(40, 180, 99, 0.16)",
    };
  }

  createCharts() {
    const prodCtx =
      this.app.elements["productivity-chart"].getContext("2d");
    const initialRange = this.app.elements["prod-range"]?.value || "7d";
    this.charts.productivity = new Chart(prodCtx, {
      type: "line",
      data: this.getProductivityData(
        initialRange,
        this.getCurrentFilter(),
      ),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 420, easing: "easeOutCubic" },
        transitions: {
          active: { animation: { duration: 320 } },
          resize: { animation: { duration: 320 } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            mode: "nearest",
            intersect: false,
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: ${this.formatHoursForTooltip(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              autoSkip: true,
              maxTicksLimit: 8,
              maxRotation: 0,
              minRotation: 0,
            },
          },
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => this.formatHoursForTooltip(v) },
          },
        },
        interaction: { mode: "nearest", intersect: false, axis: "x" },
        elements: {
          point: {
            radius: 0,
            hoverRadius: 0,
            pointStyle: "circle",
            hoverBorderWidth: 2,
          },
          line: { tension: 0.34, borderWidth: 2.5 },
        },
      },
    });

    const sleepCtx = this.app.elements["sleep-chart"].getContext("2d");
    this.charts.sleep = new Chart(sleepCtx, {
      type: "bar",
      data: this.getSleepData("7d"),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 380, easing: "easeOutQuad" },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: ${this.formatHoursForTooltip(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 12,
            ticks: { callback: (v) => this.formatHoursForTooltip(v) },
          },
        },
      },
    });
  }

  getProductivityData(range = "7d", filter = "productivity") {
    const activeFilter = filter || "productivity";
    const data = [];
    const labels = [];
    let shadowData = [];
    if (range === "weekly") {
      const buckets = this.buildFixedAverageBuckets({
        bucketDays: 7,
        bucketCount: 12,
        filter: activeFilter,
        labelMode: "week-end",
      });
      buckets.forEach((bucket) => {
        labels.push(bucket.label);
        data.push(bucket.value);
        shadowData.push(bucket.shadow);
      });
    } else if (range === "15davg") {
      const buckets = this.buildFixedAverageBuckets({
        bucketDays: 15,
        bucketCount: 12,
        filter: activeFilter,
        labelMode: "range",
      });
      buckets.forEach((bucket) => {
        labels.push(bucket.label);
        data.push(bucket.value);
        shadowData.push(bucket.shadow);
      });
    } else if (range === "monthlyavg") {
      const buckets = this.buildMonthlyAverageBuckets(12, activeFilter);
      buckets.forEach((bucket) => {
        labels.push(bucket.label);
        data.push(bucket.value);
        shadowData.push(bucket.shadow);
      });
    } else {
      const today = new Date();
      const rangeDates = [];
      const days = CONFIG.CHART_RANGES[range] || 7;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const ds = this.app.getDateString(d);
        const mins = this.getFilteredMinutesForDate(ds, activeFilter);
        labels.push(
          d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        );
        rangeDates.push(ds);
        data.push(parseFloat((mins / 60).toFixed(2)));
      }
      shadowData = this.buildShadowSeries(rangeDates, range);
    }

    const colors = this.getColorScheme();
    const isLongRange = range === "1y";
    return {
      labels,
      datasets: [
        {
          label: "Productivity",
          data,
          borderColor: colors.border,
          backgroundColor: colors.fill,
          pointBackgroundColor: colors.border,
          pointRadius: 0,
          pointHoverRadius: 0,
          pointBorderColor: colors.border,
          borderWidth: isLongRange ? 2 : 2.5,
          tension: isLongRange ? 0.22 : 0.34,
          fill: true,
        },
        {
          label: "Shadow",
          data: shadowData,
          borderColor: "rgb(0, 140, 255)",
          backgroundColor: "rgba(0, 140, 255, 0.14)",
          pointBackgroundColor: "rgb(0, 140, 255)",
          pointRadius: 0,
          pointHoverRadius: 0,
          pointBorderColor: "rgb(0, 140, 255)",
          borderWidth: isLongRange ? 1.8 : 2,
          tension: isLongRange ? 0.14 : 0.2,
          fill: false,
          borderDash: [7, 5],
        },
      ],
    };
  }

  getSleepData(range = "7d") {
    const days = CONFIG.CHART_RANGES[range] || 7,
      data = [],
      labels = [],
      today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = this.app.getDateString(d);
      const mins = this.app.state.tasks
        .filter((t) => t.date === ds && t.category === "Sleep")
        .reduce((a, t) => a + t.duration, 0);
      labels.push(
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      );
      data.push(parseFloat((mins / 60).toFixed(1)));
    }
    return {
      labels,
      datasets: [
        {
          label: "Sleep Hours",
          data,
          backgroundColor: "rgba(111, 66, 193, 0.7)",
          borderColor: "rgb(111,66,193)",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }

  formatHoursForTooltip(hours = 0) {
    const safe = Math.max(0, Number(hours) || 0);
    const minutes = Math.round(safe * 60);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${String(m).padStart(2, "0")}`;
  }

  buildFixedAverageBuckets({
    bucketDays,
    bucketCount,
    filter = "productivity",
    labelMode = "range",
  }) {
    const today = new Date();
    const firstBucketStart = new Date(today);
    firstBucketStart.setDate(today.getDate() - (bucketCount * bucketDays - 1));
    const thresholdMap = this.app.shadowEngine?.getHistoricalShadowThresholdMap(
      this.app.getDateString(firstBucketStart),
      this.app.getDateString(today),
    );
    const firstProductiveDate = this.getFirstProductiveDate();
    const fallbackShadowMinutes = Math.max(
      0,
      Number(this.app.shadowEngine?.shadowSevenDayAverage || 0),
    );

    const buckets = [];
    for (let i = bucketCount - 1; i >= 0; i--) {
      const endDate = new Date(today);
      endDate.setDate(today.getDate() - i * bucketDays);
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - (bucketDays - 1));
      const dates = this.buildDateRange(startDate, endDate);
      const average = this.buildAverageBucketMetrics(
        dates,
        filter,
        thresholdMap,
        firstProductiveDate,
        fallbackShadowMinutes,
      );

      let label = this.formatDateLabel(endDate);
      if (labelMode === "range") {
        label = this.formatDateSpanLabel(startDate, endDate);
      }

      buckets.push({
        label,
        value: average.value,
        shadow: average.shadow,
      });
    }
    return buckets;
  }

  buildMonthlyAverageBuckets(monthCount = 12, filter = "productivity") {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - (monthCount - 1), 1);
    const thresholdMap = this.app.shadowEngine?.getHistoricalShadowThresholdMap(
      this.app.getDateString(start),
      this.app.getDateString(today),
    );
    const firstProductiveDate = this.getFirstProductiveDate();
    const fallbackShadowMinutes = Math.max(
      0,
      Number(this.app.shadowEngine?.shadowSevenDayAverage || 0),
    );

    const buckets = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd =
        i === 0
          ? new Date(today)
          : new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      const dates = this.buildDateRange(monthStart, monthEnd);
      const average = this.buildAverageBucketMetrics(
        dates,
        filter,
        thresholdMap,
        firstProductiveDate,
        fallbackShadowMinutes,
      );
      buckets.push({
        label: monthEnd.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        value: average.value,
        shadow: average.shadow,
      });
    }
    return buckets;
  }

  buildAverageBucketMetrics(
    dates,
    filter,
    thresholdMap,
    firstProductiveDate,
    fallbackShadowMinutes = 0,
  ) {
    if (!dates.length) return { value: 0, shadow: 0 };

    const minutesTotal = dates.reduce(
      (sum, dateStr) => sum + this.getFilteredMinutesForDate(dateStr, filter),
      0,
    );
    const hasAnyShadowHistory = dates.some(
      (dateStr) =>
        !this.isBeforeFirstProductiveDate(dateStr, firstProductiveDate),
    );
    const shadowTotal = dates.reduce(
      (sum, dateStr) =>
        sum +
        (this.isBeforeFirstProductiveDate(dateStr, firstProductiveDate)
          ? 0
          : (thresholdMap?.get(dateStr) || 0)),
      0,
    );

    return {
      value: parseFloat((minutesTotal / dates.length / 60).toFixed(2)),
      shadow: parseFloat(
        (
          (
            hasAnyShadowHistory
              ? (shadowTotal > 0 ? shadowTotal : fallbackShadowMinutes * dates.length)
              : 0
          ) /
          dates.length /
          60
        ).toFixed(2),
      ),
    };
  }

  formatDateLabel(date) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  formatDateSpanLabel(startDate, endDate) {
    const sameMonth =
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getFullYear() === endDate.getFullYear();
    if (sameMonth) {
      return `${startDate.toLocaleDateString("en-US", { month: "short" })} ${startDate.getDate()}-${endDate.getDate()}`;
    }
    return `${this.formatDateLabel(startDate)}-${this.formatDateLabel(endDate)}`;
  }

  applyProductivityChartViewport(range = "7d") {
    const container = document.getElementById("productivity-chart-container");
    const track = document.getElementById("productivity-chart-track");
    if (!container || !track) return;

    const isLongRange = range === "1y";
    const baseWidth = Math.max(container.clientWidth || 0, 320);
    const pointCount = range === "weekly" ? 12 : (CONFIG.CHART_RANGES[range] || 7);
    const visiblePointCount = range === "1y" ? 31 : pointCount;
    const pixelsPerPoint = isLongRange
      ? Math.max(10, Math.round(baseWidth / visiblePointCount))
      : 0;
    const targetWidth = isLongRange
      ? Math.max(baseWidth, Math.round(pointCount * pixelsPerPoint))
      : baseWidth;

    container.dataset.scrollable = isLongRange ? "true" : "false";
    track.style.width = `${targetWidth}px`;

    requestAnimationFrame(() => {
      this.charts.productivity?.resize();
      container.scrollLeft = isLongRange
        ? Math.max(0, container.scrollWidth - container.clientWidth)
        : 0;
    });
  }

  buildShadowSeries(rangeDates, range = "7d") {
    if (!rangeDates.length) return [];
    const firstProductiveDate = this.getFirstProductiveDate();
    if (!firstProductiveDate) {
      return Array.from({ length: rangeDates.length }, () => 0);
    }

    const firstDate = new Date(`${rangeDates[0]}T12:00:00`);
    const thresholdStartDate = new Date(firstDate);
    if (range === "weekly") {
      thresholdStartDate.setDate(thresholdStartDate.getDate() - 6);
    }

    const thresholdMap = this.app.shadowEngine?.getHistoricalShadowThresholdMap(
      this.app.getDateString(thresholdStartDate),
      rangeDates[rangeDates.length - 1],
    );

    const fallback = parseFloat(
      (
        Math.max(0, Number(this.app.shadowEngine?.shadowSevenDayAverage || 0)) /
        60
      ).toFixed(2),
    );

    const shadowHours = rangeDates.map((dateStr) => {
      if (this.isBeforeFirstProductiveDate(dateStr, firstProductiveDate)) {
        return 0;
      }
      if (!thresholdMap) return fallback;

      if (range === "weekly") {
        const date = new Date(`${dateStr}T12:00:00`);
        let total = 0;
        for (let i = 0; i < 7; i++) {
          const d = new Date(date);
          d.setDate(date.getDate() - i);
          const key = this.app.getDateString(d);
          total += this.isBeforeFirstProductiveDate(key, firstProductiveDate)
            ? 0
            : (thresholdMap.get(key) || 0);
        }
        return parseFloat((total / 7 / 60).toFixed(2));
      }

      return parseFloat((((thresholdMap.get(dateStr) || 0) / 60)).toFixed(2));
    });

    return shadowHours;
  }

  getFirstProductiveDate() {
    const dailyMap = this.app.shadowEngine?.getDailyProductiveMap?.() || new Map();
    return [...dailyMap.keys()].sort()[0] || null;
  }

  isBeforeFirstProductiveDate(dateStr, firstProductiveDate = this.getFirstProductiveDate()) {
    return !!firstProductiveDate && dateStr < firstProductiveDate;
  }

  getCurrentFilteredTotalMinutes() {
    const range = this.app.elements["prod-range"].value;
    const rangeDates = this.getRangeDates(range);
    const dateSet = new Set(rangeDates);
    return this.app.state.tasks
      .filter(
        (t) =>
          dateSet.has(t.date) &&
          this.passesProductivityFilter(t, "productivity"),
      )
      .reduce((sum, t) => sum + t.duration, 0);
  }

  animateFilteredTotal(fromMinutes, toMinutes) {
    if (!this.app.elements["prod-filter-total"]) return;
    const el = this.app.elements["prod-filter-total"];
    const start = performance.now();
    const duration = 450;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromMinutes + (toMinutes - fromMinutes) * eased;
      el.textContent = this.app.formatDuration(current);
      if (progress < 1)
        this.totalCounterAnimation = requestAnimationFrame(tick);
    };
    if (this.totalCounterAnimation)
      cancelAnimationFrame(this.totalCounterAnimation);
    this.totalCounterAnimation = requestAnimationFrame(tick);
  }

  updateCharts() {
    if (!this.charts.productivity || !this.charts.sleep) return;
    const prodRange = this.app.elements["prod-range"].value;
    const sleepRange = this.app.elements["sleep-range"].value;
    const filter = this.getCurrentFilter();

    const prodContainer = this.app.elements["productivity-chart"].closest(
      ".graph-canvas-container",
    );
    if (prodContainer) prodContainer.classList.add("filter-updating");

    const fromMinutes = this.lastFilteredTotalMinutes;
    this.charts.productivity.data = this.getProductivityData(
      prodRange,
      filter,
    );
    this.charts.sleep.data = this.getSleepData(sleepRange);
    this.applyProductivityChartViewport(prodRange);
    this.charts.productivity.update();
    this.charts.sleep.update();

    const toMinutes = this.getCurrentFilteredTotalMinutes();
    this.lastFilteredTotalMinutes = toMinutes;
    this.animateFilteredTotal(fromMinutes, toMinutes);
    this.updateGraphKpis();
    this.renderGithubHeatmap();
    setTimeout(() => {
      if (prodContainer)
        prodContainer.classList.remove("filter-updating");
    }, 360);
  }

  setupChartControls() {
    this.app.elements["prod-range"].addEventListener("change", () =>
      this.updateCharts(),
    );
    this.app.elements["sleep-range"].addEventListener("change", () =>
      this.updateCharts(),
    );
  }

  formatCompactBattleDate(dateStr) {
    const [year, month, day] = String(dateStr).split("-").map(Number);
    const months = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];
    return `${day}${months[(month || 1) - 1] || "jan"}${String(year || "").slice(-2)}`;
  }

  renderGithubHeatmap() {
    const container = document.getElementById("github-heatmap-container");
    if (!container) return;
    container.innerHTML = "";

    const productiveMap = new Map();
    const trackedMap = new Map();
    this.app.state.tasks.forEach((task) => {
      const duration = Math.max(0, Number(task.duration || 0));
      trackedMap.set(task.date, (trackedMap.get(task.date) || 0) + duration);
      if (!this.app.isProductiveCategory(task.category)) return;
      productiveMap.set(task.date, (productiveMap.get(task.date) || 0) + duration);
    });

    const target = Math.max(
      1,
      Math.round(
        Number(this.app.shadowEngine?.shadowSevenDayAverage || 0) ||
        Number(CONFIG.DAILY_PRODUCTIVITY_THRESHOLD_MINUTES || 240),
      ),
    );
    const today = new Date();
    const dates = [];
    for (let i = 364; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(this.app.getDateString(d));
    }
    const thresholdMap = this.app.shadowEngine.getHistoricalShadowThresholdMap(
      dates[0],
      dates[dates.length - 1],
    );

    const days = dates.map((dateStr) => {
      const productive = productiveMap.get(dateStr) || 0;
      const tracked = trackedMap.get(dateStr) || 0;
      const hasData = tracked > 0;
      const threshold = thresholdMap.get(dateStr) || target;
      const isWin = productive >= threshold;
      return {
        dateStr,
        productive,
        tracked,
        threshold,
        hasData,
        isWin,
        state: !hasData ? "neutral" : (isWin ? "win" : "loss"),
      };
    });

    let running = 0;
    days.forEach((day) => {
      if (day.state === "win") {
        running += 1;
        day.streak = running;
      } else {
        running = 0;
        day.streak = 0;
      }
    });

    const todayEntry = days[days.length - 1];
    const currentStreak = todayEntry?.streak || 0;
    let bestStreak = 0;
    let bestEndIndex = -1;
    days.forEach((day, index) => {
      if ((day.streak || 0) > bestStreak) {
        bestStreak = day.streak;
        bestEndIndex = index;
      }
    });
    const bestStartIndex = bestStreak > 0 ? (bestEndIndex - bestStreak + 1) : -1;
    const hasBrokenBestStreak =
      bestStreak > 0 && bestEndIndex >= 0 && bestEndIndex < days.length - 1;

          const currentStreakStartIndex = currentStreak > 0 ? (days.length - currentStreak) : -1;
          const todayDate = this.app.getDateString(today);
          const todayIndex = days.findIndex((day) => day.dateStr === todayDate);
          const todayWeek = todayIndex >= 0 ? Math.floor(todayIndex / 7) : 52;

          const wrapper = document.createElement("div");
          wrapper.className = "github-heatmap-wrapper";

          const inner = document.createElement("div");
          inner.className = "github-heatmap-inner";

    const grid = document.createElement("div");
    grid.className = "github-heatmap-grid";

    days.forEach((day, index) => {
      const week = Math.floor(index / 7);
      const row = index % 7;
      const cell = document.createElement("div");
      cell.className = "github-cell";
      cell.style.gridColumn = String(week + 1);
      cell.style.gridRow = String(row + 1);
      cell.dataset.state = day.dateStr === todayDate ? "today" : day.state;
      if (currentStreak > 0 && index >= currentStreakStartIndex) {
        cell.dataset.streak = "active";
      }
      if (
        hasBrokenBestStreak &&
        index >= bestStartIndex &&
        index <= bestEndIndex
      ) {
        cell.dataset.best = "broken";
      }
      cell.title = `${this.formatCompactBattleDate(day.dateStr)} | ${day.state === "neutral" ? "No data" : (day.state === "win" ? "Win" : "Loss")} | ${this.app.formatDuration(day.productive)} / ${this.app.formatDuration(day.threshold || target)} | Streak ${day.streak || 0}`;
      grid.appendChild(cell);
    });

          inner.appendChild(grid);
          wrapper.appendChild(inner);
          container.appendChild(wrapper);

          requestAnimationFrame(() => {
            const cellWidth = 12;
            const targetScroll = Math.max(0, (todayWeek * cellWidth) - container.clientWidth + 36);
            container.scrollLeft = targetScroll;
          });
        }
}
class EventManager {
  constructor(app) {
    this.app = app;
  }
  initialize() {
    this.bindEvents();
  }
  bindEvents() {
    this.app.elements["start-btn"].addEventListener("click", () =>
      this.app.stopwatch.start(),
    );
    this.app.elements["stop-btn"].addEventListener("click", () =>
      this.app.stopwatch.stop(),
    );
    this.app.elements["sleep-btn"].addEventListener("click", () =>
      this.app.stopwatch.startSleep(),
    );
    this.app.elements["add-favorite"].addEventListener("click", () =>
      this.app.taskManager.addFavorite(),
    );
    if (this.app.elements["tasks-prev-day"])
      this.app.elements["tasks-prev-day"].addEventListener("click", () =>
        this.app.taskManager.shiftTaskViewDate(-1),
      );
    if (this.app.elements["tasks-next-day"])
      this.app.elements["tasks-next-day"].addEventListener("click", () =>
        this.app.taskManager.shiftTaskViewDate(1),
      );
    if (this.app.elements["tasks-today-btn"])
      this.app.elements["tasks-today-btn"].addEventListener("click", () =>
        this.app.taskManager.setTaskViewDate(this.app.getDateString()),
      );
    if (this.app.elements["tasks-date-picker"])
      this.app.elements["tasks-date-picker"].addEventListener("change", (e) =>
        this.app.taskManager.setTaskViewDate(
          e.target.value || this.app.getDateString(),
        ),
      );
    this.app.elements["task-input"].addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !this.app.stopwatch.isRunning)
        this.app.stopwatch.start();
    });
    this.app.elements["view-report"].addEventListener("click", () =>
      this.app.uiManager.showReport(),
    );
    this.app.elements["open-trainer"].addEventListener("click", () => {
      this.app.trainerEngine.showWindow();
    });
    const genBtn = this.app.elements["generate-roadmap-btn"];
    if (genBtn) {
      genBtn.addEventListener("click", () => this.app.trainerEngine.generateAIRoadmap());
    }
    const roadmapCopyBtn = this.app.elements["copy-roadmap-prompt-btn"];
    if (roadmapCopyBtn) {
      roadmapCopyBtn.addEventListener("click", () =>
        this.app.trainerEngine.copyGeneratorOutput(
          "ai-roadmap-output",
          "ai-roadmap-status",
          "Generate a roadmap prompt first.",
          "Copied.",
        ),
      );
    }
    const applyRoadmapBtn = this.app.elements["apply-roadmap-response-btn"];
    if (applyRoadmapBtn) {
      applyRoadmapBtn.addEventListener("click", () =>
        this.app.trainerEngine.applyRoadmapResponse(),
      );
    }
    const taskBtn = this.app.elements["generate-task-prompt-btn"];
    if (taskBtn) {
      taskBtn.addEventListener("click", () => this.app.trainerEngine.generateTaskPrompt());
    }
    const taskCopyBtn = this.app.elements["copy-task-prompt-btn"];
    if (taskCopyBtn) {
      taskCopyBtn.addEventListener("click", () =>
        this.app.trainerEngine.copyGeneratorOutput(
          "ai-task-output",
          "ai-task-status",
          "Generate a task prompt first.",
          "Copied.",
        ),
      );
    }
    const saveTaskBtn = this.app.elements["save-task-response-btn"];
    if (saveTaskBtn) {
      saveTaskBtn.addEventListener("click", () =>
        this.app.trainerEngine.saveTaskResponse(),
      );
    }
    this.app.elements["export-data"].addEventListener("click", () =>
      (this.app.uiManager.exportData(), this.app.cloudManager.closeProfileMenu()),
    );
    this.app.elements["import-data"].addEventListener("click", () =>
      (this.app.uiManager.triggerImportPicker(), this.app.cloudManager.closeProfileMenu()),
    );
    this.app.elements["open-shadow-ranks"].addEventListener("click", () => {
      this.app.uiManager.showShadowRanksGuide();
      this.app.cloudManager.closeProfileMenu();
    });
    this.app.elements["import-file"].addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      this.app.uiManager.importDataFromFile(file);
    });
    if (this.app.elements["wake-now-btn"])
      this.app.elements["wake-now-btn"].addEventListener("click", () =>
        this.app.flowEngine.markWakeNow(),
      );
    if (this.app.elements["first-action-btn"])
      this.app.elements["first-action-btn"].addEventListener(
        "click",
        () => this.app.flowEngine.markFirstActionNow(),
      );
    if (this.app.elements["kill-switch-btn"])
      this.app.elements["kill-switch-btn"].addEventListener("click", () =>
        this.app.flowEngine.runKillSwitch(),
      );
    if (this.app.elements["flow-before-phone-check"])
      this.app.elements["flow-before-phone-check"].addEventListener(
        "change",
        (e) =>
          this.app.flowEngine.toggleFlowBeforePhone(e.target.checked),
      );
    if (this.app.elements["attention-minus-btn"])
      this.app.elements["attention-minus-btn"].addEventListener(
        "click",
        () => this.app.flowEngine.decrementAttentionStretch(),
      );
    if (this.app.elements["attention-plus-btn"])
      this.app.elements["attention-plus-btn"].addEventListener(
        "click",
        () => this.app.flowEngine.incrementAttentionStretch(),
      );
    document.querySelectorAll(".war-mode-check").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const key = e.target.getAttribute("data-key");
        this.app.flowEngine.toggleWarMode(key, e.target.checked);
      });
    });
    this.app.elements["close-modal"].addEventListener("click", () =>
      this.app.uiManager.hideReport(),
    );
    this.app.elements["close-report"].addEventListener("click", () =>
      this.app.uiManager.hideReport(),
    );
    this.app.elements["close-shadow-ranks"].addEventListener("click", () =>
      this.app.uiManager.hideShadowRanksGuide(),
    );
    this.app.elements["close-shadow-ranks-modal"].addEventListener(
      "click",
      () => this.app.uiManager.hideShadowRanksGuide(),
    );
    this.app.elements["print-report"].addEventListener("click", () =>
      window.print(),
    );
    this.app.elements["close-trainer"].addEventListener("click", () =>
      this.app.trainerEngine.hideWindow(),
    );
    this.app.elements["close-trainer-modal"].addEventListener(
      "click",
      () => this.app.trainerEngine.hideWindow(),
    );
    this.app.elements["refresh-trainer"].addEventListener("click", () => {
      this.app.trainerEngine.state.roadmap.editMode =
        !this.app.trainerEngine.state.roadmap.editMode;
      this.app.trainerEngine.refresh();
    });
    this.app.elements["copy-trainer"].addEventListener("click", () =>
      this.app.trainerEngine.copyPlan(),
    );
    this.app.elements["journal-save-btn"].addEventListener("click", () =>
      this.app.uiManager.saveSleepJournal(),
    );
    this.app.elements["journal-save-sleep-btn"].addEventListener("click", () =>
      this.app.uiManager.saveSleepJournal({ startSleepAfterSave: true }),
    );
    this.app.elements["journal-download-btn"].addEventListener("click", () =>
      this.app.uiManager.downloadJournalEntries(),
    );
    this.app.elements["close-streak"].addEventListener("click", () =>
      this.app.uiManager.hideStreakPopup(),
    );
    this.app.elements["report-modal"].addEventListener("click", (e) => {
      if (e.target === this.app.elements["report-modal"])
        this.app.uiManager.hideReport();
    });
    this.app.elements["shadow-ranks-modal"].addEventListener("click", (e) => {
      if (e.target === this.app.elements["shadow-ranks-modal"])
        this.app.uiManager.hideShadowRanksGuide();
    });
    this.app.elements["trainer-modal"].addEventListener("click", (e) => {
      if (e.target === this.app.elements["trainer-modal"])
        this.app.trainerEngine.hideWindow();
    });
  }
}
window.classifyActivity = (userInput) =>
  ActivityClassifier.classify(userInput);
window.app = new DisciplineTracker();
document.addEventListener("DOMContentLoaded", () =>
  window.app.initialize(),
);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && window.app.taskManager) {
    window.app.taskManager.updateStats();
    window.app.taskManager.renderTasks();
    window.app.taskManager.renderFavorites();
    if (window.app.shadowEngine) window.app.shadowEngine.refresh(false);
    if (window.app.trainerEngine)
      window.app.trainerEngine.syncMissionFromRoadmap({ rebuild: true });
    if (window.app.flowEngine) window.app.flowEngine.refresh();
  }
});
window.addEventListener("beforeunload", () => {
  if (window.app?.stopwatch?.tickIntervalId)
    clearInterval(window.app.stopwatch.tickIntervalId);
});




