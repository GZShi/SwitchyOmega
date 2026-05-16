<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { useOptionsStore } from '@/stores/options';
import { NInput, NInputNumber, NCheckbox } from 'naive-ui';

const condition = defineModel<any>('condition', { required: true });
defineProps<{ showNotes?: boolean }>();

const optionsStore = useOptionsStore();
const weekdayChars = 'SMTWtFs';

function getWeekdayList(days: any): boolean[] {
  const dayStr = days ?? '-------';
  return weekdayChars.split('').map((_, i) => dayStr[i] !== '-');
}

function updateDay(i: number, selected: boolean) {
  condition.value.days = condition.value.days ?? '-------';
  const char = selected ? weekdayChars[i] : '-';
  condition.value.days =
    condition.value.days.substring(0, i) + char + condition.value.days.substring(i + 1);
  delete condition.value.startDay;
  delete condition.value.endDay;
  optionsStore.markDirty();
}
</script>

<template>
  <!-- FalseCondition -->
  <template v-if="condition.conditionType === 'FalseCondition'">
    <NInput
      v-if="condition.pattern"
      :value="condition.pattern"
      disabled
      :title="$t('condition_details_FalseCondition')"
    />
    <span v-else>{{ $t('condition_details_FalseCondition') }}</span>
  </template>
  <!-- HostLevels -->
  <span
    v-else-if="condition.conditionType === 'HostLevelsCondition'"
    class="host-levels-details"
  >
    <NInputNumber
      v-model:value="condition.minValue"
      :min="1"
      :max="99"
      @update:value="optionsStore.markDirty()"
    />
    <span>{{ $t('options_hostLevelsBetween') }}</span>
    <NInputNumber
      v-model:value="condition.maxValue"
      :min="1"
      :max="99"
      @update:value="optionsStore.markDirty()"
    />
  </span>
  <!-- IP -->
  <span v-else-if="condition.conditionType === 'IpCondition'">
    <NInput
      v-model:value="condition.pattern"
      placeholder="127.0.0.1/8"
      @update:value="optionsStore.markDirty()"
    />
  </span>
  <!-- Time -->
  <span
    v-else-if="condition.conditionType === 'TimeCondition'"
    class="host-levels-details"
  >
    <NInputNumber
      v-model:value="condition.startHour"
      :min="0"
      :max="23"
      @update:value="optionsStore.markDirty()"
    />
    <span>{{ $t('options_hourBetween') }}</span>
    <NInputNumber
      v-model:value="condition.endHour"
      :min="0"
      :max="23"
      @update:value="optionsStore.markDirty()"
    />
  </span>
  <!-- Weekday -->
  <span
    v-else-if="condition.conditionType === 'WeekdayCondition'"
    class="host-levels-details"
  >
    <label
      v-for="(_, i) in 'SMTWtFs'.split('')"
      :key="i"
    >
      <NCheckbox
        :checked="getWeekdayList(condition.days)[i]"
        @update:checked="(v: boolean) => updateDay(i, v)"
      />
      {{ $t('options_weekDayShort_' + i) || 'SMTWTFS'[i] }}
    </label>
  </span>
  <!-- Default (pattern input) -->
  <NInput
    v-else
    v-model:value="condition.pattern"
    @update:value="optionsStore.markDirty()"
  />
</template>
