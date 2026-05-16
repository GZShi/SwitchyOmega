<script setup lang="ts">
import { NAlert } from 'naive-ui'
import { useUiStore } from '@/stores/ui'

defineProps<{
  type: string
  message: string
}>()

const uiStore = useUiStore()

function alertType(type: string): 'error' | 'warning' | 'success' | 'info' {
  if (type === 'error' || type === 'danger') return 'error'
  if (type === 'warning') return 'warning'
  if (type === 'success') return 'success'
  return 'info'
}
</script>

<template>
  <div class="alert-bar-wrapper">
    <NAlert
      :type="alertType(type)"
      closable
      @close="uiStore.hideAlert()"
    >
      {{ message }}
    </NAlert>
  </div>
</template>

<style scoped>
.alert-bar-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1050;
  padding: 10px;
}
</style>
