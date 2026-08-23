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
  SHADOW_DAY_CUTOFF_HOUR: 4,
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
    SPIRAL_HABIT_TRACKER: "discipline_tracker_spiral_habit_tracker",
    STATS_RESET_AT: "discipline_tracker_stats_reset_at",
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
    "Main Study",
    "Revision",
    "Coding",
    "Practice",
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
      "revision",
      "current affairs",
      "polity",
      "history",
      "geography",
      "economy",
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
    this.userStateUnsub = null;
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
        this.detachUserStateListener();
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
          this.listenToUserState();
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

    // Pipeline dropdown toggle
    this.app.elements["pipeline-menu-toggle"]?.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
        this.togglePipelineMenu();
      },
    );

    document.addEventListener("click", (e) => {
      const container = this.app.elements["profile-menu-container"];
      if (!container || container.contains(e.target)) return;
      this.closeProfileMenu();
    });
    document.addEventListener("click", (e) => {
      const container = this.app.elements["pipeline-menu-container"];
      if (!container || container.contains(e.target)) return;
      this.closePipelineMenu();
    });
  }

  toggleProfileMenu() {
    const menu = this.app.elements["profile-menu"];
    const toggle = this.app.elements["profile-menu-toggle"];
    if (!menu) return;
    const isOpen = menu.classList.contains("open");
    if (isOpen) {
      menu.classList.remove("open");
    } else {
      if (toggle) {
        const rect = toggle.getBoundingClientRect();
        menu.style.top = (rect.bottom + 8) + "px";
        menu.style.right = (window.innerWidth - rect.right) + "px";
        menu.style.left = "";
      }
      menu.classList.add("open");
    }
  }

  closeProfileMenu() {
    this.app.elements["profile-menu"]?.classList.remove("open");
  }

  togglePipelineMenu() {
    const menu = this.app.elements["pipeline-menu"];
    const toggle = this.app.elements["pipeline-menu-toggle"];
    if (!menu) return;
    const isOpen = menu.classList.contains("open");
    if (isOpen) {
      menu.classList.remove("open");
    } else {
      // Close profile menu when opening pipeline menu
      this.closeProfileMenu();
      if (toggle) {
        const rect = toggle.getBoundingClientRect();
        menu.style.top = (rect.bottom + 8) + "px";
        menu.style.left = rect.left + "px";
        menu.style.right = "";
      }
      menu.classList.add("open");
    }
  }

  closePipelineMenu() {
    const menu = this.app.elements["pipeline-menu"];
    if (menu) menu.classList.remove("open");
    const status = this.app.elements["pipeline-copy-status"];
    if (status) { status.textContent = ""; status.classList.remove("visible"); }
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
            module: "MODULE 1 — DIODES",
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

  // Debounced user-doc writer: batches rapid saves into ONE Firestore write.
  _scheduleUserDocWrite(patch) {
    if (!this.isReady || this.isHydratingCloudState) return;
    this._pendingUserDocPatch = Object.assign({}, this._pendingUserDocPatch || {}, patch);
    if (this._userDocWriteTimer) return;
    this._userDocWriteTimer = setTimeout(async () => {
      this._userDocWriteTimer = null;
      const payload = this._pendingUserDocPatch || {};
      this._pendingUserDocPatch = null;
      if (!Object.keys(payload).length) return;
      try {
        await window.FirebaseServices.setDoc(
          this.userDoc(),
          Object.assign({}, payload, { updatedAt: Date.now() }),
          { merge: true },
        );
      } catch (e) {
        console.warn("firebase debounced write failed", e);
      }
    }, 1500);
  }

  async writePatch(patch) {
    this._scheduleUserDocWrite(patch);
  }

  // Tiny dedicated doc for mission checkbox state only.
  missionChecksDoc() {
    return window.FirebaseServices.doc(
      this.db, "users", this.user.uid, "state", "missionChecks"
    );
  }

  // Write ONLY today checks to the tiny missionChecks doc (debounced 800ms).
  async syncMissionChecks(todayKey, checks) {
    if (!this.isReady) return;
    if (this._missionChecksWriteTimer) clearTimeout(this._missionChecksWriteTimer);
    this._missionChecksWriteTimer = setTimeout(async () => {
      this._missionChecksWriteTimer = null;
      try {
        await window.FirebaseServices.setDoc(
          this.missionChecksDoc(),
          Object.assign({ [todayKey]: checks }, { updatedAt: Date.now() }),
          { merge: true },
        );
      } catch (e) {
        console.warn("missionChecks sync failed", e);
      }
    }, 800);
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
    // TRAINER_STATE synced via dedicated missionChecks doc, NOT the user doc.
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
    if (Object.keys(patch).length) this._scheduleUserDocWrite(patch);
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
      console.warn("onSnapshot not available — falling back to one-time timer restore");
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

  detachUserStateListener() {
    if (!this.userStateUnsub) return;
    this.userStateUnsub();
    this.userStateUnsub = null;
  }

  /**
   * Real-time listener on the user doc so that trainerState (mission checks)
   * and other user-level fields sync instantly across devices.
   */
  listenToUserState() {
    if (!this.isReady) return;
    this.detachUserStateListener();
    if (typeof window.FirebaseServices.onSnapshot !== "function") return;
    this.userStateUnsub = window.FirebaseServices.onSnapshot(
      this.missionChecksDoc(),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() || {};
        const today = this.app.getDateString(new Date());
        const cloudChecks = data[today] || {};
        if (!Object.keys(cloudChecks).length) return;
        const localTrainer = this.app.trainerEngine.state || {};
        if (!localTrainer.manualMissionChecks) localTrainer.manualMissionChecks = {};
        const localToday = localTrainer.manualMissionChecks[today] || {};
        // Cloud wins: merge cloud ticks over local for today
        localTrainer.manualMissionChecks[today] = Object.assign({}, localToday, cloudChecks);
        // Persist locally without triggering another cloud write
        localStorage.setItem(
          CONFIG.STORAGE_KEYS.TRAINER_STATE,
          JSON.stringify(localTrainer),
        );
        // Invalidate cache and re-render mission list
        this.app.trainerEngine._missionStateCache = null;
        this.app.trainerEngine.syncMissionFromRoadmap();
      },
      (err) => console.warn("User state sync listener failed", err),
    );
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

  async resetCloudStatsOnly() {
    if (!this.isReady || !window.FirebaseServices) return true;
    const services = window.FirebaseServices;

    try {
      this.detachTimerListener();

      const stateDoc = (name) =>
        services.doc(this.db, "users", this.user.uid, "state", name);

      await Promise.all([
        services.deleteDoc(stateDoc("timer")),
        services.setDoc(
          this.userDoc(),
          {
            revision: { status: "pending", timeSpent: 0 },
            flowProtocol: { byDate: {} },
            trainerState: {},
            shadowAvg: 0,
            updatedAt: Date.now(),
          },
          { merge: true },
        ),
      ]);

      return true;
    } catch (error) {
      console.warn("cloud stats reset failed", error);
      return false;
    }
  }
}
class DisciplineTracker {
  constructor() {
    this.state = {
      tasks: (this.loadFromStorage(CONFIG.STORAGE_KEYS.TASKS) || []).map(
        (t) => this.normalizeTask(t),
      ),
      selectedTaskDate: this.getDateString(), // always open on today
      favorites:
        this.loadFromStorage(CONFIG.STORAGE_KEYS.FAVORITES) || [],
      streak:
        parseInt(this.loadFromStorage(CONFIG.STORAGE_KEYS.STREAK)) || 0,
      lastActivityDate: this.loadFromStorage(
        CONFIG.STORAGE_KEYS.LAST_ACTIVITY,
      ),
      journalEntries:
        this.loadFromStorage(CONFIG.STORAGE_KEYS.JOURNAL_ENTRIES) || {},
      statsResetAt:
        Number(this.loadFromStorage(CONFIG.STORAGE_KEYS.STATS_RESET_AT)) || 0,
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
    this.dayBoundaryIntervalId = null;
    this.lastComputedDate = this.getDateString();
    this.lastComputedShadowDate = this.shadowEngine.getShadowDayDate();
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
      "graph-productivity-label",
      "graph-productivity-total",
      "graph-total-distraction-label",
      "graph-total-distraction",
      "graph-logged-distraction-label",
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
      "import-file",
      "report-modal",
      "report-content",
      "close-modal",
      "print-report",
      "close-report",
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
      "complete-reset-btn",
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
      "shadow-next-rank-label",
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
      "reset-stats-btn",
      "auth-user-name",
      "profile-menu-container",
      "profile-menu-toggle",
      "profile-menu",
      "pipeline-menu-container",
      "pipeline-menu-toggle",
      "pipeline-menu",
      "copy-timetable-prompt-btn",
      "pipeline-copy-status",
      "edit-tasks-btn",
      "edit-tasks-modal",
      "close-edit-tasks-modal",
      "close-edit-tasks-modal-btn",
      "task-response-draft-input",
      "save-tasks-btn",
      "edit-timetable-from-pipeline-btn",
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
  async completeResetData() {
    const confirmed = window.confirm(
      "Reset stats will clear streaks, mission checks, shadow/flow stats, journal entries, and timer state. Your tasks and Master Study Pipeline stay saved. Continue?",
    );
    if (!confirmed) return;

    const cloudResetOk = await this.cloudManager?.resetCloudStatsOnly?.();
    const keysToRemove = [
      CONFIG.STORAGE_KEYS.STREAK,
      CONFIG.STORAGE_KEYS.LAST_ACTIVITY,
      CONFIG.STORAGE_KEYS.ACTIVE_TASK,
      CONFIG.STORAGE_KEYS.SHADOW_AVG,
      CONFIG.STORAGE_KEYS.TRAINER_STATE,
      CONFIG.STORAGE_KEYS.FLOW_PROTOCOL,
      CONFIG.STORAGE_KEYS.JOURNAL_ENTRIES,
      CONFIG.STORAGE_KEYS.TIMER_CLOUD_STATE,
      CONFIG.STORAGE_KEYS.SHADOW_ENGINE_STATE,
      CONFIG.STORAGE_KEYS.SPIRAL_HABIT_TRACKER,
    ];

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn("stats reset failed", key, error);
      }
    });

    this.state.streak = 0;
    this.state.lastActivityDate = null;
    this.state.activeTask = null;
    this.state.journalEntries = {};
    this.state.statsResetAt = Date.now();
    this.saveToStorage(
      CONFIG.STORAGE_KEYS.STATS_RESET_AT,
      this.state.statsResetAt,
    );
    this.stopwatch?.reset?.();

    try {
      Object.keys(sessionStorage).forEach((key) => {
        if (
          key.startsWith("discipline_tracker_timer") ||
          key.startsWith("discipline_tracker_shadow") ||
          key.startsWith("discipline_tracker_flow")
        ) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn("session reset failed", error);
    }

    if (cloudResetOk === false) {
      window.alert(
        "Local stats were reset, but cloud stats reset failed. Check your connection and press Reset Stats again if old synced stats return.",
      );
    }

    window.location.reload();
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

    let graphTag = task.graph_tag || classification.graph_tag;
    let wasteLevel = task.waste_level || classification.waste_level;
    if (PRODUCTIVE_CATEGORIES.has(category)) {
      graphTag = "productivity";
      wasteLevel = "NONE";
    } else if (category === "Time Waste / Distraction") {
      graphTag = "distraction";
    } else if (category === "Sleep" || category === "Miscellaneous") {
      graphTag = "neutral";
      wasteLevel = "NONE";
    }
    const growthCategory =
      task.growth_category || classification.category;
    const confidence = Number(
      task.confidence ?? classification.confidence,
    );

    const canonicalDate = Number.isFinite(startTime)
      ? this.getDateString(new Date(startTime))
      : String(task.date || "").trim() || this.getDateString();

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
      date: canonicalDate,
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
    const cutoff = Number(CONFIG.SHADOW_DAY_CUTOFF_HOUR || 4);
    if (d.getHours() < cutoff) d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  parseDateKey(dateStr) {
    const [year, month, day] = String(dateStr || "")
      .split("-")
      .map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }
  getActiveDate(date = new Date()) {
    const key = this.getDateString(date);
    return this.parseDateKey(key) || new Date(date);
  }
  getActiveDayEnd(date = new Date()) {
    const now = new Date(date);
    const end = new Date(now);
    const cutoff = Number(CONFIG.SHADOW_DAY_CUTOFF_HOUR || 4);
    if (now.getHours() < cutoff) {
      end.setHours(cutoff, 0, 0, 0);
    } else {
      end.setDate(end.getDate() + 1);
      end.setHours(cutoff, 0, 0, 0);
    }
    return end;
  }
  isDistractionCategory(category) {
    return category === "Time Waste / Distraction";
  }
  isTaskAfterStatsReset(task) {
    const resetAt = Number(this.state.statsResetAt || 0);
    if (!resetAt) return true;
    const taskTime = Number(task.endTime || task.startTime || 0);
    return Number.isFinite(taskTime) && taskTime >= resetAt;
  }
  getTrackedMinutesForDate(
    dateStr,
    sourceTasks = this.state.tasks,
  ) {
    return sourceTasks
      .filter(
        (task) =>
          task.date === dateStr &&
          Number.isFinite(task.duration) &&
          task.duration > 0 &&
          this.isTaskAfterStatsReset(task),
      )
      .reduce((sum, task) => sum + task.duration, 0);
  }
  getProductiveMinutesForDate(
    dateStr,
    sourceTasks = this.state.tasks,
  ) {
    return sourceTasks
      .filter(
        (task) =>
          dateStr === task.date &&
          this.isProductiveCategory(task.category) &&
          this.isTaskAfterStatsReset(task),
      )
      .reduce((sum, task) => sum + task.duration, 0);
  }
  getSleepMinutesForDate(
    dateStr,
    sourceTasks = this.state.tasks,
  ) {
    return sourceTasks
      .filter(
        (task) =>
          task.date === dateStr &&
          task.category === "Sleep" &&
          this.isTaskAfterStatsReset(task),
      )
      .reduce((sum, task) => sum + task.duration, 0);
  }
  getLoggedDistractionMinutesForDate(
    dateStr,
    sourceTasks = this.state.tasks,
  ) {
    return sourceTasks
      .filter(
        (task) =>
          task.date === dateStr &&
          this.isDistractionCategory(task.category) &&
          this.isTaskAfterStatsReset(task),
      )
      .reduce((sum, task) => sum + task.duration, 0);
  }
  getInferredWasteMinutesForDate(
    dateStr,
    sourceTasks = this.state.tasks,
  ) {
    const trackedMinutes = this.getTrackedMinutesForDate(
      dateStr,
      sourceTasks,
    );
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
    this.masterMessage = new MasterMessageManager(this);
    this.masterMessage.initialize();
    this.startDayBoundaryWatcher();
    this.updateStreak();
    if (this.state.activeTask)
      this.stopwatch.resumeActiveTask(this.state.activeTask);
    window.addEventListener("online", () => this.syncManager.syncNow());
    await this.syncManager.syncNow();
    await this.cloudManager.initialize();
  }
  startDayBoundaryWatcher() {
    if (this.dayBoundaryIntervalId) clearInterval(this.dayBoundaryIntervalId);
    const checkForDayBoundary = () => {
      const currentShadowDate =
        this.shadowEngine?.getShadowDayDate?.() || this.getDateString();
      if (currentShadowDate !== this.lastComputedShadowDate) {
        this.lastComputedShadowDate = currentShadowDate;
        this.shadowEngine?.refresh?.(false);
        this.graphManager?.updateCharts?.();
      }
      const currentDate = this.getDateString();
      if (currentDate === this.lastComputedDate) return;
      this.lastComputedDate = currentDate;
      this.taskManager?.refreshViews?.();
      this.taskManager?.syncTaskDateControls?.();
      this.trainerEngine?.syncMissionFromRoadmap?.({ rebuild: true });
      this.flowEngine?.refresh?.();
    };
    this.dayBoundaryIntervalId = setInterval(checkForDayBoundary, 60000);
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
              t.duration > 0 &&
              this.isTaskAfterStatsReset(t),
          )
          .map((t) => t.date),
      ),
    ].sort();
    const today = this.getDateString();
    const hasAnyTaskToday = this.state.tasks.some(
      (t) =>
        t.date === today &&
        Number.isFinite(t.duration) &&
        t.duration > 0 &&
        this.isTaskAfterStatsReset(t),
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
        `${this.app.state.activeTask.category} - ${this.app.state.activeTask.subcategory}`;
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
    this.app.shadowEngine?.lockShadowAverageForToday?.();
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
    const activeTask = this.app.state.activeTask;
    const entry = this.app.normalizeTask({
      id: `${Date.now()}`,
      ...activeTask,
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
      // Check if this was a timed mission task — if so do a full rebuild so the
      // tick mark appears automatically when target_minutes threshold is met.
      const trainerEngine = this.app.trainerEngine;
      const missionCheckId = activeTask?.missionCheckId ||
        trainerEngine?._activeMissionCheckId || null;
      const targetMinutes = activeTask?.missionTargetMinutes ||
        trainerEngine?._activeMissionTargetMinutes || 0;
      const elapsedMinutes = Math.round(totalElapsed / 60000);
      // Allow up to 15-minute flexibility below target for auto-completion
      const FLEX_MINUTES = 15;
      const meetsTarget = targetMinutes > 0 && elapsedMinutes >= (targetMinutes - FLEX_MINUTES);
      if (missionCheckId && meetsTarget) {
        // Full rebuild: this will recompute done=true and render checked checkbox
        trainerEngine.syncMissionFromRoadmap({ rebuild: true });
        // Also persist the manual check in case topic matching is loose
        const checks = trainerEngine.getTodayManualMissionChecks();
        if (!checks[missionCheckId]) {
          checks[missionCheckId] = true;
          localStorage.setItem(CONFIG.STORAGE_KEYS.TRAINER_STATE, JSON.stringify(trainerEngine.state));
          trainerEngine.updateMissionChecklistScore();
          const today = this.app.getDateString(new Date());
          this.app.cloudManager?.syncMissionChecks?.(today, checks);
        }
      } else {
        trainerEngine.syncMissionFromRoadmap({ skipRender: true });
      }
      // Clear the active mission task reference
      if (trainerEngine) {
        trainerEngine._activeMissionCheckId = null;
        trainerEngine._activeMissionTargetMinutes = 0;
      }
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
      `${activeTask.category || "Productive Work"} - ${activeTask.subcategory || "General"}`;
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
    // Save elapsed time as a completed task so nothing is lost when
    // the timer is stopped from another device.
    const totalElapsed = this.getElapsedNow();
    if (totalElapsed > 60000 && this.app.state.activeTask) {
      const endTime = Date.now();
      const entry = this.app.normalizeTask(
        Object.assign({ id: String(endTime) }, this.app.state.activeTask, {
          startTime: this.startTime,
          endTime,
          duration: Math.max(1, Math.round(totalElapsed / 60000)),
          date: this.app.getDateString(new Date(this.startTime)),
        })
      );
      this.app.taskManager.addTask(entry);
    }
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
      // Use raw cloud updatedAt (before normalizeTask stamps a fresh Date.now())
      // so the staleness guard can actually work.
      const rawUpdatedAt = Number((change.data || {}).updatedAt || 0);
      const existing = byId.get(id);
      if (
        existing &&
        Number(existing.updatedAt || 0) >= rawUpdatedAt &&
        Number(existing.endTime || 0) === Number((change.data || {}).endTime || 0) &&
        Number(existing.duration || 0) === Number((change.data || {}).duration || 0)
      )
        return;
      const normalized = this.app.normalizeTask({ id, ...(change.data || {}) });
      byId.set(id, normalized);
      changed = true;
    });
    if (!changed) return;
    this.app.state.tasks = [...byId.values()].sort((a, b) => a.startTime - b.startTime);
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.TASKS, this.app.state.tasks);
    this.refreshViews();
  }

  addTask(task) {
    const normalized = this.app.normalizeTask(task);
    // Upsert by ID to prevent duplicate entries if addTask is called
    // more than once with the same task (e.g. due to remote timer sync).
    const existingIndex = this.app.state.tasks.findIndex(
      (t) => String(t.id) === String(normalized.id),
    );
    if (existingIndex !== -1) {
      this.app.state.tasks[existingIndex] = normalized;
    } else {
      this.app.state.tasks.push(normalized);
    }
    this.app.saveToStorage(
      CONFIG.STORAGE_KEYS.TASKS,
      this.app.state.tasks,
    );
    this.app.cloudManager?.syncTaskUpsert?.(normalized);
    this.app.syncManager.queue({
      type: "upsert",
      entry: normalized,
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
    const productiveTime = this.app.getProductiveMinutesForDate(today);
    const sleepTime = this.app.getSleepMinutesForDate(today);
    const totalTime = this.app.getTrackedMinutesForDate(today);
    this.app.elements["productive-time"].textContent =
      this.app.formatDuration(productiveTime);
    if (this.app.elements["sleep-time"])
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
      el.innerHTML = `<div class="task-header"><div class="task-name">${isSleep ? "[SLEEP]" : "[TASK]"} ${this.app.escapeHtml(task.category)} - ${this.app.escapeHtml(task.subcategory)}</div><div class="task-duration">${this.app.formatDuration(task.duration)}</div></div><div class="task-time">${this.app.formatTime(task.startTime)} - ${this.app.formatTime(task.endTime)}</div><div class="task-time">${this.app.escapeHtml(task.description || "")}</div><div class="task-actions">${!isSleep ? `<button class="btn btn-success restart-task-btn" data-id="${this.app.escapeHtml(task.id)}" title="Start timer for this task"><i class="fas fa-play"></i> Start</button>` : ""}<button class="btn ${editClass}" data-id="${this.app.escapeHtml(task.id)}"><i class="fas fa-pen"></i> ${editLabel}</button><button class="btn delete-task-btn" data-id="${this.app.escapeHtml(task.id)}"><i class="fas fa-trash"></i> Delete</button></div>`;
      c.appendChild(el);
    });
    document
      .querySelectorAll(".restart-task-btn")
      .forEach((btn) =>
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const taskId = e.currentTarget.getAttribute("data-id");
          const task = this.app.state.tasks.find((t) => String(t.id) === String(taskId));
          if (!task) return;
          const label = task.description || `${task.category} - ${task.subcategory}`;
          this.app.elements["task-input"].value = label;
          this.app.stopwatch.start(label, {
            category: task.category,
            subcategory: task.subcategory,
            description: task.description || label,
          });
        }),
      );
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
  static getDateKey(date = new Date()) {
    const d = new Date(date);
    if (d.getHours() < 5) d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  static parseDateKey(dateStr) {
    const [year, month, day] = String(dateStr || "")
      .split("-")
      .map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  static buildMonthlyReport(
    tasks,
    year,
    month,
    thresholdMinutes = CONFIG.DAILY_PRODUCTIVITY_THRESHOLD_MINUTES,
  ) {
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthTasks = tasks.filter((t) =>
      String(t.date || "").startsWith(monthKey),
    );
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    const prevMonthKey = `${py}-${String(pm + 1).padStart(2, "0")}`;
    const prevTasks = tasks.filter((t) =>
      String(t.date || "").startsWith(prevMonthKey),
    );
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
    const todayKey = AnalyticsService.getDateKey();
    const today = AnalyticsService.parseDateKey(todayKey) || new Date();
    const daily = new Map();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      daily.set(AnalyticsService.getDateKey(d), 0);
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
    this.currentHeatmapYear = new Date().getFullYear();
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
      this.updateTaskRemaining(now);
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  updateTaskRemaining(now) {
    const el = document.getElementById("task-remaining");
    if (!el) return;

    // Get mission tasks (each has a .win = [startHour, endHour])
    const tasks = this.app.trainerEngine?.getDailyMissionTasks?.() || [];
    if (!tasks.length) { el.style.display = "none"; return; }

    const nowH = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

    // Find the currently active task window
    let active = null;
    for (const t of tasks) {
      const win = t.win;
      if (!Array.isArray(win) || win.length < 2) continue;
      const [wStart, wEnd] = win;
      if (nowH >= wStart && nowH < wEnd) { active = { task: t, wEnd }; break; }
    }

    // If nothing active right now, look for the very next upcoming task
    if (!active) {
      let next = null;
      for (const t of tasks) {
        const win = t.win;
        if (!Array.isArray(win) || win.length < 2) continue;
        if (nowH < win[0]) { next = { task: t, wStart: win[0] }; break; }
      }
      if (next) {
        const minsUntil = Math.round((next.wStart - nowH) * 60);
        const h = Math.floor(minsUntil / 60);
        const m = minsUntil % 60;
        const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
        const label = (next.task.label || next.task.topic || "").replace(/^[A-Z ]+:\s*/, "").slice(0, 28);
        el.className = "";
        el.style.display = "flex";
        el.innerHTML = `<span class="remaining-icon">⏳</span><span class="remaining-label">next in</span><span class="remaining-value">${timeStr}</span><span class="remaining-label" style="opacity:0.4;margin-left:2px">— ${label}</span>`;
        return;
      }
      el.style.display = "none";
      return;
    }

    // Active window found — compute remaining minutes
    const minsLeft = Math.max(0, Math.round((active.wEnd - nowH) * 60));
    const h = Math.floor(minsLeft / 60);
    const m = minsLeft % 60;
    const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
    const label = (active.task.label || active.task.topic || "").replace(/^[A-Z ]+:\s*/, "").slice(0, 28);

    // --- Lateness variables (shared by all branches below) ---
    const win = active.task.win;
    const wStartH = Array.isArray(win) ? win[0] : null;
    const minsLate = wStartH !== null ? Math.max(0, Math.round((nowH - wStartH) * 60)) : 0;
    const isRunning = this.app.stopwatch?.isRunning ?? false;
    const activeTaskStartTime = this.app.state?.activeTask?.startTime ?? null;

    // --- Count already-logged time for THIS specific topic (subject-aware) ---
    // Uses getTopicProgress() so only GK logs count for GK window, etc.
    let minsAlreadyDone = 0;
    const activeTopic = active.task.topic || "";
    if (activeTopic && this.app.trainerEngine?.getTopicProgress) {
      const today = this.app.getDateString(now);
      const progress = this.app.trainerEngine.getTopicProgress(activeTopic, today);
      minsAlreadyDone = progress.minutes || 0;
    }

    if (!isRunning) {
      // Idle — check what state this window is in
      if (minsLeft <= 0) {
        // Window ended
        if (minsAlreadyDone > 0) {
          const dh = Math.floor(minsAlreadyDone / 60), dm = minsAlreadyDone % 60;
          const doneStr = dh > 0 ? `${dh}h ${dm}m` : `${minsAlreadyDone}m`;
          el.className = "on-track";
          el.style.display = "flex";
          el.innerHTML = `<span class="remaining-icon">✅</span><span class="remaining-label">done</span><span class="remaining-value">${doneStr}</span><span class="remaining-label" style="opacity:0.45;margin-left:2px">— ${label}</span>`;
        } else {
          // Fully missed
          el.className = "overdue";
          el.style.display = "flex";
          el.innerHTML = `<span class="remaining-icon">⚠️</span><span class="remaining-label">missed</span><span class="remaining-label" style="opacity:0.45;margin-left:2px">— ${label}</span>`;
        }
      } else if (minsAlreadyDone > 0) {
        // Mid-window break after doing some work — show progress + time left
        const dh = Math.floor(minsAlreadyDone / 60), dm = minsAlreadyDone % 60;
        const doneStr = dh > 0 ? `${dh}h ${dm}m` : `${minsAlreadyDone}m`;
        el.className = "on-track";
        el.style.display = "flex";
        el.innerHTML = `<span class="remaining-icon">⏸</span><span class="remaining-label">break ·</span><span class="remaining-value">${doneStr} done</span><span class="remaining-label" style="opacity:0.4;margin-left:2px">· ${timeStr} left</span>`;
      } else {
        // No work done yet — show how late we are
        const lateFmtH = Math.floor(minsLate / 60);
        const lateFmtM = minsLate % 60;
        const lateStr = lateFmtH > 0 ? `${lateFmtH}h ${lateFmtM}m` : `${minsLate}m`;
        el.className = minsLate >= 5 ? "late" : "on-track";
        el.style.display = "flex";
        if (minsLate >= 5) {
          const leftPart = minsLeft > 0 ? ` · <span class="remaining-left">${timeStr} left</span>` : ``;
          el.innerHTML = `<span class="remaining-icon">🔴</span> <span class="remaining-value">${lateStr} late</span>${leftPart} <span class="remaining-label">— ${label}</span>`;
        } else {
          el.innerHTML = `<span class="remaining-icon">⏱</span> <span class="remaining-value">${timeStr}</span> <span class="remaining-label">— ${label}</span>`;
        }
      }
    } else {
      // Stopwatch RUNNING — show time left in window
      const currentSessionMins = activeTaskStartTime
        ? Math.round((Date.now() - activeTaskStartTime) / 60000) : 0;
      const totalWorkedMins = minsAlreadyDone + currentSessionMins;
      const timeElapsedInWindow = wStartH !== null
        ? Math.max(0, Math.round((nowH - wStartH) * 60)) : 0;
      const idleWasted = Math.max(0, timeElapsedInWindow - totalWorkedMins);

      // Build badges
      let lateBadge = "";
      if (minsAlreadyDone === 0 && wStartH !== null && activeTaskStartTime) {
        // First/only session — show if started late
        const actualStartH = new Date(activeTaskStartTime).getHours() + new Date(activeTaskStartTime).getMinutes() / 60;
        const startedLateBy = Math.round((actualStartH - wStartH) * 60);
        if (startedLateBy >= 5) {
          const slh = Math.floor(startedLateBy / 60);
          const slm = startedLateBy % 60;
          const slStr = slh > 0 ? `${slh}h ${slm}m` : `${startedLateBy}m`;
          lateBadge = ` <span class="late-start-badge">+${slStr} late start</span>`;
        }
      } else if (minsAlreadyDone > 0) {
        // Returning session — show prior work done
        const dh = Math.floor(minsAlreadyDone / 60), dm = minsAlreadyDone % 60;
        const doneStr = dh > 0 ? `${dh}h ${dm}m` : `${minsAlreadyDone}m`;
        lateBadge = ` <span class="late-start-badge" style="color:#4caf82;background:rgba(76,175,130,0.1);border-color:rgba(76,175,130,0.3);">+${doneStr} prev</span>`;
      }

      // Idle/wasted badge — time in this window that wasn't worked at all
      let idleBadge = "";
      if (idleWasted >= 5) {
        const ih = Math.floor(idleWasted / 60), im = idleWasted % 60;
        const idleStr = ih > 0 ? `${ih}h ${im}m` : `${idleWasted}m`;
        idleBadge = ` <span class="late-start-badge" style="color:#ffc107;background:rgba(255,193,7,0.1);border-color:rgba(255,193,7,0.35);">~${idleStr} idle</span>`;
      }

      el.className = minsLeft <= 0 ? "overdue" : "on-track";
      el.style.display = "flex";
      el.innerHTML = `<span class="remaining-icon">⏱</span><span class="remaining-label">left</span><span class="remaining-value">${timeStr}</span><span class="remaining-label" style="opacity:0.4;margin-left:2px">— ${label}</span>${lateBadge}${idleBadge}`;
    }
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
    const now = this.app.getActiveDate();
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
        const labelDate = this.app.parseDateKey(date) || new Date();
        return `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${labelDate.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(d.productive)}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(d.sleep)}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(d.waste)}</td></tr>`;
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
      [
        "Sleep Last 7 Days",
        `Avg ${this.app.formatDuration(sleepInsights.averageLast7)} | ${sleepInsights.sleepDebt > 0 ? `Debt ${this.app.formatDuration(sleepInsights.sleepDebt)}` : `Surplus ${this.app.formatDuration(Math.abs(sleepInsights.sleepDebt))}`} | Consistency ${sleepInsights.consistency}`,
      ],
      ["Best / Worst", `Best ${best} | Waste ${worst}`],
      [
        "Alerts",
        r.alerts.underProductivity
          ? `Under productivity (${r.alerts.underProductiveDays} days below ${this.app.formatDuration(r.alerts.thresholdMinutes)})`
          : "None",
      ],
    ]
      .map(
        ([label, value]) =>
          `<div style="padding:0.75rem;border:1px solid var(--border);border-radius:10px;background:rgba(255,255,255,0.03);"><div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.25rem;">${this.app.escapeHtml(label)}</div><strong style="display:block;font-size:0.94rem;line-height:1.35;">${this.app.escapeHtml(value)}</strong></div>`,
      )
      .join("");
    this.app.elements["report-content"].innerHTML = `
          <h3 style="margin-bottom:1rem;">${this.app.escapeHtml(`${monthName} ${r.year} Monthly Report`)}</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:0.65rem;">${summaryRows}</div>
          <h4 style="margin-top:1rem;">Category Totals</h4>
          <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Category</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Duration</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Share</th></tr></thead><tbody>${catRows}</tbody></table></div>
          <details style="margin-top:1rem;"><summary style="cursor:pointer;font-weight:700;color:var(--text-accent);">Productive Work Breakdown</summary><div style="overflow-x:auto;margin-top:0.65rem;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Subcategory</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Duration</th></tr></thead><tbody>${prodBreak}</tbody></table></div></details>
          <details style="margin-top:0.8rem;"><summary style="cursor:pointer;font-weight:700;color:var(--text-accent);">Mission Progress</summary><div style="overflow-x:auto;margin-top:0.65rem;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Mission Topic</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Tracked Time</th></tr></thead><tbody>${missionBreak}</tbody></table></div></details>
          <details style="margin-top:0.8rem;"><summary style="cursor:pointer;font-weight:700;color:var(--text-accent);">Physical Training Breakdown</summary><div style="overflow-x:auto;margin-top:0.65rem;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Subcategory</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Duration</th></tr></thead><tbody>${trainBreak}</tbody></table></div></details>
          <details style="margin-top:0.8rem;"><summary style="cursor:pointer;font-weight:700;color:var(--text-accent);">Daily Breakdown</summary><div style="overflow-x:auto;margin-top:0.65rem;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Date</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Productive</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Sleep</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Total Waste</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
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

  openSleepJournal() {
    this.app.trainerEngine.showWindow();
    this.renderSleepJournal();
    this.app.elements["sleep-journal-panel"]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    this.app.elements["sleep-journal-thoughts"]?.focus();
  }

  promptRequiredJournalForSleep() {
    this.pendingSleepAfterJournal = true;
    this.openSleepJournal();
    this.setSleepJournalStatus(
      "Complete tonight's journal first, then use Save And Sleep.",
      "is-error",
    );
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
    const now = this.app.getActiveDate();
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

  getShadowDayCutoffHour() {
    return Number(CONFIG.SHADOW_DAY_CUTOFF_HOUR || 4);
  }

  formatCalendarDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  parseCalendarDate(dateStr) {
    if (!dateStr) return null;
    const parsed = new Date(`${dateStr}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  getShadowDayDate(date = new Date()) {
    const d = new Date(date);
    if (d.getHours() < this.getShadowDayCutoffHour()) d.setDate(d.getDate() - 1);
    d.setHours(12, 0, 0, 0);
    return this.formatCalendarDate(d);
  }

  getShadowActiveDate(date = new Date()) {
    return this.parseCalendarDate(this.getShadowDayDate(date)) || new Date(date);
  }

  getShadowLockMeta() {
    const stored =
      this.app.loadFromStorage(CONFIG.STORAGE_KEYS.SHADOW_ENGINE_STATE) || {};
    return {
      lastLockedDate: stored.shadowLastLockedDate || null,
      lastAutoBoundaryKey: stored.shadowLastAutoBoundaryKey || null,
    };
  }

  saveShadowLockMeta(partial = {}) {
    const stored =
      this.app.loadFromStorage(CONFIG.STORAGE_KEYS.SHADOW_ENGINE_STATE) || {};
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.SHADOW_ENGINE_STATE, {
      ...stored,
      ...partial,
    });
  }

  getShadowBuddySnapshot() {
    const stored =
      this.app.loadFromStorage(CONFIG.STORAGE_KEYS.SHADOW_ENGINE_STATE) || {};
    return {
      date: stored.shadowBuddySnapshotDate || null,
      metrics: stored.shadowBuddySnapshot || null,
    };
  }

  saveShadowBuddySnapshot(dateStr, snapshot) {
    const stored =
      this.app.loadFromStorage(CONFIG.STORAGE_KEYS.SHADOW_ENGINE_STATE) || {};
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.SHADOW_ENGINE_STATE, {
      ...stored,
      shadowBuddySnapshotDate: dateStr || null,
      shadowBuddySnapshot: snapshot || null,
    });
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

  shiftDateString(dateStr, offsetDays) {
    if (!dateStr) return null;
    const shiftedDate = this.parseCalendarDate(dateStr);
    if (Number.isNaN(shiftedDate.getTime())) return null;
    shiftedDate.setDate(shiftedDate.getDate() + offsetDays);
    return this.formatCalendarDate(shiftedDate);
  }

  getLatestClosedShadowDate() {
    return this.shiftDateString(this.getShadowDayDate(new Date()), -1);
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
    const anchorDate = this.getShadowDayDate(new Date());
    for (let i = 0; i < lookback; i++) {
      const date = this.shiftDateString(anchorDate, -i);
      const minutes = dailyMap.get(date) || 0;
      if (minutes >= targetMinutes) streak++;
      else break;
    }
    return streak;
  }

  getDateStringsBetween(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) return [];

    const start = this.parseCalendarDate(startDateStr);
    const end = this.parseCalendarDate(endDateStr);
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
    const today = this.getShadowDayDate(new Date());
    const latestClosedDate = this.getLatestClosedShadowDate();
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

    // Repair same-day trial results from older builds that evaluated the live day too early.
    if (
      trainingCamp.active &&
      trainingCamp.lastEvaluatedDate &&
      trainingCamp.lastEvaluatedDate > latestClosedDate
    ) {
      const repairedCamp = { ...trainingCamp };
      const repairedDate = repairedCamp.lastEvaluatedDate;
      const repairedMinutes = dailyMap.get(repairedDate) || 0;
      const repairedPass = repairedMinutes >= repairedCamp.targetMinutes;

      repairedCamp.daysCompleted = Math.max(0, repairedCamp.daysCompleted - 1);
      if (repairedPass) {
        repairedCamp.successDays = Math.max(0, repairedCamp.successDays - 1);
      } else {
        repairedCamp.failDays = Math.max(0, repairedCamp.failDays - 1);
        repairedCamp.consecutiveFails = Math.max(
          0,
          repairedCamp.consecutiveFails - 1,
        );
        if (
          repairedCamp.startDate === today &&
          repairedCamp.daysCompleted === 0 &&
          repairedCamp.failDays === 0 &&
          repairedCamp.successDays === 0 &&
          progress.shieldCharges === 0 &&
          progress.srPenalty === 0
        ) {
          progress.shieldCharges = 1;
          eventNote = `${currentRank.title} provisional. Training camp started.`;
        }
      }

      repairedCamp.lastEvaluatedDate =
        repairedCamp.daysCompleted > 0 ? latestClosedDate : null;
      progress.trainingCamp = this.normalizeTrainingCampState(repairedCamp);
      trainingCamp = progress.trainingCamp;
    }

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
          this.shiftDateString(trainingCamp.lastEvaluatedDate, 1),
          latestClosedDate,
        )
        : this.getDateStringsBetween(trainingCamp.startDate, latestClosedDate);

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
            progress.lastProcessedDate = latestClosedDate;
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
            progress.lastProcessedDate = latestClosedDate;
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
            progress.lastProcessedDate = latestClosedDate;
            progress.trainingCamp = this.normalizeTrainingCampState();
            trainingCamp = progress.trainingCamp;
            rankState = "confirmed";
            eventNote = `${provisionalRank?.title || "Provisional rank"} training camp ended below ${trainingCampSuccessRequirement}/10 successful days. Demoted to ${currentRank.title}.`;
          }
          break;
        }
      }
    }

    if (
      !progress.trainingCamp.active &&
      progress.lastProcessedDate !== latestClosedDate
    ) {
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

      progress.lastProcessedDate = latestClosedDate;
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
      if (camp.failDays > 0) reasons.push(`${camp.failDays}/3 total misses`);
      if (camp.consecutiveFails > 0)
        reasons.push(`${camp.consecutiveFails}/2 consecutive misses`);
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
      const dateKey = Number.isFinite(Number(task.startTime))
        ? this.getShadowDayDate(new Date(Number(task.startTime)))
        : String(task.date || "").trim();
      if (!dateKey) return;
      dailyMap.set(
        dateKey,
        (dailyMap.get(dateKey) || 0) + task.duration,
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
    return this.app.getLoggedDistractionMinutesForDate(
      dateStr,
      this.app.state.tasks,
    );
  }

  getHistoricalShadowThresholdMap(
    startDateStr = null,
    endDateStr = this.getShadowDayDate(new Date()),
  ) {
    const dailyMap = this.getDailyProductiveMap();
    const baseline = Math.max(
      1,
      Number(CONFIG.DAILY_PRODUCTIVITY_THRESHOLD_MINUTES || 240),
    );
    const firstTrackedDate = [...dailyMap.keys()].sort()[0] || endDateStr;
    const startDate = this.parseCalendarDate(
      (startDateStr && startDateStr < firstTrackedDate)
        ? startDateStr
        : firstTrackedDate,
    );
    const endDate = this.parseCalendarDate(endDateStr);
    const days = [];
    const thresholdMap = new Map();

    for (
      const cursor = new Date(startDate);
      cursor <= endDate;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      days.push(this.formatCalendarDate(cursor));
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

  getHistoricalLockedShadowMap(
    startDateStr = null,
    endDateStr = this.getShadowDayDate(new Date()),
  ) {
    const dailyMap = this.getDailyProductiveMap();
    const baseline = Math.max(
      1,
      Number(CONFIG.DAILY_PRODUCTIVITY_THRESHOLD_MINUTES || 240),
    );
    const firstTrackedDate = [...dailyMap.keys()].sort()[0] || endDateStr;
    const requestedStartStr = startDateStr || firstTrackedDate;
    const historyStartStr =
      requestedStartStr < firstTrackedDate
        ? requestedStartStr
        : firstTrackedDate;
    const historyStart = this.parseCalendarDate(historyStartStr);
    const requestedStart = this.parseCalendarDate(requestedStartStr);
    const endDate = this.parseCalendarDate(endDateStr);
    if (!historyStart || !requestedStart || !endDate || historyStart > endDate) {
      return new Map();
    }

    const days = [];
    for (
      const cursor = new Date(historyStart);
      cursor <= endDate;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      days.push(this.formatCalendarDate(cursor));
    }

    const prefix = new Array(days.length + 1).fill(0);
    for (let i = 0; i < days.length; i += 1) {
      prefix[i + 1] = prefix[i] + (dailyMap.get(days[i]) || 0);
    }

    const lockedMap = new Map();
    for (let i = 0; i < days.length; i += 1) {
      const dateStr = days[i];
      const completedDays = i;
      const windowStart = Math.max(0, completedDays - 7);
      const rollingAvg =
        completedDays > 0
          ? (prefix[completedDays] - prefix[windowStart]) / 7
          : baseline;
      const locked = Math.max(1, Math.round(rollingAvg || baseline));
      if (dateStr >= requestedStartStr) {
        lockedMap.set(dateStr, locked);
      }
    }

    return lockedMap;
  }

  getHistoricalBattleTargetMap(
    startDateStr = null,
    endDateStr = this.getShadowDayDate(new Date()),
  ) {
    const lockedMap = this.getHistoricalLockedShadowMap(
      startDateStr,
      endDateStr,
    );
    const targetMap = new Map();
    lockedMap.forEach((lockedShadow, dateStr) => {
      targetMap.set(dateStr, Math.max(1, Number(lockedShadow || 0) + 1));
    });

    return targetMap;
  }

  getWinLadder(dailyMap, shadowAvg) {
    const targetMap = this.getHistoricalBattleTargetMap(
      this.shiftDateString(this.getShadowDayDate(new Date()), -6),
      this.getShadowDayDate(new Date()),
    );
    const days = [];
    const today = this.getShadowActiveDate();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = this.formatCalendarDate(d);
      const minutes = dailyMap.get(ds) || 0;
      const target =
        targetMap.get(ds) ||
        (shadowAvg > 0
          ? Math.max(1, Math.round(shadowAvg) + 1)
          : Math.max(
            1,
            Number(CONFIG.DAILY_PRODUCTIVITY_THRESHOLD_MINUTES || 240),
          ));
      days.push({ date: ds, win: minutes >= target, target });
    }
    const winsIn5 = days.slice(-5).filter((d) => d.win).length;
    const winsIn7 = days.filter((d) => d.win).length;
    return {
      winsIn5,
      winsIn7,
      status3in5: `${winsIn5}/5 need 3`,
      status5in7: `${winsIn7}/7 need 5`,
      clear3in5: winsIn5 >= 3,
      clear5in7: winsIn7 >= 5,
    };
  }

  getShadowStandardForDate(endDateStr, fallbackShadowAvg = 0) {
    const anchorDate = this.parseCalendarDate(endDateStr);
    if (!anchorDate) {
      return Math.max(0, Math.round(Number(fallbackShadowAvg || 0)));
    }

    const dailyMap = this.getDailyProductiveMap();
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(anchorDate);
      d.setDate(anchorDate.getDate() - i);
      last7.push(dailyMap.get(this.formatCalendarDate(d)) || 0);
    }

    const sorted7 = [...last7].sort((a, b) => a - b);
    const p70Index = Math.max(0, Math.ceil(0.7 * sorted7.length) - 1);
    return Math.max(
      0,
      Math.round(sorted7[p70Index] || fallbackShadowAvg || 0),
    );
  }

  buildShadowBuddySnapshot(
    lockedDateStr = this.shiftDateString(this.getShadowDayDate(new Date()), -1),
    resolvedShadow = this.shadowSevenDayAverage,
  ) {
    const metrics = lockedDateStr
      ? this.computeRollingMetrics(lockedDateStr)
      : { currentAvg: 0 };
    const shadowAvg = Math.max(0, Math.round(Number(resolvedShadow || 0)));
    const currentAvg = Math.max(0, Math.round(Number(metrics.currentAvg || 0)));

    return {
      lockedDate: lockedDateStr || null,
      shadowAvg,
      currentAvg,
      shadowStandard: this.getShadowStandardForDate(lockedDateStr, shadowAvg),
      targetToday: shadowAvg > 0 ? Math.ceil(shadowAvg + 1) : 0,
      weeklyGap: shadowAvg - currentAvg,
    };
  }

  resolveShadowBuddySnapshot(resolvedShadow = this.shadowSevenDayAverage) {
    const boundaryKey = this.getShadowDayDate(new Date());
    const lockMeta = this.getShadowLockMeta();
    const lockedDate =
      lockMeta.lastLockedDate && lockMeta.lastLockedDate <= boundaryKey
        ? lockMeta.lastLockedDate
        : this.shiftDateString(boundaryKey, -1);
    const cached = this.getShadowBuddySnapshot();
    const normalizedShadow = Math.max(
      0,
      Math.round(Number(resolvedShadow || 0)),
    );

    if (
      cached.date === boundaryKey &&
      cached.metrics &&
      cached.metrics.lockedDate === lockedDate &&
      Math.max(0, Math.round(Number(cached.metrics.shadowAvg || 0))) ===
        normalizedShadow
    ) {
      return cached.metrics;
    }

    const snapshot = this.buildShadowBuddySnapshot(lockedDate, normalizedShadow);
    this.saveShadowBuddySnapshot(boundaryKey, snapshot);
    return snapshot;
  }

  buildDailyProductiveSeries(endDateStr = this.getShadowDayDate(new Date())) {
    const dailyMap = this.getDailyProductiveMap();
    if (dailyMap.size === 0) return [];

    const sorted = [...dailyMap.keys()].sort();
    const start = this.parseCalendarDate(sorted[0]);
    const end = this.parseCalendarDate(endDateStr);
    if (!start || !end || start > end) return [];
    const series = [];

    for (
      let cursor = new Date(start);
      cursor <= end;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const key = this.formatCalendarDate(cursor);
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
    const today = this.getShadowActiveDate();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      series7.push(dailyMap.get(this.formatCalendarDate(d)) || 0);
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
    const today = this.app.getActiveDate();
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

  computeRollingMetrics(endDateStr = this.getShadowDayDate(new Date())) {
    const series = this.buildDailyProductiveSeries(endDateStr);
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
        includeDelta: false,
      };
    const delta = currentAvg - previousAvg;
    if (delta > 8)
      return {
        label: "Rising",
        cls: "shadow-momentum-positive",
        includeDelta: true,
      };
    if (delta < -8)
      return {
        label: "Drifting",
        cls: "shadow-momentum-negative",
        includeDelta: true,
      };
    return {
      label: "Stable",
      cls: "shadow-momentum-flat",
      includeDelta: false,
    };
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
    const now = this.getShadowActiveDate();
    const month = now.getMonth();
    const year = now.getFullYear();
    const monthDays = [];
    let myWins = 0;
    const activeDays = now.getDate(); // elapsed days in current month
    const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const targetMap = this.getHistoricalBattleTargetMap(
      monthStart,
      this.formatCalendarDate(now),
    );

    for (let day = 1; day <= activeDays; day++) {
      const d = new Date(year, month, day, 12, 0, 0, 0);
      const date = this.formatCalendarDate(d);
      const minutes = dailyMap.get(date) || 0;
      const target =
        targetMap.get(date) ||
        (shadowAvg > 0
          ? Math.max(1, Math.round(shadowAvg) + 1)
          : Math.max(
            1,
            Number(CONFIG.DAILY_PRODUCTIVITY_THRESHOLD_MINUTES || 240),
          ));
      const isWin = minutes >= target;
      if (isWin) myWins++;
      monthDays.push({ date, isWin, target });
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

  getDefenseTarget(shadowAvg, penaltyMinutes, weeklyGap, todayMinutes = 0) {
    const baseShadow = Math.max(0, Math.round(shadowAvg || 0));
    if (baseShadow <= 0) return 0;

    const penaltyCarry = Math.min(
      20,
      Math.ceil(Math.max(0, penaltyMinutes || 0) * 0.2),
    );
    const weeklyGapCarry = weeklyGap > 15 ? 5 : 0;
    const lowOutputCarry = todayMinutes < baseShadow * 0.5 ? 5 : 0;
    const totalCarry = Math.min(
      20,
      penaltyCarry + weeklyGapCarry + lowOutputCarry,
    );

    return baseShadow + totalCarry;
  }

  commitLockedShadowAverage(dateStr, { autoBoundaryKey = null } = {}) {
    if (!dateStr) return { locked: false, isNewStandard: false };

    const previousShadow = Math.max(
      0,
      Math.round(Number(this.shadowSevenDayAverage || 0)),
    );
    const resolvedShadow = Math.max(
      0,
      Math.round(
        Number(
          this.getHistoricalLockedShadowMap(dateStr, dateStr).get(dateStr) || 0,
        ),
      ),
    );

    this.shadowSevenDayAverage = resolvedShadow;
    this.app.saveToStorage(
      CONFIG.STORAGE_KEYS.SHADOW_AVG,
      resolvedShadow,
    );

    const lockMeta = {
      shadowLastLockedDate: dateStr,
    };
    if (autoBoundaryKey) {
      lockMeta.shadowLastAutoBoundaryKey = autoBoundaryKey;
    }
    this.saveShadowLockMeta(lockMeta);

    return {
      locked: true,
      isNewStandard: resolvedShadow > previousShadow,
      shadowAvg: resolvedShadow,
    };
  }

  maybeAutoLockShadowAverage() {
    const boundaryKey = this.getShadowDayDate(new Date());
    const targetDate = this.shiftDateString(boundaryKey, -1);
    if (!targetDate) return { locked: false, isNewStandard: false };

    const lockMeta = this.getShadowLockMeta();
    if (lockMeta.lastAutoBoundaryKey === boundaryKey) {
      return { locked: false, isNewStandard: false };
    }

    if (lockMeta.lastLockedDate && lockMeta.lastLockedDate >= targetDate) {
      this.saveShadowLockMeta({
        shadowLastAutoBoundaryKey: boundaryKey,
      });
      return { locked: false, isNewStandard: false };
    }

    return this.commitLockedShadowAverage(targetDate, {
      autoBoundaryKey: boundaryKey,
    });
  }

  lockShadowAverageForToday() {
    const result = this.commitLockedShadowAverage(
      this.getShadowDayDate(new Date()),
    );
    this.refresh(false);
    this.app.graphManager?.updateCharts?.();
    return result;
  }

  resolveLockedShadowAverage(boundaryKey = this.getShadowDayDate(new Date())) {
    return Math.max(
      0,
      Math.round(
        Number(
          this.getHistoricalLockedShadowMap(boundaryKey, boundaryKey).get(boundaryKey) || 0,
        ),
      ),
    );
  }

  render({
    todayMinutes,
    shadowAvg,
    currentAvg,
    previousAvg,
    hasMomentumBaseline,
    buddySnapshot,
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
    const todayDate = this.getShadowDayDate(new Date());
    const taskDate = this.app.getDateString(new Date());
    const goalProgress = this.getTodayGoalProgress(taskDate);
    const missionScore = this.calculateMissionScore(goalProgress);
    const distractionMinutes = this.getTodayDistractionMinutes(taskDate);
    const penalty = this.getPenalty(
      todayMinutes,
      shadowAvg,
      weeklyGap,
      competition.recentWinRate,
      distractionMinutes,
      missionScore,
    );
    const ladder = this.getWinLadder(dailyMap, shadowAvg);
    const defenseTarget = this.getDefenseTarget(
      shadowAvg,
      penalty.minutes,
      weeklyGap,
      todayMinutes,
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
    const today = this.getShadowActiveDate();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = this.formatCalendarDate(d);
      last7.push(dailyMap.get(ds) || 0);
    }
    const sorted7 = [...last7].sort((a, b) => a - b);
    const p70Index = Math.max(0, Math.ceil(0.7 * sorted7.length) - 1);
    const shadowStandard = sorted7[p70Index] || shadowAvg;
    const lockedBuddyShadowAvg = Math.max(
      0,
      Math.round(Number(buddySnapshot?.shadowAvg ?? shadowAvg)),
    );
    const lockedBuddyWeeklyAvg = Math.max(
      0,
      Math.round(Number(buddySnapshot?.currentAvg ?? currentAvg)),
    );
    const lockedBuddyStandard = Math.max(
      0,
      Math.round(Number(buddySnapshot?.shadowStandard ?? shadowStandard)),
    );
    const lockedBuddyTarget = Math.max(
      0,
      Math.round(
        Number(
          buddySnapshot?.targetToday ??
            (lockedBuddyShadowAvg > 0
              ? Math.ceil(lockedBuddyShadowAvg + 1)
              : 0),
        ),
      ),
    );
    const lockedBuddyWeeklyGap = Math.round(
      Number(
        buddySnapshot?.weeklyGap ??
          (lockedBuddyShadowAvg - lockedBuddyWeeklyAvg),
      ),
    );
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
    const todayCampMinutes = campActive ? dailyMap.get(todayDate) || 0 : 0;
    const campCanPreviewToday =
      campActive &&
      Boolean(camp.startDate) &&
      todayDate >= camp.startDate &&
      camp.lastEvaluatedDate !== todayDate &&
      camp.daysCompleted < this.getTrainingCampLength();
    const campTodayClearPending =
      campCanPreviewToday && todayCampMinutes >= camp.targetMinutes;
    const campDisplaySuccessDays =
      camp.successDays + (campTodayClearPending ? 1 : 0);
    const campDisplayCounters = campTodayClearPending
      ? `${campDisplaySuccessDays}/${this.getTrainingCampSuccessRequirement()} clears* | ${camp.failDays}/3 misses`
      : `${camp.successDays}/${this.getTrainingCampSuccessRequirement()} clears | ${camp.failDays}/3 misses`;
    const campLiveStatus = campCanPreviewToday
      ? campTodayClearPending
        ? `Today clear pending lock`
        : `Today ${this.app.formatDuration(todayCampMinutes)} / ${this.app.formatDuration(camp.targetMinutes)}`
      : "";
    const activeRankLabel = campActive
      ? `${activeRank.title} Provisional`
      : `${activeRank.title} Confirmed`;
    const shieldLabel =
      rankProgress.progress.shieldCharges > 0 ? "Ready" : "Broken";
    const shadowPanelVisible =
      this.app.elements["shadow-current-minutes"] ||
      this.app.elements["shadow-standard-card"];

    if (!shadowPanelVisible) {
      if (this.app.elements["shadow-mission-score"])
        this.app.elements["shadow-mission-score"].textContent =
          `${missionScore}/100`;
      if (this.app.trainerEngine?.syncMissionFromRoadmap)
        this.app.trainerEngine.syncMissionFromRoadmap();
      if (this.app.trainerEngine?.updatePenaltyTimer)
        this.app.trainerEngine.updatePenaltyTimer();
      return;
    }

    this.app.elements["shadow-current-minutes"].textContent =
      this.app.formatDuration(todayMinutes);
    this.app.elements["shadow-average"].textContent =
      this.app.formatDuration(lockedBuddyShadowAvg);
    this.app.elements["shadow-weekly-average"].textContent =
      this.app.formatDuration(lockedBuddyWeeklyAvg);
    if (this.app.elements["shadow-note"]) {
      const lockedDate = this.app.parseDateKey(buddySnapshot?.lockedDate);
      this.app.elements["shadow-note"].textContent = lockedDate
        ? `Locked after ${lockedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} close`
        : "Locked from completed days only";
    }
    if (this.app.elements["shadow-standard-metric"])
      this.app.elements["shadow-standard-metric"].textContent =
        this.app.formatDuration(lockedBuddyStandard);
    if (this.app.elements["shadow-momentum-score"])
      this.app.elements["shadow-momentum-score"].textContent =
        `${momentumScore.toFixed(2)}x`;
    if (this.app.elements["shadow-consistency-index"])
      this.app.elements["shadow-consistency-index"].textContent =
        consistencyIndex;
    if (this.app.elements["shadow-growth-trend"])
      this.app.elements["shadow-growth-trend"].textContent = growthTrend;
    this.app.elements["shadow-target"].textContent =
      this.app.formatDuration(lockedBuddyTarget);
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
      const end = this.app.getActiveDayEnd(now);
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
      `Last 5: ${ladder.status3in5} | Last 7: ${ladder.status5in7}`;
    this.app.elements["shadow-mission-score"].textContent =
      `${missionScore}/100`;
    this.app.elements["shadow-weekly-gap"].textContent =
      `${lockedBuddyWeeklyGap >= 0 ? "-" : "+"}${this.app.formatDuration(Math.abs(lockedBuddyWeeklyGap))}`;
    this.app.elements["shadow-weekly-gap"].className =
      lockedBuddyWeeklyGap > 0
        ? "shadow-gap-positive"
        : lockedBuddyWeeklyGap < 0
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
    momentumEl.textContent = momentum.includeDelta
      ? `${momentum.label} (${momentumDeltaText})`
      : momentum.label;
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
      ? `${pressure.label} | ${pressure.reasons.slice(0, 2).join(", ")}`
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

    if (this.app.elements["shadow-next-rank-label"])
      this.app.elements["shadow-next-rank-label"].textContent = campActive
        ? "Confirmation Trial"
        : nextRank
          ? "Next Rank"
          : "Rank Ceiling";
    if (this.app.elements["shadow-next-rank"])
      this.app.elements["shadow-next-rank"].textContent = campActive
        ? `${activeRank.title} Provisional`
        : nextRank
          ? nextRank.title
          : "Top rank secured";
    if (this.app.elements["shadow-next-rank-sub"])
      this.app.elements["shadow-next-rank-sub"].textContent = campActive
        ? campLiveStatus
          ? `${campDisplayCounters} | ${campLiveStatus}`
          : campDisplayCounters
        : nextRank
          ? rankProgress.reasons.length
            ? rankProgress.reasons.join(" | ")
            : shadowRating.gate.met
              ? `${srGap} to go`
              : `${srGap} to go | ${shadowRating.gate.reason}`
          : "BrahMos ceiling held";

    this.app.elements["shadow-lead-margin"].textContent =
      `Lead Margin: ${Math.abs(scoreDiff)}`;
    this.app.elements["shadow-trend"].textContent =
      `Monthly trend: ${(competition.recentWinRate * 100).toFixed(0)}% win rate`;
    this.app.elements["shadow-verdict"].textContent =
      scoreDiff >= 0
        ? `You lead monthly by ${Math.abs(scoreDiff)} day-win(s); hold at least ${this.app.formatDuration(defenseTarget)} tomorrow. Mission ${missionScore}/100.`
        : `You are behind by ${this.app.formatDuration(neededTie)} today and ${Math.abs(scoreDiff)} monthly day-win(s). Mission ${missionScore}/100.`;

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
        ? `Need ${srGap} SR. Daily trial target: ${this.app.formatDuration(rankProgress.trialTargetMinutes)}.`
        : "BrahMos held. Focus on maintaining the floor.";
    if (campActive) {
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
          `${campDisplayCounters}${campLiveStatus ? ` | ${campLiveStatus}` : ""} | Streak ${camp.consecutiveFails}/2 | Floor ${this.app.formatDuration(camp.targetMinutes)}`;
      if (this.app.elements["shadow-rank-note-sub"])
        this.app.elements["shadow-rank-note-sub"].textContent =
          `Shadow Buddy says ${activeRank.title} training camp day ${camp.daysCompleted}/${this.getTrainingCampLength()}. Today ${this.app.formatDuration(todayCampMinutes)} / ${this.app.formatDuration(camp.targetMinutes)}.${campTodayClearPending ? " Clear preview is live and locks after day close." : " Trial days lock after the day closes."} Demotion on 2 consecutive or 3 total misses.`;
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
    const autoLock = this.maybeAutoLockShadowAverage();
    const metrics = this.computeRollingMetrics();
    const resolvedShadow = this.resolveLockedShadowAverage();
    if (resolvedShadow !== Math.max(0, Math.round(Number(this.shadowSevenDayAverage || 0)))) {
      this.shadowSevenDayAverage = resolvedShadow;
      this.app.saveToStorage(
        CONFIG.STORAGE_KEYS.SHADOW_AVG,
        resolvedShadow,
      );
    }
    const buddySnapshot = this.resolveShadowBuddySnapshot(resolvedShadow);

    this.render({
      todayMinutes: metrics.todayMinutes,
      shadowAvg: resolvedShadow,
      currentAvg: metrics.currentAvg,
      previousAvg: metrics.previousAvg,
      hasMomentumBaseline: metrics.hasMomentumBaseline,
      buddySnapshot,
      isNewStandard: allowAnimation && autoLock.isNewStandard,
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
    const today = this.app.getActiveDate();
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
    const d = this.app.parseDateKey(dateStr);
    const t = this.app.getActiveDate();
    if (!d || !t) return Infinity;
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
    const dayEnd = this.app.getActiveDayEnd(now);
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
Win Ladder: Last 5 ${d.winLadder.status3in5}${d.winLadder.clear3in5 ? " [CLEAR]" : ""} | Last 7 ${d.winLadder.status5in7}${d.winLadder.clear5in7 ? " [CLEAR]" : ""}
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

  getDailyRoadmapTopicSlots(limit = 4) {
    this.ensureRoadmap();
    const today = this.getCurrentMissionDateKey();
    const rolloverArmedDate = this.state.roadmapAdvanceAfterDate || null;
    const canAdvanceToday = !!rolloverArmedDate && rolloverArmedDate !== today;

    let learningSlots = null;
    if (this.state.roadmapSlotsDate === today) {
      learningSlots = this.state.roadmapSlots;
    } else if (this.state.roadmapSlots && !canAdvanceToday) {
      learningSlots = this.state.roadmapSlots;
    }

    if (!learningSlots) {
      learningSlots = this.getPendingRoadmapTopics(limit);
      this.state.roadmapSlotsDate = today;
      this.state.roadmapSlots = learningSlots;
      if (canAdvanceToday) this.state.roadmapAdvanceAfterDate = null;
      this.saveTrainerState();
    }

    return (learningSlots || []).slice(0, limit);
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

  splitTaskFunctionArgs(argsText = "") {
    const parts = [];
    let current = "";
    let quote = null;
    let bracketDepth = 0;

    for (let i = 0; i < argsText.length; i += 1) {
      const ch = argsText[i];
      const prev = i > 0 ? argsText[i - 1] : "";

      if (quote) {
        current += ch;
        if (ch === quote && prev !== "\\") quote = null;
        continue;
      }

      if (ch === '"' || ch === "'") {
        quote = ch;
        current += ch;
        continue;
      }

      if (ch === "[") {
        bracketDepth += 1;
        current += ch;
        continue;
      }

      if (ch === "]") {
        bracketDepth = Math.max(0, bracketDepth - 1);
        current += ch;
        continue;
      }

      if (ch === "," && bracketDepth === 0) {
        parts.push(current.trim());
        current = "";
        continue;
      }

      current += ch;
    }

    if (current.trim()) parts.push(current.trim());
    return parts;
  }

  parseTaskValueToken(token = "") {
    const trimmed = String(token).trim();
    if (!trimmed) return "";
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    return trimmed;
  }

  parseTaskWinToken(token = "") {
    const match = String(token).trim().match(/^\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]$/);
    if (!match) return null;
    return [Number(match[1]), Number(match[2])];
  }

  isQuotedTaskStringToken(token = "") {
    const trimmed = String(token).trim();
    return (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    );
  }

  findTaskPlanPlaceholderTokens(raw = "") {
    const source = this.normalizeExternalText(raw);
    if (!source) return [];

    const placeholderTokens = [];
    const matches = [...source.matchAll(/makeTask\s*\(([\s\S]*?)\)/g)];
    matches.forEach((match) => {
      const args = this.splitTaskFunctionArgs(match[1] || "");
      if (args.length < 2) return;
      const topicToken = String(args[1] || "").trim();
      if (!topicToken || this.isQuotedTaskStringToken(topicToken)) return;
      if (topicToken === "true" || topicToken === "false") return;
      if (/^-?\d+(\.\d+)?$/.test(topicToken)) return;
      placeholderTokens.push(topicToken);
    });

    return [...new Set(placeholderTokens)];
  }

  getPendingRoadmapTopics(limit = Infinity) {
    this.ensureRoadmap();
    const topics = [];
    const modules = this.state.roadmap?.modules || [];
    modules.forEach((module) => {
      (module.days || []).forEach((day) => {
        if (day?.completed) return;
        const topic = String(day.text || "").split("\n")[0].trim();
        if (!topic) return;
        topics.push(topic);
      });
    });
    return topics.slice(0, limit);
  }

  resolveTaskPlaceholderTopic(token = "", placeholderIndex = 0) {
    const placeholder = String(token || "").trim();
    if (!placeholder) return null;

    const normalized = placeholder.toLowerCase();
    const isGenericRoadmapPlaceholder =
      /^roadmaptopic\d+$/.test(normalized) ||
      normalized === "roadmapreviewtopic";

    if (!isGenericRoadmapPlaceholder) {
      return null;
    }

    const dailySlots = this.getDailyRoadmapTopicSlots();
    if (!dailySlots.length) return null;

    const numberMatch = normalized.match(/(\d+)/);
    let topicIndex = Number.isInteger(placeholderIndex) ? placeholderIndex : 0;
    if (numberMatch) topicIndex = Math.max(0, Number(numberMatch[1]) - 1);

    const selectedTopic =
      dailySlots[Math.min(topicIndex, dailySlots.length - 1)] ||
      dailySlots[0];

    if (/(review|revision|recap)/.test(normalized)) {
      return `Review: ${selectedTopic}`;
    }

    return selectedTopic;
  }

  parseTaskPlanCode(raw = "") {
    const source = this.normalizeExternalText(raw);
    if (!source) return [];

    try {
      const arr = JSON.parse(source);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map(task => {
          const topic = task.topic || task.title || "Task";
          const progress = this.getTopicProgress(topic);
          const targetMinutes = task.target_minutes || task.durationMins || 0;
          return {
            type: "custom",
            topic,
            label: task.label || task.title || topic,
            progress,
            done: progress.minutes >= targetMinutes,
            win: task.win || [0, 24],
            priority: String(task.priority || "MEDIUM").toUpperCase(),
            discipline_type: String(task.discipline_type || "FLEXIBLE").toUpperCase(),
            phase: task.phase || task.category || "Core Study",
            secondary: !!task.secondary,
            score_weight: task.score_weight || 0,
            target_minutes: targetMinutes,
            estimated_minutes: task.estimated_minutes || targetMinutes,
          };
        });
      }
    } catch(e) {}

    const matches = [...source.matchAll(/makeTask\s*\(([\s\S]*?)\)/g)];
    if (!matches.length) return [];

    if (matches[0] && matches[0][1].trim().startsWith('{')) {
      const parsedTasks = matches.map(match => {
        let objStr = match[1].trim();
        try {
          const obj = new Function("return " + objStr)();
          if (!obj) return null;
          
          const topic = obj.topic || obj.title || "Task";
          const label = obj.label || obj.title || topic;
          const progress = this.getTopicProgress(topic);
          const targetMinutes = obj.target_minutes || obj.durationMins || 0;
          
          let win = obj.win;
          if (!win && obj.startTime && obj.endTime && typeof obj.startTime === 'string' && typeof obj.endTime === 'string') {
            const parseTime = (t) => {
               const parts = t.split(':').map(Number);
               return (parts[0] || 0) + ((parts[1] || 0) / 60);
            };
            win = [parseTime(obj.startTime), parseTime(obj.endTime)];
          }
          
          return {
             type: "custom",
             topic,
             label,
             progress,
             done: progress.minutes >= targetMinutes,
             win: win || [0, 24],
             priority: String(obj.priority || "MEDIUM").toUpperCase(),
             discipline_type: String(obj.discipline_type || "FLEXIBLE").toUpperCase(),
             phase: obj.phase || obj.category || "Core Study",
             secondary: !!obj.secondary,
             score_weight: obj.score_weight || 0,
             target_minutes: targetMinutes,
             estimated_minutes: obj.estimated_minutes || targetMinutes,
          };
        } catch(e) {
          return null;
        }
      }).filter(Boolean);
      if (parsedTasks.length > 0) return parsedTasks;
    }

    let placeholderIndex = 0;
    const parsedTasks = matches.map((match) => {
      const args = this.splitTaskFunctionArgs(match[1] || "");
      if (args.length < 9) return null;

      const labelPrefix = this.parseTaskValueToken(args[0]);
      const rawTopicToken = String(args[1] || "").trim();
      const topicValue = this.isQuotedTaskStringToken(rawTopicToken)
        ? this.parseTaskValueToken(rawTopicToken)
        : this.resolveTaskPlaceholderTopic(rawTopicToken, placeholderIndex++);
      const win = this.parseTaskWinToken(args[2]);
      const priority = this.parseTaskValueToken(args[3]);
      const disciplineType = this.parseTaskValueToken(args[4]);
      const targetMinutes = Number(this.parseTaskValueToken(args[5]) || 0);
      const phase = this.parseTaskValueToken(args[6]);
      const secondary = !!this.parseTaskValueToken(args[7]);
      const scoreWeight = Number(this.parseTaskValueToken(args[8]) || 0);

      if (!win || !Number.isFinite(targetMinutes)) return null;
      if (typeof topicValue !== "string" || !topicValue.trim()) return null;

      const topic = String(topicValue || "").trim() || "Task";
      let label = String(labelPrefix || "").trim() || topic;
      if (label && topic && label !== topic) {
        label = `${label}: ${topic}`;
      }

      const progress = this.getTopicProgress(topic);
      return {
        type: "custom",
        topic,
        label,
        progress,
        done: progress.minutes >= targetMinutes,
        win,
        priority: String(priority || "MEDIUM"),
        discipline_type: String(disciplineType || "FLEXIBLE"),
        phase: String(phase || "Core Study"),
        secondary,
        score_weight: scoreWeight,
        target_minutes: targetMinutes,
        estimated_minutes:
          String(disciplineType || "").toUpperCase() === "FLEXIBLE"
            ? Math.round(targetMinutes * (this.state.antiMisuseMult || CONFIG.FLEXIBLE_TASK_MULTIPLIER))
            : targetMinutes,
      };
    }).filter(Boolean);

    return parsedTasks;
  }

  getDailyMissionTasks() {
    const savedTaskPlan = this.parseTaskPlanCode(
      this.app.loadFromStorage(CONFIG.STORAGE_KEYS.TASK_RESPONSE_DRAFT) || "",
    );
    if (savedTaskPlan.length) {
      return savedTaskPlan;
    }

    const active = this.getActiveRoadmapDay();
    let learningSlots = this.getDailyRoadmapTopicSlots(4);
    if ((!learningSlots || !learningSlots.length) && active) {
      learningSlots = [(active.day.text || "").split("\n")[0].trim()].filter(Boolean);
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
    return `${fmt(startH)} - ${fmt(endH)}`;
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

      // Persist manual check state locally + sync tiny missionChecks doc only
      const checks = this.getTodayManualMissionChecks();
      checks[checkId] = !!e.target.checked;
      localStorage.setItem(CONFIG.STORAGE_KEYS.TRAINER_STATE, JSON.stringify(this.state));
      this.updateMissionChecklistScore();
      const today = this.app.getDateString(new Date());
      this.app.cloudManager?.syncMissionChecks?.(today, checks);

      if (this.syncRoadmapDayFromMissionTopic(cached?.item?.topic, !!e.target.checked)) {
        this.armRoadmapSlotRollover();
        this.renderRoadmap();
        this.syncMissionFromRoadmap({ rebuild: false });
        this.app.shadowEngine?.refresh(false);
      }
    }, { passive: true });

    // ── Click-to-start: clicking a task title immediately starts the timer ──
    document.addEventListener("click", (e) => {
      // Match clicks on .mission-title span or .mission-copy div (but not checkbox)
      const titleEl = e.target.closest(".mission-title") || e.target.closest(".mission-copy");
      if (!titleEl) return;
      // Don't trigger if the click landed on or inside the checkbox
      if (e.target.closest(".mission-check") || e.target.type === "checkbox") return;
      const row = titleEl.closest(".shadow-goal-item");
      if (!row) return;
      const checkId = row.dataset.checkId;
      if (!checkId) return;
      const cached = this._missionStateCache?.get(checkId);
      if (!cached) return;
      const item = cached.item;
      if (!item) return;
      // Don't restart a task that's already done
      if (cached.done) return;
      // Build meta for the stopwatch with mission tracking fields
      const taskLabel = item.label || item.topic || "Mission Task";
      const meta = {
        category: "Productive Work",
        subcategory: item.topic || taskLabel,
        description: taskLabel,
        missionTopic: item.topic || "",
        missionCheckId: checkId,
        missionTargetMinutes: item.target_minutes || 0,
      };
      // Track which mission task is active so stop() can auto-complete it
      this._activeMissionCheckId = checkId;
      this._activeMissionTargetMinutes = item.target_minutes || 0;
      // Populate the task input for visibility in the stopwatch area
      if (this.app.elements["task-input"] && !this.app.stopwatch.isRunning) {
        this.app.elements["task-input"].value = taskLabel;
      }
      this.app.stopwatch.start(taskLabel, meta);
    });
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

    const renderEntrySet = (entries, secondary = false) => {
      if (!entries.length) return "";
      return `<div class="mission-phase-items${secondary ? " secondary" : ""}">${entries.map(({ item, idx }) => renderTask(item, idx)).join("")}</div>`;
    };

    // Phase 0.3: structural innerHTML render â€” ONLY called here, never on interaction
    primaryContainer.innerHTML = renderEntrySet(orderedEntries);
    if (secondaryContainer) {
      secondaryContainer.innerHTML = "";
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
        this.armRoadmapSlotRollover();
        this.normalizeRoadmapDays();
        this.renderRoadmap();
        this.syncMissionFromRoadmap({ rebuild: false });
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
    el.textContent = `${pending} task${pending === 1 ? "" : "s"} left | ${h}:${m}:${s}`;
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
    const placeholderTokens = this.findTaskPlanPlaceholderTokens(raw);
    const parsedTasks = this.parseTaskPlanCode(raw);
    if (!parsedTasks.length) {
      this.setGeneratorStatus(
        "ai-task-status",
        placeholderTokens.length
          ? "Apply a roadmap first so placeholder topics can resolve."
          : "Invalid makeTask code.",
        "error",
      );
      return;
    }
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.TASK_RESPONSE_DRAFT, raw);
    this.syncMissionFromRoadmap();
    this.app.shadowEngine?.refresh(false);
    this.setGeneratorStatus(
      "ai-task-status",
      placeholderTokens.length
        ? "Code applied. Roadmap topic placeholders resolved."
        : "Code applied.",
      "success",
    );
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
8. Make the roadmap fit the user's actual domain and goal, whatever it is.
9. Do not assume any fixed domain unless the topic explicitly says so.
10. Write topics that can later be used directly in task blocks.
11. Output JSON only.

Reference example:
${JSON.stringify(roadmapJson, null, 2)}`;
  }

  buildTaskPromptRoadmapContext() {
    this.ensureRoadmap();
    const modules = this.state.roadmap?.modules || [];
    const active = this.getActiveRoadmapDay();
    const roadmapLines = [];
    const placeholderTopics = this.getPendingRoadmapTopics(4);

    modules.forEach((module, moduleIndex) => {
      const pendingDays = (module.days || [])
        .filter((day) => !day.completed)
        .slice(0, 4)
        .map((day) => `- ${String(day.text || "").split("\n")[0].trim()}`)
        .join("\n");
      if (!pendingDays) return;
      roadmapLines.push(
        `${moduleIndex + 1}. ${module.name}\n${pendingDays}`,
      );
    });

    const activeLine = active?.day?.text
      ? String(active.day.text).split("\n")[0].trim()
      : "No active roadmap day";

    const placeholderGuide = [
      `- roadmapTopic1 -> ${placeholderTopics[0] || activeLine}`,
      `- roadmapTopic2 -> ${placeholderTopics[1] || placeholderTopics[0] || activeLine}`,
      `- roadmapTopic3 -> ${placeholderTopics[2] || placeholderTopics[1] || placeholderTopics[0] || activeLine}`,
      `- roadmapTopic4 -> ${placeholderTopics[3] || placeholderTopics[2] || placeholderTopics[1] || placeholderTopics[0] || activeLine}`,
      `- roadmapReviewTopic -> Review: ${activeLine}`,
    ].join("\n");

    return `Roadmap alignment is mandatory.

Current active roadmap day:
- ${activeLine}

Pending roadmap topics:
${roadmapLines.join("\n\n") || "- No pending roadmap topics found"}

Placeholder slots for this user roadmap:
${placeholderGuide}`;
  }

  buildTaskPromptSpec(topic) {
    const roadmapContext = this.buildTaskPromptRoadmapContext();
    return `You are helping me create a daily scheduler code block.

Return ONLY code.
Do not use markdown.
Do not explain anything.
Do not add comments.

The generated task plan MUST follow the roadmap topics below.
Do not invent an unrelated schedule.
Use the roadmap as the primary source of task focus.

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
11. The second makeTask argument must come from the roadmap topics.
12. You may use real quoted roadmap strings OR these generic placeholder tokens only: roadmapTopic1, roadmapTopic2, roadmapTopic3, roadmapTopic4, roadmapReviewTopic.
13. Do not invent custom variable names outside the roadmapTopic placeholders.
14. If you use a placeholder token, leave it unquoted in the second makeTask argument and the app will resolve it from the current user's roadmap.
15. Use roadmap placeholders only for roadmap-driven study blocks. Keep unrelated blocks like IB, breaks, lunch, dinner, training, and generic revision as normal quoted strings unless they truly come from the roadmap.
16. If extra user context exists, use it only as secondary guidance after the roadmap.

Use this exact style reference:
return [
  makeTask("CORE ", "CA + Reasoning + Quant", [4, 6.25], "HIGH", "STRICT", 135, "Morning", false, 17),
  makeTask("FOCUS BLOCK 1", roadmapTopic1, [6.25, 8.25], "HIGH", "STRICT", 120, "Core Study", false, 11),
  makeTask("BREAK", "Break + Hydration", [8.25, 8.5], "LOW", "FLEXIBLE", 15, "Breaks", true, 1),
  makeTask("FOCUS BLOCK 2", roadmapTopic2, [8.5, 10.5], "HIGH", "STRICT", 120, "Core Study", false, 11),
  makeTask("PRACTICE", "Practice session", [10.5, 12], "MEDIUM", "FLEXIBLE", 90, "Morning", false, 14),
  makeTask("LUNCH", "Lunch", [12, 12.5], "LOW", "FLEXIBLE", 30, "Breaks", true, 1),
  makeTask("BUILD", "Project / Circuits", [12.5, 14.5], "MEDIUM", "FLEXIBLE", 120, "Core Study", false, 10),
  makeTask("FOCUS BLOCK 3", roadmapTopic3, [14.5, 16.5], "HIGH", "STRICT", 120, "Core Study", false, 11),
  makeTask("REVISION", roadmapReviewTopic, [17.5, 18.5], "MEDIUM", "FLEXIBLE", 60, "Evening", false, 5),
  makeTask("DINNER", "Dinner", [18.5, 19], "LOW", "FLEXIBLE", 30, "Breaks", true, 1),
  makeTask("WEAK AREA REVIEW", "Weak-area review", [19, 20], "LOW", "FLEXIBLE", 60, "Evening", true, 4),
  makeTask("TRAINING", "Training", [20, 21], "MEDIUM", "FLEXIBLE", 60, "Evening", true, 3),
  makeTask("FINAL REVISION", "Final revision / recap", [21, 22], "MEDIUM", "FLEXIBLE", 60, "Evening", false, 3),
  makeTask("WIND DOWN", "Wind down", [22, 23], "LOW", "FLEXIBLE", 60, "Evening", true, 1),
  makeTask("REST", "Sleep", [23, 28], "HIGH", "STRICT", 300, "Evening", true, 2),
];

${roadmapContext}

Additional user context:
${topic || "No extra context provided"}`;
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
    const topic = topicEl?.value.trim() || "";
    this.ensureRoadmap();
    if (!this.state.roadmap?.modules?.length) {
      this.setGeneratorStatus(
        "ai-task-status",
        "Apply a roadmap first.",
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
    this.productivityScrollState = {
      isBound: false,
      isSyncing: false,
      scrollRaf: null,
      windowEndDateKey: null,
      maxWeekOffset: 0,
      pageWidth: 0,
      highlightTimeout: null,
    };
  }
  initialize() {
    if (!window.Chart) return;
    this.createCharts();
    this.setupProductivityChartScroll();
    this.applyProductivityChartViewport(
      this.app.elements["prod-range"]?.value || "7d",
    );
    this.setupChartControls();
    this.lastFilteredTotalMinutes = this.getCurrentFilteredTotalMinutes();
    this.animateFilteredTotal(
      0,
      this.lastFilteredTotalMinutes,
      this.rangeUsesAverageSummaries(
        this.app.elements["prod-range"]?.value || "7d",
      )
        ? "average"
        : "total",
    );
    this.updateGraphKpis();
    this.renderGithubHeatmap();
  }

  getRangeDates(range) {
    const today = this.getProductivityRangeEndDate(range);
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
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(12, 0, 0, 0);
    end.setHours(12, 0, 0, 0);
    for (
      const cursor = new Date(start);
      cursor <= end;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      dates.push(this.app.getDateString(cursor));
    }
    return dates;
  }

  getCurrentFilter() {
    return this.app.elements["prod-filter"]?.value || "productivity";
  }

  rangeUsesAverageSummaries(range) {
    return (
      range === "weekly" ||
      range === "15davg" ||
      range === "monthlyavg"
    );
  }

  getProductivityPointCount(range = "7d") {
    if (this.rangeUsesAverageSummaries(range)) return 12;
    return CONFIG.CHART_RANGES[range] || 7;
  }

  isScrollableProductivityRange(range = "7d") {
    return range === "1y";
  }

  getVisibleProductivityPointCount(range = "7d") {
    if (range === "1y") return 31;
    return this.getProductivityPointCount(range);
  }

  getFirstTrackedTaskDate() {
    const taskDates = this.app.state.tasks
      .map((task) => task?.date)
      .filter(Boolean)
      .sort();
    return taskDates[0] || this.app.getDateString(this.app.getActiveDate());
  }

  getDayDifference(laterDate, earlierDate) {
    const later =
      this.app.parseDateKey(this.app.getDateString(laterDate)) ||
      new Date(laterDate);
    const earlier =
      this.app.parseDateKey(this.app.getDateString(earlierDate)) ||
      new Date(earlierDate);
    return Math.max(
      0,
      Math.round((later.getTime() - earlier.getTime()) / 86400000),
    );
  }

  getSevenDayWindowMeta() {
    const latestEndDate = this.app.getActiveDate();
    const firstTrackedDate =
      this.app.parseDateKey(this.getFirstTrackedTaskDate()) || latestEndDate;
    const oldestEndDate = new Date(firstTrackedDate);
    oldestEndDate.setDate(oldestEndDate.getDate() + 6);
    if (oldestEndDate > latestEndDate) {
      oldestEndDate.setTime(latestEndDate.getTime());
    }
    return {
      latestEndDate,
      oldestEndDate,
      maxWeekOffset: Math.floor(
        this.getDayDifference(latestEndDate, oldestEndDate) / 7,
      ),
    };
  }

  clampSevenDayWindowWeeksBack(weeksBack = 0) {
    const safeWeeksBack = Math.round(Number(weeksBack) || 0);
    return Math.max(
      0,
      Math.min(this.getSevenDayWindowMeta().maxWeekOffset, safeWeeksBack),
    );
  }

  getSevenDayWindowEndDateFromWeeksBack(weeksBack = 0) {
    const { latestEndDate } = this.getSevenDayWindowMeta();
    const safeWeeksBack = this.clampSevenDayWindowWeeksBack(weeksBack);
    const endDate = new Date(latestEndDate);
    endDate.setDate(latestEndDate.getDate() - safeWeeksBack * 7);
    return endDate;
  }

  getSelectedSevenDayWindowWeeksBack() {
    const storedDate = this.app.parseDateKey(
      this.productivityScrollState.windowEndDateKey,
    );
    if (!storedDate) return 0;
    const { latestEndDate } = this.getSevenDayWindowMeta();
    return this.clampSevenDayWindowWeeksBack(
      this.getDayDifference(latestEndDate, storedDate) / 7,
    );
  }

  setSelectedSevenDayWindowWeeksBack(weeksBack = 0) {
    const safeWeeksBack = this.clampSevenDayWindowWeeksBack(weeksBack);
    const nextKey = this.app.getDateString(
      this.getSevenDayWindowEndDateFromWeeksBack(safeWeeksBack),
    );
    const didChange =
      this.productivityScrollState.windowEndDateKey !== nextKey;
    this.productivityScrollState.windowEndDateKey = nextKey;
    return didChange;
  }

  getProductivityRangeEndDate(range = "7d") {
    if (range !== "7d") return this.app.getActiveDate();
    return this.getSevenDayWindowEndDateFromWeeksBack(
      this.getSelectedSevenDayWindowWeeksBack(),
    );
  }

  ensureProductivityScrollSpacer(container) {
    let spacer = container.querySelector(".graph-scroll-spacer");
    if (!spacer) {
      spacer = document.createElement("div");
      spacer.className = "graph-scroll-spacer";
      container.appendChild(spacer);
    }
    return spacer;
  }

  teardownProductivityScrollSpacer(container, track) {
    const spacer = container.querySelector(".graph-scroll-spacer");
    if (spacer) spacer.remove();
    delete container.dataset.scrollMode;
    track.style.minWidth = "100%";
  }

  syncSevenDayProductivityViewport(container, track) {
    const spacer = this.ensureProductivityScrollSpacer(container);
    const baseWidth = Math.max(container.clientWidth || 0, 320);
    const { maxWeekOffset } = this.getSevenDayWindowMeta();
    const weeksBack = this.getSelectedSevenDayWindowWeeksBack();
    const safeWeeksBack = this.clampSevenDayWindowWeeksBack(weeksBack);
    if (safeWeeksBack !== weeksBack) {
      this.setSelectedSevenDayWindowWeeksBack(safeWeeksBack);
    }

    this.productivityScrollState.maxWeekOffset = maxWeekOffset;
    this.productivityScrollState.pageWidth = baseWidth;

    container.dataset.scrollMode = "window";
    container.dataset.scrollable = maxWeekOffset > 0 ? "true" : "false";
    track.style.width = `${baseWidth}px`;
    track.style.minWidth = `${baseWidth}px`;
    spacer.style.width = `${Math.max(0, maxWeekOffset * baseWidth)}px`;
    spacer.hidden = maxWeekOffset <= 0;

    requestAnimationFrame(() => {
      this.charts.productivity?.resize();
      const targetScroll = (maxWeekOffset - safeWeeksBack) * baseWidth;
      this.productivityScrollState.isSyncing = true;
      container.scrollLeft = targetScroll;
      requestAnimationFrame(() => {
        this.productivityScrollState.isSyncing = false;
      });
    });
  }

  refreshVisibleProductivityWindow() {
    if (!this.charts.productivity) return;
    const range = this.app.elements["prod-range"]?.value || "7d";
    const filter = this.getCurrentFilter();
    const container = document.getElementById("productivity-chart-container");
    if (container) container.classList.add("filter-updating");

    const fromMinutes = this.lastFilteredTotalMinutes;
    const displayMode = this.rangeUsesAverageSummaries(range)
      ? "average"
      : "total";
    this.charts.productivity.data = this.getProductivityData(range, filter);
    this.charts.productivity.update("none");

    const toMinutes = this.getCurrentFilteredTotalMinutes();
    this.lastFilteredTotalMinutes = toMinutes;
    this.animateFilteredTotal(fromMinutes, toMinutes, displayMode);
    this.updateGraphKpis();

    clearTimeout(this.productivityScrollState.highlightTimeout);
    this.productivityScrollState.highlightTimeout = setTimeout(() => {
      if (container) container.classList.remove("filter-updating");
    }, 180);
  }

  updateSevenDayWindowFromScroll(container) {
    const { pageWidth, maxWeekOffset } = this.productivityScrollState;
    if (!pageWidth) return;
    const snappedPage = Math.max(
      0,
      Math.min(maxWeekOffset, Math.round(container.scrollLeft / pageWidth)),
    );
    const weeksBack = maxWeekOffset - snappedPage;
    if (!this.setSelectedSevenDayWindowWeeksBack(weeksBack)) return;
    this.refreshVisibleProductivityWindow();
  }

  setupProductivityChartScroll() {
    const container = document.getElementById("productivity-chart-container");
    if (!container || this.productivityScrollState.isBound) return;
    container.addEventListener(
      "scroll",
      () => {
        if (this.app.elements["prod-range"]?.value !== "7d") return;
        if (this.productivityScrollState.isSyncing) return;
        if (this.productivityScrollState.scrollRaf) {
          cancelAnimationFrame(this.productivityScrollState.scrollRaf);
        }
        this.productivityScrollState.scrollRaf = requestAnimationFrame(() => {
          this.productivityScrollState.scrollRaf = null;
          this.updateSevenDayWindowFromScroll(container);
        });
      },
      { passive: true },
    );
    this.productivityScrollState.isBound = true;
  }

  getFilteredMinutesForDate(dateStr, filter = "productivity") {
    if (filter === "logged_distraction") {
      return this.app.getLoggedDistractionMinutesForDate(
        dateStr,
        this.app.state.tasks,
      );
    }
    if (filter === "total_distraction") {
      return (
        this.app.getLoggedDistractionMinutesForDate(
          dateStr,
          this.app.state.tasks,
        ) +
        this.app.getInferredWasteMinutesForDate(
          dateStr,
          this.app.state.tasks,
        )
      );
    }
    return this.app.getProductiveMinutesForDate(
      dateStr,
      this.app.state.tasks,
    );
  }

  buildProductivitySummary(
    range = this.app.elements["prod-range"]?.value || "7d",
    filter = this.getCurrentFilter(),
  ) {
    const rangeDates = this.getRangeDates(range);
    const dateCount = Math.max(rangeDates.length, 1);
    const productivityMinutes = rangeDates.reduce(
      (sum, dateStr) => sum + this.getFilteredMinutesForDate(dateStr, filter),
      0,
    );
    const loggedDistractionMinutes = rangeDates.reduce(
      (sum, dateStr) =>
        sum +
        this.app.getLoggedDistractionMinutesForDate(
          dateStr,
          this.app.state.tasks,
        ),
      0,
    );
    const inferredDistractionMinutes = rangeDates.reduce(
      (sum, dateStr) =>
        sum +
        this.app.getInferredWasteMinutesForDate(
          dateStr,
          this.app.state.tasks,
        ),
      0,
    );
    const totalDistractionMinutes =
      loggedDistractionMinutes + inferredDistractionMinutes;
    const displayMode = this.rangeUsesAverageSummaries(range)
      ? "average"
      : "total";
    const divisor = displayMode === "average" ? dateCount : 1;

    return {
      rangeDates,
      displayMode,
      productivityMinutes,
      loggedDistractionMinutes,
      inferredDistractionMinutes,
      totalDistractionMinutes,
      productivityDisplayMinutes: productivityMinutes / divisor,
      loggedDistractionDisplayMinutes:
        loggedDistractionMinutes / divisor,
      totalDistractionDisplayMinutes:
        totalDistractionMinutes / divisor,
    };
  }

  formatSummaryMinutes(minutes, displayMode = "total") {
    const roundedMinutes = Math.max(0, Math.round(Number(minutes) || 0));
    const formatted = this.app.formatDuration(roundedMinutes);
    return displayMode === "average"
      ? `Avg ${formatted}/day`
      : formatted;
  }

  getGraphKpiLabels(displayMode = "total") {
    if (displayMode === "average") {
      return {
        productivity: "Avg Productivity / Day",
        totalDistraction: "Avg Total Distraction / Day",
        loggedDistraction: "Avg Logged Distractions / Day",
      };
    }
    return {
      productivity: "Total Productivity",
      totalDistraction: "Total Distraction",
      loggedDistraction: "Logged Distractions",
    };
  }

  updateGraphKpis() {
    const range = this.app.elements["prod-range"].value;
    const filter = this.getCurrentFilter();
    const summary = this.buildProductivitySummary(range, filter);
    const labels = this.getGraphKpiLabels(summary.displayMode);

    if (this.app.elements["graph-productivity-label"]) {
      this.app.elements["graph-productivity-label"].textContent =
        labels.productivity;
    }
    if (this.app.elements["graph-total-distraction-label"]) {
      this.app.elements["graph-total-distraction-label"].textContent =
        labels.totalDistraction;
    }
    if (this.app.elements["graph-logged-distraction-label"]) {
      this.app.elements["graph-logged-distraction-label"].textContent =
        labels.loggedDistraction;
    }

    this.app.elements["graph-productivity-total"].textContent =
      this.formatSummaryMinutes(
        summary.productivityDisplayMinutes,
        summary.displayMode,
      );
    this.app.elements["graph-total-distraction"].textContent =
      this.formatSummaryMinutes(
        summary.totalDistractionDisplayMinutes,
        summary.displayMode,
      );
    this.app.elements["graph-logged-distraction"].textContent =
      this.formatSummaryMinutes(
        summary.loggedDistractionDisplayMinutes,
        summary.displayMode,
      );
  }

  buildRollingShadowAverageMap(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) return new Map();
    const startDate = new Date(`${startDateStr}T12:00:00`);
    const endDate = new Date(`${endDateStr}T12:00:00`);
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      startDate > endDate
    )
      return new Map();
    return this.app.shadowEngine?.getHistoricalLockedShadowMap?.(
      startDateStr,
      endDateStr,
    ) || new Map();
  }

  getColorScheme() {
    return {
      border: "rgb(40, 180, 99)",
      fill: "rgba(40, 180, 99, 0.22)",
    };
  }

  getProductivityDatasetLabel(range = "7d") {
    return this.rangeUsesAverageSummaries(range)
      ? "Avg Productivity / Day"
      : "Productivity";
  }

  getShadowDatasetLabel(range = "7d") {
    return this.rangeUsesAverageSummaries(range)
      ? "Shadow Avg / Day"
      : "Shadow";
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
        animation: { duration: 620, easing: "easeOutQuart" },
        transitions: {
          active: { animation: { duration: 360, easing: "easeOutQuart" } },
          resize: { animation: { duration: 420, easing: "easeOutQuart" } },
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

    if (this.app.elements["sleep-chart"]) {
      const sleepCtx = this.app.elements["sleep-chart"].getContext("2d");
      this.charts.sleep = new Chart(sleepCtx, {
        type: "bar",
        data: this.getSleepData("7d"),
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 560, easing: "easeOutQuart" },
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
      const today = this.getProductivityRangeEndDate(range);
      const rangeDates = [];
      const days = CONFIG.CHART_RANGES[range] || 7;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const ds = this.app.getDateString(d);
        const mins = this.getFilteredMinutesForDate(ds, activeFilter);
        labels.push(
          this.formatDateLabel(this.app.parseDateKey(ds) || d),
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
          label: this.getProductivityDatasetLabel(range),
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
          label: this.getShadowDatasetLabel(range),
          data: shadowData,
          borderColor: "rgb(0, 140, 255)",
          backgroundColor: "rgba(0, 140, 255, 0.0)",
          pointBackgroundColor: "rgb(0, 140, 255)",
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBorderColor: "rgb(0, 140, 255)",
          borderWidth: isLongRange ? 1.8 : 2,
          tension: isLongRange ? 0.14 : 0.2,
          fill: false,
          borderDash: [7, 5],
          spanGaps: false,
        },
      ],
    };
  }

  getSleepData(range = "7d") {
    const days = CONFIG.CHART_RANGES[range] || 7,
      data = [],
      labels = [],
      today = this.app.getActiveDate();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = this.app.getDateString(d);
      const mins = this.app.getSleepMinutesForDate(
        ds,
        this.app.state.tasks,
      );
      labels.push(
        this.formatDateLabel(this.app.parseDateKey(ds) || d),
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
    const today = this.app.getActiveDate();
    const firstBucketStart = new Date(today);
    firstBucketStart.setDate(today.getDate() - (bucketCount * bucketDays - 1));
    const rollingShadowMap = this.buildRollingShadowAverageMap(
      this.app.getDateString(firstBucketStart),
      this.app.getDateString(today),
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
        rollingShadowMap,
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
    const today = this.app.getActiveDate();
    const start = new Date(
      today.getFullYear(),
      today.getMonth() - (monthCount - 1),
      1,
      12,
      0,
      0,
      0,
    );
    const rollingShadowMap = this.buildRollingShadowAverageMap(
      this.app.getDateString(start),
      this.app.getDateString(today),
    );

    const buckets = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const monthStart = new Date(
        today.getFullYear(),
        today.getMonth() - i,
        1,
        12,
        0,
        0,
        0,
      );
      const monthEnd =
        i === 0
          ? new Date(today)
          : new Date(
            today.getFullYear(),
            today.getMonth() - i + 1,
            0,
            12,
            0,
            0,
            0,
          );
      const dates = this.buildDateRange(monthStart, monthEnd);
      const average = this.buildAverageBucketMetrics(
        dates,
        filter,
        rollingShadowMap,
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
    rollingShadowMap,
  ) {
    if (!dates.length) return { value: 0, shadow: 0 };

    const minutesTotal = dates.reduce(
      (sum, dateStr) => sum + this.getFilteredMinutesForDate(dateStr, filter),
      0,
    );
    const shadowTotal = dates.reduce(
      (sum, dateStr) => sum + (rollingShadowMap?.get(dateStr) || 0),
      0,
    );

    return {
      value: parseFloat((minutesTotal / dates.length / 60).toFixed(2)),
      shadow: parseFloat(
        (shadowTotal / dates.length / 60).toFixed(2),
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

    if (range === "7d") {
      this.setSelectedSevenDayWindowWeeksBack(
        this.getSelectedSevenDayWindowWeeksBack(),
      );
      this.syncSevenDayProductivityViewport(container, track);
      return;
    }

    this.teardownProductivityScrollSpacer(container, track);
    const isScrollableRange = this.isScrollableProductivityRange(range);
    const baseWidth = Math.max(container.clientWidth || 0, 320);
    const pointCount = this.getProductivityPointCount(range);
    const visiblePointCount = this.getVisibleProductivityPointCount(range);
    const pixelsPerPoint = isScrollableRange
      ? Math.max(10, Math.round(baseWidth / visiblePointCount))
      : 0;
    const targetWidth = isScrollableRange
      ? Math.max(baseWidth, Math.round(pointCount * pixelsPerPoint))
      : baseWidth;

    container.dataset.scrollable = isScrollableRange ? "true" : "false";
    track.style.width = `${targetWidth}px`;

    requestAnimationFrame(() => {
      this.charts.productivity?.resize();
      container.scrollLeft = isScrollableRange
        ? Math.max(0, container.scrollWidth - container.clientWidth)
        : 0;
    });
  }

  buildShadowSeries(rangeDates, range = "7d") {
    if (!rangeDates.length) return [];
    const rollingShadowMap = this.buildRollingShadowAverageMap(
      rangeDates[0],
      rangeDates[rangeDates.length - 1],
    );
    const firstProductiveDate = this.getFirstProductiveDate();
    const shadowHours = rangeDates.map((dateStr) => {
      // Return null for dates before any productive data so the
      // shadow line doesn't appear as a false flatline at zero.
      if (this.isBeforeFirstProductiveDate(dateStr, firstProductiveDate)) {
        return null;
      }
      const rawMinutes = rollingShadowMap.get(dateStr);
      if (rawMinutes == null) return null;
      return parseFloat((rawMinutes / 60).toFixed(2));
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
    const filter = this.getCurrentFilter();
    const summary = this.buildProductivitySummary(range, filter);
    return summary.productivityDisplayMinutes;
  }

  animateFilteredTotal(fromMinutes, toMinutes, displayMode = "total") {
    if (!this.app.elements["prod-filter-total"]) return;
    const el = this.app.elements["prod-filter-total"];
    el.title =
      displayMode === "average"
        ? "Average productivity per day across the displayed range"
        : "Total productivity across the displayed range";
    const start = performance.now();
    const duration = 620;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromMinutes + (toMinutes - fromMinutes) * eased;
      el.textContent = this.formatSummaryMinutes(current, displayMode);
      if (progress < 1)
        this.totalCounterAnimation = requestAnimationFrame(tick);
    };
    if (this.totalCounterAnimation)
      cancelAnimationFrame(this.totalCounterAnimation);
    this.totalCounterAnimation = requestAnimationFrame(tick);
  }

  updateCharts() {
    if (!this.charts.productivity) return;
    const prodRange = this.app.elements["prod-range"].value;
    const sleepRange = this.app.elements["sleep-range"]?.value || "7d";
    const filter = this.getCurrentFilter();

    const prodContainer = this.app.elements["productivity-chart"].closest(
      ".graph-canvas-container",
    );
    if (prodContainer) prodContainer.classList.add("filter-updating");

    const fromMinutes = this.lastFilteredTotalMinutes;
    const displayMode = this.rangeUsesAverageSummaries(prodRange)
      ? "average"
      : "total";
    if (prodRange === "7d") {
      this.setSelectedSevenDayWindowWeeksBack(
        this.getSelectedSevenDayWindowWeeksBack(),
      );
    }
    this.charts.productivity.data = this.getProductivityData(
      prodRange,
      filter,
    );
    if (this.charts.sleep) this.charts.sleep.data = this.getSleepData(sleepRange);
    this.applyProductivityChartViewport(prodRange);
    this.charts.productivity.update();
    if (this.charts.sleep) this.charts.sleep.update();

    const toMinutes = this.getCurrentFilteredTotalMinutes();
    this.lastFilteredTotalMinutes = toMinutes;
    this.animateFilteredTotal(fromMinutes, toMinutes, displayMode);
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
    this.app.elements["prod-filter"]?.addEventListener("change", () =>
      this.updateCharts(),
    );
    this.app.elements["sleep-range"]?.addEventListener("change", () =>
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

  getHabitSpiralMonthKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  getDefaultHabitSpiralMonth() {
    return {
      spiral: {},
      daily: Array.from({ length: 7 }, (_, index) => ({
        label: [
          "Deep Work",
          "Study Session",
          "Physical Training",
          "Project Progress",
          "Planning Review",
          "Reading / Research",
          "Low Distraction Day",
        ][index],
        checked: false,
      })),
      weekly: Array.from({ length: 7 }, () => Array.from({ length: 5 }, () => 0)),
      monthly: Array.from({ length: 5 }, (_, index) => ({
        label: [
          "Consistent productive days",
          "Strong target wins",
          "Sleep tracked",
          "Low distraction control",
          "Recurring habits built",
        ][index],
        checked: false,
      })),
    };
  }

  loadHabitSpiralStore() {
    const stored = this.app.loadFromStorage(CONFIG.STORAGE_KEYS.SPIRAL_HABIT_TRACKER);
    if (!stored || typeof stored !== "object") return { months: {} };
    return {
      ...stored,
      months: stored.months && typeof stored.months === "object" ? stored.months : {},
    };
  }

  saveHabitSpiralStore(store) {
    try {
      localStorage.setItem(
        CONFIG.STORAGE_KEYS.SPIRAL_HABIT_TRACKER,
        JSON.stringify(store),
      );
    } catch (error) {
      console.error("habit tracker save failed", error);
    }
  }

  getHabitSpiralMonthState(monthKey) {
    const store = this.loadHabitSpiralStore();
    if (!store.months[monthKey]) {
      store.months[monthKey] = this.getDefaultHabitSpiralMonth();
      this.saveHabitSpiralStore(store);
    }
    const defaults = this.getDefaultHabitSpiralMonth();
    const month = store.months[monthKey];
    month.spiral = month.spiral && typeof month.spiral === "object" ? month.spiral : {};
    month.daily = Array.from({ length: 7 }, (_, index) => ({
      ...defaults.daily[index],
      ...(month.daily?.[index] || {}),
    }));
    month.weekly = Array.from({ length: 7 }, (_, row) =>
      Array.from({ length: 5 }, (_, col) => Number(month.weekly?.[row]?.[col] || 0)),
    );
    month.monthly = Array.from({ length: 5 }, (_, index) => ({
      ...defaults.monthly[index],
      ...(month.monthly?.[index] || {}),
    }));
    store.months[monthKey] = month;
    return { store, month };
  }

  updateHabitSpiralMonth(monthKey, updater) {
    const { store, month } = this.getHabitSpiralMonthState(monthKey);
    updater(month);
    store.months[monthKey] = month;
    this.saveHabitSpiralStore(store);
  }

  getHabitTierMeta(value = 0) {
    const tiers = [
      { label: "Empty", className: "empty" },
      { label: "Light Green", className: "light" },
      { label: "Dark Green", className: "dark" },
      { label: "Gold", className: "gold" },
    ];
    return tiers[Math.max(0, Math.min(3, Number(value) || 0))] || tiers[0];
  }

  getHabitDateKey(task) {
    const startTime = Number(task?.startTime);
    if (Number.isFinite(startTime)) {
      return (
        this.app.shadowEngine?.getShadowDayDate?.(new Date(startTime)) ||
        this.app.getDateString(new Date(startTime))
      );
    }
    return String(task?.date || "").trim();
  }

  getAutomatedHabitLabel(task) {
    const mission = String(task?.missionTopic || "").trim();
    if (mission) return mission;
    const subcategory = String(task?.subcategory || "").trim();
    if (subcategory && subcategory !== "General") return subcategory;
    return String(task?.category || "Tracked Work").trim();
  }

  getHabitTierFromMinutes(minutes, target = CONFIG.DAILY_PRODUCTIVITY_THRESHOLD_MINUTES) {
    const safeMinutes = Math.max(0, Number(minutes) || 0);
    const safeTarget = Math.max(1, Number(target) || CONFIG.DAILY_PRODUCTIVITY_THRESHOLD_MINUTES);
    if (safeMinutes <= 0) return 0;
    if (safeMinutes >= safeTarget) return 3;
    if (safeMinutes >= Math.max(60, safeTarget * 0.5)) return 2;
    return 1;
  }

  buildAutomatedHabitTracker(activeDate = new Date()) {
    const yearStart = new Date(activeDate.getFullYear(), 0, 1, 12, 0, 0, 0);
    const yearEnd = new Date(activeDate.getFullYear(), 11, 31, 12, 0, 0, 0);
    const daysInYear = 365;
    const startKey =
      this.app.shadowEngine?.formatCalendarDate?.(yearStart) ||
      this.app.getDateString(yearStart);
    const endKey =
      this.app.shadowEngine?.formatCalendarDate?.(yearEnd) ||
      this.app.getDateString(yearEnd);
    const todayKey =
      this.app.shadowEngine?.getShadowDayDate?.(new Date()) ||
      this.app.getDateString(new Date());
    const fallbackTarget = Math.max(
      1,
      Number(CONFIG.DAILY_PRODUCTIVITY_THRESHOLD_MINUTES || 240),
    );
    const targetMap =
      this.app.shadowEngine?.getHistoricalBattleTargetMap?.(startKey, endKey) ||
      new Map();
    const lockedShadowMap =
      this.app.shadowEngine?.getHistoricalLockedShadowMap?.(startKey, endKey) ||
      new Map();
    const days = {};
    const dateToOrdinal = new Map();
    for (let day = 1; day <= daysInYear; day += 1) {
      const date = new Date(yearStart);
      date.setDate(yearStart.getDate() + day - 1);
      const dateStr =
        this.app.shadowEngine?.formatCalendarDate?.(date) ||
        this.app.getDateString(date);
      dateToOrdinal.set(dateStr, day);
      days[day] = {
        dateStr,
        dayOfYear: day,
        tracked: 0,
        productive: 0,
        sleep: 0,
        distraction: 0,
        target: targetMap.get(dateStr) || fallbackTarget,
        shadow: lockedShadowMap.get(dateStr) || 0,
        habits: new Map(),
      };
    }

    const habitTotals = new Map();
    const weeklyTotals = new Map();
    const weekCount = 53;
    const weeklyTarget = Math.max(1, fallbackTarget * 5);
    this.app.state.tasks.forEach((task) => {
      const dateStr = this.getHabitDateKey(task);
      if (!dateStr || dateStr < startKey || dateStr > endKey) return;
      const day = dateToOrdinal.get(dateStr);
      const dayState = days[day];
      if (!dayState) return;
      const duration = Math.max(0, Number(task.duration || 0));
      dayState.tracked += duration;
      if (task.category === "Sleep") dayState.sleep += duration;
      if (this.app.isDistractionCategory?.(task.category)) dayState.distraction += duration;
      if (!this.app.isProductiveCategory(task.category)) return;

      dayState.productive += duration;
      const label = this.getAutomatedHabitLabel(task).slice(0, 48);
      dayState.habits.set(label, (dayState.habits.get(label) || 0) + duration);
      habitTotals.set(label, (habitTotals.get(label) || 0) + duration);

      const weekIndex = Math.min(
        weekCount - 1,
        Math.floor((Math.max(1, day) - 1) / 7),
      );
      const key = `${label}::${weekIndex}`;
      weeklyTotals.set(key, (weeklyTotals.get(key) || 0) + duration);
    });

    Object.values(days).forEach((day) => {
      day.tier = this.getHabitTierFromMinutes(day.productive, day.target);
      day.isWin = day.productive >= day.target;
    });

    const fallbackHabits = [
      "Deep Work",
      "Study Session",
      "Physical Training",
      "Project Progress",
      "Planning Review",
      "Reading / Research",
      "Low Distraction Day",
    ];
    const topHabits = [...habitTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label]) => label);
    const habitLabels = [...topHabits, ...fallbackHabits]
      .filter((label, index, arr) => label && arr.indexOf(label) === index)
      .slice(0, 7);
    const weekly = habitLabels.map((label) => ({
      label,
      weeks: Array.from({ length: weekCount }, (_, weekIndex) => {
        const minutes = weeklyTotals.get(`${label}::${weekIndex}`) || 0;
        return {
          minutes,
          tier: this.getHabitTierFromMinutes(minutes, weeklyTarget),
        };
      }),
    }));

    const today = Object.values(days).find((day) => day.dateStr === todayKey);
    const daily = habitLabels.map((label) => ({
      label,
      checked: !!today?.habits?.has(label),
      minutes: today?.habits?.get(label) || 0,
    }));
    const dayList = Object.values(days);
    const productiveDays = dayList.filter((day) => day.productive > 0).length;
    const goldDays = dayList.filter((day) => day.tier === 3).length;
    const sleepDays = dayList.filter((day) => day.sleep > 0).length;
    const lowDistractionDays = dayList.filter(
      (day) => day.tracked > 0 && day.distraction <= CONFIG.DISTRACTION_BUDGET_MINUTES,
    ).length;
    const monthly = [
      {
        label: `Productive days: ${productiveDays}/${daysInYear}`,
        checked: productiveDays >= Math.ceil(daysInYear * 0.7),
      },
      {
        label: `Gold target days: ${goldDays}/${daysInYear}`,
        checked: goldDays >= Math.ceil(daysInYear * 0.45),
      },
      {
        label: `Sleep logged: ${sleepDays}/${daysInYear}`,
        checked: sleepDays >= Math.ceil(daysInYear * 0.7),
      },
      {
        label: `Low distraction days: ${lowDistractionDays}/${daysInYear}`,
        checked: lowDistractionDays >= Math.ceil(daysInYear * 0.7),
      },
      {
        label: `Recurring habits touched: ${topHabits.length}/7`,
        checked: topHabits.length >= 7,
      },
    ];

    return {
      days,
      daily,
      weekly,
      monthly,
      daysInMonth: daysInYear,
      weekCount,
      monthKey: String(activeDate.getFullYear()),
    };
  }

  buildAutomatedChecklist(className, items) {
    const list = document.createElement("div");
    list.className = className;
    items.forEach((item) => {
      const row = document.createElement("label");
      row.className = "habit-check-row habit-check-row-auto";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!item.checked;
      checkbox.disabled = true;

      const text = document.createElement("div");
      text.className = "habit-auto-label";
      const label = document.createElement("span");
      label.textContent = item.label;
      text.appendChild(label);
      if (Number(item.minutes || 0) > 0) {
        const minutes = document.createElement("small");
        minutes.textContent = this.app.formatDuration(item.minutes);
        text.appendChild(minutes);
      }

      row.append(checkbox, text);
      list.appendChild(row);
    });
    return list;
  }

  buildHabitChecklist({
    className,
    items,
    monthKey,
    type,
  }) {
    const list = document.createElement("div");
    list.className = className;
    items.forEach((item, index) => {
      const row = document.createElement("label");
      row.className = "habit-check-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!item.checked;
      checkbox.addEventListener("change", () => {
        this.updateHabitSpiralMonth(monthKey, (month) => {
          month[type][index].checked = checkbox.checked;
        });
      });

      const input = document.createElement("input");
      input.type = "text";
      input.value = item.label || "";
      input.maxLength = 48;
      input.placeholder = `${type === "daily" ? "Daily" : "Monthly"} habit ${index + 1}`;
      input.addEventListener("input", () => {
        this.updateHabitSpiralMonth(monthKey, (month) => {
          month[type][index].label = input.value.slice(0, 48);
        });
      });

      row.append(checkbox, input);
      list.appendChild(row);
    });
    return list;
  }

  buildHabitWeeklyMatrix(month, monthKey) {
    const table = document.createElement("div");
    table.className = "habit-weekly-matrix";

    const header = document.createElement("div");
    header.className = "habit-weekly-row habit-weekly-header";
    ["Habit", "W1", "W2", "W3", "W4", "W5"].forEach((label) => {
      const cell = document.createElement("div");
      cell.textContent = label;
      header.appendChild(cell);
    });
    table.appendChild(header);

    month.weekly.forEach((rowValues, rowIndex) => {
      const row = document.createElement("div");
      row.className = "habit-weekly-row";
      const label = document.createElement("div");
      label.className = "habit-weekly-name";
      label.textContent = `Habit ${rowIndex + 1}`;
      row.appendChild(label);

      rowValues.forEach((value, weekIndex) => {
        const cell = document.createElement("button");
        const tier = this.getHabitTierMeta(value);
        cell.type = "button";
        cell.className = `habit-dot habit-tier-${tier.className}`;
        cell.title = `Habit ${rowIndex + 1}, week ${weekIndex + 1}: ${tier.label}`;
        cell.setAttribute("aria-label", cell.title);
        cell.addEventListener("click", () => {
          this.updateHabitSpiralMonth(monthKey, (nextMonth) => {
            nextMonth.weekly[rowIndex][weekIndex] =
              (Number(nextMonth.weekly[rowIndex][weekIndex] || 0) + 1) % 4;
          });
          this.renderGithubHeatmap();
        });
        row.appendChild(cell);
      });
      table.appendChild(row);
    });

    return table;
  }

  buildAutomatedWeeklyMatrix(automation) {
    const table = document.createElement("div");
    table.className = "habit-weekly-matrix";
    table.style.setProperty("--habit-week-count", String(automation.weekCount || 53));

    const header = document.createElement("div");
    header.className = "habit-weekly-row habit-weekly-header";
    [
      "Habit",
      ...Array.from({ length: automation.weekCount || 53 }, (_, index) => `W${index + 1}`),
    ].forEach((label, index) => {
      const cell = document.createElement("div");
      cell.textContent = label;
      if (index > 0 && index % 4 !== 1 && index !== (automation.weekCount || 53)) {
        cell.className = "habit-week-muted";
      }
      header.appendChild(cell);
    });
    table.appendChild(header);

    automation.weekly.forEach((habit) => {
      const row = document.createElement("div");
      row.className = "habit-weekly-row";
      const label = document.createElement("div");
      label.className = "habit-weekly-name";
      label.textContent = habit.label;
      row.appendChild(label);

      habit.weeks.forEach((week, weekIndex) => {
        const tier = this.getHabitTierMeta(week.tier);
        const cell = document.createElement("div");
        cell.className = `habit-dot habit-dot-auto habit-tier-${tier.className}`;
        cell.title = `${habit.label}, week ${weekIndex + 1}: ${this.app.formatDuration(week.minutes)} (${tier.label})`;
        cell.setAttribute("aria-label", cell.title);
        row.appendChild(cell);
      });
      table.appendChild(row);
    });

    return table;
  }

  buildHabitSpiralSvg(month, monthKey, activeDate, automation = null) {
    const year = activeDate.getFullYear();
    const daysInYear = automation?.daysInMonth || 365;
    const yearName = String(year);
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("class", "habit-spiral-svg");
    svg.setAttribute("viewBox", "0 0 620 620");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${yearName} 365-day habit spiral`);

    const centerX = 310;
    const centerY = 310;
    const guideRadii = [112, 144, 176, 208, 240, 272];
    guideRadii.forEach((radius) => {
      const circle = document.createElementNS(svgNs, "circle");
      circle.setAttribute("cx", centerX);
      circle.setAttribute("cy", centerY);
      circle.setAttribute("r", radius);
      circle.setAttribute("class", "habit-spiral-guide");
      svg.appendChild(circle);
    });

    for (let index = 0; index < 12; index += 1) {
      const angle = (-90 + index * 30) * (Math.PI / 180);
      const outerRadius = 272;
      const innerRadius = 108;
      const x1 = centerX + Math.cos(angle) * innerRadius;
      const y1 = centerY + Math.sin(angle) * innerRadius;
      const x2 = centerX + Math.cos(angle) * outerRadius;
      const y2 = centerY + Math.sin(angle) * outerRadius;
      const line = document.createElementNS(svgNs, "line");
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      line.setAttribute("class", "habit-spiral-spoke");
      svg.appendChild(line);
    }

    const title = document.createElementNS(svgNs, "text");
    title.setAttribute("x", centerX);
    title.setAttribute("y", centerY - 8);
    title.setAttribute("class", "habit-spiral-center-title");
    title.textContent = "YEAR";
    svg.appendChild(title);

    const sub = document.createElementNS(svgNs, "text");
    sub.setAttribute("x", centerX);
    sub.setAttribute("y", centerY + 22);
    sub.setAttribute("class", "habit-spiral-center-subtitle");
    sub.textContent = `${yearName} - 365 days`;
    svg.appendChild(sub);

    const yearStart = new Date(year, 0, 1, 12, 0, 0, 0);
    const monthMarkerDays = new Map();
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const markerDate = new Date(year, monthIndex, 1, 12, 0, 0, 0);
      const ordinal = Math.floor((markerDate - yearStart) / 86400000) + 1;
      monthMarkerDays.set(ordinal, markerDate.toLocaleDateString("en-US", { month: "short" }));
    }

    const turns = 4.2;
    const minRadius = 112;
    const maxRadius = 274;
    for (let day = 1; day <= daysInYear; day += 1) {
      const progress = daysInYear > 1 ? (day - 1) / (daysInYear - 1) : 0;
      const angle = (-Math.PI / 2) + progress * turns * Math.PI * 2;
      const nodeRadius = minRadius + progress * (maxRadius - minRadius);
      const labelRadius = nodeRadius + 16;
      const x = centerX + Math.cos(angle) * nodeRadius;
      const y = centerY + Math.sin(angle) * nodeRadius;
      const labelX = centerX + Math.cos(angle) * labelRadius;
      const labelY = centerY + Math.sin(angle) * labelRadius;
      const disabled = false;
      const dayState = automation?.days?.[day] || null;
      const value = disabled ? 0 : (dayState ? dayState.tier : Number(month.spiral[String(day)] || 0));
      const tier = this.getHabitTierMeta(value);

      const button = document.createElementNS(svgNs, "g");
      button.setAttribute("class", `habit-spiral-node habit-tier-${tier.className}${disabled ? " is-disabled" : ""}`);
      button.setAttribute("tabindex", disabled ? "-1" : "0");
      button.setAttribute("role", "button");
      button.setAttribute(
        "aria-label",
        disabled
          ? `Day ${day} is not in this month`
          : `Day ${day}: ${tier.label}, productive ${this.app.formatDuration(dayState?.productive || 0)}`,
      );
      button.dataset.day = String(day);
      if (dayState) {
        button.dataset.productive = String(dayState.productive);
        button.dataset.tracked = String(dayState.tracked);
      }

      const circle = document.createElementNS(svgNs, "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      const dotRadius = 3.2 + progress * 2.2 + (monthMarkerDays.has(day) ? 1.05 : 0);
      circle.setAttribute("r", dotRadius.toFixed(2));
      circle.setAttribute("class", "habit-spiral-node-circle");
      button.appendChild(circle);

      if (monthMarkerDays.has(day)) {
        const label = document.createElementNS(svgNs, "text");
        label.setAttribute("x", labelX);
        label.setAttribute("y", labelY + 4);
        label.setAttribute("class", "habit-spiral-day-label");
        label.textContent = monthMarkerDays.get(day);
        button.appendChild(label);
      }

      const cycleDay = () => {
        if (disabled || automation) return;
        this.updateHabitSpiralMonth(monthKey, (nextMonth) => {
          nextMonth.spiral[String(day)] =
            (Number(nextMonth.spiral[String(day)] || 0) + 1) % 4;
        });
        this.renderGithubHeatmap();
      };
      button.addEventListener("click", cycleDay);
      button.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          cycleDay();
        }
      });

      svg.appendChild(button);
    }

    return svg;
  }

  renderHabitSpiralTracker() {
    const container = document.getElementById("github-heatmap-container");
    if (!container) return;
    container.innerHTML = "";

    const now = new Date();
    const monthKey = this.getHabitSpiralMonthKey(now);
    const { month } = this.getHabitSpiralMonthState(monthKey);
    const automation = this.buildAutomatedHabitTracker(now);
    const yearName = String(now.getFullYear());
    const label = document.getElementById("habit-month-label");
    if (label) label.textContent = `${yearName} Annual Spiral`;

    const focus = document.createElement("section");
    focus.className = "habit-spiral-panel habit-spiral-only-panel";
    const legend = document.createElement("div");
    legend.className = "habit-tier-legend";
    [
      ["empty", "Empty"],
      ["light", "Light"],
      ["dark", "Deep"],
      ["gold", "Gold"],
    ].forEach(([className, text]) => {
      const item = document.createElement("span");
      item.className = "habit-tier-legend-item";
      const swatch = document.createElement("span");
      swatch.className = `habit-tier-swatch habit-tier-${className}`;
      item.append(swatch, document.createTextNode(text));
      legend.appendChild(item);
    });

    focus.append(this.buildHabitSpiralSvg(month, monthKey, now, automation), legend);
    container.appendChild(focus);
  }

  renderGithubHeatmap(year = null) {
    const container = document.getElementById("github-heatmap-container");
    if (!container) return;
    container.innerHTML = "";

    const productiveMap = new Map();
    const trackedMap = new Map();
    const yearDataMap = new Map();
    this.app.state.tasks.forEach((task) => {
      const duration = Math.max(0, Number(task.duration || 0));
      const heatmapDateKey = Number.isFinite(Number(task.startTime))
        ? this.app.shadowEngine?.getShadowDayDate?.(
          new Date(Number(task.startTime)),
        ) || String(task.date || "").trim()
        : String(task.date || "").trim();
      if (!heatmapDateKey) return;
      trackedMap.set(
        heatmapDateKey,
        (trackedMap.get(heatmapDateKey) || 0) + duration,
      );
      const taskYear = Number(heatmapDateKey.split("-")[0] || 0);
      if (taskYear > 0) {
        yearDataMap.set(taskYear, (yearDataMap.get(taskYear) || 0) + duration);
      }
      if (!this.app.isProductiveCategory(task.category)) return;
      productiveMap.set(
        heatmapDateKey,
        (productiveMap.get(heatmapDateKey) || 0) + duration,
      );
    });

    const yearsWithData = Array.from(yearDataMap.keys()).sort((a, b) => a - b);
    const currentYear = year || new Date().getFullYear();
    this.app.uiManager.currentHeatmapYear = currentYear;

    const label = document.getElementById("habit-month-label");
    if (label) label.textContent = `${currentYear} Full Year`;

    const prevBtn = document.getElementById("heatmap-prev-year");
    const nextBtn = document.getElementById("heatmap-next-year");
    const yearLabel = document.getElementById("heatmap-year-label");
    if (yearLabel) yearLabel.textContent = currentYear;

    const minYear = yearsWithData.length > 0 ? Math.min(...yearsWithData) : currentYear - 1;
    const maxYear = yearsWithData.length > 0 ? Math.max(...yearsWithData) : currentYear;
    const canNavigate = minYear < maxYear;
    if (prevBtn) prevBtn.style.display = canNavigate && currentYear > minYear ? "" : "none";
    if (nextBtn) nextBtn.style.display = canNavigate && currentYear < maxYear ? "" : "none";

    const fallbackShadow =
      Number(this.app.shadowEngine?.shadowSevenDayAverage || 0) || 0;
    const fallbackTarget =
      fallbackShadow > 0
        ? Math.max(1, Math.round(fallbackShadow) + 1)
        : Math.max(
          1,
          Number(CONFIG.DAILY_PRODUCTIVITY_THRESHOLD_MINUTES || 240),
        );

    const dates = [];
    const startDate = new Date(currentYear, 0, 1, 12, 0, 0, 0);
    const endDate = new Date(currentYear, 11, 31, 12, 0, 0, 0);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(
        this.app.shadowEngine?.formatCalendarDate?.(d) ||
        this.app.getDateString(d),
      );
    }
    const firstDayOffset = startDate.getDay();
    const totalWeeks = Math.ceil((firstDayOffset + dates.length) / 7);
    const lockedShadowMap = this.app.shadowEngine.getHistoricalLockedShadowMap(
      dates[0],
      dates[dates.length - 1],
    );
    const targetMap = this.app.shadowEngine.getHistoricalBattleTargetMap(
      dates[0],
      dates[dates.length - 1],
    );

    const days = dates.map((dateStr) => {
      const productive = productiveMap.get(dateStr) || 0;
      const tracked = trackedMap.get(dateStr) || 0;
      const hasData = tracked > 0;
      const shadow = lockedShadowMap.get(dateStr) || Math.max(0, fallbackTarget - 1);
      const target = targetMap.get(dateStr) || fallbackTarget;
      const isWin = productive >= target;
      
      let level = 0;
      if (hasData) {
        if (isWin) {
          level = 5;
        } else if (target > 0) {
          const ratio = productive / target;
          if (ratio > 0.75) level = 4;
          else if (ratio > 0.5) level = 3;
          else if (ratio > 0.25) level = 2;
          else if (ratio > 0) level = 1;
        }
      }

      const remaining = Math.max(0, target - productive);
      const leftPercent = target > 0 ? remaining / target : 0;
      let nearGoalTier = "";
      if (hasData && !isWin && target > 0) {
        if (leftPercent <= 0.2) nearGoalTier = "critical";
        else if (leftPercent <= 0.4) nearGoalTier = "close";
      }
      return {
        dateStr,
        productive,
        tracked,
        shadow,
        target,
        hasData,
        isWin,
        level,
        nearGoalTier,
        state: !hasData ? "neutral" : (isWin ? "win" : "loss"),
      };
    });

    // ── Continuous heatmap color scaling ──────────────────────────────────────
    // Find the highest productive-minutes value among all active days across
    // the entire 365-day calendar.  That peak day always gets the richest green.
    const COLOR_TOLERANCE_MINUTES = 5; // differences ≤ this are treated as equal
    let maxProductiveMinutes = 0;
    days.forEach((day) => {
      if (day.hasData && day.productive > maxProductiveMinutes) {
        maxProductiveMinutes = day.productive;
      }
    });

    /**
     * Given a productive-minutes value and the calendar-wide maximum, returns
     * an inline CSS color and optional glow box-shadow for that cell.
     *
     * Inactive days (0 work)  → deep dark red, elegant and subtle.
     * Active days             → glowing green scaled by productive / max.
     *
     * ratio is quantised to the nearest COLOR_TOLERANCE_MINUTES bucket so that
     * differences of ≤ 5 min produce identical shades.
     */
    function heatmapCellStyle(productive, hasData, maxMin) {
      if (!hasData || productive <= 0) {
        // Deep dark red – inactive day
        return {
          bg: "#2a0a0a",
          border: "rgba(255, 255, 255, 0.12)",
          glow: "none",
        };
      }

      // Quantise to avoid noise from tiny differences
      const bucketMin = Math.max(1, COLOR_TOLERANCE_MINUTES);
      const quantised = Math.round(productive / bucketMin) * bucketMin;
      const maxQuantised = Math.max(quantised, Math.round(maxMin / bucketMin) * bucketMin);
      const ratio = maxQuantised > 0 ? Math.min(1, quantised / maxQuantised) : 1;

      // Green channel: interpolate between a very pale green (low) and a rich
      // deep green (high) using HSL so the gradient feels natural.
      // hue stays at 141°, saturation 70–100%, lightness 14–44%.
      const hue = 141;
      const saturation = Math.round(70 + ratio * 30);        // 70 → 100
      const lightness  = Math.round(14 + ratio * 30);        // 14 → 44

      // Glow intensity also scales with ratio so peak days visibly glow.
      const glowAlpha  = (0.12 + ratio * 0.52).toFixed(3);  // 0.12 → 0.64
      const glowSpread = Math.round(1 + ratio * 5);          // 1px → 6px
      const glowColor  = `hsla(${hue}, 90%, 55%, ${glowAlpha})`;

      return {
        bg: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
        border: `rgba(255, 255, 255, ${(0.08 + ratio * 0.22).toFixed(3)})`,
        glow: `0 0 ${glowSpread}px ${glowColor}`,
      };
    }
    // ─────────────────────────────────────────────────────────────────────────

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

    const todayDate =
      this.app.shadowEngine?.getShadowDayDate?.(new Date()) ||
      this.app.getDateString(new Date());
    const todayIndex = days.findIndex((day) => day.dateStr === todayDate);
    const streakAnchorIndex =
      todayIndex >= 0 ? todayIndex : days.length - 1;
    const todayEntry = days[streakAnchorIndex];
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
      bestStreak > 0 &&
      bestEndIndex >= 0 &&
      bestEndIndex < streakAnchorIndex;

    const currentStreakStartIndex =
      currentStreak > 0 ? (streakAnchorIndex - currentStreak + 1) : -1;
    const todayWeek =
      todayIndex >= 0
        ? Math.floor((firstDayOffset + todayIndex) / 7)
        : Math.max(0, totalWeeks - 1);

    const wrapper = document.createElement("div");
    wrapper.className = "github-heatmap-wrapper";

    const inner = document.createElement("div");
    inner.className = "github-heatmap-inner";

    const monthsRow = document.createElement("div");
    monthsRow.className = "github-months-row";
    monthsRow.style.gridTemplateColumns = `repeat(${totalWeeks}, var(--heatmap-cell))`;
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const monthDate = new Date(currentYear, monthIndex, 1, 12, 0, 0, 0);
      const week = Math.floor((firstDayOffset + Math.floor((monthDate - startDate) / 86400000)) / 7);
      const monthLabel = document.createElement("span");
      monthLabel.className = "github-month-label";
      monthLabel.style.gridColumn = `${week + 1} / span 4`;
      monthLabel.textContent = monthDate.toLocaleDateString("en-US", { month: "short" });
      monthsRow.appendChild(monthLabel);
    }

    const grid = document.createElement("div");
    grid.className = "github-heatmap-grid";
    grid.style.gridTemplateColumns = `repeat(${totalWeeks}, var(--heatmap-cell))`;

    days.forEach((day, index) => {
      const dayDate = this.app.parseDateKey(day.dateStr);
      const week = Math.floor((firstDayOffset + index) / 7);
      const row = dayDate ? dayDate.getDay() : ((firstDayOffset + index) % 7);
      const cell = document.createElement("div");
      cell.className = "github-cell";
      cell.style.gridColumn = String(week + 1);
      cell.style.gridRow = String(row + 1);

      const isToday = day.dateStr === todayDate;
      cell.dataset.state = isToday ? "today" : day.state;
      if (day.nearGoalTier) {
        cell.dataset.near = day.nearGoalTier;
      }
      if (
        currentStreak > 0 &&
        index >= currentStreakStartIndex &&
        index <= streakAnchorIndex
      ) {
        cell.dataset.streak = "active";
      }
      if (
        hasBrokenBestStreak &&
        index >= bestStartIndex &&
        index <= bestEndIndex
      ) {
        cell.dataset.best = "broken";
      }

      // Apply continuous color – skip for today (CSS handles that)
      if (!isToday) {
        const cs = heatmapCellStyle(day.productive, day.hasData, maxProductiveMinutes);
        cell.style.backgroundColor = cs.bg;
        cell.style.borderColor = cs.border;
        if (cs.glow !== "none") {
          cell.style.boxShadow = cs.glow;
        }
      }

      const dateLabel = this.formatCompactBattleDate(day.dateStr);
      const statusLabel =
        day.state === "neutral" ? "No activity" : day.state === "win" ? "Win" : "Loss";
      const productiveLabel =
        day.productive > 0 ? ` - ${this.app.formatDuration(day.productive)} productive` : "";
      cell.title = `${statusLabel} on ${dateLabel}${productiveLabel}`;
      grid.appendChild(cell);
    });

    inner.append(monthsRow, grid);
    wrapper.appendChild(inner);

    // ── Highest Productive Day label ──────────────────────────────────────────
    if (maxProductiveMinutes > 0) {
      const bestDay = days.reduce((best, day) =>
        day.productive > (best ? best.productive : -1) ? day : best, null);
      if (bestDay) {
        const bestDateLabel = this.formatCompactBattleDate(bestDay.dateStr);
        const bestTimeLabel = this.app.formatDuration(bestDay.productive);
        const bestBar = document.createElement("div");
        bestBar.className = "heatmap-best-day-bar";
        bestBar.innerHTML =
          `<span class="heatmap-best-day-icon">🏆</span>` +
          `<span class="heatmap-best-day-text">Highest productive day: ` +
          `<strong>${bestDateLabel}</strong> &ndash; ${bestTimeLabel}</span>`;
        wrapper.appendChild(bestBar);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    container.appendChild(wrapper);
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
      this.app.cloudManager?.closePipelineMenu?.();
      this.app.trainerEngine.showWindow();
    });
    // Copy Timetable Prompt
    this.app.elements["copy-timetable-prompt-btn"]?.addEventListener("click", () => {
      const TIMETABLE_PROMPT = "You are generating a timetable for this productivity system.\n\nStrictly follow ALL existing task structures, IDs, priorities, dependencies, scheduling rules, and formatting already used by this application.\n\nRequirements:\n\n1. Never invent a different format.\n2. Preserve the existing makeTask() structure exactly. ALWAYS output tasks using the object format: makeTask({ id: '...', title: '...', category: '...', startTime: 'HH:MM', endTime: 'HH:MM', durationMins: X, priority: '...', dependencies: [], notes: '...' }).\n3. Generate only valid tasks compatible with the application.\n4. Respect task order.\n5. Maintain dependency relationships.\n6. Preserve task categories.\n7. Use realistic study durations.\n8. Balance difficult and easy subjects.\n9. Include revision sessions.\n10. Include breaks where appropriate.\n11. Keep wake-up, meals, sleep, exercise, and fixed routines intact unless explicitly instructed otherwise.\n12. Never remove mandatory tasks.\n13. Never duplicate tasks.\n14. Ensure no overlapping time slots.\n15. Ensure the timetable is logically consistent from start to finish.\n16. Return only valid code/output required by the application.\n17. Do not include explanations unless explicitly requested.\n18. If a subject list is provided, distribute subjects evenly across the schedule.\n19. Follow every instruction exactly without changing the application's formatting.";
      const statusEl = this.app.elements["pipeline-copy-status"];
      navigator.clipboard.writeText(TIMETABLE_PROMPT).then(() => {
        if (statusEl) { statusEl.textContent = "✅ Timetable prompt copied."; statusEl.classList.add("visible"); }
        setTimeout(() => {
          if (statusEl) { statusEl.textContent = ""; statusEl.classList.remove("visible"); }
          this.app.cloudManager?.closePipelineMenu?.();
        }, 1800);
      }).catch(() => {
        if (statusEl) { statusEl.textContent = "⚠ Copy failed - try again."; statusEl.classList.add("visible"); }
      });
    });
    if (this.app.elements["heatmap-prev-year"]) {
      this.app.elements["heatmap-prev-year"].addEventListener("click", () => {
        this.app.uiManager.currentHeatmapYear -= 1;
        this.app.graphManager.renderGithubHeatmap(this.app.uiManager.currentHeatmapYear);
      });
    }
    if (this.app.elements["heatmap-next-year"]) {
      this.app.elements["heatmap-next-year"].addEventListener("click", () => {
        this.app.uiManager.currentHeatmapYear += 1;
        this.app.graphManager.renderGithubHeatmap(this.app.uiManager.currentHeatmapYear);
      });
    }
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
    this.app.elements["reset-stats-btn"]?.addEventListener("click", () => {
      this.app.completeResetData();
      this.app.cloudManager.closeProfileMenu();
    });
    this.app.elements["import-file"].addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      this.app.uiManager.importDataFromFile(file);
    });
    if (this.app.elements["wake-now-btn"])
      this.app.elements["wake-now-btn"].addEventListener("click", () =>
        (this.app.flowEngine.markWakeNow(), this.app.uiManager.openSleepJournal()),
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
    this.app.elements["close-shadow-ranks"]?.addEventListener("click", () =>
      this.app.uiManager.hideShadowRanksGuide(),
    );
    this.app.elements["close-shadow-ranks-modal"]?.addEventListener(
      "click",
      () => this.app.uiManager.hideShadowRanksGuide(),
    );
    this.app.elements["print-report"].addEventListener("click", () =>
      window.print(),
    );
    const dlBtn = document.getElementById("download-excel-btn");
    if (dlBtn) {
      dlBtn.addEventListener("click", () => {
        try {
          new ExcelReportGenerator(this.app).generate();
        } catch (e) {
          console.error("Excel export failed:", e);
          alert("Excel export failed: " + e.message);
        }
      });
    }
    this.app.elements["close-trainer"]?.addEventListener("click", () =>
      this.app.trainerEngine.hideWindow(),
    );
    this.app.elements["close-trainer-modal"]?.addEventListener(
      "click",
      () => this.app.trainerEngine.hideWindow(),
    );
    this.app.elements["refresh-trainer"]?.addEventListener("click", () => {
      this.app.trainerEngine.state.roadmap.editMode =
        !this.app.trainerEngine.state.roadmap.editMode;
      this.app.trainerEngine.refresh();
    });
    this.app.elements["copy-trainer"]?.addEventListener("click", () =>
      this.app.trainerEngine.copyPlan(),
    );
    this.app.elements["complete-reset-btn"]?.addEventListener("click", () =>
      this.app.completeResetData(),
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
    this.app.elements["shadow-ranks-modal"]?.addEventListener("click", (e) => {
      if (e.target === this.app.elements["shadow-ranks-modal"])
        this.app.uiManager.hideShadowRanksGuide();
    });
    this.app.elements["trainer-modal"].addEventListener("click", (e) => {
      if (e.target === this.app.elements["trainer-modal"])
        this.app.trainerEngine.hideWindow();
    });

    // Edit Tasks Modal
    const openEditTasksModal = () => {
      const modal = this.app.elements["edit-tasks-modal"];
      const textarea = this.app.elements["task-response-draft-input"];
      if (!modal) return;
      this.app.cloudManager?.closePipelineMenu?.();
      if (textarea) {
        const saved = this.app.loadFromStorage(CONFIG.STORAGE_KEYS.TASK_RESPONSE_DRAFT) || "";
        textarea.value = saved;
      }
      modal.style.display = "flex";
    };
    const closeEditTasksModal = () => {
      const modal = this.app.elements["edit-tasks-modal"];
      if (modal) modal.style.display = "none";
    };
    this.app.elements["edit-tasks-btn"]?.addEventListener("click", openEditTasksModal);
    this.app.elements["close-edit-tasks-modal"]?.addEventListener("click", closeEditTasksModal);
    this.app.elements["close-edit-tasks-modal-btn"]?.addEventListener("click", closeEditTasksModal);
    this.app.elements["edit-tasks-modal"]?.addEventListener("click", (e) => {
      if (e.target === this.app.elements["edit-tasks-modal"]) closeEditTasksModal();
    });
    this.app.elements["save-tasks-btn"]?.addEventListener("click", () => {
      const textarea = this.app.elements["task-response-draft-input"];
      const raw = textarea?.value?.trim() || "";
      if (!raw) {
        this.app.saveToStorage(CONFIG.STORAGE_KEYS.TASK_RESPONSE_DRAFT, "");
        this.app.trainerEngine?.syncMissionFromRoadmap?.();
        closeEditTasksModal();
        return;
      }
      const parsedTasks = this.app.trainerEngine?.parseTaskPlanCode?.(raw);
      if (parsedTasks && parsedTasks.length) {
        this.app.saveToStorage(CONFIG.STORAGE_KEYS.TASK_RESPONSE_DRAFT, raw);
        this.app.trainerEngine?.syncMissionFromRoadmap?.();
        this.app.shadowEngine?.refresh?.(false);
      } else {
        this.app.saveToStorage(CONFIG.STORAGE_KEYS.TASK_RESPONSE_DRAFT, raw);
        this.app.trainerEngine?.syncMissionFromRoadmap?.();
        this.app.shadowEngine?.refresh?.(false);
      }
      closeEditTasksModal();
    });
    this.app.elements["edit-timetable-from-pipeline-btn"]?.addEventListener("click", () => {
      this.app.trainerEngine?.hideWindow?.();
      const modal = this.app.elements["edit-tasks-modal"];
      const textarea = this.app.elements["task-response-draft-input"];
      if (!modal) return;
      if (textarea) {
        const saved = this.app.loadFromStorage(CONFIG.STORAGE_KEYS.TASK_RESPONSE_DRAFT) || "";
        textarea.value = saved;
      }
      modal.style.display = "flex";
    });
  }
}
window.classifyActivity = (userInput) =>
  ActivityClassifier.classify(userInput);

