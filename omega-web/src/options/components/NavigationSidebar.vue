<script setup lang="ts">
import { computed, ref, h } from 'vue';
import { useRouter } from 'vue-router';
import { NMenu, NButton, NDivider } from 'naive-ui';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import { isFirefox } from '@/services/chrome';
import { getMessage as $t } from '@/services/chrome/i18n';
import GlyphIcon from '@/components/GlyphIcon.vue';
import NewProfileModal from './Modals/NewProfileModal.vue';

const router = useRouter();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();

const showNewProfileModal = ref(false);

const sortedProfiles = computed(() => profilesStore.sortedProfiles);

const isExperimental = isFirefox;

function getIcon(profile: any): string {
  if (profile.profileType === 'VirtualProfile' && profile.defaultProfileName) {
    const resolved = profilesStore.resolveTargetProfile(profile.defaultProfileName);
    return resolved?.icon ?? 'question-sign';
  }
  return profilesStore.profileIcons[profile?.profileType] || 'question-sign';
}

function getProfileColor(profile: any): string {
  if (profile.profileType === 'VirtualProfile' && profile.defaultProfileName) {
    const resolved = profilesStore.resolveTargetProfile(profile.defaultProfileName);
    return resolved?.color ?? '#aaa';
  }
  return profile?.color ?? '#aaa';
}

function dispName(name: string): string {
  return $t(`profile_${name}`) || name;
}

const activeTab = computed(() => {
  const name = router.currentRoute.value.name;
  if (typeof name === 'string') return name;
  return null;
});

const activeProfile = computed(() => {
  const param = router.currentRoute.value.params?.name;
  return Array.isArray(param) ? param.join('/') : param ?? null;
});

const menuOptions = computed(() => {
  const tabs: any[] = [
    {
      label: $t('options_tab_ui'),
      key: 'tab-ui',
      icon: () => h(GlyphIcon, { name: 'wrench' }),
    },
    {
      label: $t('options_tab_general'),
      key: 'tab-general',
      icon: () => h(GlyphIcon, { name: 'cog' }),
    },
    {
      label: $t('options_tab_importExport'),
      key: 'tab-io',
      icon: () => h(GlyphIcon, { name: 'floppy-save' }),
    },
  ];

  const profiles: any[] = sortedProfiles.value.map((p) => ({
    label: dispName(p.name),
    key: `profile:${p.name}`,
    icon: () => h(GlyphIcon, { name: getIcon(p.profile), color: getProfileColor(p.profile) }),
  }));

  return [
    {
      type: 'group' as const,
      label: $t('options_navHeader_setting'),
      key: 'group-settings',
      children: tabs,
    },
    {
      type: 'divider' as const,
      key: 'div-settings',
    },
    {
      type: 'group' as const,
      label: $t('options_navHeader_profiles'),
      key: 'group-profiles',
      children: profiles,
    },
  ];
});

const currentMenuValue = computed(() => {
  if (activeProfile.value) return `profile:${activeProfile.value}`;
  if (activeTab.value) return `tab-${activeTab.value}`;
  return null;
});

function handleMenuUpdate(key: string) {
  if (key.startsWith('tab-')) {
    const route = key.slice('tab-'.length);
    router.push(`/${route === 'io' ? 'io' : route}`);
  } else if (key.startsWith('profile:')) {
    const name = key.slice('profile:'.length);
    router.push(`/profile/${encodeURIComponent(name)}`);
  }
}

function newProfile() {
  showNewProfileModal.value = true;
}

function applyOptions() {
  optionsStore.applyOptions();
}

function revertOptions() {
  optionsStore.revertOptions();
}
</script>

<template>
  <header class="side-nav">
    <h1>
      <a
        href="#!/about"
        :title="$t('about_title')"
        @click.prevent="router.push('/about')"
      >{{ $t('appNameShort') }}</a>
      <sup
        v-if="isExperimental"
        class="om-experimental"
        style="color: #a94442;"
      >{{ $t('options_experimental_badge') }}</sup>
    </h1>

    <NMenu
      :value="currentMenuValue"
      :options="menuOptions"
      @update:value="handleMenuUpdate"
    />

    <div class="sidebar-actions">
      <NButton
        size="small"
        quaternary
        @click="newProfile()"
      >
        <template #icon>
          <GlyphIcon name="plus" />
        </template>
        {{ $t('options_newProfile') }}
      </NButton>

      <NDivider />

      <NButton
        size="small"
        :type="optionsStore.optionsDirty ? 'success' : 'default'"
        @click="applyOptions()"
      >
        <template #icon>
          <GlyphIcon name="ok-circle" />
        </template>
        {{ $t('options_apply') }}
      </NButton>

      <NButton
        size="small"
        text
        type="error"
        :disabled="!optionsStore.optionsDirty"
        @click="revertOptions()"
      >
        <template #icon>
          <GlyphIcon name="remove-circle" />
        </template>
        {{ $t('options_discard') }}
      </NButton>
    </div>

    <!-- Modals -->
    <NewProfileModal
      v-if="showNewProfileModal"
      @close="showNewProfileModal = false"
    />
  </header>
</template>

<style scoped>
.sidebar-actions {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sidebar-actions .n-button {
  justify-content: flex-start;
}
</style>
