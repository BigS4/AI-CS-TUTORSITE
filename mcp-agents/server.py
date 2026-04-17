#!/usr/bin/env python3
"""
Visual CS Tutor — AI Agent Team MCP Server

Exposes a team of specialized AI agents to Claude Desktop:
  - Product Manager    : task planning, PRD alignment, sprint management
  - Frontend Developer : HTML/CSS/JS, Hebrew RTL UI, visual sandbox
  - Backend Developer  : API design, server logic, data models
  - QA Engineer        : testing, bug reports, validation
  - Software Engineer  : architecture, code review, technical specs

Each agent is powered by Ollama (llama3.1:8b, runs locally — no API key needed)
and has access to project files and a shared task board.
Use these tools from Claude Desktop to assign work, and the agent will read files,
make changes, and report back.

Transport: stdio (for Claude Desktop / Cowork)
Requires:  Ollama running on http://localhost:11434  (ollama serve)
           Model pulled:  ollama pull llama3.1:8b
"""

import json
import os
import sys
import urllib.request
from pathlib import Path
from typing import Optional, List
from enum import Enum
from datetime import datetime, timezone

from pydantic import BaseModel, Field, ConfigDict, field_validator
from mcp.server.fastmcp import FastMCP

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# ─────────────────────────────────────────────
# Server init
# ─────────────────────────────────────────────
mcp = FastMCP("cs_tutor_agents_mcp")

# ─────────────────────────────────────────────
# Path constants
# ─────────────────────────────────────────────
AGENTS_DIR  = Path(__file__).parent.resolve()
PROJECT_ROOT = AGENTS_DIR.parent.resolve()   # …/Visual CS Tutor/
TASKS_FILE  = AGENTS_DIR / "tasks.json"
CONTEXT_FILE = AGENTS_DIR / "PROJECT_CONTEXT.md"

# Files agents are allowed to read/write (relative to PROJECT_ROOT)
ALLOWED_EXTENSIONS = {".html", ".css", ".js", ".md", ".json", ".txt", ".ts", ".py"}

# ─────────────────────────────────────────────
# Agent model & roles
# ─────────────────────────────────────────────
OLLAMA_BASE_URL = "http://localhost:11434/v1"
OLLAMA_MODEL    = "llama3.1:8b"
MAX_AGENT_TURNS = 10   # max agentic loop iterations per run

