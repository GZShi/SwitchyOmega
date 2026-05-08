<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePopupStore } from '@/stores/popup';
import { usePopupTarget } from '@/composables/usePopupTarget';

const store = usePopupStore();
const target = usePopupTarget();

const domainsForCondition = ref<Record<string, boolean>>({});
const profileForDomains = ref<string | null>(null);

// Initialize domain checkboxes
computed(() => {
  if (store.requestInfo?.domains) {
    for (const d of store.requestInfo.domains) {
      if (!(d.domain in domainsForCondition.value)) {
        domainsForCondition.value[d.domain] = true;
      }
    }
  }
  return null;
});

function getProfileName(name: string): string {
  return target.getMessage('profile_' + name) || name;
}

function addConditionsForDomains() {
  const domains: Record<string, boolean> = {};
  for (const [domain, enabled] of Object.entries(domainsForCondition.value)) {
    if (enabled) domains[domain] = true;
  }
  const profileName = profileForDomains.value || store.rule.profileName;

  // Open options page to add conditions for all domains
  const conditions = Object.keys(domains).map(domain => ({
    conditionType: 'HostWildcardCondition',
    pattern: domain,
  }));
  target.openOptions(
    '#/profile/' +
    encodeURIComponent(store.currentProfileName) +
    '?addCondition=' + encodeURIComponent(JSON.stringify(conditions)),
  ).then(() => store.closeWindow());
}

function openManage() {
  target.openManage().then(() => store.closeWindow());
}
</script>

<template>
  <div class="om-dialog">
    <div v-if="store.requestInfo?.domains?.length">
      <p>
        {{ target.getMessage('popup_requestErrorCount', [String(store.requestInfo.domains.length)]) }}
      </p>
      <div v-for="d in store.requestInfo.domains" :key="d.domain"
           style="margin: 3px 0;">
        <label>
          <input type="checkbox" v-model="domainsForCondition[d.domain]" />
          {{ d.domain }} ({{ d.errorCount }})
        </label>
      </div>
      <div style="margin-top: 8px;">
        <select v-model="profileForDomains"
                style="width: 100%;">
          <option v-for="p in store.validResultProfiles" :key="p.name" :value="p.name">
            {{ getProfileName(p.name) }}
          </option>
        </select>
      </div>
      <p class="om-dialog-controls" style="margin-top: 10px;">
        <button class="om-btn om-btn-link" @click="store.returnToMenu()">
          {{ target.getMessage('popup_cancel') }}
        </button>
        <button class="om-btn om-btn-link" @click="openManage()">
          {{ target.getMessage('popup_manageExt') }}
        </button>
        <button class="om-btn om-btn-primary" @click="addConditionsForDomains()">
          {{ target.getMessage('popup_add') }}
        </button>
      </p>
    </div>
  </div>
</template>
