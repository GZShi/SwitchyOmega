<script setup lang="ts">

const emit = defineEmits<{ close: []; confirm: [] }>();
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
              {{ $t('options_modalHeader_applyOptions') }}
            </h4>
          </div>
          <div class="modal-body">
            <p>{{ $t('options_applyOptionsConfirm') }}</p>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-default"
              @click="emit('close')"
            >
              {{ $t('dialog_cancel') }}
            </button>
            <button
              class="btn btn-primary"
              @click="emit('confirm')"
            >
              {{ $t('options_apply') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
