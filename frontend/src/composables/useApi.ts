import axios from 'axios'
import { useConnectionStore } from '@/stores/connection'

const baseURL = import.meta.env.VITE_API_BASE_URL || ''

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to attach Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hirose_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle session invalidation or deactivation, and detect offline backend
api.interceptors.response.use(
  (response) => {
    try {
      const connectionStore = useConnectionStore()
      if (connectionStore.isOffline) {
        connectionStore.setOnline()
      }
    } catch {
      // Pinia might not be active yet (e.g. during isolated unit tests)
    }
    return response
  },
  (error) => {
    // Check if error is network/offline error
    const isNetworkError =
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED' ||
      error.message === 'Network Error' ||
      [502, 503, 504].includes(error.response?.status)

    if (isNetworkError) {
      try {
        const connectionStore = useConnectionStore()
        connectionStore.setOffline(
          'Tidak dapat terhubung ke server backend (offline atau network error).',
        )
      } catch {
        // Pinia might not be active yet
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('hirose_token')
      localStorage.removeItem('hirose_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export function useApi() {
  return { api }
}

export default api
