import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { setSessionExpiredHandler } from './auth/session'
import Layout from './components/Layout'
import Login from './pages/Login'
import Workbench from './pages/Workbench'
import NotebooksList from './pages/NotebooksList'
import NotebookPage from './pages/NotebookPage'
import ErrorPage from './pages/ErrorPage'

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))

  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (stored) setToken(stored)
  }, [])

  const handleLogin = (newToken: string) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
  }

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token')
    setToken(null)
  }, [])

  useEffect(() => {
    setSessionExpiredHandler(handleLogout)
    return () => setSessionExpiredHandler(null)
  }, [handleLogout])

  return (
    <Routes>
      <Route path="/login" element={
        token ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
      } />
      <Route path="/" element={
        token ? <Layout onLogout={handleLogout} /> : <Navigate to="/login" />
      }>
        <Route index element={<Workbench token={token!} />} />
        <Route path="/notebooks" element={<NotebooksList token={token!} />} />
        <Route path="/notebook/:path" element={<NotebookPage token={token!} />} />
      </Route>
      <Route path="/error" element={<ErrorPage />} />
    </Routes>
  )
}

export default App
