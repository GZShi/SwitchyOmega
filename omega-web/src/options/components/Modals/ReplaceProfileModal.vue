<script setup lang="ts">
import { ref, computed } from 'vue';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import AppModal from '@/options/components/AppModal.vue';
import ProfileSelect from '@/options/components/ProfileSelect.vue';
import ProfileInline from '@/options/components/ProfileInline.vue';
import GlyphIcon from '@/components/GlyphIcon.vue';
import { NButton, NSpace } from 'naive-ui';

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
  <AppModal
    :title="$t('options_modalHeader_replaceProfile')"
    @close="emit('close')"
  >
    <form @submit.prevent="submit">
      <p>{{ $t('options_replaceProfileHelp') }}</p>
      <div style="background:#f5f5f5;border:1px solid #e3e3e3;padding:12px;border-radius:4px">
        <ProfileInline v-if="fromProfile" :profile="fromProfile" />
        <GlyphIcon name="chevron-right" />
        <ProfileInline v-if="toProfile" :profile="toProfile" />
      </div>
      <div>
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
      <div>
        <label for="replace-to-profile">&rarr;</label>
        <ProfileSelect
          id="replace-to-profile"
          style="display: inline-block;"
          :profiles="validToProfiles"
          :model-value="toValue"
          @update:model-value="toValue = $event"
        />
      </div>
      <NSpace justify="end" style="margin-top: 16px;">
        <NButton @click="emit('close')">
          {{ $t('dialog_cancel') }}
        </NButton>
        <NButton
          type="primary"
          :disabled="!fromValue || !toValue || fromValue === toValue"
          @click="submit"
        >
          {{ $t('dialog_ok') }}
        </NButton>
      </NSpace>
    </form>
  </AppModal>
</template>
