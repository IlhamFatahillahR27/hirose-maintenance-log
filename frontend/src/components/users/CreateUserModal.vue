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
import { UserPlus, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
}>()

const emits = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'created'): void
}>()

const username = ref('')
const email = ref('')
const password = ref('')
const role = ref<'Operator' | 'Supervisor' | 'Admin'>('Operator')
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      username.value = ''
      email.value = ''
      password.value = 'Password123!'
      role.value = 'Operator'
      errorMessage.value = null
    }
  },
)

async function handleSubmit() {
  if (!username.value.trim() || username.value.trim().length < 3) {
    errorMessage.value = 'Username minimal 3 karakter.'
    return
  }
  if (!email.value.trim() || !email.value.includes('@')) {
    errorMessage.value = 'Format email tidak valid.'
    return
  }
  if (!password.value || password.value.length < 6) {
    errorMessage.value = 'Kata sandi minimal 6 karakter.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = null

  try {
    await api.post('/api/users', {
      username: username.value.trim(),
      email: email.value.trim(),
      password: password.value,
      role: role.value,
    })
    emits('created')
    emits('update:open', false)
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.error || 'Gagal menambahkan pengguna baru.'
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
          <UserPlus class="w-5 h-5 text-blue-600" />
          <span>Tambah Pengguna Baru</span>
        </DialogTitle>
        <DialogDescription>
          Buat akun kredensial baru untuk staf operasional pabrik.
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4 py-2">
        <div v-if="errorMessage" class="p-3 text-sm rounded-md bg-red-50 text-red-700 border border-red-200">
          {{ errorMessage }}
        </div>

        <div class="space-y-1.5">
          <Label for="u-username">Username *</Label>
          <Input
            id="u-username"
            v-model="username"
            placeholder="Contoh: operator2"
            :disabled="isSubmitting"
          />
        </div>

        <div class="space-y-1.5">
          <Label for="u-email">Corporate Email *</Label>
          <Input
            id="u-email"
            type="email"
            v-model="email"
            placeholder="Contoh: operator2@hirose.co.id"
            :disabled="isSubmitting"
          />
        </div>

        <div class="space-y-1.5">
          <Label for="u-password">Password Awal *</Label>
          <Input
            id="u-password"
            type="password"
            v-model="password"
            placeholder="Minimal 6 karakter"
            :disabled="isSubmitting"
          />
        </div>

        <div class="space-y-1.5">
          <Label for="u-role">Role Akses *</Label>
          <select
            id="u-role"
            v-model="role"
            class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :disabled="isSubmitting"
          >
            <option value="Operator">Operator (Buat & Edit Laporan Mandiri)</option>
            <option value="Supervisor">Supervisor (Tinjau & Setujui Tiket)</option>
            <option value="Admin">Admin (Akses Penuh Seluruh Sistem)</option>
          </select>
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
            <span>{{ isSubmitting ? 'Menyimpan...' : 'Simpan Pengguna' }}</span>
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
