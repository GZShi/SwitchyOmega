<script setup lang="ts">
import { ref, computed } from 'vue';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import BaseModal from '@/options/components/BaseModal.vue';
import ProfileSelect from '@/options/components/ProfileSelect.vue';
import ProfileInline from '@/options/components/ProfileInline.vue';

const props = defineProps<{
  fromName: string;
  toName: string;
}>();
const emit = defineEmits<{
  close: [];
  confirm: [from: string, to: string];
}>();

const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();

const fromValue = ref(props.fromName);
const toValue = ref(props.toName);

const validFromProfiles = computed(() => profilesStore.selectableProfiles);

const validToProfiles = computed(() =>
  validFromProfiles.value.filter((p: any) => p.name !== fromValue.value),
);

const fromProfile = computed(() => profilesStore.profileByName(fromValue.value));
const toProfile = computed(() => profilesStore.profileByName(toValue.value));

function submit() {
  emit('confirm', fromValue.value, toValue.value);
  emit('close');
}
</script>

<template>
  <BaseModal
    :title="$t('options_modalHeader_replaceProfile')"
    @close="emit('close')"
  >
    <form @submit.prevent="submit">
      <p>{{ $t('options_replaceProfileHelp') }}</p>
      <div class="well">
        <ProfileInline v-if="fromProfile" :profile="fromProfile" />
        <span class="glyphicon glyphicon-chevron-right" />
        <ProfileInline v-if="toProfile" :profile="toProfile" />
      </div>
      <div class="form-group">
        <label for="replace-from-profile">
          {{ $t('options_replaceProfileConfirm', ['__FROM__', '__TO__']).split('__FROM__')[0] }}
        </label>
        <ProfileSelect
          id="replace-from-profile"
          style="display: inline-block;"
          :profiles="validFromProfiles"
          :model-value="fromValue"
          @update:model-value="fromValue = $event"
        />
      </div>
      <div class="form-group">
        <label for="replace-to-profile">→</label>
        <ProfileSelect
          id="replace-to-profile"
          style="display: inline-block;"
          :profiles="validToProfiles"
          :model-value="toValue"
          @update:model-value="toValue = $event"
        />
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" @click="emit('close')">
          {{ $t('dialog_cancel') }}
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="!fromValue || !toValue || fromValue === toValue"
        >
          {{ $t('dialog_ok') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>
