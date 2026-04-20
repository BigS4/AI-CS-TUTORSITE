# Visual CS Tutor — Week 2 Product Vision & Brief
**Author:** PM (synthesized) · **Date:** 2026-04-20 · **Status:** Approved for execution
**Inputs:** QA_REPORT.md, WEEK2_ROUNDTABLE.md, PROJECT_CONTEXT.md, persona research (Romi/Idan/Meirav)

---

## 1. Design Principle

> **"The site should feel like a friendly IDE that a CS student already knows how to operate — every screen says *you are coding right now*, not *you are reading a textbook*."**

Everything below is in service of that one sentence. If a decision doesn't reinforce *"this feels like Visual Studio Code, not Wikipedia"*, we don't do it.

---

## 2. Site Shell Redesign

The Week-1 layout is a marketing landing page (top navbar → hero → topic cards → chat). That's wrong for a learning tool. Week 2 reframes the entire app as an **IDE workspace**.

### 2.1 Layout (CSS Grid, RTL-anchored)

```
┌──────────────────────────────────────────────────────────────────────┐
│  TOPBAR  · lesson breadcrumb · progress · ⌘K hint · clock           │  40px
├──────────────┬──────────────────────────────────────┬────────────────┤
│              │                                      │                │
│              │                                      │                │
│   MAIN       │           SANDBOX BOARD              │   CODE         │
│   CONTENT    │           (or chat / lesson pane     │   MIRROR       │
│   PANE       │            depending on sidebar      │   (collapsible)│
│              │            selection)                │                │
│              │                                      │                │
├──────────────┴──────────────────────────────────────┴────────────────┤
│  CONSOLE PANEL (collapsible) · live action log · `> addNode(42)`    │  120px
├──────────────────────────────────────────────────────────────────────┤
│  STATUSBAR · HEAD → 42 → 17 → NULL · 3 nodes · 0 errors · he-IL     │  28px
└──────────────────────────────────────────────────────────────────────┘
                                                              ┌──┐
                                                              │📁│ ← Sidebar
                                                              │📚│   anchored
                                                              │🧪│   to RIGHT
                                                              │🤖│   edge (RTL)
                                                              │💻│
                                                              └──┘
```

The sidebar is on the **right** because we are RTL. Hebrew users' eyes start on the right, so primary navigation is on the right exactly the way English VS Code's primary nav is on the left. **This is the single most important RTL decision in the redesign** — it makes the whole app feel native instead of mirrored.

### 2.2 Sidebar (right-anchored, 56px wide collapsed, 240px expanded)

Five icons, each a top-level surface:

| Icon | Surface | What it shows in MAIN PANE |
|---|---|---|
| 📁 Explorer | File tree (lessons) | Lesson list: `01_linked_list.cs`, `02_array.cs` (locked), `03_stack.cs` (locked) |
| 📚 Lesson | Reading material | Current lesson markdown — the prose explainer for linked lists |
| 🧪 Sandbox | Interactive board | The existing sandbox (HEAD/nodes/NULL/arrows/drag) |
| 🤖 AI Tutor | Chat | The existing chat surface |
| 💻 Console | Action log | Full-screen console log (also pinned at bottom) |

**Default landing:** Sandbox. Why: Idan (ADHD, hands-on) and Romi (debugging mental model) both come for the visualization. The lesson is secondary supporting material.

### 2.3 Topbar (40px)

- Right side (RTL primary): breadcrumb `שיעור 01 › רשימה מקושרת › סנדבוקס`
- Center: thin progress bar `████████░░ 80%`
- Left side: keyboard hint `⌘K לחיפוש פקודה` · clock `14:32`

### 2.4 Status bar (28px, bottom)

Live-rendered every state change:
```
  ⚡ READY  ·  HEAD → 42 → 17 → 9 → NULL  ·  3 nodes  ·  0 errors  ·  he-IL · UTF-8
```
When the sandbox is empty: `⚡ READY · רשימה ריקה · לחצו 'אתחל HEAD' או הקישו H`.

### 2.5 Console panel (collapsible, 120px when open)

