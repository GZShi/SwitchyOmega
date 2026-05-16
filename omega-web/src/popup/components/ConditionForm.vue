<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { usePopupStore } from '@/stores/popup';
import { useProfilesStore } from '@/stores/profiles';
import { usePopupTarget } from '@/composables/usePopupTarget';
import ProfileSelect from '../../options/components/ProfileSelect.vue';

const store = usePopupStore();
const profilesStore = useProfilesStore();
const target = usePopupTarget();

const conditionTypes = [
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
        <div
          v-if="addError"
          class="alert alert-danger"
        >
          {{ addError }}
        </div>
        <div class="form-group">
          <label>
            {{ target.getMessage('options_conditionType') }}
            <button
              type="button"
              class="btn btn-link btn-sm clear-padding"
              @click="openConditionHelp()"
            >
              {{ target.getMessage('options_showConditionTypeHelp') }}
              <span class="glyphicon glyphicon-new-window" />
            </button>
          </label>
          <select
            v-model="store.rule.condition.conditionType"
            class="form-control"
          >
            <option
              v-for="ct in conditionTypes"
              :key="ct.value"
              :value="ct.value"
            >
              {{ ct.label }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>{{ target.getMessage('options_conditionDetails') }}</label>
          <input
            v-model="store.rule.condition.pattern"
            type="text"
            class="form-control condition-details"
            required
            autofocus
          >
        </div>
        <div class="form-group">
          <label>{{ target.getMessage('options_resultProfile') }}</label>
          <ProfileSelect
            v-model="store.rule.profileName"
            :profiles="sortedValidProfiles"
          />
        </div>
        <div class="condition-controls">
          <button
            type="button"
            class="btn btn-default"
            @click="store.returnToMenu()"
          >
            {{ target.getMessage('dialog_cancel') }}
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="!store.rule.condition.pattern.trim()"
          >
            {{ target.getMessage('popup_addCondition') }}
          </button>
        </div>
      </fieldset>
    </form>
  </div>
</template>
