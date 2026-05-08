<script setup lang="ts">
import { ref, computed, watch } from 'vue';
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
  get: () => optionsStore.options['-quickSwitchProfiles'] || [],
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
    <div class="page-header" style="position: static; background: none; max-height: none; padding: 0 0 10px 0; margin: 0 0 20px 0; border-bottom: 1px solid #eee;">
      <h2>{{ omega.getMessage('options_tab_ui') }}</h2>
    </div>

    <!-- Misc Options -->
    <section class="settings-group">
      <h3>{{ omega.getMessage('options_group_miscOptions') }}</h3>
      <div class="checkbox">
        <label>
          <input type="checkbox" v-model="optionsStore.options['-confirmDeletion']"
                 @change="optionsStore.markDirty()" />
          <span>{{ omega.getMessage('options_confirmDeletion') }}</span>
        </label>
      </div>
      <div class="checkbox">
        <label>
          <input type="checkbox" v-model="optionsStore.options['-refreshOnProfileChange']"
                 @change="optionsStore.markDirty()" />
          <span>{{ omega.getMessage('options_refreshOnProfileChange') }}</span>
        </label>
      </div>
      <div class="checkbox">
        <label>
          <input type="checkbox" v-model="optionsStore.options['-showInspectMenu']"
                 @change="optionsStore.markDirty()" />
          <span>{{ omega.getMessage('options_showInspectMenu') }}</span>
        </label>
      </div>
      <div class="checkbox">
        <label>
          <input type="checkbox" v-model="optionsStore.options['-addConditionsToBottom']"
                 @change="optionsStore.markDirty()" />
          <span>{{ omega.getMessage('options_addConditionsToBottom') }}</span>
        </label>
      </div>
    </section>

    <!-- Keyboard Shortcut -->
    <section class="settings-group">
      <h3>{{ omega.getMessage('options_group_keyboardShortcut') }}</h3>
      <p>
        <button class="btn btn-default" type="button" @click="openShortcutConfig()">
          <span class="glyphicon glyphicon-share-alt"></span>
          {{ omega.getMessage('options_menuShortcutConfigure') }}
        </button>
        {{ omega.getMessage('options_menuShortcutHelp') }}
      </p>
      <p class="help-block">{{ omega.getMessage('options_menuShortcutMore') }}</p>
    </section>

    <!-- Switch Options -->
    <section class="settings-group">
      <h3>{{ omega.getMessage('options_group_switchOptions') }}</h3>

      <!-- Startup Profile -->
      <div class="form-group">
        <label>{{ omega.getMessage('options_startupProfile') }}</label>
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
          <input type="checkbox"
                 :checked="optionsStore.options['-showConditionTypes'] > 0"
                 @change="optionsStore.options['-showConditionTypes'] = ($event.target as HTMLInputElement).checked ? 1 : 0; optionsStore.markDirty()" />
          <span>{{ omega.getMessage('options_showConditionTypesAdvanced') }}</span>
        </label>
        <p class="help-block">{{ omega.getMessage('options_showConditionTypesAdvancedHelp') }}</p>
      </div>

      <!-- Quick Switch -->
      <div class="checkbox">
        <label>
          <input type="checkbox" v-model="optionsStore.options['-enableQuickSwitch']"
                 @change="optionsStore.markDirty()" />
          <span>{{ omega.getMessage('options_quickSwitch') }}</span>
        </label>
      </div>

      <div v-if="optionsStore.options['-enableQuickSwitch']" id="quick-switch-settings" class="settings-group">
        <h4>{{ omega.getMessage('options_cycledProfiles') }}</h4>
        <p class="help-block">{{ omega.getMessage('options_cycledProfilesHelp') }}</p>
        <div v-if="quickSwitchProfiles.length < 2" class="has-error">
          <p class="help-block">{{ omega.getMessage('options_cycledProfilesTooFew') }}</p>
        </div>

        <!-- Cycled profiles -->
        <ul class="cycle-profile-container cycle-enabled">
          <li v-for="(name, idx) in quickSwitchProfiles" :key="name + idx">
            <ProfileInline :name="name" />
            <button class="btn btn-xs btn-danger pull-right" @click="removeFromCycle(idx)">
              <span class="glyphicon glyphicon-remove"></span>
            </button>
          </li>
        </ul>

        <!-- Not cycled profiles -->
        <h4>{{ omega.getMessage('options_notCycledProfiles') }}</h4>
        <ul class="cycle-profile-container">
          <li v-for="name in notCycledProfiles" :key="name" class="bg-success">
            <ProfileInline :name="name" />
            <button class="btn btn-xs btn-default pull-right" @click="addToCycle(name)">
              <span class="glyphicon glyphicon-plus"></span>
            </button>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
