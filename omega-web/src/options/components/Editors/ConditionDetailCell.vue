<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { useOptionsStore } from '@/stores/options';

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
    <input
      v-if="condition.pattern"
      v-model="condition.pattern"
      class="form-control"
      disabled
      :title="$t('condition_details_FalseCondition')"
    >
    <span v-else>{{ $t('condition_details_FalseCondition') }}</span>
  </template>
  <!-- HostLevels -->
  <span
    v-else-if="condition.conditionType === 'HostLevelsCondition'"
    class="host-levels-details"
  >
    <input
      v-model.number="condition.minValue"
      class="form-control"
      type="number"
      min="1"
      max="99"
      @change="optionsStore.markDirty()"
    >
    <span>{{ $t('options_hostLevelsBetween') }}</span>
    <input
      v-model.number="condition.maxValue"
      class="form-control"
      type="number"
      min="1"
      max="99"
      @change="optionsStore.markDirty()"
    >
  </span>
  <!-- IP -->
  <span v-else-if="condition.conditionType === 'IpCondition'">
    <input
      v-model="condition.pattern"
      class="form-control"
      type="text"
      placeholder="127.0.0.1/8"
      @change="optionsStore.markDirty()"
    >
  </span>
  <!-- Time -->
  <span
    v-else-if="condition.conditionType === 'TimeCondition'"
    class="host-levels-details"
  >
    <input
      v-model.number="condition.startHour"
      class="form-control"
      type="number"
      min="0"
      max="23"
      @change="optionsStore.markDirty()"
    >
    <span>{{ $t('options_hourBetween') }}</span>
    <input
      v-model.number="condition.endHour"
      class="form-control"
      type="number"
      min="0"
      max="23"
      @change="optionsStore.markDirty()"
    >
  </span>
  <!-- Weekday -->
  <span
    v-else-if="condition.conditionType === 'WeekdayCondition'"
    class="host-levels-details"
  >
    <label
      v-for="(_, i) in 'SMTWtFs'.split('')"
      :key="i"
      class="checkbox-inline"
    >
      <input
        type="checkbox"
        :checked="getWeekdayList(condition.days)[i]"
        @change="updateDay(i, ($event.target as HTMLInputElement).checked)"
      >
      {{ $t('options_weekDayShort_' + i) || 'SMTWTFS'[i] }}
    </label>
  </span>
  <!-- Default (pattern input) -->
  <input
    v-else
    v-model="condition.pattern"
    class="form-control"
    type="text"
    required
    @change="optionsStore.markDirty()"
  >
</template>
