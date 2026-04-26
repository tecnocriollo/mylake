import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { API_BASE_URL } from './config'

// Función para enviar errores al backend
async function sendErrorToBackend(error: Error | string, extraInfo?: Record<string, any>) {
  const errorData = {
    message: String(error),
    stack: error instanceof Error ? error.stack : undefined,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    ...extraInfo
  }

  try {
    await fetch(`${API_BASE_URL}/api/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    })
  } catch (e) {
    // Si falla el reporte, al menos lo logueamos en consola
    console.error('Failed to report error:', e)
  }
}

// Captura errores no manejados
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
  sendErrorToBackend(
    event.error || event.message,
    { 
      type: 'window.onerror',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }
  )
})

// Captura errores de promesas no manejadas
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason)
  sendErrorToBackend(
    event.reason,
    { type: 'unhandledrejection' }
  )
})

// Envolver componentes para capturar errores de React
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    sendErrorToBackend(error, { 
      type: 'react',
      componentStack: errorInfo.componentStack 
    })
    // Redirigir a página de error después de reportar
    window.location.href = '/error'
  }

  render() {
    // No renderizar nada, la redirección se maneja en componentDidCatch
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
)
