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
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createType, setCreateType] = useState<'folder' | 'python' | 'notebook' | null>(null)
  const [createPath, setCreatePath] = useState('')
  const [createName, setCreateName] = useState('')
  const [createError, setCreateError] = useState('')

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

  const openCreateModal = (type: 'folder' | 'python' | 'notebook', path: string = '') => {
    setCreateType(type)
    setCreatePath(path)
    setCreateName('')
    setCreateError('')
    setShowCreateModal(true)
  }

  const handleCreate = async () => {
    if (!createName.trim()) {
      setCreateError('El nombre es requerido')
      return
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/lake/files/create`,
        {
          type: createType,
          path: createPath,
          name: createName
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        setShowCreateModal(false)
        fetchFiles() // Refresh file list
        
        // Open the new file if it's not a folder
        if (createType !== 'folder') {
          const newPath = createPath ? `${createPath}/${createName}` : createName
          onSelectFile?.(newPath)
        }
      }
    } catch (err: any) {
      setCreateError(err.response?.data?.error || 'Error al crear archivo')
    }
  }

  const handleDelete = async (path: string, isFolder: boolean) => {
    if (!confirm(`¿Estás seguro de eliminar ${isFolder ? 'esta carpeta' : 'este archivo'}?`)) {
      return
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/lake/files`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { path }
      })
      fetchFiles()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar')
    }
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
          case 'python': return '🐍'
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
    const isFolder = item.type === 'folder'

    return (
      <div key={item.path} style={{ paddingLeft: `${padding}px` }}>
        <div
          className={`group flex items-center space-x-2 px-2 py-1 text-sm rounded cursor-pointer ${
            item.type === 'file'
              ? 'hover:bg-blue-50 text-gray-700'
              : 'hover:bg-gray-100 text-gray-800'
          }`}
          onClick={() => {
            if (isFolder) {
              toggleFolder(item.path)
            } else {
              onSelectFile?.(item.path)
            }
          }}
        >
          <span className="w-4 text-center">
            {isFolder && (isExpanded ? '▼' : '▶')}
          </span>
          <span className="text-base">{getIcon(item)}</span>
          <span className="truncate flex-1">{item.name}</span>
          {item.size && (
            <span className="text-xs text-gray-400">{formatSize(item.size)}</span>
          )}
          
          {/* Context menu for folders */}
          {isFolder && (
            <div className="hidden group-hover:flex items-center space-x-1">
              <button
                onClick={(e) => { e.stopPropagation(); openCreateModal('folder', item.path) }}
                className="p-1 hover:bg-gray-200 rounded"
                title="Nueva carpeta"
              >
                📁+
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); openCreateModal('python', item.path) }}
                className="p-1 hover:bg-gray-200 rounded"
                title="Nuevo script Python"
              >
                🐍+
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); openCreateModal('notebook', item.path) }}
                className="p-1 hover:bg-gray-200 rounded"
                title="Nuevo notebook"
              >
                📓+
              </button>
            </div>
          )}
          
          {/* Delete button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(item.path, isFolder) }}
            className="hidden group-hover:block p-1 hover:bg-red-100 text-red-600 rounded"
            title="Eliminar"
          >
            🗑️
          </button>
        </div>

        {isFolder && isExpanded && item.children?.map(child => 
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

      {/* Actions bar for files tab */}
      {activeTab === 'files' && (
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex space-x-2">
          <button
            onClick={() => openCreateModal('folder', '')}
            className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            📁 Carpeta
          </button>
          <button
            onClick={() => openCreateModal('python', '')}
            className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            🐍 Python
          </button>
          <button
            onClick={() => openCreateModal('notebook', '')}
            className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            📓 Notebook
          </button>
        </div>
      )}

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
            <p className="text-sm text-gray-500 p-2">Cargando catálogo...</p>
          )
        ) : (
          files ? (
            <div className="space-y-0.5">
              {files.children?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Workspace vacío</p>
                  <p className="text-xs mt-1">Crea carpetas, scripts o notebooks</p>
                </div>
              ) : (
                files.children?.map(child => renderFileTree(child))
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 p-2">Cargando archivos...</p>
          )
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <h3 className="text-lg font-medium mb-4">
              {createType === 'folder' && 'Nueva Carpeta'}
              {createType === 'python' && 'Nuevo Script Python'}
              {createType === 'notebook' && 'Nuevo Notebook'}
            </h3>
            
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={
                createType === 'folder' ? 'nombre_carpeta' :
                createType === 'python' ? 'script.py' :
                'notebook.ipynb'
              }
              className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
              autoFocus
            />
            
            {createError && (
              <p className="text-sm text-red-600 mb-2">{createError}</p>
            )}
            
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LakeExplorer
