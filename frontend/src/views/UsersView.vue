<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import api from '@/composables/useApi'
import { useAuthStore } from '@/stores/auth'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import CreateUserModal from '@/components/users/CreateUserModal.vue'
import EditUserModal from '@/components/users/EditUserModal.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  UserPlus,
  Search,
  FilterX,
  RefreshCw,
  Mail,
  Shield,
  Loader2,
  Edit,
} from 'lucide-vue-next'

const authStore = useAuthStore()

// State
const users = ref<any[]>([])
const isLoading = ref(false)
const totalRecords = ref(0)
const currentPage = ref(1)
const limit = ref(10)

// Filters
const searchKeyword = ref('')
const selectedRole = ref('')
const selectedActive = ref('')

// Modals
const isCreateOpen = ref(false)
const isEditOpen = ref(false)
const selectedUser = ref<any | null>(null)
const updatingUserId = ref<number | null>(null)
const actionError = ref<string | null>(null)

// Debounced search
let searchTimer: any = null

function onSearchInput(val: string | number) {
  searchKeyword.value = String(val)
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    fetchUsers()
  }, 300)
}

function resetFilters() {
  searchKeyword.value = ''
  selectedRole.value = ''
  selectedActive.value = ''
  currentPage.value = 1
  fetchUsers()
}

async function fetchUsers() {
  isLoading.value = true
  actionError.value = null
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      limit: limit.value,
    }
    if (searchKeyword.value.trim()) {
      params.search = searchKeyword.value.trim()
    }
    if (selectedRole.value) {
      params.role = selectedRole.value
    }
    if (selectedActive.value !== '') {
      params.is_active = selectedActive.value === 'true'
    }

    const response = await api.get('/api/users', { params })
    users.value = response.data.data
    totalRecords.value = response.data.pagination.total_records
    currentPage.value = response.data.pagination.current_page
  } catch (err: any) {
    actionError.value = err.response?.data?.error || 'Gagal memuat daftar pengguna.'
  } finally {
    isLoading.value = false
  }
}

function onPage(event: DataTablePageEvent) {
  currentPage.value = event.page + 1
  limit.value = event.rows
  fetchUsers()
}

function openEditUser(user: any) {
  selectedUser.value = user
  isEditOpen.value = true
}

async function toggleUserStatus(user: any) {
  if (user.id === authStore.user?.id) {
    actionError.value = 'Anda tidak dapat menonaktifkan akun Admin Anda sendiri.'
    return
  }

  updatingUserId.value = user.id
  actionError.value = null

  try {
    await api.patch(`/api/users/${user.id}/status`, {
      is_active: !user.is_active,
    })
    await fetchUsers()
  } catch (err: any) {
    actionError.value = err.response?.data?.error || 'Gagal mengubah status aktif pengguna.'
  } finally {
    updatingUserId.value = null
  }
}

function formatDate(iso: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'Admin':
      return 'bg-emerald-50 text-emerald-800 border-emerald-300'
    case 'Supervisor':
      return 'bg-purple-50 text-purple-800 border-purple-300'
    case 'Operator':
    default:
      return 'bg-blue-50 text-blue-800 border-blue-300'
  }
}

