<script setup lang="ts">
import { useOmegaTarget } from '@/composables/useOmegaTarget';

defineProps<{ refs: any[]; profileName: string }>();
const emit = defineEmits<{ close: [] }>();
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
              {{ omega.getMessage('options_modalHeader_cannotDeleteProfile') }}
            </h4>
          </div>
          <div class="modal-body">
            <p>{{ omega.getMessage('options_profileReferredBy') }}</p>
            <ul>
              <li
                v-for="r in refs"
                :key="r?.name"
              >
                {{ r?.name || 'unknown' }}
              </li>
            </ul>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-primary"
              @click="emit('close')"
            >
              {{ omega.getMessage('dialog_ok') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
