<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import Sortable from 'sortablejs';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOmegaPac } from '@/composables/useOmegaPac';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import { useUiStore } from '@/stores/ui';
import ProfileSelect from '@/options/components/ProfileSelect.vue';
import ConditionDetailCell from '@/options/components/Editors/ConditionDetailCell.vue';
import ConditionHelpSection from '@/options/components/Editors/ConditionHelpSection.vue';
import SwitchRulesFooter from '@/options/components/Editors/SwitchRulesFooter.vue';
import AttachedRuleListConfig from '@/options/components/Editors/AttachedRuleListConfig.vue';
import RuleRemoveConfirmModal from '@/options/components/Modals/RuleRemoveConfirmModal.vue';
import RuleResetConfirmModal from '@/options/components/Modals/RuleResetConfirmModal.vue';
import DeleteAttachedModal from '@/options/components/Modals/DeleteAttachedModal.vue';

const profile = defineModel<any>('profile', { required: true });
const props = defineProps<{ profileName: string }>();
const emit = defineEmits<{ setExportHandler: [handler: Function, opts?: any] }>();
const omega = useOmegaTarget();
const OmegaPac = useOmegaPac();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();

// -- Condition types --
const basicConditionTypes = [
  { group: 'default', types: ['HostWildcardCondition', 'UrlWildcardCondition', 'UrlRegexCondition', 'FalseCondition'] },
];
const advancedConditionTypes = [
  { group: 'host', types: ['HostWildcardCondition', 'HostRegexCondition', 'HostLevelsCondition', 'IpCondition'] },
  { group: 'url', types: ['UrlWildcardCondition', 'UrlRegexCondition', 'KeywordCondition'] },
  { group: 'special', types: ['WeekdayCondition', 'TimeCondition', 'FalseCondition'] },
];
const isUrlConditionType: Record<string, boolean> = {
  UrlWildcardCondition: true,
  UrlRegexCondition: true,
};

const showConditionTypes = ref(0);
const conditionHelpShow = ref(false);
const editSource = ref(false);
const sourceCode = ref('');
const sourceError = ref<any>(null);
const showNotes = ref(false);
const ruleListFormats = computed(() => OmegaPac.Profiles?.ruleListFormats ?? ['Switchy', 'AutoProxy']);

const conditionTypes = computed(() =>
  showConditionTypes.value === 0 ? basicConditionTypes : advancedConditionTypes,
);

const hasUrlConditions = computed(() =>
  (profile.value.rules ?? []).some((r: any) => isUrlConditionType[r.condition.conditionType]),
);

// Attached profile
const attachedName = computed(() => profilesStore.getAttachedName(props.profileName));
const attachedKey = computed(() => `+${  attachedName.value}`);
const attached = computed(() => optionsStore.options[attachedKey.value]);

const attachedOptions = ref({
  enabled: profile.value.defaultProfileName === profilesStore.getAttachedName(props.profileName),
  defaultProfileName: profile.value.defaultProfileName ?? 'direct',
});

// Init attached default profile name
if (attached.value) {
  attachedOptions.value.defaultProfileName = attached.value.defaultProfileName;
}

// Valid result profiles (for dropdowns)
// validResultProfilesFor returns profile objects directly (including builtins
// like `direct` and `system`), so pass through as-is. Don't look them up in
// options because builtin profiles are not stored there.
const validResultProfiles = computed(() => {
  const profiles = OmegaPac.Profiles?.validResultProfilesFor?.(
    props.profileName,
    optionsStore.options,
  ) ?? [];
  return profiles.filter((p: any) => !!p && !!p.name && !p.name.startsWith("__"));
});

const updating = ref(false);

function getConditionTypeLabel(type: string): string {
  return $t(`condition_${  type}`) || type;
}
function getConditionGroupLabel(group: string): string {
  return $t(`condition_group_${  group}`) || '';
}

// -- TrueCondition migration (legacy SwitchySharp data) --
function migrateTrueConditions() {
  const rules = profile.value?.rules;
  if (!rules) return;
  for (const rule of rules) {
    if (rule.condition?.conditionType === 'TrueCondition') {
      rule.condition = {
        conditionType: 'HostWildcardCondition',
        pattern: '*',
      };
    }
  }
}

