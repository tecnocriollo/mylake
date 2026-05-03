# Unificar Notebooks en UI Principal - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar todo acceso directo a Jupyter/Marimo desde la UI y convertir el notebook editor (hoy "MobileNotebook") en la única forma de interactuar con notebooks.

**Architecture:** Renombrar componentes para reflejar propósito general (no mobile-only), eliminar tab Jupyter del Workbench, limpiar links de navegación. Backend no cambia.

**Tech Stack:** React + TypeScript + Vite + TailwindCSS, React Router, Axios

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/components/MobileNotebook.tsx` | Rename → `NotebookEditor.tsx` | Componente editor de notebooks |
| `frontend/src/components/NotebookEditor.tsx` | Modify | Cambiar nombre export, interface, string de UI |
| `frontend/src/pages/NotebooksPage.tsx` | Rename → `NotebooksList.tsx` | Página lista de notebooks |
| `frontend/src/pages/NotebooksList.tsx` | Modify | Cambiar nombre componente, import path |
| `frontend/src/pages/NotebookEditor.tsx` | Rename → `NotebookPage.tsx` | Página wrapper para ruta `/notebook/:path` |
| `frontend/src/pages/NotebookPage.tsx` | Modify | Actualizar import desde `MobileNotebook` a `NotebookEditor` |
| `frontend/src/pages/Workbench.tsx` | Modify | Quitar tab Jupyter, quitar estado/iframe relacionado |
| `frontend/src/components/Layout.tsx` | Modify | Quitar link Jupyter, renombrar nav item |
| `frontend/src/App.tsx` | Modify | Actualizar imports de páginas renombradas |

---

## Task 1: Rename `MobileNotebook.tsx` → `NotebookEditor.tsx`

**Files:**
- Rename: `frontend/src/components/MobileNotebook.tsx` → `frontend/src/components/NotebookEditor.tsx`
- Modify: `frontend/src/components/NotebookEditor.tsx`

- [ ] **Step 1: Rename file**

Run:
```bash
git mv frontend/src/components/MobileNotebook.tsx frontend/src/components/NotebookEditor.tsx
```

- [ ] **Step 2: Update component name and interface**

In `frontend/src/components/NotebookEditor.tsx`:

Change line 27:
```typescript
interface NotebookEditorProps {
```

Change line 65:
```typescript
export default function NotebookEditor({ token, notebookPath }: NotebookEditorProps) {
```

Change line 82:
```typescript
    serverLog(token, 'NotebookEditor mounted', { url: window.location.href })
```

Change line 484:
```typescript
          <h1 className="text-lg font-bold text-gray-900">📓 Notebooks</h1>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/NotebookEditor.tsx
git commit -m "refactor: rename MobileNotebook to NotebookEditor"
```

---

## Task 2: Rename `NotebooksPage.tsx` → `NotebooksList.tsx`

**Files:**
- Rename: `frontend/src/pages/NotebooksPage.tsx` → `frontend/src/pages/NotebooksList.tsx`
- Modify: `frontend/src/pages/NotebooksList.tsx`

- [ ] **Step 1: Rename file**

Run:
```bash
git mv frontend/src/pages/NotebooksPage.tsx frontend/src/pages/NotebooksList.tsx
```

- [ ] **Step 2: Update component and imports**

In `frontend/src/pages/NotebooksList.tsx`, replace entire content:

```typescript
import NotebookEditor from '../components/NotebookEditor'

interface NotebooksListProps {
  token: string
}

function NotebooksList({ token }: NotebooksListProps) {
  return (
    <div className="h-[calc(100vh-100px)]">
      <NotebookEditor token={token} />
    </div>
  )
}

export default NotebooksList
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/NotebooksList.tsx
git commit -m "refactor: rename NotebooksPage to NotebooksList"
```

---

## Task 3: Rename `NotebookEditor.tsx` (page) → `NotebookPage.tsx`

**Files:**
- Rename: `frontend/src/pages/NotebookEditor.tsx` → `frontend/src/pages/NotebookPage.tsx`
- Modify: `frontend/src/pages/NotebookPage.tsx`

- [ ] **Step 1: Rename file**

Run:
```bash
git mv frontend/src/pages/NotebookEditor.tsx frontend/src/pages/NotebookPage.tsx
```

- [ ] **Step 2: Update import path**

In `frontend/src/pages/NotebookPage.tsx`, replace line 2:
```typescript
import NotebookEditor from '../components/NotebookEditor'
```

Full file should be:
```typescript
import { useParams } from 'react-router-dom'
import NotebookEditor from '../components/NotebookEditor'

interface NotebookPageProps {
  token: string
}

export default function NotebookPage({ token }: NotebookPageProps) {
  const { path } = useParams()

  return (
    <div className="h-screen flex flex-col">
      <NotebookEditor token={token} notebookPath={path} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/NotebookPage.tsx
git commit -m "refactor: rename NotebookEditor page to NotebookPage"
```

---

## Task 4: Remove Jupyter from Workbench

**Files:**
- Modify: `frontend/src/pages/Workbench.tsx`

- [ ] **Step 1: Remove Jupyter-related state and imports**

In `frontend/src/pages/Workbench.tsx`:

Remove state declarations (lines 12, 17):
```typescript
  const [activeTab, setActiveTab] = useState<'sql' | 'jupyter'>('sql')
```
Keep other states. Change to:
```typescript
  const [activeTab, setActiveTab] = useState<'sql'>('sql')
```

Actually simpler: remove `activeTab` state entirely, and remove `jupyterUrl` state (line 17).

Remove `handleSelectFile` function (lines 55-58).

In `handleSelectTable` and `handleCreateTable`, remove `setActiveTab('sql')` calls.

- [ ] **Step 2: Simplify JSX to only SQL Editor**

Remove the Tabs container (lines 112-136) and the conditional rendering. Keep only the SQL content.

Remove the `LakeExplorer` prop `onSelectFile={handleSelectFile}` since handler is gone.

After changes, `Workbench.tsx` should look like:

```typescript
import { useState } from 'react'
import CodeMirrorEditor from '../components/CodeMirrorEditor'
import axios from 'axios'
import { API_BASE_URL } from '../config'
import LakeExplorer from '../components/LakeExplorer'

interface WorkbenchProps {
  token: string
}

function Workbench({ token }: WorkbenchProps) {
  const [query, setQuery] = useState('SELECT * FROM auth_mgmt.users LIMIT 10;')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const executeQuery = async () => {
    setLoading(true)
    setError('')
    setResults(null)

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/query`,
        { query },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setResults(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to execute query')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTable = (schema: string, table: string) => {
    const newQuery = `SELECT * FROM ${schema}.${table} LIMIT 100;`
    setQuery(newQuery)
    setSidebarOpen(false)
    document.getElementById('sql-editor')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleCreateTable = (schema: string, template: string) => {
    const newQuery = `-- Crear tabla en esquema: ${schema}\n${template}`
    setQuery(newQuery)
    setSidebarOpen(false)
    document.getElementById('sql-editor')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-120px)] relative">
      {/* Mobile Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700"
        aria-label={sidebarOpen ? 'Cerrar catálogo' : 'Abrir catálogo'}
      >
        {sidebarOpen ? '✕' : '📁'}
      </button>

      {/* Sidebar - Lake Explorer */}
      <div
        className={`${
          sidebarOpen
            ? 'fixed inset-0 z-40 bg-black bg-opacity-50 lg:bg-transparent lg:static lg:inset-auto'
            : 'hidden lg:block'
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSidebarOpen(false)
        }}
      >
        <div
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } transform transition-transform duration-300 ease-in-out
            w-72 h-full lg:h-auto bg-white lg:bg-transparent shadow-2xl lg:shadow-none
            border-r lg:border-0 overflow-auto`}
        >
          <div className="p-4 lg:p-0">
            {/* Mobile header */}
            <div className="lg:hidden flex items-center justify-between mb-4 pb-2 border-b">
              <h2 className="text-lg font-semibold text-gray-900">📁 Catálogo</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <LakeExplorer
              token={token}
              onSelectTable={handleSelectTable}
              onCreateTable={handleCreateTable}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="bg-white rounded-lg shadow flex-1 overflow-hidden">
          <div className="h-full flex flex-col p-4 space-y-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">SQL Workbench</h2>
              <p className="text-sm text-gray-500">Escribe y ejecuta consultas SQL</p>
            </div>

            <div id="sql-editor" className="border rounded-lg overflow-hidden flex-shrink-0">
              <CodeMirrorEditor
                height="200px"
                language="python"
                value={query}
                onChange={(value: string) => setQuery(value || '')}
                options={{ lineNumbers: true }}
              />
            </div>

            <div className="flex items-center space-x-4 flex-shrink-0">
              <button
                onClick={executeQuery}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Ejecutando...' : '▶ Ejecutar'}
              </button>

              <button
                onClick={() => setQuery('')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Limpiar
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex-shrink-0">
                {error}
              </div>
            )}

            {results && results.columns && results.rows && (
              <div className="border rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col">
                <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                  <span className="text-sm text-gray-600">
                    {results.count} fila{results.count !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="overflow-auto flex-1">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {results.columns.map((col: string) => (
                          <th
                            key={col}
                            className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.rows.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {results.columns.map((col: string) => (
                            <td key={col} className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {row[col] === null ? (
                                <span className="text-gray-400">NULL</span>
                              ) : (
                                String(row[col])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Workbench
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Workbench.tsx
git commit -m "refactor: remove Jupyter tab from Workbench, keep SQL only"
```

---

## Task 5: Update Layout Navigation

**Files:**
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Remove Jupyter link and rename Notebooks**

In `frontend/src/components/Layout.tsx`:

Replace lines 33-50 (Desktop nav):
```tsx
              <Link
                to="/notebooks"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === '/notebooks'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📓 Notebooks
              </Link>
```

Remove lines 43-50 (Jupyter link in desktop nav).

Replace lines 89-107 (Mobile nav):
```tsx
              <Link
                to="/notebooks"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === '/notebooks'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📓 Notebooks
              </Link>
```

Remove lines 100-108 (Jupyter link in mobile nav).

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Layout.tsx
git commit -m "refactor: remove Jupyter nav link, rename notebooks link"
```

---

## Task 6: Update App.tsx Imports

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update import paths**

Replace lines 6-7:
```typescript
import NotebooksList from './pages/NotebooksList'
import NotebookPage from './pages/NotebookPage'
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "refactor: update App.tsx imports for renamed notebook pages"
```

---

## Verification

- [ ] **Build frontend**

```bash
cd frontend && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Run E2E tests**

```bash
./scripts/self-test.sh
```

Expected: All tests pass (or at least no regressions in existing flows).

- [ ] **Manual check**

1. Open app → Workbench muestra solo SQL Editor, no hay tabs.
2. Nav muestra "📓 Notebooks", no "Jupyter ↗".
3. Click Notebooks → lista notebooks funciona.
4. Abrir notebook → editor funciona, ejecuta Python/Spark.
5. AI assistant botón funciona en celdas.

---

## Self-Review

- [x] Spec coverage: todos los items del spec están cubiertos.
- [x] Placeholder scan: no TBD/TODO.
- [x] Type consistency: `NotebookEditorProps`, `NotebookPageProps`, `NotebooksListProps` consistentes.
