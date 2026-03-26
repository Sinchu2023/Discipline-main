const CONFIG = {
  DB_SCHEMA_VERSION: 2,
  CLIENT_VERSION: "2026.03.12.3",
  DAILY_PRODUCTIVITY_THRESHOLD_MINUTES: 240,
  DISTRACTION_BUDGET_MINUTES: 90,
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
    ROADMAP_STATE: "discipline_tracker_roadmap_state",
    FIREBASE_USER: "discipline_tracker_firebase_user",
    CLIENT_VERSION: "discipline_tracker_client_version",
    TIMER_CLOUD_STATE: "discipline_tracker_timer_cloud_state",
    // Shadow Engine 2.0
    BEHAVIOR_SIGNALS: "discipline_behavior_signals",
    SLEEP_COMPROMISE_LOG: "discipline_sleep_compromise_log",
    BEHAVIORAL_STATE: "discipline_behavioral_state",
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

  // ── Shadow Engine 2.0 Constants ─────────────────────────────────────────
  SE2: {
    // Learning rates (progressive correction)
    LEARNING_RATE_FAILURE_SEVERE: 0.1,
    LEARNING_RATE_FAILURE_MODERATE: 0.2,
    LEARNING_RATE_STABLE: 0.3,
    LEARNING_RATE_GROWTH: 0.35,
    // Smart Success Evaluation — below this ratio, partial credit only
    EFFORT_SUCCESS_THRESHOLD: 0.7,
    // Flexible task buffer multiplier
    FLEXIBLE_TASK_MULTIPLIER: 1.5,
    // Max minutes a target may shift in a single day (Stable vs Recovery)
    MAX_DAILY_SHIFT_LIMIT: 30,
    MAX_DAILY_SHIFT_RECOVERY_LIMIT: 120, 
    // Sleep limits (minutes)
    MIN_SLEEP_LIMIT: 300,  // 5 hours — absolute floor
    IDEAL_SLEEP: 420,      // 7 hours — target
    // How many sleep compromises are allowed in a rolling 7-day window
    MAX_SLEEP_COMPROMISES_PER_7_DAYS: 2,
    // Behavioral state thresholds
    STATE_RECOVERY_WIN_RATE_MAX: 0.40,
    STATE_GROWTH_WIN_RATE_MIN: 0.70,
    // Strict task violation window (minutes late = failure)
    STRICT_TASK_GRACE_MINUTES: 5,
    // Anti-misuse: if flexible skip rate exceeds this, reduce buffer
    FLEX_ABUSE_SKIP_RATE_THRESHOLD: 0.60,
    // Recovery load reduction factor
    RECOVERY_LOAD_REDUCTION: 0.15,
    FATIGUE_LOAD_REDUCTION_FACTOR: 0.20,
    FATIGUE_THRESHOLD_MINUTES: 420, // 7 hours
  },

  DAILY_GOALS: [
    {
      id: "roadmap_learning",
      label: "Shunt Clipper Circuits Clamper Circuits",
      minutesTarget: 180,
      sessionsTarget: 0,
      keywords: ["deep work", "learn", "learning", "study"],
      discipline_type: "strict",
      estimated_minutes: 150,
      target_minutes: 180,
      priority: 0,
      category: "learning",
    },
    {
      id: "project",
      label: "Project Work",
      minutesTarget: 180,
      sessionsTarget: 0,
      keywords: ["project", "build"],
      // Shadow Engine 2.0 metadata
      discipline_type: "flexible",
      estimated_minutes: 120,
      target_minutes: 180,
      priority: 1,
      category: "deep_work",
    },
    {
      id: "revision",
      label: "Revision",
      minutesTarget: 120,
      sessionsTarget: 0,
      keywords: ["revision"],
      // Shadow Engine 2.0 metadata
      discipline_type: "flexible",
      estimated_minutes: 90,
      target_minutes: 120,
      priority: 2,
      category: "learning",
    },
  ],
};
