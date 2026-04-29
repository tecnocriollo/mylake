<!-- unforget: auto-generated — do not edit this block manually -->
## Project Context

**Project:** MyLake — personal lakehouse for local development (SQL + Python/PySpark notebooks + AI assistant)

**Stack:** Go + Gin + JWT, React + Vite + TypeScript + TailwindCSS + CodeMirror 6, PostgreSQL 16, RustFS (S3), Marimo (Python env), Spark (local mode), Ollama Cloud API, Docker Compose

**Key rules:**
- Backend owns kernel execution — no Jupyter. Python and Spark run as persistent REPL processes in Go.
- `executionCounterRef` is a `useRef` incremented OUTSIDE `setCells` updaters (React StrictMode double-invoke).
- Backend has NO source volume — code changes require `docker compose up --build backend -d`.
- Notebooks stored as `.ipynb` with extra `metadata.notebook_type: "python"|"spark"`.
- AI actions parsed from `<ACTION>` JSON blocks in Ollama Cloud responses.

**Commands:**
- `docker compose up -d` — start full stack
- `docker compose up --build backend -d` — rebuild + restart backend after Go changes
- `docker compose logs -f backend` — tail backend logs

**URLs:** Frontend :5173 · Backend :8080 · RustFS :9001 · Postgres :5433

## Last Session
_2026-04-29 — fixed Python kernel state, sequential execution counters, docs overhaul_
- Replaced subprocess-per-cell in `marimo.go` with persistent REPL (same pattern as `sparkconnect.go`) — variables now shared across cells
- Added `POST /api/marimo/reset`, wired Restart button in `NotebookEditor.tsx` to call it
- Fixed execution counter: global `executionCounterRef` (useRef), incremented before `setCells` call
- Rewrote `README.md`, replaced stale `c4-components-mobile-notebook.md` with `c4-components-notebook-editor.md`
- New living spec: `docs/superpowers/specs/2026-04-29-architecture.md`

## Docs
- `README.md` — stack, quick start, features, commands
- `docs/c4-components-notebook-editor.md` — container + component diagrams, kernel flow, full API surface
- `docs/superpowers/specs/2026-04-29-architecture.md` — architecture decisions, kernel design, state model (current)
- `docs/superpowers/specs/2026-04-27-unify-notebooks-design.md` — Jupyter→custom editor migration (completed)
<!-- /unforget -->
