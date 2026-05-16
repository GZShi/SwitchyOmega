<script setup lang="ts">
import { NButton, NSpace } from 'naive-ui';
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
    <div class="om-dialog-controls">
      <NSpace justify="end">
        <NButton @click="store.closeWindow()">
          {{ target.getMessage('dialog_cancel') }}
        </NButton>
        <NButton type="primary" @click="openManage()">
          {{ target.getMessage('popup_proxyNotControllableManage') }}
        </NButton>
      </NSpace>
    </div>
  </div>
</template>
