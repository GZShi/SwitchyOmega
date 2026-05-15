<script setup lang="ts">
import BaseModal from '@/options/components/BaseModal.vue';

const emit = defineEmits<{ close: []; confirm: [opt?: any] }>();
</script>

<template>
  <BaseModal
    :title="$t('options_modalHeader_resetOptions')"
    @close="emit('close')"
  >
    <p class="text-danger">
      {{ $t('options_resetOptionsConfirm') }}
    </p>
    <template #footer>
      <button class="btn btn-default" @click="emit('close')">
        {{ $t('dialog_cancel') }}
      </button>
      <button class="btn btn-danger" @click="emit('confirm')">
        {{ $t('options_reset') }}
      </button>
    </template>
  </BaseModal>
</template>
