# C4 Model - Component Level: Mobile Notebook Editor

## Contexto

Sistema: MyLake - Personal Lakehouse para desarrollo local

## Container Diagram (Resumen)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Navegador     │────▶│  Frontend App   │────▶│   Backend API   │
│   (Mobile)      │◄────│   (React+Vite)  │◀────│     (Go/Gin)    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
                           ┌──────────────────────────────┼──────┐
                           │                              │      │
                           ▼                              ▼      ▼
                    ┌─────────────┐              ┌────────────┐ ┌────────────┐
                    │   PostgreSQL │              │ JupyterLab │ │  RustFS    │
                    │              │              │  Server    │ │  (S3)      │
                    └─────────────┘              └────────────┘ └────────────┘
```

---

## Component Diagram: Mobile Notebook Module

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + Vite)                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        MobileNotebookPage                          │   │
│  │                         (Container Component)                        │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                          │
│                    ┌─────────────┴─────────────┐                            │
│                    ▼                           ▼                            │
│  ┌─────────────────────────┐   ┌─────────────────────────┐                 │
│  │     NotebookHeader      │   │    NotebookWorkspace    │                 │
│  │  - Nombre archivo       │   │  - Lista de celdas      │                 │
│  │  - Botón guardar        │   │  - Scroll vertical       │                 │
│  │  - Estado kernel         │   │  - Gestos táctiles       │                 │
│  └─────────────────────────┘   └───────────┬─────────────┘                 │
│                                            │                               │
│                              ┌─────────────┼─────────────┐                 │
│                              ▼             ▼             ▼                 │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐  │
│  │     CodeCell        │ │    MarkdownCell     │ │    OutputCell       │  │
│  │  ┌───────────────┐  │ │  ┌───────────────┐  │ │  ┌───────────────┐  │  │
│  │  │ MonacoEditor  │  │ │  │  Preview      │  │ │  │  Stdout       │  │  │
│  │  │ (Python lang) │  │ │  │     or        │  │ │  │  Stderr       │  │  │
│  │  └───────────────┘  │ │  │  SimpleMDE    │  │ │  │  Result       │  │  │
│  │  - Toolbar móvil    │ │  │  - Toggle     │  │ │  │  - Collapse   │  │  │
│  │  - Run button       │ │  │  - Edit/View  │  │ │  │  - Scroll     │  │  │
│  │  - Delete button    │ │  └───────────────┘  │ │  └───────────────┘  │  │
│  │  - Drag handle      │ │                     │ │                     │  │
│  │  - Output toggle    │ │                     │ │                     │  │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘  │
│                              │                                            │
│                              ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      FloatingActionBar (Mobile)                        │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │ │
│  │  │  +Code  │ │ +Markdown│ │  Run    │ │  Stop   │ │ Kernel  │        │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      NotebookAPI (Service)                           │ │
│  │  - fetchNotebook(file)                                               │ │
│  │  - saveNotebook(file, content)                                       │ │
│  │  - executeCell(session, code)                                        │ │
│  │  - listNotebooks()                                                   │ │
│  │  - createSession() / interruptKernel()                               │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/WebSocket
                                    │ (JWT Auth)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Go/Gin)                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     AuthMiddleware (JWT Verify)                        │ │
│  │                    (Reutilizar middleware existente)                   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    │                                       │
│                    ┌───────────────┼───────────────┐                       │
│                    ▼               ▼               ▼                       │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ │
│  │  NotebookHandler      │ │  JupyterProxy       │ │  KernelManager      │ │
│  │  -----------------    │ │  -----------------  │ │  -----------------  │ │
│  │  GET /api/notebooks   │ │  POST /api/execute  │ │  POST /api/sessions │ │
│  │  GET /api/notebooks/: │ │  GET /api/sessions/:│ │  DELETE /api/session│ ││
│  │  PUT /api/notebooks/: │ │  WS /api/kernel/:id │ │                     │ │
│  │  POST /api/notebooks  │ │                     │ │                     │ │
│  │  DELETE /api/notebook │ │                     │ │                     │ │
│  │  -----------------    │ │                     │ │                     │ │
│  │  - Listar .ipynb      │ │  - Proxy a Jupyter  │ │  - Gestionar sesión │ │
│  │  - Leer JSON          │ │  - Transformar req  │ │  - Cleanup timeout  │ │
│  │  - Guardar JSON       │ │  - Cache WS         │ │  - Rate limiting    │ │
│  │  - Crear template     │ │                     │ │                     │ │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘ │
│                              │                                              │
│                              │ HTTP/WebSocket                               │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                        Jupyter Lab Server                              │ │
│  │                    (localhost:8888 - existente)                        │ │
│  │  - REST API /api/contents                                            │ │
│  │  - Kernel API /api/kernels                                          │ │
│  │  - Sessions API /api/sessions                                        │ │
│  │  - WebSocket /api/kernels/:id/channels                              │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Interfaces (APIs)

### Frontend → Backend

| Endpoint | Method | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/notebooks` | GET | JWT | Listar notebooks en ./notebooks/ |
| `/api/notebooks` | POST | JWT | Crear notebook nuevo |
| `/api/notebooks/:name` | GET | JWT | Obtener contenido JSON del notebook |
| `/api/notebooks/:name` | PUT | JWT | Guardar notebook |
| `/api/notebooks/:name` | DELETE | JWT | Eliminar notebook |
| `/api/sessions` | POST | JWT | Crear sesión de kernel |
| `/api/sessions/:id` | DELETE | JWT | Cerrar sesión |
| `/api/execute` | POST | JWT | Ejecutar código (celda) |
| `/ws/kernel/:id` | WS | JWT | WebSocket al kernel (proxy) |

