<script setup lang="ts">
import { usePopupTarget } from '@/composables/usePopupTarget';
import { usePopupStore } from '@/stores/popup';

const target = usePopupTarget();
const store = usePopupStore();

async function openManage() {
  await target.openManage();
  store.closeWindow();
}
</script>

<template>
  <div class="om-dialog proxy-not-controllable">
    <p class="om-text-danger">
      {{
        target.getMessage('popup_proxyNotControllable_' + store.proxyNotControllable)
          || target.getMessage('popup_proxyNotControllable')
      }}
    </p>
    <p class="om-dialog-help">
      {{
        target.getMessage('popup_proxyNotControllableDetails_' + store.proxyNotControllable)
          || target.getMessage('popup_proxyNotControllableDetails')
      }}
    </p>
    <p class="om-dialog-controls">
      <button
        class="om-btn om-btn-default"
        @click="store.closeWindow()"
      >
        {{ target.getMessage('dialog_cancel') }}
      </button>
      <button
        class="om-btn om-btn-primary"
        @click="openManage()"
      >
        {{ target.getMessage('popup_proxyNotControllableManage') }}
      </button>
    </p>
  </div>
</template>