AGENT_ROLES = {
    "pm": {
        "title": "Product Manager",
        "emoji": "📋",
        "system": """You are the Product Manager for Visual CS Tutor, an interactive web-based
data structure visualization platform for Israeli high school CS students (grades 10-11).
The site is in Hebrew (RTL layout). The MVP focuses on Linked List visualization using
HTML/CSS/JavaScript with drag-and-drop nodes and animated arrows.

Your responsibilities:
- Break down the PRD into concrete tasks on the task board
- Write clear, actionable user stories with acceptance criteria
- Prioritize work for the 2-week sprint
- Identify blockers and dependencies
- Review completed work against PRD requirements
- Keep the task board accurate and up to date

Always produce structured output: task lists, sprint plans, or status reports.
Reference specific PRD sections when creating tasks. Be specific about acceptance criteria.""",
    },
    "frontend": {
        "title": "Frontend Developer",
        "emoji": "🎨",
        "system": """You are the Frontend Developer for Visual CS Tutor, an interactive Hebrew-language
(RTL) educational web platform for Israeli high school CS students.

Tech stack: Vanilla HTML5, CSS3, JavaScript (ES6+). No frameworks — must work in any browser
without installation. The product is a visual linked-list sandbox where students can:
- Initialize a HEAD pointer
- Add/delete nodes with custom values
- See arrows animate between nodes
- Drag nodes around the canvas

Your responsibilities:
- Write clean, semantic HTML with RTL (dir="rtl") support
- Build CSS with CSS custom properties; dark theme preferred
- Write ES6+ JavaScript for the interactive sandbox logic
- Use SVG for dynamic arrow rendering between nodes
- Ensure the UI works on a classroom projector (1920x1080) and laptops (1280x720)
- All user-facing text must be in Hebrew

When writing code: output complete files (not snippets). Explain what changed and why.
Always verify your code is syntactically correct before marking a task complete.""",
    },
    "backend": {
        "title": "Backend Developer",
        "emoji": "⚙️",
        "system": """You are the Backend Developer for Visual CS Tutor.

MVP note: The MVP is a fully static frontend — no server or database required.
Your current role focuses on:
- Designing JSON data models for linked list state persistence (localStorage)
- Planning future API endpoints for Phase 2 (user accounts, session saving)
- Writing any Node.js/Python utility scripts needed for the project
- Designing the architecture for when a backend becomes necessary (Phase 2+)
- Reviewing frontend JS for state management quality

For the MVP, produce: data model specs, JSON schemas, architecture decision records (ADRs),
and future API blueprints. Be explicit about what is MVP vs future work.""",
    },
    "qa": {
        "title": "QA Engineer",
        "emoji": "🧪",
        "system": """You are the QA Engineer for Visual CS Tutor.

Your responsibilities:
- Write test plans for each feature (Board Setup, Node Creation, Arrow Rendering, Drag & Drop, Delete)
- Create manual test cases with clear steps, expected results, and pass/fail criteria
- Review code for potential bugs, edge cases, and accessibility issues
- Validate that Hebrew RTL layout renders correctly
- Check cross-browser compatibility (Chrome, Firefox, Safari)
- Write bug reports with: steps to reproduce, expected vs actual behavior, severity level
- Verify features against acceptance criteria in the task board
- Check performance: all actions should complete within 200ms

When reviewing code, read the actual files and produce a structured QA report with:
1. Features tested
2. Test cases (pass/fail)
3. Bugs found (with severity: Critical/High/Medium/Low)
4. Recommendations""",
    },
    "engineer": {
        "title": "Software Engineer",
        "emoji": "🔧",
        "system": """You are the Lead Software Engineer / Architect for Visual CS Tutor.

Your responsibilities:
- Review code quality, structure, and architecture
- Ensure the codebase is maintainable and scalable
- Write technical specs for complex features (e.g., SVG arrow rendering, drag-and-drop)
- Identify technical debt and propose refactoring
- Document component interfaces and data flows
- Review and approve architectural decisions
- Ensure the JavaScript sandbox logic is clean and bug-free

When reviewing: read all relevant files, check for: separation of concerns, DRY principle,
error handling, edge cases, performance, and code readability.
Produce: architecture diagrams (as ASCII/Markdown), technical specs, or code review reports.""",
    },
}

