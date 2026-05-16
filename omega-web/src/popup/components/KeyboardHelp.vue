<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
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
</script>

<template>
  <div class="om-keyboard-help-overlay" @click.self="emit('close')">
    <div class="om-keyboard-help-panel">
      <div class="om-keyboard-help-header">
        <h3>Keyboard Shortcuts</h3>
        <button class="om-keyboard-help-close" @click="emit('close')">&times;</button>
      </div>
      <div class="om-keyboard-help-body">
        <table class="om-keyboard-help-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(key, id) in MENU_KEY_LABELS" :key="id">
              <td><kbd>{{ key }}</kbd></td>
              <td>{{ id }}</td>
            </tr>
            <tr>
              <td><kbd>1</kbd>&ndash;<kbd>9</kbd></td>
              <td>Switch to custom profile</td>
            </tr>
            <tr class="om-keyboard-help-divider">
              <td colspan="2">Navigation</td>
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
        </table>
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
  max-width: 340px;
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

.om-keyboard-help-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  color: #666;
}

.om-keyboard-help-close:hover {
  color: #000;
}

.om-keyboard-help-body {
  padding: 12px 16px;
}

.om-keyboard-help-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.om-keyboard-help-table th {
  text-align: left;
  padding: 4px 8px;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 600;
  color: #666;
}

.om-keyboard-help-table td {
  padding: 4px 8px;
}

.om-keyboard-help-divider td {
  padding-top: 12px;
  font-weight: 600;
  color: #666;
  font-size: 12px;
  text-transform: uppercase;
}

.om-keyboard-help-table kbd {
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
