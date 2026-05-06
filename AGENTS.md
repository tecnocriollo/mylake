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
- Frontend runs in Docker (Vite dev server). Browser API calls go to `https://api.mylake.tecnocriollo.com` — nginx reverse proxy on host → Docker backend:8080. DNS must resolve on host machine via `/etc/hosts`.

**Commands:**
- `docker compose up -d` — start full stack
- `docker compose up --build backend -d` — rebuild + restart backend after Go changes
- `docker compose logs -f backend` — tail backend logs

**URLs:** Frontend :5173 · Backend :8080 (also via nginx at api.mylake.tecnocriollo.com:443) · RustFS :9001 · Postgres :5433

## Last Session
_2026-05-06 — fixed login: DNS not resolving for api.mylake.tecnocriollo.com_
- Login failed with `ERR_NAME_NOT_RESOLVED` — domain not in host `/etc/hosts`
- nginx + certbot already configured on host (HTTPS cert valid until 2026-08-04), proxies to `127.0.0.1:8080`
- Fix: `echo "127.0.0.1 api.mylake.tecnocriollo.com" | sudo tee -a /etc/hosts` on host machine
- Browser makes API calls (not Docker container), so hosts entry must be on the machine running the browser
- `frontend/.env` points to prod URL (`https://api.mylake.tecnocriollo.com`) — correct for this setup
- Also need `127.0.0.1 mylake.tecnocriollo.com` in `/etc/hosts` for the frontend domain

## Docs
- `README.md` — stack, quick start, features, commands
- `docs/c4-components-notebook-editor.md` — container + component diagrams, kernel flow, full API surface
- `docs/superpowers/specs/2026-04-29-architecture.md` — architecture decisions, kernel design, state model (current)
- `docs/superpowers/specs/2026-04-27-unify-notebooks-design.md` — Jupyter→custom editor migration (completed)
<!-- /unforget -->
