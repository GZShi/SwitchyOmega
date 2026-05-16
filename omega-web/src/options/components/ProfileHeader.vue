<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { ref, computed } from 'vue';
import { useOmegaPac } from '@/composables/useOmegaPac';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import { useUiStore } from '@/stores/ui';
import { NButton, NColorPicker } from 'naive-ui';
import GlyphIcon from '@/components/GlyphIcon.vue';
import RenameProfileModal from './Modals/RenameProfileModal.vue';

const profile = defineModel<any>('profile', { required: true });
const props = defineProps<{
  profileName: string;
  exportRuleListHandler?: ((...args: any[]) => void) | null;
  exportRuleListOptions?: any;
}>();
const emit = defineEmits<{ delete: [] }>();
const OmegaPac = useOmegaPac();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();
const uiStore = useUiStore();

const showRenameModal = ref(false);

const tabPrefix = computed(() => $t('options_profileTabPrefix') || '');

const profileColor = computed(() => {
  let p = profile.value;
  while (p?.profileType === 'VirtualProfile' && p.defaultProfileName) {
    const target = profilesStore.getVirtualTarget(p, optionsStore.options);
    if (target === p) break;
    p = target;
  }
  return p?.color ?? '#aaa';
});

const isVirtualProfile = computed(() => profile.value?.profileType === 'VirtualProfile');
const isScriptable = computed(() => {
  const type = profile.value?.profileType;
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
      uiStore.showAlert('error', $t('options_profileNotFound', [missingProfile]));
    }
  } catch (e: any) {
    uiStore.showAlert('error', e.message ?? 'Export failed');
  }
}

function exportRuleList() {
  if (props.exportRuleListHandler) {
    props.exportRuleListHandler();
  }
}

</script>

<template>
  <div class="page-header">
    <div class="profile-actions">
      <NButton
        v-if="hasRuleListExport"
        :type="props.exportRuleListOptions?.warning ? 'warning' : 'default'"
        :title="$t('options_profileExportRuleListHelp')"
        @click="exportRuleList()"
      >
        <GlyphIcon name="list" />
        {{ $t('options_profileExportRuleList') }}
      </NButton>
      <NButton
        v-if="isScriptable"
        :title="$t('options_exportPacFileHelp')"
        @click="exportScript()"
      >
        <GlyphIcon name="download" />
        {{ $t('options_profileExportPac') }}
      </NButton>
      <NButton
        @click="showRenameModal = true"
      >
        <GlyphIcon name="edit" />
        {{ $t('options_renameProfile') }}
      </NButton>
      <NButton
        type="error"
        @click="emit('delete')"
      >
        <GlyphIcon name="trash" />
        {{ $t('options_deleteProfile') }}
      </NButton>
    </div>

    <span class="profile-color-editor">
      <div
        v-if="isVirtualProfile"
        class="profile-color-editor-fake"
        :style="{ backgroundColor: profileColor }"
      />
      <NColorPicker
        v-else
        v-model:value="profile.color"
        :default-value="profile.color || '#9ce'"
        @update:value="optionsStore.markDirty()"
      />
    </span>

    <h2 class="profile-name">
      {{ tabPrefix }}{{ props.profileName }}
    </h2>
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
