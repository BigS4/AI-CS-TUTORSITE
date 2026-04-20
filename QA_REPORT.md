# Visual CS Tutor — QA Report
**Date:** 2026-04-20  
**Reviewer:** QA Agent (manual analysis)  
**Scope:** index.html · css/style.css · js/main.js  
**Build:** Week 1 MVP — Tasks 2–6 complete

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 1 |
| 🟠 High | 3 |
| 🟡 Medium | 5 |
| 🔵 Low | 5 |

Overall the codebase is well-structured for a vanilla JS MVP. The sandbox core logic (initHead, addNode, deleteNode, SVG arrows, drag) is solid. The main issues cluster around CSS overflow clipping the delete button, the chat not supporting Hebrew queries, and a few RTL/UX misalignments.

---

## 🔴 Critical

### [C1] Delete button invisibly clipped by `overflow:hidden`
**File:** `css/style.css` · `.ll-node`  
**Function:** `createBlockEl()` in `main.js`

`.ll-node` has `overflow: hidden` (needed for `border-radius` to clip the inner cells). The delete button is styled with `position: absolute; top: -8px; inset-inline-end: -8px` — meaning it sits 8px *outside* the node block. Because `.ll-node` establishes a positioned containing block **and** has `overflow: hidden`, the button is fully clipped and **never visible to the user**.

**Fix:** Remove `overflow: hidden` from `.ll-node` and instead apply `border-radius` to the individual cells (`.cell-data`, `.cell-next`) using selective rounding:
```css
.ll-node {
  /* Remove: overflow: hidden; */
  overflow: visible; /* allow delete btn to protrude */
}
.ll-node .cell-data { border-radius: 10px 0 0 10px; }
.ll-node .cell-next  { border-radius: 0 10px 10px 0; }
```
Or reposition the delete button *inside* the node (e.g., absolute top-right within the data cell).

---

## 🟠 High

### [H1] Sandbox board clips nodes when list overflows 400px
**File:** `css/style.css` · `.sandbox-board`  
**Function:** `defaultPositionFor()` in `main.js`

`.sandbox-board` has `min-height: 400px` and `overflow: hidden`. Absolutely positioned children do **not** contribute to the parent's layout height, so the board stays at 400px no matter how many rows of nodes exist. Any node positioned below `y=400px` is silently clipped. With 6+ nodes this becomes visible.

**Fix:** Remove `overflow: hidden` from `.sandbox-board` (the SVG overlay uses `position:absolute; inset:0` so it already self-sizes). Alternatively, dynamically expand the board height from JS after layout:
```js
function relayout() {
  // ... existing layout code ...
  const maxY = Math.max(...items.map(it => it.y + 120));
  board.style.minHeight = Math.max(400, maxY + 40) + 'px';
}
```

---

### [H2] Chat entirely non-functional for Hebrew input
**File:** `js/main.js` · `responses` object, `sendMessage()`

The chat UI is 100% Hebrew (labels, placeholder, initial message). But the keyword matching in `responses` is English-only: `"linked list"`, `"binary search"`, `"big o"`, etc. A student who naturally types "מהי רשימה מקושרת?" or "הסבר רקורסיה" hits the `defaultResponse` every single time. The tutor effectively does not work in Hebrew.

**Fix:** Add Hebrew keys to the responses object in parallel with the English keys:
```js
const hebrewKeyMap = {
  "רשימה מקושרת": "linked list",
  "חיפוש בינארי":  "binary search",
  "רקורסיה":       "recursion",
  "מערך":          "array",
  "big o":         "big o",
  "סיבוכיות":      "big o",
  "משתנה":         "variable",
};
```
Then normalize the lookup to check both `responses` and `hebrewKeyMap`.

---

### [H3] Window resize handler is unthrottled
**File:** `js/main.js` · `window.addEventListener("resize", ...)`

The resize listener calls `relayout()` + `render()` synchronously on **every** resize event. During a window drag-resize on a desktop this fires 30–60 times per second. Each `render()` call touches the DOM and triggers `requestAnimationFrame(drawArrows)`. On a projector switch (resolution change) this causes a noticeable freeze.

**Fix:** Debounce the resize handler:
```js
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { relayout(); render(); }, 120);
});
```

---

## 🟡 Medium

### [M1] RTL arrow direction conflicts with Hebrew reading direction
**File:** `js/main.js` · `defaultPositionFor()`, `relayout()`

The board uses absolute coordinates, so `START_X=30` puts HEAD on the visual **left** with items flowing rightward. Hebrew students expect to read right-to-left; they'd intuitively expect HEAD on the **right** with arrows pointing left toward NULL. The current left-to-right layout is the opposite of their natural reading flow and may actively confuse students learning pointer traversal.

**Fix (high-value):** Flip the layout to start from the right edge:
```js
function defaultPositionFor(index) {
  const boardW = Math.max(board.clientWidth - 40, 320);
  const perRow = Math.max(1, Math.floor(boardW / (BLOCK_W + GAP)));
  const row = Math.floor(index / perRow);
  const col = index % perRow;
  const startX = boardW - BLOCK_W - 20; // start from right
  return {
    x: startX - col * (BLOCK_W + GAP),
    y: ROW_Y + row * 110,
  };
}
```

---

### [M2] `innerHTML = reply` — XSS surface, currently safe but fragile
**File:** `js/main.js` · `sendMessage()`, line: `typingBubble.innerHTML = reply`

`reply` comes from the static `responses` object and `defaultResponse`, not directly from user input. So there is **no active XSS** today. However, the user's raw text is stored in `userText` one scope above and a future maintainer could accidentally introduce `reply = userText` — turning this into a stored XSS. The pattern should be hardened.

