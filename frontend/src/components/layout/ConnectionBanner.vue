<script setup lang="ts">
import { useConnectionStore } from '@/stores/connection'
import { WifiOff, RefreshCw } from 'lucide-vue-next'

const connectionStore = useConnectionStore()

async function handleRetry() {
  await connectionStore.checkConnection()
}
</script>

<template>
  <transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform -translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform -translate-y-full opacity-0"
  >
    <div
      v-if="connectionStore.isOffline"
      class="bg-amber-600 text-white border-b border-amber-700 shadow-md select-none sticky top-0 z-50 px-4 py-2.5"
      role="alert"
      aria-live="assertive"
      data-testid="connection-banner"
    >
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div class="flex items-center gap-3 text-center sm:text-left">
          <div class="p-1.5 bg-amber-700/60 rounded-lg shrink-0">
            <WifiOff class="w-5 h-5 text-amber-100 animate-pulse" />
          </div>
          <div>
            <div class="font-bold text-sm leading-tight flex items-center gap-2 justify-center sm:justify-start">
              <span>Server Backend Offline / Terputus</span>
            </div>
            <p class="text-xs text-amber-100/90 mt-0.5 leading-snug">
              {{ connectionStore.offlineReason || 'Tidak dapat terhubung ke server API. Pastikan layanan backend sedang berjalan.' }}
            </p>
          </div>
        </div>

        <div class="shrink-0 flex items-center gap-2">
          <button
            type="button"
            @click="handleRetry"
            :disabled="connectionStore.isChecking"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-amber-900 hover:bg-amber-50 active:bg-amber-100 font-semibold text-xs rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            data-testid="retry-connection-button"
          >
            <RefreshCw
              :class="['w-3.5 h-3.5', connectionStore.isChecking ? 'animate-spin' : '']"
            />
            <span>{{ connectionStore.isChecking ? 'Memeriksa...' : 'Coba Hubungkan' }}</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
