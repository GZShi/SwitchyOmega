<script setup lang="ts">
import { computed } from 'vue';
import { getMessage as $t } from '@/services/chrome/i18n';
import { NCheckbox, NSelect, NText } from 'naive-ui';
import { useOptionsStore } from '@/stores/options';
import GlyphIcon from '@/components/GlyphIcon.vue';

const optionsStore = useOptionsStore();

const downloadIntervals = [15, 60, 180, 360, 720, 1440, -1];

function downloadIntervalLabel(interval: number): string {
  const key = interval < 0 ? 'never' : String(interval);
  return $t(`options_downloadInterval_${  key}`) || String(interval);
}

const downloadIntervalOptions = computed(() =>
  downloadIntervals.map(interval => ({
    label: downloadIntervalLabel(interval),
    value: interval,
  })),
);
</script>

<template>
  <div>
    <div>
      <h2>{{ $t('options_tab_general') }}</h2>
    </div>

    <!-- Network Requests -->
    <section class="settings-group">
      <h3>{{ $t('options_group_networkRequests') }}</h3>
      <div>
        <NCheckbox
          v-model:checked="optionsStore.options['-monitorWebRequests']"
          @update:checked="optionsStore.markDirty()"
        >
          {{ $t('options_monitorWebRequests') }}
        </NCheckbox>
        <NText depth="3" style="font-size: 12px">
          <span v-html="$t('options_monitorWebRequestsHelp')" />
        </NText>
      </div>
    </section>

    <!-- Download Options -->
    <section class="settings-group width-limit">
      <h3>{{ $t('options_downloadOptions') }}</h3>
      <NText depth="3" style="font-size: 12px">
        {{ $t('options_downloadOptionsHelp') }}
      </NText>
      <div>
        <label for="download-interval">{{ $t('options_downloadInterval') }}</label>
        <NSelect
          id="download-interval"
          :options="downloadIntervalOptions"
          :value="optionsStore.options['-downloadInterval']"
          @update:value="(val: number) => { optionsStore.options['-downloadInterval'] = val; optionsStore.markDirty(); }"
        />
      </div>
    </section>

    <!-- Conflicts -->
    <section class="settings-group width-limit">
      <h3>{{ $t('options_group_conflicts') }}</h3>
      <p>{{ $t('options_conflicts_introduction') }}</p>
      <p style="color: #da4f49;">
        <span style="padding: 1px 4px; background: #da4f49; color: #fff; box-shadow: #ccc 1px 1px 1px 1px;">=</span>
        {{ $t('options_conflicts_lowerPriority') }}
      </p>
      <p style="color: #31708f;">
        <GlyphIcon name="info-sign" />
        <span v-html="$t('options_conflicts_higherPriority', [$t('profile_system') || 'system'])" />
      </p>

      <div>
        <NCheckbox
          v-model:checked="optionsStore.options['-showExternalProfile']"
          @update:checked="optionsStore.markDirty()"
        >
          {{ $t('options_showExternalProfile') }}
        </NCheckbox>
      </div>
      <NText depth="3" style="font-size: 12px">
        <span v-html="$t('options_showExternalProfileHelp', [$t('profile_system') || 'system', $t('popup_externalProfile') || 'External Profile'])" />
      </NText>
    </section>
  </div>
</template>
