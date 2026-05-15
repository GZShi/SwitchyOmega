<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';

const emit = defineEmits<{ close: [] }>();
const router = useRouter();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();

// Profile types (in the same order as the original)
// RuleListProfile is intentionally excluded - it's created via format override
const profileTypes = [
  { value: 'FixedProfile', isVirtual: false },
  { value: 'SwitchProfile', isVirtual: false },
  { value: 'PacProfile', isVirtual: false },
  { value: 'VirtualProfile', isVirtual: true },
];

// Firefox's proxy API can't execute PAC scripts via PacProfile
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

// -- Validation --
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
  router.push(`/profile/${  encodeURIComponent(created.name)}`);
}

function cancel() {
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop fade in" />
    <div
      class="modal fade in"
      style="display: block;"
      @keydown.esc="cancel"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <form @submit.prevent="submit">
            <div class="modal-header">
              <button
                type="button"
                class="close"
                @click="cancel"
              >
                &times;
              </button>
              <h4 class="modal-title">
                {{ $t('options_modalHeader_newProfile') }}
              </h4>
            </div>

            <div class="modal-body">
              <!-- Name -->
              <div
                class="form-group"
                :class="{ 'has-error': nameError && nameError.kind !== 'required' }"
              >
                <label for="profile-new-name">
                  {{ $t('options_newProfileName') }}
                </label>
                <input
                  id="profile-new-name"
                  v-model="newProfile.name"
                  class="form-control"
                  type="text"
                  required
                  autofocus
                >
                <div
                  v-if="nameError?.kind === 'required'"
                  class="help-block"
                >
                  {{ $t('options_profileNameEmpty') }}
                </div>
                <div
                  v-if="nameError?.kind === 'reserved'"
                  class="help-block"
                >
                  {{ $t('options_profileNameReserved') }}
                </div>
                <div
                  v-if="nameError?.kind === 'conflict'"
                  class="help-block"
                >
                  {{ $t('options_profileNameConflict') }}
                </div>
                <div
                  v-if="nameHidden"
                  class="help-block"
                >
                  <div class="text-info">
                    <span class="glyphicon glyphicon-info-sign" />
                    {{ $t('options_profileNameHidden') }}
                  </div>
                </div>
              </div>

              <!-- Type -->
              <label>{{ $t('options_profileType') }}</label>

              <div
                v-for="pt in profileTypes"
                :key="pt.value"
                class="radio"
              >
                <label>
                  <input
                    v-model="newProfile.profileType"
                    type="radio"
                    name="profile-new-type"
                    :value="pt.value"
                    :disabled="pt.value === 'PacProfile' && pacProfilesUnsupported"
                  >
                  <span class="profile-type">
                    <span
                      class="glyphicon"
                      :class="[profileIcon(pt.value), { 'virtual-profile-icon': pt.isVirtual }]"
                    />
                    <span>
                      {{ $t('options_profileType' + pt.value) }}
                    </span>
                  </span>
                  <div class="help-block">
                    {{ $t('options_profileDesc' + pt.value) }}
                  </div>
                  <div
                    v-if="pt.value === 'PacProfile' && !pacProfilesUnsupported"
                    class="help-block"
                  >
                    {{ $t('options_profileDescMorePacProfile') }}
                  </div>
                  <div
                    v-if="pt.value === 'PacProfile' && pacProfilesUnsupported"
                    class="has-error"
                  >
                    <div class="help-block">
                      <span class="glyphicon glyphicon-warning-sign" />
                      {{ $t('options_pac_profile_unsupported_moz') }}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-default"
                @click="cancel"
              >
                {{ $t('dialog_cancel') }}
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="!isValid"
              >
                {{ $t('options_createProfile') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>