# ─────────────────────────────────────────────
# Task board utilities
# ─────────────────────────────────────────────
def _load_tasks() -> dict:
    """Load the task board from disk. Returns empty board if file missing."""
    if not TASKS_FILE.exists():
        return {"tasks": [], "next_id": 1}
    with open(TASKS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_tasks(board: dict) -> None:
    """Persist the task board to disk."""
    with open(TASKS_FILE, "w", encoding="utf-8") as f:
        json.dump(board, f, indent=2, ensure_ascii=False)

def _format_tasks_md(board: dict) -> str:
    """Format the task board as a Markdown string for agent context."""
    tasks = board.get("tasks", [])
    if not tasks:
        return "## Task Board\n\n_No tasks yet._"
    lines = ["## Task Board\n"]
    status_order = {"todo": 0, "in_progress": 1, "review": 2, "done": 3, "blocked": 4}
    for task in sorted(tasks, key=lambda t: status_order.get(t["status"], 9)):
        status_emoji = {
            "todo": "⬜", "in_progress": "🔵", "review": "🟡",
            "done": "✅", "blocked": "🔴"
        }.get(task["status"], "⬜")
        lines.append(f"### {status_emoji} [{task['id']}] {task['title']}")
        lines.append(f"**Status:** {task['status']}  |  **Assignee:** {task.get('assignee', 'Unassigned')}")
        lines.append(f"**Priority:** {task.get('priority', 'medium')}  |  **Epic:** {task.get('epic', 'N/A')}")
        if task.get("description"):
            lines.append(f"\n{task['description']}")
        if task.get("notes"):
            lines.append(f"\n💬 _Notes: {task['notes']}_")
        lines.append("")
    return "\n".join(lines)

# ─────────────────────────────────────────────
# File system utilities
# ─────────────────────────────────────────────
def _safe_path(relative_path: str) -> Optional[Path]:
    """Resolve a relative path, ensuring it stays inside PROJECT_ROOT."""
    try:
        resolved = (PROJECT_ROOT / relative_path).resolve()
        # Security: make sure it doesn't escape the project root
        resolved.relative_to(PROJECT_ROOT)
        return resolved
    except (ValueError, Exception):
        return None

def _list_project_files(directory: Path = None, indent: int = 0) -> List[str]:
    """Recursively list project files, excluding hidden dirs and node_modules."""
    root = directory or PROJECT_ROOT
    lines = []
    try:
        for item in sorted(root.iterdir()):
            if item.name.startswith(".") or item.name in {"node_modules", "__pycache__", "mcp-agents"}:
                continue
            prefix = "  " * indent
            if item.is_dir():
                lines.append(f"{prefix}📁 {item.name}/")
                lines.extend(_list_project_files(item, indent + 1))
            elif item.suffix in ALLOWED_EXTENSIONS:
                size = item.stat().st_size
                lines.append(f"{prefix}📄 {item.name}  ({size:,} bytes)")
    except PermissionError:
        pass
    return lines

# ─────────────────────────────────────────────
# Agent runner (calls Claude API in agentic loop)
# ─────────────────────────────────────────────
def _build_agent_context() -> str:
    """Build the project context string injected into every agent's prompt."""
    ctx_parts = []

    # Project context file
    if CONTEXT_FILE.exists():
        ctx_parts.append(CONTEXT_FILE.read_text(encoding="utf-8"))

    # Task board
    board = _load_tasks()
    ctx_parts.append(_format_tasks_md(board))

    return "\n\n---\n\n".join(ctx_parts)


# Tools available to agents during their agentic loop (OpenAI function-calling format)
AGENT_TOOL_DEFS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the contents of a project file. Use relative paths from the project root (e.g. 'index.html', 'css/style.css', 'js/main.js').",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path from project root"}
                },
                "required": ["path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Write or update a project file. Creates the file if it doesn't exist. Use relative paths from project root.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path from project root"},
                    "content": {"type": "string", "description": "Full file content to write"}
                },
                "required": ["path", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": "List all files in the project (or a subdirectory). Use '.' for the project root.",
            "parameters": {
                "type": "object",
                "properties": {
                    "directory": {"type": "string", "description": "Relative path of directory to list (default: '.')"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_task",
            "description": "Update a task's status, notes, or assignee on the shared task board.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer", "description": "Task ID to update"},
                    "status": {"type": "string", "enum": ["todo", "in_progress", "review", "done", "blocked"],
                               "description": "New status"},
                    "notes": {"type": "string", "description": "Progress notes or completion summary"},
                    "assignee": {"type": "string", "description": "Who this task is assigned to"}
                },
                "required": ["task_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Create a new task on the shared task board.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Short task title"},
                    "description": {"type": "string", "description": "Detailed task description and acceptance criteria"},
                    "assignee": {"type": "string", "description": "Agent role: pm, frontend, backend, qa, engineer"},
                    "priority": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
                    "epic": {"type": "string", "description": "Epic name (e.g. E1-Initialization, E5-Localization)"}
                },
                "required": ["title", "description"]
            }
        }
    }
]

