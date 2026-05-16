<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { ref, onMounted } from 'vue';
import { NButton, NAlert, NCheckbox, NInput, NText } from 'naive-ui';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOptionsStore } from '@/stores/options';
import { useUiStore } from '@/stores/ui';
import GlyphIcon from '@/components/GlyphIcon.vue';

const omega = useOmegaTarget();
const optionsStore = useOptionsStore();
const uiStore = useUiStore();

const syncOptions = ref<string>('pristine');
const restoreOnlineUrl = ref<string>('');
const restoringLocal = ref(false);
const restoringOnline = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  try {
    const url = await omega.state('web.restoreOnlineUrl');
    if (url) restoreOnlineUrl.value = url;
  } catch (_) { /* ignore */ }

  try {
    const s = await omega.state('syncOptions');
    if (s) syncOptions.value = s;
  } catch (_) { /* ignore */ }
});

function showAlert(type: string, message: string) {
  uiStore.showAlert(type as any, message);
}

async function exportOptions() {
  try {
    if (optionsStore.optionsDirty) {
      const confirmed = window.confirm(
        $t('options_applyOptionsConfirm') || 'Do you want to save and apply the options?',
      );
      if (!confirmed) return;
      await optionsStore.applyOptions();
    }
    const plain = JSON.parse(JSON.stringify(optionsStore.options));
    const content = JSON.stringify(plain);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    (window as any).saveAs?.(blob, 'OmegaOptions.bak');
  } catch (_) { /* ignore */ }
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

async function restoreLocal(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  restoringLocal.value = true;
  try {
    const content = await file.text();
    await optionsStore.resetOptions(content);
    showAlert('success', $t('options_importSuccess') || 'Options imported.');
  } catch (_) {
    showAlert('error', $t('options_importFormatError') || 'Invalid backup file!');
  } finally {
    restoringLocal.value = false;
    input.value = '';
  }
}

async function restoreOnline() {
  omega.state('web.restoreOnlineUrl', restoreOnlineUrl.value);
  restoringOnline.value = true;
  let downloadSucceeded = false;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(restoreOnlineUrl.value, { signal: controller.signal });
    clearTimeout(tid);
    if (!resp.ok) {
      throw new Error();
    }
    const text = await resp.text();
    downloadSucceeded = true;
    await optionsStore.resetOptions(text);
    showAlert('success', $t('options_importSuccess') || 'Options imported.');
  } catch (_) {
    if (downloadSucceeded) {
      showAlert('error', $t('options_importFormatError') || 'Invalid backup file!');
    } else {
      showAlert('error', $t('options_importDownloadError') || 'Error downloading backup file!');
    }
  } finally {
    restoringOnline.value = false;
  }
}

async function enableOptionsSync(force = false) {
  try {
    if (!force && optionsStore.optionsDirty) {
      await optionsStore.applyOptions();
    }
    await omega.setOptionsSync(true, force ? { force: true } : undefined);
  } catch (e: any) {
    showAlert('error', e?.message ?? $t('options_syncEnableFailed'));
    return;
  }
  window.location.reload();
}

async function disableOptionsSync() {
  try {
    await omega.setOptionsSync(false);
  } catch (e: any) {
    showAlert('error', e?.message ?? $t('options_syncDisableFailed'));
    return;
  }
  window.location.reload();
}

async function resetOptionsSync() {
  try {
    await omega.resetOptionsSync();
  } catch (e: any) {
    showAlert('error', e?.message ?? $t('options_syncResetFailed'));
    return;
  }
  window.location.reload();
}
</script>

