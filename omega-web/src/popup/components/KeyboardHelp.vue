<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { NTable, NButton } from 'naive-ui';
import { MENU_KEY_LABELS } from '@/popup/constants/keymap';

const emit = defineEmits<{
  close: [];
}>();

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
});

const shortcutRows = Object.entries(MENU_KEY_LABELS).map(([id, key]) => ({
  key: id,
  label: `Switch to ${id.replace('js-', '').replace('profile-', 'profile ')}`,
}));
</script>

<template>
  <div class="om-keyboard-help-overlay" @click.self="emit('close')">
    <div class="om-keyboard-help-panel">
      <div class="om-keyboard-help-header">
        <h3>Keyboard Shortcuts</h3>
        <NButton text @click="emit('close')">
          &times;
        </NButton>
      </div>
      <div class="om-keyboard-help-body">
        <NTable size="small" :single-line="false">
          <thead>
            <tr>
              <th>Key</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(label, id) in MENU_KEY_LABELS" :key="id">
              <td><kbd>{{ label }}</kbd></td>
              <td>{{ id }}</td>
            </tr>
            <tr>
              <td><kbd>1</kbd>&ndash;<kbd>9</kbd></td>
              <td>Switch to custom profile</td>
            </tr>
            <tr>
              <td colspan="2" class="om-keyboard-help-divider">Navigation</td>
            </tr>
            <tr>
              <td><kbd>j</kbd> / <kbd>&darr;</kbd></td>
              <td>Move down</td>
            </tr>
            <tr>
              <td><kbd>k</kbd> / <kbd>&uarr;</kbd></td>
              <td>Move up</td>
            </tr>
            <tr>
              <td><kbd>/</kbd> / <kbd>?</kbd></td>
              <td>Toggle this help</td>
            </tr>
            <tr>
              <td><kbd>Esc</kbd></td>
              <td>Close overlay</td>
            </tr>
          </tbody>
        </NTable>
      </div>
    </div>
  </div>
</template>

<style scoped>
.om-keyboard-help-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.om-keyboard-help-panel {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  max-width: 380px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.om-keyboard-help-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.om-keyboard-help-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.om-keyboard-help-body {
  padding: 12px 16px;
}

.om-keyboard-help-divider {
  padding-top: 12px !important;
  font-weight: 600;
  color: #666;
  font-size: 12px;
  text-transform: uppercase;
}

.om-keyboard-help-body :deep(kbd) {
  font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
  border: solid 1px #aaa;
  border-radius: 2px;
  display: inline-block;
  padding: 0 4px;
  font-size: 12px;
  box-shadow: 1px 1px #aaa;
  background: #f7f7f7;
  min-width: 1.4em;
  text-align: center;
}
</style>
