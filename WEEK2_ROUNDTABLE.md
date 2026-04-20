# Visual CS Tutor — Weekly Agent Roundtable
**Date:** 2026-04-20  
**Participants:** PM · Frontend Engineer · QA Engineer  
**Context:** Week 1 complete (tasks 2–6 done). Kicking off Week 2 sprint.

---

## Week 1 Recap

| Task | Status | Notes |
|------|--------|-------|
| [2] Visual Sandbox section | ✅ Done | Toolbar, board, SVG overlay, Hebrew labels |
| [3] HEAD + NULL rendering | ✅ Done | initHead(), gradient blocks, auto-arrow |
| [4] Create Node | ✅ Done | Insert before NULL, flash on empty, Enter key |
| [5] Dynamic SVG arrows | ✅ Done | requestAnimationFrame, real-time drag updates |
| [6] Node deletion + relink | ✅ Done | Splice pattern auto-relinks cleanly |
| [1] Hebrew RTL base layout | 🔄 Partial | dir=rtl set, text translated, but chat English-only |
| [7] Drag & drop | ⬜ Todo | groundwork in code, needs polish/finalization |
| [8] QA review | ✅ Done | Full report → QA_REPORT.md |

---

## QA Engineer — Roundtable Answers

**Q1: Which Week 2 task carries the highest regression risk?**

Task [9] (Retro CMD Theme) carries the highest regression risk. Restyling `.ll-node`, `.ll-head`, and `.ll-null` touches the same elements that drive drag behavior, arrow coordinate calculations, and the delete button positioning. A CSS change to font-size or padding directly shifts `getBoundingClientRect()` values, which feeds into `drawArrows()` — meaning arrows can silently misalign after the restyle. Every CMD theme change must be followed by a full arrow regression pass.

**Q2: New test cases required for the Retro CMD theme:**
- Verify HEAD block renders as `HEAD>` text and not `HEAD`
- Verify node block shows `[ value | --> ]` two-cell layout, both cells visible
- Verify NULL block renders as `<NULL>`
- Verify delete button is visible on hover (not clipped — this was the Critical bug)
- Verify SVG arrows still connect block centers correctly after font/padding change
- Verify drag still works: grab a node, arrow must follow in real time
- Verify board background is `#001100` or `#0a0a0a` only within `#sandbox-board` (not leaking to rest of page)
- Cross-browser: verify monospace font fallback in Firefox and Safari renders correctly
- Verify CRT scanline overlay (if implemented) doesn't cover interactive elements

**Q3: Acceptance criteria for C# Code Mirror Panel (task 11):**
- When HEAD is initialized, panel shows: `Node HEAD = null;`
- When a node with value 42 is added, panel shows: `Node n = new Node(42); n.next = HEAD; HEAD = n;`
- When a node is deleted (middle), panel shows the relink: `prev.next = target.next; target = null;`
- Code is syntax-highlighted (keywords in different color)
- Panel is scrollable if code history grows beyond panel height
- Panel does not break RTL layout of the sandbox toolbar

**Q4: Pilot session recommendations for teachers:**
- Teachers should observe whether students understand that arrows represent pointer memory addresses, not just visual connections
- Watch for students who try to drag HEAD or NULL (those blocks should resist dragging or at least give feedback)
- Track: how long does it take for a student to build a 3-node list for the first time?
- Watch for confusion when deleting a middle node — do they understand the relinking happened?
- The biggest learning signal: does the student look at the canvas and then write correct C# code?

**Q5: Feature interaction concerns:**
- **Drag + CMD theme + arrows:** After the CMD restyle changes block dimensions, arrow start/end coordinates shift. The drag handler clamps to board boundaries using `el.offsetWidth` — if the CMD theme changes block width, the clamping must be re-verified.
- **Delete button + CMD theme:** The Critical bug (overflow:hidden clipping) MUST be fixed before or as part of task [9]. Do not restyle blocks with a hidden delete button — that compounds the bug.
- **RTL layout direction + arrow math:** If task [10] flips the sandbox to RTL direction (HEAD on right), `defaultPositionFor()` must also flip its X calculation or all arrows will point the wrong way.

---

