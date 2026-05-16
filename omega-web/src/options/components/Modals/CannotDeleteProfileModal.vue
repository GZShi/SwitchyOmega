<script setup lang="ts">
import AppModal from '@/options/components/AppModal.vue';
import { NButton, NSpace } from 'naive-ui';
import ProfileInline from '@/options/components/ProfileInline.vue';

defineProps<{ refs: any[]; profileName: string }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <AppModal
    :title="$t('options_modalHeader_cannotDeleteProfile')"
    @close="emit('close')"
  >
    <p>{{ $t('options_profileReferredBy') }}</p>
    <div style="background: #f5f5f5; border: 1px solid #e3e3e3; border-radius: 4px; padding: 12px; margin: 8px 0;">
      <ul style="list-style: none; padding-left: 0;">
        <li v-for="r in refs" :key="r?.name">
          <ProfileInline :profile="r" />
        </li>
      </ul>
    </div>
    <p>{{ $t('options_modifyReferringProfiles') }}</p>
    <template #footer>
      <NSpace justify="end">
        <NButton type="primary" @click="emit('close')">
          {{ $t('dialog_ok') }}
        </NButton>
      </NSpace>
    </template>
  </AppModal>
</template>
