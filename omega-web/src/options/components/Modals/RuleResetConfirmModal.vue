<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { computed } from 'vue';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import BaseModal from '@/options/components/BaseModal.vue';

const props = defineProps<{
  defaultProfileName: string;
}>();
const emit = defineEmits<{ close: []; confirm: [] }>();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();

const targetProfileDisplay = computed(() => {
  if (!props.defaultProfileName) return null;
  const p = optionsStore.profileByName(props.defaultProfileName);
  if (!p) return { name: props.defaultProfileName, icon: 'glyphicon-question-sign', color: '#aaa' };
  const target = profilesStore.getVirtualTarget(p, optionsStore.options);
  return {
    name: $t(`profile_${p.name}`) || p.name,
    icon: profilesStore.profileIcons[target?.profileType] || 'glyphicon-question-sign',
    color: target?.color ?? '#aaa',
  };
});
</script>

<template>
  <BaseModal
    :title="$t('options_modalHeader_resetRules')"
    @close="emit('close')"
  >
    <p>{{ $t('options_resetRulesConfirm') }}</p>
    <div class="well">
      <span
        v-if="targetProfileDisplay"
        class="glyphicon"
        :class="[targetProfileDisplay.icon]"
        :style="{ color: targetProfileDisplay.color }"
      />
      {{ targetProfileDisplay?.name ?? defaultProfileName }}
    </div>
    <template #footer>
      <button class="btn btn-default" @click="emit('close')">
        {{ $t('dialog_cancel') }}
      </button>
      <button class="btn btn-warning" @click="emit('confirm')">
        {{ $t('options_resetRules') }}
      </button>
    </template>
  </BaseModal>
</template>