## Frontend Engineer — Roundtable Answers

**Q1: Implementation approach for Retro CMD theme (task 9):**

Recommended approach: **CSS custom property swap + scoped class**. Add a `.cmd-theme` class to `#sandbox-board` and override the relevant CSS variables scoped to that class. This keeps the rest of the page untouched and makes the theme toggleable (useful for a future "toggle theme" feature):

```css
#sandbox-board.cmd-theme {
  --ll-bg: #001100;
  --ll-text: #00ff41;
  --ll-border: #00ff41;
  --ll-font: 'Courier New', Consolas, monospace;
  background: var(--ll-bg);
  border: 1px solid var(--ll-border);
  font-family: var(--ll-font);
}
#sandbox-board.cmd-theme .ll-head { background: #001a00; color: var(--ll-text); border-color: var(--ll-border); border-radius: 2px; }
#sandbox-board.cmd-theme .ll-node { background: #001a00; border-color: var(--ll-border); border-radius: 2px; }
#sandbox-board.cmd-theme .ll-null { background: #0a0a0a; color: #4a7c4a; border-radius: 2px; }
```

The JS side only needs to update block label text (add `>` to HEAD, wrap NULL in `<>`).

**Q2: C# Code Panel layout and event binding:**

Place the panel as a `<div id="code-panel">` directly below `#sandbox-board`, full width. It listens to the same state mutations as `render()`. The cleanest pattern: add a `logCode(snippet)` function called from `initHead()`, `addNode()`, and `deleteNode()`. The panel maintains an array of code history lines and re-renders on every state change. No separate event system needed — same IIFE scope.

```js
const codeHistory = [];
function logCode(line) {
  codeHistory.push(line);
  codePanelEl.textContent = codeHistory.join('\n');
}
// In initHead(): logCode('Node HEAD = null;')
// In addNode(v): logCode(`Node n${id} = new Node(${v}); n${id}.next = HEAD; HEAD = n${id};`)
```

**Q3: Fix for overflow:hidden delete button clip bug:**

Remove `overflow: hidden` from `.ll-node`. Apply `border-radius` surgically to the cells:

```css
.ll-node { overflow: visible; } /* was: overflow: hidden */
.ll-node .cell-data  { border-radius: 10px 0 0 10px; }
.ll-node .cell-next  { border-radius: 0 10px 10px 0; }
```
For CMD theme, change border-radius to `2px 0 0 2px` / `0 2px 2px 0` for the flat terminal look.

**Q4: Biggest technical risk in Week 2:**

The C# Code Mirror Panel (task 11) introduces the most risk. The sandbox state is currently managed with a simple `items[]` array inside an IIFE. To power a code panel, we need the state mutations to emit events or call callbacks. Refactoring the IIFE's internal functions to be observable without introducing bugs in the existing render pipeline is the primary risk. Mitigation: keep it simple — `logCode()` calls directly inside each mutation function, no pub/sub pattern needed at this scale.

**Q5: Drag & CMD theme z-index / pointer-events:**

No fundamental conflict. The `.dragging` class already sets `z-index: 10` on the dragged block — this sits above the SVG layer (`z-index: 1`) and the nodes layer (`z-index: 2`). The CMD theme restyling only affects visual appearance and should not alter z-index values. The one concern: if the CRT scanline overlay is implemented as a `::after` pseudo-element on `#sandbox-board`, set `pointer-events: none` on it to ensure it doesn't intercept drag events.

---

## Product Manager — Roundtable Answers

**Q1: Does Week 2 scope need trimming?**

The true MVP for a classroom pilot needs only three things working flawlessly: the sandbox operates correctly (tasks 2–6 ✅), the UI is in Hebrew without English-only failures (task 10), and the critical bugs are fixed (task 12). The retro CMD theme (task 9) is high-value for student engagement but not strictly required for functional pilot delivery. **Recommended sprint priority order:**

1. Task 12 — fix the bugs (unblocks everything)
2. Task 10 — Hebrew chat + RTL polish (core educational requirement)
3. Task 9 — Retro CMD theme (engagement + memorability)
4. Task 11 — C# panel (highest educational value — see Q4)
5. Task 13 — Pilot prep (scheduling, teacher card)
6. Task 7 — Drag & drop (already partially implemented, good to have)

