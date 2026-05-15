<script setup lang="ts">
import { ref, computed } from 'vue';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOmegaPac } from '@/composables/useOmegaPac';
import { useOptionsStore } from '@/stores/options';
import { formatDate } from '@/composables/useFormatters';
import ProxyAuthModal from '@/options/components/Modals/ProxyAuthModal.vue';

const profile = defineModel<any>('profile', { required: true });
const props = defineProps<{ profileName: string }>();
const omega = useOmegaTarget();
const OmegaPac = useOmegaPac();
const optionsStore = useOptionsStore();

const showAuthModal = ref(false);

function openAuthModal() {
  showAuthModal.value = true;
}

function saveAuth(auth: { username: string; password: string } | null) {
  if (!auth) {
    if (profile.value.auth) {
      delete profile.value.auth.all;
    }
  } else {
    profile.value.auth ??= {};
    profile.value.auth.all = auth;
  }
  optionsStore.markDirty();
}

const urlRegex = /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?$/;
const urlWithFile = /^(ftp|http|https|file):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?$/;

const isFileUrl = (url: string) => OmegaPac.Profiles?.isFileUrl?.(url) ?? false;
const pacUrlIsFile = ref(isFileUrl(profile.value.pacUrl ?? ''));
const updating = ref(false);

const referenced = computed(() => {
  if (!OmegaPac.Profiles?.referencedBySet) return false;
  const set = OmegaPac.Profiles.referencedBySet(props.profileName, optionsStore.options);
  return Object.keys(set).length > 0;
});

const pacUrlValid = computed(() => {
  const url = profile.value.pacUrl ?? '';
  if (!url) return true;
  return referenced.value ? urlRegex.test(url) : urlWithFile.test(url);
});

const hasAuth = computed(() => !!(profile.value.auth?.all));

function updatePacUrl() {
  pacUrlIsFile.value = isFileUrl(profile.value.pacUrl ?? '');
  optionsStore.markDirty();
}

async function downloadProfile() {
  updating.value = true;
  try {
    await omega.updateProfile(props.profileName, 'bypass_cache');
  } catch (_) { /* ignore */ }
  finally {
    updating.value = false;
  }
}

</script>

<template>
  <div>
    <!-- PAC URL section -->
    <section class="settings-group">
      <h3>{{ $t('options_group_pacUrl') }}</h3>
      <input
        v-model="profile.pacUrl"
        type="text"
        class="form-control width-limit"
        @change="updatePacUrl()"
      >
      <p class="help-block">
        {{ $t('options_pacUrlHelp') }}
      </p>

      <div
        v-if="pacUrlIsFile && !referenced"
        class="has-warning"
      >
        <p class="help-block">
          <span class="glyphicon glyphicon-warning-sign" />
          {{ $t('options_pacUrlFile') }}
        </p>
      </div>
      <div
        v-if="pacUrlIsFile && referenced"
        class="has-error"
      >
        <p class="help-block">
          <span class="glyphicon glyphicon-remove-sign" />
          {{ $t('options_pacUrlFile') }}
        </p>
        <p class="help-block">
          {{ $t('options_pacUrlFileDisabled') }}
        </p>
      </div>

      <p v-if="profile.pacUrl && !pacUrlIsFile">
        <button
          class="btn"
          :class="profile.pacUrl && !profile.lastUpdate ? 'btn-primary' : 'btn-default'"
          :disabled="updating"
          @click="downloadProfile()"
        >
          <span class="glyphicon glyphicon-download-alt" />
          {{ $t('options_downloadProfileNow') }}
        </button>
      </p>
    </section>

    <!-- PAC Script section -->
    <section class="settings-group">
      <h3>
        {{ $t('options_group_pacScript') }}
        <button
          class="btn btn-xs proxy-auth-toggle"
          :class="hasAuth ? 'btn-success' : 'btn-default'"
          type="button"
          :title="$t('options_proxy_auth')"
          @click="openAuthModal()"
        >
          <span class="glyphicon glyphicon-lock" />
        </button>
      </h3>

      <div
        v-if="hasAuth"
        class="alert alert-warning width-limit"
      >
        <p>{{ $t('options_proxy_authAllWarningPac') }}</p>
        <p v-if="profile.pacUrl">
          {{ $t('options_proxy_authAllWarningPacUrl') }}
        </p>
        <p v-if="!profile.pacUrl">
          {{ $t('options_proxy_authAllWarningPacScript') }}
        </p>
        <p v-if="referenced">
          <span class="glyphicon glyphicon-warning-sign" />
          {{ $t('options_proxy_authReferencedWarning') }}
        </p>
      </div>

      <div v-if="!pacUrlIsFile">
        <p
          v-if="profile.pacUrl && profile.lastUpdate"
          class="alert alert-success width-limit"
        >
          {{ $t('options_pacScriptLastUpdate', [formatDate(profile.lastUpdate)]) }}
        </p>
        <p
          v-if="profile.pacUrl && !profile.lastUpdate"
          class="alert alert-danger width-limit"
        >
          {{ $t('options_pacScriptObsolete') }}
        </p>
        <textarea
          v-model="profile.pacScript"
          class="monospace form-control width-limit"
          rows="20"
          :disabled="!pacUrlValid || !!profile.pacUrl"
          @change="optionsStore.markDirty()"
        />
      </div>
    </section>

    <ProxyAuthModal
      v-if="showAuthModal"
      :auth="profile.auth?.all"
      @close="showAuthModal = false"
      @save="saveAuth($event)"
    />
  </div>
</template>