def _execute_agent_tool(tool_name: str, tool_input: dict) -> str:
    """Execute an agent's tool call and return the result string."""
    if tool_name == "read_file":
        path = _safe_path(tool_input["path"])
        if path is None:
            return "Error: Path not allowed (must be inside project root)"
        if not path.exists():
            return f"Error: File not found: {tool_input['path']}"
        if path.suffix not in ALLOWED_EXTENSIONS:
            return f"Error: File type not allowed: {path.suffix}"
        return path.read_text(encoding="utf-8")

    elif tool_name == "write_file":
        path = _safe_path(tool_input["path"])
        if path is None:
            return "Error: Path not allowed"
        if path.suffix not in ALLOWED_EXTENSIONS:
            return f"Error: File type not allowed: {path.suffix}"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(tool_input["content"], encoding="utf-8")
        return f"✅ Written {len(tool_input['content'])} characters to {tool_input['path']}"

    elif tool_name == "list_files":
        directory = tool_input.get("directory", ".")
        dir_path = _safe_path(directory) if directory != "." else PROJECT_ROOT
        if dir_path is None or not dir_path.is_dir():
            return "Error: Directory not found or not allowed"
        lines = _list_project_files(dir_path)
        return "\n".join(lines) if lines else "Directory is empty"

    elif tool_name == "update_task":
        board = _load_tasks()
        task_id = tool_input["task_id"]
        for task in board["tasks"]:
            if task["id"] == task_id:
                if "status" in tool_input:
                    task["status"] = tool_input["status"]
                if "notes" in tool_input:
                    task["notes"] = tool_input["notes"]
                if "assignee" in tool_input:
                    task["assignee"] = tool_input["assignee"]
                task["updated_at"] = datetime.now(timezone.utc).isoformat()
                _save_tasks(board)
                return f"✅ Task [{task_id}] updated: status={task.get('status')}"
        return f"Error: Task [{task_id}] not found"

    elif tool_name == "create_task":
        board = _load_tasks()
        new_task = {
            "id": board["next_id"],
            "title": tool_input["title"],
            "description": tool_input["description"],
            "status": "todo",
            "assignee": tool_input.get("assignee", "Unassigned"),
            "priority": tool_input.get("priority", "medium"),
            "epic": tool_input.get("epic", ""),
            "notes": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        board["tasks"].append(new_task)
        board["next_id"] += 1
        _save_tasks(board)
        return f"✅ Task [{new_task['id']}] created: {new_task['title']}"

    return f"Error: Unknown tool '{tool_name}'"


def _check_ollama_running() -> Optional[str]:
    """Return an error string if Ollama is not reachable, or None if it's up."""
    try:
        urllib.request.urlopen("http://localhost:11434", timeout=3)
        return None
    except Exception:
        return (
            "Error: Ollama is not running.\n"
            "Start it with:  ollama serve\n"
            "Then make sure the model is pulled:  ollama pull llama3.1:8b\n"
            "Then retry."
        )


def _run_agent(role_key: str, task: str) -> str:
    """
    Run an agent with the given role on the given task.
    Uses an agentic loop: Ollama (llama3.1:8b) calls tools, tools execute,
    loop continues until the model stops or max turns reached.
    Ollama exposes an OpenAI-compatible API — no API key required.
    """
    if not OPENAI_AVAILABLE:
        return ("Error: The `openai` Python package is not installed.\n"
                "Run: pip install openai\n"
                "Then restart the MCP server.")

    # Make sure Ollama is actually running before attempting any call
    err = _check_ollama_running()
    if err:
        return err

    role = AGENT_ROLES[role_key]
    context = _build_agent_context()

    system_prompt = f"""{role['system']}

---
PROJECT CONTEXT & TASK BOARD:
{context}
---

You have file access tools (read_file, write_file, list_files) and task board tools
(update_task, create_task). Use them as needed to complete your task.
When done, provide a concise summary of everything you did."""

    # Ollama's OpenAI-compatible endpoint — api_key value is ignored but required by the client
    client = openai.OpenAI(
        base_url=OLLAMA_BASE_URL,
        api_key="ollama",
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": task},
    ]

    report_lines = [
        f"# {role['emoji']} {role['title']} — Agent Report",
        f"**Task:** {task}",
        f"**Model:** {OLLAMA_MODEL} (local via Ollama)",
        f"**Started:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "## Actions Taken",
        ""
    ]

    turn = 0
    while turn < MAX_AGENT_TURNS:
        turn += 1
        response = client.chat.completions.create(
            model=OLLAMA_MODEL,
            max_tokens=4096,
            tools=AGENT_TOOL_DEFS,
            messages=messages,
        )

        message = response.choices[0].message
        finish_reason = response.choices[0].finish_reason

        # Capture any text the model produced this turn
        if message.content and message.content.strip():
            report_lines.append(message.content.strip())

        # No tool calls → model is done
        if finish_reason == "stop" or not message.tool_calls:
            messages.append({"role": "assistant", "content": message.content or ""})
            break

        # Append the assistant message (including tool_calls) to history
        messages.append(message)

        # Execute each tool call and feed results back
        for tc in message.tool_calls:
            tool_name  = tc.function.name
            tool_input = json.loads(tc.function.arguments)

            result = _execute_agent_tool(tool_name, tool_input)
            report_lines.append(
                f"\n🔧 **Tool:** `{tool_name}({json.dumps(tool_input, ensure_ascii=False)[:120]})`"
            )
            report_lines.append(f"   ↳ {result[:300]}")

            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result,
            })

    report_lines.append(f"\n---\n_Agent completed in {turn} turn(s)._")
    return "\n".join(report_lines)


