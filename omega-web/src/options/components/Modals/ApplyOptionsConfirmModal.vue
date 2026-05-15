<script setup lang="ts">
import BaseModal from '@/options/components/BaseModal.vue';

const emit = defineEmits<{ close: []; confirm: [] }>();
</script>

<template>
  <BaseModal
    :title="$t('options_modalHeader_applyOptions')"
    @close="emit('close')"
  >
    <p>{{ $t('options_applyOptionsConfirm') }}</p>
    <template #footer>
      <button class="btn btn-default" @click="emit('close')">
        {{ $t('dialog_cancel') }}
      </button>
      <button class="btn btn-primary" @click="emit('confirm')">
        {{ $t('options_apply') }}
      </button>
    </template>
  </BaseModal>
</template>
