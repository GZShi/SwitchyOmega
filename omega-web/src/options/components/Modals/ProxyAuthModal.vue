<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOmegaTarget } from '@/composables/useOmegaTarget';

const props = defineProps<{
  auth: { username?: string; password?: string } | null | undefined;
  title?: string;
}>();
const emit = defineEmits<{
  close: [];
  save: [auth: { username: string; password: string } | null];
}>();

const omega = useOmegaTarget();

const username = ref(props.auth?.username || '');
const password = ref(props.auth?.password || '');
const showPassword = ref(false);

const titleLabel = props.title || omega.getMessage('options_proxy_auth') || 'Proxy Authentication';

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
  <Teleport to="body">
    <div class="modal-backdrop fade in"></div>
    <div class="modal fade in" style="display: block;" @keydown.esc="emit('close')">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <form @submit.prevent="save">
            <div class="modal-header">
              <button type="button" class="close" @click="emit('close')">&times;</button>
              <h4 class="modal-title">{{ titleLabel }}</h4>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>{{ omega.getMessage('options_proxy_username') || 'Username' }}</label>
                <input class="form-control" type="text" v-model="username" autofocus />
              </div>
              <div class="form-group">
                <label>{{ omega.getMessage('options_proxy_password') || 'Password' }}</label>
                <div class="input-group">
                  <input class="form-control"
                         :type="showPassword ? 'text' : 'password'"
                         v-model="password" />
                  <span class="input-group-btn">
                    <button type="button" class="btn btn-default"
                            @click="showPassword = !showPassword">
                      <span class="glyphicon"
                            :class="showPassword ? 'glyphicon-eye-close' : 'glyphicon-eye-open'"></span>
                    </button>
                  </span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-default" @click="emit('close')">
                {{ omega.getMessage('dialog_cancel') }}
              </button>
              <button type="submit" class="btn btn-primary">
                {{ omega.getMessage('dialog_save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>