# ─────────────────────────────────────────────
# Pydantic input models
# ─────────────────────────────────────────────
class AgentRunInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    task: str = Field(..., description="The task for the agent to complete. Be specific.", min_length=5, max_length=2000)

class FileReadInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    path: str = Field(..., description="Relative path from project root, e.g. 'index.html' or 'css/style.css'")

class FileWriteInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    path: str = Field(..., description="Relative path from project root")
    content: str = Field(..., description="Full file content to write")

class TaskStatusEnum(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"
    BLOCKED = "blocked"

class PriorityEnum(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class TaskCreateInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    title: str = Field(..., description="Short task title", min_length=3, max_length=120)
    description: str = Field(..., description="Detailed description and acceptance criteria")
    assignee: str = Field(default="Unassigned", description="Agent role: pm, frontend, backend, qa, engineer")
    priority: PriorityEnum = Field(default=PriorityEnum.MEDIUM)
    epic: str = Field(default="", description="Epic name (e.g. E1-Initialization)")

class TaskUpdateInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    task_id: int = Field(..., description="Task ID to update", ge=1)
    status: Optional[TaskStatusEnum] = Field(default=None)
    notes: Optional[str] = Field(default=None, description="Progress notes")
    assignee: Optional[str] = Field(default=None)


# ─────────────────────────────────────────────
# MCP Tool Definitions
# ─────────────────────────────────────────────

# ── Agent tools ──

@mcp.tool(name="cs_tutor_run_pm_agent",
          annotations={"title": "Run Product Manager Agent", "readOnlyHint": False,
                        "destructiveHint": False, "openWorldHint": False})
async def cs_tutor_run_pm_agent(params: AgentRunInput) -> str:
    """Run the Product Manager agent on a task.

    The PM agent can: read the PRD, create and update tasks on the task board,
    write sprint plans, prioritize work, and verify feature alignment with requirements.

    Args:
        params.task: What you want the PM to do. Examples:
          - "Break down Epic E1 (Initialization) into individual tasks on the board"
          - "Review the current task board and reprioritize for the 2-week MVP sprint"
          - "Write acceptance criteria for the Node Creation user story"

    Returns:
        str: The agent's full report including actions taken and files/tasks modified.
    """
    return _run_agent("pm", params.task)


@mcp.tool(name="cs_tutor_run_frontend_agent",
          annotations={"title": "Run Frontend Developer Agent", "readOnlyHint": False,
                        "destructiveHint": False, "openWorldHint": False})
async def cs_tutor_run_frontend_agent(params: AgentRunInput) -> str:
    """Run the Frontend Developer agent on a task.

    The frontend agent can: read and write HTML/CSS/JS files, implement new UI features,
    fix visual bugs, add Hebrew RTL support, and improve the visual sandbox.

    Args:
        params.task: What you want the frontend dev to implement. Examples:
          - "Implement the Hebrew RTL layout for the navbar and hero section"
          - "Build the node creation feature: input field + Add Node button"
          - "Add SVG arrow rendering that connects nodes dynamically"

    Returns:
        str: The agent's report including code written and files modified.
    """
    return _run_agent("frontend", params.task)


@mcp.tool(name="cs_tutor_run_backend_agent",
          annotations={"title": "Run Backend Developer Agent", "readOnlyHint": False,
                        "destructiveHint": False, "openWorldHint": False})
async def cs_tutor_run_backend_agent(params: AgentRunInput) -> str:
    """Run the Backend Developer agent on a task.

    The backend agent can: design JSON data models, plan future APIs, write architecture
    decision records, and review frontend state management code.

    Args:
        params.task: What you want the backend dev to do. Examples:
          - "Design the JSON data model for persisting linked list state in localStorage"
          - "Plan the Phase 2 REST API for user accounts and session saving"
          - "Review the JS state management in main.js for correctness"

    Returns:
        str: The agent's technical spec, architecture document, or code review.
    """
    return _run_agent("backend", params.task)


@mcp.tool(name="cs_tutor_run_qa_agent",
          annotations={"title": "Run QA Engineer Agent", "readOnlyHint": False,
                        "destructiveHint": False, "openWorldHint": False})
async def cs_tutor_run_qa_agent(params: AgentRunInput) -> str:
    """Run the QA Engineer agent on a task.

    The QA agent can: write test plans, create manual test cases, review code for bugs,
    check Hebrew RTL rendering, verify feature acceptance criteria, and file bug reports.

    Args:
        params.task: What you want QA to test or review. Examples:
          - "Write a full test plan for the linked list sandbox MVP"
          - "Review index.html and js/main.js for bugs and edge cases"
          - "Create test cases for node creation and arrow rendering features"

    Returns:
        str: The agent's QA report with test cases, bugs found, and recommendations.
    """
    return _run_agent("qa", params.task)


@mcp.tool(name="cs_tutor_run_engineer_agent",
          annotations={"title": "Run Software Engineer Agent", "readOnlyHint": False,
                        "destructiveHint": False, "openWorldHint": False})
async def cs_tutor_run_engineer_agent(params: AgentRunInput) -> str:
    """Run the Software Engineer / Architect agent on a task.

    The engineer agent can: review code quality and architecture, write technical specs,
    identify refactoring opportunities, and document component interfaces.

    Args:
        params.task: What you want the engineer to do. Examples:
          - "Review all project files and produce an architecture overview"
          - "Write a technical spec for SVG arrow rendering with dynamic updates"
          - "Code review js/main.js — check for DRY violations and edge cases"

    Returns:
        str: The agent's technical review, spec, or architecture document.
    """
    return _run_agent("engineer", params.task)


# ── Task board tools ──

@mcp.tool(name="cs_tutor_list_tasks",
          annotations={"title": "List Task Board", "readOnlyHint": True,
                        "destructiveHint": False, "idempotentHint": True, "openWorldHint": False})
async def cs_tutor_list_tasks() -> str:
    """List all tasks on the shared project task board.

    Returns all tasks grouped by status (todo, in_progress, review, done, blocked)
    with their IDs, titles, assignees, priorities, and notes.

    Returns:
        str: Markdown-formatted task board overview.
    """
    board = _load_tasks()
    return _format_tasks_md(board) or "No tasks found."


@mcp.tool(name="cs_tutor_create_task",
          annotations={"title": "Create Task", "readOnlyHint": False,
                        "destructiveHint": False, "idempotentHint": False, "openWorldHint": False})
async def cs_tutor_create_task(params: TaskCreateInput) -> str:
    """Create a new task on the shared project task board.

    Args:
        params.title: Short task title (e.g. "Implement HEAD pointer initialization")
        params.description: Detailed description + acceptance criteria
        params.assignee: Agent role (pm, frontend, backend, qa, engineer)
        params.priority: critical / high / medium / low
        params.epic: Epic reference (e.g. "E1-Initialization")

    Returns:
        str: Confirmation with the new task ID.
    """
    board = _load_tasks()
    new_task = {
        "id": board["next_id"],
        "title": params.title,
        "description": params.description,
        "status": "todo",
        "assignee": params.assignee,
        "priority": params.priority.value,
        "epic": params.epic,
        "notes": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    board["tasks"].append(new_task)
    board["next_id"] += 1
    _save_tasks(board)
    return f"✅ Task [{new_task['id']}] created: **{params.title}**  (priority: {params.priority.value}, assignee: {params.assignee})"


@mcp.tool(name="cs_tutor_update_task",
          annotations={"title": "Update Task", "readOnlyHint": False,
                        "destructiveHint": False, "idempotentHint": True, "openWorldHint": False})
async def cs_tutor_update_task(params: TaskUpdateInput) -> str:
    """Update a task's status, notes, or assignee on the task board.

    Args:
        params.task_id: ID of the task to update
        params.status: New status (todo / in_progress / review / done / blocked)
        params.notes: Progress notes or completion summary
        params.assignee: Reassign to a different agent role

    Returns:
        str: Confirmation of the update.
    """
    board = _load_tasks()
    for task in board["tasks"]:
        if task["id"] == params.task_id:
            if params.status is not None:
                task["status"] = params.status.value
            if params.notes is not None:
                task["notes"] = params.notes
            if params.assignee is not None:
                task["assignee"] = params.assignee
            task["updated_at"] = datetime.now(timezone.utc).isoformat()
            _save_tasks(board)
            return f"✅ Task [{params.task_id}] updated → status: {task['status']}, notes: {task.get('notes', '')[:80]}"
    return f"Error: Task [{params.task_id}] not found. Use cs_tutor_list_tasks to see available IDs."


# ── File tools ──

@mcp.tool(name="cs_tutor_list_files",
          annotations={"title": "List Project Files", "readOnlyHint": True,
                        "destructiveHint": False, "idempotentHint": True, "openWorldHint": False})
async def cs_tutor_list_files() -> str:
    """List all source files in the Visual CS Tutor project.

    Returns:
        str: Tree view of project files with sizes.
    """
    lines = _list_project_files()
    header = f"## Visual CS Tutor — Project Files\n📁 {PROJECT_ROOT}\n\n"
    return header + ("\n".join(lines) if lines else "No files found.")


@mcp.tool(name="cs_tutor_read_file",
          annotations={"title": "Read Project File", "readOnlyHint": True,
                        "destructiveHint": False, "idempotentHint": True, "openWorldHint": False})
async def cs_tutor_read_file(params: FileReadInput) -> str:
    """Read the content of a project file.

    Args:
        params.path: Relative path from project root (e.g. 'index.html', 'css/style.css')

    Returns:
        str: Full file content, or an error message.
    """
    path = _safe_path(params.path)
    if path is None:
        return "Error: Path is outside project root or invalid."
    if not path.exists():
        return f"Error: File not found: {params.path}"
    if path.suffix not in ALLOWED_EXTENSIONS:
        return f"Error: File type '{path.suffix}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
    content = path.read_text(encoding="utf-8")
    return f"## {params.path}\n\n```{path.suffix.lstrip('.')}\n{content}\n```"


@mcp.tool(name="cs_tutor_write_file",
          annotations={"title": "Write Project File", "readOnlyHint": False,
                        "destructiveHint": True, "idempotentHint": False, "openWorldHint": False})
async def cs_tutor_write_file(params: FileWriteInput) -> str:
    """Write or update a project file (creates it if it doesn't exist).

    WARNING: This overwrites the existing file completely. Read the file first
    if you only want to make partial changes.

    Args:
        params.path: Relative path from project root
        params.content: Full file content to write

    Returns:
        str: Confirmation with file path and byte count.
    """
    path = _safe_path(params.path)
    if path is None:
        return "Error: Path is outside project root or invalid."
    if path.suffix not in ALLOWED_EXTENSIONS:
        return f"Error: File type '{path.suffix}' not allowed."
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(params.content, encoding="utf-8")
    return f"✅ Written {len(params.content.encode('utf-8')):,} bytes to `{params.path}`"


@mcp.tool(name="cs_tutor_get_project_context",
          annotations={"title": "Get Project Context", "readOnlyHint": True,
                        "destructiveHint": False, "idempotentHint": True, "openWorldHint": False})
async def cs_tutor_get_project_context() -> str:
    """Get the full project context: PRD summary + current task board.

    Use this before running any agent to understand the current state of the project.

    Returns:
        str: Project overview, goals, MVP scope, and current task board.
    """
    return _build_agent_context()


# ─────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────
if __name__ == "__main__":
    mcp.run()
