import { useState } from 'react'
import Editor from '@monaco-editor/react'
import axios from 'axios'
import { API_BASE_URL } from '../config'
import LakeExplorer from '../components/LakeExplorer'

interface WorkbenchProps {
  token: string
}

function Workbench({ token }: WorkbenchProps) {
  const [activeTab, setActiveTab] = useState<'sql' | 'jupyter'>('sql')
  const [query, setQuery] = useState('SELECT * FROM auth_mgmt.users LIMIT 10;')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [jupyterUrl, setJupyterUrl] = useState(`http://207.180.223.160:8888/lab/workspaces/lake?token=mylake-token-123`)

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
    setActiveTab('sql')
    // Scroll to editor
    document.getElementById('sql-editor')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSelectFile = (path: string) => {
    // Abrir archivo en Jupyter
    const notebookUrl = `http://207.180.223.160:8888/lab/workspaces/lake/tree/${path}?token=mylake-token-123`
    setJupyterUrl(notebookUrl)
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      {/* Sidebar - Lake Explorer */}
      <div className="w-72 flex-shrink-0">
        <LakeExplorer 
          token={token} 
          onSelectTable={handleSelectTable}
          onSelectFile={handleSelectFile}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Tabs */}
        <div className="bg-white rounded-t-lg shadow border-b border-gray-200 flex-shrink-0">
          <div className="flex">
            <button
              onClick={() => setActiveTab('sql')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'sql'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📝 SQL Workbench
            </button>
            <button
              onClick={() => setActiveTab('jupyter')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'jupyter'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🐍 Jupyter Lab
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-lg shadow flex-1 overflow-hidden">
          {activeTab === 'sql' ? (
            <div className="h-full flex flex-col p-4 space-y-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900">SQL Workbench</h2>
                <p className="text-sm text-gray-500">Escribe y ejecuta consultas SQL</p>
              </div>

              <div id="sql-editor" className="border rounded-lg overflow-hidden flex-shrink-0">
                <Editor
                  height="200px"
                  defaultLanguage="sql"
                  value={query}
                  onChange={(value) => setQuery(value || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                  }}
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

              {results && (
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
          ) : (
            <div className="h-full flex flex-col">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div>
                  <span className="font-medium text-gray-900">Jupyter Lab</span>
                  <span className="text-sm text-gray-500 ml-2">- Python + PySpark</span>
                </div>
                <div className="text-xs text-gray-400">
                  💡 Haz clic en una tabla del catálogo para ver su código de acceso
                </div>
              </div>
              <div className="flex-1">
                <iframe
                  src={jupyterUrl}
                  className="w-full h-full border-0"
                  title="Jupyter Lab"
                  allow="fullscreen"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Workbench
