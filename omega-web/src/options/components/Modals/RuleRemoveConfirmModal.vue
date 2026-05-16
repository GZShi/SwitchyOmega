<script setup lang="ts">
import { computed } from 'vue';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import { getMessage as $t } from '@/services/chrome/i18n';
import AppModal from '@/options/components/AppModal.vue';
import GlyphIcon from '@/components/GlyphIcon.vue';
import { NButton, NSpace, NTag } from 'naive-ui';

const props = defineProps<{
  rule: { condition: { conditionType: string; pattern: string }; profileName: string } | null;
}>();
const emit = defineEmits<{ close: []; confirm: [] }>();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();

const targetProfileDisplay = computed(() => {
  if (!props.rule) return { name: '', icon: '', color: '' };
  const p = optionsStore.profileByName(props.rule.profileName);
  if (!p) return { name: props.rule.profileName, icon: 'glyphicon-question-sign', color: '#aaa' };
  const target = profilesStore.getVirtualTarget(p, optionsStore.options);
  const icon = (profilesStore.profileIcons)[target?.profileType ?? ''] || 'glyphicon-question-sign';
  return { name: $t(`profile_${p.name}`) || p.name, icon, color: target?.color ?? '#aaa' };
});

const conditionTypeLabel = computed(() => {
  if (!props.rule) return '';
  return $t(`condition_${props.rule.condition.conditionType}`) || props.rule.condition.conditionType;
});
</script>

<template>
  <AppModal
    :title="$t('options_modalHeader_deleteRule')"
    @close="emit('close')"
  >
    <p>{{ $t('options_deleteRuleConfirm') }}</p>
    <div v-if="rule" style="background:#f5f5f5;border:1px solid #e3e3e3;padding:12px;border-radius:4px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
      <span>
        <NTag type="info" size="small">{{ conditionTypeLabel }}</NTag>
        {{ rule.condition.pattern }}
      </span>
      <span>
        <GlyphIcon
          v-if="targetProfileDisplay"
          :name="targetProfileDisplay.icon"
          :color="targetProfileDisplay.color"
        />
        {{ targetProfileDisplay.name || rule.profileName }}
      </span>
    </div>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="emit('close')">
          {{ $t('dialog_cancel') }}
        </NButton>
        <NButton type="error" @click="emit('confirm')">
          {{ $t('options_deleteRule') }}
        </NButton>
      </NSpace>
    </template>
  </AppModal>
</template>
