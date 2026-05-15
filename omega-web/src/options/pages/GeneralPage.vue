<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { useOptionsStore } from '@/stores/options';

const optionsStore = useOptionsStore();

const downloadIntervals = [15, 60, 180, 360, 720, 1440, -1];

function downloadIntervalLabel(interval: number): string {
  const key = interval < 0 ? 'never' : String(interval);
  return $t(`options_downloadInterval_${  key}`) || String(interval);
}
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ $t('options_tab_general') }}</h2>
    </div>

    <!-- Network Requests -->
    <section class="settings-group">
      <h3>{{ $t('options_group_networkRequests') }}</h3>
      <div class="checkbox">
        <label>
          <input
            v-model="optionsStore.options['-monitorWebRequests']"
            type="checkbox"
            @change="optionsStore.markDirty()"
          >
          <span>{{ $t('options_monitorWebRequests') }}</span>
        </label>
        <p
          class="help-block"
          v-html="$t('options_monitorWebRequestsHelp')"
        />
      </div>
    </section>

    <!-- Download Options -->
    <section class="settings-group width-limit">
      <h3>{{ $t('options_downloadOptions') }}</h3>
      <p class="help-block">
        {{ $t('options_downloadOptionsHelp') }}
      </p>
      <div class="form-group">
        <label for="download-interval">{{ $t('options_downloadInterval') }}</label>
        <select
          id="download-interval"
          v-model.number="optionsStore.options['-downloadInterval']"
          class="form-control inline-form-control"
          @change="optionsStore.markDirty()"
        >
          <option
            v-for="interval in downloadIntervals"
            :key="interval"
            :value="interval"
          >
            {{ downloadIntervalLabel(interval) }}
          </option>
        </select>
      </div>
    </section>

    <!-- Conflicts -->
    <section class="settings-group width-limit">
      <h3>{{ $t('options_group_conflicts') }}</h3>
      <p>{{ $t('options_conflicts_introduction') }}</p>
      <p class="help-text text-danger">
        <span style="padding: 1px 4px; background: #da4f49; color: #fff; box-shadow: #ccc 1px 1px 1px 1px;">=</span>
        {{ $t('options_conflicts_lowerPriority') }}
      </p>
      <p class="help-text text-info">
        <span class="glyphicon glyphicon-info-sign" />
        <span v-html="$t('options_conflicts_higherPriority', [$t('profile_system') || 'system'])" />
      </p>

      <div class="checkbox">
        <label>
          <input
            v-model="optionsStore.options['-showExternalProfile']"
            type="checkbox"
            @change="optionsStore.markDirty()"
          >
          <span>{{ $t('options_showExternalProfile') }}</span>
        </label>
      </div>
      <p
        class="help-block"
        v-html="$t('options_showExternalProfileHelp', [$t('profile_system') || 'system', $t('popup_externalProfile') || 'External Profile'])"
      />
    </section>
  </div>
</template>
