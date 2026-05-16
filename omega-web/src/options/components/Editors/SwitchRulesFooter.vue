<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import ProfileSelect from '@/options/components/ProfileSelect.vue';

const props = defineProps<{
  showNotes: boolean;
  attached: any | null;
  attachedMatchProfileName: string | undefined;
  attachedOptionsEnabled: boolean;
  attachedOptionsDefaultProfileName: string;
  validResultProfiles: any[];
  profileIcon: string;
}>();

const emit = defineEmits<{
  addRule: [];
  removeAttached: [];
  resetRules: [];
  'update:attachedMatchProfileName': [value: string];
  'update:attachedOptionsEnabled': [value: boolean];
  'update:attachedOptionsDefaultProfileName': [value: string];
  dirty: [];
}>();
</script>

<template>
  <!-- Add rule button row -->
  <tbody>
    <tr>
      <td style="border-right: none;" />
      <td
        style="border-left: none;"
        :colspan="props.showNotes ? 5 : 4"
      >
        <button
          class="btn btn-default btn-sm"
          @click="emit('addRule')"
        >
          <span class="glyphicon glyphicon-plus" />
          {{ $t('options_addCondition') }}
        </button>
      </td>
    </tr>
  </tbody>
  <!-- Attached profile row -->
  <tbody
    v-if="props.attached"
    class="switch-attached"
  >
    <tr>
      <td style="border-right: none;">
        <span
          class="glyphicon"
          :class="props.profileIcon"
        />
      </td>
      <td style="border-left: none;">
        <span class="checkbox">
          <label>
            <input
              type="checkbox"
              :checked="props.attachedOptionsEnabled"
              @change="emit('update:attachedOptionsEnabled', ($event.target as HTMLInputElement).checked); emit('dirty')"
            >
            {{ $t('options_switchAttachedProfileInCondition') }}
          </label>
        </span>
      </td>
      <td>
        <span v-if="props.attachedOptionsEnabled">
          {{ $t('options_switchAttachedProfileInConditionDetails') }}
        </span>
        <span v-else>
          {{ $t('options_switchAttachedProfileInConditionDisabled') }}
        </span>
      </td>
      <td>
        <ProfileSelect
          :profiles="props.validResultProfiles"
          :model-value="props.attachedMatchProfileName"
          :class="{ disabled: !props.attachedOptionsEnabled }"
          @update:model-value="emit('update:attachedMatchProfileName', $event); emit('dirty')"
        />
      </td>
      <td>
        <button
          class="btn btn-danger btn-sm"
          :title="$t('options_deleteAttached')"
          @click="emit('removeAttached')"
        >
          <span class="glyphicon glyphicon-trash" />
        </button>
      </td>
      <td v-if="props.showNotes" />
    </tr>
  </tbody>
  <!-- Default profile row -->
  <tbody>
    <tr class="switch-default-row">
      <td />
      <td colspan="2">
        {{ $t('options_switchDefaultProfile') }}
      </td>
      <td>
        <ProfileSelect
          :profiles="props.validResultProfiles"
          :model-value="props.attachedOptionsDefaultProfileName"
          @update:model-value="emit('update:attachedOptionsDefaultProfileName', $event); emit('dirty')"
        />
      </td>
      <td>
        <button
          class="btn btn-info btn-sm"
          :title="$t('options_resetRules_help')"
          @click="emit('resetRules')"
        >
          <span class="glyphicon glyphicon-chevron-up" />
        </button>
      </td>
      <td v-if="props.showNotes" />
    </tr>
  </tbody>
</template>
