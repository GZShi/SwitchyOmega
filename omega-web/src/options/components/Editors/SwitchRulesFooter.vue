<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { NButton, NCheckbox } from 'naive-ui';
import ProfileSelect from '@/options/components/ProfileSelect.vue';
import GlyphIcon from '@/components/GlyphIcon.vue';

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
        <NButton
          size="small"
          @click="emit('addRule')"
        >
          <GlyphIcon name="plus" />
          {{ $t('options_addCondition') }}
        </NButton>
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
        <GlyphIcon :name="props.profileIcon" />
      </td>
      <td style="border-left: none;">
        <NCheckbox
          :checked="props.attachedOptionsEnabled"
          @update:checked="emit('update:attachedOptionsEnabled', $event); emit('dirty')"
        >
          {{ $t('options_switchAttachedProfileInCondition') }}
        </NCheckbox>
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
        <NButton
          type="error"
          size="small"
          :title="$t('options_deleteAttached')"
          @click="emit('removeAttached')"
        >
          <GlyphIcon name="trash" />
        </NButton>
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
        <NButton
          type="info"
          size="small"
          :title="$t('options_resetRules_help')"
          @click="emit('resetRules')"
        >
          <GlyphIcon name="chevron-up" />
        </NButton>
      </td>
      <td v-if="props.showNotes" />
    </tr>
  </tbody>
</template>
