<script setup lang="ts">
import BaseModal from '@/options/components/BaseModal.vue';
import ProfileInline from '@/options/components/ProfileInline.vue';

defineProps<{ profile: any; profileName: string }>();
const emit = defineEmits<{ close: []; confirm: [] }>();
</script>

<template>
  <BaseModal
    :title="$t('options_deleteProfile')"
    @close="emit('close')"
  >
    <p>{{ $t('options_deleteProfileConfirm') }}</p>
    <div class="well">
      <ProfileInline :profile="profile" :name="profileName" />
    </div>
    <template #footer>
      <button class="btn btn-default" @click="emit('close')">
        {{ $t('dialog_cancel') }}
      </button>
      <button class="btn btn-danger" @click="emit('confirm')">
        {{ $t('options_deleteProfile') }}
      </button>
    </template>
  </BaseModal>
</template>