// =============================================================================
// Excel Report Generator — 4-sheet .xlsx export
// =============================================================================
class ExcelReportGenerator {
  constructor(app) {
    this.app = app;
  }

  // --- helpers ---
  _fmtH(decH) {
    if (decH == null || !Number.isFinite(decH)) return "";
    const norm = ((decH % 24) + 24) % 24;
    const totalMins = Math.round(norm * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  _fmtTs(tsMs) {
    if (!tsMs) return "";
    const d = new Date(tsMs);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  _dayName(dateStr) {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-IN", { weekday: "long" });
  }

  // Match a task's actual start hour to the nearest timetable window
  _matchToWindow(taskStartMs, missionTasks) {
    if (!taskStartMs || !missionTasks?.length) return null;
    const d = new Date(taskStartMs);
    const startH = d.getHours() + d.getMinutes() / 60;
    for (const mt of missionTasks) {
      const win = mt.win;
      if (!Array.isArray(win) || win.length < 2) continue;
      const [wS, wE] = win;
      if (startH >= wS && startH < wE) {
        return { slot: mt.label || mt.topic || "", wStart: wS, wEnd: wE, task: mt };
      }
    }
    return null;
  }

  // --- Sheet 1: Daily Log ---
  _buildDailyLog(tasks) {
    const byDate = {};
    tasks.forEach(t => {
      const d = t.date;
      if (!d) return;
      if (!byDate[d]) byDate[d] = { productive: 0, tracked: 0, sessions: 0, distraction: 0, sleep: 0 };
      byDate[d].tracked += (t.duration || 0);
      byDate[d].sessions += 1;
      if (t.category === "Sleep") byDate[d].sleep += (t.duration || 0);
      else if (t.category === "Time Waste / Distraction") byDate[d].distraction += (t.duration || 0);
      else if (["Productive Work", "Physical Training", "Study / Skill Development"].includes(t.category))
        byDate[d].productive += (t.duration || 0);
    });

    // Build streak map
    const streakData = this.app.loadFromStorage?.(CONFIG.STORAGE_KEYS.STREAK) || {};

    const rows = [["Date", "Day", "Productive (min)", "Tracked (min)", "Sessions", "Distraction (min)", "Sleep (min)", "Productive Day?"]];
    const sorted = Object.keys(byDate).sort();
    sorted.forEach(d => {
      const s = byDate[d];
      rows.push([
        d,
        this._dayName(d),
        s.productive,
        s.tracked,
        s.sessions,
        s.distraction,
        s.sleep,
        s.productive >= CONFIG.DAILY_PRODUCTIVITY_THRESHOLD_MINUTES ? "Yes" : "No"
      ]);
    });
    return rows;
  }

  // --- Sheet 2: Task Punctuality ---
  _buildPunctualityLog(tasks, missionTasks) {
    const cutoff90 = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const rows = [["Date", "Day", "Subject / Description", "Category", "Timetable Slot", "Window Start", "Window End", "Actual Start", "Late By (min)", "Duration (min)", "Ended At"]];

    const sorted = [...tasks].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
    sorted.forEach(t => {
      const startMs = Number(t.startTime || 0);
      const endMs = Number(t.endTime || startMs);
      const isRecent = startMs >= cutoff90;
      const match = isRecent ? this._matchToWindow(startMs, missionTasks) : null;

      let lateBy = "—";
      let slotLabel = "—";
      let winStart = "";
      let winEnd = "";

      if (match) {
        slotLabel = match.slot;
        winStart = this._fmtH(match.wStart);
        winEnd = this._fmtH(match.wEnd);
        const actualH = new Date(startMs).getHours() + new Date(startMs).getMinutes() / 60;
        lateBy = Math.round((actualH - match.wStart) * 60);
        // Negative = early (ahead of schedule)
      }

      rows.push([
        t.date || "",
        t.date ? this._dayName(t.date) : "",
        t.description || t.subcategory || "",
        t.category || "",
        slotLabel,
        winStart,
        winEnd,
        startMs ? this._fmtTs(startMs) : "",
        lateBy,
        t.duration || 0,
        endMs ? this._fmtTs(endMs) : ""
      ]);
    });
    return rows;
  }

  // --- Sheet 3: Per-Subject Stats ---
  _buildSubjectStats(punctualityRows) {
    // punctualityRows[0] is header
    const map = {}; // subject → {sessions, totalMins, lateBys, startHours}
    for (let i = 1; i < punctualityRows.length; i++) {
      const r = punctualityRows[i];
      const subj = r[2]; // Subject / Description
      if (!subj) continue;
      if (!map[subj]) map[subj] = { sessions: 0, totalMins: 0, lateBys: [], startHours: [] };
      map[subj].sessions += 1;
      map[subj].totalMins += Number(r[9]) || 0;
      if (r[8] !== "—" && r[8] !== "") map[subj].lateBys.push(Number(r[8]));
      if (r[7]) {
        // parse "HH:MM AM/PM" back to decimal hours
        const m = r[7].match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (m) {
          let h = parseInt(m[1]); const mn = parseInt(m[2]); const ap = m[3].toUpperCase();
          if (ap === "AM" && h === 12) h = 0;
          if (ap === "PM" && h !== 12) h += 12;
          map[subj].startHours.push(h + mn / 60);
        }
      }
    }

    const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    const rows = [["Subject", "Total Sessions", "Total Time (min)", "Avg Duration (min)", "Avg Start Time", "Avg Late By (min)", "Times On Time (≤5m)", "Times Late (>5m)", "% On Time"]];

    Object.entries(map)
      .sort((a, b) => b[1].totalMins - a[1].totalMins)
      .forEach(([subj, s]) => {
        const avgDur = s.sessions ? Math.round(s.totalMins / s.sessions) : 0;
        const avgStartH = avg(s.startHours);
        const avgLate = s.lateBys.length ? Math.round(avg(s.lateBys)) : "—";
        const onTime = s.lateBys.filter(x => x <= 5).length;
        const late = s.lateBys.filter(x => x > 5).length;
        const pct = s.lateBys.length ? Math.round((onTime / s.lateBys.length) * 100) : "—";
        rows.push([
          subj,
          s.sessions,
          s.totalMins,
          avgDur,
          avgStartH != null ? this._fmtH(avgStartH) : "—",
          avgLate,
          onTime,
          late,
          pct !== "—" ? pct + "%" : "—"
        ]);
      });
    return rows;
  }

  // --- Sheet 4: Current Timetable ---
  _buildTimetable(missionTasks) {
    const rows = [["Slot", "Label", "Topic", "Window Start", "Window End", "Target (min)", "Priority", "Type"]];
    missionTasks.forEach((t, i) => {
      const [wS, wE] = Array.isArray(t.win) ? t.win : [null, null];
      rows.push([
        i + 1,
        t.label || "",
        t.topic || "",
        wS != null ? this._fmtH(wS) : "",
        wE != null ? this._fmtH(wE) : "",
        t.target_minutes || "",
        t.priority || "",
        t.discipline_type || ""
      ]);
    });
    return rows;
  }

  generate() {
    if (typeof XLSX === "undefined") {
      alert("Excel library not loaded yet. Please wait a moment and try again.");
      return;
    }

    const tasks = (this.app.state?.tasks || []).filter(t => t.startTime);
    const missionTasks = this.app.trainerEngine?.getDailyMissionTasks?.() || [];

    const dailyRows = this._buildDailyLog(tasks);
    const punctRows = this._buildPunctualityLog(tasks, missionTasks);
    const statsRows = this._buildSubjectStats(punctRows);
    const ttRows = this._buildTimetable(missionTasks);

    const wb = XLSX.utils.book_new();

    const addSheet = (name, rows) => {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      // Bold header row
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[addr]) continue;
        ws[addr].s = { font: { bold: true } };
      }
      // Auto column widths (approx)
      ws["!cols"] = rows[0].map((_, ci) => {
        const maxLen = rows.reduce((m, row) => Math.max(m, String(row[ci] ?? "").length), 0);
        return { wch: Math.min(40, Math.max(10, maxLen + 2)) };
      });
      XLSX.utils.book_append_sheet(wb, ws, name);
    };

    addSheet("📅 Daily Log", dailyRows);
    addSheet("⏰ Punctuality", punctRows);
    addSheet("📊 Subject Stats", statsRows);
    addSheet("📋 Timetable", ttRows);

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `discipline-report-${today}.xlsx`);
  }
}

