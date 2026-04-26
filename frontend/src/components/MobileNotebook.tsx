import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import CodeMirrorEditor from './CodeMirrorEditor'
import axios from 'axios'
import { API_BASE_URL } from '../config'

interface MobileNotebookProps {
  token: string
  notebookPath?: string
}

interface Cell {
  id: string
  cell_type: 'code' | 'markdown'
  source: string[]
  outputs?: Output[]
  execution_count?: number
  metadata?: Record<string, any>
}

interface Output {
  output_type: 'stream' | 'stdout' | 'stderr' | 'display_data' | 'execute_result' | 'error'
  text?: string[]
  data?: Record<string, any>
  ename?: string
  evalue?: string
  traceback?: string[]
  execution_count?: number
}

interface Notebook {
  metadata: Record<string, any>
  nbformat: number
  nbformat_minor: number
  cells: Cell[]
}

interface NotebookInfo {
  name: string
  path: string
  modified: string
  created: string
}

export default function MobileNotebook({ token, notebookPath }: MobileNotebookProps) {
  const navigate = useNavigate()
  const [notebooks, setNotebooks] = useState<NotebookInfo[]>([])
  const [currentNotebook, setCurrentNotebook] = useState<Notebook | null>(null)
  const [currentPath, setCurrentPath] = useState<string>(notebookPath || '')
  const [cells, setCells] = useState<Cell[]>([])
  const [activeCellId, setActiveCellId] = useState<string | null>(null)
  const [editingCellId, setEditingCellId] = useState<string | null>(null)
  const [collapsedOutputs, setCollapsedOutputs] = useState<Set<string>>(new Set())
  const [executingCells, setExecutingCells] = useState<Set<string>>(new Set())
  const [notebookType, setNotebookType] = useState<'python' | 'spark'>('python')  // Tipo de notebook
  const [sparkInitialized, setSparkInitialized] = useState(false)  // Track if Spark is already initialized
  const [_kernelId, setKernelId] = useState<string | null>(null)  // Kernel ID actual

  // Load kernel info on mount
  useEffect(() => {
    getActiveKernel()
  }, [])
  const [showFileMenu, setShowFileMenu] = useState(false)
  const [newNotebookName, setNewNotebookName] = useState('')
  const [showNewNotebookModal, setShowNewNotebookModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null)
  
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const headers = { Authorization: `Bearer ${token}` }

  // Load notebooks list
  const loadNotebooks = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/jupyter/notebooks`, { headers })
      setNotebooks(response.data.notebooks || [])
      setError('')
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load notebooks'
      setError(errorMsg)
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.')
        // Optionally redirect to login
        // window.location.href = '/login'
      }
    }
  }, [token])

  // Load specific notebook
  const loadNotebook = useCallback(async (path: string) => {
    if (!path) return
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/jupyter/notebooks/${encodeURIComponent(path)}`, { headers })
      const notebook = response.data
      setCurrentNotebook(notebook)
      
      // Leer tipo de notebook del metadata
      const savedType = notebook.metadata?.notebook_type
      if (savedType === 'spark' || savedType === 'python') {
        setNotebookType(savedType)
      }
      
      // Convert cells to have IDs
      const cellsWithIds = notebook.cells.map((cell: any) => ({
        ...cell,
        id: cell.id || `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source: Array.isArray(cell.source) ? cell.source : [cell.source]
      }))
      
      setCells(cellsWithIds)
      setCurrentPath(path)
      setError('')
      // Navigate to notebook URL
      navigate(`/notebook/${encodeURIComponent(path)}`)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load notebook')
    }
  }, [token, navigate])

  // Initial load
  useEffect(() => {
    loadNotebooks()
    if (notebookPath) {
      loadNotebook(notebookPath)
    }
  }, [notebookPath, loadNotebooks, loadNotebook])

  // Auto-save on cell changes
  const saveNotebook = async () => {
    if (!currentPath || !currentNotebook) return
    
    const notebook = {
      ...currentNotebook,
      metadata: {
        ...currentNotebook.metadata,
        notebook_type: notebookType  // Guardar tipo de notebook
      },
      cells: cells.map(({ id, ...cell }) => ({
        ...cell,
        cell_type: cell.cell_type,
        source: cell.source,
        outputs: cell.outputs,
        execution_count: cell.execution_count,
        metadata: cell.metadata
      }))
    }
    
    try {
      await axios.put(
        `${API_BASE_URL}/api/jupyter/notebooks/${encodeURIComponent(currentPath)}`,
        notebook,
        { headers }
      )
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save')
    }
  }

  // Create new notebook
  const createNotebook = async () => {
    if (!newNotebookName.trim()) return
    
    try {
      await axios.post(
        `${API_BASE_URL}/api/jupyter/notebooks`,
        { name: newNotebookName },
        { headers }
      )
      setNewNotebookName('')
      setShowNewNotebookModal(false)
      loadNotebooks()
      setSuccess('Notebook created!')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create notebook')
    }
  }

  // Delete notebook
  const deleteNotebook = async (path: string) => {
    if (!confirm('Delete this notebook?')) return
    
    try {
      await axios.delete(
        `${API_BASE_URL}/api/jupyter/notebooks/${encodeURIComponent(path)}`,
        { headers }
      )
      loadNotebooks()
      if (currentPath === path) {
        setCurrentNotebook(null)
        setCells([])
        setCurrentPath('')
      }
      setSuccess('Deleted!')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete')
    }
  }

  // Obtener kernel activo
  const getActiveKernel = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/jupyter/kernels`, { headers })
      const kernels = response.data || []
      if (kernels.length > 0) {
        setKernelId(kernels[0].id)
        return kernels[0].id
      }
      return null
    } catch (err) {
      console.error('Failed to get kernels:', err)
      return null
    }
  }

  // Reset sparkInitialized when notebook type changes
  useEffect(() => {
    setSparkInitialized(false)
  }, [notebookType])

  // Restart kernel
  const restartKernel = async () => {
    if (!confirm('Restart kernel? All variables will be lost.')) return
    
    try {
      // Get current kernel
      const currentKernel = await getActiveKernel()
      if (currentKernel) {
        // Restart via Jupyter API
        await axios.post(
          `${API_BASE_URL}/api/jupyter/proxy/api/kernels/${currentKernel}/restart`,
          {},
          { headers }
        )
      }
      // Reset Spark state
      setSparkInitialized(false)
      setKernelId(null)
      setSuccess('Kernel restarted!')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to restart kernel')
    }
  }

  // Add cell
  const addCell = (type: 'code' | 'markdown', afterId?: string) => {
    const newCell: Cell = {
      id: `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cell_type: type,
      source: type === 'code' ? ['# Your code here'] : ['## Markdown cell'],
      outputs: [],
      metadata: {}
    }
    
    setCells(prev => {
      if (afterId) {
        const index = prev.findIndex(c => c.id === afterId)
        const newCells = [...prev]
        newCells.splice(index + 1, 0, newCell)
        return newCells
      }
      return [...prev, newCell]
    })
    
    setEditingCellId(newCell.id)
    setActiveCellId(newCell.id)
  }

  // Delete cell
  const deleteCell = (cellId: string) => {
    if (!confirm('Delete this cell?')) return
    setCells(prev => prev.filter(c => c.id !== cellId))
    if (editingCellId === cellId) setEditingCellId(null)
    if (activeCellId === cellId) setActiveCellId(null)
  }

  // Update cell content
  const updateCellSource = (cellId: string, newSource: string) => {
    setCells(prev => prev.map(c => 
      c.id === cellId ? { ...c, source: [newSource] } : c
    ))
  }

  // Execute cell
  const executeCell = async (cellId: string) => {
    const cell = cells.find(c => c.id === cellId)
    if (!cell || cell.cell_type !== 'code') return
    
    // Código de inicialización según tipo de notebook
    // Solo inicializa Spark una vez
    let initCode = ''
    if (notebookType === 'spark' && !sparkInitialized) {
      initCode = `import sys
from io import StringIO
# Capturar stdout
_old_stdout = sys.stdout
sys.stdout = StringIO()

from pyspark.sql import SparkSession
spark = SparkSession.builder.appName("MyLake").getOrCreate()

# Restaurar y mostrar output
sys.stdout = _old_stdout
print("Spark iniciado:", spark.version)
`
    }
    
    const code = initCode + cell.source.join('')
    setExecutingCells(prev => new Set([...prev, cellId]))
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/jupyter/execute`,
        { 
          code, 
          cell_id: cellId,
          kernel_type: notebookType === 'spark' ? 'spark' : 'python3'
        },
        { headers }
      )
      
      const result = response.data
      
      // Marcar Spark como inicializado si fue exitoso
      if (notebookType === 'spark' && !sparkInitialized && result.success) {
        setSparkInitialized(true)
      }
      
      setCells(prev => prev.map(c => {
        if (c.id === cellId) {
          // Use real outputs from backend, or fallback message
          const outputs = result.success && result.outputs?.length > 0
            ? result.outputs
            : [{ output_type: 'stream', text: ['(no output)'] }]
            
          return {
            ...c,
            execution_count: (c.execution_count || 0) + 1,
            outputs: outputs
          }
        }
        return c
      }))
      
      setCollapsedOutputs(prev => {
        const newSet = new Set(prev)
        newSet.delete(cellId)
        return newSet
      })
    } catch (err: any) {
      setCells(prev => prev.map(c => {
        if (c.id === cellId) {
          return {
            ...c,
            outputs: [{
              output_type: 'error',
              ename: 'Execution Error',
              evalue: err.response?.data?.error || err.message
            }]
          }
        }
        return c
      }))
    } finally {
      setExecutingCells(prev => {
        const newSet = new Set(prev)
        newSet.delete(cellId)
        return newSet
      })
    }
  }

  // Estado para mostrar mensaje de inicialización de Spark
  const isSparkInitializing = (cellId: string) => {
    return notebookType === 'spark' && executingCells.has(cellId) && !sparkInitialized
  }

  // Toggle output collapse
  const toggleOutput = (cellId: string) => {
    setCollapsedOutputs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cellId)) {
        newSet.delete(cellId)
      } else {
        newSet.add(cellId)
      }
      return newSet
    })
  }

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setSwipeStartX(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartX === null) return
    
    const swipeEndX = e.changedTouches[0].clientX
    const diff = swipeStartX - swipeEndX
    
    // Swipe left/right to navigate cells
    if (Math.abs(diff) > 50) {
      const currentIndex = cells.findIndex(c => c.id === activeCellId)
      if (diff > 0 && currentIndex < cells.length - 1) {
        // Swipe left - next cell
        setActiveCellId(cells[currentIndex + 1].id)
        cellRefs.current[cells[currentIndex + 1].id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right - previous cell
        setActiveCellId(cells[currentIndex - 1].id)
        cellRefs.current[cells[currentIndex - 1].id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    
    setSwipeStartX(null)
  }

  // Render markdown preview
  const renderMarkdown = (source: string[]) => {
    const text = source.join('')
    // Simple markdown rendering (in production, use a proper markdown parser)
    return text
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/```([^`]*?)```/gs, '<pre class="bg-gray-100 p-2 rounded text-sm overflow-x-auto"><code>$1</code></pre>')
      .replace(/\n/g, '<br/>')
  }

  // Render output
  const renderOutput = (output: Output): string => {
    switch (output.output_type) {
      case 'stream':
      case 'stdout':
      case 'stderr':
        return (output.text || []).join('\n')
      case 'display_data':
      case 'execute_result':
        if (output.data?.['text/plain']) {
          return Array.isArray(output.data['text/plain']) 
            ? output.data['text/plain'].join('')
            : String(output.data['text/plain'])
        }
        if (output.data?.['text/html']) {
          return '[HTML Output]'
        }
        return '[Output]'
      case 'error':
        return `${output.ename}: ${output.evalue}`
      default:
        return ''
    }
  }

  if (!currentPath) {
    // Notebook selector view
    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-lg font-bold text-gray-900">📱 Mobile Notebooks</h1>
          <button
            onClick={() => setShowNewNotebookModal(true)}
            className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium"
          >
            + New
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-b border-green-200 px-4 py-2 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Notebook list */}
        <div className="flex-1 overflow-auto p-4">
          {notebooks.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-lg mb-2">📝 No notebooks yet</p>
              <button
                onClick={() => setShowNewNotebookModal(true)}
                className="text-blue-600 underline"
              >
                Create your first notebook
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {notebooks.map(nb => (
                <div
                  key={nb.path}
                  className="bg-white rounded-lg shadow-sm border p-4 flex items-center justify-between"
                >
                  <button
                    onClick={() => loadNotebook(nb.path)}
                    className="flex-1 text-left"
                  >
                    <h3 className="font-medium text-gray-900">{nb.name}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(nb.modified).toLocaleDateString()}
                    </p>
                  </button>
                  <button
                    onClick={() => deleteNotebook(nb.path)}
                    className="text-red-500 p-2 hover:bg-red-50 rounded"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New notebook modal */}
        {showNewNotebookModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-lg font-bold mb-4">New Notebook</h2>
              <input
                type="text"
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                placeholder="my_notebook.ipynb"
                className="w-full border rounded px-3 py-2 mb-4"
                onKeyPress={(e) => e.key === 'Enter' && createNotebook()}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewNotebookModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={createNotebook}
                  className="flex-1 bg-blue-600 text-white py-2 rounded"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Notebook editor view
  return (
    <div 
      className="h-full flex flex-col bg-gray-50"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={() => setShowFileMenu(!showFileMenu)}
            className="text-xl p-1 hover:bg-gray-100 rounded"
          >
            ☰
          </button>
          <span className="font-medium truncate text-sm">
            {currentPath.split('/').pop()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {success && (
            <span className="text-xs text-green-600">{success}</span>
          )}
          <select
            value={notebookType}
            onChange={(e) => setNotebookType(e.target.value as 'python' | 'spark')}
            className="text-xs border rounded px-2 py-1 bg-white"
          >
            <option value="python">🐍 Python</option>
            <option value="spark">⚡ Spark</option>
          </select>
          <button
            onClick={restartKernel}
            className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium"
            title="Restart Kernel"
          >
            🔄 Restart
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              setSuccess('URL copied!')
              setTimeout(() => setSuccess(''), 2000)
            }}
            className="bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-medium"
          >
            🔗 Share
          </button>
          <button
            onClick={saveNotebook}
            className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium"
          >
            💾 Save
          </button>
          {notebookType === 'spark' && (
            <button
              onClick={async () => {
                try {
                  const response = await axios.get(
                    `${API_BASE_URL}/api/jupyter/spark-logs`,
                    { headers }
                  )
                  const logs = response.data.logs || response.data.message || 'No logs available'
                  alert(logs.slice(-2000) || 'No logs yet')
                } catch (err: any) {
                  setError('Failed to fetch logs: ' + err.message)
                }
              }}
              className="bg-orange-600 text-white px-3 py-1.5 rounded text-sm font-medium"
            >
              📜 Logs
            </button>
          )}
        </div>
      </div>

      {/* File menu */}
      {showFileMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => setShowFileMenu(false)}>
          <div className="absolute left-0 top-14 bottom-0 w-64 bg-white shadow-lg overflow-auto">
            <div className="p-4">
              <h3 className="font-medium mb-3">Notebooks</h3>
              <div className="space-y-1">
                {notebooks.map(nb => (
                  <button
                    key={nb.path}
                    onClick={() => {
                      loadNotebook(nb.path)
                      setShowFileMenu(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-sm ${
                      currentPath === nb.path ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    {nb.name}
                  </button>
                ))}
              </div>
              <hr className="my-3" />
              <button
                onClick={() => {
                  setCurrentPath('')
                  setShowFileMenu(false)
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                ← Back to list
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Cells */}
      <div className="flex-1 overflow-auto p-2 space-y-2 pb-20">
        {cells.map((cell) => (
          <div
            key={cell.id}
            ref={el => cellRefs.current[cell.id] = el}
            className={`bg-white rounded-lg shadow-sm border-2 transition-all ${
              activeCellId === cell.id ? 'border-blue-400' : 'border-transparent'
            }`}
            onClick={() => setActiveCellId(cell.id)}
          >
            {/* Cell toolbar */}
            <div className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded-t-lg border-b border-gray-100">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 font-mono">
                  [{cell.cell_type === 'code' ? (cell.execution_count || ' ') : 'md'}]
                </span>
                {cell.cell_type === 'code' && (
                  <button
                    onClick={() => executeCell(cell.id)}
                    disabled={executingCells.has(cell.id)}
                    className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200 disabled:opacity-50"
                  >
                    {executingCells.has(cell.id) ? '⏳' : '▶ Run'}
                  </button>
                )}
                {isSparkInitializing(cell.id) && (
                  <span className="text-xs text-orange-600 animate-pulse ml-1">
                    ⚡ Iniciando Spark...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingCellId(editingCellId === cell.id ? null : cell.id)}
                  className="text-xs text-gray-600 px-2 py-0.5 hover:bg-gray-200 rounded"
                >
                  {editingCellId === cell.id ? '👁️ View' : '✏️ Edit'}
                </button>
                <button
                  onClick={() => deleteCell(cell.id)}
                  className="text-xs text-red-500 px-2 py-0.5 hover:bg-red-50 rounded"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Cell content */}
            <div className="p-2">
              {cell.cell_type === 'markdown' ? (
                // Markdown cell
                editingCellId === cell.id ? (
                  <CodeMirrorEditor
                    height="120px"
                    language="markdown"
                    value={cell.source.join('')}
                    onChange={(value) => updateCellSource(cell.id, value || '')}
                    options={{ lineNumbers: false }}
                  />
                ) : (
                  <div
                    className="prose prose-sm max-w-none text-gray-800"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(cell.source) }}
                  />
                )
              ) : (
                // Code cell
                <div>
                  {editingCellId === cell.id ? (
                    <CodeMirrorEditor
                      height="150px"
                      language="python"
                      value={cell.source.join('')}
                      onChange={(value) => updateCellSource(cell.id, value || '')}
                      options={{ lineNumbers: true }}
                    />
                  ) : (
                    <pre className="text-sm bg-gray-50 p-2 rounded overflow-x-auto font-mono text-gray-800">
                      <code>{cell.source.join('')}</code>
                    </pre>
                  )}

                  {/* Output */}
                  {cell.outputs && cell.outputs.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleOutput(cell.id)}
                        className="text-xs text-gray-500 flex items-center gap-1"
                      >
                        {collapsedOutputs.has(cell.id) ? '▶' : '▼'} Output
                        {!collapsedOutputs.has(cell.id) && (
                          <span className="text-gray-400">
                            ({cell.outputs.length} result{cell.outputs.length !== 1 ? 's' : ''})
                          </span>
                        )}
                      </button>
                      {!collapsedOutputs.has(cell.id) && (
                        <div className="mt-1 bg-gray-100 rounded p-2 text-sm font-mono overflow-x-auto">
                          {cell.outputs.map((output, i) => (
                            <div key={i} className={output.output_type === 'error' ? 'text-red-600' : ''}>
                              {output.output_type === 'error' ? (
                                <div>
                                  <div className="font-bold">{output.ename}: {output.evalue}</div>
                                  {output.traceback && (
                                    <pre className="text-xs mt-1 text-red-500">
                                      {output.traceback.join('\n')}
                                    </pre>
                                  )}
                                </div>
                              ) : (
                                <pre className="whitespace-pre-wrap">{renderOutput(output)}</pre>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add cell buttons */}
            <div className="flex justify-center gap-2 py-1 opacity-0 hover:opacity-100 transition-opacity">
              <button
                onClick={() => addCell('code', cell.id)}
                className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
              >
                + Code
              </button>
              <button
                onClick={() => addCell('markdown', cell.id)}
                className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
              >
                + Markdown
              </button>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {cells.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No cells yet</p>
            <div className="flex justify-center gap-2 mt-2">
              <button
                onClick={() => addCell('code')}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
              >
                + Code
              </button>
              <button
                onClick={() => addCell('markdown')}
                className="bg-purple-600 text-white px-3 py-1 rounded text-sm"
              >
                + Markdown
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2 flex items-center justify-between z-20">
        <div className="flex gap-2">
          <button
            onClick={() => addCell('code')}
            className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1"
          >
            <span>+</span>
            <span className="hidden sm:inline">Code</span>
          </button>
          <button
            onClick={() => addCell('markdown')}
            className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1"
          >
            <span>+</span>
            <span className="hidden sm:inline">Text</span>
          </button>
        </div>
        <div className="text-xs text-gray-500">
          {cells.length} cell{cells.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}