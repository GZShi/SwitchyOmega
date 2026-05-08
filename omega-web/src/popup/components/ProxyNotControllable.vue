<script setup lang="ts">
import { usePopupTarget } from '@/composables/usePopupTarget';
import { usePopupStore } from '@/stores/popup';

const target = usePopupTarget();
const store = usePopupStore();

function openManage() {
  target.openManage().then(() => store.closeWindow());
}
</script>

<template>
  <div class="om-dialog">
    <p class="om-text-danger">
      {{ target.getMessage('popup_proxyNotControllable') }}
    </p>
    <p class="om-dialog-help">
      {{ target.getMessage('popup_proxyNotControllableDetails') }}
    </p>
    <p class="om-dialog-controls">
      <button class="om-btn om-btn-default" @click="store.closeWindow()">
        {{ target.getMessage('popup_close') }}
      </button>
      <button class="om-btn om-btn-link" @click="openManage()">
        {{ target.getMessage('popup_learnMore') }}
      </button>
      <button class="om-btn om-btn-primary" @click="openManage()">
        {{ target.getMessage('popup_manageExt') }}
      </button>
    </p>
  </div>
</template>
