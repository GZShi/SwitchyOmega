<script setup lang="ts">
import { computed, watch } from 'vue';
import { usePopupStore } from '@/stores/popup';
import { usePopupTarget } from '@/composables/usePopupTarget';
import ProfileSelect from '../../options/components/ProfileSelect.vue';

const store = usePopupStore();
const target = usePopupTarget();

const conditionTypes = [
  { value: 'HostWildcardCondition', label: 'Host Wildcard' },
  { value: 'HostRegexCondition', label: 'Host Regex' },
  { value: 'UrlWildcardCondition', label: 'URL Wildcard' },
  { value: 'UrlRegexCondition', label: 'URL Regex' },
  { value: 'KeywordCondition', label: 'Keyword' },
];

const sortedValidProfiles = computed(() => {
  const order: Record<string, number> = {
    FixedProfile: -2000,
    PacProfile: -1000,
    VirtualProfile: 1000,
    SwitchProfile: 2000,
    RuleListProfile: 3000,
  };
  return [...store.validResultProfiles].sort((a, b) => {
    const diff = (order[a.profileType] || 0) - (order[b.profileType] || 0);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
});

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

async function addCondition() {
  const condition = { ...store.rule.condition };
  const _profileName = store.rule.profileName;
  store.returnToMenu();
  await target.openOptions(
    `#/profile/${
    encodeURIComponent(store.currentProfileName)
    }?addCondition=${  encodeURIComponent(JSON.stringify(condition))}`,
  );
  store.closeWindow();
}

async function openConditionHelp() {
  const pname = encodeURIComponent(store.currentProfileName);
  await target.openOptions(`#/profile/${  pname  }?help=condition`);
  store.closeWindow();
}
</script>

<template>
  <div class="om-dialog">
    <p>{{ target.getMessage('popup_addCondition') }}</p>
    <div>
      <select
        v-model="store.rule.condition.conditionType"
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
    <div style="margin-top: 5px;">
      <input
        v-model="store.rule.condition.pattern"
        type="text"
        style="width: 100%;"
      >
    </div>
    <div style="margin-top: 5px;">
      <ProfileSelect
        v-model="store.rule.profileName"
        :profiles="sortedValidProfiles"
      />
    </div>
    <p
      class="om-dialog-controls"
      style="margin-top: 10px;"
    >
      <button
        class="om-btn om-btn-link"
        @click="store.returnToMenu()"
      >
        {{ target.getMessage('popup_cancel') }}
      </button>
      <button
        class="om-btn om-btn-link"
        @click="openConditionHelp()"
      >
        {{ target.getMessage('popup_help') }}
      </button>
      <button
        class="om-btn om-btn-primary"
        @click="addCondition()"
      >
        {{ target.getMessage('popup_add') }}
      </button>
    </p>
  </div>
</template>
