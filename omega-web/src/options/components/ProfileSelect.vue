<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { computed, h } from 'vue';
import { NDropdown, NButton } from 'naive-ui';
import { useProfilesStore } from '@/stores/profiles';
import GlyphIcon from '@/components/GlyphIcon.vue';
import { useOptionsStore } from '@/stores/options';

const props = defineProps<{
  profiles: any[];
  modelValue: string;
  defaultText?: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const profilesStore = useProfilesStore();
const optionsStore = useOptionsStore();

function getIcon(profile: any): string {
  if (!profile) return 'question-sign';
  let target = profile;
  if (profile.profileType === 'VirtualProfile' && profile.defaultProfileName) {
    target = profilesStore.getVirtualTarget(profile, optionsStore.options);
  }
  return profilesStore.profileIcons[target?.profileType] || 'question-sign';
}

function getColor(profile: any): string {
  if (!profile) return '#aaa';
  let target = profile;
  if (profile.profileType === 'VirtualProfile' && profile.defaultProfileName) {
    target = profilesStore.getVirtualTarget(profile, optionsStore.options);
  }
  return target?.color ?? '#aaa';
}

function dispName(name: string): string {
  return $t(`profile_${name}`) || name;
}

const selectedProfile = computed(() =>
  props.profiles.find(x => x?.name === props.modelValue) ?? null,
);

const selectedLabel = computed(() => {
  if (selectedProfile.value) {
    return dispName(selectedProfile.value.name);
  }
  if (props.defaultText && !props.modelValue) {
    return props.defaultText;
  }
  return props.modelValue || '';
});

const dropdownOptions = computed(() => {
  const opts: Array<{
    key: string
    label: string
    icon: () => ReturnType<typeof h>
  }> = [];

  if (props.defaultText) {
    opts.push({
      key: '',
      label: props.defaultText,
      icon: () => h('span', { style: 'width: 1em; display: inline-block' }),
    });
  }

  for (const p of props.profiles) {
    opts.push({
      key: p.name,
      label: dispName(p.name),
      icon: () => h(GlyphIcon, { name: getIcon(p), color: getColor(p) }),
    });
  }
  return opts;
});

function handleSelect(key: string) {
  emit('update:modelValue', key);
}
</script>

<template>
  <NDropdown
    class="omega-profile-select"
    trigger="click"
    :options="dropdownOptions"
    @select="handleSelect"
  >
    <NButton block>
      <template #icon>
        <GlyphIcon
          :name="getIcon(selectedProfile)"
          :color="getColor(selectedProfile)"
        />
      </template>
      {{ selectedLabel }}
    </NButton>
  </NDropdown>
</template>
