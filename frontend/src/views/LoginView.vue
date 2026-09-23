<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wrench, Lock, User, AlertCircle, Loader2, Sparkles } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const isSubmitting = ref(false)
const localError = ref<string | null>(null)

async function handleLogin() {
  if (!username.value.trim() || !password.value) {
    localError.value = 'Silakan isi username dan kata sandi.'
    return
  }

  isSubmitting.value = true
  localError.value = null

  const result = await authStore.login(username.value.trim(), password.value)
  isSubmitting.value = false

  if (result.success) {
    router.push('/requests')
  } else {
    localError.value = result.error || 'Autentikasi gagal.'
  }
}

function fillCredentials(u: string, p: string) {
  username.value = u
  password.value = p
  localError.value = null
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
      <div class="mx-auto w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md mb-3">
        <Wrench class="w-8 h-8" />
      </div>
      <h2 class="text-2xl font-bold tracking-tight text-slate-900">
        Hirose Maintenance Log
      </h2>
      <p class="text-sm text-slate-500 mt-1">
        Sistem Pelaporan & Peninjauan Kendala Mesin Presisi Pabrik
      </p>
    </div>

    <div class="sm:mx-auto sm:w-full sm:max-w-md px-4">
      <Card class="shadow-md border-slate-200">
        <CardHeader class="pb-4">
          <CardTitle class="text-lg font-semibold text-slate-900">Masuk ke Sistem</CardTitle>
          <CardDescription>
            Masukkan kredensial akun terdaftar Anda untuk melanjutkan.
          </CardDescription>
        </CardHeader>

        <CardContent class="space-y-4">
          <div
            v-if="localError || authStore.errorMessage"
            class="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            <AlertCircle class="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <div class="leading-snug">{{ localError || authStore.errorMessage }}</div>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-4">
            <div class="space-y-1.5">
              <Label for="username">Username</Label>
              <div class="relative">
                <Input
                  id="username"
                  v-model="username"
                  placeholder="Masukkan username"
                  :disabled="isSubmitting"
                  class="pl-9"
                  autocomplete="username"
                />
                <User class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div class="space-y-1.5">
              <Label for="password">Kata Sandi (Password)</Label>
              <div class="relative">
                <Input
                  id="password"
                  type="password"
                  v-model="password"
                  placeholder="Masukkan kata sandi"
                  :disabled="isSubmitting"
                  class="pl-9"
                  autocomplete="current-password"
                />
                <Lock class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <Button
              type="submit"
              :disabled="isSubmitting"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
            >
              <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin mr-2" />
              <span>{{ isSubmitting ? 'Memproses Masuk...' : 'Masuk' }}</span>
            </Button>
          </form>

          <!-- Quick Demo Account Fill -->
          <div class="pt-4 border-t border-slate-100">
            <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              <Sparkles class="w-3.5 h-3.5 text-amber-500" />
              <span>Demo Quick-Fill Akun Evaluasi</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                @click="fillCredentials('operator1', 'Password123!')"
                class="p-2 border border-slate-200 rounded-md text-left hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div class="font-semibold text-blue-700">Operator</div>
                <div class="text-slate-500 text-[11px]">operator1</div>
              </button>

              <button
                type="button"
                @click="fillCredentials('supervisor1', 'Password123!')"
                class="p-2 border border-slate-200 rounded-md text-left hover:bg-purple-50 hover:border-purple-300 transition-colors"
              >
                <div class="font-semibold text-purple-700">Supervisor</div>
                <div class="text-slate-500 text-[11px]">supervisor1</div>
              </button>

              <button
                type="button"
                @click="fillCredentials('admin1', 'Password123!')"
                class="p-2 border border-slate-200 rounded-md text-left hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
              >
                <div class="font-semibold text-emerald-700">Admin</div>
                <div class="text-slate-500 text-[11px]">admin1</div>
              </button>

              <button
                type="button"
                @click="fillCredentials('inactive_user', 'Password123!')"
                class="p-2 border border-slate-200 rounded-md text-left hover:bg-red-50 hover:border-red-300 transition-colors"
              >
                <div class="font-semibold text-red-600">Nonaktif (Inactive)</div>
                <div class="text-slate-500 text-[11px]">inactive_user</div>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
