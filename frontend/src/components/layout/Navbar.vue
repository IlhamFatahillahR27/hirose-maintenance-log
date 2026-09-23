<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getInitials } from '@/utils/initials'
import { Wrench, Users, ClipboardList, LogOut } from 'lucide-vue-next'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const isProfileOpen = ref(false)
const profileDropdownRef = ref<HTMLElement | null>(null)

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

function toggleProfileDropdown() {
  isProfileOpen.value = !isProfileOpen.value
}

function closeProfileDropdown() {
  isProfileOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  if (
    profileDropdownRef.value &&
    !profileDropdownRef.value.contains(event.target as Node)
  ) {
    closeProfileDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

async function handleLogout() {
  closeProfileDropdown()
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

        <!-- Role Badge & User Profile Avatar Dropdown -->
        <div class="flex items-center gap-3">
          <!-- Role Badge displayed outside profile dropdown -->
          <span
            :class="[
              'text-xs px-2.5 py-1 rounded-full font-semibold border uppercase tracking-wider select-none',
              roleBadgeClass,
            ]"
          >
            {{ authStore.role }}
          </span>

          <!-- User Avatar & Dropdown -->
          <div class="relative" ref="profileDropdownRef">
            <button
              type="button"
              @click="toggleProfileDropdown"
              class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-800 border-2 border-blue-200 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs transition-all cursor-pointer font-bold text-sm select-none"
              :title="authStore.user?.username || 'User Profile'"
              aria-haspopup="true"
              :aria-expanded="isProfileOpen"
            >
              {{ getInitials(authStore.user?.username) }}
            </button>

            <!-- Dropdown Menu: Berisikan Nama Pengguna, Email, dan Tombol Logout -->
            <transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <div
                v-if="isProfileOpen"
                class="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50"
              >
                <!-- Informasi Pengguna & Email -->
                <div class="px-4 py-2 border-b border-slate-100">
                  <p class="text-sm font-semibold text-slate-900 truncate">
                    {{ authStore.user?.username }}
                  </p>
                  <p class="text-xs text-slate-500 truncate mt-0.5">
                    {{ authStore.user?.email || 'user@hirose.co.id' }}
                  </p>
                </div>

                <!-- Tombol Logout -->
                <div class="p-1 pt-1.5">
                  <button
                    type="button"
                    @click="handleLogout"
                    class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer text-left font-medium"
                  >
                    <LogOut class="w-4 h-4" />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
