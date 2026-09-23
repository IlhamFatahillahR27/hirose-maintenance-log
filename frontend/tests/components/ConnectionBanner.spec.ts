import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ConnectionBanner from '@/components/layout/ConnectionBanner.vue'
import { useConnectionStore } from '@/stores/connection'

describe('ConnectionBanner.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('does not render when backend is online', () => {
    const store = useConnectionStore()
    store.isOffline = false

    const wrapper = mount(ConnectionBanner)
    expect(wrapper.find('[data-testid="connection-banner"]').exists()).toBe(false)
  })

  it('renders prominently when backend is offline', async () => {
    const store = useConnectionStore()
    store.setOffline('Koneksi terputus')

    const wrapper = mount(ConnectionBanner)
    const banner = wrapper.find('[data-testid="connection-banner"]')

    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('Server Backend Offline / Terputus')
    expect(banner.text()).toContain('Koneksi terputus')
    expect(wrapper.find('[data-testid="retry-connection-button"]').exists()).toBe(true)
  })

  it('triggers checkConnection when retry button is clicked', async () => {
    const store = useConnectionStore()
    store.setOffline('Koneksi terputus')

    const checkSpy = vi.spyOn(store, 'checkConnection').mockResolvedValue(true)

    const wrapper = mount(ConnectionBanner)
    const retryBtn = wrapper.find('[data-testid="retry-connection-button"]')

    await retryBtn.trigger('click')
    expect(checkSpy).toHaveBeenCalled()
  })
})
