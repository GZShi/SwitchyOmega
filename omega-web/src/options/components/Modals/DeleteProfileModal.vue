<script setup lang="ts">
import AppModal from '@/options/components/AppModal.vue';
import { NButton, NSpace } from 'naive-ui';
import ProfileInline from '@/options/components/ProfileInline.vue';

defineProps<{ profile: any; profileName: string }>();
const emit = defineEmits<{ close: []; confirm: [] }>();
</script>

<template>
  <AppModal
    :title="$t('options_deleteProfile')"
    @close="emit('close')"
  >
    <p>{{ $t('options_deleteProfileConfirm') }}</p>
    <div style="background: #f5f5f5; border: 1px solid #e3e3e3; border-radius: 4px; padding: 12px; margin: 8px 0;">
      <ProfileInline :profile="profile" :name="profileName" />
    </div>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="emit('close')">
          {{ $t('dialog_cancel') }}
        </NButton>
        <NButton type="error" @click="emit('confirm')">
          {{ $t('options_deleteProfile') }}
        </NButton>
      </NSpace>
    </template>
  </AppModal>
</template>
