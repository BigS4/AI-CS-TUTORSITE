// ===========================
//   AI CS TUTOR — MAIN JS
// ===========================

// A set of pre-written CS explanations the tutor can give.
// In a real version, this would call an AI API (like Claude or OpenAI).
const responses = {
  "binary search": `
    <strong>Binary Search</strong> is an efficient algorithm for finding a value in a <em>sorted</em> list.<br><br>
    Instead of checking every element one by one, it cuts the list in half each time:<br>
    1. Look at the middle element<br>
    2. If it's your target → done! ✅<br>
    3. If your target is smaller → search the left half<br>
    4. If your target is bigger → search the right half<br>
    5. Repeat until found<br><br>
    <strong>Time complexity: O(log n)</strong> — very fast!
  `,
  "big o": `
    <strong>Big O notation</strong> describes how fast an algorithm is as the input grows.<br><br>
    Common ones:<br>
    • O(1) — Constant: same speed no matter the input size (e.g. looking up a dictionary entry)<br>
    • O(n) — Linear: speed grows with the input (e.g. reading every element once)<br>
    • O(n²) — Quadratic: speed grows fast (e.g. two nested loops)<br>
    • O(log n) — Logarithmic: very efficient (e.g. binary search)<br><br>
    Think of it as asking: "If my data got 10× bigger, how much slower would this be?"
  `,
  "recursion": `
    <strong>Recursion</strong> is when a function calls <em>itself</em> to solve a smaller version of the same problem.<br><br>
    Classic example — calculating factorial:<br>
    <code>factorial(5) = 5 × factorial(4)</code><br>
    <code>factorial(4) = 4 × factorial(3)</code><br>
    ...and so on until factorial(1) = 1<br><br>
    Every recursive function needs two things:<br>
    1. A <strong>base case</strong> — a condition that stops the recursion<br>
    2. A <strong>recursive case</strong> — the function calling itself with a simpler input<br><br>
    Without a base case, you'd get infinite recursion (a crash)!
  `,
  "array": `
    An <strong>array</strong> is one of the most fundamental data structures.<br><br>
    It stores a collection of elements in a <em>fixed-size, ordered sequence</em>.<br><br>
    Key properties:<br>
    • Each element has an <strong>index</strong> (position), starting at 0<br>
    • Accessing any element is O(1) — instant, regardless of size<br>
    • Inserting/deleting in the middle is O(n) — requires shifting elements<br><br>
    Example: <code>["Alice", "Bob", "Charlie"]</code><br>
    Index:   <code>[  0,      1,      2    ]</code><br><br>
    Arrays are the building block for many other data structures!
  `,
  "linked list": `
    A <strong>Linked List</strong> is a data structure made of <em>nodes</em>, each containing:<br>
    • The data value<br>
    • A pointer (link) to the next node<br><br>
    Unlike arrays, linked lists don't store elements in consecutive memory — they're connected by pointers.<br><br>
    Tradeoffs vs arrays:<br>
    ✅ Fast insert/delete at the beginning: O(1)<br>
    ❌ Slow access by index: O(n) — must start from the head and walk through<br>
    ❌ More memory (stores pointer for each node)<br><br>
    Good for: queues, implementing stacks, frequent insertions at start/end.
  `,
  "variable": `
    A <strong>variable</strong> is like a labeled box that stores a value in your program.<br><br>
    When you write: <code>let age = 21;</code><br>
    You're creating a box called "age" and putting the value 21 inside it.<br><br>
    Later you can:<br>
    • Read it: <code>console.log(age)</code> → prints 21<br>
    • Update it: <code>age = 22;</code> → now the box holds 22<br><br>
    Variables can hold many types of values: numbers, text (strings), true/false (booleans), lists (arrays), and more.
  `,
};

// The default response when we don't recognize the question
const defaultResponse = `
  That's a great question! This is a demo version of the AI CS Tutor.
  Try asking about: <strong>binary search</strong>, <strong>Big O notation</strong>,
  <strong>recursion</strong>, <strong>arrays</strong>, <strong>linked lists</strong>, or <strong>variables</strong>.<br><br>
  In a full version, I'd be powered by a real AI and could answer anything! 🚀
`;

