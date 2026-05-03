import axios from 'axios'

let onSessionExpired: (() => void) | null = null

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler
}

function isPublicAuthFailure(url: string): boolean {
  return url.includes('/api/auth/login') || url.includes('/api/auth/register')
}

let interceptorInstalled = false

function installAxios401Interceptor() {
  if (interceptorInstalled) return
  interceptorInstalled = true
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status
      const url = String(error.config?.url ?? '')
      if (status === 401 && !isPublicAuthFailure(url)) {
        onSessionExpired?.()
      }
      return Promise.reject(error)
    }
  )
}

installAxios401Interceptor()