// ─── Master's Message ────────────────────────────────────────────────────────
class MasterMessageManager {
  constructor(app) {
    this.app = app;
    this._renderVersion = 0;
    this._msgCyclePos   = 0;
    this.SLOTS = [
      { name: "Morning Study",    start: [5, 30],  end: [8, 30]  },
      { name: "Midday Block",     start: [9, 0],   end: [12, 0]  },
      { name: "Afternoon Block",  start: [14, 0],  end: [17, 30] },
      { name: "Evening Revision", start: [19, 0],  end: [21, 0]  },
    ];
  }

  initialize() {
    this.render();
    setInterval(() => this.render(), 5 * 60 * 1000);
  }

  fmt(minutes) {
    return this.app.formatDuration(Math.max(0, Math.round(Number(minutes) || 0)));
  }

  toTotalMins(h, m) { return h * 60 + m; }

  getCurrentSlot(nowMins) {
    return this.SLOTS.find(s =>
      nowMins >= this.toTotalMins(...s.start) && nowMins < this.toTotalMins(...s.end)
    ) || null;
  }

  getNextSlot(nowMins) {
    return this.SLOTS.find(s => this.toTotalMins(...s.start) > nowMins) || null;
  }

  // ── Personal best: highest productive day ever ────────────────────────────────
  getPersonalBest() {
    const tasks = this.app.state?.tasks || [];
    if (!tasks.length) return 0;
    const byDate = {};
    tasks.forEach(t => {
      if (!t.date || !this.app.isProductiveCategory?.(t.category)) return;
      byDate[t.date] = (byDate[t.date] || 0) + (t.duration || 0);
    });
    const vals = Object.values(byDate);
    return vals.length ? Math.max(...vals) : 0;
  }

