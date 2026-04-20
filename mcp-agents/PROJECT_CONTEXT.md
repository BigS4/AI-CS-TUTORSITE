# Visual CS Tutor — Project Context

## What We're Building
An interactive, Hebrew-language (RTL) web platform for Israeli high school CS students (grades 10-11).
Students use it to visualize Linked List data structures — nodes, arrows, HEAD pointer, NULL — as
they learn C# programming for the Bagrut exam.

**Stack:** Vanilla HTML5 / CSS3 / JavaScript (ES6+). No frameworks. No backend (MVP).
**Language:** Hebrew (RTL). `dir="rtl"` on the body element.
**Target devices:** Classroom projector (1920×1080) + student laptops (1280×720).

## MVP Scope (2 weeks)
Must Have:
- HEAD pointer initialization (renders HEAD → NULL on canvas)
- Create Node: input + button → node block with data value + next slot
- Dynamic SVG arrows connecting nodes (last node always → NULL)
- Delete node: list re-links automatically
- Clear Board: resets canvas to empty state
- Hebrew RTL layout for all UI elements
- Responsive for projector + laptop

Should Have:
- Drag & Drop repositioning of nodes (arrows follow)

Out of Scope:
- Binary Trees, Arrays, Stacks (Phase 2)
- User accounts, login, session saving (Phase 2)
- AI question parsing (Phase 3)
- Backend server (Phase 2)

## Key User Personas
- **Romi (17, grade 11):** High achiever stuck on pointer logic. Needs precise visualization to verify mental model.
- **Idan (16, grade 10):** ADHD, hands-on learner. Needs interactive UI with immediate visual feedback.
- **Meirav (38, teacher):** Uses it on projector. Needs zero-setup, intuitive tool.

## File Structure
```
Visual CS Tutor/
├── index.html          ← Main page (navbar, hero, topics, chat, sandbox sections)
├── css/style.css       ← All styles (dark theme, RTL, CSS custom properties)
├── js/main.js          ← Interactive logic (chat, sandbox will be here)
├── README.md           ← Project readme
└── mcp-agents/         ← This MCP server (not a website file)
    ├── server.py
    ├── tasks.json
    └── PROJECT_CONTEXT.md
```

## Success Criteria
- Time to first node link: < 2 minutes for a new user
- All actions complete in < 200ms
- 3–5 pilot sessions run before Bagrut exam window
- ≥ 30% reduction in pointer-logic errors post-session

## Visual Design: Retro CMD Aesthetic

The sandbox visualization board (#sandbox-board) must adopt a **retro terminal / CMD command-prompt aesthetic** for all data structure blocks. This design direction reinforces the C# memory-model mental model by making students feel like they are operating a real debugger or terminal.

### Scope
This aesthetic applies **only** to the `#sandbox-board` container and its blocks. The navbar, hero, chat, topics, and footer sections retain the existing dark purple/blue theme.

### Color Palette (sandbox board only)
| Element | Background | Text / Border |
|---|---|---|
| Board background | `#001100` (deep terminal green) or `#0a0a0a` | — |
| Node block | `#001a00` | `#00ff41` (matrix green) |
| HEAD block | `#001a00` | `#00ff41` bold |
| NULL block | `#0a0a0a` | `#4a7c4a` (muted green) |
| Arrow / SVG line | — | `#00d4ff` (cyan) or `#00ff41` |
| Board border | — | `1px solid #00ff41` (terminal frame) |

Alternative amber palette: swap `#00ff41` → `#ffb000`, `#001a00` → `#1a0f00` for a classic DOS amber look.

### Typography
- Font family: `'Courier New', Consolas, 'Courier Prime', monospace`
- No rounded corners on blocks — use `border-radius: 2px` maximum
- Uppercase labels preferred for HEAD and NULL

### Block Rendering

**HEAD block:**
```
HEAD>
```
Style: bright green monospace label, solid 1px green border, minimal padding. Optional blinking cursor `_` appended.

**Node block (two-cell):**
```
┌──────┬─────┐
│  42  │ --> │
└──────┴─────┘
```
Rendered as two adjacent cells with a vertical separator. The `-->` in the next-pointer cell is a literal ASCII arrow (not a unicode character), green colored.

**NULL block:**
```
<NULL>
```
Style: muted/dimmed green, `<` `>` angle brackets included in the label, slightly smaller font.

### Arrows (SVG)
- SVG `<line>` stroke color: `#00ff41` or `#00d4ff`
- Arrowhead marker: filled green/cyan triangle
- Consider dashed stroke for the line portion: `stroke-dasharray: "6 3"` for a more terminal feel

### Optional CRT Effect
A subtle CSS scanline overlay can be applied to `#sandbox-board` using a repeating linear gradient:
```css
background-image: repeating-linear-gradient(
  0deg,
  rgba(0, 0, 0, 0.03) 0px,
  rgba(0, 0, 0, 0.03) 1px,
  transparent 1px,
  transparent 2px
);
```

### Interaction States
- Hover on node: border brightens to `#39ff14` (neon green)
- Dragging node: add `box-shadow: 0 0 12px #00ff41` glow
- Delete button: red `#ff4d6d` stays (contrast with green theme intentional — danger color)
