<script setup lang="ts">
import { useOmegaTarget } from '@/composables/useOmegaTarget';

const props = defineProps<{ isUpgrade: boolean }>();
const emit = defineEmits<{ close: [result: string] }>();
const omega = useOmegaTarget();
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop fade in opacity-half" />
    <div
      class="modal fade in"
      style="display: block;"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h4 class="modal-title">
              {{ props.isUpgrade
                ? omega.getMessage('options_welcomeUpgrade')
                : omega.getMessage('options_modalHeader_welcome') }}
            </h4>
          </div>
          <div class="modal-body">
            <p v-if="props.isUpgrade">
              {{ omega.getMessage('options_welcomeUpgradeGuide') }}
            </p>
            <p v-else>
              {{ omega.getMessage('options_welcomeNormal') }}
            </p>
            <p>{{ omega.getMessage('options_welcomeNormalGuide') }}</p>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-default"
              @click="emit('close', 'later')"
            >
              {{ omega.getMessage('dialog_cancel') }}
            </button>
            <button
              class="btn btn-primary"
              @click="emit('close', 'show')"
            >
              {{ omega.getMessage('dialog_ok') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
