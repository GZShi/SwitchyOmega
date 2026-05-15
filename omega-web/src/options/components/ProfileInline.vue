<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { computed } from 'vue';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';

const props = defineProps<{
  // Either a profile object OR a name (resolved from options)
  name?: string;
  profile?: any;
}>();

const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();

const resolved = computed(() => {
  if (props.profile) return props.profile;
  if (props.name) return optionsStore.profileByName(props.name);
  return null;
});

const target = computed(() => {
  const p = resolved.value;
  if (!p) return null;
  if (p.profileType === 'VirtualProfile' && p.defaultProfileName) {
    return profilesStore.getVirtualTarget(p, optionsStore.options);
  }
  return p;
});

const icon = computed(() =>
  profilesStore.profileIcons[target.value?.profileType] || 'glyphicon-question-sign',
);

const color = computed(() => target.value?.color ?? '#aaa');

const isVirtual = computed(() => resolved.value?.profileType === 'VirtualProfile');

const displayName = computed(() => {
  const name = resolved.value?.name ?? props.name ?? '';
  return $t(`profile_${  name}`) || name;
});
</script>

<template>
  <span class="profile-inline">
    <span
      class="glyphicon"
      :class="[icon, { 'virtual-profile-icon': isVirtual }]"
      :style="{ color }"
    />
    {{ displayName }}
  </span>
</template>
