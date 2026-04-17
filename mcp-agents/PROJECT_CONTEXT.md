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
