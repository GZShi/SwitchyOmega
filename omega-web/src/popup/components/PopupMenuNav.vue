<script setup lang="ts">
import { ref, computed } from 'vue';
import { NInput } from 'naive-ui';
import { usePopupStore } from '@/stores/popup';
import { usePopupTarget } from '@/composables/usePopupTarget';
import { useProfilesStore } from '@/stores/profiles';
import { MENU_KEY_LABELS, getProfileKeyLabel } from '@/popup/constants/keymap';
import GlyphIcon from '@/components/GlyphIcon.vue';

const store = usePopupStore();
const target = usePopupTarget();
const profilesStore = useProfilesStore();

function resolveTarget(profile: any): any {
  if (!profile) return null;
  if (profile.profileType === 'VirtualProfile' && profile.defaultProfileName) {
    return store.availableProfiles[`+${profile.defaultProfileName}`] ?? profile;
  }
  return profile;
}

function getIcon(profile: any): string {
  const target = resolveTarget(profile);
  if (!target) return 'glyphicon-question-sign';
  return profilesStore.profileIcons[target.profileType] || 'glyphicon-question-sign';
}

function getIconColor(profile: any): string {
  const target = resolveTarget(profile);
  return target?.color ?? '#aaa';
}

function isVirtual(profile: any): boolean {
  return profile?.profileType === 'VirtualProfile';
}

function getProfileTitle(profile: any): string {
  const target = resolveTarget(profile);
  if (!target) return '';
  return target.desc ?? target.name ?? '';
}

