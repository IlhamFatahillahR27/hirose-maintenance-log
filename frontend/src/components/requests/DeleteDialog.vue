<script setup lang="ts">
import { ref } from 'vue'
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
import { Trash2, AlertTriangle, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  request: any | null
}>()

const emits = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'deleted'): void
}>()

const isDeleting = ref(false)
const errorMessage = ref<string | null>(null)

async function handleDelete() {
  if (!props.request?.id) return

  isDeleting.value = true
  errorMessage.value = null

  try {
    await api.delete(`/api/requests/${props.request.id}`)
    emits('deleted')
    emits('update:open', false)
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.error || 'Gagal menghapus tiket. Pastikan Anda memiliki wewenang Admin.'
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emits('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-red-600">
          <AlertTriangle class="w-5 h-5 text-red-600" />
          <span>Konfirmasi Penghapusan Tiket</span>
        </DialogTitle>
        <DialogDescription>
          Apakah Anda yakin ingin menghapus tiket #{{ request?.id }} secara permanen?
        </DialogDescription>
      </DialogHeader>

      <div v-if="errorMessage" class="p-3 text-sm rounded-md bg-red-50 text-red-700 border border-red-200">
        {{ errorMessage }}
      </div>

      <div class="p-3 bg-red-50/50 border border-red-100 rounded-md text-xs space-y-1 text-slate-700">
        <div><strong>Mesin:</strong> {{ request?.machine?.name || request?.machine?.code }}</div>
        <div><strong>Deskripsi:</strong> {{ request?.problem_description }}</div>
        <div class="text-red-700 pt-1">Tindakan ini tidak dapat dibatalkan (Admin Only).</div>
      </div>

      <DialogFooter class="pt-2">
        <Button
          type="button"
          variant="outline"
          @click="emits('update:open', false)"
          :disabled="isDeleting"
        >
          Batal
        </Button>
        <Button
          type="button"
          variant="destructive"
          @click="handleDelete"
          :disabled="isDeleting"
          class="gap-1.5"
        >
          <Loader2 v-if="isDeleting" class="w-4 h-4 animate-spin" />
          <Trash2 v-else class="w-4 h-4" />
          <span>{{ isDeleting ? 'Menghapus...' : 'Hapus Tiket' }}</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
