<script setup lang="ts">
import ProfileInline from '@/options/components/ProfileInline.vue';

defineProps<{ refs: any[]; profileName: string }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop fade in" />
    <div
      class="modal fade in"
      style="display: block;"
      @keydown.esc="emit('close')"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <button
              type="button"
              class="close"
              @click="emit('close')"
            >
              &times;
            </button>
            <h4 class="modal-title">
              {{ $t('options_modalHeader_cannotDeleteProfile') }}
            </h4>
          </div>
          <div class="modal-body">
            <p>{{ $t('options_profileReferredBy') }}</p>
            <div class="well">
              <ul class="list-style-none">
                <li
                  v-for="r in refs"
                  :key="r?.name"
                >
                  <ProfileInline :profile="r" />
                </li>
              </ul>
            </div>
            <p>{{ $t('options_modifyReferringProfiles') }}</p>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-primary"
              @click="emit('close')"
            >
              {{ $t('dialog_ok') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
