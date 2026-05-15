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

const addDomainsError = ref('');

async function addConditionsForDomains() {
  addDomainsError.value = '';
  const conditions: Array<{ conditionType: string; pattern: string }> = [];
  for (const [domain, enabled] of Object.entries(domainsForCondition.value)) {
    if (enabled) {
      conditions.push({
        conditionType: 'HostWildcardCondition',
        pattern: domain,
      });
    }
  }
  if (conditions.length === 0) {
    addDomainsError.value = target.getMessage('popup_addConditionError') || 'No domains selected.';
    return;
  }
  const _profileName = profileForDomains.value ?? store.rule.profileName;
  try {
    const result = await target.addCondition(conditions, _profileName);
    if (result === undefined) {
      addDomainsError.value = target.getMessage('popup_addConditionError') || 'Failed to add conditions. The current profile may not support conditions.';
      return;
    }
  } catch (_) {
    addDomainsError.value = target.getMessage('popup_addConditionError') || 'Failed to add conditions.';
    return;
  }
  store.closeWindow();
}

async function configureMonitor() {
  await target.openOptions('#/general');
  store.closeWindow();
}
</script>

<template>
  <div class="om-dialog request-info-details">
    <form
      v-if="store.requestInfo?.domains?.length"
      @submit.prevent="addConditionsForDomains"
    >
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

      <!-- Error display -->
      <div
        v-if="addDomainsError"
        class="alert alert-danger"
        style="margin-top: 8px;"
      >
        {{ addDomainsError }}
      </div>

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
          class="om-btn om-btn-default"
          type="button"
          @click="store.returnToMenu()"
        >
          {{ target.getMessage('dialog_cancel') }}
        </button>
        <button
          v-if="store.currentProfileCanAddRule"
          class="om-btn om-btn-primary"
          type="submit"
        >
          {{ target.getMessage('popup_addCondition') }}
        </button>
        <button
          v-if="!store.currentProfileCanAddRule"
          class="om-btn om-btn-default"
          type="button"
          style="float: right;"
          @click="configureMonitor()"
        >
          {{ target.getMessage('popup_configureMonitorWebRequests') }}
        </button>
      </p>
    </form>
  </div>
</template>
