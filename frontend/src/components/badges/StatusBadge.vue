<script setup lang="ts">
import { computed } from 'vue'
import { Clock, CheckCircle2, XCircle } from 'lucide-vue-next'

const props = defineProps<{
  status: 'Submitted' | 'Approved' | 'Rejected' | string
}>()

const config = computed(() => {
  switch (props.status) {
    case 'Submitted':
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Submitted',
        icon: Clock,
      }
    case 'Approved':
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'Approved',
        icon: CheckCircle2,
      }
    case 'Rejected':
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        label: 'Rejected',
        icon: XCircle,
      }
    default:
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        label: props.status,
        icon: Clock,
      }
  }
})
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
      config.bg,
    ]"
  >
    <component :is="config.icon" class="w-3.5 h-3.5" />
    <span>{{ config.label }}</span>
  </span>
</template>