Every sandbox action prints a line:
```
> initHead()                           // HEAD = null
> addNode(42)                          // HEAD → 42 → NULL
> addNode(17)                          // HEAD → 42 → 17 → NULL
> deleteNode(#3)                       // HEAD → 42 → NULL  ✓ relinked
```
This is the bridge that says *"you just wrote real code"* even when they only clicked a button. **Pedagogical gold for Romi.**

### 2.6 Typography

```css
:root {
  --font-prose: 'Heebo', 'Segoe UI', system-ui, sans-serif;     /* Hebrew prose */
  --font-mono:  'JetBrains Mono', 'Fira Code', 'Cascadia Code',
                'Consolas', monospace;                           /* chrome + code */
}
```

Use `--font-mono` for: topbar, sidebar labels, status bar, console, code mirror, every block label (`HEAD>`, `<NULL>`, node values, button text in the sandbox toolbar). Use `--font-prose` only for the lesson-reading surface and AI tutor responses.

### 2.7 Color tokens (full palette as CSS vars)

```css
:root {
  /* Surfaces */
  --bg-0:    #07070d;   /* deepest — body */
  --bg-1:    #0f0f1a;   /* panes */
  --bg-2:    #16162a;   /* elevated cards, sidebar bg */
  --bg-3:    #1c1c34;   /* inputs, hover */

  /* Borders */
  --border-subtle: #1f1f3a;
  --border-strong: #2a2a4a;

  /* Text */
  --text-1: #e8e8f8;    /* primary */
  --text-2: #a0a0c0;    /* secondary */
  --text-3: #606080;    /* muted, comments */

  /* Accents — TWO-tone */
  --accent-flow:  #00d4ff;  /* arrows, hyperlinks, focus rings — "data in motion" */
  --accent-state: #00ff9c;  /* live state, status bar, console prompt — "system OK" */
  --accent-warn:  #ffb000;  /* tutorial hints, drag handles */
  --accent-error: #ff4d6d;  /* delete, errors */

  /* Syntax (manual — no library) */
  --syn-keyword: #c792ea;   /* class, new, null, return */
  --syn-type:    #82aaff;   /* Node, int, string */
  --syn-string:  #c3e88d;   /* "text" */
  --syn-number:  #f78c6c;   /* 42 */
  --syn-comment: #546e7a;   /* // */
  --syn-ident:   #eeffff;   /* variable names */
}
```

**Why two accents?** Cyan is now exclusively for *flow* (arrows, links, focus). Terminal-green is exclusively for *state* (status bar, console prompt, live HEAD chain). This semantic split helps students unconsciously parse "motion vs state" — a foundational distinction in pointer logic.

---

## 3. The 3-Click Rule

Every core action must be reachable in ≤3 clicks (or 1 keystroke). Mapped:

| Goal | Click 1 | Click 2 | Click 3 | Keyboard |
|---|---|---|---|---|
| Start the linked-list lesson | (already default landing) | — | — | — |
| Add a node with value 42 | input box | type `42` | `Enter` | `n` then `42` `Enter` |
| Ask AI "מהי רשימה מקושרת?" | sidebar 🤖 | input box | `Enter` | `⌘K` → "שאל" → Enter |
| See the C# for what I just did | (always visible in Code Mirror panel) | — | — | — |
| Delete a node | hover node | × | — | focus node + `d` |
| Clear the board | toolbar `נקה לוח` | — | — | `c` |
| Reset / restart lesson | sidebar 📁 → lesson | reopen | — | `⌘K` → "אפס" |

**The Code Mirror is *always visible*, not behind a click.** That's the point — you never have to ask "what code did I just write?" because it's already on screen.

---

## 4. Code Mirror Panel

### 4.1 Location & behavior

- Lives in the right column of the workspace grid (≈360px wide).
- Header: `📄 LinkedList.cs` with a tab selector: `[ C# ]  [ פסאודו-קוד ]` (toggles which view is shown — only one at a time, to avoid information overload).
- Collapsible: ▶ icon collapses to a 32px gutter, returns on click.
- Contents are *generated*, not user-edited. (No multi-file editor — explicit non-goal.)

### 4.2 Op → C# mapping

