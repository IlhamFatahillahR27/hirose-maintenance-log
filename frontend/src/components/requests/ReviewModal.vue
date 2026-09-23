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
import { CheckCircle2, XCircle, ShieldCheck, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  request: any | null
}>()

const emits = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'reviewed'): void
}>()

const verdict = ref<'Approved' | 'Rejected'>('Approved')
const reviewerNotes = ref('')
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      verdict.value = 'Approved'
      reviewerNotes.value = ''
      errorMessage.value = null
    }
  },
  { immediate: true },
)

async function handleSubmit() {
  if (!props.request?.id) return

  isSubmitting.value = true
  errorMessage.value = null

  try {
    await api.patch(`/api/requests/${props.request.id}/review`, {
      status: verdict.value,
      reviewer_notes: reviewerNotes.value.trim() || undefined,
    })
    emits('reviewed')
    emits('update:open', false)
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.error || 'Gagal melakukan review tiket. Pastikan Anda memiliki wewenang Supervisor/Admin.'
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
          <ShieldCheck class="w-5 h-5 text-indigo-600" />
          <span>Review Laporan Kendala #{{ request?.id }}</span>
        </DialogTitle>
        <DialogDescription>
          Tentukan keputusan persetujuan perbaikan untuk mesin:
          <strong class="text-slate-700">{{ request?.machine?.name || request?.machine?.code }}</strong>
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4 py-2">
        <div v-if="errorMessage" class="p-3 text-sm rounded-md bg-red-50 text-red-700 border border-red-200">
          {{ errorMessage }}
        </div>

        <!-- Problem snapshot -->
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1">
          <div class="text-slate-500 font-medium">Deskripsi Kendala yang Dilaporkan:</div>
          <div class="text-slate-800">{{ request?.problem_description }}</div>
        </div>

        <!-- Decision Selector -->
        <div class="space-y-2">
          <Label>Keputusan Review (Verdict) *</Label>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              @click="verdict = 'Approved'"
              :class="[
                'flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-semibold transition-all cursor-pointer',
                verdict === 'Approved'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              ]"
            >
              <CheckCircle2 class="w-4 h-4 text-emerald-600" />
              <span>Setujui (Approve)</span>
            </button>

            <button
              type="button"
              @click="verdict = 'Rejected'"
              :class="[
                'flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-semibold transition-all cursor-pointer',
                verdict === 'Rejected'
                  ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              ]"
            >
              <XCircle class="w-4 h-4 text-rose-600" />
              <span>Tolak (Reject)</span>
            </button>
          </div>
        </div>

        <!-- Catatan Reviewer -->
        <div class="space-y-1.5">
          <Label for="notes">Catatan / Arahan Supervisor (Opsional)</Label>
          <Textarea
            id="notes"
            v-model="reviewerNotes"
            placeholder="Contoh: Disetujui untuk penggantian seal cylinder oleh tim mekanik shift 1..."
            :rows="3"
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
          <Button
            type="submit"
            :disabled="isSubmitting"
            :class="[
              'gap-1.5',
              verdict === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700',
            ]"
          >
            <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <span>{{ isSubmitting ? 'Menyimpan...' : 'Kirim Keputusan' }}</span>
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
