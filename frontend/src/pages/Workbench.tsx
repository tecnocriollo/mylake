import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CodeMirrorEditor from '../components/CodeMirrorEditor'
import axios from 'axios'
import { API_BASE_URL } from '../config'
import LakeExplorer from '../components/LakeExplorer'

interface WorkbenchProps {
  token: string
}

function Workbench({ token }: WorkbenchProps) {
  const navigate = useNavigate()
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
    setSidebarOpen(false) // Close sidebar on mobile after selection
    document.getElementById('sql-editor')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleCreateTable = (schema: string, template: string) => {
    const newQuery = `-- Crear tabla en esquema: ${schema}\n${template}`
    setQuery(newQuery)
    setSidebarOpen(false)
    document.getElementById('sql-editor')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSelectFile = (path: string) => {
    if (!path.toLowerCase().endsWith('.ipynb')) return
    navigate(`/notebook/${encodeURIComponent(path)}`)
    setSidebarOpen(false)
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
              onSelectFile={handleSelectFile}
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
