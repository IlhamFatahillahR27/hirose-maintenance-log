import { describe, it, expect, beforeEach } from 'vitest'
import api from '@/composables/useApi'

describe('Composables: useApi & Axios Interceptors', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('exports an axios instance with json headers', () => {
    expect(api).toBeDefined()
    expect(api.defaults.headers['Content-Type']).toBe('application/json')
  })

  it('attaches Bearer token in request headers when token exists in localStorage', async () => {
    localStorage.setItem('hirose_token', 'sample_test_jwt_token')

    // Test the request interceptor handler directly
    const interceptor = (api.interceptors.request as any).handlers[0]
    expect(interceptor).toBeDefined()

    const config = await interceptor.fulfilled({
      headers: {},
    })

    expect(config.headers.Authorization).toBe('Bearer sample_test_jwt_token')
  })

  it('does not attach Authorization header when localStorage has no token', async () => {
    const interceptor = (api.interceptors.request as any).handlers[0]
    const config = await interceptor.fulfilled({
      headers: {},
    })

    expect(config.headers.Authorization).toBeUndefined()
  })
})
