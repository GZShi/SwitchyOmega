<script setup lang="ts">
import { computed } from 'vue';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import { getMessage as $t } from '@/services/chrome/i18n';
import BaseModal from '@/options/components/BaseModal.vue';

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
  <BaseModal
    :title="$t('options_modalHeader_deleteRule')"
    @close="emit('close')"
  >
    <p>{{ $t('options_deleteRuleConfirm') }}</p>
    <div v-if="rule" class="well">
      <span class="label label-info">{{ conditionTypeLabel }}</span>
      {{ rule.condition.pattern }}
      <span class="pull-right">
        <span
          v-if="targetProfileDisplay"
          class="glyphicon"
          :class="[targetProfileDisplay.icon]"
          :style="{ color: targetProfileDisplay.color }"
        />
        {{ targetProfileDisplay.name || rule.profileName }}
      </span>
    </div>
    <template #footer>
      <button class="btn btn-default" @click="emit('close')">
        {{ $t('dialog_cancel') }}
      </button>
      <button class="btn btn-danger" @click="emit('confirm')">
        {{ $t('options_deleteRule') }}
      </button>
    </template>
  </BaseModal>
</template>