| Sandbox op | C# emitted (appended to LinkedList.cs view) | Pseudocode (Hebrew) |
|---|---|---|
| `initHead()` | `Node head = null;` | `אתחל HEAD ל-null` |
| `addNode(42)` (1st) | `head = new Node(42);` | `head ← צומת חדש עם הערך 42` |
| `addNode(17)` (subsequent — append at tail) | `Node n = head;`<br>`while (n.next != null) n = n.next;`<br>`n.next = new Node(17);` | `הלך עד סוף הרשימה`<br>`חבר צומת חדש בערך 17` |
| `deleteNode(id=3)` (middle) | `Node prev = head;`<br>`while (prev.next.id != 3) prev = prev.next;`<br>`prev.next = prev.next.next;` | `מצא את הצומת הקודם`<br>`קשר אותו לצומת שאחרי המחוק` |
| `deleteNode(id=2)` (head case) | `head = head.next;` | `head ← הצומת הבא` |
| `clearBoard()` | `head = null;  // GC will collect the chain` | `head ← null  // האספן יפנה את שאר הצמתים` |
| `drag` | *(no emission — pure visual)* | *(no emission)* |

The mapping is realistic enough to study from but trimmed of edge cases (no length checks, no try/catch). **Acceptable for Bagrut prep — this is the canonical "insert at tail" code.**

### 4.3 Manual syntax highlighting

No library. The code-mirror module emits HTML strings using span classes that match the `--syn-*` palette:

```html
<span class="syn-keyword">Node</span>
<span class="syn-ident">head</span> =
<span class="syn-keyword">new</span>
<span class="syn-type">Node</span>(<span class="syn-number">42</span>);
```

A tiny `tokenize()` regex pass over each emitted line is enough — we know the shape of every line we emit because we author them. **No general-purpose lexer. No DOM-XSS risk because we author every span.**

---

## 5. Tutorial Overlay (3 Hebrew progressive hints)

