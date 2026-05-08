<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePopupStore } from '@/stores/popup';
import { usePopupTarget } from '@/composables/usePopupTarget';

const store = usePopupStore();
const target = usePopupTarget();

const iconForProfileType: Record<string, string> = {
  DirectProfile: 'glyphicon-transfer',
  SystemProfile: 'glyphicon-off',
  AutoDetectProfile: 'glyphicon-file',
  FixedProfile: 'glyphicon-globe',
  PacProfile: 'glyphicon-file',
  VirtualProfile: 'glyphicon-question-sign',
  RuleListProfile: 'glyphicon-list',
  SwitchProfile: 'glyphicon-retweet',
};

function getIcon(profile: any): string {
  let targetProfile = profile;
  if (profile.profileType === 'VirtualProfile' && profile.defaultProfileName) {
    targetProfile = store.availableProfiles['+' + profile.defaultProfileName];
  }
  return iconForProfileType[targetProfile?.profileType] || 'glyphicon-question-sign';
}

function getIconColor(profile: any): string {
  let targetProfile = profile;
  if (profile.profileType === 'VirtualProfile' && profile.defaultProfileName) {
    targetProfile = store.availableProfiles['+' + profile.defaultProfileName];
  }
  return targetProfile?.color || '#aaa';
}

function isVirtual(profile: any): boolean {
  if (profile.profileType === 'VirtualProfile') return true;
  return false;
}

function getProfileTitle(profile: any): string {
  let targetProfile = profile;
  if (profile.profileType === 'VirtualProfile' && profile.defaultProfileName) {
    targetProfile = store.availableProfiles['+' + profile.defaultProfileName];
  }
  return targetProfile?.desc || targetProfile?.name || '';
}

function getDispName(profile: any): string {
  let text = target.getMessage('profile_' + profile.name) || profile.name;
  if (profile.defaultProfileName) {
    text += ' [' + profile.defaultProfileName + ']';
  }
  return text;
}

function isActive(profileName: string): boolean {
  if (store.isSystemProfile) {
    return profileName === 'system';
  }
  return store.currentProfileName === profileName;
}

function isEffective(profileName: string): boolean {
  return store.isSystemProfile && store.currentProfileName === profileName;
}

function getStatusClass(profileName: string): string {
  if (isActive(profileName)) return 'om-active';
  if (isEffective(profileName)) return 'om-effective';
  return '';
}

function openOptions(hash?: string) {
  target.openOptions(hash || null).then(() => store.closeWindow());
}

// Temp rule dropdown state
const tempRuleMenuOpen = ref(false);
const selectedDefaultDropdown = ref<string | null>(null);

function toggleTempRuleMenu() {
  tempRuleMenuOpen.value = !tempRuleMenuOpen.value;
}

function toggleDefaultDropdown(profileName: string) {
  selectedDefaultDropdown.value =
    selectedDefaultDropdown.value === profileName ? null : profileName;
}

function handleApplyProfile(profileName: string) {
  store.applyProfile(profileName);
}

function handleAddTempRule(profileName: string) {
  if (store.pageInfo?.domain) {
    store.addTempRule(store.pageInfo.domain, profileName);
  }
}

function handleSetDefaultProfile(profileName: string, defaultProfileName: string) {
  store.setDefaultProfile(profileName, defaultProfileName);
}

function handleAddRule() {
  store.prepareConditionForm();
}

// Filter for validResultProfiles dropdown - exclude __ profiles and skip self when multiple
function filterDropdownProfiles(profileName: string, validProfiles: string[]): any[] {
  const currentName = store.currentTempRuleProfile;
  const filtered = validProfiles.filter((name: string) => {
    if (name.indexOf('__') === 0) return false;
    if (name === profileName && validProfiles.length > 1 && !currentName) return false;
    return true;
  });
  return filtered.map((name: string) => store.availableProfiles['+' + name]).filter(Boolean);
}

function filterDefaultDropdownProfiles(profile: any): any[] {
  if (!profile.validResultProfiles) return [];
  const filtered = profile.validResultProfiles.filter((name: string) => {
    if (name.indexOf('__') === 0) return false;
    if (name === profile.currentProfileName && profile.validResultProfiles.length > 1) return false;
    return true;
  });
  return filtered.map((name: string) => store.availableProfiles['+' + name]).filter(Boolean);
}

const hasAddRule = computed(() =>
  store.validResultProfiles.length > 0 && store.currentProfileCanAddRule,
);

const hasTempRule = computed(() => store.validResultProfiles.length > 0);
</script>

