/**
 * modules/notes.js  —  Phase 6
 * ─────────────────────────────────────────────────────────────────────────────
 * Study notes with local AI search.
 *
 * Features:
 *  - Save notes to IndexedDB (instant, no Ollama required)
 *  - Embed notes with nomic-embed-text (lazy: on start + before ask + every 60s)
 *  - Search by cosine similarity (threshold 0.55); prefix search_document / search_query
 *  - Ask AI: model sees [1]…[K] numbered notes, cites [n], code maps to real IDs
 *  - Post-answer validation: [n] in range; numbers in answer must be in cited notes
 *  - Firestore sync: {id, text, createdAt} → users/{uid}/notes (signed-in only)
 *
 * Does NOT modify any existing features.
 */

(function () {
  'use strict';

  // ─── config ────────────────────────────────────────────────────────────────

  const NOTES_CONFIG = {
    idbName:          'discipline_notes_db',
    idbVersion:       1,
    idbStore:         'notes',
    ollamaBase:       'http://localhost:11434',
    embedModel:       'nomic-embed-text',
    chatModel:        'qwen2.5:3b',
    similarityThreshold: 0.55,
    topK:             3,
    embedInterval:    60000,   // ms — poll for pending embeds
    maxNoteLength:    2000,
  };

  // ─── state ─────────────────────────────────────────────────────────────────

  let _db          = null;   // IDBDatabase
  let _embedTimer  = null;   // setInterval handle
  let _firestoreUid = null;  // current signed-in uid (null = not signed in)
  let _el          = {};     // DOM refs

  // ─── IndexedDB ─────────────────────────────────────────────────────────────

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(NOTES_CONFIG.idbName, NOTES_CONFIG.idbVersion);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(NOTES_CONFIG.idbStore)) {
          const store = db.createObjectStore(NOTES_CONFIG.idbStore, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  function idbGetAll() {
    return new Promise((resolve, reject) => {
      const tx  = _db.transaction(NOTES_CONFIG.idbStore, 'readonly');
      const req = tx.objectStore(NOTES_CONFIG.idbStore).getAll();
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  function idbPut(note) {
    return new Promise((resolve, reject) => {
      const tx  = _db.transaction(NOTES_CONFIG.idbStore, 'readwrite');
      const req = tx.objectStore(NOTES_CONFIG.idbStore).put(note);
      req.onsuccess = () => resolve();
      req.onerror   = e => reject(e.target.error);
    });
  }

  function idbDelete(id) {
    return new Promise((resolve, reject) => {
      const tx  = _db.transaction(NOTES_CONFIG.idbStore, 'readwrite');
      const req = tx.objectStore(NOTES_CONFIG.idbStore).delete(id);
      req.onsuccess = () => resolve();
      req.onerror   = e => reject(e.target.error);
    });
  }

  // ─── UUID ──────────────────────────────────────────────────────────────────

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ─── Ollama helpers ────────────────────────────────────────────────────────

  async function isOllamaReachable() {
    try {
      const r = await fetch(NOTES_CONFIG.ollamaBase + '/api/tags', {
        signal: AbortSignal.timeout(2000),
      });
      return r.ok;
    } catch { return false; }
  }

  async function getEmbedding(text, prefix = 'search_document: ') {
    const r = await fetch(NOTES_CONFIG.ollamaBase + '/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ model: NOTES_CONFIG.embedModel, prompt: prefix + text }),
    });
    if (!r.ok) throw new Error('Embedding API returned ' + r.status);
    const data = await r.json();
    return data.embedding;   // number[]
  }

  // ─── cosine similarity ─────────────────────────────────────────────────────

  function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na  += a[i] * a[i];
      nb  += b[i] * b[i];
    }
    return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
  }

  // ─── lazy embed ────────────────────────────────────────────────────────────

  async function embedPending() {
    if (!_db) return;
    let notes;
    try { notes = await idbGetAll(); } catch { return; }

    const pending = notes.filter(n => !n.embedding);
    if (!pending.length) return;

    const online = await isOllamaReachable();
    if (!online) {
      showStatusBar('⚠️ AI offline — ' + pending.length + ' note(s) waiting to be indexed.');
      return;
    }
    hideStatusBar();

    for (const note of pending) {
      try {
        const emb = await getEmbedding(note.text, 'search_document: ');
        note.embedding = emb;
        await idbPut(note);
        renderNoteItem(note);  // refresh embed badge in list
      } catch (e) {
        console.warn('[notes] embed failed for', note.id, e.message);
      }
    }

    // Re-check after embedding
    const stillPending = (await idbGetAll()).filter(n => !n.embedding);
    if (stillPending.length === 0) hideStatusBar();
    updateCount();
  }

  function startEmbedPoller() {
    if (_embedTimer) clearInterval(_embedTimer);
    _embedTimer = setInterval(async () => {
      if (!_db) return;
      const notes = await idbGetAll().catch(() => []);
      if (notes.some(n => !n.embedding)) await embedPending();
    }, NOTES_CONFIG.embedInterval);
  }

  // ─── Firestore sync ────────────────────────────────────────────────────────

  async function fsSync(note) {
    if (!_firestoreUid) return;
    const svc = window.FirebaseServices;
    if (!svc?.db || !svc?.doc || !svc?.setDoc) return;
    try {
      const ref = svc.doc(svc.db, 'users', _firestoreUid, 'notes', note.id);
      await svc.setDoc(ref, {
        id:        note.id,
        text:      note.text,
        createdAt: note.createdAt,
      }, { merge: true });
    } catch (e) {
      console.warn('[notes] Firestore sync failed:', e.message);
    }
  }

  async function fsDelete(id) {
    if (!_firestoreUid) return;
    const svc = window.FirebaseServices;
    if (!svc?.db || !svc?.doc || !svc?.deleteDoc) return;
    try {
      const ref = svc.doc(svc.db, 'users', _firestoreUid, 'notes', id);
      await svc.deleteDoc(ref);
    } catch (e) {
      console.warn('[notes] Firestore delete failed:', e.message);
    }
  }

  async function fsPull() {
    if (!_firestoreUid) return;
    const svc = window.FirebaseServices;
    if (!svc?.db || !svc?.collection || !svc?.getDocs) return;
    try {
      const colRef = svc.collection(svc.db, 'users', _firestoreUid, 'notes');
      const snap   = await svc.getDocs(colRef);
      for (const d of snap.docs) {
        const remote = d.data();
        const all    = await idbGetAll();
        if (!all.find(n => n.id === remote.id)) {
          await idbPut({ id: remote.id, text: remote.text, createdAt: remote.createdAt, embedding: null });
        }
      }
      await embedPending();
      await renderNotesList();
      updateCount();
    } catch (e) {
      console.warn('[notes] Firestore pull failed:', e.message);
    }
  }

  // ─── auth state watcher ───────────────────────────────────────────────────

  function watchAuth() {
    const svc = window.FirebaseServices;
    if (!svc?.auth || !svc?.onAuthStateChanged) return;
    try {
      svc.onAuthStateChanged(svc.auth, async user => {
        _firestoreUid = user ? user.uid : null;
        if (user) {
          await fsPull();
        }
      });
    } catch (e) {
      console.warn('[notes] Auth watcher failed:', e.message);
    }
  }

  // ─── note CRUD ─────────────────────────────────────────────────────────────

  async function saveNote(text) {
    const note = {
      id:        uuid(),
      text:      text.trim(),
      createdAt: new Date().toISOString(),
      embedding: null,
    };
    await idbPut(note);
    await fsSync(note);         // fire-and-forget Firestore sync
    await embedPending();        // try embedding immediately
    await renderNotesList();
    updateCount();
    return note;
  }

  async function deleteNote(id) {
    await idbDelete(id);
    await fsDelete(id);
    await renderNotesList();
    updateCount();
  }

  // ─── search ────────────────────────────────────────────────────────────────

  /**
   * Find the top-K notes most similar to the query.
   * @param {string} query
   * @returns {Promise<Array<{note, score}>>}
   */
  async function searchNotes(query) {
    const notes = await idbGetAll();
    const embedded = notes.filter(n => n.embedding);
    if (!embedded.length) return [];

    const qEmb = await getEmbedding(query, 'search_query: ');
    const scored = embedded.map(n => ({
      note:  n,
      score: cosine(qEmb, n.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored
      .filter(s => s.score >= NOTES_CONFIG.similarityThreshold)
      .slice(0, NOTES_CONFIG.topK);
  }

  // ─── ask AI with notes context ─────────────────────────────────────────────

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Ask the AI a question, grounding in the retrieved notes.
   * Returns { answer, citedIds, validationError }
   */
  async function askAI(question) {
    // 1. Embed before asking (catches any pending)
    await embedPending();

    // 2. Search
    const hits = await searchNotes(question);
    if (!hits.length) {
      return { answer: null, citedIds: [], validationError: null, noMatch: true };
    }

    // 3. Build numbered prompt  [1] text  [2] text ...
    const numberedNotes = hits.map((h, i) => `[${i + 1}] ${h.note.text}`).join('\n\n');
    const idByIndex     = hits.map(h => h.note.id);   // index 0 → real id

    // 4. Call model
    const r = await fetch(NOTES_CONFIG.ollamaBase + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model:  NOTES_CONFIG.chatModel,
        stream: false,
        options: { temperature: 0.3 },
        messages: [
          {
            role: 'system',
            content:
              'You are a study assistant. Answer the question ONLY using the provided notes. ' +
              'Cite the note numbers like [1] or [2] when you use information from them. ' +
              'If the answer is not in the notes, say "Not in your notes".',
          },
          {
            role: 'user',
            content: 'Notes:\n' + numberedNotes + '\n\nQuestion: ' + question,
          },
        ],
      }),
    });

    if (!r.ok) throw new Error('Chat API error ' + r.status);
    const data   = await r.json();
    let rawAnswer = data?.message?.content?.trim() || '';

    // 5. Parse citations [n] — validate in range
    const citedIndices = [...new Set(
      [...rawAnswer.matchAll(/\[(\d+)\]/g)].map(m => parseInt(m[1]))
    )];
    const outOfRange   = citedIndices.filter(n => n < 1 || n > hits.length);
    if (outOfRange.length) {
      return {
        answer: rawAnswer,
        citedIds: [],
        validationError: `Citation [${outOfRange.join(', ')}] out of range (max [${hits.length}]).`,
      };
    }

    const citedIds = citedIndices.map(n => idByIndex[n - 1]);

    // 6. Number validation: strip [n] tags and real IDs from answer before checking numbers
    let stripped = rawAnswer
      .replace(/\[\d+\]/g, '')          // remove [n]
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '');  // remove UUIDs

    const answerNumbers = [...stripped.matchAll(/\b\d+(\.\d+)?\b/g)].map(m => Number(m[0]));
    if (answerNumbers.length > 0) {
      // Numbers in the answer must appear in the cited note texts
      const citedText = citedIds.map(id => {
        const note = hits.find(h => h.note.id === id)?.note;
        return note ? note.text : '';
      }).join(' ');
      const citedNumbers = new Set(
        [...citedText.matchAll(/\b\d+(\.\d+)?\b/g)].map(m => Number(m[0]))
      );
      const foreign = answerNumbers.filter(n => !citedNumbers.has(n));
      if (foreign.length) {
        return { answer: 'Not in your notes', citedIds, validationError: null };
      }
    }

    return { answer: rawAnswer, citedIds, validationError: null };
  }

  // ─── UI helpers ────────────────────────────────────────────────────────────

  function showStatusBar(msg) {
    if (!_el.statusBar) return;
    _el.statusBar.textContent = msg;
    _el.statusBar.style.display = 'flex';
  }

  function hideStatusBar() {
    if (_el.statusBar) _el.statusBar.style.display = 'none';
  }

  function updateCount() {
    if (!_db || !_el.count) return;
    idbGetAll().then(notes => {
      if (_el.count) _el.count.textContent = notes.length;
    }).catch(() => {});
  }

  function renderNoteItem(note) {
    if (!_el.list) return;
    const existing = _el.list.querySelector(`[data-note-id="${note.id}"]`);
    const date = new Date(note.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
    const embedLabel = note.embedding
      ? '✓ indexed'
      : '<span class="pending">⏳ indexing…</span>';

    const html = `
      <div class="notes-item" data-note-id="${escHtml(note.id)}">
        <div class="notes-item-body">
          <div class="notes-item-text" title="${escHtml(note.text)}">${escHtml(note.text)}</div>
          <div class="notes-item-meta">${date}</div>
          <div class="notes-item-embed">${embedLabel}</div>
        </div>
        <button class="notes-delete-btn" title="Delete note" data-note-id="${escHtml(note.id)}">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>`;

    if (existing) {
      existing.outerHTML = html;
    } else {
      const empty = _el.list.querySelector('.notes-empty');
      if (empty) empty.remove();
      _el.list.insertAdjacentHTML('afterbegin', html);
    }
  }

  async function renderNotesList() {
    if (!_db || !_el.list) return;
    const notes = await idbGetAll();
    _el.list.innerHTML = '';
    if (!notes.length) {
      _el.list.innerHTML = '<div class="notes-empty">No notes yet. Switch to "Save Note" to add one.</div>';
      return;
    }
    notes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    notes.forEach(renderNoteItem);
  }

  function switchTab(tabId) {
    const tabs   = ['notes-tab-ask', 'notes-tab-save', 'notes-tab-list'];
    const panels = ['notes-panel-ask', 'notes-panel-save', 'notes-panel-list'];
    tabs.forEach((id, i) => {
      const tab   = document.getElementById(id);
      const panel = document.getElementById(panels[i]);
      const active = (id === tabId);
      if (tab) {
        tab.classList.toggle('notes-tab--active', active);
        tab.setAttribute('aria-selected', String(active));
      }
      if (panel) panel.style.display = active ? 'block' : 'none';
    });
    if (tabId === 'notes-tab-list') renderNotesList();
  }

  // ─── event handlers ────────────────────────────────────────────────────────

  async function handleAsk() {
    const q = (_el.askInput?.value || '').trim();
    if (!q) return;

    if (_el.askAnswer)    { _el.askAnswer.style.display = 'none'; }
    if (_el.askCitations) { _el.askCitations.style.display = 'none'; }
    if (_el.askSpinner)   _el.askSpinner.style.display = 'flex';
    if (_el.askBtn)       _el.askBtn.disabled = true;

    try {
      const online = await isOllamaReachable();
      if (!online) {
        showStatusBar('⚠️ AI offline — cannot answer questions right now.');
        return;
      }
      hideStatusBar();

      const { answer, citedIds, validationError, noMatch } = await askAI(q);

      if (noMatch) {
        if (_el.askAnswer) {
          _el.askAnswer.className = 'notes-no-match';
          _el.askAnswer.textContent = '🔍 No matching notes found. Save some notes about this topic first.';
          _el.askAnswer.style.display = 'block';
        }
        return;
      }

      if (validationError) {
        if (_el.askAnswer) {
          _el.askAnswer.className = 'notes-ask-answer';
          _el.askAnswer.style.borderLeftColor = 'var(--warning)';
          _el.askAnswer.textContent = '⚠️ ' + validationError;
          _el.askAnswer.style.display = 'block';
        }
        return;
      }

      if (_el.askAnswer) {
        _el.askAnswer.className = 'notes-ask-answer';
        _el.askAnswer.style.borderLeftColor = 'var(--primary)';
        _el.askAnswer.textContent = answer;
        _el.askAnswer.style.display = 'block';
      }

      if (_el.askCitations && citedIds.length) {
        _el.askCitations.textContent = 'Based on notes: ' + citedIds.join(', ');
        _el.askCitations.style.display = 'block';
      }

    } catch (e) {
      if (_el.askAnswer) {
        _el.askAnswer.className = 'notes-ask-answer';
        _el.askAnswer.style.borderLeftColor = 'var(--danger)';
        _el.askAnswer.textContent = '❌ Error: ' + e.message;
        _el.askAnswer.style.display = 'block';
      }
    } finally {
      if (_el.askSpinner) _el.askSpinner.style.display = 'none';
      if (_el.askBtn)     _el.askBtn.disabled = false;
    }
  }

  async function handleSave() {
    const text = (_el.saveInput?.value || '').trim();
    if (!text) return;

    if (_el.saveBtn) _el.saveBtn.disabled = true;
    if (_el.saveStatus) _el.saveStatus.style.display = 'none';

    try {
      await saveNote(text);
      if (_el.saveInput)  _el.saveInput.value = '';
      if (_el.charCount)  _el.charCount.textContent = '0 / 2000';
      showSaveStatus('✅ Note saved!', 'ok');
    } catch (e) {
      showSaveStatus('❌ ' + e.message, 'error');
    } finally {
      if (_el.saveBtn) _el.saveBtn.disabled = false;
    }
  }

  function showSaveStatus(msg, type) {
    if (!_el.saveStatus) return;
    _el.saveStatus.textContent = msg;
    _el.saveStatus.className = 'notes-save-status ' + type;
    _el.saveStatus.style.display = 'block';
    setTimeout(() => { if (_el.saveStatus) _el.saveStatus.style.display = 'none'; }, 3000);
  }

  function handleDeleteClick(e) {
    const btn = e.target.closest('.notes-delete-btn');
    if (!btn) return;
    const id = btn.dataset.noteId;
    if (!id) return;
    if (!confirm('Delete this note?')) return;
    deleteNote(id).then(() => renderNotesList());
  }

  // ─── boot ──────────────────────────────────────────────────────────────────

  function resolveEls() {
    _el = {
      askInput:     document.getElementById('notes-ask-input'),
      askBtn:       document.getElementById('notes-ask-btn'),
      askSpinner:   document.getElementById('notes-ask-spinner'),
      askAnswer:    document.getElementById('notes-ask-answer'),
      askCitations: document.getElementById('notes-ask-citations'),
      saveInput:    document.getElementById('notes-save-input'),
      saveBtn:      document.getElementById('notes-save-btn'),
      saveStatus:   document.getElementById('notes-save-status'),
      charCount:    document.getElementById('notes-char-count'),
      list:         document.getElementById('notes-list'),
      count:        document.getElementById('notes-count'),
      statusBar:    document.getElementById('notes-status-bar'),
      tabAsk:       document.getElementById('notes-tab-ask'),
      tabSave:      document.getElementById('notes-tab-save'),
      tabList:      document.getElementById('notes-tab-list'),
    };
  }

  async function boot() {
    resolveEls();

    // Open IDB
    try {
      _db = await openDB();
    } catch (e) {
      console.error('[notes] IndexedDB open failed:', e);
      showStatusBar('❌ Notes storage unavailable: ' + e.message);
      return;
    }

    // Tabs
    if (_el.tabAsk)  _el.tabAsk.addEventListener('click',  () => switchTab('notes-tab-ask'));
    if (_el.tabSave) _el.tabSave.addEventListener('click', () => switchTab('notes-tab-save'));
    if (_el.tabList) _el.tabList.addEventListener('click', () => switchTab('notes-tab-list'));

    // Ask AI
    if (_el.askBtn)   _el.askBtn.addEventListener('click', handleAsk);
    if (_el.askInput) _el.askInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); }
    });

    // Save Note
    if (_el.saveBtn)   _el.saveBtn.addEventListener('click', handleSave);
    if (_el.saveInput) {
      _el.saveInput.addEventListener('input', () => {
        const len = (_el.saveInput.value || '').length;
        if (_el.charCount) _el.charCount.textContent = len + ' / 2000';
      });
    }

    // Note list — delete delegation
    if (_el.list) _el.list.addEventListener('click', handleDeleteClick);

    // Initial state
    updateCount();
    await embedPending();   // embed any pending notes on startup

    // Start 60s poller (no window.online event — amendment #13)
    startEmbedPoller();

    // Wrap Firebase auth watch in try/catch (amendment #14)
    try { watchAuth(); } catch (e) { console.warn('[notes] Firebase unavailable:', e.message); }

    console.log('[notes.js] Phase 6 ready.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose minimal API
  window.Notes = { saveNote, deleteNote, searchNotes, askAI, embedPending };

})();
