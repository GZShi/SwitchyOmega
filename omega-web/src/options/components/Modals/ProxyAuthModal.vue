<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { isFirefox } from '@/services/chrome';
import { getMessage as $t } from '@/services/chrome/i18n';
import BaseModal from '@/options/components/BaseModal.vue';

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
const showPassword = ref(false);

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
  <BaseModal
    :title="titleLabel"
    size="sm"
    @close="emit('close')"
  >
    <form @submit.prevent="save">
      <div v-if="!authSupported" class="alert alert-danger">
        <span class="glyphicon glyphicon-warning-sign" />
        {{ ' ' + ($t('options_proxy_authNotSupported') || 'Proxy authentication is not supported for this protocol.') }}
      </div>
      <div class="form-group">
        <label for="proxy-auth-username">{{ $t('options_proxy_username') || 'Username' }}</label>
        <input
          id="proxy-auth-username"
          v-model="username"
          class="form-control"
          type="text"
          autofocus
        >
      </div>
      <div class="form-group">
        <label for="proxy-auth-password">{{ $t('options_proxy_password') || 'Password' }}</label>
        <div class="input-group">
          <input
            v-if="username"
            id="proxy-auth-password"
            v-model="password"
            class="form-control"
            :type="showPassword ? 'text' : 'password'"
          >
          <input
            v-else
            class="form-control"
            type="text"
            value=""
            :placeholder="$t('options_proxyAuthNone') || 'No password'"
            disabled
          >
          <span class="input-group-btn">
            <button
              type="button"
              class="btn btn-default"
              :disabled="!username"
              @click="showPassword = !showPassword"
            >
              <span
                class="glyphicon"
                :class="showPassword ? 'glyphicon-eye-close' : 'glyphicon-eye-open'"
              />
            </button>
          </span>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" @click="emit('close')">
          {{ $t('dialog_cancel') }}
        </button>
        <button type="submit" class="btn btn-primary">
          {{ $t('dialog_save') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>
