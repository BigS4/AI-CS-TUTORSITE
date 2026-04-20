/* =============================================================
   AI CS Tutor — v2 Main JS
   See WEEK2_VISION.md for the architecture & QA-fix mapping.
   Closes QA: C1 (CSS), H1 (CSS+ResizeObserver), H2, H3, M2, M3,
              M4, L1, L2, L3, L4, L5
   ============================================================= */
(() => {
  'use strict';

  /* ============================================================
     0. UTILITIES — escape, toast, debounce
     ============================================================ */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Strict text → HTML escape. Used everywhere user/dynamic data touches the DOM.
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  function toast(msg, kind = 'info', ms = 2600) {
    const stack = $('#toastStack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast-' + kind : '');
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 220ms';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 240);
    }, ms);
  }

  /* ============================================================
     1. CLOCK (topbar)
     ============================================================ */
  function startClock() {
    const el = $('#topbarClock');
    if (!el) return;
    const tick = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      el.textContent = `${hh}:${mm}`;
    };
    tick();
    setInterval(tick, 30 * 1000);
  }

  /* ============================================================
     2. SIDEBAR + PANE ROUTER
     ============================================================ */
  const Router = (() => {
    const sideButtons = $$('.side-btn[data-target]');
    const panes = $$('.pane[data-pane]');
    const crumb = $('#crumbSurface');

    const labels = {
      sandbox: 'סנדבוקס',
      lesson: 'שיעור',
      chat: 'AI Tutor',
      'console-full': 'קונסולה',
    };

    function go(target) {
      sideButtons.forEach(b => b.classList.toggle('is-active', b.dataset.target === target));
      panes.forEach(p => {
        const active = p.dataset.pane === target;
        p.classList.toggle('is-active', active);
        if (active) p.removeAttribute('hidden');
        else p.setAttribute('hidden', '');
      });
      if (crumb && labels[target]) crumb.textContent = labels[target];
      if (target === 'console-full') ConsoleLog.renderFull();
      if (target === 'sandbox') Sandbox.relayoutSoon();
    }

    sideButtons.forEach(b => b.addEventListener('click', () => go(b.dataset.target)));
    return { go };
  })();

  /* ============================================================
     3. CODE-MIRROR DOCUMENT MODEL
     A "document" is a list of lines, each with text + optional comment.
     We tokenize via small regexes — manual span-class highlighting,
     no library. Safe by construction: every line is authored here.
     ============================================================ */
  const CodeMirror = (() => {
    const cmCode = $('#cmCode');
    const tabs   = $$('.cm-tab');
    let view = 'csharp';

    // documents[view] = array of { csharp:[lines], pseudo:[lines] }
    let doc = { csharp: [], pseudo: [] };

    function setView(v) {
      view = v;
      tabs.forEach(t => {
        const active = t.dataset.view === v;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      render();
    }
    tabs.forEach(t => t.addEventListener('click', () => setView(t.dataset.view)));

    // Manual tokenizer for our limited C# vocabulary.
    // We only ever emit lines we authored, so this is a closed-set tokenizer,
    // not a general-purpose lexer. Whitespace-preserving.
    const KEYWORDS = ['Node', 'new', 'null', 'while', 'if', 'else', 'return', 'class', 'public', 'private', 'void', 'int'];
    const TYPES    = ['Node', 'int', 'string', 'bool'];
    function highlight(line) {
      // Comment first
      const cmtIdx = line.indexOf('//');
      let codePart = line, cmtPart = '';
      if (cmtIdx >= 0) {
        codePart = line.slice(0, cmtIdx);
        cmtPart  = line.slice(cmtIdx);
      }
      // Tokenize codePart preserving whitespace
      const parts = codePart.split(/(\s+|[(){};,.=<>!+\-*\/])/g);
      const out = parts.map(tok => {
        if (tok === '' || /^\s+$/.test(tok)) return escapeHtml(tok);
        if (/^[(){};,]$/.test(tok)) return `<span class="syn-punct">${escapeHtml(tok)}</span>`;
        if (/^[=<>!+\-*\/.]$/.test(tok)) return `<span class="syn-punct">${escapeHtml(tok)}</span>`;
        if (KEYWORDS.includes(tok))      return `<span class="syn-keyword">${escapeHtml(tok)}</span>`;
        if (TYPES.includes(tok))         return `<span class="syn-type">${escapeHtml(tok)}</span>`;
        if (/^-?\d+(\.\d+)?$/.test(tok)) return `<span class="syn-number">${escapeHtml(tok)}</span>`;
        if (/^"[^"]*"$/.test(tok))       return `<span class="syn-string">${escapeHtml(tok)}</span>`;
        return `<span class="syn-ident">${escapeHtml(tok)}</span>`;
      }).join('');
      const cmt = cmtPart ? `<span class="syn-comment">${escapeHtml(cmtPart)}</span>` : '';
      return out + cmt;
    }

    function render() {
      const lines = doc[view];
      if (!lines || lines.length === 0) {
        cmCode.innerHTML =
          `<span class="cm-line"><span class="syn-comment">// הקוד מתעדכן בזמן אמת עם כל פעולה בסנדבוקס.</span></span>` +
          `<span class="cm-line"><span class="syn-comment">// לחצו "אתחל HEAD" או הקישו H כדי להתחיל.</span></span>`;
        return;
      }
      const html = lines.map(line => {
        if (view === 'csharp') {
          return `<span class="cm-line">${highlight(line)}</span>`;
        }
        // Pseudo view: comment-only lines, RTL-friendly
        return `<span class="cm-line"><span class="syn-comment">${escapeHtml(line)}</span></span>`;
      }).join('');
      cmCode.innerHTML = html;
      // Auto-scroll to bottom on new emission
      cmCode.scrollTop = cmCode.scrollHeight;
    }

    function setDoc(newDoc) {
      doc = newDoc;
      render();
    }

    function clearDoc() {
      doc = { csharp: [], pseudo: [] };
      render();
    }

    // Collapse/expand
    const collapseBtn = $('#cmCollapse');
    const bodyGrid    = $('.body-grid');
    collapseBtn.addEventListener('click', () => {
      bodyGrid.classList.toggle('cm-collapsed');
      // Once expanded again, ensure render is fresh
      render();
      Sandbox.relayoutSoon();
    });

    // Initial empty render
    render();

    return { setDoc, clearDoc, render };
  })();

  /* ============================================================
     4. CONSOLE LOG
     Two surfaces: dock at the bottom, and a full-pane mirror.
     Every state mutation appends here.
     ============================================================ */
  const ConsoleLog = (() => {
    const dock     = $('#consoleDock');
    const body     = $('#consoleBody');
    const fullEl   = $('#consoleFullMirror');
    const btnClear = $('#btnClearConsole');
    const btnTog   = $('#btnToggleConsole');
    const lines = [];

    function push({ prompt = '>', text, comment = '', kind = '' } = {}) {
      lines.push({ prompt, text, comment, kind, ts: Date.now() });
      appendTo(body, lines.length - 1);
      if (!fullEl.hasAttribute('hidden') || fullEl.children.length > 0) {
        appendTo(fullEl, lines.length - 1);
      }
    }
    function appendTo(host, idx) {
      const ln = lines[idx];
      const el = document.createElement('div');
      el.className = 'console-line' + (ln.kind ? ' console-line-' + ln.kind : '');
      el.innerHTML =
        `<span class="c-prompt">${escapeHtml(ln.prompt)}</span>` +
        `<span class="c-text">${escapeHtml(ln.text)}` +
        (ln.comment ? ` <span class="c-comment">// ${escapeHtml(ln.comment)}</span>` : '') +
        `</span>`;
      host.appendChild(el);
      host.scrollTop = host.scrollHeight;
    }
    function clearAll() {
      lines.length = 0;
      body.innerHTML = '';
      fullEl.innerHTML = '';
      push({ prompt: '>', text: 'console cleared.', kind: 'system' });
    }
    function renderFull() {
      fullEl.innerHTML = '';
      lines.forEach((_, i) => appendTo(fullEl, i));
    }
    function toggle() {
      const collapsed = dock.classList.toggle('is-collapsed');
      btnTog.textContent = collapsed ? '▲' : '▼';
      btnTog.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }
    btnClear.addEventListener('click', clearAll);
    btnTog.addEventListener('click', toggle);

    return { push, clearAll, renderFull };
  })();

  /* ============================================================
     5. STATUS BAR
     ============================================================ */
  const StatusBar = (() => {
    const led      = $('#statusLed');
    const mode     = $('#statusMode');
    const snapshot = $('#statusSnapshot');
    const count    = $('#statusCount');
    const errs     = $('#statusErrors');
    const errsWrap = errs.closest('.status-errors');

    function setMode(m, working = false) {
      mode.textContent = m;
      led.classList.toggle('is-working', working);
    }
    function setSnapshot(items) {
      // items already excludes head/null wrappers? — we receive the full items array
      const nodes = items.filter(i => i.kind === 'node');
      if (items.length === 0 || (nodes.length === 0 && items.length === 0)) {
        snapshot.textContent = 'רשימה ריקה';
        count.textContent = '0 צמתים';
        return;
      }
      const chain = ['HEAD', ...nodes.map(n => n.value), 'NULL'].join(' → ');
      snapshot.textContent = chain;
      count.textContent = `${nodes.length} צמתים`;
    }
    function setErrors(n) {
      errs.textContent = n;
      errsWrap.classList.toggle('has-errors', n > 0);
    }
    return { setMode, setSnapshot, setErrors };
  })();

  /* ============================================================
     6. SANDBOX (state engine + view + code-mirror + status emission)
     ============================================================ */
  const Sandbox = (() => {
    const board    = $('#sandbox-board');
    const nodesEl  = $('#sandbox-nodes');
    const arrowsEl = $('#sandbox-arrows');
    const valueIn  = $('#node-value-input');
    const btnInit  = $('#btn-init-head');
    const btnAdd   = $('#btn-add-node');
    const btnClear = $('#btn-clear-board');
    const empty    = $('#sandbox-empty');

    // Layout constants
    const ROW_Y   = 70;
    const START_X = 30;
    const GAP     = 60;
    const BLOCK_W = 120;

    /* ------ State ------ */
    let initialized = false;
    let items = []; // [{ id, kind: 'head'|'node'|'null', value?, x, y, el, dragged? }]
    let nextId = 1;
    let focusedNodeId = null;
    let errorCount = 0;

    const uid = () => nextId++;

    /* ------ Code-Mirror emission ------
       Every action regenerates the *full* visible doc from scratch.
       This is correct (renders match state) and cheap (≤ a few dozen lines). */
    function regenerateCode() {
      const csharp = [];
      const pseudo = [];

      if (!initialized) {
        CodeMirror.setDoc({ csharp, pseudo });
        return;
      }

      csharp.push('// LinkedList — בנוי בזמן אמת מהפעולות שלך');
      csharp.push('Node head = null;');
      pseudo.push('אתחל HEAD ל-null');

      const nodes = items.filter(i => i.kind === 'node');
      if (nodes.length > 0) {
        csharp.push('');
        csharp.push('// בניית הרשימה');
      }
      nodes.forEach((n, i) => {
        const v = formatValue(n.value);
        if (i === 0) {
          csharp.push(`head = new Node(${v});`);
          pseudo.push(`head ← צומת חדש עם הערך ${n.value}`);
        } else {
          csharp.push(`Node n${i} = head;`);
          csharp.push(`while (n${i}.next != null) n${i} = n${i}.next;`);
          csharp.push(`n${i}.next = new Node(${v});`);
          pseudo.push(`הלך עד סוף הרשימה`);
          pseudo.push(`חבר צומת חדש בערך ${n.value}`);
        }
      });

      CodeMirror.setDoc({ csharp, pseudo });
    }

    function formatValue(v) {
      // numeric → bare; else quoted string
      return /^-?\d+(\.\d+)?$/.test(String(v)) ? v : `"${String(v).replace(/"/g, '\\"')}"`;
    }

    /* ------ DOM rendering ------ */
    function setEmptyVisible(show) {
      board.classList.toggle('has-content', !show);
    }

    function createBlockEl(item) {
      const el = document.createElement('div');
      el.className = 'll-block';
      el.dataset.id = item.id;
      el.style.left = item.x + 'px';
      el.style.top  = item.y + 'px';
      el.tabIndex = 0;

      if (item.kind === 'head') {
        el.classList.add('ll-head');
        el.innerHTML = 'HEAD<span class="head-cursor">_</span>';
        el.setAttribute('aria-label', 'HEAD');
      } else if (item.kind === 'null') {
        el.classList.add('ll-null');
        el.textContent = '<NULL>';
        el.setAttribute('aria-label', 'NULL');
      } else if (item.kind === 'node') {
        el.classList.add('ll-node');
        // QA L1: removed redundant el.style.position assignment
        const dataCell = document.createElement('div');
        dataCell.className = 'cell cell-data';
        dataCell.textContent = item.value;
        const nextCell = document.createElement('div');
        nextCell.className = 'cell cell-next';
        nextCell.setAttribute('aria-label', 'next pointer');
        el.appendChild(dataCell);
        el.appendChild(nextCell);
        el.setAttribute('aria-label', `Node ערך ${item.value}`);

        // Delete button — QA L3 adds aria-label
        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.type = 'button';
        del.title = 'מחק צומת';
        del.setAttribute('aria-label', `מחק צומת בערך ${item.value}`);
        del.textContent = '×';
        del.addEventListener('click', (ev) => {
          ev.stopPropagation();
          deleteNode(item.id);
        });
        el.appendChild(del);

        el.addEventListener('focus', () => { focusedNodeId = item.id; });
        el.addEventListener('blur',  () => { if (focusedNodeId === item.id) focusedNodeId = null; });
      }

      attachDrag(el, item);
      nodesEl.appendChild(el);
      return el;
    }

    function defaultPositionFor(index) {
      // QA L5 fix: getBoundingClientRect, fallback to a sensible default
      const rect = board.getBoundingClientRect();
      const boardW = Math.max(rect.width - 40, 320);
      const perRow = Math.max(1, Math.floor(boardW / (BLOCK_W + GAP)));
      const row = Math.floor(index / perRow);
      const col = index % perRow;
      return {
        x: START_X + col * (BLOCK_W + GAP),
        y: ROW_Y + row * 110,
      };
    }

    function relayout() {
      items.forEach((it, i) => {
        if (!it.dragged) {
          const pos = defaultPositionFor(i);
          it.x = pos.x;
          it.y = pos.y;
          if (it.el) {
            it.el.style.left = it.x + 'px';
            it.el.style.top  = it.y + 'px';
          }
        }
      });
      // QA H1 fix: grow board to contain the bottom-most block
      let maxY = 380;
      items.forEach(it => {
        const h = (it.el && it.el.offsetHeight) || 60;
        maxY = Math.max(maxY, it.y + h + 32);
      });
      board.style.minHeight = maxY + 'px';
    }

    // For external consumers (router, resize) — coalesces frame-by-frame
    let _relayoutScheduled = false;
    function relayoutSoon() {
      if (_relayoutScheduled) return;
      _relayoutScheduled = true;
      requestAnimationFrame(() => {
        _relayoutScheduled = false;
        relayout();
        drawArrows();
      });
    }

    /* ------ SVG arrows ------ */
    function clearArrows() {
      Array.from(arrowsEl.querySelectorAll('line.arrow,path.arrow')).forEach(n => n.remove());
    }

    function drawArrows() {
      clearArrows();
      const rect = board.getBoundingClientRect();
      arrowsEl.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
      arrowsEl.setAttribute('width',  rect.width);
      arrowsEl.setAttribute('height', rect.height);

      for (let i = 0; i < items.length - 1; i++) {
        const a = items[i], b = items[i + 1];
        if (!a.el || !b.el) continue;

        const aR = a.el.getBoundingClientRect();
        const bR = b.el.getBoundingClientRect();

        const aCx = aR.left + aR.width  / 2 - rect.left;
        const aCy = aR.top  + aR.height / 2 - rect.top;
        const bCx = bR.left + bR.width  / 2 - rect.left;
        const bCy = bR.top  + bR.height / 2 - rect.top;

        const dx = bCx - aCx, dy = bCy - aCy;
        const len = Math.max(1, Math.hypot(dx, dy));
        const ux = dx / len, uy = dy / len;

        const aHalf = Math.min(aR.width, aR.height) / 2;
        const bHalf = Math.min(bR.width, bR.height) / 2;

        const startX = aCx + ux * aHalf * 1.05;
        const startY = aCy + uy * aHalf * 1.05;
        const endX   = bCx - ux * bHalf * 1.15;
        const endY   = bCy - uy * bHalf * 1.15;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'arrow');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', endX);
        line.setAttribute('y2', endY);
        line.setAttribute('stroke', '#00d4ff');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        // Flow → null gets a dashed style for terminal vibe
        if (b.kind === 'null') line.setAttribute('stroke-dasharray', '6 4');
        arrowsEl.appendChild(line);
      }
    }

    /* ------ Render ------ */
    function render() {
      const presentIds = new Set(items.map(i => i.id));
      Array.from(nodesEl.children).forEach(child => {
        if (!presentIds.has(Number(child.dataset.id))) child.remove();
      });
      items.forEach(it => {
        if (!it.el || !nodesEl.contains(it.el)) {
          it.el = createBlockEl(it);
        } else {
          it.el.style.left = it.x + 'px';
          it.el.style.top  = it.y + 'px';
        }
      });
      setEmptyVisible(items.length === 0);
      requestAnimationFrame(drawArrows);
    }

    /* ------ Operations ------ */
    function initHead() {
      items.forEach(it => it.el && it.el.remove());
      items = [];
      nextId = 1;
      initialized = true;
      items.push({ id: uid(), kind: 'head' });
      items.push({ id: uid(), kind: 'null' });
      relayout();
      render();
      regenerateCode();
      StatusBar.setMode('READY');
      StatusBar.setSnapshot(items);
      ConsoleLog.push({ prompt: '>', text: 'initHead()', comment: 'HEAD = null' });
      Tutorial.notify('init');
    }

    function addNode(rawValue) {
      // QA M3 fix: don't silently init — guide the student
      if (!initialized) {
        toast('לחצו תחילה "אתחל HEAD" (או הקישו H)', 'warn');
        ConsoleLog.push({ prompt: '!', text: 'addNode rejected — HEAD not initialized', kind: 'error' });
        flashInput();
        return;
      }
      const value = (rawValue == null ? '' : String(rawValue)).trim();
      if (value === '') {
        flashInput();
        ConsoleLog.push({ prompt: '!', text: 'addNode rejected — empty value', kind: 'error' });
        return;
      }
      const nullIdx = items.findIndex(i => i.kind === 'null');
      const insertAt = nullIdx === -1 ? items.length : nullIdx;
      const newNode = { id: uid(), kind: 'node', value };
      items.splice(insertAt, 0, newNode);
      relayout();
      render();
      regenerateCode();
      StatusBar.setSnapshot(items);
      ConsoleLog.push({
        prompt: '>',
        text: `addNode(${formatValue(value)})`,
        comment: snapshotChain(),
      });
      Tutorial.notify('add');
    }

    function deleteNode(id) {
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) return;
      const it = items[idx];
      if (it.kind !== 'node') return;
      const v = it.value;
      if (it.el) it.el.remove();
      items.splice(idx, 1);
      relayout();
      render();
      regenerateCode();
      StatusBar.setSnapshot(items);
      ConsoleLog.push({
        prompt: '>',
        text: `deleteNode(${formatValue(v)})`,
        comment: 'relinked: ' + snapshotChain(),
      });
      Tutorial.notify('delete');
    }

    function deleteFocused() {
      if (focusedNodeId == null) {
        toast('מקדו על צומת (Tab) ואז לחצו D', 'info');
        return;
      }
      deleteNode(focusedNodeId);
    }

    function clearBoard() {
      items.forEach(it => it.el && it.el.remove());
      items = [];
      initialized = false;
      board.style.minHeight = '380px';
      clearArrows();
      setEmptyVisible(true);
      CodeMirror.clearDoc();
      StatusBar.setMode('READY');
      StatusBar.setSnapshot([]);
      ConsoleLog.push({ prompt: '>', text: 'clearBoard()', comment: 'head = null' });
    }

    function snapshotChain() {
      const nodes = items.filter(i => i.kind === 'node');
      if (nodes.length === 0) return 'HEAD → NULL';
      return ['HEAD', ...nodes.map(n => n.value), 'NULL'].join(' → ');
    }

    function flashInput() {
      const prev = valueIn.style.borderColor;
      valueIn.style.borderColor = '#ff4d6d';
      setTimeout(() => { valueIn.style.borderColor = prev; }, 380);
      valueIn.focus();
    }

    /* ------ Drag & drop ------ */
    function attachDrag(el, item) {
      let dragging = false;
      let startX = 0, startY = 0, origX = 0, origY = 0;

      const onPointerDown = (e) => {
        if (e.target.classList && e.target.classList.contains('delete-btn')) return;
        dragging = true;
        el.classList.add('dragging');
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
        startX = e.clientX; startY = e.clientY;
        origX = item.x; origY = item.y;
        StatusBar.setMode('DRAGGING', true);
      };
      const onPointerMove = (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        const rect = board.getBoundingClientRect();
        let newX = Math.max(0, Math.min(origX + dx, rect.width  - el.offsetWidth));
        let newY = Math.max(0, Math.min(origY + dy, rect.height - el.offsetHeight));
        item.x = newX; item.y = newY; item.dragged = true;
        el.style.left = newX + 'px';
        el.style.top  = newY + 'px';
        drawArrows();
      };
      const onPointerUp = (e) => {
        if (!dragging) return;
        dragging = false;
        el.classList.remove('dragging');
        try { el.releasePointerCapture(e.pointerId); } catch (_) {}
        StatusBar.setMode('READY');
      };
      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('pointermove', onPointerMove);
      el.addEventListener('pointerup',   onPointerUp);
      el.addEventListener('pointercancel', onPointerUp);
    }

    /* ------ Wire toolbar ------ */
    btnInit.addEventListener('click', initHead);
    btnAdd.addEventListener('click', () => {
      addNode(valueIn.value);
      valueIn.value = '';
      valueIn.focus();
    });
    valueIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        addNode(valueIn.value);
        valueIn.value = '';
      }
    });
    btnClear.addEventListener('click', clearBoard);

    /* ------ Resize: debounced + ResizeObserver (QA H3 + L5) ------ */
    const resize = debounce(() => { relayout(); drawArrows(); }, 120);
    window.addEventListener('resize', resize);
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => relayoutSoon());
      ro.observe(board);
    }

    // Initial empty state — defer to next frame so layout is real
    requestAnimationFrame(() => {
      setEmptyVisible(true);
      StatusBar.setSnapshot([]);
    });

    return {
      initHead, addNode, deleteFocused, clearBoard,
      relayoutSoon,
      focusValueInput: () => valueIn.focus(),
      hasFocusedNode: () => focusedNodeId != null,
      isInitialized: () => initialized,
    };
  })();

  /* ============================================================
     7. CHAT — Hebrew-aware, hardened innerHTML
     QA H2 (Hebrew aliases) + M2 (hardened) + M4 (Hebrew typing) + L2 (no inline onclick)
     ============================================================ */
  const Chat = (() => {
    // English-keyed canonical responses (HTML allowed because authored by us)
    const responses = {
      'binary search': `<strong>חיפוש בינארי</strong> הוא אלגוריתם יעיל למציאת ערך ברשימה <em>ממוינת</em>.<br><br>
        במקום לבדוק כל איבר, חוצים את הרשימה לחצי בכל שלב:<br>
        1. בודקים את האיבר האמצעי<br>
        2. אם זה הערך → סיימנו ✅<br>
        3. אם הערך קטן יותר → מחפשים בחצי השמאלי<br>
        4. אם גדול יותר → בחצי הימני<br><br>
        <strong>סיבוכיות זמן: O(log n)</strong> — מהיר מאוד.`,
      'big o': `<strong>סימון Big O</strong> מתאר כמה זמן (או זיכרון) אלגוריתם דורש כאשר הקלט גדל.<br><br>
        • <code>O(1)</code> — קבוע (גישה למערך לפי אינדקס)<br>
        • <code>O(n)</code> — לינארי (לולאה אחת על כל הקלט)<br>
        • <code>O(n²)</code> — ריבועי (שתי לולאות מקוננות)<br>
        • <code>O(log n)</code> — לוגריתמי (חיפוש בינארי)<br><br>
        תחשבו על זה כך: "אם הקלט יגדל פי 10 — פי כמה זה יהיה איטי יותר?"`,
      'recursion': `<strong>רקורסיה</strong> היא כשפונקציה קוראת ל<em>עצמה</em> כדי לפתור גרסה קטנה יותר של אותה בעיה.<br><br>
        דוגמה — עצרת:<br>
        <code>factorial(5) = 5 × factorial(4)</code><br>
        <code>factorial(4) = 4 × factorial(3)</code> ... עד <code>factorial(1) = 1</code>.<br><br>
        כל פונקציה רקורסיבית צריכה:<br>
        1. <strong>מקרה בסיס</strong> — תנאי שעוצר את הרקורסיה<br>
        2. <strong>מקרה רקורסיבי</strong> — קריאה עצמית עם קלט קטן יותר.<br><br>
        בלי מקרה בסיס — Stack Overflow!`,
      'array': `<strong>מערך</strong> הוא אחד ממבני הנתונים הבסיסיים ביותר.<br><br>
        אוסף איברים בסדר קבוע, בגודל קבוע.<br>
        • לכל איבר יש <strong>אינדקס</strong> שמתחיל ב-0<br>
        • גישה לאיבר היא <code>O(1)</code><br>
        • הוספה/מחיקה באמצע היא <code>O(n)</code><br><br>
        דוגמה: <code>["Alice", "Bob", "Charlie"]</code><br>
        אינדקסים: <code>[0, 1, 2]</code>`,
      'linked list': `<strong>רשימה מקושרת</strong> בנויה מ<em>צמתים</em>, שכל אחד מהם מכיל:<br>
        • ערך<br>
        • מצביע (<code>next</code>) לצומת הבא<br><br>
        בניגוד למערך, הצמתים אינם בזיכרון רציף — מצביעים מחברים אותם.<br><br>
        <strong>יתרונות מול מערך:</strong> ✅ הוספה/מחיקה בתחילת הרשימה ב-<code>O(1)</code><br>
        <strong>חסרונות:</strong> ❌ גישה לפי אינדקס ב-<code>O(n)</code> — חייבים ללכת מ-HEAD<br><br>
        טוב ל: תורים, מחסניות, הוספות בקצוות.`,
      'variable': `<strong>משתנה</strong> הוא תיבה עם תווית שמאחסנת ערך בתוכנית.<br><br>
        כשכותבים <code>int age = 21;</code> אנחנו יוצרים תיבה בשם <code>age</code> ושמים בה 21.<br><br>
        אפשר לקרוא: <code>Console.WriteLine(age);</code> → מדפיס 21.<br>
        אפשר לעדכן: <code>age = 22;</code> → התיבה מחזיקה עכשיו 22.<br><br>
        משתנים יכולים להחזיק טיפוסים שונים: <code>int</code>, <code>string</code>, <code>bool</code>, ועוד.`,
    };

    // Hebrew → English alias map (QA H2)
    const hebrewAlias = {
      'רשימה מקושרת': 'linked list',
      'רשימות מקושרות': 'linked list',
      'מקושרת': 'linked list',
      'חיפוש בינארי': 'binary search',
      'בינארי': 'binary search',
      'רקורסיה': 'recursion',
      'רקורסיבי': 'recursion',
      'מערך': 'array',
      'מערכים': 'array',
      'big o': 'big o',
      'סיבוכיות': 'big o',
      'סיבוכיות זמן': 'big o',
      'משתנה': 'variable',
      'משתנים': 'variable',
    };

    const defaultReply = `שאלה מצוינת! זוהי גרסת דמו של ה-AI Tutor. נסו לשאול על:
      <strong>רשימה מקושרת</strong>, <strong>חיפוש בינארי</strong>, <strong>רקורסיה</strong>, <strong>מערך</strong>,
      <strong>סיבוכיות (Big O)</strong> או <strong>משתנה</strong>.<br><br>
      בגרסה המלאה ה-AI יענה לכל שאלה. 🚀`;

    function lookup(text) {
      const lower = text.toLowerCase();
      // 1. English keys (still supported)
      for (const k of Object.keys(responses)) {
        if (lower.includes(k)) return responses[k];
      }
      // 2. Hebrew alias map (no toLowerCase — Hebrew is case-less)
      for (const heb of Object.keys(hebrewAlias)) {
        if (text.includes(heb)) return responses[hebrewAlias[heb]];
      }
      return defaultReply;
    }

    // QA M2: setReply helper documents the trust boundary.
    // Only static authored HTML from `responses` / `defaultReply` is
    // ever passed here. User text is never piped through `innerHTML`.
    function setReply(node, html) {
      // SAFE: html is one of the authored constants above.
      node.innerHTML = `<span class="msg-prompt">AI&gt;</span> ${html}`;
    }

    function send() {
      const input = $('#userInput');
      const messages = $('#chatMessages');
      const text = input.value.trim();
      if (!text) return;

      const userBubble = document.createElement('div');
      userBubble.className = 'message user-message';
      userBubble.textContent = text; // QA M2: user text always via textContent
      messages.appendChild(userBubble);

      input.value = '';
      const typing = document.createElement('div');
      typing.className = 'message bot-message';
      typing.textContent = '...חושב'; // QA M4: Hebrew typing indicator
      messages.appendChild(typing);
      messages.scrollTop = messages.scrollHeight;

      setTimeout(() => {
        setReply(typing, lookup(text));
        messages.scrollTop = messages.scrollHeight;
        ConsoleLog.push({ prompt: '?', text: `chat.ask("${text}")`, comment: 'AI replied' });
      }, 700);
    }

    // QA L2: send button wired via addEventListener (no inline onclick)
    $('#sendBtn').addEventListener('click', send);
    $('#userInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') send();
    });

    return { send };
  })();

  /* ============================================================
     8. COMMAND PALETTE  (Ctrl+K / ⌘K)
     ============================================================ */
  const Palette = (() => {
    const backdrop = $('#paletteBackdrop');
    const list     = $('#paletteList');
    const input    = $('#paletteInput');

    const commands = [
      { id: 'init',     icon: '▶', title: 'אתחל HEAD',         sub: 'H',      run: () => Sandbox.initHead() },
      { id: 'addPrompt',icon: '＋', title: 'הוסף צומת חדש',    sub: 'N',      run: () => { Router.go('sandbox'); Sandbox.focusValueInput(); } },
      { id: 'clear',    icon: '⌫', title: 'נקה לוח',           sub: 'C',      run: () => Sandbox.clearBoard() },
      { id: 'deleteF',  icon: '✖', title: 'מחק את הצומת הממוקד', sub: 'D',    run: () => Sandbox.deleteFocused() },
      { id: 'goSand',   icon: '🧪', title: 'עבור לסנדבוקס',     sub: 'S',      run: () => Router.go('sandbox') },
      { id: 'goLes',    icon: '📚', title: 'עבור לשיעור',       sub: 'L',      run: () => Router.go('lesson') },
      { id: 'goAI',     icon: '🤖', title: 'עבור ל-AI Tutor',  sub: 'A',      run: () => Router.go('chat') },
      { id: 'goCon',    icon: '💻', title: 'עבור לקונסולה',     sub: 'O',      run: () => Router.go('console-full') },
      { id: 'help',     icon: '?', title: 'קיצורי מקלדת',       sub: '?',      run: () => Help.open() },
      { id: 'clearCon', icon: '🧹', title: 'נקה קונסולה',       sub: '',       run: () => ConsoleLog.clearAll() },
    ];

    let activeIdx = 0;
    let visible = [];

    function open() {
      backdrop.removeAttribute('hidden');
      input.value = '';
      activeIdx = 0;
      filter('');
      requestAnimationFrame(() => input.focus());
    }
    function close() {
      backdrop.setAttribute('hidden', '');
    }
    function isOpen() { return !backdrop.hasAttribute('hidden'); }

    function filter(q) {
      q = q.trim().toLowerCase();
      visible = q
        ? commands.filter(c => c.title.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q))
        : commands.slice();
      activeIdx = 0;
      render();
    }

    function render() {
      list.innerHTML = '';
      if (visible.length === 0) {
        const li = document.createElement('li');
        li.className = 'palette-empty';
        li.textContent = 'לא נמצאו פקודות.';
        list.appendChild(li);
        return;
      }
      visible.forEach((cmd, i) => {
        const li = document.createElement('li');
        li.className = 'palette-item' + (i === activeIdx ? ' is-active' : '');
        li.setAttribute('role', 'option');
        li.innerHTML =
          `<span class="pi-icon">${escapeHtml(cmd.icon)}</span>` +
          `<span class="pi-title">${escapeHtml(cmd.title)}</span>` +
          `<span class="pi-sub">${escapeHtml(cmd.sub)}</span>`;
        li.addEventListener('click', () => { activate(i); });
        li.addEventListener('mouseenter', () => { activeIdx = i; updateActive(); });
        list.appendChild(li);
      });
    }
    function updateActive() {
      Array.from(list.children).forEach((el, i) => el.classList.toggle('is-active', i === activeIdx));
    }
    function activate(i = activeIdx) {
      const cmd = visible[i];
      if (!cmd) return;
      close();
      cmd.run();
    }

    input.addEventListener('input', () => filter(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, visible.length - 1); updateActive(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); updateActive(); }
      else if (e.key === 'Enter')  { e.preventDefault(); activate(); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
    $('#btnCmdK').addEventListener('click', open);

    return { open, close, isOpen };
  })();

  /* ============================================================
     9. HELP overlay
     ============================================================ */
  const Help = (() => {
    const backdrop = $('#helpBackdrop');
    function open() { backdrop.removeAttribute('hidden'); }
    function close() { backdrop.setAttribute('hidden', ''); }
    function isOpen() { return !backdrop.hasAttribute('hidden'); }
    $('#btnCloseHelp').addEventListener('click', close);
    $('#btnHelp').addEventListener('click', open);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    return { open, close, isOpen };
  })();

  /* ============================================================
     10. TUTORIAL OVERLAY  (3 progressive Hebrew hints)
     ============================================================ */
  const Tutorial = (() => {
    const layer = $('#tutorialLayer');
    let step = 0;
    const STORAGE_KEY = 'cstutor_tutorial_done_v2';
    let active = false;

    const steps = [
      {
        anchor: '#btn-init-head',
        text: 'שלום! לחצו כאן כדי לאתחל את ה-HEAD ולראות איך רשימה מקושרת מתחילה.',
        triggerEvent: 'init',
      },
      {
        anchor: '#node-value-input',
        text: 'מצוין! עכשיו הקלידו ערך (למשל 42) ולחצו Enter כדי להוסיף צומת.',
        triggerEvent: 'add',
      },
      {
        anchor: '.ll-node',
        text: 'נהדר! העבירו את העכבר על צומת ולחצו על × כדי למחוק. הקוד C# מתעדכן אוטומטית מצד שמאל.',
        triggerEvent: 'delete',
      },
    ];

    let alreadyDone = false;
    try { alreadyDone = localStorage.getItem(STORAGE_KEY) === '1'; } catch (_) {}

    function start() {
      if (alreadyDone) return;
      active = true;
      step = 0;
      layer.removeAttribute('hidden');
      paint();
    }
    function paint() {
      layer.innerHTML = '';
      const cur = steps[step];
      if (!cur) { finish(); return; }
      const target = document.querySelector(cur.anchor);
      if (!target) { advance(); return; }

      const r = target.getBoundingClientRect();
      const spot = document.createElement('div');
      spot.className = 'tutorial-spotlight';
      spot.style.left   = (r.left   - 6) + 'px';
      spot.style.top    = (r.top    - 6) + 'px';
      spot.style.width  = (r.width  + 12) + 'px';
      spot.style.height = (r.height + 12) + 'px';
      layer.appendChild(spot);

      const tip = document.createElement('div');
      tip.className = 'tutorial-tip';
      // Position: prefer below; flip above if too close to bottom
      const belowSpace = window.innerHeight - r.bottom;
      const tipTop = belowSpace > 140 ? (r.bottom + 14) : Math.max(12, r.top - 140);
      tip.style.top  = tipTop + 'px';
      const desiredLeft = Math.min(r.left, window.innerWidth - 320);
      tip.style.left = Math.max(12, desiredLeft) + 'px';
      tip.innerHTML =
        `<span class="tip-step">שלב ${step + 1} / ${steps.length}</span>` +
        `<div class="tip-text"></div>` +
        `<div class="tip-actions">` +
          `<button class="tip-skip" type="button">דלג על הסיור</button>` +
          `<button class="tip-next" type="button">הבא ←</button>` +
        `</div>`;
      tip.querySelector('.tip-text').textContent = cur.text;
      tip.querySelector('.tip-skip').addEventListener('click', finish);
      tip.querySelector('.tip-next').addEventListener('click', advance);
      layer.appendChild(tip);
    }
    function advance() {
      step++;
      if (step >= steps.length) finish();
      else paint();
    }
    function finish() {
      active = false;
      layer.setAttribute('hidden', '');
      layer.innerHTML = '';
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
    }
    // Sandbox calls notify(action) — auto-advance if matching the current step's trigger
    function notify(action) {
      if (!active) return;
      const cur = steps[step];
      if (cur && cur.triggerEvent === action) {
        setTimeout(advance, 350);
      }
    }
    // Re-paint on resize so spotlight stays glued
    window.addEventListener('resize', debounce(() => { if (active) paint(); }, 100));
    return { start, finish, notify };
  })();

  /* ============================================================
     11. KEYBOARD SHORTCUTS
     ============================================================ */
  document.addEventListener('keydown', (e) => {
    // Open palette: Ctrl+K / ⌘K
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      Palette.open();
      return;
    }

    // Esc closes any overlay
    if (e.key === 'Escape') {
      if (Palette.isOpen()) { Palette.close(); return; }
      if (Help.isOpen())    { Help.close();    return; }
    }

    // Suppress letter shortcuts when typing in any input/textarea or palette
    const t = e.target;
    const isTyping = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (isTyping) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const key = e.key.toLowerCase();
    switch (key) {
      case 'h': e.preventDefault(); Sandbox.initHead(); break;
      case 'n': e.preventDefault(); Router.go('sandbox'); Sandbox.focusValueInput(); break;
      case 'd': e.preventDefault(); Sandbox.deleteFocused(); break;
      case 'c': e.preventDefault(); Sandbox.clearBoard(); break;
      case 's': e.preventDefault(); Router.go('sandbox'); break;
      case 'l': e.preventDefault(); Router.go('lesson'); break;
      case 'a': e.preventDefault(); Router.go('chat'); break;
      case 'o': e.preventDefault(); Router.go('console-full'); break;
      case '?': e.preventDefault(); Help.open(); break;
      default: break;
    }
  });

  /* ============================================================
     12. BOOT
     ============================================================ */
  startClock();
  Router.go('sandbox');
  ConsoleLog.push({ prompt: '>', text: 'session started', comment: new Date().toLocaleTimeString('he-IL') });

  // Tutorial: kick off after first paint so DOM rects are real
  requestAnimationFrame(() => {
    setTimeout(() => Tutorial.start(), 400);
  });

})();
