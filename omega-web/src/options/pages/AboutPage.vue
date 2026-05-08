<script setup lang="ts">
import { ref } from 'vue';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOptionsStore } from '@/stores/options';
import ResetOptionsConfirmModal from '@/options/components/Modals/ResetOptionsConfirmModal.vue';

const omega = useOmegaTarget();
const optionsStore = useOptionsStore();
const showResetModal = ref(false);

const version = ref('2.5.x');

function downloadLog() {
  const log = localStorage['log'] || '';
  const blob = new Blob([log], { type: 'text/plain;charset=utf-8' });
  if ((window as any).saveAs) {
    (window as any).saveAs(blob, `OmegaLog_${Date.now()}.txt`);
  }
}

function reportIssue() {
  window.open('https://github.com/FelisCatus/SwitchyOmega/issues/new?title=&body=');
}

function resetOptions() {
  showResetModal.value = true;
}

function handleReset(opt?: any) {
  optionsStore.resetOptions(opt);
}
</script>

<template>
  <div class="omega-page">
    <h3>SwitchyOmega</h3>
    <p class="text-muted">{{ omega.getMessage('about_version') }} {{ version }}</p>
    <p>
      <button class="btn btn-default" @click="downloadLog()">
        {{ omega.getMessage('about_version') }}
      </button>
      <button class="btn btn-default" @click="reportIssue()">
        {{ omega.getMessage('about_help') }}
      </button>
      <button class="btn btn-danger" @click="resetOptions()">
        {{ omega.getMessage('options_reset') }}
      </button>
    </p>
    <p class="text-muted">{{ omega.getMessage('about_app_description') }}</p>

    <ResetOptionsConfirmModal
      v-if="showResetModal"
      @close="showResetModal = false"
      @confirm="handleReset($event)"
    />
  </div>
</template>
