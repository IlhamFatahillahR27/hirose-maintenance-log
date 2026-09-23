<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useConnectionStore } from '@/stores/connection'
import Navbar from '@/components/layout/Navbar.vue'
import ConnectionBanner from '@/components/layout/ConnectionBanner.vue'

const route = useRoute()
const authStore = useAuthStore()
const connectionStore = useConnectionStore()

const showNavbar = computed(() => {
  return authStore.isAuthenticated && route.name !== 'login'
})

function onWindowFocus() {
  if (connectionStore.isOffline) {
    connectionStore.checkConnection()
  }
}

function onWindowOnline() {
  connectionStore.checkConnection()
}

onMounted(() => {
  window.addEventListener('focus', onWindowFocus)
  window.addEventListener('online', onWindowOnline)
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', onWindowFocus)
  window.removeEventListener('online', onWindowOnline)
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
    <ConnectionBanner />
    <Navbar v-if="showNavbar" />

    <main class="flex-1">
      <div v-if="showNavbar" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <RouterView />
      </div>
      <div v-else>
        <RouterView />
      </div>
    </main>

    <footer v-if="showNavbar" class="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
      PT Hirose Electric Indonesia &copy; 2026 &bull; Factory Maintenance Request Log System
    </footer>
  </div>
</template>

<style scoped></style>
