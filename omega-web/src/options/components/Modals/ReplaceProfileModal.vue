<script setup lang="ts">
import { ref, computed } from 'vue';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import ProfileSelect from '@/options/components/ProfileSelect.vue';

const props = defineProps<{
  fromName: string; // The profile whose references will be replaced
  toName: string;   // Replace references that currently point to fromName
}>();
const emit = defineEmits<{
  close: [];
  confirm: [from: string, to: string];
}>();

const omega = useOmegaTarget();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();

const fromValue = ref(props.fromName);
const toValue = ref(props.toName);

const validFromProfiles = computed(() => {
  const profiles: any[] = [];
  for (const key of Object.keys(optionsStore.options)) {
    if (key.startsWith('+')) {
      const p = optionsStore.options[key];
      if (!profilesStore.isProfileNameReserved(p.name)) profiles.push(p);
    }
  }
  const builtins = profilesStore.builtinProfiles;
  for (const key of Object.keys(builtins)) profiles.push(builtins[key]);
  return profiles;
});

const validToProfiles = computed(() =>
  validFromProfiles.value.filter((p: any) => p.name !== fromValue.value),
);

function submit() {
  emit('confirm', fromValue.value, toValue.value);
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop fade in" />
    <div
      class="modal fade in"
      style="display: block;"
      @keydown.esc="emit('close')"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <form @submit.prevent="submit">
            <div class="modal-header">
              <button
                type="button"
                class="close"
                @click="emit('close')"
              >
                &times;
              </button>
              <h4 class="modal-title">
                {{ omega.getMessage('options_modalHeader_replaceProfile') }}
              </h4>
            </div>
            <div class="modal-body">
              <p>{{ omega.getMessage('options_replaceProfileHelp') }}</p>
              <div class="form-group">
                <label>
                  {{ omega.getMessage('options_replaceProfileConfirm', ['__FROM__', '__TO__']).split('__FROM__')[0] }}
                </label>
                <ProfileSelect
                  style="display: inline-block;"
                  :profiles="validFromProfiles"
                  :model-value="fromValue"
                  @update:model-value="fromValue = $event"
                />
              </div>
              <div class="form-group">
                <label>→</label>
                <ProfileSelect
                  style="display: inline-block;"
                  :profiles="validToProfiles"
                  :model-value="toValue"
                  @update:model-value="toValue = $event"
                />
              </div>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-default"
                @click="emit('close')"
              >
                {{ omega.getMessage('dialog_cancel') }}
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="!fromValue || !toValue || fromValue === toValue"
              >
                {{ omega.getMessage('dialog_ok') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>