// The main chat function — runs when you click "Send" or press Enter
function sendMessage() {
  const input = document.getElementById("userInput");
  const chatMessages = document.getElementById("chatMessages");

  const userText = input.value.trim();
  if (!userText) return; // Don't send empty messages

  // 1. Display the user's message on the right
  const userBubble = document.createElement("div");
  userBubble.classList.add("message", "user-message");
  userBubble.textContent = userText;
  chatMessages.appendChild(userBubble);

  // 2. Clear the input box
  input.value = "";

  // 3. Show a "typing..." indicator
  const typingBubble = document.createElement("div");
  typingBubble.classList.add("message", "bot-message");
  typingBubble.textContent = "Thinking...";
  chatMessages.appendChild(typingBubble);

  // 4. Scroll to the bottom so the user sees new messages
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // 5. Find a matching response (after a short delay to feel natural)
  setTimeout(() => {
    const lowerText = userText.toLowerCase();
    let reply = defaultResponse;

    // Check if any keyword matches the user's question
    for (const [keyword, explanation] of Object.entries(responses)) {
      if (lowerText.includes(keyword)) {
        reply = explanation;
        break;
      }
    }

    // Replace "Thinking..." with the actual answer
    typingBubble.innerHTML = reply;

    // Scroll down again after the reply appears
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 800);
}

// Allow pressing Enter to send a message (not just clicking the button)
document.getElementById("userInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// =====================================================================
//   VISUAL SANDBOX — Linked List Playground
//   Tasks 3 (HEAD+NULL), 4 (Add Node), 5 (SVG arrows), 6 (Delete+relink)
// =====================================================================
(function () {
  // ---- DOM refs ----
  const board     = document.getElementById("sandbox-board");
  const nodesEl   = document.getElementById("sandbox-nodes");
  const arrowsEl  = document.getElementById("sandbox-arrows");
  const valueIn   = document.getElementById("node-value-input");
  const btnInit   = document.getElementById("btn-init-head");
  const btnAdd    = document.getElementById("btn-add-node");
  const btnClear  = document.getElementById("btn-clear-board");

  if (!board) return; // sandbox not on this page

  // ---- State ----
  // List = ordered list of "items". Items can be: { kind: 'head' }, { kind: 'node', value }, { kind: 'null' }.
  // The HEAD always points to item[1], each node points to the next, and the last node points to NULL.
  let initialized = false;
  let items = []; // [{ id, kind, value?, x, y, el }]
  let nextId = 1;

  // Layout constants
  const ROW_Y       = 80;     // default vertical position
  const START_X     = 30;     // first block x (RTL: visually rightmost since we layout left-to-right but the page is RTL — board uses absolute coords so direction is fixed left→right for clarity)
  const GAP         = 60;     // horizontal gap between blocks
  const BLOCK_W     = 110;    // approximate block width for layout

  // ---- Helpers ----
  const uid = () => nextId++;

  function setEmptyVisible(show) {
    board.classList.toggle("has-content", !show);
  }

  function createBlockEl(item) {
    const el = document.createElement("div");
    el.className = "ll-block";
    el.dataset.id = item.id;
    el.style.left = item.x + "px";
    el.style.top  = item.y + "px";

    if (item.kind === "head") {
      el.classList.add("ll-head");
      el.textContent = "HEAD";
    } else if (item.kind === "null") {
      el.classList.add("ll-null");
      el.textContent = "NULL";
    } else if (item.kind === "node") {
      el.classList.add("ll-node");
      el.style.position = "absolute";
      const dataCell = document.createElement("div");
      dataCell.className = "cell cell-data";
      dataCell.textContent = item.value;
      const nextCell = document.createElement("div");
      nextCell.className = "cell cell-next";
      nextCell.textContent = "next";
      el.appendChild(dataCell);
      el.appendChild(nextCell);

      // Delete button (Task 6)
      const del = document.createElement("button");
      del.className = "delete-btn";
      del.type = "button";
      del.title = "מחק צומת";
      del.textContent = "×";
      del.addEventListener("click", (ev) => {
        ev.stopPropagation();
        deleteNode(item.id);
      });
      el.appendChild(del);
    }

    attachDrag(el, item);
    nodesEl.appendChild(el);
    return el;
  }

  function defaultPositionFor(index) {
    // Lay out in a single row; wrap if too wide for the board.
    const boardW = Math.max(board.clientWidth - 40, 320);
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
      // Only auto-position items that haven't been manually dragged
      if (!it.dragged) {
        const pos = defaultPositionFor(i);
        it.x = pos.x;
        it.y = pos.y;
        if (it.el) {
          it.el.style.left = it.x + "px";
          it.el.style.top  = it.y + "px";
        }
      }
    });
  }

  // ---- Arrow rendering (Task 5) ----
  function clearArrows() {
    // Keep <defs>, drop the rest
    Array.from(arrowsEl.querySelectorAll("line.arrow,path.arrow")).forEach(n => n.remove());
  }

  function drawArrows() {
    clearArrows();
    // Resize svg to match board
    arrowsEl.setAttribute("viewBox", `0 0 ${board.clientWidth} ${board.clientHeight}`);

    for (let i = 0; i < items.length - 1; i++) {
      const a = items[i];
      const b = items[i + 1];
      if (!a.el || !b.el) continue;

      const aRect = a.el.getBoundingClientRect();
      const bRect = b.el.getBoundingClientRect();
      const boardRect = board.getBoundingClientRect();

      // Source: right edge of A; Target: left edge of B (board-relative coords)
      // We use centers and clamp at the visual edges.
      const aCx = aRect.left + aRect.width  / 2 - boardRect.left;
      const aCy = aRect.top  + aRect.height / 2 - boardRect.top;
      const bCx = bRect.left + bRect.width  / 2 - boardRect.left;
      const bCy = bRect.top  + bRect.height / 2 - boardRect.top;

      // Direction vector
      const dx = bCx - aCx;
      const dy = bCy - aCy;
      const len = Math.max(1, Math.hypot(dx, dy));
      const ux = dx / len;
      const uy = dy / len;

      // Push start/end past the block edges (~ half width / height)
      const aHalfW = aRect.width  / 2;
      const aHalfH = aRect.height / 2;
      const bHalfW = bRect.width  / 2;
      const bHalfH = bRect.height / 2;

      const startX = aCx + ux * Math.min(aHalfW, aHalfH) * 1.1;
      const startY = aCy + uy * Math.min(aHalfW, aHalfH) * 1.1;
      const endX   = bCx - ux * Math.min(bHalfW, bHalfH) * 1.2;
      const endY   = bCy - uy * Math.min(bHalfW, bHalfH) * 1.2;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("class", "arrow");
      line.setAttribute("x1", startX);
      line.setAttribute("y1", startY);
      line.setAttribute("x2", endX);
      line.setAttribute("y2", endY);
      line.setAttribute("stroke", "#00d4ff");
      line.setAttribute("stroke-width", "2");
      line.setAttribute("marker-end", "url(#arrowhead)");
      arrowsEl.appendChild(line);
    }
  }

  // ---- Render full state ----
  function render() {
    // Sync DOM: remove blocks no longer in items, add new ones
    const presentIds = new Set(items.map(i => i.id));
    Array.from(nodesEl.children).forEach(child => {
      if (!presentIds.has(Number(child.dataset.id))) child.remove();
    });

    items.forEach(it => {
      if (!it.el || !nodesEl.contains(it.el)) {
        it.el = createBlockEl(it);
      } else {
        it.el.style.left = it.x + "px";
        it.el.style.top  = it.y + "px";
      }
    });

    setEmptyVisible(items.length === 0);
    // Defer arrows one frame so layout is final
    requestAnimationFrame(drawArrows);
  }

  // ---- Operations ----
  function initHead() {
    // Reset to a fresh HEAD → NULL state (Task 3)
    items.forEach(it => it.el && it.el.remove());
    items = [];
    nextId = 1;
    initialized = true;
    items.push({ id: uid(), kind: "head" });
    items.push({ id: uid(), kind: "null" });
    relayout();
    render();
  }

  function addNode(rawValue) {
    if (!initialized) {
      // Convenience: if user clicks Add Node before init, init for them
      initHead();
    }
    const value = (rawValue == null ? "" : String(rawValue)).trim();
    if (value === "") {
      flashInput();
      return;
    }
    // Insert before NULL (which is the last item)
    const nullIdx = items.findIndex(i => i.kind === "null");
    const insertAt = nullIdx === -1 ? items.length : nullIdx;
    const newNode = { id: uid(), kind: "node", value };
    items.splice(insertAt, 0, newNode);
    relayout();
    render();
  }

  function deleteNode(id) {
    // Task 6: remove node + relink. Since arrows are computed from list order,
    // simply removing the node from the array auto-relinks prev → (next of deleted).
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return;
    const it = items[idx];
    if (it.kind !== "node") return; // never delete HEAD or NULL
    if (it.el) it.el.remove();
    items.splice(idx, 1);
    relayout();
    render();
  }

  function clearBoard() {
    items.forEach(it => it.el && it.el.remove());
    items = [];
    initialized = false;
    clearArrows();
    setEmptyVisible(true);
  }

  function flashInput() {
    valueIn.style.transition = "border-color 0.15s";
    const prev = valueIn.style.borderColor;
    valueIn.style.borderColor = "#ff4d6d";
    setTimeout(() => { valueIn.style.borderColor = prev; }, 350);
    valueIn.focus();
  }

  // ---- Drag & drop (Task 7 groundwork — arrows must follow drag in real time) ----
  function attachDrag(el, item) {
    let dragging = false;
    let startX = 0, startY = 0;
    let origX = 0, origY = 0;

    const onPointerDown = (e) => {
      // Don't start drag from delete button
      if (e.target.classList && e.target.classList.contains("delete-btn")) return;
      dragging = true;
      el.classList.add("dragging");
      el.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startY = e.clientY;
      origX = item.x;
      origY = item.y;
    };
    const onPointerMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const boardRect = board.getBoundingClientRect();
      let newX = origX + dx;
      let newY = origY + dy;
      // Clamp to board
      newX = Math.max(0, Math.min(newX, boardRect.width  - el.offsetWidth));
      newY = Math.max(0, Math.min(newY, boardRect.height - el.offsetHeight));
      item.x = newX;
      item.y = newY;
      item.dragged = true;
      el.style.left = newX + "px";
      el.style.top  = newY + "px";
      drawArrows(); // real-time arrow update
    };
    const onPointerUp = (e) => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("dragging");
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
  }

  // ---- Wire up controls ----
  btnInit.addEventListener("click", initHead);
  btnAdd.addEventListener("click", () => {
    addNode(valueIn.value);
    valueIn.value = "";
    valueIn.focus();
  });
  valueIn.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      addNode(valueIn.value);
      valueIn.value = "";
    }
  });
  btnClear.addEventListener("click", clearBoard);

  // Re-draw arrows on window resize so they stay glued to the blocks
  window.addEventListener("resize", () => {
    relayout();
    render();
  });
})();
