<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOmegaPac } from '@/composables/useOmegaPac';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';

const props = defineProps<{ profile: any; profileName: string }>();
const emit = defineEmits<{ close: [] }>();
const router = useRouter();
const omega = useOmegaTarget();
const OmegaPac = useOmegaPac();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();

const newName = ref(props.profileName);
const nameError = ref('');

function validate(): boolean {
  const name = newName.value.trim();
  if (!name) return false;
  if (name === props.profileName) return true;
  if (profilesStore.isProfileNameReserved(name)) {
    nameError.value = omega.getMessage('options_profileNameReserved');
    return false;
  }
  if (optionsStore.profileByName(name)) {
    nameError.value = omega.getMessage('options_profileNameConflict');
    return false;
  }
  nameError.value = '';
  return true;
}

async function submit() {
  if (!newName.value.trim()) return;
  if (!validate()) return;
  const toName = newName.value.trim();

  if (toName !== props.profileName) {
    try {
      await omega.renameProfile(props.profileName, toName);
      // Handle attached rule list
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
      router.push('/profile/' + encodeURIComponent(toName));
    } catch (err: any) {
      nameError.value = String(err);
    }
  } else {
    emit('close');
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop fade in"></div>
      <div class="modal fade in" style="display: block;" @keydown.esc="emit('close')">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" @click="emit('close')">&times;</button>
              <h4 class="modal-title">{{ omega.getMessage('options_renameProfile') }}</h4>
            </div>
            <div class="modal-body">
              <div class="form-group" :class="{ 'has-error': nameError }">
                <label>{{ omega.getMessage('options_renameProfileName') }}</label>
                <input v-model="newName" class="form-control" type="text"
                       @keydown.enter="submit()" autofocus />
                <span v-if="nameError" class="help-block">{{ nameError }}</span>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-default" @click="emit('close')">
                {{ omega.getMessage('dialog_cancel') }}
              </button>
              <button class="btn btn-primary" @click="submit()">
                {{ omega.getMessage('options_renameProfile') }}
              </button>
            </div>
          </div>
        </div>
      </div>
  </Teleport>
</template>
