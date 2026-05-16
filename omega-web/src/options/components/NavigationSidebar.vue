<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import { isFirefox } from '@/services/chrome';
import { getMessage as $t } from '@/services/chrome/i18n';
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
    return resolved?.icon ?? 'glyphicon-question-sign';
  }
  return profilesStore.profileIcons[profile?.profileType] || 'glyphicon-question-sign';
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

function goProfile(name: string) {
  router.push(`/profile/${encodeURIComponent(name)}`);
}

function isProfileActive(name: string): boolean {
  const param = router.currentRoute.value.params?.name;
  return Array.isArray(param) ? param.join('/') === name : param === name;
}

function isTabActive(name: string): boolean {
  return router.currentRoute.value.name === name;
}

async function newProfile() {
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
        class="om-experimental text-danger"
      >{{ $t('options_experimental_badge') }}</sup>
    </h1>

    <!-- Single nav list matching legacy Bootstrap .nav-pills structure -->
    <ul class="nav nav-pills nav-stacked">
      <!-- Settings header -->
      <li class="nav-header">
        {{ $t('options_navHeader_setting') }}
      </li>
      <li
        role="presentation"
        :class="{ active: isTabActive('ui') }"
      >
        <a
          href="#!/ui"
          @click.prevent="router.push('/ui')"
        >
          <span class="glyphicon glyphicon-wrench" />
          {{ $t('options_tab_ui') }}
        </a>
      </li>
      <li
        role="presentation"
        :class="{ active: isTabActive('general') }"
      >
        <a
          href="#!/general"
          @click.prevent="router.push('/general')"
        >
          <span class="glyphicon glyphicon-cog" />
          {{ $t('options_tab_general') }}
        </a>
      </li>
      <li
        role="presentation"
        :class="{ active: isTabActive('io') }"
      >
        <a
          href="#!/io"
          @click.prevent="router.push('/io')"
        >
          <span class="glyphicon glyphicon-floppy-save" />
          {{ $t('options_tab_importExport') }}
        </a>
      </li>

      <!-- Divider -->
      <li class="divider" />

      <!-- Profiles header -->
      <li class="nav-header">
        {{ $t('options_navHeader_profiles') }}
      </li>

      <!-- Profile list -->
      <li
        v-for="p in sortedProfiles"
        :key="p.name"
        role="presentation"
        :data-profile-type="p.profile.profileType"
        class="nav-profile"
        :class="{ active: isProfileActive(p.name) }"
      >
        <a
          href="#"
          @click.prevent="goProfile(p.name)"
        >
          <span
            :class="['glyphicon', getIcon(p.profile)]"
            :style="{ color: getProfileColor(p.profile) }"
          />
          {{ dispName(p.name) }}
        </a>
      </li>

      <!-- New profile link (matching legacy inline-link style) -->
      <li class="nav-new-profile">
        <button
          class="btn btn-link align-initial"
          @click="newProfile()"
        >
          <span class="glyphicon glyphicon-plus" />
          <span>{{ $t('options_newProfile') }}</span>
        </button>
      </li>

      <!-- Divider -->
      <li class="divider" />

      <!-- Actions header -->
      <li class="nav-header">
        {{ $t('options_navHeader_actions') }}
      </li>

      <!-- Apply button — always visible, highlights when dirty -->
      <li>
        <button
          class="btn btn-default align-initial"
          :class="{ 'btn-success': optionsStore.optionsDirty }"
          @click="applyOptions()"
        >
          <span class="glyphicon glyphicon-ok-circle" />
          {{ $t('options_apply') }}
        </button>
      </li>

      <!-- Discard button — always visible, disabled when not dirty -->
      <li :class="{ disabled: !optionsStore.optionsDirty }">
        <button
          class="btn btn-link text-danger align-initial"
          :disabled="!optionsStore.optionsDirty"
          @click="revertOptions()"
        >
          <span class="glyphicon glyphicon-remove-circle" />
          {{ $t('options_discard') }}
        </button>
      </li>
    </ul>

    <!-- Modals -->
    <NewProfileModal
      v-if="showNewProfileModal"
      @close="showNewProfileModal = false"
    />
  </header>
</template>
