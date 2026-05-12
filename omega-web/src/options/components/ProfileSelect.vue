<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useProfilesStore } from '@/stores/profiles';

const props = defineProps<{
  profiles: any[];
  modelValue: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const omega = useOmegaTarget();
const profilesStore = useProfilesStore();
const isOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);

function getIcon(profile: any): string {
  if (!profile) return 'glyphicon-question-sign';
  let target = profile;
  if (profile.profileType === 'VirtualProfile' && profile.defaultProfileName) {
    target = profilesStore.getVirtualTarget(profile, {});
  }
  return profilesStore.profileIcons[target?.profileType] || 'glyphicon-question-sign';
}

function getColor(profile: any): string {
  if (!profile) return '#aaa';
  let target = profile;
  if (profile.profileType === 'VirtualProfile' && profile.defaultProfileName) {
    target = profilesStore.getVirtualTarget(profile, {});
  }
  return target?.color ?? '#aaa';
}

function dispName(name: string): string {
  return omega.getMessage(`profile_${  name}`) || name;
}

const selectedProfile = computed(() =>
  props.profiles.find(x => x?.name === props.modelValue) ?? null,
);

const selectedLabel = computed(() =>
  selectedProfile.value ? dispName(selectedProfile.value.name) : (props.modelValue || ''),
);

function toggle(e: MouseEvent) {
  e.stopPropagation();
  isOpen.value = !isOpen.value;
}

function select(name: string) {
  emit('update:modelValue', name);
  isOpen.value = false;
}

// Close on click outside
function onDocumentClick(e: MouseEvent) {
  if (!isOpen.value) return;
  const root = rootRef.value;
  if (root && !root.contains(e.target as Node)) {
    isOpen.value = false;
  }
}

// Close on Escape
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true);
  document.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, true);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div
    ref="rootRef"
    class="dropdown omega-profile-select"
    :class="{ open: isOpen }"
  >
    <button
      class="btn btn-default dropdown-toggle"
      type="button"
      @click="toggle($event)"
    >
      <span
        :class="['glyphicon', getIcon(selectedProfile)]"
        :style="{ color: getColor(selectedProfile) }"
      />
      {{ selectedLabel }}
      <span class="caret" />
    </button>
    <ul
      v-if="isOpen"
      class="dropdown-menu"
      style="display: block;"
    >
      <li
        v-for="p in profiles"
        :key="p.name"
      >
        <a
          href="#"
          @click.prevent="select(p.name)"
        >
          <span
            :class="['glyphicon', getIcon(p)]"
            :style="{ color: getColor(p) }"
          />
          {{ dispName(p.name) }}
        </a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.dropdown-menu {
  max-height: 300px;
  overflow-y: auto;
}
</style>
