<script setup lang="ts">
import { ref, watch } from 'vue'
import api from '@/composables/useApi'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PlusCircle, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
}>()

const emits = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'created'): void
}>()

interface Machine {
  id: number
  code: string
  name: string
  location: string
}

const machines = ref<Machine[]>([])
const isLoadingMachines = ref(false)

const machineId = ref<number | ''>('')
const priority = ref<'Low' | 'Medium' | 'High' | 'Critical'>('Medium')
const problemDescription = ref('')
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

async function fetchMachines() {
  if (machines.value.length > 0) return
  isLoadingMachines.value = true
  try {
    const res = await api.get('/api/machines')
    machines.value = res.data.data
    const first = machines.value[0]
    if (first && machineId.value === '') {
      machineId.value = first.id
    }
  } catch (err: any) {
    errorMessage.value = 'Gagal memuat daftar master mesin.'
  } finally {
    isLoadingMachines.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      fetchMachines()
      errorMessage.value = null
      problemDescription.value = ''
      priority.value = 'Medium'
    }
  },
  { immediate: true },
)

async function handleSubmit() {
  if (!machineId.value) {
    errorMessage.value = 'Silakan pilih mesin yang mengalami kendala.'
    return
  }
  if (!problemDescription.value.trim() || problemDescription.value.trim().length < 5) {
    errorMessage.value = 'Deskripsi masalah minimal harus 5 karakter.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = null

  try {
    await api.post('/api/requests', {
      machine_id: Number(machineId.value),
      priority: priority.value,
      problem_description: problemDescription.value.trim(),
    })
    emits('created')
    emits('update:open', false)
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.error || 'Gagal membuat tiket kendala mesin. Silakan coba lagi.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emits('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-slate-900">
          <PlusCircle class="w-5 h-5 text-blue-600" />
          <span>Buat Laporan Kendala Mesin</span>
        </DialogTitle>
        <DialogDescription>
          Laporkan permasalahan teknis pada mesin produksi untuk ditinjau oleh Supervisor.
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4 py-2">
        <div v-if="errorMessage" class="p-3 text-sm rounded-md bg-red-50 text-red-700 border border-red-200">
          {{ errorMessage }}
        </div>

        <!-- Pilih Mesin -->
        <div class="space-y-1.5">
          <Label for="machine">Pilih Mesin Produksi *</Label>
          <select
            id="machine"
            v-model="machineId"
            class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :disabled="isLoadingMachines || isSubmitting"
          >
            <option disabled value="">
              {{ isLoadingMachines ? 'Memuat mesin...' : '-- Pilih Mesin --' }}
            </option>
            <option v-for="m in machines" :key="m.id" :value="m.id">
              {{ m.code }} - {{ m.name }} ({{ m.location }})
            </option>
          </select>
        </div>

        <!-- Tingkat Prioritas -->
        <div class="space-y-1.5">
          <Label for="priority">Tingkat Prioritas (Urgency) *</Label>
          <select
            id="priority"
            v-model="priority"
            class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :disabled="isSubmitting"
          >
            <option value="Low">Low - Kendala ringan tanpa henti operasi</option>
            <option value="Medium">Medium - Kendala operasional dapat ditolerir</option>
            <option value="High">High - Mesin berisiko berhenti produksi</option>
            <option value="Critical">Critical - Mesin berhenti total (Line Stop)</option>
          </select>
        </div>

        <!-- Deskripsi Masalah -->
        <div class="space-y-1.5">
          <Label for="problem">Deskripsi Masalah *</Label>
          <Textarea
            id="problem"
            v-model="problemDescription"
            placeholder="Jelaskan detail gejala kendala, indikator bunyi/tekanan, dan bagian komponen..."
            :rows="4"
            :disabled="isSubmitting"
          />
          <p class="text-xs text-slate-500">Minimal 5 karakter penjelasan teknis.</p>
        </div>

        <DialogFooter class="pt-2">
          <Button
            type="button"
            variant="outline"
            @click="emits('update:open', false)"
            :disabled="isSubmitting"
          >
            Batal
          </Button>
          <Button type="submit" :disabled="isSubmitting" class="gap-1.5 bg-blue-600 hover:bg-blue-700">
            <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <span>{{ isSubmitting ? 'Mengirim...' : 'Kirim Laporan' }}</span>
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
