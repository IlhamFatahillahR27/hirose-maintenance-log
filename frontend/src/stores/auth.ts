import { defineStore } from 'pinia'
import api from '@/composables/useApi'

export interface UserProfile {
  id: number
  username: string
  email: string
  role: 'Operator' | 'Supervisor' | 'Admin' | string
  is_active: boolean
}

interface AuthState {
  token: string | null
  user: UserProfile | null
  isLoading: boolean
  errorMessage: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => {
    let initialUser: UserProfile | null = null
    const storedUser = localStorage.getItem('hirose_user')
    if (storedUser) {
      try {
        initialUser = JSON.parse(storedUser)
      } catch {
        localStorage.removeItem('hirose_user')
      }
    }

    return {
      token: localStorage.getItem('hirose_token'),
      user: initialUser,
      isLoading: false,
      errorMessage: null,
    }
  },

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    role: (state) => state.user?.role || '',
    isOperator: (state) => state.user?.role === 'Operator',
    isSupervisor: (state) => state.user?.role === 'Supervisor',
    isAdmin: (state) => state.user?.role === 'Admin',
  },

  actions: {
    async login(username: string, password: string) {
      this.isLoading = true
      this.errorMessage = null
      try {
        const response = await api.post('/api/auth/login', { username, password })
        const { token, user } = response.data

        this.token = token
        this.user = user

        localStorage.setItem('hirose_token', token)
        localStorage.setItem('hirose_user', JSON.stringify(user))

        return { success: true }
      } catch (err: any) {
        const message =
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Gagal masuk. Silakan periksa username dan kata sandi Anda.'
        this.errorMessage = message
        return { success: false, error: message }
      } finally {
        this.isLoading = false
      }
    },

    async fetchMe() {
      if (!this.token) return null
      try {
        const response = await api.get('/api/auth/me')
        this.user = response.data.user
        localStorage.setItem('hirose_user', JSON.stringify(this.user))
        return this.user
      } catch {
        this.logout()
        return null
      }
    },

    async logout() {
      try {
        if (this.token) {
          await api.post('/api/auth/logout')
        }
      } catch {
        // Ignore logout errors
      } finally {
        this.token = null
        this.user = null
        this.errorMessage = null
        localStorage.removeItem('hirose_token')
        localStorage.removeItem('hirose_user')
      }
    },
  },
})