// -- Rule ops --
function addRule() {
  const rules = profile.value.rules ?? (profile.value.rules = []);
  if (rules.length > 0) {
    const last = rules[rules.length - 1];
    const clone = JSON.parse(JSON.stringify(last));
    clone.condition.pattern = '';
    rules.push(clone);
  } else {
    rules.push({
      condition: { conditionType: 'HostWildcardCondition', pattern: '' },
      profileName: attachedOptions.value.defaultProfileName,
    });
  }
  optionsStore.markDirty();
}

function removeRule(index: number) {
  if (optionsStore.options['-confirmDeletion']) {
    ruleRemoveIndex.value = index;
    showRuleRemoveModal.value = true;
  } else {
    doRemoveRule(index);
  }
}

function doRemoveRule(index: number) {
  profile.value.rules.splice(index, 1);
  optionsStore.markDirty();
}

function confirmRemoveRule() {
  if (ruleRemoveIndex.value != null) {
    doRemoveRule(ruleRemoveIndex.value);
    ruleRemoveIndex.value = null;
  }
  showRuleRemoveModal.value = false;
}

function cloneRule(index: number) {
  const cloned = JSON.parse(JSON.stringify(profile.value.rules[index]));
  profile.value.rules.splice(index + 1, 0, cloned);
  optionsStore.markDirty();
}

function addNote(_index: number) {
  showNotes.value = true;
}

function resetRules() {
  showRuleResetModal.value = true;
}

function confirmResetRules() {
  for (const rule of profile.value.rules) {
    rule.profileName = attachedOptions.value.defaultProfileName;
  }
  showRuleResetModal.value = false;
  optionsStore.markDirty();
}

function conditionHasWarning(condition: any): boolean {
  if (condition.conditionType === 'HostWildcardCondition') {
    const p = condition.pattern ?? '';
    return p.indexOf(':') >= 0 || p.indexOf('/') >= 0;
  }
  return false;
}

// -- Attached profile ops --
function attachNew() {
  const newAttached = OmegaPac.Profiles?.create({
    name: attachedName.value,
    defaultProfileName: profile.value.defaultProfileName ?? attachedOptions.value.defaultProfileName,
    profileType: 'RuleListProfile',
    color: profile.value.color,
  });
  OmegaPac.Profiles?.updateRevision(newAttached);
  optionsStore.options[attachedKey.value] = newAttached;
  attachedOptions.value.enabled = true;
  profile.value.defaultProfileName = attachedName.value;
  optionsStore.markDirty();
}

function removeAttached() {
  if (!attached.value) return;
  showDeleteAttachedModal.value = true;
}

function confirmDeleteAttached() {
  if (!attached.value) return;
  profile.value.defaultProfileName = attached.value.defaultProfileName;
  delete optionsStore.options[attachedKey.value];
  attachedOptions.value.enabled = false;
  showDeleteAttachedModal.value = false;
  optionsStore.markDirty();
}

// -- Source editor --
function toggleSource() {
  if (!editSource.value) {
    sourceCode.value = OmegaPac.RuleList?.Switchy?.compose({
      rules: profile.value.rules,
      defaultProfileName: attachedOptions.value.defaultProfileName,
    }, { withResult: true }) ?? '';
    sourceError.value = null;
    hasUnsavedSourceChanges.value = false;
    editSource.value = true;
  } else {
    if (!parseSource()) return;
    editSource.value = false;
    sourceError.value = null;
    hasUnsavedSourceChanges.value = false;
  }
}

function parseSource(): boolean {
  if (!sourceCode.value.trim()) return true;
  try {
    const parsed = OmegaPac.RuleList?.Switchy?.parseOmega(sourceCode.value.trim(), null, null, { strict: true, source: false });
    if (!parsed) return false;
    const newRules: any[] = parsed;
    const defaultRule = newRules.pop();
    attachedOptions.value.defaultProfileName = defaultRule.profileName;
    profile.value.rules = newRules.map((r: any) => ({
      condition: r.condition,
      profileName: r.profileName,
      note: r.note,
    }));
    optionsStore.markDirty();
    hasUnsavedSourceChanges.value = false;
    return true;
  } catch (e: any) {
    let message = e.message;
    if (e.reason) {
      const args = e.args ?? [e.sourceLineNo, e.source].filter((a: any) => a !== undefined);
      const translated = $t(`ruleList_error_${  e.reason}`, args as string[]);
      message = translated || message;
    }
    sourceError.value = { message };
    return false;
  }
}

