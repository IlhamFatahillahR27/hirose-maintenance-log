import { defineStore } from 'pinia'
import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || ''

export interface ConnectionState {
  isOffline: boolean
  offlineReason: string | null
  isChecking: boolean
  lastChecked: Date | null
}

export const useConnectionStore = defineStore('connection', {
  state: (): ConnectionState => ({
    isOffline: false,
    offlineReason: null,
    isChecking: false,
    lastChecked: null,
  }),

  actions: {
    setOffline(reason?: string) {
      this.isOffline = true
      this.offlineReason =
        reason ||
        'Tidak dapat tersambung ke server backend. Pastikan layanan backend sedang aktif.'
      this.lastChecked = new Date()
    },

    setOnline() {
      this.isOffline = false
      this.offlineReason = null
      this.lastChecked = new Date()
    },

    async checkConnection(): Promise<boolean> {
      this.isChecking = true
      try {
        const response = await axios.get(`${baseURL}/health`, {
          timeout: 4000,
        })

        if (response.status === 200 && response.data?.status === 'healthy') {
          this.setOnline()
          return true
        } else if (response.status === 200) {
          // Server responded but might report unhealthy DB
          this.setOffline(
            response.data?.error ||
              'Layanan backend aktif namun database terputus.',
          )
          return false
        } else {
          this.setOffline('Server backend merespons dengan status tidak normal.')
          return false
        }
      } catch {
        this.setOffline(
          'Server backend masih offline atau tidak dapat dijangkau.',
        )
        return false
      } finally {
        this.isChecking = false
      }
    },
  },
})
