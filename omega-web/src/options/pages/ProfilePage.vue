<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useOmegaPac } from '@/composables/useOmegaPac';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import ProfileHeader from '@/options/components/ProfileHeader.vue';
import DeleteProfileModal from '@/options/components/Modals/DeleteProfileModal.vue';
import CannotDeleteProfileModal from '@/options/components/Modals/CannotDeleteProfileModal.vue';
import FixedProfileEditor from '@/options/components/Editors/FixedProfileEditor.vue';
import PacProfileEditor from '@/options/components/Editors/PacProfileEditor.vue';
import SwitchProfileEditor from '@/options/components/Editors/SwitchProfileEditor.vue';
import RuleListProfileEditor from '@/options/components/Editors/RuleListProfileEditor.vue';
import VirtualProfileEditor from '@/options/components/Editors/VirtualProfileEditor.vue';

const router = useRouter();
const OmegaPac = useOmegaPac();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();

const props = defineProps<{ name: string | string[] }>();

// Vue Router's (.*)* catch-all wraps the value in an array, normalize to string
const profileName = computed(() =>
  Array.isArray(props.name) ? props.name.join('/') : props.name,
);

const profile = ref<any>(null);
const profileTemplate = ref('');

const profileTypeMap: Record<string, string> = {
  FixedProfile: 'profile_fixed',
  PacProfile: 'profile_pac',
  VirtualProfile: 'profile_virtual',
  SwitchProfile: 'profile_switch',
  RuleListProfile: 'profile_rule_list',
};

const showDeleteModal = ref(false);
const showCannotDelete = ref(false);
const refs = ref<any[]>([]);

// Watch for profile changes (both options data and route param changes)
watch(
  [() => optionsStore.options, profileName],
  () => {
    if (!optionsStore.options || Object.keys(optionsStore.options).length === 0) return;
    const p = optionsStore.profileByName(profileName.value);
    if (!p) {
      router.replace('/about');
      return;
    }
    // Check if format override needed
    if (OmegaPac.Profiles?.formatByType?.[p.profileType]) {
      p.format = OmegaPac.Profiles.formatByType[p.profileType];
      p.profileType = 'RuleListProfile';
    }
    profile.value = p;
    profileTemplate.value = profileTypeMap[p.profileType] || 'profile_unsupported';
  },
  { immediate: true, deep: true },
);

function handleDelete() {
  const refSet = profilesStore.referencedBySet(profileName.value);
  const keys = Object.keys(refSet);
  if (keys.length > 0) {
    // Build deduplicated ref list
    const refMap: Record<string, string> = {};
    for (const key of Object.keys(refSet)) {
      const parent = profilesStore.getParentName(refSet[key]);
      if (parent) {
        const parentKey = OmegaPac.Profiles?.nameAsKey?.(parent) ?? (`+${  parent}`);
        refMap[parentKey] = parent;
      } else {
        refMap[key] = refSet[key];
      }
    }
    refs.value = Object.keys(refMap).map((k) => optionsStore.options[k]).filter(Boolean);
    showCannotDelete.value = true;
  } else {
    showDeleteModal.value = true;
  }
}

function confirmDelete() {
  optionsStore.deleteProfile(profileName.value);
  showDeleteModal.value = false;
  router.push('/about');
}

// Export handler
const exportHandler = ref<((...args: any[]) => void) | null>(null);
const exportOptions = ref<any>(null);

function setExportHandler(handler: (...args: any[]) => void, opts?: any) {
  exportHandler.value = handler;
  exportOptions.value = opts;
}
</script>

<template>
  <div
    v-if="profile"
    class="omega-profile"
  >
    <ProfileHeader
      v-model:profile="profile"
      :profile-name="profileName"
      :export-rule-list-handler="exportHandler"
      :export-rule-list-options="exportOptions"
      @delete="handleDelete()"
    />

    <!-- Dynamic editor by profile type -->
    <FixedProfileEditor
      v-if="profileTemplate === 'profile_fixed'"
      :key="profileName"
      v-model:profile="profile"
      :profile-name="profileName"
    />
    <PacProfileEditor
      v-else-if="profileTemplate === 'profile_pac'"
      :key="profileName"
      v-model:profile="profile"
      :profile-name="profileName"
    />
    <SwitchProfileEditor
      v-else-if="profileTemplate === 'profile_switch'"
      :key="profileName"
      v-model:profile="profile"
      :profile-name="profileName"
      @set-export-handler="setExportHandler"
    />
    <RuleListProfileEditor
      v-else-if="profileTemplate === 'profile_rule_list'"
      :key="profileName"
      v-model:profile="profile"
      :profile-name="profileName"
    />
    <VirtualProfileEditor
      v-else-if="profileTemplate === 'profile_virtual'"
      :key="profileName"
      v-model:profile="profile"
      :profile-name="profileName"
    />
    <div
      v-else-if="profileTemplate === 'profile_unsupported'"
      class="alert alert-warning"
    >
      {{ $t('options_profileUnsupported') }}
    </div>

    <!-- Modals -->
    <DeleteProfileModal
      v-if="showDeleteModal"
      v-model:profile="profile"
      :profile-name="profileName"
      @close="showDeleteModal = false"
      @confirm="confirmDelete()"
    />
    <CannotDeleteProfileModal
      v-if="showCannotDelete"
      :refs="refs"
      :profile-name="profileName"
      @close="showCannotDelete = false"
    />
  </div>
  <div
    v-else
    class="omega-page"
  >
    <p>{{ $t('options_loading') }}</p>
  </div>
</template>
