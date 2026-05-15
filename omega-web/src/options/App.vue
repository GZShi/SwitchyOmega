<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useOptionsStore } from '@/stores/options';
import { useUiStore } from '@/stores/ui';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOmegaPac } from '@/composables/useOmegaPac';
import NavigationSidebar from './components/NavigationSidebar.vue';
import AlertBar from './components/AlertBar.vue';
import WelcomeModal from './components/WelcomeModal.vue';

const router = useRouter();
const route = useRoute();
const optionsStore = useOptionsStore();
const uiStore = useUiStore();
const omega = useOmegaTarget();
const OmegaPac = useOmegaPac();

// Welcome wizard
const showWelcome = ref(false);
const welcomeIsUpgrade = ref(false);
let showFirstRunOnce = true;

const alertIcons: Record<string, string> = {
  success: 'glyphicon-ok',
  warning: 'glyphicon-warning-sign',
  error: 'glyphicon-remove',
  danger: 'glyphicon-danger',
};

// First-run / upgrade wizard
async function showFirstRun() {
  if (!showFirstRunOnce) return;
  showFirstRunOnce = false;

  const firstRun = await omega.state('firstRun');
  if (!firstRun) return;
  omega.state('firstRun', '');

  // Find first FixedProfile to show
  let profileName: string | null = null;
  const opts = optionsStore.options;
  OmegaPac.Profiles.each(opts, (_key: string, profile: any) => {
    if (!profileName && profile.profileType === 'FixedProfile') {
      profileName = profile.name;
    }
  });
  if (!profileName) return;

  welcomeIsUpgrade.value = firstRun === 'upgrade';
  showWelcome.value = true;
}

function handleWelcomeResult(result: string) {
  showWelcome.value = false;
  if (result === 'show') {
    // Find first FixedProfile again and navigate
    let profileName: string | null = null;
    OmegaPac.Profiles.each(optionsStore.options, (_key: string, profile: any) => {
      if (!profileName && profile.profileType === 'FixedProfile') {
        profileName = profile.name;
      }
    });
    if (profileName) {
      router.push(`/profile/${  encodeURIComponent(profileName)}`);
    }
  }
}

// Routing logic
async function redirectToLastUrl() {
  if (route.path === '/' || route.path === '') {
    const lastUrl = await omega.lastUrl();
    if (lastUrl) {
      router.replace(lastUrl);
    } else {
      router.replace('/about');
    }
  }
}

// Window close warning
window.onbeforeunload = () => {
  if (optionsStore.optionsDirty) {
    return $t('options_optionsNotSaved');
  }
  return null;
};

// Hide alert on click
document.addEventListener('click', () => uiStore.hideAlert(), false);

onMounted(async () => {
  optionsStore.onOptionsChange(() => {
    showFirstRun();
  });
  optionsStore.init();
  await redirectToLastUrl();

  // Track route changes for lastUrl
  router.afterEach((to) => {
    omega.lastUrl(to.fullPath);
    uiStore.hideAlert();
  });
});
</script>

<template>
  <div
    id="omega-options"
    class="omega-layout"
  >
    <!-- Sidebar Navigation -->
    <NavigationSidebar />

    <!-- Main Content -->
    <main class="omega-main">
      <AlertBar
        v-if="uiStore.alertShown && uiStore.alert"
        :type="uiStore.alert.type"
        :message="uiStore.alert.message"
        :icon="alertIcons[uiStore.alert.type]"
      />
      <router-view />
    </main>

    <!-- Welcome Wizard -->
    <WelcomeModal
      v-if="showWelcome"
      :is-upgrade="welcomeIsUpgrade"
      @close="handleWelcomeResult($event)"
    />
  </div>
</template>

<style lang="less">
@import '../styles/common.less';
@import '../styles/options.less';

// Phase A: Flexbox layout replaces Bootstrap's float-based grid + position:fixed
// This avoids overlap issues at breakpoint transitions.
.omega-layout {
  display: flex;
  align-items: stretch;
  min-height: 100vh;
}

.side-nav {
  flex: 0 0 240px;
  width: 240px;
  max-width: 240px;
  background-color: var(--color-bg-light);
  border-right: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  padding: var(--spacing-md);
  box-sizing: border-box;

  @media (max-width: 767px) {
    position: static;
    flex: 0 0 auto;
    width: 100%;
    max-width: none;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }
}

.omega-main {
  flex: 1 1 auto;
  min-width: 0;
  padding: var(--spacing-lg) var(--spacing-xl);
  box-sizing: border-box;
  overflow-x: auto;

  .page-header {
    position: static;
    background: none;
    background-image: none;
    padding: 0 0 var(--spacing-md) 0;
    margin: 0 0 var(--spacing-lg) 0;
    max-height: none;
    width: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    border-bottom: 1px solid #eee;
  }

  .profile-color-editor {
    float: none;
    margin: 0;
    order: 1;
  }

  h2.profile-name {
    order: 2;
    flex: 1 1 auto;
    margin: 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .profile-actions {
    float: none;
    order: 3;
    margin-left: auto;
    white-space: nowrap;
  }
}

// Ensure modals sit above everything (the sticky sidebar creates a stacking
// context; we Teleport modals to body so they escape it, but we still set
// high z-index to be safe across browsers).
.modal-backdrop {
  position: fixed !important;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1040 !important;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal {
  position: fixed !important;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1050 !important;
  overflow-x: hidden;
  overflow-y: auto;
}

.modal-dialog {
  position: relative;
  width: auto;
  margin: 30px auto;
  max-width: 600px;
}
</style>
