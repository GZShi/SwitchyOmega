<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import Sortable from 'sortablejs';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOmegaPac } from '@/composables/useOmegaPac';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import ProfileSelect from '@/options/components/ProfileSelect.vue';

const props = defineProps<{ profile: any; profileName: string }>();
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
const expandedSection = ref(0);
const editSource = ref(false);
const sourceCode = ref('');
const sourceError = ref<any>(null);
const sourceTouched = ref(false);
const showNotes = ref(false);
const ruleListFormats = computed(() => OmegaPac.Profiles?.ruleListFormats || ['Switchy', 'AutoProxy']);

const conditionTypes = computed(() =>
  showConditionTypes.value === 0 ? basicConditionTypes : advancedConditionTypes,
);

const hasUrlConditions = computed(() =>
  (props.profile.rules || []).some((r: any) => isUrlConditionType[r.condition.conditionType]),
);

// Attached profile
const attachedName = computed(() => profilesStore.getAttachedName(props.profileName));
const attachedKey = computed(() => '+' + attachedName.value);
const attached = computed(() => optionsStore.options[attachedKey.value]);

const attachedOptions = ref({
  enabled: props.profile.defaultProfileName === profilesStore.getAttachedName(props.profileName),
  defaultProfileName: props.profile.defaultProfileName || 'direct',
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
  ) || [];
  return profiles.filter((p: any) => !!p && !!p.name);
});

const updating = ref(false);

function getConditionTypeLabel(type: string): string {
  return omega.getMessage('condition_' + type) || type;
}
function getConditionGroupLabel(group: string): string {
  return omega.getMessage('condition_group_' + group) || '';
}

// -- Rule ops --
function addRule() {
  const rules = props.profile.rules || (props.profile.rules = []);
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
  props.profile.rules.splice(index, 1);
  optionsStore.markDirty();
}

function cloneRule(index: number) {
  const cloned = JSON.parse(JSON.stringify(props.profile.rules[index]));
  props.profile.rules.splice(index + 1, 0, cloned);
  optionsStore.markDirty();
}

function addNote(index: number) {
  showNotes.value = true;
}

function resetRules() {
  for (const rule of props.profile.rules) {
    rule.profileName = attachedOptions.value.defaultProfileName;
  }
  optionsStore.markDirty();
}

function validateCondition(condition: any): boolean {
  if (condition.conditionType.indexOf('Regex') >= 0) {
    try { new RegExp(condition.pattern); } catch (_) { return false; }
  }
  return true;
}

function conditionHasWarning(condition: any): boolean {
  if (condition.conditionType === 'HostWildcardCondition') {
    const p = condition.pattern || '';
    return p.indexOf(':') >= 0 || p.indexOf('/') >= 0;
  }
  return false;
}

// Weekday
const weekdayChars = 'SMTWtFs';
function getWeekdayList(condition: any): boolean[] {
  const days = condition.days || '-------';
  return weekdayChars.split('').map((_, i) => days[i] !== '-');
}
function updateDay(condition: any, i: number, selected: boolean) {
  condition.days = condition.days || '-------';
  const char = selected ? weekdayChars[i] : '-';
  condition.days = condition.days.substring(0, i) + char + condition.days.substring(i + 1);
  delete condition.startDay;
  delete condition.endDay;
  optionsStore.markDirty();
}

// -- Attached profile ops --
function attachNew() {
  const newAttached = OmegaPac.Profiles?.create({
    name: attachedName.value,
    defaultProfileName: props.profile.defaultProfileName || attachedOptions.value.defaultProfileName,
    profileType: 'RuleListProfile',
    color: props.profile.color,
  });
  OmegaPac.Profiles?.updateRevision(newAttached);
  optionsStore.options[attachedKey.value] = newAttached;
  attachedOptions.value.enabled = true;
  props.profile.defaultProfileName = attachedName.value;
  optionsStore.markDirty();
}

function removeAttached() {
  if (!attached.value) return;
  props.profile.defaultProfileName = attached.value.defaultProfileName;
  delete optionsStore.options[attachedKey.value];
  attachedOptions.value.enabled = false;
  optionsStore.markDirty();
}

