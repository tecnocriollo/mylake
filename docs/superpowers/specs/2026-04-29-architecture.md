# MyLake — Architecture Spec (Current)

**Date:** 2026-04-29
**Status:** Living document — reflects deployed state

---

## 1. Overview

MyLake is a personal lakehouse for local development. It provides a web UI for SQL queries and Python/PySpark notebooks, with an AI assistant for cell authoring.

**Key design constraints:**
- Single-user, local-first
- Mobile-friendly (works on phone/tablet)
- No external kernel server (Jupyter removed) — backend owns execution
- `.ipynb` format kept for notebook portability

---

## 2. System Components

| Component | Technology | Role |
|-----------|------------|------|
| Frontend | React + Vite + TailwindCSS | UI |
| Backend | Go + Gin | API, kernel management |
| Python kernel | Persistent REPL (Marimo container) | Execute Python cells |
| Spark kernel | Persistent PySpark REPL | Execute Spark cells |
| AI | Ollama Cloud API | Cell assistant |
| Database | PostgreSQL 16 | Auth, metadata |
| Storage | RustFS (S3-compat) | Object storage |

---

## 3. Kernel Architecture

### Why persistent REPL instead of subprocess-per-cell

Earlier versions spawned `python -c <code>` for each cell. This lost all state between cells — a `df` defined in cell 1 was invisible in cell 2.

The current approach mirrors how Jupyter kernels work: one long-running process per session, with a shared global namespace.

### Implementation

A Python REPL script is written to a temp file at kernel startup. The Go backend communicates via stdin/stdout using delimeter markers:

```
stdin  → code lines + "___MYLAKE_*_CODE_END___"
stdout ← "OK:<output>\n___MYLAKE_*_OUTPUT_END___"
         or
         "ERR:<traceback>\n___MYLAKE_*_OUTPUT_END___"
```

State is kept in a `_globals` dict passed to every `exec()` call. Variables assigned in cell N are available in cell N+1.

There is one global kernel per type (Python, Spark). If the kernel process dies, the next execution auto-restarts it (state is lost — user sees this because execution counter resets).

### Spark specifics

The Spark kernel initializes a `SparkSession` at startup (`local[*]` mode). First execution takes ~10–15s while Spark initializes. Subsequent executions are fast. The UI shows a pulsing "Iniciando..." indicator during this phase.

---

## 4. Notebook Format

Notebooks are stored as standard `.ipynb` JSON files in `./notebooks/`. The format is compatible with Jupyter. One non-standard metadata field is added:

```json
{
  "metadata": {
    "notebook_type": "python" | "spark"
  }
}
```

This tells the editor which kernel to use when opening the notebook.

---

## 5. AI Assistant

### Flow

1. User opens chat panel (🤖 button per cell)
2. Frontend sends `POST /api/ai/chat` with message, selected cell id, and serialized cell context
3. Backend proxies to Ollama Cloud (`https://ollama.com/api/chat`)
4. Response is scanned for `<ACTION>` JSON blocks
5. Each action is returned to the frontend as a structured object
6. Frontend applies actions to `cells[]` state

### Action types

| Type | Effect |
|------|--------|
| `add_cell` | Append new code/markdown cell |
| `modify` | Replace source of selected cell |
| `explain` | Append markdown cell with explanation |
| `run` | Trigger execution of a cell |

### Model

Default: `kimi-k2.6:cloud`. User can switch via dropdown. Available models fetched from `GET /api/ai/models` (proxied from Ollama Cloud tags endpoint).

---

## 6. Frontend State Model

`NotebookEditor.tsx` owns all notebook state:

| State | Type | Notes |
|-------|------|-------|
| `cells` | `Cell[]` | Source of truth for all cells |
| `notebookType` | `'python' \| 'spark'` | Persisted to .ipynb metadata |
| `sparkStatus` | `'idle' \| 'starting' \| 'running' \| 'dead'` | Polled every 5s in Spark mode |
| `executionCounterRef` | `useRef<number>` | Global counter, increments on each execution |
| `executingCells` | `Set<string>` | Cell IDs currently running |

`executionCounterRef` is a ref (not state) to avoid re-renders and React StrictMode double-invoke issues. It is incremented outside `setCells` updaters.

---

## 7. Technical Decisions

| Decision | Reasoning |
|----------|-----------|
| CodeMirror 6 instead of Monaco | Lighter weight, better mobile touch support |
| Marimo as Python environment, not UI | Provides PySpark/pandas without the Jupyter server complexity |
| Single global kernel per type | Simpler than per-notebook kernels; fits single-user use case |
| `.ipynb` format kept | Portability — notebooks can be opened in Jupyter if needed |
| Ollama Cloud for AI | No local GPU required; supports large models (kimi-k2.6, qwen3.5:397b) |
| Go REPL over WebSocket kernel protocol | Simpler implementation; Jupyter messaging protocol is complex for a single-user tool |

---

## 8. Services (docker-compose)

| Service | Port | Notes |
|---------|------|-------|
| `frontend` | 5173 | Vite dev server |
| `backend` | 8080 | Go API, runs `go run main.go` |
| `marimo` | 2718 | Python env; UI not used |
| `spark` | 15002 (Connect), 4040 (UI) | Local Spark |
| `postgres` | 5433 (host) | Auth + metadata |
| `rustfs` | 9001 | S3-compatible storage |

---

## 9. Superseded Designs

| Doc | What it described | Status |
|-----|-------------------|--------|
| `2026-04-24-mylake-design.md` | Original design with DuckDB, Monaco, Jupyter | Superseded |
| `c4-components-mobile-notebook.md` | MobileNotebook with JupyterProxy, MonacoEditor | Superseded — see `c4-components-notebook-editor.md` |
| `2026-04-27-unify-notebooks-design.md` | Migration from Jupyter iframe to custom editor | Completed |
