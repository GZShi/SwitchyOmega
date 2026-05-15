<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { ref, computed } from 'vue';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import { useUiStore } from '@/stores/ui';
import ProfileSelect from '@/options/components/ProfileSelect.vue';
import ReplaceProfileModal from '@/options/components/Modals/ReplaceProfileModal.vue';

const profile = defineModel<any>('profile', { required: true });
defineProps<{ profileName: string }>();
const omega = useOmegaTarget();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();
const uiStore = useUiStore();

const showReplaceModal = ref(false);

const validTargets = computed(() => {
  const profiles: any[] = [];
  for (const key of Object.keys(optionsStore.options)) {
    if (key.startsWith('+')) {
      const p = optionsStore.options[key];
      if (p.profileType !== 'VirtualProfile' && !profilesStore.isProfileNameReserved(p.name)) {
        profiles.push(p);
      }
    }
  }
  const builtins = profilesStore.builtinProfiles;
  for (const key of Object.keys(builtins)) profiles.push(builtins[key]);
  return profiles;
});

function dispName(name: string): string {
  return $t(`profile_${  name}`) || name;
}

function openReplaceModal() {
  showReplaceModal.value = true;
}

async function doReplace(fromName: string, toName: string) {
  try {
    await omega.replaceRef(fromName, toName);
    uiStore.showAlert('success', $t('options_replaceProfileSuccess') || 'Replaced.');
  } catch (e: any) {
    uiStore.showAlert('error', e.message ?? String(e));
  }
}
</script>

<template>
  <div>
    <section class="settings-group">
      <h3>{{ $t('options_group_virtualProfile') }}</h3>
      <p class="help-block">
        {{ $t('options_virtualProfileTargetHelp') }}
      </p>
      <div class="form-group">
        <label>{{ $t('options_virtualProfileTarget') }}</label>
        <ProfileSelect
          style="display: inline-block;"
          :profiles="validTargets"
          :model-value="profile.defaultProfileName"
          @update:model-value="profile.defaultProfileName = $event; optionsStore.markDirty()"
        />
      </div>
    </section>

    <section class="settings-group">
      <h3>{{ $t('options_group_virtualProfileReplace') }}</h3>
      <p class="help-block">
        {{ $t('options_virtualProfileReplaceHelp', [dispName(profile.defaultProfileName || '')]) }}
      </p>
      <div class="form-group">
        <button
          class="btn btn-default"
          @click="openReplaceModal()"
        >
          <span class="glyphicon glyphicon-search" />
          {{ $t('options_virtualProfileReplace') }}
        </button>
      </div>
    </section>

    <ReplaceProfileModal
      v-if="showReplaceModal"
      :from-name="profile.defaultProfileName || ''"
      :to-name="profileName"
      @close="showReplaceModal = false"
      @confirm="(f: string, t: string) => doReplace(f, t)"
    />
  </div>
</template>
