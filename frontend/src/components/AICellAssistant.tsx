import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config'

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: AIAction[]
}

interface AIAction {
  type: 'add_cell' | 'explain' | 'modify' | 'run'
  description: string
  cell_type?: 'code' | 'markdown'
  code?: string
  cell_index?: number
}

interface AICellAssistantProps {
  token: string
  cells: Array<{
    id: string
    cell_type: 'code' | 'markdown'
    source: string[]
  }>
  onAction: (action: AIAction) => void
  selectedCellId?: string
}

export default function AICellAssistant({ token, cells, onAction, selectedCellId }: AICellAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('kimi-k2.6:cloud')
  const [availableModels, setAvailableModels] = useState<string[]>(['kimi-k2.6:cloud', 'qwen2.5-coder:1.5b'])
  const [mode, setMode] = useState<'ask' | 'edit'>('ask')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Fetch available models from Ollama
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/ai/models`, { headers })
      if (response.data.models) {
        setAvailableModels(response.data.models)
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getContext = () => {
    return cells.map((cell, index) => {
      const type = cell.cell_type === 'code' ? '🐍' : '📝'
      const content = cell.source.join('').slice(0, 200)
      const isSelected = cell.id === selectedCellId ? ' [SELECTED]' : ''
      return `Cell ${index + 1}${isSelected} ${type}:\n${content}`
    }).join('\n\n---\n\n')
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const context = getContext()
      const response = await axios.post(
        `${API_BASE_URL}/api/ai/chat`,
        {
          message: userMessage,
          context,
          model: selectedModel,
          selected_cell_id: selectedCellId,
          mode
        },
        { headers }
      )

      const assistantMessage = response.data
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: assistantMessage.content,
        actions: assistantMessage.actions 
      }])
    } catch (error) {
      console.error('AI chat error:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Error al procesar la solicitud. Intenta de nuevo.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const executeAction = (action: AIAction) => {
    onAction(action)
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `✅ Acción ejecutada: ${action.description}`
    }])
  }

  return (
    <>
      {/* Floating button */}
      <button
        data-ai-button="true"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all duration-300 ${
          isOpen 
            ? 'bg-red-500 text-white rotate-45' 
            : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:scale-110'
        }`}
      >
        {isOpen ? '×' : '🤖'}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">🤖 AI Assistant</h3>
              <div className="flex items-center gap-2">
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'ask' | 'edit')}
                  className="text-xs bg-white/20 text-white border-none rounded px-2 py-1 cursor-pointer"
                >
                  <option value="ask" className="text-gray-800">Ask</option>
                  <option value="edit" className="text-gray-800">Edit</option>
                </select>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="text-xs bg-white/20 text-white border-none rounded px-2 py-1 cursor-pointer"
                >
                  {availableModels.map(model => (
                    <option key={model} value={model} className="text-gray-800">
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-purple-100 mt-1">
              {mode === 'edit'
                ? (selectedCellId ? 'Celda seleccionada' : 'Ninguna celda seleccionada')
                : 'Modo pregunta — sin acciones'}
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-8">
                <p className="text-4xl mb-2">💡</p>
                <p className="text-sm">¡Hola! Soy tu asistente AI.</p>
                {mode === 'ask' ? (
                  <>
                    <p className="text-xs mt-2">Modo Ask: pregunta lo que quieras.</p>
                    <ul className="text-xs mt-1 space-y-1">
                      <li>• Explicar conceptos</li>
                      <li>• Revisar código</li>
                      <li>• Responder dudas</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="text-xs mt-2">Modo Edit: modifico tu notebook.</p>
                    <ul className="text-xs mt-1 space-y-1">
                      <li>• Agregar celdas de código</li>
                      <li>• Explicar el código</li>
                      <li>• Modificar celdas</li>
                      <li>• Ejecutar acciones</li>
                    </ul>
                  </>
                )}
              </div>
            )}
            
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  
                  {/* Action buttons */}
                  {mode === 'edit' && msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.actions.map((action, ai) => (
                        <button
                          key={ai}
                          onClick={() => executeAction(action)}
                          className="w-full text-left text-xs bg-white/80 hover:bg-white text-blue-600 rounded px-2 py-1 transition-colors"
                        >
                          {action.type === 'add_cell' && '➕ '}
                          {action.type === 'explain' && '💡 '}
                          {action.type === 'modify' && '✏️ '}
                          {action.type === 'run' && '▶️ '}
                          {action.description}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-3">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="bg-purple-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
