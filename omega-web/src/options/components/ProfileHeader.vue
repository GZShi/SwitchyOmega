<script setup lang="ts">
import { ref, computed } from 'vue';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOmegaPac } from '@/composables/useOmegaPac';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import RenameProfileModal from './Modals/RenameProfileModal.vue';

const props = defineProps<{
  profile: any;
  profileName: string;
  exportRuleListHandler?: ((...args: any[]) => void) | null;
  exportRuleListOptions?: any;
}>();
const emit = defineEmits<{ delete: [] }>();
const omega = useOmegaTarget();
const OmegaPac = useOmegaPac();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();

const showRenameModal = ref(false);

const tabPrefix = computed(() => omega.getMessage('options_profileTabPrefix') || '');

const profileColor = computed(() => {
  let p = props.profile;
  while (p?.profileType === 'VirtualProfile' && p.defaultProfileName) {
    const target = profilesStore.getVirtualTarget(p, optionsStore.options);
    if (target === p) break;
    p = target;
  }
  return p?.color || '#aaa';
});

const isVirtualProfile = computed(() => props.profile?.profileType === 'VirtualProfile');
const isScriptable = computed(() => {
  const type = props.profile?.profileType;
  return type !== 'DirectProfile' && type !== 'SystemProfile';
});
const hasRuleListExport = computed(() => !!props.exportRuleListHandler);

function exportScript() {
  if (!isScriptable.value) return;
  try {
    let missingProfile: string | null = null;
    const ast = OmegaPac.PacGenerator.script(optionsStore.options, props.profileName, {
      profileNotFound: (name: string) => { missingProfile = name; return 'dumb'; },
    });
    const pac = ast.print_to_string({ beautify: true, comments: true });
    const asciiPac = OmegaPac.PacGenerator.ascii(pac);
    const blob = new Blob([asciiPac], { type: 'text/plain;charset=utf-8' });
    const fileName = props.profileName.replace(/\W+/g, '_');
    (window as any).saveAs?.(blob, `OmegaProfile_${fileName}.pac`);
    if (missingProfile) {
      const ui = (window as any).__omegaUi;
      ui?.showAlert?.('error', omega.getMessage('options_profileNotFound', [missingProfile]));
    }
  } catch (e: any) {
    const ui = (window as any).__omegaUi;
    ui?.showAlert?.('error', e.message || 'Export failed');
  }
}

function exportRuleList() {
  if (props.exportRuleListHandler) {
    props.exportRuleListHandler();
  }
}

function onColorChange(color: string) {
  props.profile.color = color;
  optionsStore.markDirty();
}
</script>

<template>
  <div class="page-header">
    <div class="profile-actions">
      <button v-if="hasRuleListExport" class="btn"
              :class="props.exportRuleListOptions?.warning ? 'btn-warning' : 'btn-default'"
              :title="omega.getMessage('options_profileExportRuleListHelp')"
              @click="exportRuleList()">
        <span class="glyphicon glyphicon-list"></span>
        {{ omega.getMessage('options_profileExportRuleList') }}
      </button>
      {{ ' ' }}
      <button v-if="isScriptable" class="btn btn-default"
              :title="omega.getMessage('options_exportPacFileHelp')"
              @click="exportScript()">
        <span class="glyphicon glyphicon-download"></span>
        {{ omega.getMessage('options_profileExportPac') }}
      </button>
      {{ ' ' }}
      <button class="btn btn-default" @click="showRenameModal = true">
        <span class="glyphicon glyphicon-edit"></span>
        {{ omega.getMessage('options_renameProfile') }}
      </button>
      {{ ' ' }}
      <button class="btn btn-danger" @click="emit('delete')">
        <span class="glyphicon glyphicon-trash"></span>
        {{ omega.getMessage('options_deleteProfile') }}
      </button>
    </div>

    <span class="profile-color-editor">
      <div v-if="isVirtualProfile" class="profile-color-editor-fake"
           :style="{ backgroundColor: profileColor }"></div>
      <input v-else type="color" :value="profile.color || '#9ce'"
             @change="onColorChange(($event.target as HTMLInputElement).value)" />
    </span>

    <h2 class="profile-name">{{ tabPrefix }}{{ props.profileName }}</h2>
  </div>

  <Teleport to="body">
    <RenameProfileModal
      v-if="showRenameModal"
      :profile="profile"
      :profile-name="props.profileName"
      @close="showRenameModal = false"
    />
  </Teleport>
</template>
