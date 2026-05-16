<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NNotificationProvider, zhCN, dateZhCN } from 'naive-ui'

const themeOverrides = {
  common: {
    primaryColor: '#337ab7',
    primaryColorHover: '#286090',
    primaryColorPressed: '#204d74',
    successColor: '#449d44',
    errorColor: '#d9534f',
    warningColor: '#f0ad4e',
    infoColor: '#5bc0de',
    textColor2: '#999',
    textColor3: '#5c6166',
    borderColor: '#e5e5e5',
  },
}
</script>

<template>
  <NConfigProvider
    :theme-overrides="themeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <NMessageProvider>
      <NNotificationProvider>
        <slot />
      </NNotificationProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
