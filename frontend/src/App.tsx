import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Login from './pages/Login'
import Workbench from './pages/Workbench'

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

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  return (
    <Routes>
      <Route path="/login" element={
        token ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
      } />
      <Route path="/" element={
        token ? <Layout onLogout={handleLogout} /> : <Navigate to="/login" />
      }>
        <Route index element={<Workbench token={token!} />} />
      </Route>
    </Routes>
  )
}

export default App