  // ── Auto streak: consecutive days shadow target was beaten (ends yesterday) ─
  getCurrentStreak() {
    const tasks = this.app.state?.tasks || [];
    const shadowTarget = Math.round(Number(this.app.shadowEngine?.shadowSevenDayAverage || 0));
    if (shadowTarget === 0 || !tasks.length) return 0;
    let streak = 0;
    const now = new Date();
    for (let i = 1; i <= 60; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = this.app.getDateString(d);
      const mins = this.app.getProductiveMinutesForDate(dateStr, tasks);
      if (mins >= shadowTarget) {
        streak++;
      } else {
        break; // consecutive run broken
      }
    }
    return streak;
  }

  // ── Pick one phrase from a pool, rotating to avoid repetition ────────────
  pick(pool) {
    const idx = this._msgCyclePos % pool.length;
    this._msgCyclePos++;
    return pool[idx];
  }

  // ── Compose messages: varied, data-driven, 4 bubbles max ─────────────────
  composeMessages() {
    const now      = new Date();
    const nowMins  = now.getHours() * 60 + now.getMinutes();
    const hour     = now.getHours();
    const dow      = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][now.getDay()];

    const todayStr     = this.app.getDateString();
    const yd           = new Date(now); yd.setDate(yd.getDate() - 1);
    const ydStr        = this.app.getDateString(yd);

