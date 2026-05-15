<script setup lang="ts">
import { ref } from 'vue';
import { useOptionsStore } from '@/stores/options';
import { getURL, getManifest, isFirefox } from '@/services/chrome';
import { readErrorLog } from '@/services/errorLog';
import ResetOptionsConfirmModal from '@/options/components/Modals/ResetOptionsConfirmModal.vue';

const optionsStore = useOptionsStore();
const showResetModal = ref(false);

const version = getManifest()?.version ?? '?.?.?';

const isExperimental = isFirefox;

const appIconUrl = getURL('img/icons/omega-action-32.png');

function downloadLog() {
  const log = readErrorLog();
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
    <h3>{{ $t('about_title') }}</h3>

    <section
      v-if="isExperimental"
      class="omega-experimental"
    >
      <p class="alert alert-warning">
        <span class="glyphicon glyphicon-warning-sign" />
        <span>{{ $t('about_experimental_warning_moz') }}</span>
      </p>
    </section>

    <section>
      <div
        class="media"
        style="margin: 1em 0"
      >
        <div class="media-left">
          <img
            class="media-object"
            :src="appIconUrl"
          >
        </div>
        <div class="media-body">
          <h4 class="media-heading">
            {{ $t('appNameShort') }}
          </h4>
          <p>{{ $t('about_app_description') }}</p>
        </div>
      </div>
    </section>

    <section>
      <p>
        <button
          class="btn btn-info"
          @click="reportIssue()"
        >
          <span class="glyphicon glyphicon-comment" />
          {{ $t('popup_reportIssues') }}
        </button>
        <button
          class="btn btn-default"
          @click="downloadLog()"
        >
          <span class="glyphicon glyphicon-download" />
          {{ $t('popup_errorLog') }}
        </button>
        <button
          class="btn btn-danger"
          @click="resetOptions()"
        >
          <span class="glyphicon glyphicon-alert" />
          {{ $t('options_reset') }}
        </button>
      </p>
    </section>

    <section>
      <p>{{ $t('about_version', [version]) }}</p>

      <p class="text-warning">
        <span class="glyphicon glyphicon-info-sign" />
        <span v-html="$t('about_disclaimer_networkService')" />
      </p>
      <p class="text-success">
        <span class="glyphicon glyphicon-eye-close" />
        <span v-html="$t('about_disclaimer_privacy')" />
      </p>
      <p class="text-info">
        <span class="glyphicon glyphicon-question-sign" />
        <span v-html="$t('about_help')" />
      </p>
    </section>

    <section style="margin-top: 7em">
      <p>
        {{ $t('appNameShort') }}<br>
        <span v-html="$t('about_copyright')" /><br>
        <span v-html="$t('about_license')" /><br>
        <span v-html="$t('about_credits')" />
      </p>
    </section>

    <ResetOptionsConfirmModal
      v-if="showResetModal"
      @close="showResetModal = false"
      @confirm="handleReset($event)"
    />
  </div>
</template>
