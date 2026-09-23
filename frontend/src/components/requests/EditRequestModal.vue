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
import { Edit3, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  request: any | null
}>()

const emits = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'updated'): void
}>()

interface Machine {
  id: number
  code: string
  name: string
  location: string
}

const machines = ref<Machine[]>([])
const machineId = ref<number | ''>('')
const priority = ref<'Low' | 'Medium' | 'High' | 'Critical'>('Medium')
const problemDescription = ref('')
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

async function fetchMachines() {
  if (machines.value.length > 0) return
  try {
    const res = await api.get('/api/machines')
    machines.value = res.data.data
  } catch (err: any) {
    // Ignore error
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.request) {
      fetchMachines()
      errorMessage.value = null
      machineId.value = props.request.machine_id
      priority.value = props.request.priority
      problemDescription.value = props.request.problem_description
    }
  },
  { immediate: true },
)

async function handleSubmit() {
  if (!props.request?.id) return
  if (!problemDescription.value.trim() || problemDescription.value.trim().length < 5) {
    errorMessage.value = 'Deskripsi masalah minimal harus 5 karakter.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = null

  try {
    await api.put(`/api/requests/${props.request.id}`, {
      machine_id: Number(machineId.value),
      priority: priority.value,
      problem_description: problemDescription.value.trim(),
    })
    emits('updated')
    emits('update:open', false)
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.error || 'Gagal memperbarui tiket. Silakan periksa wewenang Anda.'
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
          <Edit3 class="w-5 h-5 text-blue-600" />
          <span>Edit Laporan Kendala #{{ request?.id }}</span>
        </DialogTitle>
        <DialogDescription>
          Perbarui informasi mesin atau deskripsi masalah teknis.
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4 py-2">
        <div v-if="errorMessage" class="p-3 text-sm rounded-md bg-red-50 text-red-700 border border-red-200">
          {{ errorMessage }}
        </div>

        <div class="space-y-1.5">
          <Label for="edit-machine">Mesin Produksi *</Label>
          <select
            id="edit-machine"
            v-model="machineId"
            class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :disabled="isSubmitting"
          >
            <option v-for="m in machines" :key="m.id" :value="m.id">
              {{ m.code }} - {{ m.name }} ({{ m.location }})
            </option>
          </select>
        </div>

        <div class="space-y-1.5">
          <Label for="edit-priority">Tingkat Prioritas *</Label>
          <select
            id="edit-priority"
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

        <div class="space-y-1.5">
          <Label for="edit-problem">Deskripsi Masalah *</Label>
          <Textarea
            id="edit-problem"
            v-model="problemDescription"
            :rows="4"
            :disabled="isSubmitting"
          />
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
            <span>{{ isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan' }}</span>
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
