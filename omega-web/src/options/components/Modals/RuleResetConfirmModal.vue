<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { computed } from 'vue';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';

const props = defineProps<{
  show: boolean;
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
    name: $t(`profile_${  p.name}`) || p.name,
    icon: profilesStore.profileIcons[target?.profileType] || 'glyphicon-question-sign',
    color: target?.color ?? '#aaa',
  };
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal-backdrop fade in"
    />
    <div
      v-if="show"
      class="modal fade in"
      style="display: block;"
      @keydown.esc="emit('close')"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <button
              type="button"
              class="close"
              @click="emit('close')"
            >
              &times;
            </button>
            <h4 class="modal-title">
              {{ $t('options_modalHeader_resetRules') }}
            </h4>
          </div>
          <div class="modal-body">
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
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-default"
              @click="emit('close')"
            >
              {{ $t('dialog_cancel') }}
            </button>
            <button
              class="btn btn-warning"
              @click="emit('confirm')"
            >
              {{ $t('options_resetRules') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