### Backend → Jupyter Lab

| Endpoint | Uso Interno |
|----------|-------------|
| `http://localhost:8888/api/contents/notebooks/` | Listar archivos |
| `http://localhost:8888/api/contents/notebooks/:path` | Leer/escribir notebook |
| `http://localhost:8888/api/kernels` | Gestionar kernels |
| `http://localhost:8888/api/sessions` | Gestionar sesiones |
| `ws://localhost:8888/api/kernels/:id/channels` | Comunicación kernel |

---

## Data Structures

### Notebook JSON Format (.ipynb)

```json
{
  "metadata": {
    "kernelspec": {
      "display_name": "Python 3",
      "language": "python",
      "name": "python3"
    },
    "language_info": {
      "name": "python",
      "version": "3.11.0"
    }
  },
  "nbformat": 4,
  "nbformat_minor": 5,
  "cells": [
    {
      "cell_type": "code",
      "execution_count": null,
      "metadata": {},
      "outputs": [],
      "source": ["print('Hello')"]
    },
    {
      "cell_type": "markdown",
      "metadata": {},
      "source": ["# Título"]
    }
  ]
}
```

### Kernel Message (Jupyter Protocol)

```json
{
  "header": {
    "msg_id": "uuid",
    "msg_type": "execute_request",
    "session": "session-id",
    "username": "user",
    "version": "5.3"
  },
  "parent_header": {},
  "metadata": {},
  "content": {
    "code": "print(1+1)",
    "silent": false,
    "store_history": true
  }
}
```

---

## Componentes Detallados

### 1. MobileNotebookPage
- **Propósito**: Container principal, maneja estado global del notebook
- **Estado**: `cells[]`, `filename`, `kernelSession`, `isDirty`
- **Props**: `filename?: string` (cargar existente o crear nuevo)

### 2. NotebookHeader
- **Elementos**: Título editable, indicador guardado, status kernel (● idle/⚙ busy/✗ dead)
- **Acciones**: Save, Restart kernel, Back to file explorer

### 3. NotebookWorkspace
- **Layout**: Flex column, scroll vertical
- **Gestos**: Swipe up/down entre celdas, long-press para menu
- **Render**: Mapea `cells[]` a componentes según `cell_type`

### 4. CodeCell
- **Editor**: Monaco con tema consistente al SQL Workbench
- **Config**: Python syntax, minimap disabled (mobile), lineNumbers onHover
- **Toolbar**: Run (▶), Run below (⏩), Delete (🗑), Move (↑↓)
- **Output**: Collapsible, scrollable, soporta text/html/image

### 5. MarkdownCell
- **Modos**: Edit (Monaco/simple textarea) ↔ Preview (rendered HTML)
- **Toggle**: Botón o doble-tap
- **Render**: Sanitizado, soporta GitHub-flavored markdown

