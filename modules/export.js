/**
 * modules/export.js  —  Phase 7
 * ─────────────────────────────────────────────────────────────────────────────
 * Export all app data to a single JSON file.
 *
 * Collects:
 *  - localStorage: tasks, trainer state, timetable overrides, stopwatch sessions
 *  - IndexedDB notes (text + id + createdAt, NO embeddings — they're regenerated)
 *
 * Does NOT modify any existing features.
 */

(function () {
  'use strict';

  const LS_KEYS = [
    'discipline_tracker_tasks',
    'discipline_tracker_trainer_state',
    'discipline_timetable_override',
    'discipline_tracker_stopwatch',
    'discipline_notes_undo',      // chat undo snapshots
  ];

  const IDB_NAME  = 'discipline_notes_db';
  const IDB_STORE = 'notes';

  // ─── read IDB notes ────────────────────────────────────────────────────────

  function readNotesFromIDB() {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onerror = () => resolve([]);
        req.onsuccess = e => {
          const db  = e.target.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) { resolve([]); return; }
          const tx  = db.transaction(IDB_STORE, 'readonly');
          const get = tx.objectStore(IDB_STORE).getAll();
          get.onsuccess = ev => {
            // Strip embeddings — they're large Float32Arrays and are regenerated on import
            const slim = (ev.target.result || []).map(({ id, text, createdAt }) => ({ id, text, createdAt }));
            resolve(slim);
          };
          get.onerror = () => resolve([]);
        };
      } catch { resolve([]); }
    });
  }

  // ─── main export ──────────────────────────────────────────────────────────

  async function exportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version:    1,
      localStorage: {},
      notes:      [],
    };

    // 1. localStorage keys
    LS_KEYS.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try { payload.localStorage[key] = JSON.parse(raw); }
        catch { payload.localStorage[key] = raw; }
      }
    });

    // 2. IDB notes
    payload.notes = await readNotesFromIDB();

    // 3. Download
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const ts   = new Date().toISOString().slice(0, 10);
    a.href     = url;
    a.download = `discipline-backup-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

    return payload.notes.length;
  }

  // ─── wire button ──────────────────────────────────────────────────────────

  function boot() {
    const btn = document.getElementById('export-data-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting…';
      try {
        const noteCount = await exportData();
        btn.innerHTML = '<i class="fas fa-check"></i> Exported!';
        setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 2000);
      } catch (e) {
        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed';
        console.error('[export] Failed:', e);
        setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 2500);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.ExportData = { exportData };

})();
