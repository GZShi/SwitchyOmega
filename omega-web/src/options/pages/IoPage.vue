<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOptionsStore } from '@/stores/options';

const omega = useOmegaTarget();
const optionsStore = useOptionsStore();

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
  const ui = (window as any).__omegaUi;
  ui?.showAlert?.(type, message);
}

async function exportOptions() {
  try {
    if (optionsStore.optionsDirty) {
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
    showAlert('success', omega.getMessage('options_importSuccess') || 'Options imported.');
  } catch (_) {
    showAlert('error', omega.getMessage('options_importFormatError') || 'Invalid backup file!');
  } finally {
    restoringLocal.value = false;
    input.value = '';
  }
}

async function restoreOnline() {
  omega.state('web.restoreOnlineUrl', restoreOnlineUrl.value);
  restoringOnline.value = true;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(restoreOnlineUrl.value, { signal: controller.signal });
    clearTimeout(tid);
    const text = await resp.text();
    await optionsStore.resetOptions(text);
    showAlert('success', omega.getMessage('options_importSuccess') || 'Options imported.');
  } catch (_) {
    showAlert('error', omega.getMessage('options_importDownloadError') || 'Error downloading backup file!');
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
  } catch (_) { /* ignore */ }
  finally { window.location.reload(); }
}

async function disableOptionsSync() {
  try {
    await omega.setOptionsSync(false);
  } catch (_) { /* ignore */ }
  finally { window.location.reload(); }
}

async function resetOptionsSync() {
  try {
    await omega.resetOptionsSync();
  } catch (_) { /* ignore */ }
  finally { window.location.reload(); }
}
</script>

<template>
  <div>
    <div
      class="page-header"
      style="position: static; background: none; max-height: none; padding: 0 0 10px 0; margin: 0 0 20px 0; border-bottom: 1px solid #eee;"
    >
      <h2>{{ omega.getMessage('options_tab_importExport') }}</h2>
    </div>

    <!-- Profile export help + legacy toggle -->
    <section class="settings-group">
      <h3>{{ omega.getMessage('options_group_importExportProfile') }}</h3>
      <div class="help-block">
        <div class="text-info">
          <span class="glyphicon glyphicon-info-sign" />
          {{ omega.getMessage('options_exportProfileHelp') }}
        </div>
      </div>
      <div
        v-if="!(optionsStore.options['-showConditionTypes'] > 0)"
        class="checkbox"
      >
        <label>
          <input
            v-model="optionsStore.options['-exportLegacyRuleList']"
            type="checkbox"
            @change="optionsStore.markDirty()"
          >
          <span>{{ omega.getMessage('options_exportLegacyRuleList') }}</span>
        </label>
        <p
          class="help-block"
          v-html="omega.getMessage('options_exportLegacyRuleListHelp')"
        />
      </div>
    </section>

    <!-- Settings import/export -->
    <section class="settings-group">
      <h3>{{ omega.getMessage('options_group_importExportSettings') }}</h3>

      <p>
        <button
          class="btn btn-default"
          @click="exportOptions()"
        >
          <span class="glyphicon glyphicon-floppy-save" />
          {{ omega.getMessage('options_makeBackup') }}
        </button>
        <span class="help-inline">{{ omega.getMessage('options_makeBackupHelp') }}</span>
      </p>

      <p>
        <input
          id="restore-local-file"
          ref="fileInputRef"
          type="file"
          style="display: none;"
          @change="restoreLocal($event)"
        >
        <button
          class="btn btn-default"
          :disabled="restoringLocal"
          @click="triggerFileInput()"
        >
          <span class="glyphicon glyphicon-folder-open" />
          {{ omega.getMessage('options_restoreLocal') }}
        </button>
        <span class="help-inline">{{ omega.getMessage('options_restoreLocalHelp') }}</span>
      </p>

      <div>
        <label>{{ omega.getMessage('options_restoreOnline') }}</label>
        <div class="input-group width-limit">
          <input
            v-model="restoreOnlineUrl"
            class="form-control"
            type="url"
            :placeholder="omega.getMessage('options_restoreOnlinePlaceholder')"
          >
          <span class="input-group-btn">
            <button
              class="btn btn-default"
              :disabled="!restoreOnlineUrl || restoringOnline"
              @click="restoreOnline()"
            >
              {{ omega.getMessage('options_restoreOnlineSubmit') }}
            </button>
          </span>
        </div>
      </div>
    </section>

    <!-- Sync -->
    <section class="settings-group">
      <h3>{{ omega.getMessage('options_group_syncing') }}</h3>

      <div v-if="syncOptions === 'pristine' || syncOptions === 'disabled'">
        <p
          class="help-block"
          v-html="omega.getMessage('options_syncPristineHelp')"
        />
        <p>
          <button
            class="btn btn-default"
            @click="enableOptionsSync()"
          >
            <span class="glyphicon glyphicon-cloud-upload" />
            {{ omega.getMessage('options_syncEnable') }}
          </button>
        </p>
      </div>

      <div v-if="syncOptions === 'sync'">
        <p class="alert alert-success width-limit">
          <span class="glyphicon glyphicon-ok" />
          {{ omega.getMessage('options_syncSyncAlert') }}
        </p>
        <p
          class="help-block"
          v-html="omega.getMessage('options_syncSyncHelp')"
        />
        <p>
          <button
            class="btn btn-warning"
            @click="disableOptionsSync()"
          >
            <span class="glyphicon glyphicon-remove-sign" />
            {{ omega.getMessage('options_syncDisable') }}
          </button>
        </p>
      </div>

      <div v-if="syncOptions === 'conflict'">
        <p class="alert alert-info width-limit">
          <span class="glyphicon glyphicon-info-sign" />
          {{ omega.getMessage('options_syncConflictAlert') }}
        </p>
        <p
          class="help-block"
          v-html="omega.getMessage('options_syncConflictHelp')"
        />
        <p>
          <button
            class="btn btn-danger"
            @click="enableOptionsSync(true)"
          >
            <span class="glyphicon glyphicon-cloud-download" />
            {{ omega.getMessage('options_syncEnableForce') }}
          </button>
          <button
            class="btn btn-link"
            @click="resetOptionsSync()"
          >
            <span class="glyphicon glyphicon-erase" />
            {{ omega.getMessage('options_syncReset') }}
          </button>
        </p>
      </div>

      <div v-if="syncOptions === 'unsupported'">
        <p
          class="help-block"
          v-html="omega.getMessage('options_syncUnsupportedHelp')"
        />
      </div>
    </section>
  </div>
</template>
