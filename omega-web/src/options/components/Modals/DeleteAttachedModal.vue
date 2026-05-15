<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { computed } from 'vue';
import { useProfilesStore } from '@/stores/profiles';
import BaseModal from '@/options/components/BaseModal.vue';

const props = defineProps<{
  show: boolean;
  profileName: string;
  parentName: string;
  sourceUrl?: string;
  ruleList?: string;
}>();
const emit = defineEmits<{ close: []; confirm: [] }>();
const profilesStore = useProfilesStore();

const profileIcon = computed(() => profilesStore.profileIcons['RuleListProfile'] || 'glyphicon-question-sign');

const attachedDetails = computed(() => {
  if (props.sourceUrl) return props.sourceUrl;
  if (props.ruleList) {
    const lineCount = props.ruleList.split('\n').length;
    return $t('options_ruleListLineCount', [String(lineCount)]);
  }
  return '';
});
</script>

<template>
  <BaseModal
    :show="show"
    :title="$t('options_modalHeader_deleteAttached')"
    @close="emit('close')"
  >
    <p>{{ $t('options_deleteAttachedConfirm') }}</p>
    <div class="well">
      <span class="glyphicon" :class="[profileIcon]" />
      {{ profileName }}
      <span v-if="attachedDetails">&mdash; {{ attachedDetails }}</span>
    </div>
    <template #footer>
      <button class="btn btn-default" @click="emit('close')">
        {{ $t('dialog_cancel') }}
      </button>
      <button class="btn btn-danger" @click="emit('confirm')">
        {{ $t('options_deleteAttached') }}
      </button>
    </template>
  </BaseModal>
</template>
