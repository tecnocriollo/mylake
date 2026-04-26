import axios from 'axios'

// Use environment variable or fallback to localhost for dev
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://207.180.223.160:8080'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
