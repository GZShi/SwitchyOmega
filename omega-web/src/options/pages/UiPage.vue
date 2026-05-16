<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NCheckbox, NText, NTag } from 'naive-ui';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import ProfileSelect from '@/options/components/ProfileSelect.vue';
import ProfileInline from '@/options/components/ProfileInline.vue';
import GlyphIcon from '@/components/GlyphIcon.vue';

const omega = useOmegaTarget();
const optionsStore = useOptionsStore();
const profilesStore = useProfilesStore();

const allProfiles = computed(() => {
  const profiles: any[] = [];
  for (const key of Object.keys(optionsStore.options)) {
    if (key.startsWith('+')) {
      const p = optionsStore.options[key];
      if (!profilesStore.isProfileNameReserved(p.name)) {
        profiles.push(p);
      }
    }
  }
  // Add builtins
  const builtins = profilesStore.builtinProfiles;
  if (builtins) {
    for (const key of Object.keys(builtins)) {
      profiles.push(builtins[key]);
    }
  }
  return profiles;
});

const quickSwitchProfiles = computed({
  get: () => optionsStore.options['-quickSwitchProfiles'] ?? [],
  set: (val: string[]) => {
    optionsStore.options['-quickSwitchProfiles'] = val;
    optionsStore.markDirty();
  },
});

const notCycledProfiles = computed(() => {
  const cycled = new Set(quickSwitchProfiles.value);
  return profilesStore.visibleProfiles
    .filter(p => !cycled.has(p.name))
    .map(p => p.name);
});

function addToCycle(name: string) {
  const list = [...quickSwitchProfiles.value, name];
  quickSwitchProfiles.value = list;
}

function removeFromCycle(index: number) {
  const list = [...quickSwitchProfiles.value];
  list.splice(index, 1);
  quickSwitchProfiles.value = list;
}

function openShortcutConfig() {
  omega.openShortcutConfig();
}
</script>

<template>
  <div>
    <div>
      <h2>{{ $t('options_tab_ui') }}</h2>
    </div>

    <!-- Misc Options -->
    <section class="settings-group">
      <h3>{{ $t('options_group_miscOptions') }}</h3>
      <div>
        <NCheckbox
          v-model:checked="optionsStore.options['-confirmDeletion']"
          @update:checked="optionsStore.markDirty()"
        >
          {{ $t('options_confirmDeletion') }}
        </NCheckbox>
      </div>
      <div>
        <NCheckbox
          v-model:checked="optionsStore.options['-refreshOnProfileChange']"
          @update:checked="optionsStore.markDirty()"
        >
          {{ $t('options_refreshOnProfileChange') }}
        </NCheckbox>
      </div>
      <div>
        <NCheckbox
          v-model:checked="optionsStore.options['-showInspectMenu']"
          @update:checked="optionsStore.markDirty()"
        >
          {{ $t('options_showInspectMenu') }}
        </NCheckbox>
      </div>
      <div>
        <NCheckbox
          v-model:checked="optionsStore.options['-addConditionsToBottom']"
          @update:checked="optionsStore.markDirty()"
        >
          {{ $t('options_addConditionsToBottom') }}
        </NCheckbox>
      </div>
    </section>

    <!-- Keyboard Shortcut -->
    <section class="settings-group">
      <h3>{{ $t('options_group_keyboardShortcut') }}</h3>
      <p>
        <NButton
          @click="openShortcutConfig()"
        >
          <GlyphIcon name="share-alt" />
          {{ $t('options_menuShortcutConfigure') }}
        </NButton>
        {{ $t('options_menuShortcutHelp') }}
      </p>
      <NText depth="3" style="font-size: 12px">
        {{ $t('options_menuShortcutMore') }}
      </NText>
    </section>

    <!-- Switch Options -->
    <section class="settings-group">
      <h3>{{ $t('options_group_switchOptions') }}</h3>

      <!-- Startup Profile -->
      <div>
        <label>{{ $t('options_startupProfile') }}</label>
        <ProfileSelect
          style="display: inline-block;"
          :profiles="allProfiles"
          :model-value="optionsStore.options['-startupProfileName'] || ''"
          @update:model-value="optionsStore.options['-startupProfileName'] = $event; optionsStore.markDirty()"
        />
      </div>

      <!-- Show advanced condition types -->
      <div>
        <NCheckbox
          :checked="optionsStore.options['-showConditionTypes'] > 0"
          @update:checked="optionsStore.options['-showConditionTypes'] = $event ? 1 : 0; optionsStore.markDirty()"
        >
          {{ $t('options_showConditionTypesAdvanced') }}
        </NCheckbox>
        <NText depth="3" style="font-size: 12px">
          {{ $t('options_showConditionTypesAdvancedHelp') }}
        </NText>
      </div>

      <!-- Quick Switch -->
      <div>
        <NCheckbox
          v-model:checked="optionsStore.options['-enableQuickSwitch']"
          @update:checked="optionsStore.markDirty()"
        >
          {{ $t('options_quickSwitch') }}
        </NCheckbox>
      </div>

      <div
        v-if="optionsStore.options['-enableQuickSwitch']"
        id="quick-switch-settings"
        class="settings-group"
      >
        <h4>{{ $t('options_cycledProfiles') }}</h4>
        <NText depth="3" style="font-size: 12px">
          {{ $t('options_cycledProfilesHelp') }}
        </NText>
        <div
          v-if="quickSwitchProfiles.length < 2"
        >
          <NText depth="3" style="font-size: 12px">
            {{ $t('options_cycledProfilesTooFew') }}
          </NText>
        </div>

        <!-- Cycled profiles -->
        <ul class="cycle-profile-container cycle-enabled">
          <li
            v-for="(name, idx) in quickSwitchProfiles"
            :key="name + idx"
          >
            <ProfileInline :name="name" />
            <NButton
              size="tiny"
              type="error"
              style="float: right;"
              @click="removeFromCycle(idx)"
            >
              <GlyphIcon name="remove" />
            </NButton>
          </li>
        </ul>

        <!-- Not cycled profiles -->
        <h4>{{ $t('options_notCycledProfiles') }}</h4>
        <ul class="cycle-profile-container">
          <li
            v-for="name in notCycledProfiles"
            :key="name"
          >
            <NTag type="success" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <ProfileInline :name="name" />
              <NButton
                size="tiny"
                @click="addToCycle(name)"
              >
                <GlyphIcon name="plus" />
              </NButton>
            </NTag>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
