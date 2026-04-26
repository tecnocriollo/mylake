import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config'

interface LakeItem {
  name: string
  type: 'schema' | 'table' | 'view' | 'folder' | 'file' | 'database'
  path: string
  schema?: string
  format?: string
  size?: number
  children?: LakeItem[]
}

interface LakeExplorerProps {
  token: string
  onSelectTable?: (schema: string, table: string) => void
  onSelectFile?: (path: string) => void
}

function LakeExplorer({ token, onSelectTable, onSelectFile }: LakeExplorerProps) {
  const [activeTab, setActiveTab] = useState<'tables' | 'files'>('tables')
  const [schemas, setSchemas] = useState<LakeItem | null>(null)
  const [files, setFiles] = useState<LakeItem | null>(null)
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchSchemas()
    fetchFiles()
  }, [token])

  const fetchSchemas = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/lake/schemas`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSchemas(response.data)
    } catch (err) {
      console.error('Failed to fetch schemas:', err)
    }
  }

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/lake/files`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFiles(response.data)
    } catch (err) {
      console.error('Failed to fetch files:', err)
    }
  }

  const toggleSchema = (schemaName: string) => {
    const newExpanded = new Set(expandedSchemas)
    if (newExpanded.has(schemaName)) {
      newExpanded.delete(schemaName)
    } else {
      newExpanded.add(schemaName)
    }
    setExpandedSchemas(newExpanded)
  }

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const getIcon = (item: LakeItem) => {
    switch (item.type) {
      case 'database':
        return '🗄️'
      case 'schema':
        return '📁'
      case 'table':
        return '▦'
      case 'view':
        return '👁'
      case 'folder':
        return expandedFolders.has(item.path) ? '📂' : '📁'
      case 'file':
        switch (item.format) {
          case 'parquet': return '🦆'
          case 'csv': return '📊'
          case 'json': return '📋'
          case 'notebook': return '📓'
          default: return '📄'
        }
      default:
        return '📄'
    }
  }

  const renderTableTree = (item: LakeItem, level = 0) => {
    const padding = level * 12
    const isExpanded = expandedSchemas.has(item.name)

    return (
      <div key={item.path} style={{ paddingLeft: `${padding}px` }}>
        <div
          className={`flex items-center space-x-2 px-2 py-1 text-sm rounded cursor-pointer ${
            item.type === 'table' || item.type === 'view'
              ? 'hover:bg-blue-50 text-gray-700'
              : 'hover:bg-gray-100 text-gray-800 font-medium'
          }`}
          onClick={() => {
            if (item.type === 'schema') {
              toggleSchema(item.name)
            } else if (item.type === 'table' || item.type === 'view') {
              onSelectTable?.(item.schema || '', item.name)
            }
          }}
        >
          <span className="w-4 text-center">
            {item.type === 'schema' && (isExpanded ? '▼' : '▶')}
          </span>
          <span className="text-base">{getIcon(item)}</span>
          <span className="truncate">{item.name}</span>
          {item.type === 'table' && (
            <span className="ml-auto text-xs text-gray-400">{getIcon({ type: 'table' } as LakeItem)}</span>
          )}
        </div>

        {item.type === 'schema' && isExpanded && item.children?.map(child => 
          renderTableTree(child, level + 1)
        )}
      </div>
    )
  }

  const renderFileTree = (item: LakeItem, level = 0) => {
    const padding = level * 12
    const isExpanded = expandedFolders.has(item.path)

    return (
      <div key={item.path} style={{ paddingLeft: `${padding}px` }}>
        <div
          className={`flex items-center space-x-2 px-2 py-1 text-sm rounded cursor-pointer ${
            item.type === 'file'
              ? 'hover:bg-blue-50 text-gray-700'
              : 'hover:bg-gray-100 text-gray-800'
          }`}
          onClick={() => {
            if (item.type === 'folder') {
              toggleFolder(item.path)
            } else if (item.type === 'file') {
              onSelectFile?.(item.path)
            }
          }}
        >
          <span className="w-4 text-center">
            {item.type === 'folder' && (isExpanded ? '▼' : '▶')}
          </span>
          <span className="text-base">{getIcon(item)}</span>
          <span className="truncate flex-1">{item.name}</span>
          {item.size && (
            <span className="text-xs text-gray-400">{formatSize(item.size)}</span>
          )}
        </div>

        {item.type === 'folder' && isExpanded && item.children?.map(child => 
          renderFileTree(child, level + 1)
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('tables')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'tables'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🗄️ Catálogo
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'files'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📁 Archivos
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'tables' ? (
          schemas ? (
            <div className="space-y-0.5">
              <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Esquemas
              </div>
              {schemas.children?.map(child => renderTableTree(child))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 p-2">Cargando catálogo...️</p>
          )
        ) : (
          files ? (
            <div className="space-y-0.5">
              <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Workspace
              </div>
              {files.children?.map(child => renderFileTree(child))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 p-2">Cargando archivos...️</p>
          )
        )}
      </div>
    </div>
  )
}

export default LakeExplorer
