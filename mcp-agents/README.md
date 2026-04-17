# Visual CS Tutor — AI Agent Team MCP Server

This MCP server gives you a team of 5 AI agents that work on the Visual CS Tutor project.
Connect it to Claude Desktop and you can tell Claude to "run the frontend agent on task 3"
— and it will actually read your files, write code, and report back.

## Agents

| Agent | Tool name | What it does |
|-------|-----------|-------------|
| 📋 Product Manager | `cs_tutor_run_pm_agent` | Plans tasks, writes user stories, manages sprint |
| 🎨 Frontend Dev | `cs_tutor_run_frontend_agent` | Writes HTML/CSS/JS, implements the sandbox |
| ⚙️ Backend Dev | `cs_tutor_run_backend_agent` | Data models, API design, architecture docs |
| 🧪 QA Engineer | `cs_tutor_run_qa_agent` | Test plans, bug reports, code review |
| 🔧 Software Engineer | `cs_tutor_run_engineer_agent` | Code review, architecture, technical specs |

## Other Tools

| Tool | What it does |
|------|-------------|
| `cs_tutor_list_tasks` | See the full task board |
| `cs_tutor_create_task` | Add a new task |
| `cs_tutor_update_task` | Update task status / notes |
| `cs_tutor_list_files` | See all project files |
| `cs_tutor_read_file` | Read any project file |
| `cs_tutor_write_file` | Write / update a project file |
| `cs_tutor_get_project_context` | Full PRD summary + task board |

---

## Setup (One Time)

### Step 1 — Install Python dependencies

Open your Terminal / Command Prompt and run:

```bash
pip install mcp openai pydantic
```

> The `openai` package is used as the HTTP client for Ollama's OpenAI-compatible API.
> No API key or cloud account needed — everything runs locally on your machine.

### Step 2 — Install Ollama and pull the model

If you haven't already:

1. Download Ollama from https://ollama.com and install it
2. Open Terminal / Command Prompt and run:

```bash
ollama pull llama3.1:8b
```

3. Start the Ollama server (keep this running in the background):

```bash
ollama serve
```

> Ollama usually starts automatically after install. If `ollama serve` says "already running", that's fine.

### Step 3 — Add to Claude Desktop config

Open Claude Desktop → Settings → Developer → Edit Config.

Add this to the `mcpServers` section — **no API key needed**:

**Windows:**
```json
{
  "mcpServers": {
    "cs-tutor-agents": {
      "command": "python",
      "args": ["C:\\Users\\super\\OneDrive\\Documents\\Claude\\Projects\\Visual CS Tutor\\mcp-agents\\server.py"]
    }
  }
}
```

**Mac:**
```json
{
  "mcpServers": {
    "cs-tutor-agents": {
      "command": "python3",
      "args": ["/Users/YOUR_NAME/path/to/Visual CS Tutor/mcp-agents/server.py"]
    }
  }
}
```

### Step 4 — Restart Claude Desktop

After saving the config, restart Claude Desktop. You should see the tools available.

---

## How to Use

Once connected, just talk to Claude naturally:

> "Show me the current task board"
→ Claude calls `cs_tutor_list_tasks`

> "Run the frontend agent on task 2 — build the visual sandbox section"
→ Claude calls `cs_tutor_run_frontend_agent` with that task

> "Ask the PM agent to break down the MVP into a sprint plan"
→ Claude calls `cs_tutor_run_pm_agent`

> "Run QA review on the current index.html"
→ Claude calls `cs_tutor_run_qa_agent`

---

## How Agents Work

When you run an agent, here's what happens:
1. The server loads the PROJECT_CONTEXT.md + current task board
2. It calls Claude API (claude-sonnet-4-6) with a role-specific system prompt
3. Claude (as that agent) uses tools to read/write your actual project files
4. The agent loops until the task is done (max 10 turns)
5. You get a full repor