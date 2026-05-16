<script setup lang="ts">
import { getMessage as $t } from '@/services/chrome/i18n';
import { formatDate } from '@/composables/useFormatters';
import { NButton, NAlert, NInput, NRadioGroup, NRadio, NText } from 'naive-ui';
import GlyphIcon from '@/components/GlyphIcon.vue';

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
    <div>
      <label>{{ $t('options_ruleListFormat') }}</label>
      <NRadioGroup
        :value="attached.format"
        name="attachedFormat"
        @update:value="(val: string) => { attached.format = val; emit('dirty'); }"
      >
        <NRadio
          v-for="fmt in ruleListFormats"
          :key="fmt"
          :value="fmt"
          style="margin-right: 12px;"
        >
          {{ $t('ruleListFormat_' + fmt) || fmt }}
        </NRadio>
      </NRadioGroup>
    </div>
    <div>
      <label>{{ $t('options_group_ruleListUrl') }}</label>
      <NInput
        v-model:value="attached.sourceUrl"
        style="vertical-align: middle"
        @update:value="emit('dirty')"
      />
    </div>
    <NText depth="3" style="font-size: 12px">
      {{ $t('options_ruleListUrlHelp') }}
    </NText>
    <p>
      <NButton
        :type="attached.sourceUrl && !attached.lastUpdate ? 'primary' : 'default'"
        :disabled="!attached.sourceUrl || updating"
        @click="emit('download')"
      >
        <GlyphIcon name="download-alt" />
        {{ $t('options_downloadProfileNow') }}
      </NButton>
    </p>
  </section>

  <!-- Attached rule list text -->
  <section class="settings-group">
    <h3>{{ $t('options_group_ruleListText') }}</h3>
    <NAlert
      v-if="attached.sourceUrl && attached.lastUpdate"
      type="success"
      style="margin-bottom: 12px"
    >
      {{ $t('options_ruleListLastUpdate', [formatDate(attached.lastUpdate)]) }}
    </NAlert>
    <NAlert
      v-if="attached.sourceUrl && !attached.lastUpdate"
      type="error"
      style="margin-bottom: 12px"
    >
      {{ $t('options_ruleListObsolete') }}
    </NAlert>
    <NInput
      type="textarea"
      v-model:value="attached.ruleList"
      :rows="20"
      :disabled="!!attached.sourceUrl"
      style="font-family: monospace"
      @update:value="emit('dirty')"
    />
  </section>
</template>