// -- SwitchRulesFooter handlers --
function onAttachedMatchProfileChange(name: string) {
  if (attached.value) attached.value.matchProfileName = name;
  optionsStore.markDirty();
}
function onAttachedOptionsEnabledChange(enabled: boolean) {
  attachedOptions.value.enabled = enabled;
}
function onAttachedOptionsDefaultProfileChange(name: string) {
  attachedOptions.value.defaultProfileName = name;
  optionsStore.markDirty();
}

// -- Download attached --
async function downloadAttached() {
  if (!attached.value) return;
  updating.value = true;
  try {
    await omega.updateProfile(attachedName.value, 'bypass_cache');
  } catch (e: any) {
    useUiStore().showAlert('error', e?.message ?? $t('options_downloadFailed'));
  }
  finally { updating.value = false; }
}

// -- Drag-and-drop sorting --
const rulesTbody = ref<HTMLElement | null>(null);
let sortableInstance: Sortable | null = null;

// -- Confirmation modal state --
const showRuleRemoveModal = ref(false);
const ruleRemoveIndex = ref<number | null>(null);
const showRuleResetModal = ref(false);
const showDeleteAttachedModal = ref(false);

// -- Source editor dirty check --
const hasUnsavedSourceChanges = ref(false);

onMounted(() => {
  if (rulesTbody.value) {
    sortableInstance = Sortable.create(rulesTbody.value, {
      handle: '.sort-bar',
      animation: 150,
      onEnd(evt: Sortable.SortableEvent) {
        if (evt.oldIndex == null || evt.newIndex == null) return;
        const rules = profile.value.rules;
        if (!rules) return;
        const [moved] = rules.splice(evt.oldIndex, 1);
        rules.splice(evt.newIndex, 0, moved);
        optionsStore.markDirty();
      },
    });
  }
});

onBeforeUnmount(() => {
  sortableInstance?.destroy();
});

// -- Export handler --
function exportRuleList() {
  const text = OmegaPac.RuleList?.Switchy?.compose({
    rules: profile.value.rules,
    defaultProfileName: attachedOptions.value.defaultProfileName,
  });
  const blob = new Blob([text ?? ''], { type: 'text/plain;charset=utf-8' });
  const fileName = props.profileName.replace(/\W+/g, '_');
  (window as any).saveAs?.(blob, `OmegaRules_${fileName}.sorl`);
}

emit('setExportHandler', exportRuleList);

// -- Sync attached/profile state --
watch(
  () => attachedOptions.value.enabled,
  (enabled, oldValue) => {
    if (enabled === oldValue) return;
    if (enabled) {
      if (profile.value.defaultProfileName !== attachedName.value) {
        profile.value.defaultProfileName = attachedName.value;
      }
    } else {
      if (profile.value.defaultProfileName === attachedName.value) {
        if (attached.value) {
          profile.value.defaultProfileName = attached.value.defaultProfileName;
          attachedOptions.value.defaultProfileName = attached.value.defaultProfileName;
        } else {
          profile.value.defaultProfileName = 'direct';
          attachedOptions.value.defaultProfileName = 'direct';
        }
      }
    }
    optionsStore.markDirty();
  },
);

watch(
  () => attachedOptions.value.defaultProfileName,
  (name) => {
    if (attached.value && attachedOptions.value.enabled) {
      attached.value.defaultProfileName = name;
    } else {
      profile.value.defaultProfileName = name;
    }
  },
);

// -- TrueCondition migration: convert legacy SwitchySharp conditions --
watch(
  () => profile.value?.rules,
  (rules) => {
    if (!rules || rules.length === 0) return;
    migrateTrueConditions();
  },
  { immediate: true },
);

