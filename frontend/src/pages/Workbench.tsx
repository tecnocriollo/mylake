import { useState } from 'react'
import Editor from '@monaco-editor/react'
import axios from 'axios'
import { API_BASE_URL } from '../config'
import SchemaExplorer from '../components/SchemaExplorer'

interface WorkbenchProps {
  token: string
}

function Workbench({ token }: WorkbenchProps) {
  const [activeTab, setActiveTab] = useState<'sql' | 'jupyter'>('sql')
  const [query, setQuery] = useState('SELECT * FROM auth_mgmt.users LIMIT 10;')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="flex gap-6">
      {/* Sidebar - Schema Explorer */}
      <div className="w-64 flex-shrink-0">
        <SchemaExplorer token={token} />
      </div>

      {/* Main content */}
      <div className="flex-1">
        {/* Tabs */}
        <div className="bg-white rounded-t-lg shadow border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('sql')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'sql'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              SQL Workbench
            </button>
            <button
              onClick={() => setActiveTab('jupyter')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'jupyter'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Jupyter Lab
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-lg shadow p-4">
          {activeTab === 'sql' ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">SQL Workbench</h2>
                <p className="text-sm text-gray-500">Write and execute SQL queries</p>
              </div>

              <div className="border rounded-lg overflow-hidden">
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

              <div className="flex items-center space-x-4">
                <button
                  onClick={executeQuery}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Executing...' : 'Execute Query'}
                </button>

                <button
                  onClick={() => setQuery('')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Clear
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {results && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <span className="text-sm text-gray-600">
                      {results.count} row{results.count !== 1 ? 's' : ''} returned
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {results.columns.map((col: string) => (
                            <th
                              key={col}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {results.rows.map((row: any, idx: number) => (
                          <tr key={idx}>
                            {results.columns.map((col: string) => (
                              <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Jupyter Lab</h2>
                <p className="text-sm text-gray-500">
                  Interactive Python notebooks with PySpark. Data is persisted in the lake.
                </p>
              </div>
              
              <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                <iframe
                  src="http://207.180.223.160:8888/lab?token=mylake-token-123"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Jupyter Lab"
                  allow="fullscreen"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Conexión al Lake</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• PostgreSQL: <code>postgres:5432/mylake</code></li>
                  <li>• S3 Storage: <code>rustfs:9000</code></li>
                  <li>• Workspace: <code>/home/jovyan/work</code> (persistido)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Workbench
