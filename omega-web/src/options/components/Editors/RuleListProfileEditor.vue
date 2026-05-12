<script setup lang="ts">
import { ref, computed } from 'vue';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOmegaPac } from '@/composables/useOmegaPac';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import ProfileSelect from '@/options/components/ProfileSelect.vue';

const props = defineProps<{ profile: any; profileName: string }>();
const omega = useOmegaTarget();
const OmegaPac = useOmegaPac();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();

const updating = ref(false);

const ruleListFormats = computed(() => OmegaPac.Profiles?.ruleListFormats ?? ['Switchy', 'AutoProxy']);

const validProfiles = computed(() => {
  const profiles: any[] = [];
  for (const key of Object.keys(optionsStore.options)) {
    if (key.startsWith('+')) {
      const p = optionsStore.options[key];
      if (p.name !== props.profileName && !profilesStore.isProfileNameReserved(p.name)) {
        profiles.push(p);
      }
    }
  }
  return profiles;
});

function getFormatLabel(format: string): string {
  return omega.getMessage(`ruleListFormat_${  format}`) || format;
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
  try { return new Date(ts).toLocaleString(); } catch (_) { return String(ts); }
}
</script>

<template>
  <div>
    <!-- Rule List Config -->
    <section class="settings-group">
      <h3>{{ omega.getMessage('options_group_ruleListConfig') }}</h3>
      <div class="form-group">
        <label>{{ omega.getMessage('options_ruleListMatchProfile') }}</label>
        <ProfileSelect
          style="display: inline-block;"
          :profiles="validProfiles"
          :model-value="profile.matchProfileName"
          @update:model-value="profile.matchProfileName = $event; optionsStore.markDirty()"
        />
      </div>
      <div class="form-group">
        <label>{{ omega.getMessage('options_ruleListDefaultProfile') }}</label>
        <ProfileSelect
          style="display: inline-block;"
          :profiles="validProfiles"
          :model-value="profile.defaultProfileName"
          @update:model-value="profile.defaultProfileName = $event; optionsStore.markDirty()"
        />
      </div>
      <div class="form-group">
        <label>{{ omega.getMessage('options_ruleListFormat') }}</label>
        <div
          v-for="fmt in ruleListFormats"
          :key="fmt"
          class="radio inline-form-control no-min-width"
        >
          <label>
            <input
              v-model="profile.format"
              type="radio"
              name="formatInput"
              :value="fmt"
              @change="optionsStore.markDirty()"
            >
            {{ getFormatLabel(fmt) }}
          </label>
        </div>
      </div>
    </section>

    <!-- Source URL -->
    <section class="settings-group">
      <h3>{{ omega.getMessage('options_group_ruleListUrl') }}</h3>
      <input
        v-model="profile.sourceUrl"
        type="url"
        class="form-control width-limit"
        @change="optionsStore.markDirty()"
      >
      <p class="help-block">
        {{ omega.getMessage('options_ruleListUrlHelp') }}
      </p>
    </section>

    <!-- Rule List Text -->
    <section class="settings-group">
      <h3>{{ omega.getMessage('options_group_ruleListText') }}</h3>

      <p
        v-if="profile.sourceUrl && profile.lastUpdate"
        class="alert alert-success width-limit"
      >
        {{ omega.getMessage('options_ruleListLastUpdate', [formatDate(profile.lastUpdate)]) }}
      </p>
      <p
        v-if="profile.sourceUrl && !profile.lastUpdate"
        class="alert alert-danger width-limit"
      >
        {{ omega.getMessage('options_ruleListObsolete') }}
      </p>

      <p>
        <button
          class="btn btn-default"
          :disabled="!profile.sourceUrl || updating"
          :class="profile.sourceUrl && !profile.lastUpdate ? 'btn-primary' : 'btn-default'"
          @click="downloadProfile()"
        >
          <span class="glyphicon glyphicon-download-alt" />
          {{ omega.getMessage('options_downloadProfileNow') }}
        </button>
      </p>

      <textarea
        v-model="profile.ruleList"
        class="monospace form-control width-limit"
        rows="20"
        :disabled="!!profile.sourceUrl"
        @change="optionsStore.markDirty()"
      />
    </section>
  </div>
</template>