// -- Source editor dirty check --
watch(
  () => sourceCode.value,
  (newCode) => {
    if (!editSource.value) return;
    const serialized = OmegaPac.RuleList?.Switchy?.compose({
      rules: profile.value.rules,
      defaultProfileName: attachedOptions.value.defaultProfileName,
    }, { withResult: true }) ?? '';
    hasUnsavedSourceChanges.value = newCode !== serialized;
  },
);

// Show notes if any rule has a note
showNotes.value = (profile.value.rules ?? []).some((r: any) => !!r.note);

// Detect advanced condition types
const basicSet = new Set(basicConditionTypes[0].types);
if ((profile.value.rules ?? []).some((r: any) => !basicSet.has(r.condition.conditionType))) {
  showConditionTypes.value = 1;
}

</script>

<template>
  <div>
    <!-- Condition help -->
    <ConditionHelpSection
      v-if="conditionHelpShow"
      :condition-types="conditionTypes"
      :is-url-condition-type="isUrlConditionType"
      @close="conditionHelpShow = false"
    />

    <!-- Switch rules -->
    <section class="settings-group">
      <h3>
        {{ $t('options_group_switchRules') }}
        <button
          class="btn"
          :class="editSource ? 'btn-primary active' : 'btn-default'"
          @click="toggleSource()"
        >
          <span class="glyphicon glyphicon-edit" />
          {{ $t('options_profileEditSource') }}
        </button>
        <a
          v-if="editSource"
          class="btn btn-link btn-sm clear-padding"
          target="_blank"
          :title="$t('options_profileEditSourceHelp')"
          :href="$t('options_profileEditSourceHelpUrl')"
        >
          <span class="glyphicon glyphicon-question-sign" />
        </a>
      </h3>

      <div
        v-if="sourceError"
        class="alert alert-danger width-limit"
      >
        <span class="glyphicon glyphicon-remove" />
        {{ sourceError.message }}
      </div>
      <div
        v-if="hasUrlConditions"
        class="alert alert-danger"
      >
        <span class="glyphicon glyphicon-alert" />
        <span v-html="$t('condition_alert_fullUrlLimitation')" />
      </div>

      <!-- Source editor -->
      <div
        v-if="editSource"
        class="rules-source"
      >
        <textarea
          v-model="sourceCode"
          class="monospace form-control width-limit"
          rows="20"
          @input="optionsStore.markDirty()"
        />
      </div>

      <!-- Rules table -->
      <div
        v-else
        class="table-responsive switch-rules-wrapper"
      >
        <table class="switch-rules table table-bordered table-condensed width-limit-xl">
          <thead>
            <tr>
              <th style="white-space: nowrap">
                {{ $t('options_sort') }}
              </th>
              <th class="condition-type-th">
                {{ $t('options_conditionType') }}
                <button
                  class="btn btn-link btn-sm clear-padding"
                  :title="$t('options_showConditionTypeHelp')"
                  @click="conditionHelpShow = !conditionHelpShow"
                >
                  <span class="glyphicon glyphicon-question-sign" />
                </button>
              </th>
              <th>{{ $t('options_conditionDetails') }}</th>
              <th>{{ $t('options_resultProfile') }}</th>
              <th>{{ $t('options_conditionActions') }}</th>
              <th v-if="showNotes">
                {{ $t('options_ruleNote') }}
              </th>
            </tr>
          </thead>
          <!-- Rules -->
          <tbody ref="rulesTbody">
            <tr
              v-for="(rule, idx) in (profile.rules || [])"
              :key="idx"
              class="switch-rule-row"
            >
              <td class="sort-bar">
                <span class="glyphicon glyphicon-sort" />
              </td>
              <td :class="{ 'has-icon': isUrlConditionType[rule.condition.conditionType] }">
                <select
                  v-model="rule.condition.conditionType"
                  class="form-control"
                  @change="optionsStore.markDirty()"
                >
                  <optgroup
                    v-for="group in conditionTypes"
                    :key="group.group"
                    :label="getConditionGroupLabel(group.group) || ''"
                  >
                    <option
                      v-for="type in group.types"
                      :key="type"
                      :value="type"
                    >
                      {{ getConditionTypeLabel(type) }}
                    </option>
                  </optgroup>
                </select>
                <a
                  v-if="isUrlConditionType[rule.condition.conditionType]"
                  class="icon-wrapper"
                  :href="$t('condition_alert_fullUrlLimitationLink')"
                  target="_blank"
                >
                  <span class="glyphicon glyphicon-alert text-danger" />
                </a>
              </td>
              <td :class="{ 'has-warning': conditionHasWarning(rule.condition) }">
                <ConditionDetailCell v-model:condition="rule.condition" />
              </td>
              <td class="switch-rule-row-target">
                <ProfileSelect
                  :profiles="validResultProfiles"
                  :model-value="rule.profileName"
                  @update:model-value="rule.profileName = $event; optionsStore.markDirty()"
                />
              </td>
              <td>
                <button
                  class="btn btn-danger btn-sm"
                  :title="$t('options_deleteRule')"
                  @click="removeRule(Number(idx))"
                >
                  <span class="glyphicon glyphicon-trash" />
                </button>
                <button
                  class="btn btn-default btn-sm"
                  :title="$t('options_cloneRule')"
                  @click="cloneRule(Number(idx))"
                >
                  <span class="glyphicon glyphicon-duplicate" />
                </button>
                <button
                  v-if="!showNotes"
                  class="btn btn-default btn-sm"
                  :title="$t('options_ruleNote')"
                  @click="addNote(Number(idx))"
                >
                  <span class="glyphicon glyphicon-comment" />
                </button>
              </td>
              <td v-if="showNotes">
                <input
                  v-model="rule.note"
                  class="form-control"
                  @change="optionsStore.markDirty()"
                >
              </td>
            </tr>
          </tbody>
          <SwitchRulesFooter
            :show-notes="showNotes"
            :attached="attached"
            :attached-match-profile-name="attached?.matchProfileName"
            :attached-options-enabled="attachedOptions.enabled"
            :attached-options-default-profile-name="attachedOptions.defaultProfileName"
            :valid-result-profiles="validResultProfiles"
            :profile-icon="profilesStore.profileIcons['RuleListProfile']"
            @add-rule="addRule()"
            @remove-attached="removeAttached()"
            @reset-rules="resetRules()"
            @update:attached-match-profile-name="onAttachedMatchProfileChange"
            @update:attached-options-enabled="onAttachedOptionsEnabledChange"
            @update:attached-options-default-profile-name="onAttachedOptionsDefaultProfileChange"
            @dirty="optionsStore.markDirty()"
          />
        </table>
      </div>
    </section>

    <!-- Attach Profile (when not attached) -->
    <section
      v-if="!attached"
      class="settings-group"
    >
      <h3>{{ $t('options_group_attachProfile') }}</h3>
      <p class="help-block">
        {{ $t('options_attachProfileHelp') }}
      </p>
      <button
        class="btn btn-default"
        @click="attachNew()"
      >
        <span class="glyphicon glyphicon-plus" />
        {{ $t('options_attachProfile') }}
      </button>
    </section>

    <AttachedRuleListConfig
      v-if="attached"
      :attached="attached"
      :rule-list-formats="ruleListFormats"
      :updating="updating"
      @dirty="optionsStore.markDirty()"
      @download="downloadAttached()"
    />
  </div>

  <!-- Rule remove confirmation modal -->
  <RuleRemoveConfirmModal
    v-if="showRuleRemoveModal"
    :rule="ruleRemoveIndex != null ? (profile.rules ?? [])[ruleRemoveIndex] ?? null : null"
    @close="showRuleRemoveModal = false"
    @confirm="confirmRemoveRule()"
  />

  <!-- Rule reset confirmation modal -->
  <RuleResetConfirmModal
    v-if="showRuleResetModal"
    :default-profile-name="attachedOptions.defaultProfileName"
    @close="showRuleResetModal = false"
    @confirm="confirmResetRules()"
  />

  <!-- Delete attached profile confirmation modal -->
  <DeleteAttachedModal
    v-if="showDeleteAttachedModal"
    :profile-name="attachedName"
    :parent-name="props.profileName"
    :source-url="attached?.sourceUrl"
    :rule-list="attached?.ruleList"
    @close="showDeleteAttachedModal = false"
    @confirm="confirmDeleteAttached()"
  />
</template>
