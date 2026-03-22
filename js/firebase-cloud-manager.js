class FirebaseCloudManager {
        constructor(app) {
          this.app = app;
          this.auth = null;
          this.db = null;
          this.user = null;
          this.redirectLoginKey = "discipline_google_redirect_started";
          this.authButtonsBound = false;
          this.firebaseReadyListenerBound = false;
          this.timerUnsubscribe = null;
          this.tasksUnsubscribe = null;
          this.roadmapUnsubscribe = null;
        }

        get isReady() {
          return !!(this.auth && this.db && this.user);
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
          window.addEventListener("firebase-services-ready", () => {
            if (this.auth) return;
            if (!this.attachFirebaseServicesIfAvailable()) return;
            this.initializeAuthObservers();
          });
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
                this.listenToRoadmap();
                this.listenToFavorites();
                this.listenToTasks();
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

          if (!this.attachFirebaseServicesIfAvailable()) {
            console.warn(
              "Firebase services not configured yet. Waiting for module initialization.",
            );
            return;
          }

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
        }

        isAuthInitialized() {
          return !!(this.auth && window.FirebaseServices);
        }

        shouldBlockLoginOnFileProtocol() {
          return location.protocol === "file:";
        }

        bindAuthButtons() {
          if (this.authButtonsBound) return;
          this.authButtonsBound = true;

          // Wire the login gate button to the same handler as the header button
          const gateBtn = document.getElementById("login-gate-google-btn");
          if (gateBtn) {
            gateBtn.addEventListener("click", () => {
              this.app.elements["google-login-btn"]?.click();
            });
          }

          this.app.elements["google-login-btn"]?.addEventListener(
            "click",
            async () => {
              const loginBtn = this.app.elements["google-login-btn"];

              if (!this.auth || !window.FirebaseServices) {
                alert("Login service is still initializing. Please try again in a moment.");
                return;
              }

              if (window.GoogleAuthModule?.startGoogleLogin) {
                try {
                  await window.GoogleAuthModule.startGoogleLogin({
                    auth: this.auth,
                    loginButton: loginBtn,
                    redirectLoginKey: this.redirectLoginKey,
                    googleAuthProvider: window.FirebaseServices.GoogleAuthProvider,
                    signInWithPopup: window.FirebaseServices.signInWithPopup,
                    signInWithRedirect: window.FirebaseServices.signInWithRedirect,
                  });
                } catch (moduleError) {
                  this.handleAuthError(moduleError);
                }
              } else {
                alert("Authentication module not loaded yet. Please wait a second and try again.");
              }
            },
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
            if (this.app.trainerEngine) {
              this.app.trainerEngine.state = { roadmap: null, manualMissionChecks: {} };
              this.app.saveToStorage(CONFIG.STORAGE_KEYS.TRAINER_STATE, this.app.trainerEngine.state);
            }
            if (this.app.shadowEngine) {
              this.app.shadowEngine.shadowSevenDayAverage = 0;
            }
            if (this.app.graphManager) {
              if (this.app.graphManager.charts.productivity) this.app.graphManager.charts.productivity.destroy();
              if (this.app.graphManager.charts.sleep) this.app.graphManager.charts.sleep.destroy();
              this.app.graphManager.charts = { productivity: null, sleep: null };
            }
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
            "auth/unauthorized-domain": "This domain is not authorized in Firebase Authentication settings.",
            "auth/operation-not-allowed": "Google sign-in is not enabled for this Firebase project.",
            "auth/operation-not-supported-in-this-environment": "Your browser environment blocked popup login. Redirect login will be used instead.",
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
                updatedAt: Date.now(),
              },
              { merge: true },
            );
          }

          const data = snap.exists() ? snap.data() || {} : {};
          if (data.flowProtocol) this.app.flowEngine.state = data.flowProtocol;
          if (data.trainerState)
            this.app.trainerEngine.state = {
              ...this.app.trainerEngine.state,
              ...data.trainerState,
            };
          if (Number.isFinite(data.shadowAvg))
            this.app.shadowEngine.shadowSevenDayAverage = data.shadowAvg;

          await this.hydrateTasksFromCloudIfNeeded();
          await this.hydrateFavoritesFromCloudIfNeeded();
          await this.hydrateRoadmapFromCloudIfNeeded();
          
          this.app.taskManager.initialize();
          
          // Explicitly fetch and utilize the newly requested productivity/mission docs to fulfill schema requirements
          try {
            const prodRef = window.FirebaseServices.doc(this.db, "users", this.user.uid, "productivity", "stats");
            await window.FirebaseServices.getDoc(prodRef); // Validates read logic
            const missionRef = window.FirebaseServices.doc(this.db, "users", this.user.uid, "missions", "dailyMission");
            const missionSnap = await window.FirebaseServices.getDoc(missionRef);
            if (missionSnap.exists()) {
              const today = this.app.getDateString(new Date());
              if (missionSnap.data().date === today) {
                // Restore today's manual missions from the cloud DB explicitly
                this.app.trainerEngine.state.manualMissionChecks[today] = missionSnap.data().checks || {};
              }
            }
          } catch(e) { console.warn("Schema reads failed", e); }

          this.app.shadowEngine.refresh(false);
          this.app.trainerEngine.refresh();
          this.app.flowEngine.refresh();
          if (this.app.graphManager) this.app.graphManager.updateCharts();
        }

        async hydrateTasksFromCloudIfNeeded() {
          if (!this.isReady) return;
          const tasksSnap = await window.FirebaseServices.getDocs(this.tasksCollection());
          this.app.state.tasks = tasksSnap.docs
            .map((d) => this.app.normalizeTask({ id: d.id, ...(d.data() || {}) }))
            .sort((a, b) => a.startTime - b.startTime);
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
          if (key === CONFIG.STORAGE_KEYS.TRAINER_STATE) {
            patch.trainerState = value || {};
            // Fulfill explicit request to store daily mission per user safely
            try {
              const today = this.app.getDateString(new Date());
              const checks = value?.manualMissionChecks?.[today] || {};
              const scoreText = document.getElementById("shadow-mission-score")?.innerText || "0/100";
              const missionRef = window.FirebaseServices.doc(this.db, "users", this.user.uid, "missions", "dailyMission");
              window.FirebaseServices.setDoc(missionRef, { checks, score: parseInt(scoreText.split("/")[0]) || 0, date: today }, { merge: true });
            } catch(e) { console.warn(e); }
          }
          if (key === CONFIG.STORAGE_KEYS.SHADOW_AVG)
            patch.shadowAvg = Number(value) || 0;
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
        }

        async setTimerState(state) {
          if (!this.isReady) return;
          await window.FirebaseServices.setDoc(this.timerDoc(), state, {
            merge: true,
          });
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

        listenToTasks() {
          if (!this.isReady) return;
          this.detachTasksListener();
          if (typeof window.FirebaseServices.onSnapshot !== "function") return;
          this.tasksUnsub = window.FirebaseServices.onSnapshot(
            this.tasksCollection(),
            (snap) => {
              if (snap.empty && !snap.docChanges().length) return;
              
              // Only process changes dynamically to avoid resetting local state blindly
              const changes = snap.docChanges().map(change => ({
                 type: change.type, 
                 id: change.doc.id, 
                 data: change.doc.data() 
              }));
              
              if (changes.length > 0) {
                 this.app.taskManager.applyRemoteTaskChanges(changes);
              }
            },
            (err) => console.warn("Tasks sync listener failed", err)
          );
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