    // ==============================================
    // Discipline Tracker Pro - Extended Logic/Data/Reporting
    // ==============================================
    const CONFIG = {
      DB_SCHEMA_VERSION: 2,
      DAILY_PRODUCTIVITY_THRESHOLD_MINUTES: 240,
      DISTRACTION_BUDGET_MINUTES: 90,
      STORAGE_KEYS: {
        TASKS: 'discipline_tracker_tasks',
        FAVORITES: 'discipline_tracker_favorites',
        STREAK: 'discipline_tracker_streak',
        LAST_ACTIVITY: 'discipline_tracker_last_activity',
        ACTIVE_TASK: 'discipline_tracker_active_task',
        SCHEMA_VERSION: 'discipline_tracker_schema_version',
        SYNC_ENDPOINT: 'discipline_tracker_sync_endpoint',
        SYNC_DEVICE_ID: 'discipline_tracker_device_id',
        SYNC_QUEUE: 'discipline_tracker_sync_queue',
        SHADOW_AVG: 'discipline_tracker_shadow_avg',
        TRAINER_STATE: 'discipline_tracker_trainer_state',
        FLOW_PROTOCOL: 'discipline_tracker_flow_protocol'
      },
      MOTIVATION_INTERVAL: 15000,
      CHART_RANGES: { '7d': 7, '30d': 30, '3m': 90, '6m': 180, '1y': 365 },
      DAILY_GOALS: [
        { id: 'nptel', label: 'NPTEL', minutesTarget: 120, sessionsTarget: 2, keywords: ['nptel'] },
        { id: 'yt', label: 'YouTube Learning', minutesTarget: 120, sessionsTarget: 2, keywords: ['youtube', 'yt'] },
        { id: 'project', label: 'Project Work', minutesTarget: 180, sessionsTarget: 0, keywords: ['project'] }
      ]
    };
    const CATEGORY_DEFINITIONS = {
      'Sleep': ['Night Sleep', 'Nap', 'Recovery'],
      'Productive Work': ['Analog', 'PCB', 'Coding', 'Control Systems', 'Planning', 'Execution'],
      'Physical Training': ['Chest', 'Back', 'Legs', 'Arms', 'Conditioning', 'Mobility'],
      'Study / Skill Development': ['Reading', 'Course', 'Practice', 'Research'],
      'Time Waste / Distraction': ['Social Media', 'Streaming', 'Gaming', 'Browsing', 'Idle'],
      'Miscellaneous': ['Admin', 'Commute', 'Family', 'Other']
    };
    const CATEGORY_ALIASES = {
      sleep: 'Sleep',
      rest: 'Sleep',
      productive: 'Productive Work',
      work: 'Productive Work',
      training: 'Physical Training',
      physical: 'Physical Training',
      workout: 'Physical Training',
      study: 'Study / Skill Development',
      skill: 'Study / Skill Development',
      learning: 'Study / Skill Development',
      waste: 'Time Waste / Distraction',
      distraction: 'Time Waste / Distraction',
      misc: 'Miscellaneous',
      miscellaneous: 'Miscellaneous'
    };
    const PRODUCTIVE_CATEGORIES = new Set(['Productive Work', 'Physical Training', 'Study / Skill Development']);
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
      "The only way to achieve the impossible is to believe it is possible."
    ];
    const STREAK_MESSAGES = {
      1: "Day one. This is where it begins.", 3: "Three days strong. Momentum is building.",
      7: "One week! Discipline is becoming a habit.", 14: "Two weeks. You're building something real.",
      21: "Three weeks. This is who you are now.", 30: "One month of discipline. Elite status.",
      60: "Two months. You've transformed.", 90: "Three months. Unstoppable.",
      100: "Century streak. This is your identity.", 365: "One year. You've mastered yourself."
    };

    class ActivityClassifier {
      static classify(activityInput) {
        const activity = (activityInput || '').trim();
        const text = activity.toLowerCase();

        const strongDistraction = ['random', 'scrolling', 'reels', 'timepass', 'doomscroll', 'binge', 'procrastination'];
        const distractionKeywords = ['instagram', 'tiktok', 'youtube shorts', 'gaming', 'games', 'twitter', 'x app', 'reddit', 'netflix', 'series', 'memes', 'chatting'];
        const productiveKeywords = ['coding', 'project', 'study', 'learning', 'course', 'workout', 'exercise', 'gym', 'chest', 'back', 'legs', 'pcb', 'analog', 'control systems', 'research', 'writing', 'build'];
        const neutralKeywords = ['commute', 'cleaning', 'meal', 'eating', 'shopping', 'family', 'chores', 'admin', 'errands', 'restroom'];

        let productiveScore = 0;
        let distractionScore = 0;
        let neutralScore = 0;

        strongDistraction.forEach(k => { if (text.includes(k)) distractionScore += 5; });
        distractionKeywords.forEach(k => { if (text.includes(k)) distractionScore += 3; });
        productiveKeywords.forEach(k => { if (text.includes(k)) productiveScore += 3; });
        neutralKeywords.forEach(k => { if (text.includes(k)) neutralScore += 2; });

        if (!text) neutralScore += 1;

        let category = 'NEUTRAL';
        let graph_tag = 'neutral';
        if (distractionScore > productiveScore && distractionScore >= neutralScore) {
          category = 'DISTRACTION';
          graph_tag = 'distraction';
        } else if (productiveScore > distractionScore && productiveScore >= neutralScore) {
          category = 'PRODUCTIVE';
          graph_tag = 'productivity';
        }

        const maxScore = Math.max(productiveScore, distractionScore, neutralScore, 1);
        const secondScore = [productiveScore, distractionScore, neutralScore].sort((a, b) => b - a)[1] || 0;
        const confidence = Math.max(40, Math.min(100, Math.round(55 + (maxScore - secondScore) * 9)));

        let waste_level = 'NONE';
        if (category === 'DISTRACTION') {
          if (strongDistraction.some(k => text.includes(k)) || distractionScore >= 8) waste_level = 'HIGH';
          else if (distractionScore >= 5) waste_level = 'MODERATE';
          else waste_level = 'LOW';
        }

        return {
          activity,
          category,
          confidence,
          waste_level,
          graph_tag
        };
      }
    }
    class SyncManager {
      constructor(app) { this.app = app; }
      get endpoint() { return localStorage.getItem(CONFIG.STORAGE_KEYS.SYNC_ENDPOINT); }
      getDeviceId() {
        let id = localStorage.getItem(CONFIG.STORAGE_KEYS.SYNC_DEVICE_ID);
        if (!id) {
          id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          localStorage.setItem(CONFIG.STORAGE_KEYS.SYNC_DEVICE_ID, id);
        }
        return id;
      }
      queue(change) {
        const q = this.app.loadFromStorage(CONFIG.STORAGE_KEYS.SYNC_QUEUE) || [];
        q.push(change);
        this.app.saveToStorage(CONFIG.STORAGE_KEYS.SYNC_QUEUE, q);
      }
      async flushQueue() {
        if (!navigator.onLine || !this.endpoint) return;
        const queue = this.app.loadFromStorage(CONFIG.STORAGE_KEYS.SYNC_QUEUE) || [];
        if (!queue.length) return;
        try {
          await fetch(this.endpoint, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId: this.getDeviceId(), changes: queue })
          });
          this.app.saveToStorage(CONFIG.STORAGE_KEYS.SYNC_QUEUE, []);
        } catch (e) { console.warn('Sync flush failed:', e); }
      }
      async pullLatest() {
        if (!navigator.onLine || !this.endpoint) return;
        try {
          const res = await fetch(`${this.endpoint}?deviceId=${encodeURIComponent(this.getDeviceId())}`);
          if (!res.ok) return;
          const payload = await res.json();
          if (!Array.isArray(payload.entries)) return;
          this.app.taskManager.mergeTasks(payload.entries.map(t => this.app.normalizeTask(t)));
        } catch (e) { console.warn('Cloud pull failed:', e); }
      }
      async syncNow() { await this.flushQueue(); await this.pullLatest(); }
    }
    class DisciplineTracker {
      constructor() {
        this.state = {
          tasks: (this.loadFromStorage(CONFIG.STORAGE_KEYS.TASKS) || []).map(t => this.normalizeTask(t)),
          favorites: this.loadFromStorage(CONFIG.STORAGE_KEYS.FAVORITES) || [],
          streak: parseInt(this.loadFromStorage(CONFIG.STORAGE_KEYS.STREAK)) || 0,
          lastActivityDate: this.loadFromStorage(CONFIG.STORAGE_KEYS.LAST_ACTIVITY),
          activeTask: this.loadFromStorage(CONFIG.STORAGE_KEYS.ACTIVE_TASK),
          charts: { productivity: null, sleep: null }
        };
        this.elements = this.initializeElements();
        this.syncManager = new SyncManager(this);
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
        ['stopwatch','task-input','start-btn','stop-btn','sleep-btn','add-favorite','active-task-indicator','active-task-name','active-task-start','favorites-grid','tasks-list','productive-time','sleep-time','total-time','streak-display','current-date','current-time','motivation-line','prod-range','prod-filter','prod-filter-total','graph-productivity-total','graph-total-distraction','graph-logged-distraction','sleep-range','productivity-chart','sleep-chart','streak-popup','streak-count','streak-message','close-streak','view-report','export-data','import-data','import-file','report-modal','report-content','close-modal','print-report','close-report','open-trainer','trainer-modal','trainer-overview','trainer-content','close-trainer','close-trainer-modal','refresh-trainer','copy-trainer','shadow-current-card','shadow-standard-card','shadow-current-minutes','shadow-percent','shadow-gap','shadow-status','shadow-progress-fill','shadow-average','shadow-rank','shadow-badge','shadow-duel','shadow-note','shadow-weekly-average','shadow-momentum','shadow-weekly-gap','shadow-target','shadow-pressure','shadow-score','shadow-needed-tie','shadow-needed-lead','shadow-defense-target','shadow-verdict','shadow-trend','shadow-lead-margin','shadow-duel-you-fill','shadow-duel-shadow-fill','shadow-penalty','shadow-penalty-reason','shadow-penalty-expiry','shadow-distraction-budget','shadow-win-ladder','shadow-mission-score','goal-nptel','goal-yt','goal-project','flow-blockers-status','flow-proneness-status','flow-triggers-status','flow-cycle-status','wake-now-btn','first-action-btn','kill-switch-btn','kill-switch-countdown','flow-before-phone-check','attention-minus-btn','attention-plus-btn','attention-stretch-value','war-score','flow-action-steps'].forEach(id => elements[id] = document.getElementById(id));
        return elements;
      }
      loadFromStorage(key) { try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : null; } catch { return null; } }
      saveToStorage(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error('storage save failed', e); } }
      migrateSchema() {
        const current = parseInt(this.loadFromStorage(CONFIG.STORAGE_KEYS.SCHEMA_VERSION)) || 1;
        if (current < CONFIG.DB_SCHEMA_VERSION) {
          this.state.tasks = this.state.tasks.map(t => this.normalizeTask(t));
          this.saveToStorage(CONFIG.STORAGE_KEYS.TASKS, this.state.tasks);
          this.saveToStorage(CONFIG.STORAGE_KEYS.SCHEMA_VERSION, CONFIG.DB_SCHEMA_VERSION);
        }
      }
      normalizeTask(task) {
        const isLegacySleep = task.isSleep === true || task.category === 'Sleep';
        const category = this.resolveCategory(task.category || (isLegacySleep ? 'Sleep' : 'Miscellaneous'));
        const fallbackSub = CATEGORY_DEFINITIONS[category]?.[0] || 'General';
        const subcategory = task.subcategory || (isLegacySleep ? 'Night Sleep' : fallbackSub);
        const description = task.description || task.name || '';
        const startTime = Number(task.startTime || Date.now());
        const endTime = Number(task.endTime || startTime);
        const rawDuration = task.duration ?? Math.round((endTime - startTime) / 60000);
        const duration = Math.min(24 * 60, Math.max(0, Number.isFinite(rawDuration) ? rawDuration : 0));

        const classifierInput = (task.description || task.name || '').trim();
        const classification = ActivityClassifier.classify(classifierInput);

        // Context-aware correction so graph filters remain reliable:
        // category intent from user selection is respected over weak text hints.
        if (category === 'Time Waste / Distraction') {
          classification.category = 'DISTRACTION';
          classification.graph_tag = 'distraction';
          if (classification.waste_level === 'NONE') classification.waste_level = duration >= 90 ? 'HIGH' : (duration >= 30 ? 'MODERATE' : 'LOW');
          classification.confidence = Math.max(75, classification.confidence);
        } else if (PRODUCTIVE_CATEGORIES.has(category)) {
          classification.category = 'PRODUCTIVE';
          classification.graph_tag = 'productivity';
          classification.waste_level = 'NONE';
          classification.confidence = Math.max(70, classification.confidence);
        } else if (category === 'Sleep' || category === 'Miscellaneous') {
          classification.category = 'NEUTRAL';
          classification.graph_tag = 'neutral';
          classification.waste_level = 'NONE';
          classification.confidence = Math.max(60, classification.confidence);
        }

        const graphTag = task.graph_tag || classification.graph_tag;
        const wasteLevel = task.waste_level || classification.waste_level;
        const growthCategory = task.growth_category || classification.category;
        const confidence = Number(task.confidence ?? classification.confidence);

        return {
          id: task.id || `${startTime}-${Math.random().toString(36).slice(2, 8)}`,
          category, subcategory, description,
          startTime, endTime, duration,
          date: task.date || this.getDateString(new Date(startTime)),
          sourceDevice: task.sourceDevice || this.syncManager?.getDeviceId?.() || 'local',
          createdAt: task.createdAt || Date.now(),
          updatedAt: Date.now(),
          growth_category: growthCategory,
          confidence,
          waste_level: wasteLevel,
          graph_tag: graphTag,
          classification_json: {
            activity: task.description || task.name || '',
            category: growthCategory,
            confidence,
            waste_level: wasteLevel,
            graph_tag: graphTag
          }
        };
      }
      getDateString(date = new Date()) { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
      getInferredWasteMinutesForDate(dateStr, sourceTasks = this.state.tasks) {
        const trackedMinutes = sourceTasks
          .filter(task => task.date === dateStr && Number.isFinite(task.duration) && task.duration > 0)
          .reduce((sum, task) => sum + task.duration, 0);
        return Math.max(0, 1440 - Math.min(1440, trackedMinutes));
      }
      formatDuration(minutes) { const h=Math.floor(minutes/60),m=Math.floor(minutes%60); return `${h}h ${String(m).padStart(2,'0')}m`; }
      formatTime(ts) { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
      isProductiveCategory(category) { return PRODUCTIVE_CATEGORIES.has(category); }
      resolveCategory(inputCategory) {
        const categories = Object.keys(CATEGORY_DEFINITIONS);
        if (!inputCategory) return 'Miscellaneous';
        const normalized = String(inputCategory).trim().toLowerCase();
        const exact = categories.find(c => c.toLowerCase() === normalized);
        if (exact) return exact;
        if (CATEGORY_ALIASES[normalized]) return CATEGORY_ALIASES[normalized];
        const loose = categories.find(c => c.toLowerCase().includes(normalized) || normalized.includes(c.toLowerCase()));
        return loose || 'Miscellaneous';
      }
      async initialize() {
        if (!window.Chart) { try { await this.loadChartJS(); } catch {} }
        this.uiManager.initialize(); this.taskManager.initialize(); this.shadowEngine.initialize(); this.trainerEngine.initialize(); this.flowEngine.initialize(); this.graphManager.initialize(); this.eventManager.initialize();
        this.updateStreak();
        if (this.state.activeTask) this.stopwatch.resumeActiveTask(this.state.activeTask);
        window.addEventListener('online', () => this.syncManager.syncNow());
        await this.syncManager.syncNow();
      }
      loadChartJS() { return new Promise((resolve, reject) => { const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/chart.js'; s.onload=resolve; s.onerror=reject; document.head.appendChild(s); }); }
      updateStreak(showPopup = false) {
        const dates = [...new Set(this.state.tasks.map(t => t.date))].sort();
        if (!dates.length) { this.state.streak=0; this.elements['streak-display'].textContent=0; return; }
        const set = new Set(dates); const today = this.getDateString();
        let streak=0; let cursor=set.has(today)?today:this.getDateString(new Date(Date.now()-86400000));
        while (set.has(cursor)) { streak++; const d=new Date(cursor); d.setDate(d.getDate()-1); cursor=this.getDateString(d); }
        const old=this.state.streak; this.state.streak=streak;
        this.saveToStorage(CONFIG.STORAGE_KEYS.STREAK, streak); this.elements['streak-display'].textContent=streak;
        if (showPopup && streak > old && streak > 1) this.uiManager.showStreakPopup();
      }
    }
    class StopwatchManager {
      constructor(app) { this.app = app; this.startTime = null; this.elapsedTime = 0; this.animationFrameId = null; this.isRunning = false; this.pendingMeta = null; }
      collectEntryMetadata(taskName, forceCategory = null) {
        const categories = Object.keys(CATEGORY_DEFINITIONS);
        const defaultCategory = forceCategory || 'Productive Work';
        const categoryInput = prompt(`Category (${categories.join(' | ')})`, defaultCategory);
        if (categoryInput === null) return null;
        const category = this.app.resolveCategory(categoryInput) || defaultCategory;
        const subList = CATEGORY_DEFINITIONS[category] || ['General'];
        const subInput = prompt(`Subcategory for ${category} (${subList.join(' | ')})`, subList[0]);
        if (subInput === null) return null;
        const subcategory = subInput.trim() || subList[0];
        const description = (this.app.elements['task-input'].value.trim() || taskName || '').slice(0, 120);
        return { category, subcategory, description };
      }
      start(taskName = null, meta = null) {
        if (this.isRunning) return alert('A task is already running. Stop it first.');
        const name = taskName || this.app.elements['task-input'].value.trim();
        if (!name && !meta) return alert('Please enter a task name');
        const resolvedMeta = meta || this.collectEntryMetadata(name, null);
        if (!resolvedMeta) return;
        this.startTime = Date.now(); this.isRunning = true; this.elapsedTime = 0;
        this.app.state.activeTask = { name: name || resolvedMeta.subcategory, startTime: this.startTime, ...resolvedMeta };
        this.app.saveToStorage(CONFIG.STORAGE_KEYS.ACTIVE_TASK, this.app.state.activeTask);
        this.app.elements['start-btn'].disabled = true; this.app.elements['stop-btn'].disabled = false; this.app.elements['task-input'].disabled = true;
        this.app.elements['active-task-name'].textContent = `${this.app.state.activeTask.category} • ${this.app.state.activeTask.subcategory}`;
        this.app.elements['active-task-start'].textContent = this.app.formatTime(this.startTime); this.app.elements['active-task-indicator'].style.display = 'block';
        this.update();
      }
      startSleep() { this.start('Sleep', { category: 'Sleep', subcategory: 'Night Sleep', description: 'Sleep Session' }); }
      update() {
        if (!this.isRunning) return;
        this.elapsedTime = Date.now() - this.startTime;
        const h=Math.floor(this.elapsedTime/3600000),m=Math.floor((this.elapsedTime%3600000)/60000),s=Math.floor((this.elapsedTime%60000)/1000);
        this.app.elements['stopwatch'].textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        this.animationFrameId = requestAnimationFrame(() => this.update());
      }
      stop() {
        if (!this.isRunning) return;
        this.isRunning = false; if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        const endTime = Date.now();
        const entry = this.app.normalizeTask({
          id: `${Date.now()}`,
          ...this.app.state.activeTask,
          startTime: this.startTime,
          endTime,
          duration: Math.max(1, Math.round((endTime - this.startTime) / 60000)),
          date: this.app.getDateString(new Date(this.startTime))
        });
        this.app.taskManager.addTask(entry);
        this.reset();
      }
      reset() {
        this.isRunning=false; this.startTime=null; this.elapsedTime=0; if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.app.state.activeTask=null; this.app.saveToStorage(CONFIG.STORAGE_KEYS.ACTIVE_TASK, null);
        this.app.elements['stopwatch'].textContent='00:00:00'; this.app.elements['start-btn'].disabled=false; this.app.elements['stop-btn'].disabled=true;
        this.app.elements['task-input'].disabled=false; this.app.elements['active-task-indicator'].style.display='none'; this.app.elements['task-input'].value='';
      }
      resumeActiveTask(activeTask) {
        if (!activeTask?.startTime) return;
        this.startTime = activeTask.startTime; this.isRunning = true; this.app.state.activeTask = activeTask;
        this.app.elements['start-btn'].disabled = true; this.app.elements['stop-btn'].disabled = false; this.app.elements['task-input'].disabled = true;
        this.app.elements['active-task-name'].textContent = `${activeTask.category || 'Productive Work'} • ${activeTask.subcategory || 'General'}`;
        this.app.elements['active-task-start'].textContent = this.app.formatTime(activeTask.startTime); this.app.elements['active-task-indicator'].style.display = 'block';
        this.update();
      }
    }
    class TaskManager {
      constructor(app) { this.app = app; }
      initialize() { this.updateStats(); this.renderTasks(); this.renderFavorites(); }
      mergeTasks(incoming) {
        const map = new Map(this.app.state.tasks.map(t => [t.id, t]));
        incoming.forEach(t => map.set(t.id, this.app.normalizeTask(t)));
        this.app.state.tasks = [...map.values()].sort((a,b) => a.startTime - b.startTime);
        this.app.saveToStorage(CONFIG.STORAGE_KEYS.TASKS, this.app.state.tasks);
        this.updateStats(); this.renderTasks(); this.app.graphManager.updateCharts(); this.app.updateStreak();
      }
      addTask(task) {
        this.app.state.tasks.push(this.app.normalizeTask(task));
        this.app.saveToStorage(CONFIG.STORAGE_KEYS.TASKS, this.app.state.tasks);
        this.app.syncManager.queue({ type: 'upsert', entry: task, ts: Date.now() });
        this.app.syncManager.flushQueue();
        this.updateStats(); this.renderTasks(); this.app.graphManager.updateCharts(); this.app.updateStreak(true);
      }
      deleteTask(taskId) {
        this.app.state.tasks = this.app.state.tasks.filter(task => task.id !== taskId);
        this.app.saveToStorage(CONFIG.STORAGE_KEYS.TASKS, this.app.state.tasks);
        this.app.syncManager.queue({ type: 'delete', id: taskId, ts: Date.now() });
        this.updateStats(); this.renderTasks(); this.app.graphManager.updateCharts(); this.app.updateStreak();
      }
      updateStats() {
        const today = this.app.getDateString();
        const todayTasks = this.app.state.tasks.filter(task => task.date === today);
        const productiveTime = todayTasks.filter(task => this.app.isProductiveCategory(task.category)).reduce((t, task) => t + task.duration, 0);
        const sleepTime = todayTasks.filter(task => task.category === 'Sleep').reduce((t, task) => t + task.duration, 0);
        const totalTime = todayTasks.reduce((t, task) => t + task.duration, 0);
        this.app.elements['productive-time'].textContent = this.app.formatDuration(productiveTime);
        this.app.elements['sleep-time'].textContent = this.app.formatDuration(sleepTime);
        this.app.elements['total-time'].textContent = this.app.formatDuration(totalTime);

        if (this.app.shadowEngine) this.app.shadowEngine.refresh();
        if (this.app.flowEngine) this.app.flowEngine.refresh();
      }
      renderTasks() {
        const today = this.app.getDateString();
        const tasks = this.app.state.tasks.filter(task => task.date === today).sort((a,b) => b.startTime-a.startTime);
        const c = this.app.elements['tasks-list']; c.innerHTML = '';
        if (!tasks.length) {
          c.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-secondary);"><i class="fas fa-clipboard-list" style="font-size: 3rem; margin-bottom: 1rem;"></i><p>No tasks recorded today</p><p style="font-size: 0.9rem;">Start tracking your first task</p></div>`;
          return;
        }
        tasks.forEach(task => {
          const el=document.createElement('div');
          const isSleep = task.category === 'Sleep';
          el.className = `task-card ${isSleep ? 'sleep' : 'productive'}`;
          el.innerHTML = `<div class="task-header"><div class="task-name">${isSleep ? '💤' : '⚡'} ${task.category} • ${task.subcategory}</div><div class="task-duration">${this.app.formatDuration(task.duration)}</div></div><div class="task-time">${this.app.formatTime(task.startTime)} - ${this.app.formatTime(task.endTime)}</div><div class="task-time">${task.description || ''}</div><div class="task-actions">${isSleep ? `<button class="btn edit-sleep-btn" data-id="${task.id}"><i class="fas fa-pen"></i> Edit Sleep</button>` : ''}<button class="btn delete-task-btn" data-id="${task.id}"><i class="fas fa-trash"></i> Delete</button></div>`;
          c.appendChild(el);
        });
        document.querySelectorAll('.delete-task-btn').forEach(btn => btn.addEventListener('click', e => this.deleteTask(e.currentTarget.getAttribute('data-id'))));
        document.querySelectorAll('.edit-sleep-btn').forEach(btn => btn.addEventListener('click', e => this.editSleepTask(e.currentTarget.getAttribute('data-id'))));
      }

      editSleepTask(taskId) {
        const task = this.app.state.tasks.find(t => t.id === taskId && t.category === 'Sleep');
        if (!task) return;

        const toEditable = (ts) => {
          const d = new Date(ts);
          const Y = d.getFullYear();
          const M = String(d.getMonth() + 1).padStart(2, '0');
          const D = String(d.getDate()).padStart(2, '0');
          const h = String(d.getHours()).padStart(2, '0');
          const m = String(d.getMinutes()).padStart(2, '0');
          return `${Y}-${M}-${D} ${h}:${m}`;
        };

        const parseEditable = (value) => {
          if (!value) return null;
          const parsed = new Date(value.replace(' ', 'T'));
          return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
        };

        const startInput = prompt('Sleep start (YYYY-MM-DD HH:mm)', toEditable(task.startTime));
        if (startInput === null) return;
        const endInput = prompt('Sleep end (YYYY-MM-DD HH:mm)', toEditable(task.endTime));
        if (endInput === null) return;

        const newStart = parseEditable(startInput.trim());
        const newEnd = parseEditable(endInput.trim());
        if (!newStart || !newEnd || newEnd <= newStart) {
          alert('Invalid sleep time range.');
          return;
        }

        task.startTime = newStart;
        task.endTime = newEnd;
        task.duration = Math.min(24 * 60, Math.max(1, Math.round((newEnd - newStart) / 60000)));
        task.date = this.app.getDateString(new Date(newStart));
        task.updatedAt = Date.now();

        this.app.saveToStorage(CONFIG.STORAGE_KEYS.TASKS, this.app.state.tasks);
        this.app.syncManager.queue({ type: 'upsert', entry: task, ts: Date.now() });
        this.app.syncManager.flushQueue();
        this.updateStats(); this.renderTasks(); this.app.graphManager.updateCharts(); this.app.updateStreak();
      }
      renderFavorites() {
        const container = this.app.elements['favorites-grid']; container.innerHTML='';
        if (!this.app.state.favorites.length) {
          container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);"><i class="far fa-star" style="font-size: 2rem; margin-bottom: 0.5rem;"></i><p>No favorites yet</p><p style="font-size: 0.9rem;">Add tasks to favorites for quick start</p></div>`;
          return;
        }
        this.app.state.favorites.forEach((f, idx) => {
          const fav = typeof f === 'string' ? { label: f, category: 'Productive Work', subcategory: 'Execution' } : f;
          const el = document.createElement('div'); el.className='favorite-card';
          el.innerHTML = `<div class="favorite-name">${fav.label}</div><div class="favorite-actions"><button class="btn start-favorite-btn" data-index="${idx}"><i class="fas fa-play"></i></button><button class="btn remove-favorite-btn" data-index="${idx}"><i class="fas fa-times"></i></button></div>`;
          container.appendChild(el);
        });
        document.querySelectorAll('.start-favorite-btn').forEach(btn => btn.addEventListener('click', e => {
          const fav = this.app.state.favorites[parseInt(e.currentTarget.getAttribute('data-index'), 10)];
          const f = typeof fav === 'string' ? { label: fav, category: 'Productive Work', subcategory: 'Execution' } : fav;
          this.app.stopwatch.start(f.label, { category: f.category, subcategory: f.subcategory, description: f.label });
        }));
        document.querySelectorAll('.remove-favorite-btn').forEach(btn => btn.addEventListener('click', e => this.removeFavorite(parseInt(e.currentTarget.getAttribute('data-index'), 10))));
      }
      addFavorite() {
        const label = this.app.elements['task-input'].value.trim();
        if (!label) return alert('Please enter a task name to add to favorites');
        const category = this.app.resolveCategory(prompt('Favorite category', 'Productive Work'));
        const subcategory = prompt('Favorite subcategory', CATEGORY_DEFINITIONS[category]?.[0] || 'General') || 'General';
        const fav = { label, category, subcategory };
        this.app.state.favorites.push(fav);
        this.app.saveToStorage(CONFIG.STORAGE_KEYS.FAVORITES, this.app.state.favorites);
        this.renderFavorites();
      }
      removeFavorite(index) { this.app.state.favorites.splice(index,1); this.app.saveToStorage(CONFIG.STORAGE_KEYS.FAVORITES, this.app.state.favorites); this.renderFavorites(); }
    }
    class AnalyticsService {
      static buildMonthlyReport(tasks, year, month, thresholdMinutes = CONFIG.DAILY_PRODUCTIVITY_THRESHOLD_MINUTES) {
        const monthTasks = tasks.filter(t => { const d = new Date(t.startTime); return d.getFullYear() === year && d.getMonth() === month; });
        const pm = month === 0 ? 11 : month - 1;
        const py = month === 0 ? year - 1 : year;
        const prevTasks = tasks.filter(t => { const d = new Date(t.startTime); return d.getFullYear() === py && d.getMonth() === pm; });
        const totals = Object.fromEntries(Object.keys(CATEGORY_DEFINITIONS).map(c => [c, 0]));
        const daily = {};
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
          const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          daily[date] = { productive: 0, sleep: 0, waste: 0, total: 0, inferredWaste: 0 };
        }

        monthTasks.forEach(t => {
          totals[t.category] = (totals[t.category] || 0) + t.duration;
          const day = daily[t.date] || (daily[t.date] = { productive: 0, sleep: 0, waste: 0, total: 0, inferredWaste: 0 });
          if (PRODUCTIVE_CATEGORIES.has(t.category)) day.productive += t.duration;
          if (t.category === 'Sleep') day.sleep += t.duration;
          if (t.category === 'Time Waste / Distraction') day.waste += t.duration;
          day.total += t.duration;
        });

        let inferredWasteMinutes = 0;
        Object.values(daily).forEach(day => {
          const inferredWaste = Math.max(0, 1440 - Math.min(1440, day.total));
          day.inferredWaste = inferredWaste;
          day.waste += inferredWaste;
          day.total += inferredWaste;
          inferredWasteMinutes += inferredWaste;
        });
        totals['Time Waste / Distraction'] = (totals['Time Waste / Distraction'] || 0) + inferredWasteMinutes;

        const totalMinutes = Object.values(totals).reduce((a,b) => a+b, 0);
        const productiveMinutes = Object.entries(totals).filter(([k]) => PRODUCTIVE_CATEGORIES.has(k)).reduce((a,[,v]) => a+v,0);
        const sleepMinutes = totals['Sleep'] || 0;
        const wasteMinutes = totals['Time Waste / Distraction'] || 0;
        const awakeMinutes = Math.max(0, totalMinutes - sleepMinutes);
        const activeDays = Math.max(1, daysInMonth);
        const productivityRatio = awakeMinutes ? productiveMinutes / awakeMinutes : 0;
        const pctByCategory = Object.fromEntries(Object.keys(totals).map(k => [k, totalMinutes ? (totals[k] / totalMinutes * 100) : 0]));
        const bestProductiveDay = Object.entries(daily).sort((a,b) => b[1].productive - a[1].productive)[0] || null;
        const worstWasteDay = Object.entries(daily).sort((a,b) => b[1].waste - a[1].waste)[0] || null;
        const sleepStreak = AnalyticsService.longestSleepConsistencyStreak(daily, 420);
        const underProductiveDays = Object.entries(daily).filter(([,v]) => v.productive < thresholdMinutes).length;
        const prevProductive = prevTasks.filter(t => PRODUCTIVE_CATEGORIES.has(t.category)).reduce((a,t)=>a+t.duration,0);
        const prevDaysInMonth = new Date(py, pm + 1, 0).getDate();
        const prevDailyTotals = {};
        for (let day = 1; day <= prevDaysInMonth; day++) {
          const date = `${py}-${String(pm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          prevDailyTotals[date] = 0;
        }
        prevTasks.forEach(t => {
          prevDailyTotals[t.date] = (prevDailyTotals[t.date] || 0) + t.duration;
        });
        const prevInferredWaste = Object.values(prevDailyTotals).reduce((sum, tracked) => sum + Math.max(0, 1440 - Math.min(1440, tracked)), 0);
        const prevWaste = prevTasks.filter(t => t.category === 'Time Waste / Distraction').reduce((a,t)=>a+t.duration,0) + prevInferredWaste;
        const productiveBreakdown = AnalyticsService.breakdown(monthTasks, 'Productive Work');
        const trainingBreakdown = AnalyticsService.breakdown(monthTasks, 'Physical Training');
        return {
          year, month,
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
          trainingBreakdown,
          bestProductiveDay,
          worstWasteDay,
          sleepConsistency: { longestStreakDays: sleepStreak },
          alerts: { underProductivity: productiveMinutes < thresholdMinutes * activeDays, underProductiveDays, thresholdMinutes },
          improvement: {
            productiveDeltaMinutes: productiveMinutes - prevProductive,
            wasteDeltaMinutes: wasteMinutes - prevWaste
          }
        };
      }
      static breakdown(tasks, category) {
        const out = {};
        tasks.filter(t => t.category === category).forEach(t => out[t.subcategory] = (out[t.subcategory] || 0) + t.duration);
        return out;
      }
      static longestSleepConsistencyStreak(daily, targetMin) {
        const days = Object.keys(daily).sort();
        let best = 0; let run = 0;
        days.forEach(d => {
          if ((daily[d].sleep || 0) >= targetMin) { run += 1; best = Math.max(best, run); }
          else run = 0;
        });
        return best;
      }

      static buildSleepInsights(tasks) {
        const today = new Date();
        const daily = new Map();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          daily.set(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`, 0);
        }
        tasks.forEach(t => {
          if (t.category !== 'Sleep') return;
          if (daily.has(t.date)) daily.set(t.date, daily.get(t.date) + t.duration);
        });
        const values = [...daily.values()];
        const avg = values.reduce((a,b)=>a+b,0) / Math.max(values.length,1);
        const target = 480;
        const debt = target - avg;
        const variance = values.reduce((acc,v)=>acc + Math.pow(v - avg, 2), 0) / Math.max(values.length,1);
        const std = Math.sqrt(variance);
        let consistency = 'High';
        if (std > 90) consistency = 'Low';
        else if (std > 45) consistency = 'Moderate';
        return { averageLast7: avg, sleepDebt: debt, consistency, values };
      }
    }
    class UIManager {
      constructor(app) { this.app = app; this.currentMotivationIndex = 0; }
      initialize() { this.updateDateTime(); this.startMotivationRotation(); }
      updateDateTime() {
        const updateTime = () => {
          const now = new Date();
          this.app.elements['current-date'].textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          this.app.elements['current-time'].textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }; updateTime(); setInterval(updateTime, 1000);
      }
      startMotivationRotation() { this.updateMotivation(); setInterval(() => this.updateMotivation(), CONFIG.MOTIVATION_INTERVAL); }
      updateMotivation() {
        const e = this.app.elements['motivation-line']; e.style.opacity = '0';
        setTimeout(() => { let n; do { n = Math.floor(Math.random() * MOTIVATION_LINES.length); } while (n === this.currentMotivationIndex && MOTIVATION_LINES.length > 1); this.currentMotivationIndex = n; e.textContent = MOTIVATION_LINES[n]; e.style.opacity = '1'; }, 500);
      }
      showStreakPopup() {
        const streak = this.app.state.streak; this.app.elements['streak-count'].textContent = streak;
        this.app.elements['streak-message'].textContent = STREAK_MESSAGES[streak] || `${streak} days strong. Keep going.`;
        this.app.elements['streak-popup'].style.display = 'flex';
      }
      hideStreakPopup() { this.app.elements['streak-popup'].style.display = 'none'; }
      showReport() {
        const now = new Date();
        const r = AnalyticsService.buildMonthlyReport(this.app.state.tasks, now.getFullYear(), now.getMonth());
        const monthName = now.toLocaleString('default', { month: 'long' });
        const rows = Object.keys(r.daily).sort().map(date => {
          const d = r.daily[date];
          return `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${new Date(date).toLocaleDateString('en-US',{month:'short',day:'numeric',weekday:'short'})}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(d.productive)}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(d.sleep)}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(d.waste)}</td></tr>`;
        }).join('');
        const catRows = Object.entries(r.totals).map(([k,v]) => `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${k}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(v)}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${r.pctByCategory[k].toFixed(1)}%</td></tr>`).join('');
        const prodBreak = Object.entries(r.productiveBreakdown).map(([k,v]) => `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${k}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(v)}</td></tr>`).join('') || '<tr><td style="padding:0.75rem;" colspan="2">No entries</td></tr>';
        const trainBreak = Object.entries(r.trainingBreakdown).map(([k,v]) => `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${k}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${this.app.formatDuration(v)}</td></tr>`).join('') || '<tr><td style="padding:0.75rem;" colspan="2">No entries</td></tr>';
        const best = r.bestProductiveDay ? `${r.bestProductiveDay[0]} (${this.app.formatDuration(r.bestProductiveDay[1].productive)})` : 'N/A';
        const worst = r.worstWasteDay ? `${r.worstWasteDay[0]} (${this.app.formatDuration(r.worstWasteDay[1].waste)})` : 'N/A';
        const sleepInsights = AnalyticsService.buildSleepInsights(this.app.state.tasks);
        const summaryRows = [
          ['Total Sleep', this.app.formatDuration(r.sleepMinutes)],
          ['Total Productive', this.app.formatDuration(r.productiveMinutes)],
          ['Total Waste', `${this.app.formatDuration(r.wasteMinutes)} (Untracked: ${this.app.formatDuration(r.inferredWasteMinutes)})`],
          ['Total Awake', this.app.formatDuration(r.awakeMinutes)],
          ['Productivity Ratio', `${(r.productivityRatio*100).toFixed(1)}%`],
          ['Daily Avg Sleep', this.app.formatDuration(r.dailyAverageSleep)],
          ['Daily Avg Productive', this.app.formatDuration(r.dailyAverageProductive)],
          ['Improvement vs Previous Month', `Productive ${this.app.formatDuration(r.improvement.productiveDeltaMinutes)} | Waste ${this.app.formatDuration(r.improvement.wasteDeltaMinutes)}`],
          ['Best Productive Day', best],
          ['Worst Waste Day', worst],
          ['Sleep Consistency', `Longest >=7h streak: ${r.sleepConsistency.longestStreakDays} days`],
          ['Sleep Last 7 Days', `Avg ${this.app.formatDuration(sleepInsights.averageLast7)} | ${sleepInsights.sleepDebt > 0 ? `Debt ${this.app.formatDuration(sleepInsights.sleepDebt)}` : `Surplus ${this.app.formatDuration(Math.abs(sleepInsights.sleepDebt))}`} | Consistency ${sleepInsights.consistency}`],
          ['Alerts', r.alerts.underProductivity ? `Under productivity (${r.alerts.underProductiveDays} days below ${this.app.formatDuration(r.alerts.thresholdMinutes)})` : 'None']
        ].map(([label, value]) => `<tr><td style="padding:0.75rem;border-bottom:1px solid var(--border);font-weight:600;">${label}</td><td style="padding:0.75rem;border-bottom:1px solid var(--border);">${value}</td></tr>`).join('');
        this.app.elements['report-content'].innerHTML = `
          <h3 style="margin-bottom:1rem;">${monthName} ${r.year} Monthly Report</h3>
          <h4 style="margin-top:1rem;">Summary</h4>
          <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><tbody>${summaryRows}</tbody></table></div>
          <h4 style="margin-top:1rem;">Category Totals</h4>
          <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Category</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Duration</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Share</th></tr></thead><tbody>${catRows}</tbody></table></div>
          <h4 style="margin-top:1rem;">Productive Work Breakdown</h4>
          <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Subcategory</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Duration</th></tr></thead><tbody>${prodBreak}</tbody></table></div>
          <h4 style="margin-top:1rem;">Physical Training Breakdown</h4>
          <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Subcategory</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Duration</th></tr></thead><tbody>${trainBreak}</tbody></table></div>
          <h4>Daily Breakdown</h4>
          <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background: rgba(30, 30, 30, 0.8);"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Date</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Productive</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Sleep</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid var(--border);">Total Waste</th></tr></thead><tbody>${rows}</tbody></table></div>`;
        this.app.elements['report-modal'].style.display = 'flex';
      }
      hideReport() { this.app.elements['report-modal'].style.display = 'none'; }
      exportData() {
        const now = new Date();
        const report = AnalyticsService.buildMonthlyReport(this.app.state.tasks, now.getFullYear(), now.getMonth());
        const csvContent = [
          ['Date','Category','Subcategory','Start Time','End Time','Duration (minutes)','Description'].join(','),
          ...this.app.state.tasks.map(task => [task.date,`"${task.category}"`,`"${task.subcategory}"`,new Date(task.startTime).toLocaleString(),new Date(task.endTime).toLocaleString(),task.duration,`"${(task.description || '').replace(/"/g,'""')}"`].join(','))
        ].join('\n');
        const csvBlob = new Blob([csvContent], { type: 'text/csv' });
        const jsonBlob = new Blob([JSON.stringify({ schemaVersion: CONFIG.DB_SCHEMA_VERSION, exportedAt: new Date().toISOString(), entries: this.app.state.tasks, monthlyReport: report }, null, 2)], { type: 'application/json' });
        [['csv', csvBlob], ['json', jsonBlob]].forEach(([ext, blob]) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `discipline-data-${this.app.getDateString()}.${ext}`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        });
      }

      triggerImportPicker() {
        const input = this.app.elements['import-file'];
        if (!input) return;
        input.value = '';
        input.click();
      }

      parseCsvLine(line) {
        const out = [];
        let curr = '';
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
          } else if (ch === ',' && !inQuotes) {
            out.push(curr);
            curr = '';
          } else {
            curr += ch;
          }
        }
        out.push(curr);
        return out;
      }

      importFromJsonText(text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.entries)) return parsed.entries;
        return [];
      }

      importFromCsvText(text) {
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) return [];
        const headers = this.parseCsvLine(lines[0]).map(h => h.trim());
        const idx = Object.fromEntries(headers.map((h, i) => [h, i]));

        const hasNewSchema = headers.includes('Category') && headers.includes('Subcategory');
        const imported = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = this.parseCsvLine(lines[i]);
          if (!cols.length) continue;

          if (hasNewSchema) {
            const date = cols[idx['Date']] || this.app.getDateString();
            const category = cols[idx['Category']] || 'Miscellaneous';
            const subcategory = cols[idx['Subcategory']] || 'General';
            const startRaw = cols[idx['Start Time']] || '';
            const endRaw = cols[idx['End Time']] || '';
            const duration = Number(cols[idx['Duration (minutes)']] || 0);
            const description = cols[idx['Description']] || '';
            const startTime = Date.parse(startRaw) || Date.now();
            const endTime = Date.parse(endRaw) || (startTime + duration * 60000);
            imported.push({
              id: `${Date.now()}-${i}`,
              date,
              category,
              subcategory,
              startTime,
              endTime,
              duration: Number.isFinite(duration) ? duration : Math.max(0, Math.round((endTime - startTime) / 60000)),
              description
            });
          } else {
            // Legacy CSV fallback
            const date = cols[idx['Date']] || this.app.getDateString();
            const name = cols[idx['Task Name']] || 'Imported Task';
            const startTime = Date.parse(cols[idx['Start Time']] || '') || Date.now();
            const endTime = Date.parse(cols[idx['End Time']] || '') || startTime;
            const duration = Number(cols[idx['Duration (minutes)']] || Math.max(0, Math.round((endTime - startTime) / 60000)));
            const type = (cols[idx['Type']] || '').toLowerCase();
            const category = type.includes('sleep') ? 'Sleep' : 'Miscellaneous';
            imported.push({
              id: `${Date.now()}-${i}`,
              date,
              category,
              subcategory: category === 'Sleep' ? 'Night Sleep' : 'General',
              startTime,
              endTime,
              duration,
              description: name
            });
          }
        }

        return imported;
      }

      async importDataFromFile(file) {
        if (!file) return;
        try {
          const text = await file.text();
          const isJson = file.name.toLowerCase().endsWith('.json') || file.type.includes('json');
          const rawEntries = isJson ? this.importFromJsonText(text) : this.importFromCsvText(text);
          if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
            alert('Import file has no valid entries.');
            return;
          }
          const normalized = rawEntries.map(entry => this.app.normalizeTask(entry));
          this.app.taskManager.mergeTasks(normalized);
          alert(`Imported ${normalized.length} entries successfully.`);
        } catch (error) {
          console.error('Import failed:', error);
          alert('Import failed. Please provide a valid exported JSON/CSV file.');
        }
      }
    }

    class ShadowEngine {
      constructor(app) {
        this.app = app;
        this.shadowSevenDayAverage = 0;
        this.rankTiers = [
          { min: 0, title: 'Initiate', badge: 'Baseline' },
          { min: 120, title: 'Builder', badge: 'Builder' },
          { min: 180, title: 'Operator', badge: 'Operator' },
          { min: 240, title: 'Executor', badge: 'Executor' },
          { min: 300, title: 'Elite', badge: 'Elite' },
          { min: 360, title: 'Apex', badge: 'Apex' },
          { min: 420, title: 'Overdrive', badge: 'Legend' }
        ];
      }

      initialize() {
        const stored = parseFloat(this.app.loadFromStorage(CONFIG.STORAGE_KEYS.SHADOW_AVG));
        this.shadowSevenDayAverage = Number.isFinite(stored) ? stored : 0;
        this.refresh(false);
      }

      getDailyProductiveMap() {
        const dailyMap = new Map();
        this.app.state.tasks.forEach(task => {
          if (!this.app.isProductiveCategory(task.category)) return;
          dailyMap.set(task.date, (dailyMap.get(task.date) || 0) + task.duration);
        });
        return dailyMap;
      }

      getTodayGoalProgress(dateStr = this.app.getDateString(new Date())) {
        const goals = CONFIG.DAILY_GOALS || [];
        const progress = {};

        goals.forEach(goal => {
          progress[goal.id] = { minutes: 0, sessions: 0, minutesTarget: goal.minutesTarget || 0, sessionsTarget: goal.sessionsTarget || 0 };
        });

        this.app.state.tasks.forEach(task => {
          if (!task || task.date !== dateStr || !Number.isFinite(task.duration) || task.duration <= 0) return;
          const haystack = `${task.description || ''} ${task.subcategory || ''} ${task.category || ''}`.toLowerCase();
          goals.forEach(goal => {
            if (!goal.keywords?.some(word => haystack.includes(word))) return;
            progress[goal.id].minutes += task.duration;
            progress[goal.id].sessions += 1;
          });
        });

        return progress;
      }

      calculateMissionScore(progress) {
        const nptel = progress.nptel || { minutes: 0, sessions: 0, minutesTarget: 120, sessionsTarget: 2 };
        const yt = progress.yt || { minutes: 0, sessions: 0, minutesTarget: 120, sessionsTarget: 2 };
        const project = progress.project || { minutes: 0, sessions: 0, minutesTarget: 180, sessionsTarget: 0 };

        const nptelMinutesRatio = Math.min(1, nptel.minutes / Math.max(1, nptel.minutesTarget));
        const nptelSessionsRatio = Math.min(1, nptel.sessions / Math.max(1, nptel.sessionsTarget));
        const ytMinutesRatio = Math.min(1, yt.minutes / Math.max(1, yt.minutesTarget));
        const ytSessionsRatio = Math.min(1, yt.sessions / Math.max(1, yt.sessionsTarget));
        const projectRatio = Math.min(1, project.minutes / Math.max(1, project.minutesTarget));

        const nptelScore = (nptelMinutesRatio * 0.5 + nptelSessionsRatio * 0.5) * 30;
        const ytScore = (ytMinutesRatio * 0.5 + ytSessionsRatio * 0.5) * 30;
        const projectScore = projectRatio * 40;
        return Math.round(Math.min(100, nptelScore + ytScore + projectScore));
      }

      getTodayDistractionMinutes(dateStr = this.app.getDateString(new Date())) {
        return this.app.state.tasks
          .filter(task => task.date === dateStr && (task.category === 'Time Waste / Distraction' || task.graph_tag === 'distraction'))
          .reduce((sum, task) => sum + task.duration, 0);
      }

      getWinLadder(dailyMap, shadowAvg) {
        const days = [];
        const today = new Date(this.app.getDateString());
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const ds = this.app.getDateString(d);
          const minutes = dailyMap.get(ds) || 0;
          days.push({ date: ds, win: minutes >= shadowAvg });
        }
        const winsIn5 = days.slice(-5).filter(d => d.win).length;
        const winsIn7 = days.filter(d => d.win).length;
        return {
          winsIn5,
          winsIn7,
          status3in5: `${winsIn5}/3`,
          status5in7: `${winsIn7}/5`,
          clear3in5: winsIn5 >= 3,
          clear5in7: winsIn7 >= 5
        };
      }

      formatGoalProgress(goal, progress) {
        const minutesText = this.app.formatDuration(progress.minutes);
        if (goal.sessionsTarget > 0) return `${minutesText} • ${progress.sessions}/${goal.sessionsTarget}`;
        return minutesText;
      }

      applyGoalStatus(elementId, goal, progress) {
        const el = this.app.elements[elementId];
        if (!el) return;
        const hitMinutes = progress.minutes >= goal.minutesTarget;
        const hitSessions = goal.sessionsTarget > 0 ? progress.sessions >= goal.sessionsTarget : true;
        const done = hitMinutes && hitSessions;
        el.textContent = this.formatGoalProgress(goal, progress);
        el.classList.toggle('shadow-goal-done', done);
      }

      buildDailyProductiveSeries() {
        const dailyMap = this.getDailyProductiveMap();
        if (dailyMap.size === 0) return [];

        const sorted = [...dailyMap.keys()].sort();
        const start = new Date(sorted[0]);
        const end = new Date(this.app.getDateString());
        const series = [];

        for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
          const key = this.app.getDateString(cursor);
          series.push(dailyMap.get(key) || 0);
        }
        return series;
      }

      computeRollingMetrics() {
        const series = this.buildDailyProductiveSeries();
        if (!series.length) return { bestAvg: 0, currentAvg: 0, previousAvg: 0, todayMinutes: 0, hasMomentumBaseline: false };

        const prefix = new Array(series.length + 1).fill(0);
        for (let i = 0; i < series.length; i++) prefix[i + 1] = prefix[i] + series[i];

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
        const currentAvg = (prefix[endIdx] - prefix[Math.max(0, endIdx - 7)]) / 7;

        const prevEnd = Math.max(0, endIdx - 7);
        const prevStart = Math.max(0, prevEnd - 7);
        const previousAvg = prevEnd > 0 ? (prefix[prevEnd] - prefix[prevStart]) / 7 : 0;
        const hasMomentumBaseline = (prevEnd - prevStart) >= 4;

        return { bestAvg, currentAvg, previousAvg, todayMinutes, hasMomentumBaseline };
      }

      getShadowRank(minutes) {
        let selected = this.rankTiers[0];
        for (const tier of this.rankTiers) if (minutes >= tier.min) selected = tier;
        return selected;
      }

      getCurrentStatus(percentage) {
        if (percentage >= 100) return 'STANDARD BROKEN';
        if (percentage >= 90) return 'AT THE GATE';
        if (percentage >= 70) return 'TRAILING';
        return 'OUT OF RANGE';
      }

      getProgressStyle(percentage) {
        if (percentage >= 100) return { color: '#28a745', shadow: '0 0 12px rgba(40,167,69,0.45)' };
        if (percentage >= 90) return { color: '#007bff', shadow: 'none' };
        if (percentage >= 70) return { color: '#ffc107', shadow: 'none' };
        return { color: '#dc3545', shadow: 'none' };
      }

      getMomentum(currentAvg, previousAvg, hasBaseline) {
        if (!hasBaseline) return { label: 'Insufficient history', cls: 'shadow-momentum-flat' };
        const delta = currentAvg - previousAvg;
        if (delta > 8) return { label: `Rising (+${this.app.formatDuration(delta)})`, cls: 'shadow-momentum-positive' };
        if (delta < -8) return { label: `Drifting (-${this.app.formatDuration(Math.abs(delta))})`, cls: 'shadow-momentum-negative' };
        return { label: 'Stable', cls: 'shadow-momentum-flat' };
      }

      getPressure(percentage, weeklyGap, recentWinRate, missionScore = 100) {
        // Penalty-only pressure model: no positive buff reductions.
        const weeklyPenalty = weeklyGap > 0 ? 1 : 0;
        const trendPenalty = recentWinRate < 0.35 ? 2 : (recentWinRate < 0.55 ? 1 : 0);

        let level = 0; // 0 controlled, 1 elevated, 2 high, 3 critical
        if (percentage >= 100) level = 0;
        else if (percentage >= 90) level = 1;
        else if (percentage >= 70) level = 2;
        else level = 3;

        const missionPenalty = missionScore < 50 ? 1 : 0;
        level = Math.min(3, level + weeklyPenalty + trendPenalty + missionPenalty);

        if (level <= 0) return { label: 'Pressure: Controlled', cls: 'shadow-pressure-low' };
        if (level === 1) return { label: 'Pressure: Elevated', cls: 'shadow-pressure-mid' };
        if (level === 2) return { label: 'Pressure: High', cls: 'shadow-pressure-mid' };
        return { label: 'Pressure: Critical', cls: 'shadow-pressure-high' };
      }

      countShadowWinsThisMonth(dailyMap, shadowAvg) {
        if (shadowAvg <= 0) return { myWins: 0, shadowWins: 0, activeDays: 0, recentWinRate: 0 };
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        const monthDays = [];
        let myWins = 0;
        const activeDays = now.getDate(); // elapsed days in current month

        for (let day = 1; day <= activeDays; day++) {
          const d = new Date(year, month, day);
          const date = this.app.getDateString(d);
          const minutes = dailyMap.get(date) || 0;
          const isWin = minutes >= shadowAvg;
          if (isWin) myWins++;
          monthDays.push({ date, isWin });
        }

        monthDays.sort((a, b) => a.date.localeCompare(b.date));
        const recent = monthDays.slice(-7);
        const recentWins = recent.filter(d => d.isWin).length;
        const recentWinRate = recent.length ? (recentWins / recent.length) : 0;

        const shadowWins = Math.max(0, activeDays - myWins);
        return { myWins, shadowWins, activeDays, recentWinRate };
      }

      getPenalty(todayMinutes, shadowAvg, weeklyGap, recentWinRate, distractionMinutes = 0, missionScore = 0) {
        let points = 0;
        const reasons = [];
        if (todayMinutes < shadowAvg) {
          points += 1;
          reasons.push('Behind daily shadow target');
        }
        if (weeklyGap > 0) {
          points += 1;
          reasons.push('Weekly average below shadow standard');
        }
        if (recentWinRate < 0.5) {
          points += 1;
          reasons.push('Monthly win-rate under 50%');
        }
        if (missionScore < 60) {
          points += 1;
          reasons.push('Mission score below 60/100');
        }
        const today = this.app.getDateString();
        const untracked = this.app.getInferredWasteMinutesForDate(today, this.app.state.tasks);
        if (untracked >= 300) {
          points += 2;
          reasons.push('High untracked time today (5h+)');
        }
        else if (untracked >= 120) {
          points += 1;
          reasons.push('Untracked time today (2h+)');
        }

        const budget = CONFIG.DISTRACTION_BUDGET_MINUTES;
        const overBudget = Math.max(0, distractionMinutes - budget);
        if (overBudget > 0) {
          const overPoints = Math.max(1, Math.ceil(overBudget / 30));
          points += overPoints;
          reasons.push(`Distraction budget exceeded by ${this.app.formatDuration(overBudget)}`);
        }

        const minutes = points * 15;
        return { points, minutes, untracked, reasons, budget, distractionMinutes, overBudget };
      }

      render({ todayMinutes, shadowAvg, currentAvg, previousAvg, hasMomentumBaseline, isNewStandard }) {
        const safeShadow = shadowAvg > 0 ? shadowAvg : 1;
        const gap = shadowAvg - todayMinutes;
        const weeklyGap = shadowAvg - currentAvg;
        const percentage = (todayMinutes / safeShadow) * 100;

        const dailyMap = this.getDailyProductiveMap();
        const competition = this.countShadowWinsThisMonth(dailyMap, shadowAvg);
        const scoreDiff = competition.myWins - competition.shadowWins;
        const targetToday = shadowAvg > 0 ? Math.ceil(shadowAvg + 1) : 0;
        const neededTie = Math.max(0, shadowAvg - todayMinutes);
        const neededLead = Math.max(0, shadowAvg - todayMinutes + 1);
        const todayDate = this.app.getDateString(new Date());
        const goalProgress = this.getTodayGoalProgress(todayDate);
        const missionScore = this.calculateMissionScore(goalProgress);
        const distractionMinutes = this.getTodayDistractionMinutes(todayDate);
        const penalty = this.getPenalty(todayMinutes, shadowAvg, weeklyGap, competition.recentWinRate, distractionMinutes, missionScore);
        const ladder = this.getWinLadder(dailyMap, shadowAvg);
        const defenseTarget = Math.max(0, Math.ceil(shadowAvg + penalty.minutes));
        const totalDuel = Math.max(1, competition.myWins + competition.shadowWins);
        const youShare = Math.max(0, Math.min(100, (competition.myWins / totalDuel) * 100));
        const shadowShare = Math.max(0, Math.min(100, (competition.shadowWins / totalDuel) * 100));

        this.app.elements['shadow-current-minutes'].textContent = this.app.formatDuration(todayMinutes);
        this.app.elements['shadow-average'].textContent = this.app.formatDuration(shadowAvg);
        this.app.elements['shadow-weekly-average'].textContent = this.app.formatDuration(currentAvg);
        this.app.elements['shadow-target'].textContent = this.app.formatDuration(targetToday);
        this.app.elements['shadow-needed-tie'].textContent = this.app.formatDuration(neededTie);
        this.app.elements['shadow-needed-lead'].textContent = this.app.formatDuration(neededLead);
        this.app.elements['shadow-defense-target'].textContent = this.app.formatDuration(defenseTarget);
        this.app.elements['shadow-penalty'].textContent = `-${this.app.formatDuration(penalty.minutes)} (${penalty.points}pt)`;
        this.app.elements['shadow-penalty-reason'].textContent = penalty.reasons.length ? penalty.reasons.join(' • ') : 'No active penalty triggers';
        const expiryEl = this.app.elements['shadow-penalty-expiry'];
        if (penalty.points > 0) {
          const updateCountdown = () => {
            const now = new Date();
            const end = new Date(now);
            end.setHours(23, 59, 59, 999);
            const ms = Math.max(0, end - now);
            const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
            const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
            const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
            expiryEl.textContent = `Active today only • carries to next day only if today is a loss • resets in ${h}:${m}:${s}`;
          };
          if (this.penaltyCountdownTimer) clearInterval(this.penaltyCountdownTimer);
          updateCountdown();
          this.penaltyCountdownTimer = setInterval(updateCountdown, 1000);
        } else {
          if (this.penaltyCountdownTimer) clearInterval(this.penaltyCountdownTimer);
          expiryEl.textContent = 'No active penalty • carry-over applies only if today ends as a loss';
        }

        const budgetEl = this.app.elements['shadow-distraction-budget'];
        budgetEl.textContent = `${this.app.formatDuration(penalty.distractionMinutes)} / ${this.app.formatDuration(penalty.budget)}${penalty.overBudget > 0 ? ` (+${this.app.formatDuration(penalty.overBudget)} over)` : ''}`;
        budgetEl.className = penalty.overBudget > 0 ? 'shadow-overbudget' : '';
        this.app.elements['shadow-win-ladder'].textContent = `3/5: ${ladder.status3in5}${ladder.clear3in5 ? ' ✓' : ''} • 5/7: ${ladder.status5in7}${ladder.clear5in7 ? ' ✓' : ''}`;
        this.app.elements['shadow-mission-score'].textContent = `${missionScore}/100`;
        this.app.elements['shadow-weekly-gap'].textContent = `${weeklyGap >= 0 ? '-' : '+'}${this.app.formatDuration(Math.abs(weeklyGap))}`;
        this.app.elements['shadow-weekly-gap'].className = weeklyGap > 0 ? 'shadow-gap-positive' : (weeklyGap < 0 ? 'shadow-gap-negative' : 'shadow-gap-equal');

        const momentum = this.getMomentum(currentAvg, previousAvg, hasMomentumBaseline);
        const momentumEl = this.app.elements['shadow-momentum'];
        momentumEl.textContent = momentum.label;
        momentumEl.className = momentum.cls;

        this.app.elements['shadow-percent'].textContent = `${percentage.toFixed(1)}%`;
        const gapEl = this.app.elements['shadow-gap'];
        gapEl.textContent = `${gap >= 0 ? '-' : '+'}${this.app.formatDuration(Math.abs(gap))}`;
        gapEl.className = gap > 0 ? 'shadow-gap-positive' : (gap < 0 ? 'shadow-gap-negative' : 'shadow-gap-equal');

        this.app.elements['shadow-status'].textContent = this.getCurrentStatus(percentage);
        const pressure = this.getPressure(percentage, weeklyGap, competition.recentWinRate, missionScore);
        const pressureEl = this.app.elements['shadow-pressure'];
        pressureEl.textContent = pressure.label;
        pressureEl.className = `shadow-badge ${pressure.cls}`;

        const rank = this.getShadowRank(shadowAvg);
        this.app.elements['shadow-rank'].textContent = `Rank: ${rank.title}`;
        this.app.elements['shadow-badge'].textContent = rank.badge;
        this.app.elements['shadow-score'].textContent = `Monthly Score (days): You ${competition.myWins} - Shadow ${competition.shadowWins}`;
        this.app.elements['shadow-duel'].textContent = scoreDiff > 0 ? `Leader: You (+${scoreDiff})` : (scoreDiff < 0 ? `Leader: Shadow (+${Math.abs(scoreDiff)})` : 'Leader: Even');
        this.app.elements['shadow-lead-margin'].textContent = `Lead Margin: ${Math.abs(scoreDiff)}`;
        this.app.elements['shadow-trend'].textContent = `Monthly trend: ${(competition.recentWinRate * 100).toFixed(0)}% win rate`;
        this.app.elements['shadow-verdict'].textContent = scoreDiff >= 0
          ? `You lead monthly by ${Math.abs(scoreDiff)} day-win(s); hold at least ${this.app.formatDuration(defenseTarget)} tomorrow. Mission ${missionScore}/100.`
          : `You are behind by ${this.app.formatDuration(neededTie)} today and ${Math.abs(scoreDiff)} monthly day-win(s). Mission ${missionScore}/100.`;

        this.applyGoalStatus('goal-nptel', CONFIG.DAILY_GOALS[0], goalProgress.nptel || { minutes: 0, sessions: 0, minutesTarget: 120, sessionsTarget: 2 });
        this.applyGoalStatus('goal-yt', CONFIG.DAILY_GOALS[1], goalProgress.yt || { minutes: 0, sessions: 0, minutesTarget: 120, sessionsTarget: 2 });
        this.applyGoalStatus('goal-project', CONFIG.DAILY_GOALS[2], goalProgress.project || { minutes: 0, sessions: 0, minutesTarget: 180, sessionsTarget: 0 });

        this.app.elements['shadow-duel-you-fill'].style.width = `${youShare}%`;
        this.app.elements['shadow-duel-shadow-fill'].style.width = `${shadowShare}%`;
        this.app.elements['shadow-note'].textContent = 'Calculated from real historical data only';

        const fill = this.app.elements['shadow-progress-fill'];
        const cappedWidth = Math.min(130, Math.max(0, percentage));
        const style = this.getProgressStyle(percentage);
        fill.style.width = `${cappedWidth}%`;
        fill.style.background = style.color;
        fill.style.boxShadow = style.shadow;

        if (isNewStandard) {
          const card = this.app.elements['shadow-standard-card'];
          card.classList.remove('shadow-new-standard');
          void card.offsetWidth;
          card.classList.add('shadow-new-standard');
        }
      }

      refresh(allowAnimation = true) {
        const metrics = this.computeRollingMetrics();
        const historicalBest = metrics.bestAvg;
        const resolvedShadow = Math.max(this.shadowSevenDayAverage, historicalBest);
        const isNewStandard = resolvedShadow > this.shadowSevenDayAverage;

        if (resolvedShadow !== this.shadowSevenDayAverage) {
          this.shadowSevenDayAverage = resolvedShadow;
          this.app.saveToStorage(CONFIG.STORAGE_KEYS.SHADOW_AVG, resolvedShadow);
        }

        this.render({
          todayMinutes: metrics.todayMinutes,
          shadowAvg: resolvedShadow,
          currentAvg: metrics.currentAvg,
          previousAvg: metrics.previousAvg,
          hasMomentumBaseline: metrics.hasMomentumBaseline,
          isNewStandard: allowAnimation && isNewStandard
        });
        if (this.app.trainerEngine) this.app.trainerEngine.refresh();
      }
    }

    class TrainerEngine {
      constructor(app) {
        this.app = app;
        this.state = this.loadState();
        this.levels = [
          { name: 'Dormant', min: 0, max: 60 },
          { name: 'Initiate', min: 60, max: 120 },
          { name: 'Competitor', min: 120, max: 180 },
          { name: 'Dominator', min: 180, max: 240 },
          { name: 'Elite', min: 240, max: Infinity }
        ];
      }

      loadState() {
        return this.app.loadFromStorage(CONFIG.STORAGE_KEYS.TRAINER_STATE) || {
          penaltyMinutes: 0,
          shadowBuffDays: 0,
          userBuffDays: 0,
          lastProcessedDate: null
        };
      }

      initialize() { this.refresh(); }

      getDailyProductiveMap() {
        const map = new Map();
        this.app.state.tasks.forEach(task => {
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
        const idx = this.levels.findIndex(l => l.name === current.name);
        const next = this.levels[idx + 1] || null;
        return { current, next };
      }

      getMicroLevel(minutes) {
        const clamped = Math.max(0, Math.min(100, Math.floor((minutes / 600) * 100) + 1));
        return clamped;
      }

      getMilestoneProgress(level, sevenDayAvg, winsInLast5) {
        const series5 = this.getDailySeries(5);
        const maintainedDays = series5.filter(d => d.minutes >= level.min).length;
        const daysRemaining = Math.max(0, 5 - maintainedDays);
        const winsRemaining = Math.max(0, 3 - winsInLast5);
        const nextTarget = this.levels.find(l => l.min > level.min);
        const toNext = nextTarget ? Math.max(0, Math.ceil(nextTarget.min - sevenDayAvg)) : 0;
        return `Maintain: ${maintainedDays}/5 days, Wins: ${winsInLast5}/3, Days remaining: ${daysRemaining}, Wins remaining: ${winsRemaining}${nextTarget ? `, +${toNext}m to ${nextTarget.name}` : ', Top level locked'}`;
      }

      getShadowTrend(last3, prev3) {
        if (last3 > prev3 + 5) return 'Rising';
        if (last3 < prev3 - 5) return 'Declining';
        return 'Stable';
      }

      getMode(currentMinutes, effectiveShadow, requiredPace) {
        if (currentMinutes > effectiveShadow * 1.15) return 'DOMINANCE';
        if (currentMinutes >= effectiveShadow) return 'CONTROL';
        if (requiredPace <= 45) return 'RECOVERY';
        return 'COLLAPSE';
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
        d.setHours(0,0,0,0);
        t.setHours(0,0,0,0);
        return Math.round((t - d) / 86400000);
      }

      computeAntiSandbagSignals(baseShadow) {
        const threshold = Math.max(1, baseShadow);
        const recentSeries = this.getDailySeries(45);
        const withMargin = recentSeries.map(day => {
          const margin = day.minutes - threshold;
          const pct = margin / threshold;
          return { ...day, margin, pct, win: margin >= 0 };
        });

        const minimalSignal = this.getConsecutiveSignal(withMargin, day => day.win && day.pct > 0 && day.pct < 0.03);
        const squeezeSignal = this.getConsecutiveSignal(withMargin, day => day.win && day.margin <= 5);

        const daysSinceMinimal = this.getDaysSince(minimalSignal.triggerDate);
        const adaptiveActive = minimalSignal.run >= 3 && daysSinceMinimal >= 1 && daysSinceMinimal <= 5;
        const adaptiveDaysLeft = adaptiveActive ? (6 - daysSinceMinimal) : 0;

        const daysSinceSqueeze = this.getDaysSince(squeezeSignal.triggerDate);
        const aggressionActive = squeezeSignal.run >= 5 && daysSinceSqueeze >= 1 && daysSinceSqueeze <= 3;
        const aggressionDaysLeft = aggressionActive ? (4 - daysSinceSqueeze) : 0;

        return {
          minimalDominanceDetected: minimalSignal.run >= 3 || squeezeSignal.run >= 5,
          adaptivePressure: { active: adaptiveActive, daysLeft: adaptiveDaysLeft, buffPct: adaptiveActive ? 0.03 : 0 },
          aggressionMode: { active: aggressionActive, daysLeft: aggressionDaysLeft, minWinPct: aggressionActive ? 0.05 : 0 },
          minimalRun: minimalSignal.run,
          squeezeRun: squeezeSignal.run
        };
      }

      buildTrainerSnapshot() {
        const metrics = this.app.shadowEngine.computeRollingMetrics();
        const shadow7DayAverage = Math.max(this.app.shadowEngine.shadowSevenDayAverage || 0, metrics.bestAvg || 0);
        const map = this.getDailyProductiveMap();
        const competition = this.app.shadowEngine.countShadowWinsThisMonth(map, shadow7DayAverage);
        const now = new Date();
        const dayEnd = new Date(now);
        dayEnd.setHours(23, 59, 59, 999);
        const timeRemainingToday = Math.max(0, Math.round((dayEnd - now) / 60000));

        const recent = this.getDailySeries(6);
        const last3DayAverage = recent.slice(-3).reduce((s, d) => s + d.minutes, 0) / 3;
        const previous3DayAverage = recent.slice(0, 3).reduce((s, d) => s + d.minutes, 0) / 3;

        const antiSandbag = this.computeAntiSandbagSignals(shadow7DayAverage);
        const lossChainBuffPct = this.state.shadowBuffDays > 0 ? 0.05 : 0;
        const adaptiveBuffPct = antiSandbag.adaptivePressure.buffPct;
        const effectiveShadow = shadow7DayAverage * (1 + lossChainBuffPct + adaptiveBuffPct);
        const userEffectiveToday = metrics.todayMinutes * (1 + (this.state.userBuffDays > 0 ? 0.05 : 0));
        const effectiveWinTarget = antiSandbag.aggressionMode.active ? (effectiveShadow * 1.05) : (effectiveShadow + 1);
        const weeklyGap = effectiveShadow - metrics.currentAvg;
        const todayDate = this.app.getDateString(new Date());
        const missionProgress = this.app.shadowEngine.getTodayGoalProgress(todayDate);
        const missionScore = this.app.shadowEngine.calculateMissionScore(missionProgress);
        const distractionMinutes = this.app.shadowEngine.getTodayDistractionMinutes(todayDate);
        const computedPenalty = this.app.shadowEngine.getPenalty(metrics.todayMinutes, effectiveShadow, weeklyGap, competition.recentWinRate, distractionMinutes, missionScore);
        const ladder = this.app.shadowEngine.getWinLadder(map, effectiveShadow);

        const gap = effectiveShadow - userEffectiveToday;
        const minutesToTie = Math.max(0, Math.ceil(gap));
        const minutesToWin = Math.max(0, Math.ceil(effectiveWinTarget - userEffectiveToday));
        const hoursLeft = Math.max(1, timeRemainingToday / 60);
        const requiredPace = Math.ceil(minutesToWin / hoursLeft);

        const winsInLast5 = this.getDailySeries(5).filter(d => d.minutes >= effectiveShadow).length;
        const userLevel = this.getLevel(metrics.currentAvg);
        const shadowLevel = this.getLevel(effectiveShadow);

        return {
          currentMinutesToday: metrics.todayMinutes,
          shadow7DayAverage,
          monthlyScoreUser: competition.myWins,
          monthlyScoreShadow: competition.shadowWins,
          monthlyWinRate: competition.activeDays ? competition.myWins / competition.activeDays : 0,
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
          mode: this.getMode(userEffectiveToday, effectiveShadow, requiredPace),
          userLevel,
          shadowLevel,
          winsInLast5,
          antiSandbag,
          userMicroLevel: this.getMicroLevel(metrics.currentAvg),
          shadowMicroLevel: this.getMicroLevel(effectiveShadow),
          missionScore,
          distractionMinutes,
          distractionOverBudget: computedPenalty.overBudget,
          winLadder: ladder
        };
      }

      buildReport(d = this.buildTrainerSnapshot()) {
        const trend = this.getShadowTrend(d.last3DayAverage, d.previous3DayAverage);
        const userMilestone = this.getMilestoneProgress(d.userLevel.current, d.currentMinutesToday, d.winsInLast5);
        const shadowMilestone = this.getMilestoneProgress(d.shadowLevel.current, d.effectiveShadow, Math.max(0, 5 - d.winsInLast5));
        const nextPenalty = Math.max(15, Math.ceil(d.penaltyMinutes * 1.1));
        const streakBuff = d.currentStreakDays >= 7 ? 'Active: USER +5% for next 7 days' : `Locked: ${7 - Math.min(7, d.currentStreakDays)} consecutive wins remaining`;
        const threeLossBuff = 'If 3 consecutive losses confirmed: SHADOW +5% effective average for next 3 days';

        const anti = d.antiSandbag;
        const antiBuffStatus = anti.adaptivePressure.active ? `Adaptive Pressure Buff active (+3%) for ${anti.adaptivePressure.daysLeft} day(s)` : `Adaptive Pressure Buff inactive (trigger: 3 consecutive wins <3% margin, current run ${anti.minimalRun})`;
        const aggressionStatus = anti.aggressionMode.active ? `Aggression Mode active (minimum +5% win margin) for ${anti.aggressionMode.daysLeft} day(s)` : `Aggression Mode inactive (trigger: 5 consecutive wins <=5m margin, current run ${anti.squeezeRun})`;
        const minimalLabel = anti.minimalDominanceDetected ? 'Minimal Dominance Detected' : 'Dominance Quality Acceptable';

        const phase1 = Math.min(60, Math.max(45, Math.ceil(d.minutesToWin * 0.5)));
        const phase2 = Math.max(0, d.minutesToTie - phase1);
        const safetyTarget = Math.ceil(d.minutesToWin * 1.15);
        const phase3 = Math.max(0, safetyTarget - Math.max(0, phase1 + phase2));

        return `=== SHADOW STATUS ===
Level: ${d.shadowLevel.current.name} | L${d.shadowMicroLevel}/100
Active Buffs: ${this.state.shadowBuffDays > 0 ? `+5% for ${this.state.shadowBuffDays} day(s)` : 'None'}; ${antiBuffStatus}; ${aggressionStatus}
Effective Average: ${this.app.formatDuration(d.effectiveShadow)}
Trend: ${trend}
Strength: Highest proven 7-day average at ${this.app.formatDuration(d.strongestHistorical7DayAverage)}
Vulnerability: Shadow weakens when your monthly win rate rises above 60%
Next Level Milestone: ${shadowMilestone}

=== USER STATUS ===
Level: ${d.userLevel.current.name} | L${d.userMicroLevel}/100
Active Penalties: ${this.app.formatDuration(d.penaltyMinutes)} (${d.penaltyPoints}pt) | ${d.penaltyReasons.length ? d.penaltyReasons.join(' • ') : 'No active penalty triggers'}
Mission Score: ${d.missionScore}/100
Distraction Budget: ${this.app.formatDuration(d.distractionMinutes)} / ${this.app.formatDuration(CONFIG.DISTRACTION_BUDGET_MINUTES)}${d.distractionOverBudget > 0 ? ` (+${this.app.formatDuration(d.distractionOverBudget)} over)` : ''}
Win Ladder: 3/5 ${d.winLadder.status3in5}${d.winLadder.clear3in5 ? ' ✓' : ''} • 5/7 ${d.winLadder.status5in7}${d.winLadder.clear5in7 ? ' ✓' : ''}
Mode: ${d.mode}
Gap: ${d.gap > 0 ? '-' : '+'}${this.app.formatDuration(Math.abs(d.gap))}
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
Surpass Shadow level by lifting your rolling 7-day average above ${this.app.formatDuration((d.shadowLevel.next || d.shadowLevel.current).min)} and sustaining milestone rules (5 days, 3 wins). Maintain next level by protecting monthly win rate above 60% and keeping required pace below 45 min/hour. Break Shadow momentum by converting today into a win and chaining 3 of next 5 days above ${this.app.formatDuration(d.effectiveWinTarget)} under current anti-sandbag pressure. Secure the next milestone immediately: ${d.userLevel.next ? d.userLevel.next.name : 'Top level retention'}.

=== COMMAND ===
Execute Phase 1 now and close only after logging the full ${this.app.formatDuration(phase1)}.`;
      }

      escapeHtml(value = '') {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      renderStructuredReport(reportText, snapshot) {
        const overview = this.app.elements['trainer-overview'];
        const content = this.app.elements['trainer-content'];
        if (!overview || !content) return;

        overview.innerHTML = `
          <div class="trainer-overview-card"><div class="trainer-overview-label">Mode</div><div class="trainer-overview-value">${this.escapeHtml(snapshot.mode)}</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Minutes to Win</div><div class="trainer-overview-value">${this.escapeHtml(this.app.formatDuration(snapshot.minutesToWin))}</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Required Pace</div><div class="trainer-overview-value">${this.escapeHtml(String(snapshot.requiredPace))} min/hour</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Effective Shadow</div><div class="trainer-overview-value">${this.escapeHtml(this.app.formatDuration(snapshot.effectiveShadow))}</div></div>
        `;

        const sections = reportText.split(/^===\s*(.+?)\s*===\s*$/gm);
        let html = '';
        for (let i = 1; i < sections.length; i += 2) {
          const title = sections[i];
          const body = (sections[i + 1] || '').trim();
          if (!body) continue;
          const lines = body.split('\n').filter(Boolean);
          let rows = '';
          lines.forEach(line => {
            const idx = line.indexOf(':');
            if (idx > 0) {
              const key = this.escapeHtml(line.slice(0, idx).trim());
              const val = this.escapeHtml(line.slice(idx + 1).trim());
              rows += `<div class="trainer-row"><div class="trainer-key">${key}</div><div class="trainer-val">${val}</div></div>`;
            } else {
              rows += `<div class="trainer-row"><div class="trainer-val">${this.escapeHtml(line)}</div></div>`;
            }
          });
          if (title.trim() === 'COMMAND') {
            html += `<section class="trainer-section"><div class="trainer-section-title">${this.escapeHtml(title)}</div><div class="trainer-command">${this.escapeHtml(lines.join(' '))}</div></section>`;
          } else {
            html += `<section class="trainer-section"><div class="trainer-section-title">${this.escapeHtml(title)}</div>${rows}</section>`;
          }
        }
        content.innerHTML = html;
      }

      refresh() {
        const snapshot = this.buildTrainerSnapshot();
        const reportText = this.buildReport(snapshot);
        this.lastReportText = reportText;
        this.renderStructuredReport(reportText, snapshot);
      }

      showWindow() {
        this.refresh();
        this.app.elements['trainer-modal'].style.display = 'flex';
      }

      copyPlan() {
        const text = this.lastReportText || this.app.elements['trainer-content']?.textContent || '';
        if (!text) return;
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(text).catch(() => {});
        }
      }

      hideWindow() {
        this.app.elements['trainer-modal'].style.display = 'none';
      }
    }


    class FlowProtocolEngine {
      constructor(app) {
        this.app = app;
        this.state = this.app.loadFromStorage(CONFIG.STORAGE_KEYS.FLOW_PROTOCOL) || { byDate: {} };
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
              wake_before_sun: false
            }
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
        r.attentionStretchMin = Math.min(180, (r.attentionStretchMin || 0) + 1);
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
        if (!this.app.stopwatch?.isRunning) return 'Recovery / Reset';
        const elapsedMin = Math.max(0, Math.round((Date.now() - (this.app.stopwatch.startTime || Date.now())) / 60000));
        if (elapsedMin < 10) return 'Struggle phase (persist)';
        if (elapsedMin < 15) return 'Release phase';
        if (elapsedMin < 90) return 'Flow phase';
        return 'Recovery needed';
      }

      getBlockersStatus() {
        const today = this.app.getDateString(new Date());
        const untracked = this.app.getInferredWasteMinutesForDate(today, this.app.state.tasks);
        if (untracked >= 240) return 'High blockers';
        if (untracked >= 90) return 'Moderate blockers';
        return 'Low blockers';
      }

      getPronenessStatus() {
        const r = this.getTodayRecord();
        if (r.wakeAt && r.firstActionAt) {
          const delta = Math.round((r.firstActionAt - r.wakeAt) / 60000);
          if (delta < 0) return 'Invalid timing detected (re-log wake/first action)';
          if (delta <= 90) return `High (${delta}m from wake)`;
          return `Medium (${delta}m from wake)`;
        }
        return 'Set wake + first action';
      }

      getTriggersStatus() {
        const goalProgress = this.app.shadowEngine?.getTodayGoalProgress?.() || {};
        const missionScore = this.app.shadowEngine?.calculateMissionScore?.(goalProgress) || 0;
        if (missionScore >= 80) return 'Strong (clear goals active)';
        if (missionScore >= 50) return 'Moderate (add challenge +4%)';
        return 'Weak (define clear goal + feedback)';
      }

      getActionSteps() {
        const r = this.getTodayRecord();
        const steps = [];
        if (!r.wakeAt) steps.push('Log wake time now, then start first focused action within 90 minutes.');
        if (r.wakeAt && !r.firstActionAt) steps.push('Press First Action when your first meaningful work block starts.');
        if (!r.flowBeforePhone) steps.push('Complete one 120+ minute priority block before phone exposure.');
        if ((r.attentionStretchMin || 0) < 10) steps.push('Add attention stretch reps until you hit at least 10 minutes today.');
        const war = this.getWarScore();
        if (war.done < 3) steps.push(`Complete at least ${3 - war.done} more war-mode ritual(s) to hit minimum daily pressure training.`);
        const triggers = this.getTriggersStatus();
        if (triggers.startsWith('Weak')) steps.push('Define one clear output for current block and set immediate feedback checkpoint at 25 minutes.');
        if (!steps.length) steps.push('Protocol green: run next deep-work block at +4% difficulty and protect recovery after 90 minutes.');
        return steps.slice(0, 5);
      }

      async runKillSwitch() {
        if (this.app.stopwatch?.isRunning) {
          alert('Stop current task first to run Kill Switch.');
          return;
        }
        const el = this.app.elements['kill-switch-countdown'];
        if (!el) return;
        const seq = ['3', '2', '1', 'MOVE'];
        let i = 0;
        if (this.killTimer) clearInterval(this.killTimer);
        el.textContent = seq[0];
        this.killTimer = setInterval(() => {
          i += 1;
          if (i >= seq.length) {
            clearInterval(this.killTimer);
            this.killTimer = null;
            this.markFirstActionNow();
            this.app.stopwatch.start('Kill Switch Deep Work', {
              category: 'Productive Work',
              subcategory: 'Execution',
              description: '3-second kill switch deep work block'
            });
            el.textContent = 'Deep work started';
            return;
          }
          el.textContent = seq[i];
        }, 700);
      }

      refresh() {
        const r = this.getTodayRecord();
        const blockersEl = this.app.elements['flow-blockers-status'];
        const pronenessEl = this.app.elements['flow-proneness-status'];
        const triggersEl = this.app.elements['flow-triggers-status'];
        const cycleEl = this.app.elements['flow-cycle-status'];
        const stretchEl = this.app.elements['attention-stretch-value'];
        const warScoreEl = this.app.elements['war-score'];
        const flowBeforeEl = this.app.elements['flow-before-phone-check'];
        const stepsEl = this.app.elements['flow-action-steps'];
        if (blockersEl) blockersEl.textContent = this.getBlockersStatus();
        if (pronenessEl) pronenessEl.textContent = this.getPronenessStatus();
        if (triggersEl) triggersEl.textContent = this.getTriggersStatus();
        if (cycleEl) cycleEl.textContent = this.getFlowCycleStatus();
        if (stretchEl) stretchEl.textContent = `${r.attentionStretchMin || 0} min`;
        const ws = this.getWarScore();
        if (warScoreEl) warScoreEl.textContent = `${ws.done}/${ws.total}`;
        if (flowBeforeEl) flowBeforeEl.checked = !!r.flowBeforePhone;
        if (stepsEl) stepsEl.innerHTML = this.getActionSteps().map(step => `<li>${step}</li>`).join('');

        document.querySelectorAll('.war-mode-check').forEach(cb => {
          const key = cb.getAttribute('data-key');
          cb.checked = !!(r.warMode && r.warMode[key]);
        });
      }
    }


    class GraphManager {
      constructor(app) { this.app = app; this.charts = { productivity: null, sleep: null }; this.totalCounterAnimation = null; this.lastFilteredTotalMinutes = 0; }
      initialize() { if (!window.Chart) return; this.createCharts(); this.setupChartControls(); this.lastFilteredTotalMinutes = this.getCurrentFilteredTotalMinutes(); this.animateFilteredTotal(0, this.lastFilteredTotalMinutes); this.updateGraphKpis(); }

      getRangeDates(range) {
        const days = range === 'weekly' ? 84 : (CONFIG.CHART_RANGES[range] || 7);
        const today = new Date();
        const dates = [];
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          dates.push(this.app.getDateString(d));
        }
        return dates;
      }

      updateGraphKpis() {
        const range = this.app.elements['prod-range'].value;
        const rangeDates = this.getRangeDates(range);
        const dateSet = new Set(rangeDates);

        const productivity = this.app.state.tasks
          .filter(t => dateSet.has(t.date) && this.app.isProductiveCategory(t.category))
          .reduce((sum, t) => sum + t.duration, 0);

        const loggedDistraction = this.app.state.tasks
          .filter(t => dateSet.has(t.date) && (t.category === 'Time Waste / Distraction' || t.graph_tag === 'distraction'))
          .reduce((sum, t) => sum + t.duration, 0);

        const untrackedDistraction = rangeDates.reduce((sum, dateStr) => {
          return sum + this.app.getInferredWasteMinutesForDate(dateStr, this.app.state.tasks);
        }, 0);

        const totalDistraction = loggedDistraction + untrackedDistraction;

        this.app.elements['graph-productivity-total'].textContent = this.app.formatDuration(productivity);
        this.app.elements['graph-total-distraction'].textContent = this.app.formatDuration(totalDistraction);
        this.app.elements['graph-logged-distraction'].textContent = this.app.formatDuration(loggedDistraction);
      }

      getCurrentFilter() {
        return 'productivity';
      }

      passesProductivityFilter(task, filter) {
        if (task.category === 'Sleep') return false;
        const tag = task.graph_tag || 'neutral';
        if (filter === 'productivity') return tag === 'productivity';
        if (filter === 'logged_distraction') return tag === 'distraction' || task.category === 'Time Waste / Distraction';
        if (filter === 'total_distraction') return tag === 'distraction' || task.category === 'Time Waste / Distraction';
        return true;
      }

      getColorScheme() {
        return { border: 'rgb(40, 180, 99)', fill: 'rgba(40, 180, 99, 0.16)' };
      }

      createCharts() {
        const prodCtx = this.app.elements['productivity-chart'].getContext('2d');
        const initialRange = this.app.elements['prod-range']?.value || '7d';
        this.charts.productivity = new Chart(prodCtx, {
          type: 'line',
          data: this.getProductivityData(initialRange, this.getCurrentFilter()),
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 420, easing: 'easeOutCubic' },
            transitions: {
              active: { animation: { duration: 320 } },
              resize: { animation: { duration: 320 } }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                displayColors: false,
                callbacks: {
                  label: (context) => `Productivity: ${context.parsed.y}h`
                }
              }
            },
            scales: { y: { beginAtZero: true, ticks: { callback: v => v + 'h' } } },
            elements: {
              point: {
                radius: 0,
                hoverRadius: 0,
                pointStyle: 'circle',
                hoverBorderWidth: 2
              },
              line: { tension: 0.34, borderWidth: 2.5 }
            }
          }
        });

        const sleepCtx = this.app.elements['sleep-chart'].getContext('2d');
        this.charts.sleep = new Chart(sleepCtx, {
          type: 'bar',
          data: this.getSleepData('7d'),
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 380, easing: 'easeOutQuad' },
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 12, ticks: { callback: v => v + 'h' } } }
          }
        });
      }

      getProductivityData(range='7d', filter='productivity') {
        const activeFilter = 'productivity';
        if (range === 'weekly') {
          const data = [];
          const labels = [];
          const today = new Date();
          const weeks = 12;
          for (let w = weeks - 1; w >= 0; w--) {
            const weekEnd = new Date(today);
            weekEnd.setDate(today.getDate() - (w * 7));
            const weekStart = new Date(weekEnd);
            weekStart.setDate(weekEnd.getDate() - 6);

            let weekMinutes = 0;
            for (let i = 0; i < 7; i++) {
              const d = new Date(weekStart);
              d.setDate(weekStart.getDate() + i);
              const ds = this.app.getDateString(d);
              weekMinutes += this.app.state.tasks
                .filter(t => t.date===ds && this.passesProductivityFilter(t, activeFilter))
                .reduce((a,t)=>a+t.duration,0);
            }

            const weekAvgDailyHours = parseFloat(((weekMinutes / 7) / 60).toFixed(2));
            labels.push(`${weekStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})}–${weekEnd.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`);
            data.push(weekAvgDailyHours);
          }

          const colors = this.getColorScheme();
          return {
            labels,
            datasets: [{
              label:'Weekly Avg Hours/Day',
              data,
              borderColor: colors.border,
              backgroundColor: colors.fill,
              pointBackgroundColor: colors.border,
              pointBorderColor: 'rgba(255,255,255,0.65)',
              pointHoverBackgroundColor: '#ffffff',
              pointHoverBorderColor: colors.border,
              fill:true
            }]
          };
        }

        const days = CONFIG.CHART_RANGES[range] || 7, data=[], labels=[], today=new Date();
        for (let i=days-1;i>=0;i--) {
          const d=new Date(today);
          d.setDate(today.getDate()-i);
          const ds=this.app.getDateString(d);
          let mins = 0;
          mins = this.app.state.tasks
            .filter(t => t.date===ds && this.passesProductivityFilter(t, activeFilter))
            .reduce((a,t)=>a+t.duration,0);
          labels.push(d.toLocaleDateString('en-US',{month:'short',day:'numeric'}));
          data.push(parseFloat((mins/60).toFixed(2)));
        }
        const colors = this.getColorScheme();
        return {
          labels,
          datasets: [{
            label:'Tracked Hours',
            data,
            borderColor: colors.border,
            backgroundColor: colors.fill,
            pointBackgroundColor: colors.border,
            pointBorderColor: 'rgba(255,255,255,0.65)',
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: colors.border,
            fill:true
          }]
        };
      }

      getSleepData(range='7d') {
        const days = CONFIG.CHART_RANGES[range] || 7, data=[], labels=[], today=new Date();
        for (let i=days-1;i>=0;i--) { const d=new Date(today); d.setDate(today.getDate()-i); const ds=this.app.getDateString(d); const mins=this.app.state.tasks.filter(t => t.date===ds && t.category==='Sleep').reduce((a,t)=>a+t.duration,0); labels.push(d.toLocaleDateString('en-US',{month:'short',day:'numeric'})); data.push(parseFloat((mins/60).toFixed(1))); }
        return { labels, datasets: [{ label:'Sleep Hours', data, backgroundColor:'rgba(111, 66, 193, 0.7)', borderColor:'rgb(111,66,193)', borderWidth:1, borderRadius:4 }] };
      }

      getCurrentFilteredTotalMinutes() {
        const range = this.app.elements['prod-range'].value;
        const rangeDates = this.getRangeDates(range);
        const dateSet = new Set(rangeDates);
        return this.app.state.tasks
          .filter(t => dateSet.has(t.date) && this.passesProductivityFilter(t, 'productivity'))
          .reduce((sum, t) => sum + t.duration, 0);
      }

      animateFilteredTotal(fromMinutes, toMinutes) {
        if (!this.app.elements['prod-filter-total']) return;
        const el = this.app.elements['prod-filter-total'];
        const start = performance.now();
        const duration = 450;
        const tick = (now) => {
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = fromMinutes + (toMinutes - fromMinutes) * eased;
          el.textContent = this.app.formatDuration(current);
          if (progress < 1) this.totalCounterAnimation = requestAnimationFrame(tick);
        };
        if (this.totalCounterAnimation) cancelAnimationFrame(this.totalCounterAnimation);
        this.totalCounterAnimation = requestAnimationFrame(tick);
      }

      updateCharts() {
        if (!this.charts.productivity || !this.charts.sleep) return;
        const prodRange = this.app.elements['prod-range'].value;
        const sleepRange = this.app.elements['sleep-range'].value;
        const filter = this.getCurrentFilter();

        const prodContainer = this.app.elements['productivity-chart'].closest('.graph-canvas-container');
        if (prodContainer) prodContainer.classList.add('filter-updating');

        const fromMinutes = this.lastFilteredTotalMinutes;
        this.charts.productivity.data=this.getProductivityData(prodRange, filter);
        this.charts.sleep.data=this.getSleepData(sleepRange);
        this.charts.productivity.update();
        this.charts.sleep.update();

        const toMinutes = this.getCurrentFilteredTotalMinutes();
        this.lastFilteredTotalMinutes = toMinutes;
        this.animateFilteredTotal(fromMinutes, toMinutes);
        this.updateGraphKpis();
        setTimeout(() => { if (prodContainer) prodContainer.classList.remove('filter-updating'); }, 360);
      }

      setupChartControls() {
        this.app.elements['prod-range'].addEventListener('change', () => this.updateCharts());
        this.app.elements['sleep-range'].addEventListener('change', () => this.updateCharts());
      }
    }
    class EventManager {
      constructor(app) { this.app = app; }
      initialize() { this.bindEvents(); }
      bindEvents() {
        this.app.elements['start-btn'].addEventListener('click', () => this.app.stopwatch.start());
        this.app.elements['stop-btn'].addEventListener('click', () => this.app.stopwatch.stop());
        this.app.elements['sleep-btn'].addEventListener('click', () => this.app.stopwatch.startSleep());
        this.app.elements['add-favorite'].addEventListener('click', () => this.app.taskManager.addFavorite());
        this.app.elements['task-input'].addEventListener('keypress', e => { if (e.key === 'Enter' && !this.app.stopwatch.isRunning) this.app.stopwatch.start(); });
        this.app.elements['view-report'].addEventListener('click', () => this.app.uiManager.showReport());
        this.app.elements['open-trainer'].addEventListener('click', () => this.app.trainerEngine.showWindow());
        this.app.elements['export-data'].addEventListener('click', () => this.app.uiManager.exportData());
        this.app.elements['import-data'].addEventListener('click', () => this.app.uiManager.triggerImportPicker());
        this.app.elements['import-file'].addEventListener('change', (e) => {
          const file = e.target.files?.[0];
          this.app.uiManager.importDataFromFile(file);
        });
        if (this.app.elements['wake-now-btn']) this.app.elements['wake-now-btn'].addEventListener('click', () => this.app.flowEngine.markWakeNow());
        if (this.app.elements['first-action-btn']) this.app.elements['first-action-btn'].addEventListener('click', () => this.app.flowEngine.markFirstActionNow());
        if (this.app.elements['kill-switch-btn']) this.app.elements['kill-switch-btn'].addEventListener('click', () => this.app.flowEngine.runKillSwitch());
        if (this.app.elements['flow-before-phone-check']) this.app.elements['flow-before-phone-check'].addEventListener('change', (e) => this.app.flowEngine.toggleFlowBeforePhone(e.target.checked));
        if (this.app.elements['attention-minus-btn']) this.app.elements['attention-minus-btn'].addEventListener('click', () => this.app.flowEngine.decrementAttentionStretch());
        if (this.app.elements['attention-plus-btn']) this.app.elements['attention-plus-btn'].addEventListener('click', () => this.app.flowEngine.incrementAttentionStretch());
        document.querySelectorAll('.war-mode-check').forEach(cb => {
          cb.addEventListener('change', (e) => {
            const key = e.target.getAttribute('data-key');
            this.app.flowEngine.toggleWarMode(key, e.target.checked);
          });
        });
        this.app.elements['close-modal'].addEventListener('click', () => this.app.uiManager.hideReport());
        this.app.elements['close-report'].addEventListener('click', () => this.app.uiManager.hideReport());
        this.app.elements['print-report'].addEventListener('click', () => window.print());
        this.app.elements['close-trainer'].addEventListener('click', () => this.app.trainerEngine.hideWindow());
        this.app.elements['close-trainer-modal'].addEventListener('click', () => this.app.trainerEngine.hideWindow());
        this.app.elements['refresh-trainer'].addEventListener('click', () => this.app.trainerEngine.refresh());
        this.app.elements['copy-trainer'].addEventListener('click', () => this.app.trainerEngine.copyPlan());
        this.app.elements['close-streak'].addEventListener('click', () => this.app.uiManager.hideStreakPopup());
        this.app.elements['report-modal'].addEventListener('click', e => { if (e.target === this.app.elements['report-modal']) this.app.uiManager.hideReport(); });
        this.app.elements['trainer-modal'].addEventListener('click', e => { if (e.target === this.app.elements['trainer-modal']) this.app.trainerEngine.hideWindow(); });
      }
    }
    window.classifyActivity = (userInput) => ActivityClassifier.classify(userInput);
    window.app = new DisciplineTracker();
    document.addEventListener('DOMContentLoaded', () => window.app.initialize());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && window.app.taskManager) { window.app.taskManager.updateStats(); window.app.taskManager.renderTasks(); window.app.taskManager.renderFavorites(); if (window.app.shadowEngine) window.app.shadowEngine.refresh(false); if (window.app.flowEngine) window.app.flowEngine.refresh(); } });
    window.addEventListener('beforeunload', () => { if (window.app?.stopwatch?.animationFrameId) cancelAnimationFrame(window.app.stopwatch.animationFrameId); });
  
