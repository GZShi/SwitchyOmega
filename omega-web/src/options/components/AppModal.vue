<script setup lang="ts">
import { NModal } from 'naive-ui'

const props = withDefaults(defineProps<{
  show?: boolean
  title: string
  size?: 'sm' | 'lg' | 'huge'
}>(), {
  show: true,
})

const emit = defineEmits<{ close: [] }>()

const widthMap: Record<string, string> = {
  sm: '400px',
  lg: '720px',
  huge: '960px',
}

function getWidth(): string {
  return widthMap[props.size ?? ''] ?? '600px'
}
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    :title="title"
    :closable="true"
    :mask-closable="true"
    :style="{ width: getWidth(), maxWidth: '95vw' }"
    @update:show="(v: boolean) => { if (!v) emit('close') }"
  >
    <slot />
    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </NModal>
</template>
