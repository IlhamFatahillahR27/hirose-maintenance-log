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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserCheck, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  user: any | null
}>()

const emits = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'updated'): void
}>()

const email = ref('')
const role = ref<'Operator' | 'Supervisor' | 'Admin'>('Operator')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.user) {
      email.value = props.user.email || ''
      role.value = props.user.role || 'Operator'
      password.value = ''
      errorMessage.value = null
    }
  },
)

async function handleSubmit() {
  if (!props.user) return

  if (!email.value.trim() || !email.value.includes('@')) {
    errorMessage.value = 'Format email tidak valid.'
    return
  }

  if (password.value && password.value.length < 6) {
    errorMessage.value = 'Kata sandi minimal 6 karakter jika ingin diubah.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = null

  try {
    const payload: Record<string, any> = {
      email: email.value.trim(),
      role: role.value,
    }
    if (password.value.trim()) {
      payload.password = password.value.trim()
    }

    await api.put(`/api/users/${props.user.id}`, payload)
    emits('updated')
    emits('update:open', false)
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.error || 'Gagal memperbarui data pengguna.'
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
          <UserCheck class="w-5 h-5 text-blue-600" />
          <span>Edit Pengguna</span>
        </DialogTitle>
        <DialogDescription>
          Perbarui hak akses, alamat email, atau reset kata sandi pengguna.
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4 py-2">
        <div v-if="errorMessage" class="p-3 text-sm rounded-md bg-red-50 text-red-700 border border-red-200">
          {{ errorMessage }}
        </div>

        <div class="space-y-1.5">
          <Label>Username</Label>
          <Input
            :model-value="user?.username"
            disabled
            class="bg-slate-100 text-slate-500 font-mono text-sm cursor-not-allowed"
          />
        </div>

        <div class="space-y-1.5">
          <Label for="edit-email">Corporate Email *</Label>
          <Input
            id="edit-email"
            type="email"
            v-model="email"
            :disabled="isSubmitting"
          />
        </div>

        <div class="space-y-1.5">
          <Label for="edit-role">Role Akses *</Label>
          <select
            id="edit-role"
            v-model="role"
            class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :disabled="isSubmitting"
          >
            <option value="Operator">Operator (Buat & Edit Laporan Mandiri)</option>
            <option value="Supervisor">Supervisor (Tinjau & Setujui Tiket)</option>
            <option value="Admin">Admin (Akses Penuh Seluruh Sistem)</option>
          </select>
        </div>

        <div class="space-y-1.5">
          <Label for="edit-password">Password Baru (Opsional)</Label>
          <Input
            id="edit-password"
            type="password"
            v-model="password"
            placeholder="Kosongkan jika tidak ingin mengubah password"
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
