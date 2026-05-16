<script setup lang="ts">
import { onMounted } from 'vue';
import { useEventListener } from '@vueuse/core';
import { usePopupStore } from '@/stores/popup';
import PopupMenuNav from './PopupMenuNav.vue';
import ConditionForm from './ConditionForm.vue';
import RequestInfoDetails from './RequestInfoDetails.vue';
import ProxyNotControllable from './ProxyNotControllable.vue';
import KeyboardHelp from './KeyboardHelp.vue';

const store = usePopupStore();

// -- Keyboard shortcuts --
const shortcutKeys: Record<string, string | ((items: HTMLElement[], i: number) => void)> = {
  ArrowUp: 'moveUp',
  ArrowDown: 'moveDown',
  j: 'moveDown',
  k: 'moveUp',
  '0': '#js-direct',
  s: '#js-system',
  '/': 'help',
  '?': 'help',
  e: '#js-external',
  a: '#js-addrule',
  '=': '#js-addrule',
  t: '#js-temprule',
  o: '#js-option',
  r: '#js-reqinfo',
};

// 1-9 map to custom profiles
for (let i = 1; i <= 9; i++) {
  shortcutKeys[String(i)] = `#js-profile-${i}`;
}

function moveUp() {
  const items = getMenuItems();
  const active = document.activeElement;
  const idx = items.indexOf(active as HTMLElement);
  const newIdx = idx > 0 ? idx - 1 : items.length - 1;
  items[newIdx]?.focus();
}

function moveDown() {
  const items = getMenuItems();
  const active = document.activeElement;
  const idx = items.indexOf(active as HTMLElement);
  const newIdx = idx < items.length - 1 ? idx + 1 : 0;
  items[newIdx]?.focus();
}

function getMenuItems(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll('.popup-menu-nav > li:not(.om-hidden) > a'),
  );
}

useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  const handler = shortcutKeys[e.key];
  if (!handler) return;
  if (e.target && ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA')) return;

  e.preventDefault();

  if (typeof handler === 'string') {
    if (handler === 'moveUp') return moveUp();
    if (handler === 'moveDown') return moveDown();
    if (handler === 'help') {
      store.showKeyboardHelp = true;
      return;
    }
    // Click by selector
    const el = document.querySelector(handler);
    el?.click();
  }
});

onMounted(async () => {
  await store.loadState();
  if (!store.proxyNotControllable) {
    await store.loadPageInfo();
  }
});
</script>

<template>
  <div>
    <!-- Proxy Not Controllable fallback -->
    <ProxyNotControllable v-if="store.proxyNotControllable" />

    <!-- Main Menu -->
    <PopupMenuNav v-else-if="!store.showConditionForm && !store.showRequestInfo" />

    <!-- Condition Form overlay -->
    <ConditionForm v-else-if="store.showConditionForm" />

    <!-- Request Info overlay -->
    <RequestInfoDetails v-else-if="store.showRequestInfo" />

    <!-- Keyboard Help overlay -->
    <KeyboardHelp
      v-if="store.showKeyboardHelp"
      @close="store.showKeyboardHelp = false"
    />
  </div>
</template>
