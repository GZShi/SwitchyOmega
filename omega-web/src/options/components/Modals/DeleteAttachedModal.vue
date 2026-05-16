<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { computed } from 'vue';
import { useProfilesStore } from '@/stores/profiles';
import AppModal from '@/options/components/AppModal.vue';
import GlyphIcon from '@/components/GlyphIcon.vue';
import { NButton, NSpace } from 'naive-ui';

const props = defineProps<{
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
  <AppModal
    :title="$t('options_modalHeader_deleteAttached')"
    @close="emit('close')"
  >
    <p>{{ $t('options_deleteAttachedConfirm') }}</p>
    <div style="background:#f5f5f5;border:1px solid #e3e3e3;padding:12px;border-radius:4px">
      <GlyphIcon :name="profileIcon" />
      {{ profileName }}
      <span v-if="attachedDetails">&mdash; {{ attachedDetails }}</span>
    </div>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="emit('close')">
          {{ $t('dialog_cancel') }}
        </NButton>
        <NButton type="error" @click="emit('confirm')">
          {{ $t('options_deleteAttached') }}
        </NButton>
      </NSpace>
    </template>
  </AppModal>
</template>
