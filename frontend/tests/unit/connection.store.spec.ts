import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import axios from 'axios'
import { useConnectionStore } from '@/stores/connection'

vi.mock('axios')

describe('Pinia: useConnectionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('initializes with online state by default', () => {
    const store = useConnectionStore()
    expect(store.isOffline).toBe(false)
    expect(store.offlineReason).toBeNull()
    expect(store.isChecking).toBe(false)
    expect(store.lastChecked).toBeNull()
  })

  it('sets offline state and reason correctly with setOffline()', () => {
    const store = useConnectionStore()
    store.setOffline('Server down')

    expect(store.isOffline).toBe(true)
    expect(store.offlineReason).toBe('Server down')
    expect(store.lastChecked).toBeInstanceOf(Date)
  })

  it('restores online state and clears reason with setOnline()', () => {
    const store = useConnectionStore()
    store.setOffline('Server down')
    expect(store.isOffline).toBe(true)

    store.setOnline()
    expect(store.isOffline).toBe(false)
    expect(store.offlineReason).toBeNull()
  })

  it('returns true and sets online when checkConnection() succeeds', async () => {
    const store = useConnectionStore()
    store.setOffline('Was offline')

    vi.mocked(axios.get).mockResolvedValueOnce({
      status: 200,
      data: { status: 'healthy', services: { database: 'connected' } },
      statusText: 'OK',
      headers: {},
      config: {} as never,
    })

    const isConnected = await store.checkConnection()

    expect(isConnected).toBe(true)
    expect(store.isOffline).toBe(false)
    expect(store.offlineReason).toBeNull()
    expect(store.isChecking).toBe(false)
  })

  it('returns false and sets offline when checkConnection() encounters an error', async () => {
    const store = useConnectionStore()

    vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network Error'))

    const isConnected = await store.checkConnection()

    expect(isConnected).toBe(false)
    expect(store.isOffline).toBe(true)
    expect(store.offlineReason).toContain('offline')
    expect(store.isChecking).toBe(false)
  })
})