**Fix:** If replies are static HTML strings, keep `innerHTML` but add a comment warning. For any future dynamic content, sanitize with a trusted sanitizer (e.g., DOMPurify) or switch to `textContent` + DOM construction.

---

### [M3] Implicit `initHead()` inside `addNode()` — confusing UX for new students
**File:** `js/main.js` · `addNode()`

If a student types a value and clicks "הוסף צומת" before pressing "אתחל HEAD", the code silently calls `initHead()` first. While convenient, this bypasses the intentional first step of the lesson (initializing HEAD). For a teaching tool, the flow "students must init HEAD first" is pedagogically important.

**Fix:** Replace the implicit init with an informative toast/alert:
```js
if (!initialized) {
  // Show a small hint message instead of silently initializing
  showHint('לחצו תחילה על "אתחל HEAD" כדי להכין את הרשימה');
  return;
}
```

---

### [M4] Typing indicator text is English
**File:** `js/main.js` · `sendMessage()`

`typingBubble.textContent = "Thinking..."` — the entire UI is in Hebrew but this temporary indicator is in English. Minor but breaks immersion.

**Fix:** `typingBubble.textContent = "...חושב"`

---

### [M5] `relayout()` does not clear `dragged` flag on `clearBoard()` / `initHead()`
**File:** `js/main.js` · `clearBoard()`, `initHead()`

When `clearBoard()` is called, `items = []` discards all dragged flags with the items — this is fine. But if a student drags HEAD to a custom position and then calls `initHead()` (re-init without clear), the new HEAD item is created fresh with no `dragged` flag, so it gets auto-positioned correctly. This is actually fine on analysis. **No bug — close this one.**

---

## 🔵 Low

### [L1] `position: absolute` set redundantly in JS
**File:** `js/main.js` · `createBlockEl()` — `el.style.position = "absolute"` for `ll-node`  
Already applied by `.ll-block { position: absolute }` in CSS. The JS line is a no-op but creates a false impression that CSS doesn't handle it.  
**Fix:** Remove `el.style.position = "absolute";` from `createBlockEl`.

---

### [L2] Mixed event handler patterns on chat send button
**File:** `index.html` — `<button id="sendBtn" onclick="sendMessage()">`  
`js/main.js` — `addEventListener("keydown", ...)` for Enter key  
The button uses an inline `onclick` attribute while all other interactions use `addEventListener`. Inconsistent and harder to test/maintain.  
**Fix:** Remove `onclick` from HTML, add `document.getElementById('sendBtn').addEventListener('click', sendMessage)` in JS.

---

### [L3] No `aria-label` on sandbox action buttons
**File:** `index.html` · sandbox toolbar buttons  
Screen-reader users get "אתחל HEAD", "הוסף צומת", "נקה לוח" as button text which is fine. But the delete button (`×`) on nodes has no accessible label. `title="מחק צומת"` is set but `aria-label` is missing.  
**Fix:** Add `aria-label="מחק צומת"` to the delete button element in `createBlockEl()`.

---

### [L4] No keyboard access to node delete
**File:** `css/style.css` · `.ll-node .delete-btn { display: none; }` (visible only on hover)  
Keyboard-only users cannot hover, so they can never delete a node. This also matters for touch (no hover on mobile/tablet).  
**Fix:** Show the delete button on `:focus-within` as well:
```css
.ll-node:hover .delete-btn,
.ll-node:focus-within .delete-btn { display: flex; }
```

---

### [L5] `board.clientWidth` can be 0 on first render
**File:** `js/main.js` · `defaultPositionFor()`  
If `initHead()` is called before the browser has laid out the board (e.g., in a script running immediately), `board.clientWidth` returns 0. `perRow = Math.max(1, Math.floor(0 / 170))` = 1, so all nodes stack in a single column. In practice the user interaction ensures layout has happened, so this is low risk.  
**Fix:** Use `board.getBoundingClientRect().width` or add a `requestAnimationFrame` wrapper around `relayout()`.

---

## Code Quality Assessment

**Architecture: A−**  
Clean IIFE encapsulation for sandbox, clear state model (`items[]`), good separation of concerns. The `render()` → DOM sync pattern is correct for vanilla JS. The SVG arrow approach is elegant and performant.

**Correctness: B+**  
All core features work as intended except the delete button clip bug (Critical). The `drawArrows()` math is robust (NaN-protected, clamped). The `splice` + re-render pattern for deletion/relinking is clean.

**RTL: B−**  
`dir="rtl"` is applied correctly at `<html>`. `border-inline-end` and `inset-inline-end` are used instead of `border-right/left-right` which is correct. The sandbox arrow direction (left→right) is the main RTL pedagogical concern.

**Accessibility: C**  
Missing ARIA on interactive elements, keyboard-inaccessible delete button, hover-only UX patterns. For a classroom tool this is worth improving.

**Performance: B**  
`requestAnimationFrame` used correctly for arrow rendering. Main concern is the unthrottled resize handler. With <20 nodes (realistic MVP) performance is well within the 200ms target.

**Maintainability: A−**  
Code is well-commented, clearly organized, and consistent. The mixed `onclick`/`addEventListener` pattern is the only style inconsistency.

---

## Priority Fix Order for Week 2

1. **[C1]** Fix delete button clip — 10-min CSS fix, high visible impact
2. **[H2]** Add Hebrew keywords to chat — 30-min JS fix, core educational feature
3. **[H1]** Fix board overflow clipping — 15-min fix, critical for demos with many nodes
4. **[H3]** Debounce resize — 5-min fix, production polish
5. **[M1]** RTL layout direction — architectural decision, discuss with teacher (Meirav)
6. **[M4]** Hebrew typing indicator — 2-min fix
7. **[L4]** Keyboard + touch access to delete — 10-min fix
