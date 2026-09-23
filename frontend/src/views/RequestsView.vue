<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import api from '@/composables/useApi'
import { useAuthStore } from '@/stores/auth'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import StatusBadge from '@/components/badges/StatusBadge.vue'
import PriorityBadge from '@/components/badges/PriorityBadge.vue'
import RequestModal from '@/components/requests/RequestModal.vue'
import EditRequestModal from '@/components/requests/EditRequestModal.vue'
import ReviewModal from '@/components/requests/ReviewModal.vue'
import DeleteDialog from '@/components/requests/DeleteDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Search,
  FilterX,
  Edit,
  ShieldCheck,
  Trash2,
  Lock,
  RefreshCw,
  Building2,
  Calendar,
  UserCheck,
} from 'lucide-vue-next'

const authStore = useAuthStore()

// State
const requests = ref<any[]>([])
const isLoading = ref(false)
const totalRecords = ref(0)
const currentPage = ref(1)
const limit = ref(10)

// Filters
const searchKeyword = ref('')
const selectedStatus = ref('')
const selectedPriority = ref('')

// Modals
const isCreateOpen = ref(false)
const isEditOpen = ref(false)
const isReviewOpen = ref(false)
const isDeleteOpen = ref(false)
const selectedRequest = ref<any | null>(null)

// Debounced search
let searchTimer: any = null

function onSearchInput(val: string | number) {
  searchKeyword.value = String(val)
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    fetchRequests()
  }, 300)
}

function resetFilters() {
  searchKeyword.value = ''
  selectedStatus.value = ''
  selectedPriority.value = ''
  currentPage.value = 1
  fetchRequests()
}

async function fetchRequests() {
  isLoading.value = true
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      limit: limit.value,
    }
    if (searchKeyword.value.trim()) {
      params.search = searchKeyword.value.trim()
    }
    if (selectedStatus.value) {
      params.status = selectedStatus.value
    }
    if (selectedPriority.value) {
      params.priority = selectedPriority.value
    }

    const response = await api.get('/api/requests', { params })
    requests.value = response.data.data
    totalRecords.value = response.data.pagination.total_records
    currentPage.value = response.data.pagination.current_page
  } catch (err: any) {
    // Error handling
  } finally {
    isLoading.value = false
  }
}

function onPage(event: DataTablePageEvent) {
  currentPage.value = event.page + 1
  limit.value = event.rows
  fetchRequests()
}

// Modal triggers
function openEdit(request: any) {
  selectedRequest.value = request
  isEditOpen.value = true
}

function openReview(request: any) {
  selectedRequest.value = request
  isReviewOpen.value = true
}

function openDelete(request: any) {
  selectedRequest.value = request
  isDeleteOpen.value = true
}

