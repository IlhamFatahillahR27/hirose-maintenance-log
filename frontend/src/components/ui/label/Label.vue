<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Label as RadixLabel, type LabelProps } from 'radix-vue'

interface Props extends LabelProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <RadixLabel
    v-bind="props"
    :class="
      cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700',
        props.class,
      )
    "
  >
    <slot />
  </RadixLabel>
</template>
