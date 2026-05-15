<script setup lang="ts">
import { computed } from 'vue';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOptionsStore } from '@/stores/options';
import { useProfilesStore } from '@/stores/profiles';
import ProfileSelect from '@/options/components/ProfileSelect.vue';
import ProfileInline from '@/options/components/ProfileInline.vue';

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
    <div class="page-header">
      <h2>{{ $t('options_tab_ui') }}</h2>
    </div>

    <!-- Misc Options -->
    <section class="settings-group">
      <h3>{{ $t('options_group_miscOptions') }}</h3>
      <div class="checkbox">
        <label>
          <input
            v-model="optionsStore.options['-confirmDeletion']"
            type="checkbox"
            @change="optionsStore.markDirty()"
          >
          <span>{{ $t('options_confirmDeletion') }}</span>
        </label>
      </div>
      <div class="checkbox">
        <label>
          <input
            v-model="optionsStore.options['-refreshOnProfileChange']"
            type="checkbox"
            @change="optionsStore.markDirty()"
          >
          <span>{{ $t('options_refreshOnProfileChange') }}</span>
        </label>
      </div>
      <div class="checkbox">
        <label>
          <input
            v-model="optionsStore.options['-showInspectMenu']"
            type="checkbox"
            @change="optionsStore.markDirty()"
          >
          <span>{{ $t('options_showInspectMenu') }}</span>
        </label>
      </div>
      <div class="checkbox">
        <label>
          <input
            v-model="optionsStore.options['-addConditionsToBottom']"
            type="checkbox"
            @change="optionsStore.markDirty()"
          >
          <span>{{ $t('options_addConditionsToBottom') }}</span>
        </label>
      </div>
    </section>

    <!-- Keyboard Shortcut -->
    <section class="settings-group">
      <h3>{{ $t('options_group_keyboardShortcut') }}</h3>
      <p>
        <button
          class="btn btn-default"
          type="button"
          @click="openShortcutConfig()"
        >
          <span class="glyphicon glyphicon-share-alt" />
          {{ $t('options_menuShortcutConfigure') }}
        </button>
        {{ $t('options_menuShortcutHelp') }}
      </p>
      <p class="help-block">
        {{ $t('options_menuShortcutMore') }}
      </p>
    </section>

    <!-- Switch Options -->
    <section class="settings-group">
      <h3>{{ $t('options_group_switchOptions') }}</h3>

      <!-- Startup Profile -->
      <div class="form-group">
        <label>{{ $t('options_startupProfile') }}</label>
        <ProfileSelect
          style="display: inline-block;"
          :profiles="allProfiles"
          :model-value="optionsStore.options['-startupProfileName'] || ''"
          @update:model-value="optionsStore.options['-startupProfileName'] = $event; optionsStore.markDirty()"
        />
      </div>

      <!-- Show advanced condition types -->
      <div class="checkbox">
        <label>
          <input
            type="checkbox"
            :checked="optionsStore.options['-showConditionTypes'] > 0"
            @change="optionsStore.options['-showConditionTypes'] = ($event.target as HTMLInputElement).checked ? 1 : 0; optionsStore.markDirty()"
          >
          <span>{{ $t('options_showConditionTypesAdvanced') }}</span>
        </label>
        <p class="help-block">
          {{ $t('options_showConditionTypesAdvancedHelp') }}
        </p>
      </div>

      <!-- Quick Switch -->
      <div class="checkbox">
        <label>
          <input
            v-model="optionsStore.options['-enableQuickSwitch']"
            type="checkbox"
            @change="optionsStore.markDirty()"
          >
          <span>{{ $t('options_quickSwitch') }}</span>
        </label>
      </div>

      <div
        v-if="optionsStore.options['-enableQuickSwitch']"
        id="quick-switch-settings"
        class="settings-group"
      >
        <h4>{{ $t('options_cycledProfiles') }}</h4>
        <p class="help-block">
          {{ $t('options_cycledProfilesHelp') }}
        </p>
        <div
          v-if="quickSwitchProfiles.length < 2"
          class="has-error"
        >
          <p class="help-block">
            {{ $t('options_cycledProfilesTooFew') }}
          </p>
        </div>

        <!-- Cycled profiles -->
        <ul class="cycle-profile-container cycle-enabled">
          <li
            v-for="(name, idx) in quickSwitchProfiles"
            :key="name + idx"
          >
            <ProfileInline :name="name" />
            <button
              class="btn btn-xs btn-danger pull-right"
              @click="removeFromCycle(idx)"
            >
              <span class="glyphicon glyphicon-remove" />
            </button>
          </li>
        </ul>

        <!-- Not cycled profiles -->
        <h4>{{ $t('options_notCycledProfiles') }}</h4>
        <ul class="cycle-profile-container">
          <li
            v-for="name in notCycledProfiles"
            :key="name"
            class="bg-success"
          >
            <ProfileInline :name="name" />
            <button
              class="btn btn-xs btn-default pull-right"
              @click="addToCycle(name)"
            >
              <span class="glyphicon glyphicon-plus" />
            </button>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
