<script setup lang="ts">
import { ref } from 'vue';
import { NButton, NAlert } from 'naive-ui';
import { useOptionsStore } from '@/stores/options';
import { getURL, getManifest, isFirefox } from '@/services/chrome';
import { readErrorLog } from '@/services/errorLog';
import ResetOptionsConfirmModal from '@/options/components/Modals/ResetOptionsConfirmModal.vue';
import GlyphIcon from '@/components/GlyphIcon.vue';

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
      <NAlert type="warning" style="margin-bottom: 12px">
        <GlyphIcon name="warning-sign" />
        <span>{{ $t('about_experimental_warning_moz') }}</span>
      </NAlert>
    </section>

    <section>
      <div style="display: flex; gap: 16px; margin: 1em 0;">
        <div style="flex-shrink: 0;">
          <img
            :src="appIconUrl"
            style="width: 64px; height: 64px;"
          >
        </div>
        <div>
          <h4 style="margin-top: 0;">
            {{ $t('appNameShort') }}
          </h4>
          <p>{{ $t('about_app_description') }}</p>
        </div>
      </div>
    </section>

    <section>
      <p>
        <NButton
          type="info"
          @click="reportIssue()"
        >
          <GlyphIcon name="comment" />
          {{ $t('popup_reportIssues') }}
        </NButton>
        <NButton
          @click="downloadLog()"
        >
          <GlyphIcon name="download" />
          {{ $t('popup_errorLog') }}
        </NButton>
        <NButton
          type="error"
          @click="resetOptions()"
        >
          <GlyphIcon name="alert" />
          {{ $t('options_reset') }}
        </NButton>
      </p>
    </section>

    <section>
      <p>{{ $t('about_version', [version]) }}</p>

      <p style="color: #8a6d3b">
        <GlyphIcon name="info-sign" />
        <span v-html="$t('about_disclaimer_networkService')" />
      </p>
      <p style="color: #3c763d">
        <GlyphIcon name="eye-close" />
        <span v-html="$t('about_disclaimer_privacy')" />
      </p>
      <p style="color: #31708f">
        <GlyphIcon name="question-sign" />
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
