/**
 * modules/chat.js  —  Phase 5
 * ─────────────────────────────────────────────────────────────────────────────
 * Wires window.Parser + window.Validator + window.Planner into the
 * existing AI Chat panel in index.html.
 *
 * IDs used (all already in index.html):
 *   #ai-chat-input        text input
 *   #ai-chat-submit       Send button
 *   #ai-chat-undo         Undo button
 *   #ai-chat-spinner      "Thinking…" spinner
 *   #ai-chat-result       ✅/⚠️/❌ status line
 *   #ai-proposal-panel    proposal card container
 *   #ai-proposal-diff     diff table mount point
 *   #ai-proposal-summary  cut/moved summary line
 *   #ai-proposal-edit     Edit textarea
 *   #ai-apply-btn         Apply
 *   #ai-edit-btn          Edit
 *   #ai-cancel-btn        Cancel
 *
 * Depends on (loaded before this file):
 *   modules/planner.js   → window.Planner
 *   modules/parser.js    → window.Parser
 *   modules/validator.js → window.Validator
 *
 * Does NOT modify any existing features.
 */

(function () {
  'use strict';

  // ─── constants ─────────────────────────────────────────────────────────────

  const UNDO_KEY    = 'discipline_undo_snapshot';
  const OLLAMA_BASE = 'http://localhost:11434';

  // ─── keyword fallback table (no Ollama needed) ─────────────────────────────

  const KEYWORD_FALLBACK = [
    { test: /show\s+today/i,                                          handle: handleShowToday },
    { test: /show\s+status/i,                                         handle: handleShowStatus },
    { test: /review\s+(my\s+)?routine|what\s+should\s+i\s+improve/i, handle: handleReviewRoutine },
  ];

  // ─── state ─────────────────────────────────────────────────────────────────

  let _pendingProposal = null;   // { parsed, validation, plannerResult, description }
  let _editMode        = false;

  // ─── DOM refs (resolved after DOMContentLoaded) ────────────────────────────

  let el = {};

  function resolveEls() {
    el = {
      input:    document.getElementById('ai-chat-input'),
      submit:   document.getElementById('ai-chat-submit'),
      undo:     document.getElementById('ai-chat-undo'),
      spinner:  document.getElementById('ai-chat-spinner'),
      result:   document.getElementById('ai-chat-result'),
      proposal: document.getElementById('ai-proposal-panel'),
      diff:     document.getElementById('ai-proposal-diff'),
      summary:  document.getElementById('ai-proposal-summary'),
      editArea: document.getElementById('ai-proposal-edit'),
      applyBtn: document.getElementById('ai-apply-btn'),
      editBtn:  document.getElementById('ai-edit-btn'),
      cancelBtn:document.getElementById('ai-cancel-btn'),
    };
  }

  // ─── Ollama reachability ────────────────────────────────────────────────────

  async function isOllamaReachable() {
    try {
      const r = await fetch(OLLAMA_BASE + '/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      return r.ok;
    } catch {
      return false;
    }
  }

  // ─── UI helpers ────────────────────────────────────────────────────────────

  function showSpinner(on) {
    if (el.spinner) el.spinner.style.display = on ? 'flex' : 'none';
  }

  function showResult(html, type = 'info') {
    if (!el.result) return;
    el.result.innerHTML = html;
    el.result.className = 'ai-chat-result ai-chat-result--' + type;
    el.result.style.display = 'block';
  }

  function hideResult() {
    if (el.result) el.result.style.display = 'none';
  }

  function showProposal(on) {
    if (el.proposal) el.proposal.style.display = on ? 'block' : 'none';
  }

  function setInputDisabled(on) {
    if (el.input)  el.input.disabled  = on;
    if (el.submit) el.submit.disabled = on;
  }

  function refreshUndoButton() {
    if (!el.undo) return;
    const snap = localStorage.getItem(UNDO_KEY);
    el.undo.style.display = snap ? 'inline-flex' : 'none';
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── proposal diff renderer ────────────────────────────────────────────────

  function renderProposal(plannerResult) {
    const { proposed, cut, moved, warning } = plannerResult;

    let rows = '';
    proposed.forEach(block => {
      const wasMoved = moved.find(m => m.id === block.id);
      const wasCut   = cut.includes(block.title) || cut.includes(block.id);
      let badge = '', rowClass = '';

      if (wasCut) {
        badge    = '<span class="diff-badge diff-badge--cut">cut</span>';
        rowClass = 'diff-row--cut';
      } else if (wasMoved) {
        badge    = '<span class="diff-badge diff-badge--moved">moved</span>';
        rowClass = 'diff-row--moved';
      } else {
        badge = '<span class="diff-badge diff-badge--ok">ok</span>';
      }

      const oldSlot = wasMoved
        ? (wasMoved.oldStart + '–' + wasMoved.oldEnd)
        : (block.start + '–' + block.end);
      const newSlot = block.start + '–' + block.end;

      rows += `<tr class="${rowClass}">
        <td class="diff-item">${escHtml(block.title)}</td>
        <td class="diff-slot">${escHtml(oldSlot)}</td>
        <td class="diff-slot">${escHtml(newSlot)}</td>
        <td class="diff-status">${badge}</td>
      </tr>`;
    });

    if (el.diff) {
      el.diff.innerHTML = `
        <table class="diff-table">
          <thead><tr><th>Item</th><th>Old slot</th><th>New slot</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    }

    const parts = [];
    if (cut.length)             parts.push('✂️ Cut: ' + cut.join(', '));
    if (moved.length)           parts.push('↕️ Moved: ' + moved.map(m => m.title).join(', '));
    if (warning && warning.length) parts.push('⚠️ ' + warning.join('; '));
    if (el.summary) {
      el.summary.innerHTML = parts.length
        ? '<small>' + parts.map(escHtml).join(' &nbsp;·&nbsp; ') + '</small>'
        : '';
    }
  }

  // ─── undo ──────────────────────────────────────────────────────────────────

  function saveUndoSnapshot(timetable, description) {
    const snap = {
      timestamp:   new Date().toISOString(),
      timetable:   JSON.parse(JSON.stringify(timetable)),
      description,
    };
    localStorage.setItem(UNDO_KEY, JSON.stringify(snap));
    refreshUndoButton();
  }

  function applyUndo() {
    const raw = localStorage.getItem(UNDO_KEY);
    if (!raw) return;
    try {
      const snap = JSON.parse(raw);
      localStorage.removeItem(UNDO_KEY);
      refreshUndoButton();
      // Broadcast so any listener can restore the timetable state
      window.dispatchEvent(new CustomEvent('ai-timetable-undo', { detail: snap }));
      showResult('↩️ Undone: "' + escHtml(snap.description) + '"', 'success');
    } catch {
      showResult('❌ Undo data corrupted.', 'error');
    }
  }

  // ─── apply ─────────────────────────────────────────────────────────────────

  async function applyChange() {
    if (!_pendingProposal) return;
    const { plannerResult, description } = _pendingProposal;

    // Snapshot current timetable before applying
    try {
      const data = await window.Planner._loadData();
      saveUndoSnapshot(data.timetable, description);
    } catch (e) {
      console.warn('[chat] undo snapshot failed:', e);
    }

    window.dispatchEvent(new CustomEvent('ai-timetable-applied', {
      detail: { proposed: plannerResult.proposed, plannerResult },
    }));

    showProposal(false);
    hideResult();
    showResult('✅ Applied! Timetable updated.', 'success');
    refreshUndoButton();
    _pendingProposal = null;
    if (el.editArea) el.editArea.style.display = 'none';
  }

  // ─── keyword fallback handlers ─────────────────────────────────────────────

  async function handleShowToday() {
    try {
      const today  = new Date().toISOString().slice(0, 10);
      const blocks = await window.Planner.buildToday(today);
      const rows   = blocks.map(b =>
        `<tr><td>${escHtml(b.start)}–${escHtml(b.end)}</td><td>${escHtml(b.title)}</td></tr>`
      ).join('');
      showResult(`<strong>Today's plan</strong>
        <table class="diff-table" style="margin-top:8px">
          <thead><tr><th>Time</th><th>Block</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`, 'info');
    } catch (e) {
      showResult('❌ Could not load today\'s plan: ' + escHtml(e.message), 'error');
    }
  }

  async function handleShowStatus() {
    try {
      const finish = await window.Planner.projectFinish();
      const behind = await window.Planner.daysBehind();
      const behindTxt = behind > 0 ? '⚠️ ' + behind + ' day(s) behind' : '✅ On track';
      showResult(
        '<strong>Project finish:</strong> ' + escHtml(String(finish)) +
        ' &nbsp;|&nbsp; ' + behindTxt,
        behind > 0 ? 'warn' : 'success'
      );
    } catch (e) {
      showResult('❌ Could not compute status: ' + escHtml(e.message), 'error');
    }
  }

  async function handleReviewRoutine() {
    if (window.Insights && typeof window.Insights.analyze === 'function') {
      try {
        const result = await window.Insights.analyze();
        window.dispatchEvent(new CustomEvent('ai-show-insights', { detail: result }));
        showResult('📊 Routine review ready — see findings above.', 'info');
      } catch (e) {
        showResult('❌ Insights error: ' + escHtml(e.message), 'error');
      }
    } else {
      showResult('📊 Routine review module not loaded yet.', 'warn');
    }
  }

  // ─── main send handler ─────────────────────────────────────────────────────

  async function handleSend() {
    const text = (el.input?.value || '').trim();
    if (!text) return;

    hideResult();
    showProposal(false);
    showSpinner(true);
    setInputDisabled(true);
    _editMode = false;
    if (el.editArea) el.editArea.style.display = 'none';

    try {
      // 1. Keyword fallback — works offline
      for (const kw of KEYWORD_FALLBACK) {
        if (kw.test.test(text)) {
          await kw.handle();
          return;
        }
      }

      // 2. Check Ollama
      const online = await isOllamaReachable();
      if (!online) {
        showResult('⚠️ AI offline — keyword commands still work.', 'warn');
        return;
      }

      // 3. Parse
      let parsed;
      try {
        parsed = await window.Parser.parseMessage(text);
      } catch {
        showResult('⚠️ AI offline — keyword commands still work.', 'warn');
        return;
      }

      // 4. Validate
      const validation = await window.Validator.validate(parsed);
      if (!validation.ok) {
        showResult(validation.label + ' ' + escHtml(validation.errors.join(' ')), 'error');
        return;
      }

      // Show-only intents
      if (parsed.type === 'show_today')    { await handleShowToday();    return; }
      if (parsed.type === 'show_status')   { await handleShowStatus();   return; }
      if (parsed.type === 'review_routine'){ await handleReviewRoutine();return; }

      // mark_done / skip_day
      if (parsed.type === 'mark_done' || parsed.type === 'skip_day') {
        window.dispatchEvent(new CustomEvent('ai-intent', { detail: { parsed, validation } }));
        const msg = parsed.type === 'mark_done'
          ? 'Marked "' + (validation.item?.title || validation.item?.id) + '" as done.'
          : 'Skipping ' + validation.date + '.';
        showResult(validation.label + ' ' + escHtml(msg), 'success');
        return;
      }

      // 5. add_event → propose change
      if (parsed.type === 'add_event') {
        let plannerResult;
        try {
          plannerResult = await window.Planner.proposeChange({
            start: validation.start,
            end:   validation.end,
            title: parsed.item_text || 'Event',
          });
        } catch (e) {
          showResult('❌ Planner error: ' + escHtml(e.message), 'error');
          return;
        }

        _pendingProposal = { parsed, validation, plannerResult, description: text };
        renderProposal(plannerResult);

        const confType = parsed.confidence === 'medium' ? 'warn' : 'info';
        const confMsg  = parsed.confidence === 'medium'
          ? validation.label + ' Please confirm this is what you meant.'
          : validation.label + ' Proposal ready.';
        showResult(confMsg, confType);
        showProposal(true);
        return;
      }

      showResult('❓ I\'m not sure what to do with that. Try rephrasing.', 'warn');

    } finally {
      showSpinner(false);
      setInputDisabled(false);
      if (el.input) el.input.value = '';
    }
  }

  // ─── proposal buttons ──────────────────────────────────────────────────────

  function handleApply() {
    applyChange().catch(e => showResult('❌ Apply failed: ' + escHtml(e.message), 'error'));
  }

  function handleEdit() {
    if (!_pendingProposal) return;
    if (el.input) el.input.value = _pendingProposal.description || '';
    if (el.editArea) {
      el.editArea.style.display = 'block';
      el.editArea.value = _pendingProposal.description || '';
      el.editArea.focus();
    }
    showProposal(false);
    hideResult();
    _editMode = true;
  }

  function handleCancel() {
    showProposal(false);
    showResult('Cancelled.', 'info');
    _pendingProposal = null;
    _editMode = false;
    if (el.editArea) el.editArea.style.display = 'none';
  }

  // ─── boot ──────────────────────────────────────────────────────────────────

  function boot() {
    resolveEls();

    if (!el.input || !el.submit) {
      console.warn('[chat.js] Chat DOM elements not found — chat disabled.');
      return;
    }

    el.submit.addEventListener('click', handleSend);
    el.input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    if (el.applyBtn)  el.applyBtn.addEventListener('click', handleApply);
    if (el.editBtn)   el.editBtn.addEventListener('click',  handleEdit);
    if (el.cancelBtn) el.cancelBtn.addEventListener('click', handleCancel);
    if (el.undo)      el.undo.addEventListener('click',     applyUndo);

    refreshUndoButton();
    console.log('[chat.js] Phase 5 ready.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose minimal API for other modules
  window.Chat = { showResult, showProposal, renderProposal, saveUndoSnapshot };

})();
