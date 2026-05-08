<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOmegaPac } from '@/composables/useOmegaPac';
import { useOptionsStore } from '@/stores/options';
import ProxyAuthModal from '@/options/components/Modals/ProxyAuthModal.vue';

const props = defineProps<{ profile: any; profileName: string }>();
const omega = useOmegaTarget();
const OmegaPac = useOmegaPac();
const optionsStore = useOptionsStore();

const showAuthModal = ref(false);

function openAuthModal() {
  showAuthModal.value = true;
}

function saveAuth(auth: { username: string; password: string } | null) {
  if (!auth) {
    if (props.profile.auth) {
      delete props.profile.auth.all;
    }
  } else {
    if (!props.profile.auth) props.profile.auth = {};
    props.profile.auth.all = auth;
  }
  optionsStore.markDirty();
}

const urlRegex = /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/;
const urlWithFile = /^(ftp|http|https|file):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/;

const isFileUrl = (url: string) => OmegaPac.Profiles?.isFileUrl?.(url) || false;
const pacUrlIsFile = ref(isFileUrl(props.profile.pacUrl || ''));
const updating = ref(false);

const referenced = computed(() => {
  if (!OmegaPac.Profiles?.referencedBySet) return false;
  const set = OmegaPac.Profiles.referencedBySet(props.profileName, optionsStore.options);
  return Object.keys(set).length > 0;
});

const pacUrlValid = computed(() => {
  const url = props.profile.pacUrl || '';
  if (!url) return true;
  return referenced.value ? urlRegex.test(url) : urlWithFile.test(url);
});

const hasAuth = computed(() => !!(props.profile.auth?.all));

function updatePacUrl() {
  pacUrlIsFile.value = isFileUrl(props.profile.pacUrl || '');
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

function formatDate(ts: any): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString();
  } catch (_) {
    return String(ts);
  }
}
</script>

<template>
  <div>
    <!-- PAC URL section -->
    <section class="settings-group">
      <h3>{{ omega.getMessage('options_group_pacUrl') }}</h3>
      <input v-model="profile.pacUrl" type="text" class="form-control width-limit"
             @change="updatePacUrl()" />
      <p class="help-block">{{ omega.getMessage('options_pacUrlHelp') }}</p>

      <div v-if="pacUrlIsFile && !referenced" class="has-warning">
        <p class="help-block">
          <span class="glyphicon glyphicon-warning-sign"></span>
          {{ omega.getMessage('options_pacUrlFile') }}
        </p>
      </div>
      <div v-if="pacUrlIsFile && referenced" class="has-error">
        <p class="help-block">
          <span class="glyphicon glyphicon-remove-sign"></span>
          {{ omega.getMessage('options_pacUrlFile') }}
        </p>
        <p class="help-block">{{ omega.getMessage('options_pacUrlFileDisabled') }}</p>
      </div>

      <p v-if="profile.pacUrl && !pacUrlIsFile">
        <button class="btn"
                :class="profile.pacUrl && !profile.lastUpdate ? 'btn-primary' : 'btn-default'"
                :disabled="updating"
                @click="downloadProfile()">
          <span class="glyphicon glyphicon-download-alt"></span>
          {{ omega.getMessage('options_downloadProfileNow') }}
        </button>
      </p>
    </section>

    <!-- PAC Script section -->
    <section class="settings-group">
      <h3>
        {{ omega.getMessage('options_group_pacScript') }}
        <button class="btn btn-xs proxy-auth-toggle"
                :class="hasAuth ? 'btn-success' : 'btn-default'"
                type="button"
                :title="omega.getMessage('options_proxy_auth')"
                @click="openAuthModal()">
          <span class="glyphicon glyphicon-lock"></span>
        </button>
      </h3>

      <div v-if="hasAuth" class="alert alert-warning width-limit">
        <p>{{ omega.getMessage('options_proxy_authAllWarningPac') }}</p>
        <p v-if="profile.pacUrl">{{ omega.getMessage('options_proxy_authAllWarningPacUrl') }}</p>
        <p v-if="!profile.pacUrl">{{ omega.getMessage('options_proxy_authAllWarningPacScript') }}</p>
        <p v-if="referenced">
          <span class="glyphicon glyphicon-warning-sign"></span>
          {{ omega.getMessage('options_proxy_authReferencedWarning') }}
        </p>
      </div>

      <div v-if="!pacUrlIsFile">
        <p v-if="profile.pacUrl && profile.lastUpdate" class="alert alert-success width-limit">
          {{ omega.getMessage('options_pacScriptLastUpdate', [formatDate(profile.lastUpdate)]) }}
        </p>
        <p v-if="profile.pacUrl && !profile.lastUpdate" class="alert alert-danger width-limit">
          {{ omega.getMessage('options_pacScriptObsolete') }}
        </p>
        <textarea v-model="profile.pacScript"
                  class="monospace form-control width-limit"
                  rows="20"
                  :disabled="!pacUrlValid || !!profile.pacUrl"
                  @change="optionsStore.markDirty()"></textarea>
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