// Watch filters
watch([selectedRole, selectedActive], () => {
  currentPage.value = 1
  fetchUsers()
})

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Top Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">
          Manajemen Pengguna Pabrik
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Kelola wewenang peran (RBAC) dan aktivasi / deaktivasi akun staf operasional.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          @click="fetchUsers"
          :disabled="isLoading"
          class="h-9 gap-1.5 text-slate-700 bg-white"
        >
          <RefreshCw :class="['w-4 h-4', isLoading ? 'animate-spin' : '']" />
          <span>Muat Ulang</span>
        </Button>

        <Button
          @click="isCreateOpen = true"
          class="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
        >
          <UserPlus class="w-4 h-4" />
          <span>Tambah Pengguna</span>
        </Button>
      </div>
    </div>

    <div v-if="actionError" class="p-3 text-sm rounded-lg bg-red-50 text-red-700 border border-red-200">
      {{ actionError }}
    </div>

    <!-- Unified Card Container: Filter Toolbar & DataTable -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <!-- Filter & Search Toolbar Section -->
      <div class="p-5 border-b border-slate-200 bg-slate-50/50">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <!-- Filter: Search -->
          <div>
            <Label for="filter-user-search" class="block text-xs font-semibold text-slate-700 mb-1.5">
              Pencarian
            </Label>
            <div class="relative">
              <Search class="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <Input
                id="filter-user-search"
                :model-value="searchKeyword"
                @update:model-value="onSearchInput"
                class="pl-9 h-9 bg-white"
              />
            </div>
          </div>

          <!-- Filter: Role -->
          <div>
            <Label for="filter-user-role" class="block text-xs font-semibold text-slate-700 mb-1.5">
              Role Wewenang
            </Label>
            <select
              id="filter-user-role"
              v-model="selectedRole"
              class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="">Semua Role</option>
              <option value="Operator">Operator</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <!-- Filter: Status -->
          <div>
            <Label for="filter-user-status" class="block text-xs font-semibold text-slate-700 mb-1.5">
              Status Akun
            </Label>
            <select
              id="filter-user-status"
              v-model="selectedActive"
              class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="">Semua Status</option>
              <option value="true">Aktif Saja</option>
              <option value="false">Nonaktif Saja</option>
            </select>
          </div>

          <!-- Reset Button -->
          <div>
            <Button
              type="button"
              variant="outline"
              @click="resetFilters"
              class="w-full h-9 gap-1.5 text-slate-600 hover:text-slate-900 bg-white"
            >
              <FilterX class="w-4 h-4" />
              <span>Reset Filter</span>
            </Button>
          </div>
        </div>
      </div>

      <!-- PrimeVue Lazy DataTable -->
      <DataTable
        :value="users"
        :lazy="true"
        :paginator="true"
        :rows="limit"
        :totalRecords="totalRecords"
        :loading="isLoading"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
        currentPageReportTemplate="Menampilkan {first} sampai {last} dari {totalRecords} pengguna"
        @page="onPage($event)"
        responsiveLayout="scroll"
        class="text-sm"
      >
        <template #empty>
          <div class="p-8 text-center text-slate-500">
            Tidak ada data pengguna yang sesuai dengan filter.
          </div>
        </template>

        <Column field="id" header="ID" headerStyle="width: 80px">
          <template #body="{ data }">
            <span class="font-mono text-xs font-semibold text-slate-700">#{{ data.id }}</span>
          </template>
        </Column>

        <Column header="Pengguna & Email" headerStyle="min-width: 220px">
          <template #body="{ data }">
            <div>
              <div class="font-semibold text-slate-900 flex items-center gap-1.5">
                <span>{{ data.username }}</span>
                <span
                  v-if="data.id === authStore.user?.id"
                  class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border"
                >
                  Anda
                </span>
              </div>
              <div class="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                <Mail class="w-3 h-3 text-slate-400" />
                <span>{{ data.email }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column header="Role Wewenang" headerStyle="width: 140px">
          <template #body="{ data }">
            <span
              :class="[
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider',
                getRoleBadge(data.role),
              ]"
            >
              <Shield class="w-3 h-3" />
              <span>{{ data.role }}</span>
            </span>
          </template>
        </Column>

        <!-- Status Column with Interactive Switch -->
        <Column header="Status Akun" headerStyle="width: 160px">
          <template #body="{ data }">
            <div class="flex items-center gap-2.5">
              <Loader2 v-if="updatingUserId === data.id" class="w-4 h-4 animate-spin text-blue-600" />
              <Switch
                v-else
                :model-value="data.is_active"
                @update:model-value="toggleUserStatus(data)"
                :disabled="updatingUserId === data.id || data.id === authStore.user?.id"
                :title="data.id === authStore.user?.id ? 'Tidak dapat menonaktifkan akun sendiri' : 'Klik untuk ubah status akun'"
              />
              <span
                :class="[
                  'text-xs font-semibold select-none',
                  data.is_active ? 'text-emerald-700' : 'text-slate-400',
                ]"
              >
                {{ data.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </div>
          </template>
        </Column>

        <Column header="Dibuat Pada" headerStyle="width: 140px">
          <template #body="{ data }">
            <span class="text-xs text-slate-500">{{ formatDate(data.created_at) }}</span>
          </template>
        </Column>

        <!-- Actions Column (Edit User) -->
        <Column header="Aksi" headerStyle="width: 90px; text-align: right">
          <template #body="{ data }">
            <div class="flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                @click="openEditUser(data)"
                class="h-8 w-8 p-0 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                title="Edit Pengguna"
              >
                <Edit class="w-4 h-4" />
              </Button>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Modal Tambah User -->
    <CreateUserModal
      :open="isCreateOpen"
      @update:open="isCreateOpen = $event"
      @created="fetchUsers"
    />

    <!-- Modal Edit User -->
    <EditUserModal
      :open="isEditOpen"
      :user="selectedUser"
      @update:open="isEditOpen = $event"
      @updated="fetchUsers"
    />
  </div>
</template>