<template>
  <ul class="om-nav popup-menu-nav">
    <!-- Direct -->
    <li :class="['om-nav-item', getStatusClass('direct')]">
      <a id="js-direct" href="#" role="button"
         :title="getProfileTitle(store.availableProfiles['+direct'])"
         @click.prevent="handleApplyProfile('direct')">
        <span class="glyphicon glyphicon-transfer" style="color: #aaa;"></span>
        <span class="om-profile-name">{{ getDispName(store.availableProfiles['+direct'] || { name: 'direct' }) }}</span>
      </a>
    </li>

    <!-- System -->
    <li :class="['om-nav-item', getStatusClass('system')]">
      <a id="js-system" href="#" role="button"
         :title="getProfileTitle(store.availableProfiles['+system'])"
         @click.prevent="handleApplyProfile('system')">
        <span class="glyphicon glyphicon-off" style="color: #000;"></span>
        <span class="om-profile-name">{{ getDispName(store.availableProfiles['+system'] || { name: 'system' }) }}</span>
      </a>
    </li>

    <!-- Request Info (error count) -->
    <li v-if="store.pageInfo && store.pageInfo.errorCount > 0"
        class="om-nav-item om-reqinfo">
      <a id="js-reqinfo" href="#" role="button"
         @click.prevent="store.showRequestInfo = true">
        <span class="glyphicon glyphicon-warning-sign"></span>
        <span class="om-reqinfo-text">
          {{ target.getMessage('popup_requestErrorCount', [String(store.pageInfo.errorCount)]) }}
        </span>
      </a>
    </li>

    <li class="om-divider"></li>
    <li class="om-divider"></li>

    <!-- Custom Profiles -->
    <template v-for="(profile, idx) in store.sortedCustomProfiles" :key="profile.name">
      <!-- v-if: exclude hidden profiles -->
      <template v-if="profile.name.charAt(0) !== '_'">
        <li :class="['om-nav-item', getStatusClass(profile.name),
                     { 'om-has-dropdown': profile.validResultProfiles }]">
          <a :id="'js-profile-' + (idx + 1)" href="#" role="button"
             :class="{ 'om-has-edit': profile.validResultProfiles }"
             :title="getProfileTitle(profile)"
             @click.prevent="handleApplyProfile(profile.name)">
            <span :class="['glyphicon', getIcon(profile),
                          { 'om-virtual-profile-icon': isVirtual(profile) }]"
                  :style="{ color: getIconColor(profile) }"></span>
            <span class="om-profile-name">{{ getDispName(profile) }}</span>
            <!-- Default profile edit toggle -->
            <div v-if="profile.validResultProfiles" class="om-edit-toggle"
                 @click.stop.prevent="toggleDefaultDropdown(profile.name)">
              <span class="glyphicon glyphicon-chevron-down"></span>
            </div>
          </a>
          <!-- Default Profile Dropdown -->
          <ul v-if="selectedDefaultDropdown === profile.name"
              class="om-dropdown" style="display: block;">
            <li v-for="rp in filterDefaultDropdownProfiles(profile)"
                :key="rp.name"
                :class="['om-nav-item', { 'om-active': store.currentTempRuleProfile && rp.name === store.currentTempRuleProfile }]">
              <a href="#" role="button"
                 @click.prevent="handleSetDefaultProfile(profile.name, rp.name)">
                <span :class="['glyphicon', getIcon(rp),
                              { 'om-virtual-profile-icon': isVirtual(rp) }]"
                      :style="{ color: getIconColor(rp) }"></span>
                <span class="om-profile-name">{{ getDispName(rp) }}</span>
              </a>
            </li>
          </ul>
        </li>
      </template>
    </template>

    <li class="om-divider"></li>

    <!-- Add Rule -->
    <li v-if="hasAddRule" class="om-nav-item om-nav-addrule">
      <a id="js-addrule" href="#" role="button"
         @click.prevent="handleAddRule()">
        <span class="glyphicon glyphicon-plus"></span>
        <span>{{ target.getMessage('popup_addCondition') }}</span>
      </a>
    </li>

    <!-- Temp Rule -->
    <li v-if="hasTempRule" :class="['om-nav-item', 'om-nav-temprule', 'om-has-dropdown',
                            { 'om-open': tempRuleMenuOpen }]">
      <a id="js-temprule" href="#" role="button"
         @click.prevent="toggleTempRuleMenu()">
        <span class="glyphicon glyphicon-filter"></span>
        <span>
          <span class="om-page-domain">{{ store.currentDomain }}</span>
          <span class="om-caret"></span>
        </span>
      </a>
      <!-- Temp Rule Dropdown -->
      <ul v-if="tempRuleMenuOpen" class="om-dropdown" style="display: block;">
        <li v-for="rp in filterDropdownProfiles(store.currentProfileName, store.validResultProfiles.map(p => p.name))"
            :key="rp.name"
            :class="['om-nav-item', { 'om-active': store.currentTempRuleProfile === rp.name }]">
          <a href="#" role="button"
             @click.prevent="handleAddTempRule(rp.name)">
            <span :class="['glyphicon', getIcon(rp),
                          { 'om-virtual-profile-icon': isVirtual(rp) }]"
                  :style="{ color: getIconColor(rp) }"></span>
            <span class="om-profile-name">{{ getDispName(rp) }}</span>
          </a>
        </li>
      </ul>
    </li>

    <li class="om-divider"></li>

    <!-- Options -->
    <li class="om-nav-item">
      <a id="js-option" href="#" role="button"
         @click.prevent="openOptions()">
        <span class="glyphicon glyphicon-wrench"></span>
        <span>{{ target.getMessage('popup_showOptions') }}</span>
      </a>
    </li>
  </ul>
</template>