function getDispName(profile: any): string {
  let text = target.getMessage(`profile_${  profile.name}`) || profile.name;
  if (profile.defaultProfileName) {
    text += ` [${  profile.defaultProfileName  }]`;
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

async function openOptions(hash?: string) {
  await target.openOptions(hash);
  store.closeWindow();
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

// External profile editing
const externalName = ref(store.externalProfile?.name ?? '');

async function handleSaveExternal() {
  const name = externalName.value.trim();
  if (name) {
    await store.saveExternal(name);
  }
}


// Filter for validResultProfiles dropdown - exclude __ profiles and skip self when multiple
function filterDropdownProfiles(profileName: string, validProfiles: string[]): any[] {
  const currentName = store.currentTempRuleProfile;
  const filtered = validProfiles.filter((name: string) => {
    if (name.startsWith('__')) return false;
    if (name === profileName && validProfiles.length > 1 && !currentName) return false;
    return true;
  });
  return filtered.map((name: string) => store.availableProfiles[`+${  name}`]).filter(Boolean);
}

function filterDefaultDropdownProfiles(profile: any): any[] {
  if (!profile.validResultProfiles) return [];
  const filtered = profile.validResultProfiles.filter((name: string) => {
    if (name.startsWith('__')) return false;
    if (name === profile.currentProfileName && profile.validResultProfiles.length > 1) return false;
    return true;
  });
  return filtered.map((name: string) => store.availableProfiles[`+${  name}`]).filter(Boolean);
}

const hasDomain = computed(() => !!store.currentDomain);

const hasAddRule = computed(() =>
  hasDomain.value && store.validResultProfiles.length > 0 && store.currentProfileCanAddRule,
);

const hasTempRule = computed(() =>
  hasDomain.value && store.validResultProfiles.length > 0,
);
</script>

<template>
  <ul class="om-nav popup-menu-nav">
    <!-- Direct -->
    <li :class="['om-nav-item', getStatusClass('direct')]">
      <a
        id="js-direct"
        href="#"
        role="button"
        :title="getProfileTitle(store.availableProfiles['+direct'])"
        @click.prevent="handleApplyProfile('direct')"
      >
        <GlyphIcon name="transfer" color="#aaa" />
        <span v-if="store.showKeyboardHelp" class="om-keyboard-help">{{ MENU_KEY_LABELS['js-direct'] }}</span>
        <span class="om-profile-name">{{ getDispName(store.availableProfiles['+direct'] || { name: 'direct' }) }}</span>
      </a>
    </li>

    <!-- System -->
    <li :class="['om-nav-item', getStatusClass('system')]">
      <a
        id="js-system"
        href="#"
        role="button"
        :title="getProfileTitle(store.availableProfiles['+system'])"
        @click.prevent="handleApplyProfile('system')"
      >
        <GlyphIcon name="off" color="#000" />
        <span v-if="store.showKeyboardHelp" class="om-keyboard-help">{{ MENU_KEY_LABELS['js-system'] }}</span>
        <span class="om-profile-name">{{ getDispName(store.availableProfiles['+system'] || { name: 'system' }) }}</span>
      </a>
    </li>

    <!-- Request Info (error count) -->
    <li
      v-if="store.pageInfo && store.pageInfo.errorCount > 0"
      class="om-nav-item om-reqinfo"
    >
      <a
        id="js-reqinfo"
        href="#"
        role="button"
        @click.prevent="store.showRequestInfo = true"
      >
        <GlyphIcon name="warning-sign" />
        <span v-if="store.showKeyboardHelp" class="om-keyboard-help">{{ MENU_KEY_LABELS['js-reqinfo'] }}</span>
        <span class="om-reqinfo-text">
          {{ target.getMessage('popup_requestErrorCount', [String(store.pageInfo.errorCount)]) }}
        </span>
      </a>
    </li>

    <!-- External Profile -->
    <li
      v-if="!store.requestInfoProvided && !!store.externalProfile"
      :class="['om-nav-item', 'external-profile', getStatusClass('')]"
    >
      <a
        id="js-external"
        href="#"
        role="button"
        :title="getProfileTitle(store.externalProfile)"
        @click.prevent="store.saveExternalOpen = !store.saveExternalOpen"
      >
        <GlyphIcon
          :name="getIcon(store.externalProfile)"
          :color="getIconColor(store.externalProfile)"
        />
        <span v-if="store.showKeyboardHelp" class="om-keyboard-help">{{ MENU_KEY_LABELS['js-external'] }}</span>
        <span
          v-if="!store.saveExternalOpen"
          class="om-profile-name"
        >{{ target.getMessage('popup_externalProfile') }}</span>
        <form
          v-if="store.saveExternalOpen"
          style="display: inline;"
          @submit.prevent="handleSaveExternal()"
        >
          <NInput
            v-model:value="externalName"
            size="small"
            :placeholder="target.getMessage('popup_externalProfileName')"
            autofocus
            style="width: 120px;"
            @blur="handleSaveExternal()"
          />
        </form>
      </a>
    </li>

    <li class="om-divider" />

    <!-- Custom Profiles -->
    <template
      v-for="(profile, idx) in store.sortedCustomProfiles"
      :key="profile.name"
    >
      <!-- v-if: exclude hidden profiles -->
      <template v-if="profile.name.charAt(0) !== '_'">
        <li
          :class="['om-nav-item', getStatusClass(profile.name),
                   { 'om-has-dropdown': profile.validResultProfiles }]"
        >
          <a
            :id="'js-profile-' + (idx + 1)"
            href="#"
            role="button"
            :class="{ 'om-has-edit': profile.validResultProfiles }"
            :title="getProfileTitle(profile)"
            @click.prevent="handleApplyProfile(profile.name)"
          >
            <GlyphIcon
              :name="getIcon(profile)"
              :color="getIconColor(profile)"
            />
            <span v-if="store.showKeyboardHelp" class="om-keyboard-help">{{ getProfileKeyLabel(idx) }}</span>
            <span class="om-profile-name">{{ getDispName(profile) }}</span>
            <!-- Default profile edit toggle -->
            <div
              v-if="profile.validResultProfiles"
              class="om-edit-toggle"
              @click.stop.prevent="toggleDefaultDropdown(profile.name)"
            >
              <GlyphIcon name="chevron-down" />
            </div>
          </a>
          <!-- Default Profile Dropdown -->
          <ul
            v-if="selectedDefaultDropdown === profile.name"
            class="om-dropdown"
            style="display: block;"
          >
            <li
              v-for="rp in filterDefaultDropdownProfiles(profile)"
              :key="rp.name"
              :class="['om-nav-item', { 'om-active': store.currentTempRuleProfile && rp.name === store.currentTempRuleProfile }]"
            >
              <a
                href="#"
                role="button"
                @click.prevent="handleSetDefaultProfile(profile.name, rp.name)"
              >
                <GlyphIcon
                  :name="getIcon(rp)"
                  :color="getIconColor(rp)"
                />
                <span class="om-profile-name">{{ getDispName(rp) }}</span>
              </a>
            </li>
          </ul>
        </li>
      </template>
    </template>

    <li
      v-if="hasDomain && store.validResultProfiles.length > 0"
      class="om-divider"
    />

    <!-- Add Rule -->
    <li
      v-if="hasAddRule"
      class="om-nav-item om-nav-addrule"
    >
      <a
        id="js-addrule"
        href="#"
        role="button"
        @click.prevent="handleAddRule()"
      >
        <GlyphIcon name="plus" />
        <span v-if="store.showKeyboardHelp" class="om-keyboard-help">{{ MENU_KEY_LABELS['js-addrule'] }}</span>
        <span>{{ target.getMessage('popup_addCondition') }}</span>
      </a>
    </li>

    <!-- Temp Rule -->
    <li
      v-if="hasTempRule"
      :class="['om-nav-item', 'om-nav-temprule', 'om-has-dropdown',
               { 'om-open': tempRuleMenuOpen }]"
    >
      <a
        id="js-temprule"
        href="#"
        role="button"
        @click.prevent="toggleTempRuleMenu()"
      >
        <GlyphIcon name="filter" />
        <span v-if="store.showKeyboardHelp" class="om-keyboard-help">{{ MENU_KEY_LABELS['js-temprule'] }}</span>
        <span>
          <span class="om-page-domain">{{ store.currentDomain }}</span>
          <span class="om-caret" />
        </span>
      </a>
      <!-- Temp Rule Dropdown -->
      <ul
        v-if="tempRuleMenuOpen"
        class="om-dropdown"
        style="display: block;"
      >
        <li
          v-for="rp in filterDropdownProfiles(store.currentProfileName, store.validResultProfiles.map(p => p.name))"
          :key="rp.name"
          :class="['om-nav-item', { 'om-active': store.currentTempRuleProfile === rp.name }]"
        >
          <a
            href="#"
            role="button"
            @click.prevent="handleAddTempRule(rp.name)"
          >
            <GlyphIcon
              :name="getIcon(rp)"
              :color="getIconColor(rp)"
            />
            <span class="om-profile-name">{{ getDispName(rp) }}</span>
          </a>
        </li>
      </ul>
    </li>

    <li class="om-divider" />

    <!-- Options -->
    <li class="om-nav-item">
      <a
        id="js-option"
        href="#"
        role="button"
        @click.prevent="openOptions()"
      >
        <GlyphIcon name="wrench" />
        <span v-if="store.showKeyboardHelp" class="om-keyboard-help">{{ MENU_KEY_LABELS['js-option'] }}</span>
        <span>{{ target.getMessage('popup_showOptions') }}</span>
      </a>
    </li>
  </ul>
</template>
