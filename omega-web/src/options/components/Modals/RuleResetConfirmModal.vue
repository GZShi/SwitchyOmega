<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { computed } from 'vue';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import AppModal from '@/options/components/AppModal.vue';
import GlyphIcon from '@/components/GlyphIcon.vue';
import { NButton, NSpace } from 'naive-ui';

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
  <AppModal
    :title="$t('options_modalHeader_resetRules')"
    @close="emit('close')"
  >
    <p>{{ $t('options_resetRulesConfirm') }}</p>
    <div style="background:#f5f5f5;border:1px solid #e3e3e3;padding:12px;border-radius:4px">
      <GlyphIcon
        v-if="targetProfileDisplay"
        :name="targetProfileDisplay.icon"
        :color="targetProfileDisplay.color"
      />
      {{ targetProfileDisplay?.name ?? defaultProfileName }}
    </div>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="emit('close')">
          {{ $t('dialog_cancel') }}
        </NButton>
        <NButton type="warning" @click="emit('confirm')">
          {{ $t('options_resetRules') }}
        </NButton>
      </NSpace>
    </template>
  </AppModal>
</template>
