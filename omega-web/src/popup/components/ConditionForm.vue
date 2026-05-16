<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { NButton, NAlert, NSelect, NInput, NSpace, NText } from 'naive-ui';
import { usePopupStore } from '@/stores/popup';
import { useProfilesStore } from '@/stores/profiles';
import { usePopupTarget } from '@/composables/usePopupTarget';
import ProfileSelect from '../../options/components/ProfileSelect.vue';
import GlyphIcon from '@/components/GlyphIcon.vue';

const store = usePopupStore();
const profilesStore = useProfilesStore();
const target = usePopupTarget();

const conditionTypeOptions = [
  { value: 'HostWildcardCondition', label: target.getMessage('condition_HostWildcardCondition') || 'Host Wildcard' },
  { value: 'HostRegexCondition', label: target.getMessage('condition_HostRegexCondition') || 'Host Regex' },
  { value: 'UrlWildcardCondition', label: target.getMessage('condition_UrlWildcardCondition') || 'URL Wildcard' },
  { value: 'UrlRegexCondition', label: target.getMessage('condition_UrlRegexCondition') || 'URL Regex' },
  { value: 'KeywordCondition', label: target.getMessage('condition_KeywordCondition') || 'Keyword' },
];

const sortedValidProfiles = computed(() => {
  const order = profilesStore.profileOrder;
  return [...store.validResultProfiles].sort((a, b) => {
    const diff = (order[a.profileType] || 0) - (order[b.profileType] || 0);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
});

function getCurrentProfileName() {
  const profile = store.availableProfiles[`+${store.currentProfileName}`];
  return profile?.name || store.currentProfileName;
}

// Auto-update pattern when condition type changes
watch(
  () => store.rule.condition.conditionType,
  (newType) => {
    const suggestion = store.conditionSuggestion[newType];
    if (suggestion) {
      store.rule.condition.pattern = suggestion;
    }
  },
);

const addError = ref('');

// Clear error when user edits the form fields
watch(
  () => [store.rule.condition.pattern, store.rule.condition.conditionType],
  () => { addError.value = ''; },
);

async function addCondition() {
  addError.value = '';
  const condition = { ...store.rule.condition };
  const profileName = store.rule.profileName;
  try {
    const result = await target.addCondition(condition, profileName);
    if (result === undefined) {
      addError.value = target.getMessage('popup_addConditionError') || 'Failed to add condition. The current profile may not support conditions.';
      return;
    }
  } catch (_) {
    addError.value = target.getMessage('popup_addConditionError') || 'Failed to add condition.';
    return;
  }
  store.returnToMenu();
  store.closeWindow();
}

async function openConditionHelp() {
  const pname = encodeURIComponent(store.currentProfileName);
  await target.openOptions(`#/profile/${pname}?help=condition`);
  store.closeWindow();
}
</script>

<template>
  <div class="om-dialog">
    <form
      class="condition-form"
      @submit.prevent="addCondition"
    >
      <fieldset>
        <legend>
          {{ target.getMessage('popup_addConditionTo') }}
          <span class="profile-inline">{{ getCurrentProfileName() }}</span>
        </legend>
        <NAlert
          v-if="addError"
          type="error"
          style="margin-bottom: 12px"
        >
          {{ addError }}
        </NAlert>
        <div style="margin-bottom: 12px;">
          <label style="display: flex; align-items: center; gap: 8px;">
            <span>{{ target.getMessage('options_conditionType') }}</span>
            <NButton
              text
              size="small"
              @click="openConditionHelp()"
            >
              {{ target.getMessage('options_showConditionTypeHelp') }}
              <template #icon>
                <GlyphIcon name="new-window" />
              </template>
            </NButton>
          </label>
          <NSelect
            :value="store.rule.condition.conditionType"
            :options="conditionTypeOptions"
            style="margin-top: 4px;"
            @update:value="(v: string) => store.rule.condition.conditionType = v"
          />
        </div>
        <div style="margin-bottom: 12px;">
          <label>{{ target.getMessage('options_conditionDetails') }}</label>
          <NInput
            :value="store.rule.condition.pattern"
            type="text"
            required
            autofocus
            style="margin-top: 4px;"
            @update:value="(v: string) => store.rule.condition.pattern = v"
          />
        </div>
        <div style="margin-bottom: 12px;">
          <label>{{ target.getMessage('options_resultProfile') }}</label>
          <ProfileSelect
            v-model="store.rule.profileName"
            :profiles="sortedValidProfiles"
          />
        </div>
        <div class="condition-controls">
          <NSpace justify="end">
            <NButton @click="store.returnToMenu()">
              {{ target.getMessage('dialog_cancel') }}
            </NButton>
            <NButton
              type="primary"
              :disabled="!store.rule.condition.pattern.trim()"
              @click="addCondition"
            >
              {{ target.getMessage('popup_addCondition') }}
            </NButton>
          </NSpace>
        </div>
      </fieldset>
    </form>
  </div>
</template>
