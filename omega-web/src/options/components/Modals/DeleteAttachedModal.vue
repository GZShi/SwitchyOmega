<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { computed } from 'vue';
import { useProfilesStore } from '@/stores/profiles';

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
  <Teleport to="body">
    <div
      v-if="show"
      class="modal-backdrop fade in"
    />
    <div
      v-if="show"
      class="modal fade in"
      style="display: block;"
      @keydown.esc="emit('close')"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <button
              type="button"
              class="close"
              @click="emit('close')"
            >
              &times;
            </button>
            <h4 class="modal-title">
              {{ $t('options_modalHeader_deleteAttached') }}
            </h4>
          </div>
          <div class="modal-body">
            <p>{{ $t('options_deleteAttachedConfirm') }}</p>
            <div class="well">
              <span
                class="glyphicon"
                :class="[profileIcon]"
              />
              {{ profileName }}
              <span v-if="attachedDetails">
                &mdash; {{ attachedDetails }}
              </span>
            </div>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-default"
              @click="emit('close')"
            >
              {{ $t('dialog_cancel') }}
            </button>
            <button
              class="btn btn-danger"
              @click="emit('confirm')"
            >
              {{ $t('options_deleteAttached') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
