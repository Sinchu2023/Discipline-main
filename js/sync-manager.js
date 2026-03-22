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