    const shadowTarget = Math.round(Number(this.app.shadowEngine?.shadowSevenDayAverage || 0));
    const todayMins    = this.app.getProductiveMinutesForDate(todayStr, this.app.state.tasks);
    const ydMins       = this.app.getProductiveMinutesForDate(ydStr,    this.app.state.tasks);
    const remaining    = Math.max(0, shadowTarget - todayMins);
    const streak       = this.getCurrentStreak(); // consecutive days before today where shadow was beaten

    const currentSlot  = this.getCurrentSlot(nowMins);
    const nextSlot     = this.getNextSlot(nowMins);

    const msgs = [];

    // ── Line 1: Shadow beaten today → PB chase. Not beaten → yesterday context. ──
    if (remaining === 0 && todayMins > 0) {
      // Shadow cleared — upgrade the target to personal best
      const pb = this.getPersonalBest();
      if (pb > 0 && todayMins >= pb) {
        msgs.push(this.pick([
          `${this.fmt(todayMins)}. Record smashed. You think this is where you stop? Cowards stop at records. Keep the timer running.`,
          `NEW ALL-TIME BEST. ${this.fmt(todayMins)}. The session is still open and you're thinking about stopping. Seriously?`,
          `You broke it. ${this.fmt(todayMins)}. Now throw another hour on top. That's what separates the ones who actually make it.`,
          `${this.fmt(todayMins)} — best day of your life. And the timer is still ticking. Don't you dare waste this moment.`,
        ]));
      } else if (pb > 0) {
        const gapToPB = pb - todayMins;
        msgs.push(this.pick([
          `You killed the shadow and your all-time record of ${this.fmt(pb)} is STILL standing there. ${this.fmt(gapToPB)} away. Are you a coward or not?`,
          `${this.fmt(gapToPB)}. Just ${this.fmt(gapToPB)} between you and the greatest day you have ever had. And you're SITTING THERE doing nothing.`,
          `Your record is ${this.fmt(pb)} and it hasn't moved. You're ${this.fmt(gapToPB)} away. If you close that app right now I genuinely feel sorry for you.`,
          `The shadow is dead. Your record is ${this.fmt(pb)} and it's laughing at your face. ${this.fmt(gapToPB)} left. Open the timer before you embarrass yourself.`,
          `You've done ${this.fmt(todayMins)}. Your personal best is ${this.fmt(pb)}. ${this.fmt(gapToPB)} is ALL that's left. If you stop now you deserve every failure coming your way.`,
        ]));
      } else {
        msgs.push(`Shadow is dead. Every minute from now on is a personal record. You have ZERO excuse to stop. Absolutely zero.`);
      }
    } else if (ydMins === 0) {
      msgs.push(this.pick([
        "ZERO yesterday. Not one second. What were you doing? Scrolling? Sleeping? Whatever it was, it wasn't your future.",
        "You gave yesterday ZERO minutes. Zero. That day is gone and you wasted it completely. Don't you dare do it again.",
        "Yesterday: zero. Nothing. Not a single minute logged. That is the behavior of someone who is going to fail. Change it today.",
        "Zero yesterday. That's not a bad day, that's a surrender. The log has it recorded permanently. Fix it today or it defines you.",
        "You had 24 hours yesterday and couldn't find even 30 minutes to work. What is actually wrong with you?",
      ]));
    } else if (ydMins < 60) {
      msgs.push(this.pick([
        `${this.fmt(ydMins)} yesterday. Under one hour. That is an absolute joke. You call that a study day? That's an insult to the word.`,
        `${this.fmt(ydMins)} yesterday — you spent more time in the bathroom than working. Disgusting effort. Fix it today.`,
        `Under 60 minutes yesterday. A child doing homework puts in more time than that. What is your excuse?`,
        `${this.fmt(ydMins)} yesterday. That's not studying. That's performing the idea of studying while wasting the entire day.`,
        `${this.fmt(ydMins)} logged yesterday and you probably felt proud of it. You shouldn't have. That's embarrassing.`,
      ]));
    } else if (shadowTarget > 0 && ydMins < shadowTarget * 0.8) {
      msgs.push(this.pick([
        `${this.fmt(ydMins)} yesterday when you needed ${this.fmt(shadowTarget)}. You absolutely BOTTLED it. That failure is in the record. Are you going to let it happen again today?`,
        `You owed ${this.fmt(shadowTarget)} yesterday. You paid ${this.fmt(ydMins)}. That's called underdelivering on your own life. Disgusting. Fix it.`,
        `${this.fmt(shadowTarget - ydMins)} short yesterday. That's not a small gap, that's you quitting before the finish line. Stop doing that.`,
        `Shadow demanded ${this.fmt(shadowTarget)} yesterday and you gave ${this.fmt(ydMins)}. You folded under your own target. How does that feel?`,
      ]));
    } else if (shadowTarget > 0 && ydMins >= shadowTarget) {
      if (streak >= 2) {
        msgs.push(this.pick([
          `${streak} days straight above shadow. If you break this today for ZERO reason, you are exactly the kind of person who never reaches their goals. Don't be that.`,
          `${streak}-day streak alive. Yesterday ${this.fmt(ydMins)}. You destroy this today and I promise you'll regret it. Keep it going.`,
          `${streak} days in a row. You finally built something. Breaking it today would be the dumbest thing you've done all week.`,
        ]));
      } else {
        msgs.push(this.pick([
          `You beat shadow yesterday. ONE day. Cool achievement. Now prove to yourself it wasn't a lucky accident and do it again RIGHT NOW.`,
          `Yesterday was good — ${this.fmt(ydMins)}. But one day of output means absolutely nothing without the day after it. What are you?`,
          `You won yesterday. Great. Does winning one day make you a winner, or does showing up every single day? Prove it today.`,
        ]));
      }
    } else {
      msgs.push(`${this.fmt(ydMins)} yesterday. Barely acceptable. Today that number goes up. No discussion.`);
    }