### 6. OutputCell
- **Tipos**: `stream` (stdout/stderr), `execute_result`, `error`, `display_data`
- **Features**: Collapse/expand, copy output, clear
- **Estilo**: Card con fondo distinto, mono font para texto

### 7. FloatingActionBar
- **Posición**: Fixed bottom, safe-area-inset para iPhone notch
- **Botones**: 
  - `+ Code` - Inserta code cell al final
  - `+ Markdown` - Inserta markdown cell al final
  - `▶ Run All` - Ejecuta todas las celdas
  - `⏹ Interrupt` - Envia interrupt al kernel
  - `↻ Restart` - Reinicia kernel
- **Responsive**: Horizontal scroll si no caben

### 8. NotebookAPI (Service)
- **BaseURL**: `/api` (mismo host que backend)
- **Headers**: `Authorization: Bearer <JWT>`
- **Error handling**: 401 → redirect login, 500 → toast error

### 9. NotebookHandler (Go)
- **File I/O**: Lee/escribe directo a `./notebooks/*.ipynb`
- **Validación**: Verifica formato JSON válido, nbformat 4.x
- **Atomic writes**: Guarda a temp, luego rename

### 10. JupyterProxy (Go)
- **Reverse proxy**: httputil.ReverseProxy
- **Auth**: Inyecta token Jupyter (desde env/config)
- **WS upgrade**: gorilla/websocket para passthrough
- **Transform**: Adapta paths si es necesario

### 11. KernelManager (Go)
- **Session tracking**: Map `sessionID` → `kernelID`
- **Cleanup**: Timer que cierra kernels idle >30 min
- **Rate limit**: Max 1 ejecución concurrente por sesión

---

## Flujos de Datos

### Cargar Notebook Existente

```
Usuario clickea archivo en explorer
  ↓
MobileNotebookPage monta con filename prop
  ↓
NotebookAPI.getNotebook(filename)
  ↓
GET /api/notebooks/:name → NotebookHandler lee archivo
  ↓
JSON.parse() → cells[] → setState
  ↓
Render cells en NotebookWorkspace
```

### Ejecutar Celda

```
Usuario presiona ▶ en CodeCell
  ↓
NotebookAPI.executeCell(sessionID, code)
  ↓
POST /api/execute → JupyterProxy
  ↓
WebSocket al kernel localhost:8888
  ↓
Kernel ejecuta Python → msg_type: execute_reply
  ↓
Backend recibe output → JSON response
  ↓
Frontend actualiza cell.outputs[]
```

### Guardar Notebook

```
Usuario presiona Save
  ↓
Construir notebook JSON desde cells[]
  ↓
NotebookAPI.saveNotebook(filename, content)
  ↓
PUT /api/notebooks/:name → NotebookHandler
  ↓
Atomic write a ./notebooks/:name
  ↓
200 OK → Set isDirty = false
```

---

## Decisiones Técnicas

| Decisión | Justificación |
|----------|---------------|
| Monaco en vez de CodeMirror | Consistente con SQL Workbench existente, mejor soporte móvil |
| Proxy en Go vs directo | JWT auth, rate limiting, abstracción de Jupyter internals |
| WebSocket para kernel | Protocolo Jupyter requiere bidireccional (stdin/stdout) |
| JSON format nativo .ipynb | Compatibilidad 100% con Jupyter Lab existente |
| Floating bottom bar | Pattern mobile estándar (notion, obsidian) |
| Celda seleccionada = focused | Reduce clutter, optimiza para pantallas chicas |

---

## Open Questions / TODO

- [ ] ¿Soportar múltiples kernels (Python, R, Julia)?
- [ ] ¿Auto-save cada N segundos?
- [ ] ¿Undo/redo a nivel celda o notebook entero?
- [ ] ¿Exportar a PDF/HTML desde frontend?
- [ ] ¿Soporte attachments (imágenes en markdown)?
- [ ] ¿Collaborative editing (CRDT)?

---

## Referencias

- [Jupyter Notebook Format](https://nbformat.readthedocs.io/en/latest/format_description.html)
- [Jupyter Kernel Messaging Protocol](https://jupyter-client.readthedocs.io/en/latest/messaging.html)
- [Jupyter Server REST API](https://jupyter-server.readthedocs.io/en/latest/developers/rest-api.html)
- [Monaco Editor Docs](https://microsoft.github.io/monaco-editor/)
