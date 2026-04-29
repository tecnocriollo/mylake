# C4 Model — Component Level: Notebook Editor

**Updated:** 2026-04-29

## Container Diagram

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Browser     │────▶│  Frontend        │────▶│  Backend API    │
│  (any device)│◀────│  (React + Vite)  │◀────│  (Go / Gin)     │
└──────────────┘     └──────────────────┘     └────────┬────────┘
                                                        │
                          ┌─────────────────────────────┼──────────────┐
                          │                             │              │
                          ▼                             ▼              ▼
                   ┌─────────────┐            ┌──────────────┐  ┌──────────────┐
                   │ PostgreSQL  │            │    Marimo    │  │    Spark     │
                   │             │            │  (Python env)│  │  (local mode)│
                   └─────────────┘            └──────────────┘  └──────────────┘
```

> Marimo container provides the Python environment (PySpark, pandas, etc.).
> The backend spawns a persistent REPL process inside it — Marimo's own UI is not exposed.

---

## Component Diagram: Notebook Module

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React + Vite)                         │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                        NotebookEditor.tsx                         │   │
│  │  State: cells[], notebookType, sparkStatus, executionCounter      │   │
│  └──────────────────────┬──────────────────────────┬─────────────────┘   │
│                         │                          │                     │
│            ┌────────────▼──────────┐   ┌──────────▼──────────────────┐  │
│            │   CodeMirrorEditor    │   │     AICellAssistant          │  │
│            │   - Python syntax     │   │  - Chat UI (float panel)    │  │
│            │   - Markdown syntax   │   │  - Model selector           │  │
│            │   - Line numbers      │   │  - Action buttons           │  │
│            └───────────────────────┘   │    (add/modify/explain/run) │  │
│                                        └─────────────────────────────┘  │
│                                                                          │
│  Cell outputs rendered inline (stream, error, markdown preview)          │
│  Bottom toolbar: + Code, + Markdown, cell count                          │
│  Header: notebook name, kernel selector (Python/Spark), status dot,     │
│          Restart, Save, Share, Logs (Spark only)                         │
│                                                                          │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       │ HTTP + JWT
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Go / Gin)                             │
│                                                                          │
│  ┌───────────────┐   ┌─────────────────────┐   ┌──────────────────────┐ │
│  │ JupyterHandler│   │   MarimoHandler      │   │  SparkHandler        │ │
│  │               │   │                     │   │                      │ │
│  │ Notebook I/O  │   │ globalPythonKernel   │   │ globalSparkKernel    │ │
│  │ (read/write   │   │ - persistent REPL    │   │ - persistent REPL    │ │
│  │  .ipynb JSON) │   │ - shared _globals    │   │ - shared _globals    │ │
│  │               │   │ - stdin/stdout       │   │ - spark pre-inited   │ │
│  │ GET  /jupyter/│   │   markers            │   │ - stdin/stdout       │ │
│  │ PUT  /jupyter/│   │                     │   │   markers            │ │
│  │ POST /jupyter/│   │ POST /marimo/execute │   │                      │ │
│  │ DELETE        │   │ POST /marimo/reset   │   │ POST /spark-connect/ │ │
│  └───────────────┘   └─────────────────────┘   │      execute         │ │
│                                                 │ POST /spark-connect/ │ │
│  ┌───────────────────────────────────────────┐  │      reset           │ │
│  │              AIHandler                    │  │ GET  /spark-connect/ │ │
│  │  - POST /ai/chat → Ollama Cloud API       │  │      logs            │ │
│  │  - GET  /ai/models                        │  └──────────────────────┘ │
│  │  - Parses <ACTION> JSON from response     │                           │
│  └───────────────────────────────────────────┘                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Kernel Architecture

Both Python and Spark kernels use the same persistent REPL pattern:

```
Backend process start
  │
  ├── write Python REPL script to temp file
  ├── exec: python -u <script>
  ├── wait for "READY\n" on stdout
  └── kernel ready

Per cell execution:
  │
  ├── write code lines to stdin
  ├── write "___MYLAKE_*_CODE_END___\n" marker
  ├── read stdout until "___MYLAKE_*_OUTPUT_END___\n"
  └── parse "OK:<output>" or "ERR:<traceback>"

State:
  └── _globals dict shared across all cells in the session
```

Kernel reset kills the process. Next execution auto-restarts.

---

## Data Flows

### Execute Python Cell

```
User clicks ▶ Run
  → POST /api/marimo/execute { code }
  → getOrCreatePythonKernel()
  → write code to kernel stdin
  → read output until marker
  → 200 { success, outputs[] }
  → update cell.outputs, increment executionCounter
```

### Execute Spark Cell

```
User clicks ▶ Run (Spark mode)
  → POST /api/spark-connect/execute { code }
  → getOrCreateSparkKernel()
    (starts SparkSession on first call, ~10s)
  → write code to kernel stdin
  → read output until marker
  → 200 { success, outputs[] }
  → update sparkStatus → "running"
```

### AI Action

```
User sends message in AICellAssistant
  → POST /api/ai/chat { message, context, model, selected_cell_id }
  → AIHandler → POST https://ollama.com/api/chat
  → parse <ACTION> JSON blocks from response
  → 200 { content, actions[] }
  → frontend applies actions to cells[]
     add_cell → append new cell
     modify   → replace selected cell source
     explain  → append markdown cell
     run      → trigger executeCell()
```

### Save Notebook

```
User clicks Save
  → build .ipynb JSON from cells[] + metadata.notebook_type
  → PUT /api/jupyter/notebooks/:path
  → JupyterHandler writes to ./notebooks/:path
```

---

## API Surface

| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| GET | `/api/jupyter/notebooks` | JupyterHandler | List .ipynb files |
| GET | `/api/jupyter/notebooks/:path` | JupyterHandler | Read notebook JSON |
| PUT | `/api/jupyter/notebooks/:path` | JupyterHandler | Save notebook JSON |
| POST | `/api/jupyter/notebooks` | JupyterHandler | Create new notebook |
| DELETE | `/api/jupyter/notebooks/:path` | JupyterHandler | Delete notebook |
| POST | `/api/marimo/execute` | MarimoHandler | Execute cell (Python) |
| POST | `/api/marimo/reset` | MarimoHandler | Kill Python kernel |
| GET | `/api/marimo/status` | MarimoHandler | Kernel alive? |
| POST | `/api/spark-connect/execute` | SparkHandler | Execute cell (Spark) |
| POST | `/api/spark-connect/reset` | SparkHandler | Kill Spark kernel |
| GET | `/api/spark-connect/status` | SparkHandler | Kernel alive? |
| GET | `/api/spark-connect/logs` | SparkHandler | Stderr from kernel |
| GET | `/api/ai/models` | AIHandler | List Ollama models |
| POST | `/api/ai/chat` | AIHandler | Chat with AI |
