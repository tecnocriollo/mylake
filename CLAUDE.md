# MyLake - Resumen de Cambios (2026-04-27)

## 🤖 Integración AI con Ollama Cloud

### Backend

#### `backend/internal/handlers/ai.go`
- Handler de chat AI conectado a Ollama Cloud (`https://ollama.com/api/chat`)
- API Key: `dc78edcb1b004e6593ab05bae51717ee.tsEQx5KmeNbDrmNnXoLLlRpy`
- Prompt system que instruye al AI a devolver acciones JSON entre tags `<ACTION>`
- Parser de acciones que extrae bloques `<ACTION>` JSON
- Model mapping: `qwen2.5-coder:1.5b` → `qwen3-coder-next`
- HTTP Client con `CheckRedirect` para seguir redirects 301

**Endpoints:**
- `GET /api/ai/models` - Lista modelos disponibles de Ollama Cloud
- `POST /api/ai/chat` - Chat con contexto del notebook
  - Body: `{message, context, model, selected_cell_id}`
  - Response: `{content, actions: [{type, description, cell_type, code}]}`

**Acciones soportadas:**
- `add_cell`: Agrega nueva celda con código/markdown
- `modify`: Reemplaza contenido de celda seleccionada
- `explain`: Agrega celda markdown con explicación
- `run`: Ejecuta celda

#### `backend/internal/routes/routes.go`
- Agregadas rutas protegidas:
  - `GET /api/ai/models`
  - `POST /api/ai/chat`

### Frontend

#### `frontend/src/components/AICellAssistant.tsx`
- Panel de chat AI flotante (botón 🤖 en esquina inferior derecha)
- UI con: header (selector de modelo), área de mensajes, input
- Mensajes en formato chat (usuario derecha, asistente izquierda)
- Botones de acciones clickeables (ejecutar acción del AI)
- Selector de modelo (dropdown)
- Indicador de celda seleccionada
- Estado de loading con animación

#### `frontend/src/components/MobileNotebook.tsx`
- Botón 🤖 en toolbar de cada celda (junto a Edit y Delete)
- Selección de celda: al clickear 🤖 setea `selectedCellId` y abre chat
- Handler de acciones AI:
  - `add_cell`: Crea nueva celda y la agrega al final
  - `modify`: Actualiza celda seleccionada
  - `explain`: Agrega celda markdown
- Server Logger: función `serverLog()` envía logs a `/api/errors`

### Configuración

**Modelo por defecto:** `kimi-k2.6:cloud`

**Modelos disponibles:**
- `kimi-k2.6:cloud` (por defecto)
- `qwen3-coder-next`
- `qwen3.5:397b`
- `deepseek-v4-flash`
- `gemma3:12b`, `gemma3:27b`
- Y más...

### API Ollama Cloud
- Base URL: `https://ollama.com`
- Auth: `Authorization: Bearer <token>`
- Models: `GET /api/tags`
- Chat: `POST /api/chat`
- Payload: `{model, messages, stream: false}`

### Issues Resueltos
1. **401 Unauthorized**: URL incorrecta (`api.ollama.com/v1` → `ollama.com/api`)
2. **404 Model not found**: Nombre de modelo incorrecto
3. **Redirects 301**: Agregado `CheckRedirect`
4. **Formato de acciones**: Prompt con `<ACTION>` tags JSON

### Issues Pendientes
- [ ] Verificar logs desde móvil
- [ ] Testear acciones en dispositivo móvil
- [ ] Manejar errores cuando AI no devuelve `<ACTION>` tags
- [ ] Optimizar prompt para respuestas más concisas
- [ ] Soporte para múltiples acciones en una respuesta

---

## Estado del Proyecto

### Funcionalidades Implementadas
- [x] Ejecución Python via Marimo
- [x] Ejecución Spark via Spark Connect
- [x] Editor CodeMirror 6
- [x] Notebook per-URL (rutas dinámicas)
- [x] Tipo de notebook persistido (python/spark)
- [x] AI Assistant con Ollama Cloud
- [x] Acciones sobre celdas (agregar, modificar, explicar)
- [x] E2E tests (11/11 passing)

### Arquitectura
- Frontend: React + TailwindCSS + CodeMirror 6
- Backend: Go + Gin
- Notebook Engine: Marimo (reemplazó Jupyter)
- Spark: Spark Connect (local)
- AI: Ollama Cloud API
- Database: PostgreSQL
- Storage: RustFS

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
