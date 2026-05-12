<script setup lang="ts">
import { useOmegaTarget } from '@/composables/useOmegaTarget';

defineProps<{ profile: any; profileName: string }>();
const emit = defineEmits<{ close: []; confirm: [] }>();
const omega = useOmegaTarget();
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop fade in" />
    <div
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
              {{ omega.getMessage('options_deleteProfile') }}
            </h4>
          </div>
          <div class="modal-body">
            <p>{{ omega.getMessage('options_deleteProfileConfirm', [profileName]) }}</p>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-default"
              @click="emit('close')"
            >
              {{ omega.getMessage('dialog_cancel') }}
            </button>
            <button
              class="btn btn-danger"
              @click="emit('confirm')"
            >
              {{ omega.getMessage('options_deleteProfile') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