    // ── Line 2: Today's shadow target vs progress ─────────────────────────
    if (shadowTarget === 0) {
      msgs.push(this.pick([
        "The system has no target because you haven't logged enough sessions. You can't complain about lack of direction when you haven't shown up consistently.",
        "No shadow target set. That means no data. That means you're inconsistent. Stop reading this and go log something real.",
      ]));
    } else if (todayMins === 0 && hour >= 6) {
      msgs.push(this.pick([
        `${this.fmt(shadowTarget)} needed today. ZERO done. The day is bleeding out and you haven't even opened the timer. What are you actually doing with your life?`,
        `It's ${hour > 12 ? 'the afternoon' : 'the morning'} and you have logged NOTHING. ${this.fmt(shadowTarget)} is sitting there untouched. This is not a drill. START NOW.`,
        `Zero minutes. On a day you need ${this.fmt(shadowTarget)}. The audacity to sit there doing nothing is unreal. Open the timer.`,
        `Hours wasted. Zero logged. ${this.fmt(shadowTarget)} needed. You are actively destroying your own future by sitting there. GET UP.`,
        `${dow} is being murdered right in front of you and you're the one doing it. ${this.fmt(shadowTarget)} needed. Not one minute done. Open the timer RIGHT NOW.`,
      ]));
    } else if (todayMins === 0) {
      msgs.push(this.pick([
        `Day is starting and ${this.fmt(shadowTarget)} is waiting. Don't be the person who plans to start "in a bit" and then it's 11pm. Open the timer NOW.`,
        `${this.fmt(shadowTarget)} needed. Zero done. The ONLY acceptable next move is opening the timer. Everything else is an excuse.`,
      ]));
    } else if (remaining > 0) {
      const pct = Math.round((todayMins / shadowTarget) * 100);
      msgs.push(this.pick([
        `${pct}% done and you're thinking about stopping? ${this.fmt(remaining)} left. Finish the job or admit you have no discipline.`,
        `${this.fmt(todayMins)} in, ${this.fmt(remaining)} still owed. The shadow doesn't care that you're tired. The exam doesn't either. PUSH.`,
        `${this.fmt(remaining)} left and you're slowing down? This is EXACTLY how you end up short every single day of your life. Stop it.`,
        `${pct}% done means ${100 - pct}% undone. Stop patting yourself on the back for half a job. Finish it.`,
        `${this.fmt(remaining)} standing between you and beating your shadow. Not a mountain. Not impossible. ${this.fmt(remaining)}. Go.`,
      ]));
    } else {
      // Shadow beaten today — show streak
      const todayStreak = streak + 1;
      if (todayStreak >= 3) {
        msgs.push(this.pick([
          `${todayStreak} days STRAIGHT above shadow. ${this.fmt(todayMins)} today. You kill this streak right now and I don't want to hear another word about your goals.`,
          `${todayStreak} consecutive wins. That's not luck, that took work. Throwing it away today for no reason would be pathetic.`,
          `${todayStreak} days running. ${this.fmt(todayMins)} logged. You stop now and the whole streak resets. Was it even worth building?`,
        ]));
      } else if (todayStreak === 2) {
        msgs.push(this.pick([
          `Two days in a row beating shadow. ${this.fmt(todayMins)} today. One more tomorrow and you have a real streak. Don't be someone who quits at two.`,
          `Back to back. ${this.fmt(todayMins)} done. Tomorrow is the third. If you don't show up tomorrow this entire two-day run was meaningless.`,
        ]));
      } else {
        msgs.push(this.pick([
          `Shadow dead. ${this.fmt(todayMins)} on board. ONE day. You want a trophy? Show up tomorrow. That's the only reward that matters.`,
          `${this.fmt(todayMins)} done, shadow buried. Now use this open session to go after your personal best or get out of the chair. Sitting there scrolling is a waste of the win you just earned.`,
          `Target cleared. ${this.fmt(todayMins)} logged. This is bonus time and you're wasting it. Either chase the record or sleep. Pick one.`,
          `${this.fmt(todayMins)} on board. Shadow is dead. Every minute you keep the timer running now is extra. Are you going to take it or waste it?`,
        ]));
      }
    }