// -- Source editor --
function toggleSource() {
  if (!editSource.value) {
    sourceCode.value = OmegaPac.RuleList?.Switchy?.compose({
      rules: props.profile.rules,
      defaultProfileName: attachedOptions.value.defaultProfileName,
    }, { withResult: true }) || '';
    sourceError.value = null;
    editSource.value = true;
  } else {
    if (!parseSource()) return;
    editSource.value = false;
    sourceError.value = null;
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
    props.profile.rules = newRules.map((r: any) => ({
      condition: r.condition,
      profileName: r.profileName,
      note: r.note,
    }));
    optionsStore.markDirty();
    return true;
  } catch (e: any) {
    sourceError.value = { message: e.message };
    return false;
  }
}

// -- Download attached --
async function downloadAttached() {
  if (!attached.value) return;
  updating.value = true;
  try {
    await omega.updateProfile(attachedName.value, 'bypass_cache');
  } catch (_) { /* ignore */ }
  finally { updating.value = false; }
}

// -- Drag-and-drop sorting --
const rulesTbody = ref<HTMLElement | null>(null);
let sortableInstance: Sortable | null = null;

onMounted(() => {
  if (rulesTbody.value) {
    sortableInstance = Sortable.create(rulesTbody.value, {
      handle: '.sort-bar',
      animation: 150,
      onEnd(evt) {
        if (evt.oldIndex == null || evt.newIndex == null) return;
        const rules = props.profile.rules;
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
    rules: props.profile.rules,
    defaultProfileName: attachedOptions.value.defaultProfileName,
  });
  const blob = new Blob([text || ''], { type: 'text/plain;charset=utf-8' });
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
      if (props.profile.defaultProfileName !== attachedName.value) {
        props.profile.defaultProfileName = attachedName.value;
      }
    } else {
      if (props.profile.defaultProfileName === attachedName.value) {
        if (attached.value) {
          props.profile.defaultProfileName = attached.value.defaultProfileName;
          attachedOptions.value.defaultProfileName = attached.value.defaultProfileName;
        } else {
          props.profile.defaultProfileName = 'direct';
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
      props.profile.defaultProfileName = name;
    }
  },
);

// Show notes if any rule has a note
showNotes.value = (props.profile.rules || []).some((r: any) => !!r.note);

// Detect advanced condition types
const basicSet = new Set(basicConditionTypes[0].types);
if ((props.profile.rules || []).some((r: any) => !basicSet.has(r.condition.conditionType))) {
  showConditionTypes.value = 1;
}

function formatDate(ts: any): string {
  if (!ts) return '';
  try { return new Date(ts).toLocaleString(); } catch (_) { return String(ts); }
}
</script>

<template>
  <div>
    <!-- Condition help -->
    <section v-if="conditionHelpShow" class="condition-help-section settings-group">
      <h3>
        {{ omega.getMessage('options_group_conditionHelp') }}
        <button class="close close-condition-help" type="button"
                @click="conditionHelpShow = false">
          <span aria-hidden="true">×</span>
        </button>
      </h3>
      <div v-for="(group, gidx) in conditionTypes" :key="group.group" class="condition-help">
        <h4 v-if="getConditionGroupLabel(group.group)">
          <a role="button" @click="expandedSection = gidx">
            <span class="glyphicon"
                  :class="expandedSection === gidx ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right'"></span>
            {{ getConditionGroupLabel(group.group) }}
          </a>
        </h4>
        <dl v-if="expandedSection === gidx">
          <template v-for="type in group.types" :key="type">
            <dt>{{ getConditionTypeLabel(type) }}</dt>
            <dd>
              <div v-html="omega.getMessage('condition_help_' + type)"></div>
              <div v-if="isUrlConditionType[type]" class="text-danger">
                <span class="glyphicon glyphicon-alert"></span>
                <span v-html="omega.getMessage('condition_alert_fullUrlLimitation')"></span>
              </div>
            </dd>
          </template>
        </dl>
      </div>
    </section>

    <!-- Switch rules -->
    <section class="settings-group">
      <h3>
        {{ omega.getMessage('options_group_switchRules') }}
        <button class="btn" :class="editSource ? 'btn-primary active' : 'btn-default'"
                @click="toggleSource()">
          <span class="glyphicon glyphicon-edit"></span>
          {{ omega.getMessage('options_profileEditSource') }}
        </button>
        <a v-if="editSource" class="btn btn-link btn-sm clear-padding"
           target="_blank"
           :title="omega.getMessage('options_profileEditSourceHelp')"
           :href="omega.getMessage('options_profileEditSourceHelpUrl')">
          <span class="glyphicon glyphicon-question-sign"></span>
        </a>
      </h3>

      <div v-if="sourceError" class="alert alert-danger width-limit">
        <span class="glyphicon glyphicon-remove"></span>
        {{ sourceError.message }}
      </div>
      <div v-if="hasUrlConditions" class="alert alert-danger">
        <span class="glyphicon glyphicon-alert"></span>
        <span v-html="omega.getMessage('condition_alert_fullUrlLimitation')"></span>
      </div>

      <!-- Source editor -->
      <div v-if="editSource" class="rules-source">
        <textarea class="monospace form-control width-limit" rows="20"
                  v-model="sourceCode"
                  @input="sourceTouched = true; optionsStore.markDirty()"></textarea>
      </div>

      <!-- Rules table -->
      <div v-else class="table-responsive switch-rules-wrapper">
        <table class="switch-rules table table-bordered table-condensed width-limit-xl">
          <thead>
            <tr>
              <th style="white-space: nowrap">{{ omega.getMessage('options_sort') }}</th>
              <th class="condition-type-th">
                {{ omega.getMessage('options_conditionType') }}
                <button class="btn btn-link btn-sm clear-padding"
                        :title="omega.getMessage('options_showConditionTypeHelp')"
                        @click="conditionHelpShow = !conditionHelpShow">
                  <span class="glyphicon glyphicon-question-sign"></span>
                </button>
              </th>
              <th>{{ omega.getMessage('options_conditionDetails') }}</th>
              <th>{{ omega.getMessage('options_resultProfile') }}</th>
              <th>{{ omega.getMessage('options_conditionActions') }}</th>
              <th v-if="showNotes">{{ omega.getMessage('options_ruleNote') }}</th>
            </tr>
          </thead>
          <!-- Rules -->
          <tbody ref="rulesTbody">
            <tr v-for="(rule, idx) in (profile.rules || [])" :key="idx"
                class="switch-rule-row">
              <td class="sort-bar">
                <span class="glyphicon glyphicon-sort"></span>
              </td>
              <td :class="{ 'has-icon': isUrlConditionType[rule.condition.conditionType] }">
                <select class="form-control"
                        v-model="rule.condition.conditionType"
                        @change="optionsStore.markDirty()">
                  <optgroup v-for="group in conditionTypes" :key="group.group"
                            :label="getConditionGroupLabel(group.group) || ''">
                    <option v-for="type in group.types" :key="type" :value="type">
                      {{ getConditionTypeLabel(type) }}
                    </option>
                  </optgroup>
                </select>
                <a v-if="isUrlConditionType[rule.condition.conditionType]"
                   class="icon-wrapper"
                   :href="omega.getMessage('condition_alert_fullUrlLimitationLink')"
                   target="_blank">
                  <span class="glyphicon glyphicon-alert text-danger"></span>
                </a>
              </td>
              <td :class="{ 'has-warning': conditionHasWarning(rule.condition) }">
                <!-- FalseCondition -->
                <template v-if="rule.condition.conditionType === 'FalseCondition'">
                  <input v-if="rule.condition.pattern" class="form-control"
                         v-model="rule.condition.pattern" disabled
                         :title="omega.getMessage('condition_details_FalseCondition')" />
                  <span v-else>{{ omega.getMessage('condition_details_FalseCondition') }}</span>
                </template>
                <!-- HostLevels -->
                <span v-else-if="rule.condition.conditionType === 'HostLevelsCondition'" class="host-levels-details">
                  <input class="form-control" type="number" min="1" max="99"
                         v-model.number="rule.condition.minValue"
                         @change="optionsStore.markDirty()" />
                  <span>{{ omega.getMessage('options_hostLevelsBetween') }}</span>
                  <input class="form-control" type="number" min="1" max="99"
                         v-model.number="rule.condition.maxValue"
                         @change="optionsStore.markDirty()" />
                </span>
                <!-- IP -->
                <span v-else-if="rule.condition.conditionType === 'IpCondition'">
                  <input class="form-control" type="text" placeholder="127.0.0.1/8"
                         v-model="rule.condition.pattern"
                         @change="optionsStore.markDirty()" />
                </span>
                <!-- Time -->
                <span v-else-if="rule.condition.conditionType === 'TimeCondition'" class="host-levels-details">
                  <input class="form-control" type="number" min="0" max="23"
                         v-model.number="rule.condition.startHour"
                         @change="optionsStore.markDirty()" />
                  <span>{{ omega.getMessage('options_hourBetween') }}</span>
                  <input class="form-control" type="number" min="0" max="23"
                         v-model.number="rule.condition.endHour"
                         @change="optionsStore.markDirty()" />
                </span>
                <!-- Weekday -->
                <span v-else-if="rule.condition.conditionType === 'WeekdayCondition'" class="host-levels-details">
                  <label v-for="(_, i) in 'SMTWtFs'.split('')" :key="i" class="checkbox-inline">
                    <input type="checkbox" :checked="getWeekdayList(rule.condition)[i]"
                           @change="updateDay(rule.condition, i, ($event.target as HTMLInputElement).checked)" />
                    {{ omega.getMessage('options_weekDayShort_' + i) || 'SMTWTFS'[i] }}
                  </label>
                </span>
                <!-- Default (pattern input) -->
                <input v-else class="form-control" type="text"
                       v-model="rule.condition.pattern"
                       required
                       @change="optionsStore.markDirty()" />
              </td>
              <td class="switch-rule-row-target">
                <ProfileSelect :profiles="validResultProfiles"
                               :model-value="rule.profileName"
                               @update:model-value="rule.profileName = $event; optionsStore.markDirty()" />
              </td>
              <td>
                <button class="btn btn-danger btn-sm"
                        :title="omega.getMessage('options_deleteRule')"
                        @click="removeRule(idx)">
                  <span class="glyphicon glyphicon-trash"></span>
                </button>
                <button class="btn btn-default btn-sm"
                        :title="omega.getMessage('options_cloneRule')"
                        @click="cloneRule(idx)">
                  <span class="glyphicon glyphicon-duplicate"></span>
                </button>
                <button v-if="!showNotes" class="btn btn-default btn-sm"
                        :title="omega.getMessage('options_ruleNote')"
                        @click="addNote(idx)">
                  <span class="glyphicon glyphicon-comment"></span>
                </button>
              </td>
              <td v-if="showNotes">
                <input class="form-control" v-model="rule.note"
                       @change="optionsStore.markDirty()" />
              </td>
            </tr>
          </tbody>
          <!-- Add rule button row -->
          <tbody>
            <tr>
              <td style="border-right: none;"></td>
              <td style="border-left: none;" :colspan="showNotes ? 5 : 4">
                <button class="btn btn-default btn-sm" @click="addRule()">
                  <span class="glyphicon glyphicon-plus"></span>
                  {{ omega.getMessage('options_addCondition') }}
                </button>
              </td>
            </tr>
          </tbody>
          <!-- Attached profile row -->
          <tbody v-if="attached" class="switch-attached">
            <tr>
              <td style="border-right: none;">
                <span class="glyphicon" :class="profilesStore.profileIcons['RuleListProfile']"></span>
              </td>
              <td style="border-left: none;">
                <span class="checkbox">
                  <label>
                    <input type="checkbox" v-model="attachedOptions.enabled" />
                    {{ omega.getMessage('options_switchAttachedProfileInCondition') }}
                  </label>
                </span>
              </td>
              <td>
                <span v-if="attachedOptions.enabled">
                  {{ omega.getMessage('options_switchAttachedProfileInConditionDetails') }}
                </span>
                <span v-else>
                  {{ omega.getMessage('options_switchAttachedProfileInConditionDisabled') }}
                </span>
              </td>
              <td>
                <ProfileSelect
                  :profiles="validResultProfiles"
                  :model-value="attached.matchProfileName"
                  :class="{ disabled: !attachedOptions.enabled }"
                  @update:model-value="attached.matchProfileName = $event; optionsStore.markDirty()" />
              </td>
              <td>
                <button class="btn btn-danger btn-sm"
                        :title="omega.getMessage('options_deleteAttached')"
                        @click="removeAttached()">
                  <span class="glyphicon glyphicon-trash"></span>
                </button>
              </td>
              <td v-if="showNotes"></td>
            </tr>
          </tbody>
          <!-- Default profile row -->
          <tbody>
            <tr class="switch-default-row">
              <td></td>
              <td colspan="2">{{ omega.getMessage('options_switchDefaultProfile') }}</td>
              <td>
                <ProfileSelect :profiles="validResultProfiles"
                               :model-value="attachedOptions.defaultProfileName"
                               @update:model-value="attachedOptions.defaultProfileName = $event; optionsStore.markDirty()" />
              </td>
              <td>
                <button class="btn btn-info btn-sm"
                        :title="omega.getMessage('options_resetRules_help')"
                        @click="resetRules()">
                  <span class="glyphicon glyphicon-chevron-up"></span>
                </button>
              </td>
              <td v-if="showNotes"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Attach Profile (when not attached) -->
    <section v-if="!attached" class="settings-group">
      <h3>{{ omega.getMessage('options_group_attachProfile') }}</h3>
      <p class="help-block">{{ omega.getMessage('options_attachProfileHelp') }}</p>
      <button class="btn btn-default" @click="attachNew()">
        <span class="glyphicon glyphicon-plus"></span>
        {{ omega.getMessage('options_attachProfile') }}
      </button>
    </section>

    <!-- Attached rule list config -->
    <section v-if="attached" class="settings-group">
      <h3>{{ omega.getMessage('options_group_ruleListConfig') }}</h3>
      <div class="form-group">
        <label>{{ omega.getMessage('options_ruleListFormat') }}</label>
        <div class="radio inline-form-control no-min-width" v-for="fmt in ruleListFormats" :key="fmt">
          <label>
            <input type="radio" name="attachedFormat" :value="fmt"
                   v-model="attached.format"
                   @change="optionsStore.markDirty()" />
            {{ omega.getMessage('ruleListFormat_' + fmt) || fmt }}
          </label>
        </div>
      </div>
      <div class="form-group">
        <label>{{ omega.getMessage('options_group_ruleListUrl') }}</label>
        <input type="url" class="form-control width-limit inline-form-control"
               style="vertical-align: middle"
               v-model="attached.sourceUrl"
               @change="optionsStore.markDirty()" />
      </div>
      <p class="help-block">{{ omega.getMessage('options_ruleListUrlHelp') }}</p>
      <p>
        <button class="btn btn-default"
                :disabled="!attached.sourceUrl || updating"
                :class="attached.sourceUrl && !attached.lastUpdate ? 'btn-primary' : 'btn-default'"
                @click="downloadAttached()">
          <span class="glyphicon glyphicon-download-alt"></span>
          {{ omega.getMessage('options_downloadProfileNow') }}
        </button>
      </p>
    </section>

    <!-- Attached rule list text -->
    <section v-if="attached" class="settings-group">
      <h3>{{ omega.getMessage('options_group_ruleListText') }}</h3>
      <p v-if="attached.sourceUrl && attached.lastUpdate" class="alert alert-success width-limit">
        {{ omega.getMessage('options_ruleListLastUpdate', [formatDate(attached.lastUpdate)]) }}
      </p>
      <p v-if="attached.sourceUrl && !attached.lastUpdate" class="alert alert-danger width-limit">
        {{ omega.getMessage('options_ruleListObsolete') }}
      </p>
      <textarea id="attached-rulelist"
                class="monospace form-control width-limit"
                rows="20"
                v-model="attached.ruleList"
                :disabled="!!attached.sourceUrl"
                @change="optionsStore.markDirty()"></textarea>
    </section>
  </div>
</template>
