<script setup lang="ts">
import AppModal from '@/options/components/AppModal.vue';
import { NButton, NSpace } from 'naive-ui';

const props = defineProps<{ isUpgrade: boolean }>();
const emit = defineEmits<{ close: [result: string] }>();
</script>

<template>
  <AppModal
    :title="props.isUpgrade
      ? $t('options_welcomeUpgrade')
      : $t('options_modalHeader_welcome')"
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
      <NSpace justify="end">
        <NButton @click="emit('close', 'later')">
          {{ $t('dialog_cancel') }}
        </NButton>
        <NButton type="primary" @click="emit('close', 'show')">
          {{ $t('dialog_ok') }}
        </NButton>
      </NSpace>
    </template>
  </AppModal>
</template>
