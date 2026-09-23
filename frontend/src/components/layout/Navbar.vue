<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Wrench, Users, ClipboardList, LogOut, User as UserIcon } from 'lucide-vue-next'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const roleBadgeClass = computed(() => {
  switch (authStore.role) {
    case 'Admin':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300'
    case 'Supervisor':
      return 'bg-purple-100 text-purple-800 border-purple-300'
    case 'Operator':
    default:
      return 'bg-blue-100 text-blue-800 border-blue-300'
  }
})

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <header class="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-xs">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Brand & Nav Links -->
        <div class="flex items-center gap-8">
          <div class="flex items-center gap-2 text-slate-900 font-bold text-lg tracking-tight">
            <div class="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Wrench class="w-5 h-5" />
            </div>
            <span>Hirose Maintenance Log</span>
          </div>

          <nav class="hidden md:flex items-center gap-2">
            <router-link
              to="/requests"
              :class="[
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                route.path.startsWith('/requests')
                  ? 'bg-slate-100 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
              ]"
            >
              <ClipboardList class="w-4 h-4" />
              <span>Daftar Tiket Kendala</span>
            </router-link>

            <router-link
              v-if="authStore.isAdmin"
              to="/users"
              :class="[
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                route.path.startsWith('/users')
                  ? 'bg-slate-100 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
              ]"
            >
              <Users class="w-4 h-4" />
              <span>Manajemen Pengguna</span>
            </router-link>
          </nav>
        </div>

        <!-- User Profile & Logout -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <UserIcon class="w-4 h-4 text-slate-500" />
            <span class="text-sm font-semibold text-slate-800">{{ authStore.user?.username }}</span>
            <span
              :class="[
                'text-xs px-2 py-0.5 rounded-full font-medium border uppercase tracking-wider',
                roleBadgeClass,
              ]"
            >
              {{ authStore.role }}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            @click="handleLogout"
            class="flex items-center gap-1.5 text-slate-600 hover:text-red-600 hover:border-red-200"
          >
            <LogOut class="w-4 h-4" />
            <span class="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </div>
    </div>
  </header>
</template>
