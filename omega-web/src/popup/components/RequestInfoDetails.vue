<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { usePopupStore } from '@/stores/popup';
import { usePopupTarget } from '@/composables/usePopupTarget';
import ProfileSelect from '../../options/components/ProfileSelect.vue';

const store = usePopupStore();
const target = usePopupTarget();

const domainsForCondition = ref<Record<string, boolean>>({});
const profileForDomains = ref<string>('direct');

// Initialize domain checkboxes when requestInfo changes
watchEffect(() => {
  if (store.requestInfo?.domains) {
    for (const d of store.requestInfo.domains) {
      if (!(d.domain in domainsForCondition.value)) {
        domainsForCondition.value[d.domain] = true;
      }
    }
  }
});

function getProfileName(name: string): string {
  return target.getMessage(`profile_${  name}`) || name;
}

async function addConditionsForDomains() {
  const domains: Record<string, boolean> = {};
  for (const [domain, enabled] of Object.entries(domainsForCondition.value)) {
    if (enabled) domains[domain] = true;
  }
  const _profileName = profileForDomains.value ?? store.rule.profileName;

  // Open options page to add conditions for all domains
  const conditions = Object.keys(domains).map(domain => ({
    conditionType: 'HostWildcardCondition',
    pattern: domain,
  }));
  await target.openOptions(
    `#/profile/${
    encodeURIComponent(store.currentProfileName)
    }?addCondition=${  encodeURIComponent(JSON.stringify(conditions))}`,
  );
  store.closeWindow();
}

async function openManage() {
  await target.openManage();
  store.closeWindow();
}

async function configureMonitor() {
  await target.openOptions('#/general');
  store.closeWindow();
}
</script>

<template>
  <div class="om-dialog">
    <div v-if="store.requestInfo?.domains?.length">
      <!-- Legend: different text based on whether current profile can add rules -->
      <p v-if="store.currentProfileCanAddRule">
        {{ target.getMessage('popup_addConditionTo') }}
        <span class="profile-inline">
          {{ getProfileName(store.currentProfileName) }}
        </span>
      </p>
      <p v-else>
        {{ target.getMessage('popup_requestErrorHeading') }}
      </p>

      <!-- Warning and help text -->
      <p class="text-warning">
        {{ target.getMessage('popup_requestErrorWarning') }}
      </p>
      <p class="help-block">
        {{ target.getMessage('popup_requestErrorWarningHelp') }}
      </p>
      <p
        v-if="store.currentProfileCanAddRule"
        class="help-block"
      >
        {{ target.getMessage('popup_requestErrorAddCondition') }}
      </p>

      <!-- Domain list with checkboxes -->
      <div
        v-for="d in store.requestInfo.domains"
        :key="d.domain"
        style="margin: 3px 0;"
      >
        <label>
          <input
            v-model="domainsForCondition[d.domain]"
            type="checkbox"
          >
          <span class="label label-warning">{{ d.errorCount }}</span>
          {{ d.domain }}
        </label>
      </div>

      <!-- Profile select (only shown when can add rule) -->
      <div
        v-if="store.currentProfileCanAddRule"
        style="margin-top: 8px;"
      >
        <label>{{ target.getMessage('options_resultProfileForSelectedDomains') }}</label>
        <ProfileSelect
          v-model="profileForDomains"
          :profiles="store.validResultProfiles"
        />
      </div>

      <!-- Cannot add rule message -->
      <p
        v-if="!store.currentProfileCanAddRule"
        class="help-block"
      >
        {{ target.getMessage('popup_requestErrorCannotAddCondition') }}
      </p>

      <!-- Action buttons -->
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
          @click="openManage()"
        >
          {{ target.getMessage('popup_manageExt') }}
        </button>
        <button
          v-if="store.currentProfileCanAddRule"
          class="om-btn om-btn-primary"
          @click="addConditionsForDomains()"
        >
          {{ target.getMessage('popup_add') }}
        </button>
        <button
          v-if="!store.currentProfileCanAddRule"
          class="om-btn om-btn-default"
          style="float: right;"
          @click="configureMonitor()"
        >
          {{ target.getMessage('popup_configureMonitorWebRequests') }}
        </button>
      </p>
    </div>
  </div>
</template>
