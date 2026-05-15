<script setup lang="ts">

const props = defineProps<{ isUpgrade: boolean }>();
const emit = defineEmits<{ close: [result: string] }>();
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
                ? $t('options_welcomeUpgrade')
                : $t('options_modalHeader_welcome') }}
            </h4>
          </div>
          <div class="modal-body">
            <p v-if="props.isUpgrade">
              {{ $t('options_welcomeUpgradeGuide') }}
            </p>
            <p v-else>
              {{ $t('options_welcomeNormal') }}
            </p>
            <p>{{ $t('options_welcomeNormalGuide') }}</p>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-default"
              @click="emit('close', 'later')"
            >
              {{ $t('dialog_cancel') }}
            </button>
            <button
              class="btn btn-primary"
              @click="emit('close', 'show')"
            >
              {{ $t('dialog_ok') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
