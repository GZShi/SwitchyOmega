<script setup lang="ts">
import { onMounted } from 'vue';

const emit = defineEmits<{ close: [] }>();

const keyForId: Record<string, string> = {
  'js-direct': '0',
  'js-system': 'S',
  'js-external': 'E',
  'js-addrule': 'A',
  'js-temprule': 'T',
  'js-option': 'O',
  'js-reqinfo': 'R',
};

function showHelp(id: string, key: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!el.querySelector('.om-keyboard-help')) {
    const span = document.createElement('span');
    span.classList.add('om-keyboard-help');
    span.textContent = key;
    const ref = el.querySelector('.glyphicon') || el.firstElementChild;
    if (ref?.parentNode) {
      ref.parentNode.insertBefore(span, ref.nextSibling);
    }
  }
}

onMounted(() => {
  for (const [id, key] of Object.entries(keyForId)) {
    showHelp(id, key);
  }
  for (let i = 1; i <= 9; i++) {
    showHelp('js-profile-' + i, String(i));
  }
  // Auto-hide help after a delay
  setTimeout(() => emit('close'), 3000);
});
</script>

<template>
  <div />
</template>
