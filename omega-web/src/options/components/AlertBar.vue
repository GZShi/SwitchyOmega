<script setup lang="ts">
defineProps<{
  type: string;
  message: string;
  icon: string;
}>();
</script>

<template>
  <div class="alert-bar-wrapper">
    <div
      :class="['alert', 'alert-' + (type === 'error' ? 'danger' : type)]"
      role="alert"
    >
      <span :class="['glyphicon', 'glyphicon-' + icon]" />
      {{ message }}
    </div>
  </div>
</template>

<style scoped>
.alert-bar-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1050;
  padding: 10px;
}
.alert {
  margin-bottom: 0;
  padding: 8px 15px;
}
</style>
