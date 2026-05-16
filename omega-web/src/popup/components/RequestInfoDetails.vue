<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { NButton, NAlert, NCheckbox, NTag, NSpace, NText } from 'naive-ui';
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
  const profileName = profileForDomains.value ?? store.rule.profileName;
  try {
    const result = await target.addCondition(conditions, profileName);
    if (result === undefined) {
      addDomainsError.value = target.getMessage('popup_addConditionError') || 'Failed to add conditions. The current profile may not support conditions.';
      return;
    }
  } catch (e) {
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
      <NAlert
        v-if="addDomainsError"
        type="error"
        style="margin: 8px 0 12px;"
      >
        {{ addDomainsError }}
      </NAlert>

      <!-- Warning and help text -->
      <p style="color: #8a6d3b;">
        {{ target.getMessage('popup_requestErrorWarning') }}
      </p>
      <NText depth="3" style="font-size:12px;">
        {{ target.getMessage('popup_requestErrorWarningHelp') }}
      </NText>
      <NText
        v-if="store.currentProfileCanAddRule"
        depth="3"
        style="font-size:12px;"
      >
        {{ target.getMessage('popup_requestErrorAddCondition') }}
      </NText>

      <!-- Domain list with checkboxes -->
      <div
        v-for="d in store.requestInfo.domains"
        :key="d.domain"
        style="margin: 3px 0;"
      >
        <NCheckbox
          :checked="domainsForCondition[d.domain]"
          @update:checked="(v: boolean) => domainsForCondition[d.domain] = v"
        >
          <NTag type="warning" size="small" style="margin-right: 4px;">
            {{ d.errorCount }}
          </NTag>
          {{ d.domain }}
        </NCheckbox>
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
      <NText
        v-if="!store.currentProfileCanAddRule"
        depth="3"
        style="font-size:12px;"
      >
        {{ target.getMessage('popup_requestErrorCannotAddCondition') }}
      </NText>

      <!-- Action buttons -->
      <div
        class="om-dialog-controls"
        style="margin-top: 10px;"
      >
        <NSpace justify="end">
          <NButton type="button" @click="store.returnToMenu()">
            {{ target.getMessage('dialog_cancel') }}
          </NButton>
          <NButton
            v-if="store.currentProfileCanAddRule"
            type="primary"
            @click="addConditionsForDomains"
          >
            {{ target.getMessage('popup_addCondition') }}
          </NButton>
          <NButton
            v-if="!store.currentProfileCanAddRule"
            @click="configureMonitor()"
          >
            {{ target.getMessage('popup_configureMonitorWebRequests') }}
          </NButton>
        </NSpace>
      </div>
    </form>
  </div>
</template>
