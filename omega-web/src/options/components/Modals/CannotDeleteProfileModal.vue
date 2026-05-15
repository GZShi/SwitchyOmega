<script setup lang="ts">
import BaseModal from '@/options/components/BaseModal.vue';
import ProfileInline from '@/options/components/ProfileInline.vue';

defineProps<{ refs: any[]; profileName: string }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <BaseModal
    :title="$t('options_modalHeader_cannotDeleteProfile')"
    @close="emit('close')"
  >
    <p>{{ $t('options_profileReferredBy') }}</p>
    <div class="well">
      <ul class="list-style-none">
        <li v-for="r in refs" :key="r?.name">
          <ProfileInline :profile="r" />
        </li>
      </ul>
    </div>
    <p>{{ $t('options_modifyReferringProfiles') }}</p>
    <template #footer>
      <button class="btn btn-primary" @click="emit('close')">
        {{ $t('dialog_ok') }}
      </button>
    </template>
  </BaseModal>
</template>
