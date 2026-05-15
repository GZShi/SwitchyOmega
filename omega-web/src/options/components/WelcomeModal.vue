<script setup lang="ts">
import BaseModal from '@/options/components/BaseModal.vue';

const props = defineProps<{ isUpgrade: boolean }>();
const emit = defineEmits<{ close: [result: string] }>();
</script>

<template>
  <BaseModal
    :title="props.isUpgrade
      ? $t('options_welcomeUpgrade')
      : $t('options_modalHeader_welcome')"
    backdrop-class="opacity-half"
    @close="emit('close', 'later')"
  >
    <p v-if="props.isUpgrade">
      {{ $t('options_welcomeUpgradeGuide') }}
    </p>
    <p v-else>
      {{ $t('options_welcomeNormal') }}
    </p>
    <p>{{ $t('options_welcomeNormalGuide') }}</p>
    <template #footer>
      <button class="btn btn-default" @click="emit('close', 'later')">
        {{ $t('dialog_cancel') }}
      </button>
      <button class="btn btn-primary" @click="emit('close', 'show')">
        {{ $t('dialog_ok') }}
      </button>
    </template>
  </BaseModal>
</template>
