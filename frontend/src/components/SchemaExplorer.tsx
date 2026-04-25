import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config'

interface Schema {
  schema_name: string
}

interface Table {
  table_name: string
  table_type: string
}

interface SchemaExplorerProps {
  token: string
}

function SchemaExplorer({ token }: SchemaExplorerProps) {
  const [schemas, setSchemas] = useState<Schema[]>([])
  const [tables, setTables] = useState<Record<string, Table[]>>({})
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set())

  // Transform API response: columns + rows[] -> array of objects
  const transformResponse = (data: any): any[] => {
    const cols = data.columns || []
    const rows = data.rows || []
    return rows.map((row: any) => {
      const obj: any = {}
      cols.forEach((col: string, idx: number) => {
        obj[col] = row[col] !== undefined ? row[col] : row[idx]
      })
      return obj
    })
  }

  const fetchSchemas = async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/query`,
        { 
          query: `SELECT schema_name FROM information_schema.schemata 
                  WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
                  ORDER BY schema_name` 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const transformed = transformResponse(response.data)
      console.log('Schemas loaded:', transformed)
      setSchemas(transformed)
    } catch (err) {
      console.error('Failed to fetch schemas:', err)
    }
  }

  const fetchTables = async (schemaName: string) => {
    if (tables[schemaName]) return // already loaded
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/query`,
        { 
          query: `SELECT table_name, table_type 
                  FROM information_schema.tables 
                  WHERE table_schema = '${schemaName}'
                  ORDER BY table_name` 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const transformed = transformResponse(response.data)
      console.log(`Tables for ${schemaName}:`, transformed)
      setTables(prev => ({ ...prev, [schemaName]: transformed }))
    } catch (err) {
      console.error('Failed to fetch tables:', err)
    }
  }

  const toggleSchema = (schemaName: string) => {
    const newExpanded = new Set(expandedSchemas)
    if (newExpanded.has(schemaName)) {
      newExpanded.delete(schemaName)
    } else {
      newExpanded.add(schemaName)
      fetchTables(schemaName)
    }
    setExpandedSchemas(newExpanded)
  }

  useEffect(() => {
    fetchSchemas()
  }, [token])

  return (
    <div className="bg-white rounded-lg shadow h-full">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Explorer</h3>
        <p className="text-xs text-gray-500 mt-1">Schemas & Tables</p>
      </div>
      
      <div className="p-2 overflow-y-auto max-h-[calc(100vh-300px)]">
        {schemas.length === 0 ? (
          <p className="text-sm text-gray-500 p-2">No schemas found</p>
        ) : (
          <ul className="space-y-1">
            {schemas.map((schema: any) => (
              <li key={schema.schema_name}>
                <button
                  onClick={() => toggleSchema(schema.schema_name)}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 text-left text-sm hover:bg-gray-100 rounded"
                >
                  <span className="text-gray-500 w-4">
                    {expandedSchemas.has(schema.schema_name) ? '▼' : '▶'}
                  </span>
                  <span className="font-medium text-gray-700">
                    {schema.schema_name}
                  </span>
                </button>
                
                {expandedSchemas.has(schema.schema_name) && (
                  <ul className="ml-6 mt-1 space-y-0.5">
                    {!tables[schema.schema_name] ? (
                      <li className="px-2 py-1 text-xs text-gray-400">
                        Loading...
                      </li>
                    ) : tables[schema.schema_name].length === 0 ? (
                      <li className="px-2 py-1 text-xs text-gray-400">
                        No tables
                      </li>
                    ) : (
                      tables[schema.schema_name].map((table: any) => (
                        <li
                          key={table.table_name}
                          className="flex items-center space-x-2 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <span className="text-xs text-gray-400 w-4">
                            {table.table_type === 'VIEW' ? '👁' : '▦'}
                          </span>
                          <span>{table.table_name}</span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default SchemaExplorer