<template>
  <div>
    <div>
      <h2>{{ $t('options_tab_importExport') }}</h2>
    </div>

    <!-- Profile export help + legacy toggle -->
    <section class="settings-group">
      <h3>{{ $t('options_group_importExportProfile') }}</h3>
      <NText depth="3" style="font-size: 12px">
        <div style="color: #31708f;">
          <GlyphIcon name="info-sign" />
          {{ $t('options_exportProfileHelp') }}
        </div>
      </NText>
      <div
        v-if="!(optionsStore.options['-showConditionTypes'] > 0)"
      >
        <NCheckbox
          v-model:checked="optionsStore.options['-exportLegacyRuleList']"
          @update:checked="optionsStore.markDirty()"
        >
          {{ $t('options_exportLegacyRuleList') }}
        </NCheckbox>
        <NText depth="3" style="font-size: 12px">
          <span v-html="$t('options_exportLegacyRuleListHelp')" />
        </NText>
      </div>
    </section>

    <!-- Settings import/export -->
    <section class="settings-group">
      <h3>{{ $t('options_group_importExportSettings') }}</h3>

      <p>
        <NButton
          @click="exportOptions()"
        >
          <GlyphIcon name="floppy-save" />
          {{ $t('options_makeBackup') }}
        </NButton>
        <span style="margin-left: 10px; color: #595959;">{{ $t('options_makeBackupHelp') }}</span>
      </p>

      <p>
        <input
          id="restore-local-file"
          ref="fileInputRef"
          type="file"
          style="display: none;"
          @change="restoreLocal($event)"
        >
        <NButton
          :disabled="restoringLocal"
          @click="triggerFileInput()"
        >
          <GlyphIcon name="folder-open" />
          {{ $t('options_restoreLocal') }}
        </NButton>
        <span style="margin-left: 10px; color: #595959;">{{ $t('options_restoreLocalHelp') }}</span>
      </p>

      <div>
        <label>{{ $t('options_restoreOnline') }}</label>
        <div class="width-limit" style="display: flex; gap: 4px;">
          <NInput
            v-model:value="restoreOnlineUrl"
            :placeholder="$t('options_restoreOnlinePlaceholder')"
            style="flex: 1;"
          />
          <NButton
            :disabled="!restoreOnlineUrl || restoringOnline"
            @click="restoreOnline()"
          >
            {{ $t('options_restoreOnlineSubmit') }}
          </NButton>
        </div>
      </div>
    </section>

    <!-- Sync -->
    <section class="settings-group">
      <h3>{{ $t('options_group_syncing') }}</h3>

      <div v-if="syncOptions === 'pristine' || syncOptions === 'disabled'">
        <NText depth="3" style="font-size: 12px">
          <span v-html="$t('options_syncPristineHelp')" />
        </NText>
        <p>
          <NButton
            @click="enableOptionsSync()"
          >
            <GlyphIcon name="cloud-upload" />
            {{ $t('options_syncEnable') }}
          </NButton>
        </p>
      </div>

      <div v-if="syncOptions === 'sync'">
        <NAlert type="success" style="margin-bottom: 12px" class="width-limit">
          <GlyphIcon name="ok" />
          {{ $t('options_syncSyncAlert') }}
        </NAlert>
        <NText depth="3" style="font-size: 12px">
          <span v-html="$t('options_syncSyncHelp')" />
        </NText>
        <p>
          <NButton
            type="warning"
            @click="disableOptionsSync()"
          >
            <GlyphIcon name="remove-sign" />
            {{ $t('options_syncDisable') }}
          </NButton>
        </p>
      </div>

      <div v-if="syncOptions === 'conflict'">
        <NAlert type="info" style="margin-bottom: 12px" class="width-limit">
          <GlyphIcon name="info-sign" />
          {{ $t('options_syncConflictAlert') }}
        </NAlert>
        <NText depth="3" style="font-size: 12px">
          <span v-html="$t('options_syncConflictHelp')" />
        </NText>
        <p>
          <NButton
            type="error"
            @click="enableOptionsSync(true)"
          >
            <GlyphIcon name="cloud-download" />
            {{ $t('options_syncEnableForce') }}
          </NButton>
          <NButton
            text
            @click="resetOptionsSync()"
          >
            <GlyphIcon name="erase" />
            {{ $t('options_syncReset') }}
          </NButton>
        </p>
      </div>

      <div v-if="syncOptions === 'unsupported'">
        <NText depth="3" style="font-size: 12px">
          <span v-html="$t('options_syncUnsupportedHelp')" />
        </NText>
      </div>
    </section>
  </div>
</template>