    // ── Line 3: Slot urgency ──────────────────────────────────────────────
    if (currentSlot && remaining > 0) {
      const slotEndMins = this.toTotalMins(...currentSlot.end);
      const minsLeft    = slotEndMins - nowMins;
      if (minsLeft <= 20) {
        msgs.push(this.pick([
          `${currentSlot.name} dies in ${minsLeft} minutes and ${this.fmt(remaining)} is STILL missing. If you don't open the timer this second you are throwing this slot straight in the bin.`,
          `${minsLeft} minutes left. ${this.fmt(remaining)} unpaid. ${currentSlot.name} is almost gone. Stop reading this message and START.`,
          `${currentSlot.name} is closing. ${minsLeft} min left. You owe ${this.fmt(remaining)}. Every second you spend not working right now is stolen from your own future.`,
        ]));
      } else {
        msgs.push(this.pick([
          `${currentSlot.name} is LIVE. ${minsLeft} minutes on the clock. ${this.fmt(remaining)} still missing. WHY is the timer not running?`,
          `You're sitting inside ${currentSlot.name} with ${minsLeft} minutes available and ${this.fmt(remaining)} still to do. This is not thinking time. OPEN THE TIMER.`,
          `${minsLeft} minutes in ${currentSlot.name} and you still need ${this.fmt(remaining)}. Use this slot or admit out loud that you're not serious about any of this.`,
          `${currentSlot.name}: ${minsLeft} min left. Gap: ${this.fmt(remaining)}. Timer not running. What is your actual plan here?`,
        ]));
      }
    } else if (currentSlot && remaining === 0) {
      msgs.push(this.pick([
        `Shadow is dead and ${currentSlot.name} is STILL open. You are sitting on free bonus time. Go destroy your personal record right now or get out of the chair and properly rest. Scrolling is not rest and it's not work.`,
        `${currentSlot.name} running, target gone. Chase the all-time best or commit to real recovery. Sitting there half-checking your phone is a waste of both.`,
        `Target done. ${currentSlot.name} still open. You have a choice: go further or rest properly. Doing nothing is the worst option and you know it.`,
      ]));
    } else if (!currentSlot && nextSlot) {
      const minsUntil = this.toTotalMins(...nextSlot.start) - nowMins;
      if (remaining > 0) {
        if (minsUntil <= 15) {
          msgs.push(this.pick([
            `${nextSlot.name} opens in ${minsUntil} minutes and ${this.fmt(remaining)} is still due. The second that slot starts, the timer goes on. No warmup. No settling in. STRAIGHT in.`,
            `${minsUntil} minutes until ${nextSlot.name}. Don't you dare use this gap as an excuse to delay again. Be ready before it opens.`,
          ]));
        } else {
          msgs.push(this.pick([
            `No slot right now but ${this.fmt(remaining)} is still hanging over you. ${nextSlot.name} opens in ${minsUntil} min. The moment it does — timer on. No delays, no excuses.`,
            `${minsUntil} minutes until ${nextSlot.name}. ${this.fmt(remaining)} still owed. Don't waste the break AND fumble the next slot. That would be pathetic.`,
            `Break. Fine. But ${this.fmt(remaining)} is still your problem and ${nextSlot.name} opens in ${minsUntil} min. You better be ready to run the second the slot opens.`,
          ]));
        }
      } else {
        msgs.push(this.pick([
          `Shadow beaten. ${nextSlot.name} opens in ${minsUntil} min. Rest hard — then come back and go after the personal record.`,
          `Target done. ${minsUntil} minutes free. Recover properly or keep going. But don't waste this time doing nothing, that's the worst of both worlds.`,
        ]));
      }
    } else if (!currentSlot && !nextSlot) {
      if (remaining > 0) {
        msgs.push(this.pick([
          `Every single slot is gone and you're STILL ${this.fmt(remaining)} short. You find that time right now outside the plan, or you write today off as a loss. Which are you choosing?`,
          `Timetable finished. Shadow still wants ${this.fmt(remaining)}. Are you going to be someone who finds a way, or someone who says "the schedule didn't allow it"? Pick.`,
        ]));
      } else {
        msgs.push(this.pick([
          `Day done. Shadow beaten. Go to sleep on time. Your performance tomorrow is being decided in the next hour.`,
          `All slots done, target destroyed. Put the phone down, set tomorrow, sleep. Don't sabotage a good day with a stupid night.`,
          `You won today. Don't ruin it by staying up until 2am rotting. Sleep is part of the system. Use it.`,
        ]));
      }
    }

