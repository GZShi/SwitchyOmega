<script setup lang="ts">
import { ref, computed } from 'vue';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOmegaPac } from '@/composables/useOmegaPac';
import { useOptionsStore } from '@/stores/options';
import { useUiStore } from '@/stores/ui';
import { formatDate } from '@/composables/useFormatters';
import { NButton, NAlert, NInput, NText } from 'naive-ui';
import GlyphIcon from '@/components/GlyphIcon.vue';
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
  } catch (e: any) {
    useUiStore().showAlert('error', e?.message ?? 'Download failed');
  }
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
      <NInput
        v-model:value="profile.pacUrl"
        @update:value="updatePacUrl()"
      />
      <NText depth="3" style="font-size:12px;">
        {{ $t('options_pacUrlHelp') }}
      </NText>

      <div
        v-if="pacUrlIsFile && !referenced"
      >
        <NText depth="3" style="font-size:12px;">
          <GlyphIcon name="warning-sign" />
          {{ $t('options_pacUrlFile') }}
        </NText>
      </div>
      <div
        v-if="pacUrlIsFile && referenced"
      >
        <NText depth="3" style="font-size:12px;">
          <GlyphIcon name="remove-sign" />
          {{ $t('options_pacUrlFile') }}
        </NText>
        <NText depth="3" style="font-size:12px;">
          {{ $t('options_pacUrlFileDisabled') }}
        </NText>
      </div>

      <p v-if="profile.pacUrl && !pacUrlIsFile">
        <NButton
          :type="profile.pacUrl && !profile.lastUpdate ? 'primary' : 'default'"
          :disabled="updating"
          @click="downloadProfile()"
        >
          <GlyphIcon name="download-alt" />
          {{ $t('options_downloadProfileNow') }}
        </NButton>
      </p>
    </section>

    <!-- PAC Script section -->
    <section class="settings-group">
      <h3>
        {{ $t('options_group_pacScript') }}
        <NButton
          size="tiny"
          :type="hasAuth ? 'success' : 'default'"
          :title="$t('options_proxy_auth')"
          @click="openAuthModal()"
        >
          <GlyphIcon name="lock" />
        </NButton>
      </h3>

      <NAlert
        v-if="hasAuth"
        type="warning"
        style="margin-bottom: 12px"
      >
        <p>{{ $t('options_proxy_authAllWarningPac') }}</p>
        <p v-if="profile.pacUrl">
          {{ $t('options_proxy_authAllWarningPacUrl') }}
        </p>
        <p v-if="!profile.pacUrl">
          {{ $t('options_proxy_authAllWarningPacScript') }}
        </p>
        <p v-if="referenced">
          <GlyphIcon name="warning-sign" />
          {{ $t('options_proxy_authReferencedWarning') }}
        </p>
      </NAlert>

      <div v-if="!pacUrlIsFile">
        <NAlert
          v-if="profile.pacUrl && profile.lastUpdate"
          type="success"
          style="margin-bottom: 12px"
        >
          {{ $t('options_pacScriptLastUpdate', [formatDate(profile.lastUpdate)]) }}
        </NAlert>
        <NAlert
          v-if="profile.pacUrl && !profile.lastUpdate"
          type="error"
          style="margin-bottom: 12px"
        >
          {{ $t('options_pacScriptObsolete') }}
        </NAlert>
        <NInput
          type="textarea"
          v-model:value="profile.pacScript"
          :rows="20"
          :disabled="!pacUrlValid || !!profile.pacUrl"
          style="font-family: monospace"
          @update:value="optionsStore.markDirty()"
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