First-time visitors only (`localStorage` flag — note: storage works in the deployed site; for the artifact preview we'd use in-memory). Three hints, each dismissed by completing the action OR clicking the hint:

1. **Hint 1 (anchored to `אתחל HEAD` button):** `שלום! לחצו כאן כדי לאתחל את ה-HEAD ולראות איך רשימה מקושרת מתחילה.`
2. **Hint 2 (anchored to value input):** `מצוין! עכשיו הקלידו ערך (למשל 42) ולחצו Enter כדי להוסיף צומת.`
3. **Hint 3 (anchored to a node block):** `נהדר! העבירו את העכבר על צומת ולחצו על × כדי למחוק. הקוד C# מתעדכן אוטומטית מימין.`

A small `דלג על הסיור` link in the bottom corner of every hint.

---

## 6. Three Advanced Technological Touches (final selection)

From the candidate list, the **three** we ship in Week 2:

### ✅ Pick 1 — Console Log Panel (bottom)
**Why this over the others:** It's the strongest pedagogical lever. Every click becomes a printed line of code-shaped output. Romi (debugger mindset) will *read* this panel; Idan (ADHD) will get the dopamine of seeing his action immediately reflected; Meirav (teacher) will project this on the wall and narrate `"ראו ילדים, כשלוחצים הוסף, הקריאה היא addNode(42)"`. **One feature, three personas served.**

### ✅ Pick 2 — `⌘K` / `Ctrl+K` Command Palette + Keyboard Shortcuts (h/n/d/c)
**Why this over the others:** The 3-click rule is satisfied with a mouse, but the *feeling* of "I'm a real coder" comes from the keyboard. `⌘K` is the universal IDE gesture in 2026 (VS Code, Linear, Notion, Slack, Raycast). One palette covers: `אתחל HEAD`, `הוסף צומת`, `מחק את האחרון`, `נקה`, `שאל את ה-AI`, `פתח/סגור קונסולה`. The h/n/d/c shortcuts give power users wings without forcing keyboard discovery.

### ✅ Pick 3 — Blinking HEAD Cursor + Subtle CRT Scanlines on the Sandbox Board
**Why these together (counted as one "sensory" touch):** Pure aesthetic, near-zero JS, but they sell the IDE/terminal feel instantly. The blinking `_` after `HEAD>` makes the static SVG feel *alive*, like a debugger is paused there. The CRT scanlines (a 2px repeating linear gradient at 3% opacity) are visible only when you focus on the board — invisible at a glance, atmospheric on a projector.

### ❌ Rejected (and why)
- **Boot splash:** Cute once, friction every reload. Meirav has 45 minutes; she can't afford a splash.
- **Typewriter sound:** Classroom = silence. Hard veto.
- **Matrix divider:** Visual noise, no pedagogical payoff.
- **Terminal toasts (alone):** Replaced by the console panel which does the same job and more.

---

## 7. QA Fix Prioritization Folded Into the Vision

| QA ID | Issue | Disposition in redesign |
|---|---|---|
| **C1** Delete-btn clipped | `overflow:hidden` on `.ll-node` | **Fix in CSS rewrite** — selective `border-radius` on `.cell-data`/`.cell-next`, drop `overflow:hidden`. |
| **H1** Board clips at 400px | `.sandbox-board` overflow + fixed height | **Fix during shell rebuild** — board lives in CSS Grid row with `min-height` and `overflow:visible`; SVG resizes via ResizeObserver. |
| **H2** Hebrew chat broken | English-only keyword map | **Fix in JS** — add `hebrewKeyMap` aliasing layer; normalize before lookup. |
| **H3** Resize unthrottled | every event triggers full render | **Fix in JS** — debounce 120ms; also switch to ResizeObserver on the board element. |
| **M1** RTL arrow direction | Layout LTR even though page is RTL | **Decision: KEEP LTR for now.** Rationale: C# textbooks render linked lists LTR. Mirroring at this stage will cost more than it teaches. Add a future-flag toggle. *Ask Meirav at the pilot — don't ship now.* |
| **M2** `innerHTML = reply` | Static-only XSS surface | **Fix in JS** — hardened by switching to a `setReply(node, html)` helper that whitelists the static `responses` map and uses `textContent` for any future dynamic input. Add explicit comment. |
| **M3** Implicit `initHead()` | UX confusion | **Fix in JS** — replace silent init with a yellow toast hint: `"לחצו תחילה אתחל HEAD"`. The toast is a side-benefit of the new console/toast system. |
| **M4** "Thinking..." English | i18n leak | **Fix in JS** — `"...חושב"`. |
| **M5** dragged flag on clear | Already correct | **Close as won't-fix** (QA agreed). |
| **L1** redundant `position:absolute` | dead JS line | **Fix in JS** during refactor. |
| **L2** mixed onclick/addEventListener | inconsistency | **Fix in HTML/JS** — remove `onclick="sendMessage()"`, wire via `addEventListener`. |
| **L3** missing `aria-label` on × | a11y | **Fix in JS** — add to `createBlockEl`. |
| **L4** keyboard cannot delete | a11y | **Fix in CSS + JS** — `:focus-within` shows ×, plus the global `d` shortcut deletes the focused node. |
| **L5** `clientWidth = 0` on first paint | layout race | **Fix in JS** — wrap initial layout in `requestAnimationFrame` and use `ResizeObserver`. |

**"Free" fixes (closed by the redesign with no extra work):** H1 (board grid), L4 (keyboard shortcut for delete), L5 (ResizeObserver), L1 (touched during rewrite).

---

## 8. Non-Goals (explicit — do NOT build)

- ❌ A real syntax-highlighter library (Prism, highlight.js). Manual span classes only.
- ❌ A multi-file code editor (no Monaco, no CodeMirror). The Code Mirror panel is **read-only** generated text.
- ❌ User accounts, login, session save. (Phase 2.)
- ❌ A real LLM in the chat. Static response map + Hebrew aliases only this week.
- ❌ Any framework (React, Vue, Svelte). Vanilla.
- ❌ A build step (no Vite, no esbuild). Files served as-is.
- ❌ Sound. Classroom-incompatible.
- ❌ A backend.
- ❌ Mirroring the sandbox arrows for RTL. (Defer to pilot feedback.)
- ❌ Animations longer than 200ms. We have a 200ms budget for all interactions.

---

## 9. Task list for software agents (Week 2 sprint)

### Task A — `[Engineer]` Site shell skeleton + design tokens
**Files:** `index.html`, `css/style.css` (new sections at top)
**Acceptance:**
- CSS Grid layout with topbar / sidebar (right) / main / code-mirror / console / statusbar.
- Full color + typography tokens added per §2.6/§2.7.
- All Week-1 sections (sandbox, chat, topics, about) re-homed inside the grid as panes that show/hide based on sidebar selection.
- Page still validates, no JS errors.
**QA closed:** none directly (sets the stage).

### Task B — `[Frontend]` Sandbox CSS rebuild + QA visual fixes
**Files:** `css/style.css` (sandbox section)
**Acceptance:**
- Apply C1 fix: drop `overflow:hidden` from `.ll-node`, selective `border-radius` on cells.
- Apply H1 fix: `.sandbox-board` `overflow:visible`, dynamic min-height.
- L4: `:focus-within` reveals delete button.
- Visual harmony with new tokens (mono font on labels, terminal-green for `HEAD>`/`<NULL>`, cyan arrows kept).
- Subtle CRT scanline overlay on `#sandbox-board` (3% opacity).
**QA closed:** C1, H1, L4.

### Task C — `[Engineer]` State engine + Code Mirror generator + Console logger
**Files:** `js/main.js` (new module section)
**Acceptance:**
- `state` object owns the linked list; every mutation flows through `dispatch(action)`.
- Each action emits (1) C# code line(s), (2) Hebrew pseudocode line(s), (3) console log entry, (4) status-bar snapshot string.
- `renderCodeMirror(view)` paints highlighted spans from the emitted code.
- `console.log` panel scrolls with new entries and supports a `נקה` button.
- Op → emission table from §4.2 is implemented exactly.
- `"Thinking..."` becomes `"...חושב"`.
**QA closed:** M3, M4.

### Task D — `[Engineer]` Keyboard shortcuts + ⌘K command palette + tutorial overlay
**Files:** `js/main.js`, `css/style.css`
**Acceptance:**
- Global keymap: `h` initHead, `n` focus value input, `Enter` (in input) addNode, `d` delete focused node, `c` clear, `?` show shortcut cheat sheet, `Esc` close any overlay.
- `Ctrl+K` / `⌘K` opens command palette with the actions in Hebrew (with English subtitles for vocab building).
- 3-step Hebrew tutorial overlay shown on first visit (in-memory flag for artifact, localStorage for prod) per §5.
**QA closed:** L4 (keyboard delete).

### Task E — `[Engineer]` Hebrew chat aliasing + hardened reply rendering
**Files:** `js/main.js`
**Acceptance:**
- `hebrewKeyMap` per §H2 in QA report. Lookup normalizes Hebrew → English key, then resolves `responses`.
- `setReply()` helper enforces that only `responses[key]` and `defaultResponse` are passed to `innerHTML`; user input only ever goes through `textContent`.
- Resize handler debounced 120ms.
- Remove inline `onclick="sendMessage()"`; wire via `addEventListener`.
- Add `aria-label="מחק צומת"` in `createBlockEl()`.
- Drop redundant `el.style.position = "absolute"` line.
**QA closed:** H2, H3, M2, L1, L2, L3.

### Task F — `[QA]` Verification pass on the new build
**Files:** `QA_REPORT_V2.md` (new)
**Acceptance:**
- Walk every critical/high/medium issue; mark Fixed / Deferred / Won't-fix with line references.
- Test the new shell on 1920×1080 (projector) and 1280×720 (laptop).
- Confirm Hebrew chat resolves at least 6 keywords end-to-end.
- Confirm keyboard-only flow can: init head, add 3 nodes, delete middle node, clear.
- Confirm Code Mirror output matches §4.2 mapping table for a 5-step session.
- File any new issues found.

---

## Sequencing

1. **Day 1–2:** Task A (shell) — unblocks everything else.
2. **Day 2:** Task B (sandbox CSS) in parallel with…
3. **Day 2–3:** Task C (state engine + code mirror + console).
4. **Day 3:** Task E (chat fixes — small, do anytime).
5. **Day 4:** Task D (keyboard + palette + tutorial).
6. **Day 5:** Task F (QA) → polish day before pilot.

## Success metrics for the pilot

- A first-time student reaches "3 nodes on the board with the C# code visible to them" in **under 90 seconds** (was: ~150s in Week-1 internal tests).
- ≥80% of pilot students can verbally explain `prev.next = prev.next.next;` after 5 minutes with the tool.
- Meirav rates classroom usability ≥4/5 with no "how do I…" questions during projection.

— *End of brief.*