    // ── Line 4: Training Camp / rank status ─────────────────────────────────
    const rankProgress = this.app.shadowEngine?.getRankProgressState?.();
    const rankTiers    = this.app.shadowEngine?.rankTiers || [];
    if (rankProgress && rankTiers.length) {
      const rank = rankTiers[rankProgress.unlockedRankIndex] || rankTiers[0];
      const camp = rankProgress.trainingCamp;
      if (camp?.active) {
        const provRank = rankTiers[camp.provisionalRankIndex];
        const req = this.app.shadowEngine.getTrainingCampSuccessRequirement?.() || 7;
        const daysLeft = req - camp.successDays;
        const failsLeft = 10 - camp.daysCompleted - daysLeft;
        msgs.push(this.pick([
          `Training Camp. Day ${camp.daysCompleted} of 10. ${camp.successDays} wins. Need ${req} to confirm ${provRank?.title || 'the rank'}. ${daysLeft} more wins needed. Fail today and you make the math brutal. Don't.`,
          `Camp is live. ${camp.successDays}/${req} wins. ${daysLeft} left. One wasted day now and you might not recover the numbers in time. Beat the shadow today. No excuses.`,
          `Day ${camp.daysCompleted} of 10 in Camp. ${camp.successDays} cleared out of ${req}. You cannot afford to throw a single day away right now. WIN TODAY.`,
          `${daysLeft} wins still needed for ${provRank?.title || 'the rank'}. ${10 - camp.daysCompleted} days left. One unnecessary loss here could end the entire camp. Don't be that stupid.`,
        ]));
      } else if (rank) {
        const nextRank = rankTiers[rankProgress.unlockedRankIndex + 1];
        if (nextRank && shadowTarget > 0) {
          msgs.push(this.pick([
            `You're stuck at ${rank.title} and it shows. ${nextRank.title} needs ${nextRank.min} rating. Right now you're performing like someone comfortable staying exactly where they are.`,
            `${rank.title} is your current ceiling. ${nextRank.title} is above it and it needs ${nextRank.min} rating. You want it? Then stop underperforming and go get it.`,
            `${nextRank.title} unlocks at ${nextRank.min} rating. You're sitting at ${rank.title} going nowhere. Either chase the next rank or admit this is your limit.`,
          ]));
        }
      }
    }

    return msgs.slice(0, 4); // max 4 bubbles
  }

  render() {
    const bubblesEl = document.getElementById("master-msg-bubbles");
    const timeEl    = document.getElementById("master-msg-time");
    if (!bubblesEl) return;

    // Stamp this render — stale setTimeout closures will bail out
    this._renderVersion++;
    const myVersion = this._renderVersion;

    if (timeEl) {
      timeEl.textContent = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", hour12: true,
      });
    }

    bubblesEl.innerHTML = "";
    const messages = this.composeMessages();

    messages.forEach((msg, i) => {
      setTimeout(() => {
        if (this._renderVersion !== myVersion) return; // stale — drop it
        const typing = document.createElement("div");
        typing.className = "master-typing";
        typing.innerHTML = "<span></span><span></span><span></span>";
        bubblesEl.appendChild(typing);

        setTimeout(() => {
          if (this._renderVersion !== myVersion) return; // stale — drop it
          typing.remove();
          const bubble = document.createElement("div");
          bubble.className = "master-bubble";
          bubble.textContent = msg;
          bubblesEl.appendChild(bubble);
        }, 900);
      }, i * 1600);
    });
  }
}
// ─────────────────────────────────────────────────────────────────────────────

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
    if (window.app.masterMessage) window.app.masterMessage.render();
  }
});
window.addEventListener("beforeunload", () => {
  if (window.app?.stopwatch?.tickIntervalId)
    clearInterval(window.app.stopwatch.tickIntervalId);
});




