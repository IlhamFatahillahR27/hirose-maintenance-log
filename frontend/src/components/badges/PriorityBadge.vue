<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, AlertCircle, Info, ChevronDown } from 'lucide-vue-next'

const props = defineProps<{
  priority: 'Low' | 'Medium' | 'High' | 'Critical' | string
}>()

const config = computed(() => {
  switch (props.priority) {
    case 'Critical':
      return {
        bg: 'bg-red-50 text-red-700 border-red-300 font-bold animate-pulse',
        label: 'Critical',
        icon: AlertTriangle,
      }
    case 'High':
      return {
        bg: 'bg-orange-50 text-orange-700 border-orange-200 font-medium',
        label: 'High',
        icon: AlertCircle,
      }
    case 'Medium':
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        label: 'Medium',
        icon: Info,
      }
    case 'Low':
    default:
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        label: props.priority || 'Low',
        icon: ChevronDown,
      }
  }
})
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border',
      config.bg,
    ]"
  >
    <component :is="config.icon" class="w-3.5 h-3.5" />
    <span>{{ config.label }}</span>
  </span>
</template>
