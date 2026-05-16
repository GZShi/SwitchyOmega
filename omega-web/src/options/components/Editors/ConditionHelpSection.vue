<script setup lang="ts">
import { ref } from 'vue';
import { getMessage as $t } from '@/services/chrome/i18n';
import GlyphIcon from '@/components/GlyphIcon.vue';

const props = defineProps<{
  conditionTypes: Array<{ group: string; types: string[] }>;
  isUrlConditionType: Record<string, boolean>;
}>();

const expandedSection = ref(0);

function getConditionTypeLabel(type: string): string {
  return $t(`condition_${type}`) || type;
}
function getConditionGroupLabel(group: string): string {
  return $t(`condition_group_${group}`) || '';
}
</script>

<template>
  <section class="condition-help-section settings-group">
    <h3>
      {{ $t('options_group_conditionHelp') }}
      <button
        class="close close-condition-help"
        type="button"
        @click="$emit('close')"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </h3>
    <div
      v-for="(group, gidx) in props.conditionTypes"
      :key="group.group"
      class="condition-help"
    >
      <h4 v-if="getConditionGroupLabel(group.group)">
        <a
          role="button"
          @click="expandedSection = gidx"
        >
          <GlyphIcon
            :name="expandedSection === gidx ? 'chevron-down' : 'chevron-right'"
          />
          {{ getConditionGroupLabel(group.group) }}
        </a>
      </h4>
      <dl v-if="expandedSection === gidx">
        <template
          v-for="type in group.types"
          :key="type"
        >
          <dt>{{ getConditionTypeLabel(type) }}</dt>
          <dd>
            <div v-html="$t('condition_help_' + type)" />
            <div
              v-if="props.isUrlConditionType[type]"
              style="color: #a94442"
            >
              <GlyphIcon name="alert" />
              <span v-html="$t('condition_alert_fullUrlLimitation')" />
            </div>
          </dd>
        </template>
      </dl>
    </div>
  </section>
</template>
