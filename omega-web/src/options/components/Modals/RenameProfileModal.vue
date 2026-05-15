<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import BaseModal from '@/options/components/BaseModal.vue';

const props = defineProps<{ profile: any; profileName: string }>();
const emit = defineEmits<{ close: [] }>();
const router = useRouter();
const omega = useOmegaTarget();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();

const newName = ref(props.profileName);
const nameError = ref('');

function validate(): boolean {
  const name = newName.value.trim();
  if (!name) {
    nameError.value = $t('options_profileNameEmpty');
    return false;
  }
  if (name === props.profileName) {
    nameError.value = '';
    return true;
  }
  if (profilesStore.isProfileNameReserved(name)) {
    nameError.value = $t('options_profileNameReserved');
    return false;
  }
  if (optionsStore.profileByName(name)) {
    nameError.value = $t('options_profileNameConflict');
    return false;
  }
  nameError.value = '';
  return true;
}

async function submit() {
  if (!validate()) return;
  const toName = newName.value.trim();

  if (toName !== props.profileName) {
    try {
      await omega.renameProfile(props.profileName, toName);
      const attachedName = profilesStore.getAttachedName(props.profileName);
      if (optionsStore.profileByName(attachedName)) {
        const toAttached = profilesStore.getAttachedName(toName);
        if (optionsStore.profileByName(toAttached)) {
          optionsStore.markDirty();
        } else {
          await omega.renameProfile(attachedName, toAttached);
        }
      }
      emit('close');
      router.push(`/profile/${encodeURIComponent(toName)}`);
    } catch (err: any) {
      nameError.value = String(err);
    }
  } else {
    emit('close');
  }
}
</script>

<template>
  <BaseModal
    :title="$t('options_renameProfile')"
    @close="emit('close')"
  >
    <div class="form-group" :class="{ 'has-error': nameError }">
      <label for="rename-profile-input">{{ $t('options_renameProfileName') }}</label>
      <input
        id="rename-profile-input"
        v-model="newName"
        class="form-control"
        type="text"
        autofocus
        @keydown.enter="submit()"
      >
      <span v-if="nameError" class="help-block">{{ nameError }}</span>
    </div>
    <template #footer>
      <button class="btn btn-default" @click="emit('close')">
        {{ $t('dialog_cancel') }}
      </button>
      <button class="btn btn-primary" @click="submit()">
        {{ $t('options_renameProfile') }}
      </button>
    </template>
  </BaseModal>
</template>
