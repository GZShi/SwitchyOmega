<script setup lang="ts">
import { NButton, NSpace } from 'naive-ui';
import AppModal from '@/options/components/AppModal.vue';

const emit = defineEmits<{ close: []; confirm: [opt?: any] }>();
</script>

<template>
  <AppModal
    :title="$t('options_modalHeader_resetOptions')"
    @close="emit('close')"
  >
    <p style="color: #a94442">
      {{ $t('options_resetOptionsConfirm') }}
    </p>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="emit('close')">
          {{ $t('dialog_cancel') }}
        </NButton>
        <NButton type="error" @click="emit('confirm')">
          {{ $t('options_reset') }}
        </NButton>
      </NSpace>
    </template>
  </AppModal>
</template>
