<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { ref, computed } from 'vue';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOmegaPac } from '@/composables/useOmegaPac';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import { useUiStore } from '@/stores/ui';
import { formatDate } from '@/composables/useFormatters';
import ProfileSelect from '@/options/components/ProfileSelect.vue';
import { NButton, NAlert, NInput, NRadioGroup, NRadio, NText } from 'naive-ui';
import GlyphIcon from '@/components/GlyphIcon.vue';

const profile = defineModel<any>('profile', { required: true });
const props = defineProps<{ profileName: string }>();
const omega = useOmegaTarget();
const OmegaPac = useOmegaPac();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();

const updating = ref(false);

const ruleListFormats = computed(() => OmegaPac.Profiles?.ruleListFormats ?? ['Switchy', 'AutoProxy']);

const validProfiles = computed(() =>
  profilesStore.selectableProfiles.filter(
    (p: any) => p.name !== props.profileName && !profilesStore.isProfileNameReserved(p.name),
  ),
);

function getFormatLabel(format: string): string {
  return $t(`ruleListFormat_${  format}`) || format;
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
    <!-- Rule List Config -->
    <section class="settings-group">
      <h3>{{ $t('options_group_ruleListConfig') }}</h3>
      <div>
        <label>{{ $t('options_ruleListMatchProfile') }}</label>
        <ProfileSelect
          style="display: inline-block;"
          :profiles="validProfiles"
          :model-value="profile.matchProfileName"
          @update:model-value="profile.matchProfileName = $event; optionsStore.markDirty()"
        />
      </div>
      <div>
        <label>{{ $t('options_ruleListDefaultProfile') }}</label>
        <ProfileSelect
          style="display: inline-block;"
          :profiles="validProfiles"
          :model-value="profile.defaultProfileName"
          @update:model-value="profile.defaultProfileName = $event; optionsStore.markDirty()"
        />
      </div>
      <div>
        <label>{{ $t('options_ruleListFormat') }}</label>
        <NRadioGroup
          :value="profile.format"
          @update:value="(v: any) => { profile.format = v; optionsStore.markDirty(); }"
        >
          <NRadio
            v-for="fmt in ruleListFormats"
            :key="fmt"
            :value="fmt"
            style="display: inline-block; margin-right: 12px;"
          >
            {{ getFormatLabel(fmt) }}
          </NRadio>
        </NRadioGroup>
      </div>
    </section>

    <!-- Source URL -->
    <section class="settings-group">
      <h3>{{ $t('options_group_ruleListUrl') }}</h3>
      <NInput
        v-model:value="profile.sourceUrl"
        @update:value="optionsStore.markDirty()"
      />
      <NText depth="3" style="font-size:12px;">
        {{ $t('options_ruleListUrlHelp') }}
      </NText>
    </section>

    <!-- Rule List Text -->
    <section class="settings-group">
      <h3>{{ $t('options_group_ruleListText') }}</h3>

      <NAlert
        v-if="profile.sourceUrl && profile.lastUpdate"
        type="success"
        style="margin-bottom: 12px"
      >
        {{ $t('options_ruleListLastUpdate', [formatDate(profile.lastUpdate)]) }}
      </NAlert>
      <NAlert
        v-if="profile.sourceUrl && !profile.lastUpdate"
        type="error"
        style="margin-bottom: 12px"
      >
        {{ $t('options_ruleListObsolete') }}
      </NAlert>

      <p>
        <NButton
          :type="profile.sourceUrl && !profile.lastUpdate ? 'primary' : 'default'"
          :disabled="!profile.sourceUrl || updating"
          @click="downloadProfile()"
        >
          <GlyphIcon name="download-alt" />
          {{ $t('options_downloadProfileNow') }}
        </NButton>
      </p>

      <NInput
        type="textarea"
        v-model:value="profile.ruleList"
        :rows="20"
        :disabled="!!profile.sourceUrl"
        style="font-family: monospace"
        @update:value="optionsStore.markDirty()"
      />
    </section>
  </div>
</template>