function formatDate(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Watch filters
watch([selectedStatus, selectedPriority], () => {
  currentPage.value = 1
  fetchRequests()
})

onMounted(() => {
  fetchRequests()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Top Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">
          Laporan Kendala Mesin
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          <span v-if="authStore.isOperator">
            Menampilkan tiket kendala yang dilaporkan oleh akun Anda (Operator).
          </span>
          <span v-else>
            Menampilkan seluruh data tiket kendala mesin dari semua lini produksi pabrik.
          </span>
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          @click="fetchRequests"
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
          <Plus class="w-4 h-4" />
          <span>Buat Laporan Kendala</span>
        </Button>
      </div>
    </div>

    <!-- Unified Card Container: Filter Toolbar & DataTable -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <!-- Filter & Search Toolbar Section -->
      <div class="p-5 border-b border-slate-200 bg-slate-50/50">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <!-- Filter: Search -->
          <div>
            <Label for="filter-search" class="block text-xs font-semibold text-slate-700 mb-1.5">
              Pencarian
            </Label>
            <div class="relative">
              <Search class="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <Input
                id="filter-search"
                :model-value="searchKeyword"
                @update:model-value="onSearchInput"
                class="pl-9 h-9 bg-white"
              />
            </div>
          </div>

          <!-- Filter: Status -->
          <div>
            <Label for="filter-status" class="block text-xs font-semibold text-slate-700 mb-1.5">
              Status Tiket
            </Label>
            <select
              id="filter-status"
              v-model="selectedStatus"
              class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="">Semua Status</option>
              <option value="Submitted">Submitted (Menunggu Review)</option>
              <option value="Approved">Approved (Disetujui)</option>
              <option value="Rejected">Rejected (Ditolak)</option>
            </select>
          </div>

          <!-- Filter: Priority -->
          <div>
            <Label for="filter-priority" class="block text-xs font-semibold text-slate-700 mb-1.5">
              Prioritas Kendala
            </Label>
            <select
              id="filter-priority"
              v-model="selectedPriority"
              class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="">Semua Prioritas</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
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
        :value="requests"
        :lazy="true"
        :paginator="true"
        :rows="limit"
        :totalRecords="totalRecords"
        :loading="isLoading"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
        currentPageReportTemplate="Menampilkan {first} sampai {last} dari {totalRecords} data"
        @page="onPage($event)"
        responsiveLayout="scroll"
        class="text-sm"
      >
        <template #empty>
          <div class="p-8 text-center text-slate-500">
            Tidak ada tiket kendala yang ditemukan untuk kriteria filter ini.
          </div>
        </template>

        <Column field="id" header="ID" headerStyle="width: 80px">
          <template #body="{ data }">
            <span class="font-mono text-xs font-semibold text-slate-700">#{{ data.id }}</span>
          </template>
        </Column>

        <Column header="Mesin & Lokasi" headerStyle="min-width: 200px">
          <template #body="{ data }">
            <div>
              <div class="font-semibold text-slate-900">
                {{ data.machine?.code || '-' }}
              </div>
              <div class="text-xs text-slate-500">
                {{ data.machine?.name }}
              </div>
              <div class="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                <Building2 class="w-3 h-3" />
                <span>{{ data.machine?.location }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column header="Deskripsi Kendala" headerStyle="min-width: 240px">
          <template #body="{ data }">
            <p class="text-slate-700 line-clamp-2" :title="data.problem_description">
              {{ data.problem_description }}
            </p>
          </template>
        </Column>

        <Column header="Prioritas" headerStyle="width: 120px">
          <template #body="{ data }">
            <PriorityBadge :priority="data.priority" />
          </template>
        </Column>

        <Column header="Status" headerStyle="width: 130px">
          <template #body="{ data }">
            <StatusBadge :status="data.status" />
          </template>
        </Column>

        <Column header="Pelapor & Waktu" headerStyle="min-width: 160px">
          <template #body="{ data }">
            <div class="text-xs">
              <div class="font-medium text-slate-800">{{ data.creator?.username || 'System' }}</div>
              <div class="flex items-center gap-1 text-slate-400 mt-0.5">
                <Calendar class="w-3 h-3" />
                <span>{{ formatDate(data.created_at) }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column header="Peninjauan" headerStyle="min-width: 180px">
          <template #body="{ data }">
            <div v-if="data.reviewed_by" class="text-xs space-y-0.5">
              <div class="flex items-center gap-1 text-slate-700 font-medium">
                <UserCheck class="w-3.5 h-3.5 text-indigo-600" />
                <span>{{ data.reviewer?.username }}</span>
              </div>
              <div class="text-[11px] text-slate-400">{{ formatDate(data.reviewed_at) }}</div>
              <div v-if="data.reviewer_notes" class="text-[11px] italic text-slate-600 bg-slate-50 p-1 rounded border border-slate-100 mt-1">
                "{{ data.reviewer_notes }}"
              </div>
            </div>
            <div v-else class="text-xs text-slate-400 italic">
              Menunggu peninjauan
            </div>
          </template>
        </Column>

        <!-- Role-Based Action Column -->
        <Column header="Aksi" headerStyle="width: 140px; text-align: right">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-1.5">
              <!-- Supervisor / Admin: Review Button -->
              <Button
                v-if="authStore.isSupervisor || authStore.isAdmin"
                variant="outline"
                size="sm"
                @click="openReview(data)"
                class="h-8 px-2 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300"
                title="Review / Putuskan Tiket"
              >
                <ShieldCheck class="w-4 h-4 mr-1 text-indigo-600" />
                <span>Review</span>
              </Button>

              <!-- Operator / Supervisor: Edit Button (Only if Submitted & Own Ticket) -->
              <template v-if="authStore.isOperator || authStore.isSupervisor">
                <Button
                  v-if="data.status === 'Submitted' && data.created_by === authStore.user?.id"
                  variant="outline"
                  size="sm"
                  @click="openEdit(data)"
                  class="h-8 px-2 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                  title="Edit Laporan Mandiri"
                >
                  <Edit class="w-4 h-4" />
                </Button>
                <span
                  v-else-if="data.created_by === authStore.user?.id"
                  class="inline-flex items-center gap-1 text-xs text-slate-400 py-1 px-1.5"
                  title="Tiket terkunci untuk diedit (sudah direview)"
                >
                  <Lock class="w-3.5 h-3.5" />
                </span>
              </template>

              <!-- Admin: Full Edit & Delete Buttons -->
              <template v-if="authStore.isAdmin">
                <Button
                  variant="outline"
                  size="sm"
                  @click="openEdit(data)"
                  class="h-8 w-8 p-0 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                  title="Edit Laporan (Admin)"
                >
                  <Edit class="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  @click="openDelete(data)"
                  class="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:border-red-300"
                  title="Hapus Tiket (Admin)"
                >
                  <Trash2 class="w-4 h-4" />
                </Button>
              </template>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Modals -->
    <RequestModal
      :open="isCreateOpen"
      @update:open="isCreateOpen = $event"
      @created="fetchRequests"
    />

    <EditRequestModal
      :open="isEditOpen"
      :request="selectedRequest"
      @update:open="isEditOpen = $event"
      @updated="fetchRequests"
    />

    <ReviewModal
      :open="isReviewOpen"
      :request="selectedRequest"
      @update:open="isReviewOpen = $event"
      @reviewed="fetchRequests"
    />

    <DeleteDialog
      :open="isDeleteOpen"
      :request="selectedRequest"
      @update:open="isDeleteOpen = $event"
      @deleted="fetchRequests"
    />
  </div>
</template>
