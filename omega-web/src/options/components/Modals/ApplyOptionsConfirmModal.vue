<script setup lang="ts">
import { NButton, NSpace } from 'naive-ui';
import AppModal from '@/options/components/AppModal.vue';

const emit = defineEmits<{ close: []; confirm: [] }>();
</script>

<template>
  <AppModal
    :title="$t('options_modalHeader_applyOptions')"
    @close="emit('close')"
  >
    <p>{{ $t('options_applyOptionsConfirm') }}</p>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="emit('close')">
          {{ $t('dialog_cancel') }}
        </NButton>
        <NButton type="primary" @click="emit('confirm')">
          {{ $t('options_apply') }}
        </NButton>
      </NSpace>
    </template>
  </AppModal>
</template>
