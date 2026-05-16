<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { isFirefox } from '@/services/chrome';
import { getMessage as $t } from '@/services/chrome/i18n';
import { NButton, NSpace, NAlert, NInput } from 'naive-ui';
import AppModal from '@/options/components/AppModal.vue';
import GlyphIcon from '@/components/GlyphIcon.vue';

const props = defineProps<{
  auth: { username?: string; password?: string } | null | undefined;
  title?: string;
  proxyScheme?: string;
}>();
const emit = defineEmits<{
  close: [];
  save: [auth: { username: string; password: string } | null];
}>();

const username = ref(props.auth?.username ?? '');
const password = ref(props.auth?.password ?? '');

const authSupported = computed(() => {
  if (!props.proxyScheme) return true;
  if (props.proxyScheme === 'http' || props.proxyScheme === 'https') return true;
  if (props.proxyScheme === 'socks5' && !isFirefox) return true;
  return false;
});

watch(username, (newVal) => {
  if (!newVal) {
    password.value = '';
  }
});

const titleLabel = props.title ?? $t('options_proxy_auth') ?? 'Proxy Authentication';

function save() {
  if (!username.value) {
    emit('save', null);
  } else {
    emit('save', { username: username.value, password: password.value });
  }
  emit('close');
}
</script>

<template>
  <AppModal
    :title="titleLabel"
    size="sm"
    @close="emit('close')"
  >
    <form @submit.prevent="save">
      <NAlert
        v-if="!authSupported"
        type="error"
        style="margin-bottom: 12px"
      >
        <GlyphIcon name="warning-sign" />
        {{ ' ' + ($t('options_proxy_authNotSupported') || 'Proxy authentication is not supported for this protocol.') }}
      </NAlert>
      <div>
        <label for="proxy-auth-username">{{ $t('options_proxy_username') || 'Username' }}</label>
        <NInput
          id="proxy-auth-username"
          v-model:value="username"
          autofocus
        />
      </div>
      <div>
        <label for="proxy-auth-password">{{ $t('options_proxy_password') || 'Password' }}</label>
        <NInput
          v-if="username"
          id="proxy-auth-password"
          v-model:value="password"
          type="password"
          show-password-on="click"
        />
        <NInput
          v-else
          disabled
          :placeholder="$t('options_proxyAuthNone') || 'No password'"
        />
      </div>
      <NSpace justify="end" style="margin-top: 16px;">
        <NButton @click="emit('close')">
          {{ $t('dialog_cancel') }}
        </NButton>
        <NButton type="primary" @click="save">
          {{ $t('dialog_save') }}
        </NButton>
      </NSpace>
    </form>
  </AppModal>
</template>
