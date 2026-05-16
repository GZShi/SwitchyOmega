<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';

const props = withDefaults(defineProps<{
  show?: boolean;
  title: string;
  size?: 'sm' | 'lg';
  backdropClass?: string;
}>(), {
  show: true,
});

const emit = defineEmits<{ close: [] }>();

const modalRef = ref<HTMLElement | null>(null);
const previousFocus = ref<HTMLElement | null>(null);

let modalSeq = 0;
const uid = `modal-${++modalSeq}`;
const titleId = `${uid}-title`;

function getFocusableElements(): HTMLElement[] {
  if (!modalRef.value) return [];
  const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return Array.from(modalRef.value.querySelectorAll(selector)).filter((el) => {
    const htmlEl = el as HTMLElement;
    return htmlEl.offsetParent !== null && !htmlEl.hasAttribute('disabled');
  }) as HTMLElement[];
}

function trapFocus(e: KeyboardEvent) {
  if (e.key !== 'Tab') return;
  const focusable = getFocusableElements();
  if (focusable.length === 0) {
    e.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function open() {
  previousFocus.value = document.activeElement as HTMLElement;
  nextTick(() => {
    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    } else if (modalRef.value) {
      modalRef.value.focus();
    }
  });
}

function close() {
  if (previousFocus.value && typeof previousFocus.value.focus === 'function') {
    previousFocus.value.focus();
  }
}

watch(() => props.show, (visible) => {
  if (visible) open();
});

onMounted(() => {
  if (props.show) open();
});

onUnmounted(() => {
  if (
    previousFocus.value &&
    typeof previousFocus.value.focus === "function" &&
    document.contains(previousFocus.value)
  ) {
    previousFocus.value.focus();
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal-backdrop fade in"
      :class="backdropClass"
      @click="emit('close')"
    />
    <div
      v-if="show"
      ref="modalRef"
      class="modal fade in"
      :class="{ show: show }"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      @keydown.esc="emit('close')"
      @keydown="trapFocus"
    >
      <div :class="['modal-dialog', size ? `modal-${size}` : '']">
        <div class="modal-content">
          <div class="modal-header">
            <button
              type="button"
              class="close"
              aria-label="Close"
              @click="emit('close')"
            >
              &times;
            </button>
            <h4
              :id="titleId"
              class="modal-title"
            >
              {{ title }}
            </h4>
          </div>
          <div class="modal-body">
            <slot />
          </div>
          <div
            v-if="$slots.footer"
            class="modal-footer"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