**Q2: How the Retro CMD theme serves the personas:**
- **Romi** (high achiever, pointer logic): The terminal aesthetic directly mirrors the mental model of C# memory debugging. She'll associate the `[ 42 | --> ]` block layout with actual Node struct memory addresses. High alignment.
- **Idan** (ADHD, hands-on): The high-contrast green-on-black is visually distinctive and energizing. Every action has an immediately visible dramatic effect on the terminal board. High engagement value.
- **Meirav** (teacher, projector): The high-contrast terminal theme projects extremely well on a classroom screen. The retro aesthetic also creates a memorable "wow" moment that gets students' attention at the start of a lesson.

**Q3: Is the C# Code Mirror Panel in scope for Week 2?**

Yes — move it to Week 2 but as a **simplified version**: a read-only text panel showing the last 5 C# statements, no syntax highlighting required for MVP. Full CodeMirror-style highlighting can be Phase 2. The pedagogical value of connecting the visual action to a line of C# code is too high to defer — it directly addresses the ≥30% pointer-error reduction goal. Every time a student adds a node and sees `HEAD = new Node(42)` appear, they're reinforcing the exam answer format.

**Q4: Single highest-value educational addition:**

The **C# Code Mirror Panel** (task 11, simplified). The entire product's stated goal is to reduce pointer-logic errors on the Bagrut exam. The exam asks students to write C# linked list code. The visualization is already excellent at showing what happens — the missing bridge is *why* it maps to specific lines of code. A student who sees `prev.next = target.next` appear on screen the moment they delete a node will retain that pattern far more effectively than one who only sees the visual relink.

**Q5: Go/No-Go criteria for pilot sessions:**

**GO criteria (all must be met):**
- Zero Critical bugs remaining (delete button must be visible and functional)
- All UI text is in Hebrew (no English fallback in the chat or UI)
- A student can initialize HEAD, add 3 nodes, and delete 1 within 2 minutes without instruction
- The tool loads in a browser with zero setup (no npm install, no server)
- The teacher (Meirav) has reviewed and approved the tool for classroom use

**NO-GO criteria (any one triggers a hold):**
- Delete button invisible (Critical bug C1 not fixed)
- Chat responds in English to Hebrew queries
- Board clips nodes on a 1280×720 screen with 4+ nodes
- Any JavaScript error in the browser console during a basic walkthrough

---

## Cross-Team Agreements from Roundtable

| Decision | Owner | Rationale |
|----------|-------|-----------|
| Fix bugs (task 12) first, then restyle (task 9) | Frontend | Theme on a broken base = double rework |
| C# Code Panel (task 11) stays in Week 2 as simplified version | PM + Frontend | Highest educational ROI, low implementation complexity |
| RTL arrow direction (right-to-left) to be decided with Meirav before task 10 | PM | Architectural choice that affects layout math |
| CRT scanline overlay: `pointer-events: none` required | Frontend + QA | Must not block drag events |
| Pilot go/no-go gate: delete button visible + Hebrew chat working | PM + QA | Minimum viable for real students |
| Snap-to-grid added to backlog (Phase 2) | PM | Good idea for precision, not MVP-critical |

---

## Week 2 Sprint Board

| Task | Assignee | Priority | Status |
|------|----------|----------|--------|
| [12] Performance & Polish Pass (fix bugs) | Frontend | Medium | ⬜ Todo |
| [10] Hebrew RTL Polish | Frontend | High | ⬜ Todo |
| [9] Retro CMD Visual Theme | Frontend | Critical | ⬜ Todo |
| [11] C# Code Mirror Panel (simplified) | Frontend | High | ⬜ Todo |
| [7] Drag & Drop finalization | Frontend | High | ⬜ Todo |
| [13] Pilot Session Prep | PM | Medium | ⬜ Todo |

**Sprint goal:** Ship a classroom-ready, Hebrew-language, terminal-aesthetic linked-list visualizer with zero Critical bugs, working in a browser with no setup, ready for 3–5 pilot sessions before the Bagrut exam window.
