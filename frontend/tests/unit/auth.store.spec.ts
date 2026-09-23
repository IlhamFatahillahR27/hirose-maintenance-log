import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

describe('Pinia: useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('initializes with unauthenticated state by default', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(store.role).toBe('')
    expect(store.isOperator).toBe(false)
    expect(store.isSupervisor).toBe(false)
    expect(store.isAdmin).toBe(false)
  })

  it('correctly evaluates role getters for Operator', () => {
    const store = useAuthStore()
    store.token = 'dummy_token'
    store.user = {
      id: 1,
      username: 'operator1',
      email: 'operator1@hirose.co.id',
      role: 'Operator',
      is_active: true,
    }

    expect(store.isAuthenticated).toBe(true)
    expect(store.role).toBe('Operator')
    expect(store.isOperator).toBe(true)
    expect(store.isSupervisor).toBe(false)
    expect(store.isAdmin).toBe(false)
  })

  it('correctly evaluates role getters for Supervisor', () => {
    const store = useAuthStore()
    store.token = 'dummy_token'
    store.user = {
      id: 2,
      username: 'supervisor1',
      email: 'supervisor1@hirose.co.id',
      role: 'Supervisor',
      is_active: true,
    }

    expect(store.isAuthenticated).toBe(true)
    expect(store.role).toBe('Supervisor')
    expect(store.isOperator).toBe(false)
    expect(store.isSupervisor).toBe(true)
    expect(store.isAdmin).toBe(false)
  })

  it('correctly evaluates role getters for Admin', () => {
    const store = useAuthStore()
    store.token = 'dummy_token'
    store.user = {
      id: 3,
      username: 'admin1',
      email: 'admin1@hirose.co.id',
      role: 'Admin',
      is_active: true,
    }

    expect(store.isAuthenticated).toBe(true)
    expect(store.role).toBe('Admin')
    expect(store.isOperator).toBe(false)
    expect(store.isSupervisor).toBe(false)
    expect(store.isAdmin).toBe(true)
  })

  it('clears state and localStorage on logout', async () => {
    const store = useAuthStore()
    store.token = 'token_abc'
    store.user = {
      id: 1,
      username: 'operator1',
      email: 'operator1@hirose.co.id',
      role: 'Operator',
      is_active: true,
    }
    localStorage.setItem('hirose_token', 'token_abc')
    localStorage.setItem('hirose_user', JSON.stringify(store.user))

    await store.logout()

    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(localStorage.getItem('hirose_token')).toBeNull()
    expect(localStorage.getItem('hirose_user')).toBeNull()
  })
})
