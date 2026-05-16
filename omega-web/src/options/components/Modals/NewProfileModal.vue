<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import { NInput, NButton, NSpace, NText, NRadioGroup, NRadio } from 'naive-ui';
import AppModal from '@/options/components/AppModal.vue';
import GlyphIcon from '@/components/GlyphIcon.vue';

const emit = defineEmits<{ close: [] }>();
const router = useRouter();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();

const profileTypes = [
  { value: 'FixedProfile', isVirtual: false },
  { value: 'SwitchProfile', isVirtual: false },
  { value: 'PacProfile', isVirtual: false },
  { value: 'VirtualProfile', isVirtual: true },
];

const pacProfilesUnsupported = ref(false);
if (typeof (globalThis as any).browser !== 'undefined') {
  const b = (globalThis as any).browser;
  if (b?.proxy?.register || b?.proxy?.registerProxyScript) {
    pacProfilesUnsupported.value = true;
  }
}

const newProfile = ref({
  name: '',
  profileType: 'FixedProfile',
});

const nameError = computed(() => {
  const name = newProfile.value.name;
  if (!name) return { kind: 'required' };
  if (profilesStore.isProfileNameReserved(name)) return { kind: 'reserved' };
  if (optionsStore.profileByName(name)) return { kind: 'conflict' };
  return null;
});

const nameHidden = computed(() => {
  const name = newProfile.value.name;
  return !nameError.value && name && profilesStore.isProfileNameHidden(name);
});

const isValid = computed(() =>
  !nameError.value && !!newProfile.value.profileType,
);

function profileIcon(type: string): string {
  return profilesStore.profileIcons[type] || 'glyphicon-question-sign';
}

function submit() {
  if (!isValid.value) return;
  const created = optionsStore.newProfile({
    name: newProfile.value.name.trim(),
    profileType: newProfile.value.profileType,
  });
  emit('close');
  router.push(`/profile/${encodeURIComponent(created.name)}`);
}
</script>

<template>
  <AppModal
    :title="$t('options_modalHeader_newProfile')"
    size="lg"
    @close="emit('close')"
  >
    <!-- Name -->
    <div style="margin-bottom: 20px">
      <label for="profile-new-name">
        {{ $t('options_newProfileName') }}
      </label>
      <NInput
        id="profile-new-name"
        v-model:value="newProfile.name"
        type="text"
        :status="nameError && nameError.kind !== 'required' ? 'error' : undefined"
        autofocus
        @keydown.enter.prevent="submit"
      />
      <NText
        v-if="nameError?.kind === 'required'"
        depth="3"
        style="font-size: 12px"
      >
        {{ $t('options_profileNameEmpty') }}
      </NText>
      <NText
        v-if="nameError?.kind === 'reserved'"
        depth="3"
        style="font-size: 12px"
      >
        {{ $t('options_profileNameReserved') }}
      </NText>
      <NText
        v-if="nameError?.kind === 'conflict'"
        depth="3"
        style="font-size: 12px"
      >
        {{ $t('options_profileNameConflict') }}
      </NText>
      <NText
        v-if="nameHidden"
        depth="3"
        style="font-size: 12px"
      >
        <span style="color: #2080f0">
          <GlyphIcon name="info-sign" />
          {{ $t('options_profileNameHidden') }}
        </span>
      </NText>
    </div>

    <!-- Type -->
    <label>{{ $t('options_profileType') }}</label>

    <NRadioGroup v-model:value="newProfile.profileType" name="profile-new-type">
      <div
        v-for="pt in profileTypes"
        :key="pt.value"
        style="margin-bottom: 8px"
      >
        <NRadio
          :value="pt.value"
          :disabled="pt.value === 'PacProfile' && pacProfilesUnsupported"
        >
          <span class="profile-type">
            <GlyphIcon :name="profileIcon(pt.value)" />
            <span>
              {{ $t('options_profileType' + pt.value) }}
            </span>
          </span>
        </NRadio>
      <NText depth="3" style="font-size: 12px; margin-left: 24px">
        {{ $t('options_profileDesc' + pt.value) }}
      </NText>
      <NText
        v-if="pt.value === 'PacProfile' && !pacProfilesUnsupported"
        depth="3"
        style="font-size: 12px; margin-left: 24px"
      >
        {{ $t('options_profileDescMorePacProfile') }}
      </NText>
      <div
        v-if="pt.value === 'PacProfile' && pacProfilesUnsupported"
        style="margin-left: 24px"
      >
        <NText type="error" style="font-size: 12px">
          <GlyphIcon name="warning-sign" />
          {{ $t('options_pac_profile_unsupported_moz') }}
        </NText>
      </div>
    </div>
    </NRadioGroup>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="emit('close')">
          {{ $t('dialog_cancel') }}
        </NButton>
        <NButton type="primary" :disabled="!isValid" @click="submit">
          {{ $t('options_createProfile') }}
        </NButton>
      </NSpace>
    </template>
  </AppModal>
</template>
