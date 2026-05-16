<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { formatDate } from '@/composables/useFormatters';

defineProps<{
  attached: any;
  ruleListFormats: string[];
  updating: boolean;
}>();

const emit = defineEmits<{
  dirty: [];
  download: [];
}>();
</script>

<template>
  <!-- Attached rule list config -->
  <section class="settings-group">
    <h3>{{ $t('options_group_ruleListConfig') }}</h3>
    <div class="form-group">
      <label>{{ $t('options_ruleListFormat') }}</label>
      <div
        v-for="fmt in ruleListFormats"
        :key="fmt"
        class="radio inline-form-control no-min-width"
      >
        <label>
          <input
            v-model="attached.format"
            type="radio"
            name="attachedFormat"
            :value="fmt"
            @change="emit('dirty')"
          >
          {{ $t('ruleListFormat_' + fmt) || fmt }}
        </label>
      </div>
    </div>
    <div class="form-group">
      <label>{{ $t('options_group_ruleListUrl') }}</label>
      <input
        v-model="attached.sourceUrl"
        type="url"
        class="form-control width-limit inline-form-control"
        style="vertical-align: middle"
        @change="emit('dirty')"
      >
    </div>
    <p class="help-block">
      {{ $t('options_ruleListUrlHelp') }}
    </p>
    <p>
      <button
        class="btn btn-default"
        :disabled="!attached.sourceUrl || updating"
        :class="attached.sourceUrl && !attached.lastUpdate ? 'btn-primary' : 'btn-default'"
        @click="emit('download')"
      >
        <span class="glyphicon glyphicon-download-alt" />
        {{ $t('options_downloadProfileNow') }}
      </button>
    </p>
  </section>

  <!-- Attached rule list text -->
  <section class="settings-group">
    <h3>{{ $t('options_group_ruleListText') }}</h3>
    <p
      v-if="attached.sourceUrl && attached.lastUpdate"
      class="alert alert-success width-limit"
    >
      {{ $t('options_ruleListLastUpdate', [formatDate(attached.lastUpdate)]) }}
    </p>
    <p
      v-if="attached.sourceUrl && !attached.lastUpdate"
      class="alert alert-danger width-limit"
    >
      {{ $t('options_ruleListObsolete') }}
    </p>
    <textarea
      id="attached-rulelist"
      v-model="attached.ruleList"
      class="monospace form-control width-limit"
      rows="20"
      :disabled="!!attached.sourceUrl"
      @change="emit('dirty')"
    />
  </section>
</template>
