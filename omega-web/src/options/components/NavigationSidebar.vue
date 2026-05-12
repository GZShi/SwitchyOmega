<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import NewProfileModal from './Modals/NewProfileModal.vue';
import ApplyOptionsConfirmModal from './Modals/ApplyOptionsConfirmModal.vue';

const router = useRouter();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();
const omega = useOmegaTarget();

const showNewProfileModal = ref(false);
const showApplyConfirm = ref(false);

const sortedProfiles = computed(() => profilesStore.sortedProfiles);

function getIcon(profile: any): string {
  let target = profile;
  if (profile.profileType === 'VirtualProfile' && profile.defaultProfileName) {
    target = profilesStore.profileByName(profile.defaultProfileName);
  }
  return profilesStore.profileIcons[target?.profileType] || 'glyphicon-question-sign';
}

function getProfileColor(profile: any): string {
  let target = profile;
  if (profile.profileType === 'VirtualProfile' && profile.defaultProfileName) {
    target = profilesStore.profileByName(profile.defaultProfileName);
  }
  return target?.color ?? '#aaa';
}

function dispName(name: string): string {
  return omega.getMessage(`profile_${  name}`) || name;
}

function goProfile(name: string) {
  router.push(`/profile/${  encodeURIComponent(name)}`);
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
    <div class="omega-brand">
      <h3>
        <a
          href="#!/about"
          @click.prevent="router.push('/about')"
        >
          SwitchyOmega
        </a>
        <small
          v-if="/* isExperimental */ false"
          class="badge"
        >EXP</small>
      </h3>
    </div>

    <!-- Settings nav -->
    <ul class="nav nav-pills nav-stacked">
      <li
        role="presentation"
        :class="{ active: router.currentRoute.value.name === 'ui' }"
      >
        <a
          href="#!/ui"
          @click.prevent="router.push('/ui')"
        >
          <span class="glyphicon glyphicon-cog" />
          {{ omega.getMessage('options_tab_ui') }}
        </a>
      </li>
      <li
        role="presentation"
        :class="{ active: router.currentRoute.value.name === 'general' }"
      >
        <a
          href="#!/general"
          @click.prevent="router.push('/general')"
        >
          <span class="glyphicon glyphicon-th" />
          {{ omega.getMessage('options_tab_general') }}
        </a>
      </li>
      <li
        role="presentation"
        :class="{ active: router.currentRoute.value.name === 'io' }"
      >
        <a
          href="#!/io"
          @click.prevent="router.push('/io')"
        >
          <span class="glyphicon glyphicon-floppy-disk" />
          {{ omega.getMessage('options_tab_importExport') }}
        </a>
      </li>
    </ul>

    <hr>

    <!-- Profile list -->
    <ul class="nav nav-pills nav-stacked">
      <li
        v-for="p in sortedProfiles"
        :key="p.name"
        role="presentation"
        :data-profile-type="p.profile.profileType"
        class="nav-profile"
        :class="{ active: router.currentRoute.value.params?.name === p.name }"
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
    </ul>

    <hr>

    <!-- New profile button -->
    <div class="nav-new-profile">
      <button
        class="btn btn-primary btn-block"
        @click="showNewProfileModal = true"
      >
        {{ omega.getMessage('options_newProfile') }}
      </button>
    </div>

    <!-- Apply / Revert -->
    <div
      v-if="optionsStore.optionsDirty"
      class="nav-apply"
    >
      <button
        class="btn btn-success btn-block"
        @click="applyOptions()"
      >
        {{ omega.getMessage('options_apply') }}
      </button>
      <button
        class="btn btn-default btn-block"
        @click="revertOptions()"
      >
        {{ omega.getMessage('options_discard') }}
      </button>
    </div>

    <!-- Modals -->
    <NewProfileModal
      v-if="showNewProfileModal"
      @close="showNewProfileModal = false"
    />
    <ApplyOptionsConfirmModal
      v-if="showApplyConfirm"
      @close="showApplyConfirm = false"
      @confirm="applyOptions(); showApplyConfirm = false"
    />
  </header>
</template>

<style scoped>
.side-nav {
  /* Sidebar styles handled by options.less */
}
</style>
