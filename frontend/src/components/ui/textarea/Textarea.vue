<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes['class']
  rows?: number
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  rows: 3,
})

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()
</script>

<template>
  <textarea
    :rows="rows"
    :placeholder="placeholder"
    :value="modelValue"
    @input="emits('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    :class="
      cn(
        'flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
  />
</template>
