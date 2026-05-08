<script setup lang="ts">
import { computed } from 'vue';
import { usePopupStore } from '@/stores/popup';
import { usePopupTarget } from '@/composables/usePopupTarget';

const store = usePopupStore();
const target = usePopupTarget();

const conditionTypes = [
  { value: 'HostWildcardCondition', label: 'Host Wildcard' },
  { value: 'HostRegexCondition', label: 'Host Regex' },
  { value: 'UrlWildcardCondition', label: 'URL Wildcard' },
  { value: 'UrlRegexCondition', label: 'URL Regex' },
  { value: 'KeywordCondition', label: 'Keyword' },
];

function getProfileName(name: string): string {
  return target.getMessage('profile_' + name) || name;
}

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

function updateConditionType(type: string) {
  store.rule.condition.conditionType = type;
}

function addCondition() {
  const condition = { ...store.rule.condition };
  const profileName = store.rule.profileName;
  store.returnToMenu();
  // Call omegaTarget to add condition
  // Since OmegaTargetPopup doesn't have a direct addCondition method,
  // we need to open the options page for this.
  target.openOptions(
    '#/profile/' +
    encodeURIComponent(store.currentProfileName) +
    '?addCondition=' + encodeURIComponent(JSON.stringify(condition)),
  ).then(() => store.closeWindow());
}

function openConditionHelp() {
  const pname = encodeURIComponent(store.currentProfileName);
  target.openOptions('#/profile/' + pname + '?help=condition').then(() => store.closeWindow());
}
</script>

<template>
  <div class="om-dialog">
    <p>{{ target.getMessage('popup_addCondition') }}</p>
    <div>
      <select v-model="store.rule.condition.conditionType"
              @change="updateConditionType(($event.target as HTMLSelectElement).value)">
        <option v-for="ct in conditionTypes" :key="ct.value" :value="ct.value">
          {{ ct.label }}
        </option>
      </select>
    </div>
    <div style="margin-top: 5px;">
      <input v-model="store.rule.condition.pattern"
             type="text" style="width: 100%;" />
    </div>
    <div style="margin-top: 5px;">
      <select v-model="store.rule.profileName">
        <option v-for="p in sortedValidProfiles" :key="p.name" :value="p.name">
          {{ getProfileName(p.name) }}
        </option>
      </select>
    </div>
    <p class="om-dialog-controls" style="margin-top: 10px;">
      <button class="om-btn om-btn-link" @click="store.returnToMenu()">
        {{ target.getMessage('popup_cancel') }}
      </button>
      <button class="om-btn om-btn-link" @click="openConditionHelp()">
        {{ target.getMessage('popup_help') }}
      </button>
      <button class="om-btn om-btn-primary" @click="addCondition()">
        {{ target.getMessage('popup_add') }}
      </button>
    </p>
  </div>
</template>
