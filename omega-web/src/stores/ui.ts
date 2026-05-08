import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Alert {
  type: 'success' | 'info' | 'warning' | 'danger';
  message: string;
  i18n?: boolean;
}

export const useUiStore = defineStore('ui', () => {
  const alert = ref<Alert | null>(null);
  const alertShown = ref(false);
  const activeModal = ref<string | null>(null);
  const modalData = ref<Record<string, any>>({});
  const conditionTypesLevel = ref<0 | 1>(0);

  function showAlert(type: Alert['type'], message: string, i18n = false) {
    alert.value = { type, message, i18n };
    alertShown.value = true;
  }

  function hideAlert() {
    alertShown.value = false;
    alert.value = null;
  }

  function openModal(name: string, data: Record<string, any> = {}) {
    activeModal.value = name;
    modalData.value = data;
  }

  function closeModal() {
    activeModal.value = null;
    modalData.value = {};
  }

  return {
    alert,
    alertShown,
    activeModal,
    modalData,
    conditionTypesLevel,
    showAlert,
    hideAlert,
    openModal,
    closeModal,
  };
});
