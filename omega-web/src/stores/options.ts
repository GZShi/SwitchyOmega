import { defineStore } from "pinia";
import { ref } from "vue";
import { useOmegaTarget } from "@/composables/useOmegaTarget";
import { useOmegaPac } from "@/composables/useOmegaPac";

import * as jsondiffpatch from "jsondiffpatch";

const diffEngine = jsondiffpatch.create({
  objectHash: (obj: any) => JSON.stringify(obj),
  textDiff: { minLength: Infinity },
});

export const useOptionsStore = defineStore("options", () => {
  const omega = useOmegaTarget();
  const OmegaPac = useOmegaPac();

  const options = ref<Record<string, any>>({});
  const optionsOld = ref<Record<string, any> | null>(null);
  const optionsDirty = ref(false);

  // Callbacks registered via addOptionsChangeCallback
  const changeCallbacks: Array<(opts: Record<string, any>) => void> = [];

  function init() {
    omega.addOptionsChangeCallback((newOptions: Record<string, any>) => {
      options.value = JSON.parse(JSON.stringify(newOptions));
      optionsOld.value = JSON.parse(JSON.stringify(newOptions));
      optionsDirty.value = false;
      for (const cb of changeCallbacks) {
        cb(options.value);
      }
    });
    omega.refresh();
  }

  function onOptionsChange(cb: (opts: Record<string, any>) => void) {
    changeCallbacks.push(cb);
  }

  async function applyOptions(): Promise<void> {
    if (optionsDirty.value && optionsOld.value) {
      const plainOptions = JSON.parse(JSON.stringify(options.value));
      const patch = diffEngine.diff(optionsOld.value, plainOptions);
      await omega.optionsPatch(patch);
      showAlert("success", omega.getMessage("options_saveSuccess"));
    }
  }

  async function resetOptions(opt?: any): Promise<void> {
    try {
      await omega.resetOptions(opt);
      showAlert("success", omega.getMessage("options_resetSuccess"));
    } catch (err: any) {
      showAlert("error", String(err));
      throw err;
    }
  }

  function revertOptions() {
    window.location.reload();
  }

  function showAlert(type: string, message: string) {
    const ui = (window as any).__omegaUi;
    if (ui?.showAlert) {
      ui.showAlert(type, message);
    }
  }

  function markDirty() {
    optionsDirty.value = true;
  }

  // Profile helpers
  function profileByName(name: string): any {
    return OmegaPac.Profiles.byName(name, options.value);
  }

  function newProfile(profile: any) {
    const created = OmegaPac.Profiles.create(profile);
    const colors = [
      "#9ce",
      "#9d9",
      "#fa8",
      "#fe9",
      "#d497ee",
      "#47b",
      "#5b5",
      "#d63",
      "#ca0",
    ];
    created.color =
      created.color ?? colors[Math.floor(Math.random() * colors.length)];
    OmegaPac.Profiles.updateRevision(created);
    options.value[OmegaPac.Profiles.nameAsKey(created)] = created;
    markDirty();
    return created;
  }

  function deleteProfile(name: string) {
    const key = OmegaPac.Profiles.nameAsKey(name);
    delete options.value[key];
    // Clean attached
    const attachedKey = OmegaPac.Profiles.nameAsKey(`__ruleListOf_${name}`);
    delete options.value[attachedKey];
    // Clean startup
    if (options.value["-startupProfileName"] === name) {
      options.value["-startupProfileName"] = "";
    }
    // Clean quick switch
    const qs = options.value["-quickSwitchProfiles"];
    if (qs) {
      const idx = qs.indexOf(name);
      if (idx >= 0) qs.splice(idx, 1);
    }
    markDirty();
  }

  return {
    options,
    optionsOld,
    optionsDirty,
    init,
    onOptionsChange,
    applyOptions,
    resetOptions,
    revertOptions,
    markDirty,
    profileByName,
    newProfile,
    deleteProfile,
  };
});
