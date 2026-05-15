<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const keyForId: Record<string, string> = {
  'js-direct': '0',
  'js-system': 'S',
  'js-external': 'E',
  'js-addrule': 'A',
  'js-temprule': 'T',
  'js-option': 'O',
  'js-reqinfo': 'R',
};

const injectedElements: HTMLSpanElement[] = [];

function injectLabel(id: string, key: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.querySelector('.om-keyboard-help')) return;
  const span = document.createElement('span');
  span.classList.add('om-keyboard-help');
  span.textContent = key;
  const ref = el.querySelector('.glyphicon') ?? el.firstElementChild;
  if (ref?.parentNode) {
    ref.parentNode.insertBefore(span, ref.nextSibling);
    injectedElements.push(span);
  }
}

function cleanup() {
  for (const span of injectedElements) {
    span.remove();
  }
  injectedElements.length = 0;
}

onMounted(() => {
  for (const [id, key] of Object.entries(keyForId)) {
    injectLabel(id, key);
  }
  for (let i = 1; i <= 9; i++) {
    injectLabel(`js-profile-${i}`, String(i));
  }
});

onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <div />
</template>
