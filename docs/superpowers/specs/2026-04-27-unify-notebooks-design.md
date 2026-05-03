# Unificar Notebooks en UI Principal - Design Spec

**Date:** 2026-04-27
**Goal:** Eliminar todo acceso directo a Jupyter/Marimo y convertir el notebook editor (hoy "MobileNotebook") en la única forma de interactuar con notebooks desde la app.

---

## Current State

- `MobileNotebook.tsx` es un editor React propio de `.ipynb` con ejecución vía backend (Marimo para Python, Spark Connect para Spark).
- `Workbench.tsx` tiene dos tabs: SQL Editor y Jupyter Lab iframe (IP hardcodeada `207.180.223.160:8888`).
- `Layout.tsx` tiene links de nav: "Jupyter ↗" (hardcoded IP) y "📱 Mobile NB" → `/notebooks`.
- El servicio `jupyter` no está levantado en docker-compose; la IP hardcodeada apunta a un servidor externo.
- Marimo solo se usa como backend API (`/api/marimo/execute`); su UI no es expuesta.

---

## Desired State

- Workbench muestra **solo** el SQL Editor. No hay iframe de Jupyter.
- La navegación principal muestra **"📓 Notebooks"** en lugar de "📱 Mobile NB".
- El componente editor se llama `NotebookEditor.tsx` (no "Mobile").
- La lista de notebooks se llama `NotebooksList.tsx`.
- No hay links externos a Jupyter Lab.
- Backend mantiene rutas `/api/jupyter/*` por compatibilidad interna pero frontend no las consume.

---

## Changes

### Frontend

| File | Change |
|------|--------|
| `frontend/src/components/MobileNotebook.tsx` | **Rename** → `NotebookEditor.tsx`. Update exported component name. Update internal types (`MobileNotebookProps` → `NotebookEditorProps`, etc.). |
| `frontend/src/pages/NotebooksPage.tsx` | **Rename** → `NotebooksList.tsx`. Update component name and re-export. |
| `frontend/src/pages/NotebookEditor.tsx` | **Rename** → `NotebookPage.tsx`. Update import path from `MobileNotebook` to `NotebookEditor`. |
| `frontend/src/pages/Workbench.tsx` | Remove "Jupyter" tab and iframe. Keep only SQL Editor tab. |
| `frontend/src/components/Layout.tsx` | Remove "Jupyter ↗" nav link. Rename "📱 Mobile NB" → "📓 Notebooks". |
| `frontend/src/App.tsx` | Update imports for renamed pages/components. No routing changes needed (`/notebooks` and `/notebook/:path` stay). |
| `frontend/src/components/AICellAssistant.tsx` | No change. AI actions (`add_cell`, `modify`, `explain`) keep working against `NotebookEditor`. |

### Backend

| File | Change |
|------|--------|
| `backend/internal/routes/routes.go` | No change to routes. `/api/jupyter/*` stay available for internal use. |
| `backend/internal/handlers/jupyter.go` | No change. |
| `backend/internal/handlers/marimo.go` | No change. |
| `backend/internal/handlers/sparkconnect.go` | No change. |

### Docker / Config

| File | Change |
|------|--------|
| `docker-compose.yml` | Remove `JUPYTER_URL` env var from `backend` service if present. No service removal needed (jupyter service does not exist in compose). |

---

## Architecture

```
User
  → Layout
    → /             → Workbench (SQL Editor only)
    → /notebooks    → NotebooksList
    → /notebook/:id → NotebookEditor
      → /api/marimo/execute    (python)
      → /api/spark-connect/execute (spark)
      → /api/ai/chat           (AI assistant)
```

No iframe. No IP hardcodeada. Notebook editor es la UI única.

---

## Edge Cases

- **Direct URL a Jupyter:** usuario que tenga bookmark a IP externa → fuera de scope, no controlable desde app.
- **Spark Logs button:** visible solo cuando `notebookType === 'spark'`. Se mantiene.
- **Kernel restart:** funcionalidad existente en `NotebookEditor` se mantiene.
- **Auto-save .ipynb:** se mantiene via `PUT /api/jupyter/notebooks/:path`.

---

## Testing

- Verificar que Workbench carga solo SQL Editor, sin pestaña Jupyter.
- Verificar que nav no muestra link a Jupyter.
- Verificar que `/notebooks` lista notebooks y `/notebook/:path` abre editor.
- Verificar ejecución Python y Spark en celdas.
- Verificar que AI assistant (`AICellAssistant`) sigue funcionando.
