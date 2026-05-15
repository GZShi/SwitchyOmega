import { defineStore } from "pinia";
import { computed } from "vue";
import { useOptionsStore } from "./options";
import { useOmegaPac } from "@/composables/useOmegaPac";

export const useProfilesStore = defineStore("profiles", () => {
  const optionsStore = useOptionsStore();
  const OmegaPac = useOmegaPac();

  const profileIcons: Record<string, string> = {
    DirectProfile: "glyphicon-transfer",
    SystemProfile: "glyphicon-off",
    FixedProfile: "glyphicon-globe",
    PacProfile: "glyphicon-file",
    VirtualProfile: "glyphicon-question-sign",
    SwitchProfile: "glyphicon-retweet",
    RuleListProfile: "glyphicon-list",
  };

  const profileOrder: Record<string, number> = {
    FixedProfile: -2000,
    PacProfile: -1000,
    VirtualProfile: 1000,
    SwitchProfile: 2000,
    RuleListProfile: 3000,
  };

  const builtinProfiles = computed(() => {
    return OmegaPac.Profiles?.builtinProfiles ?? {};
  });

  const allProfiles = computed(() => {
    const opts = optionsStore.options;
    const result: Array<{ key: string; name: string; profile: any }> = [];
    for (const key of Object.keys(opts)) {
      if (key.startsWith("+")) {
        const name = key.slice(1);
        result.push({ key, name, profile: opts[key] });
      }
    }
    return result;
  });

  const visibleProfiles = computed(() =>
    allProfiles.value.filter((p) => !p.name.startsWith("_")),
  );

  const sortedProfiles = computed(() =>
    [...visibleProfiles.value].sort((a, b) => {
      const typeA = a.profile?.profileType ?? "";
      const typeB = b.profile?.profileType ?? "";
      const orderA = profileOrder[typeA] ?? 0;
      const orderB = profileOrder[typeB] ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    }),
  );

  const profileColors = [
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
  const profileColorPalette = (() => {
    const c = [...profileColors];
    const result: string[][] = [];
    while (c.length) result.push(c.splice(0, 3));
    return result;
  })();

  const charCodeUnderscore = "_".charCodeAt(0);

  function isProfileNameHidden(name: string): boolean {
    return name.charCodeAt(0) === charCodeUnderscore;
  }

  function isProfileNameReserved(name: string): boolean {
    return (
      name.charCodeAt(0) === charCodeUnderscore &&
      name.charCodeAt(1) === charCodeUnderscore
    );
  }

  function getAttachedName(name: string): string {
    return `__ruleListOf_${name}`;
  }

  function getParentName(name: string): string | undefined {
    if (name.startsWith("__ruleListOf_")) {
      return name.substring("__ruleListOf_".length);
    }
    return undefined;
  }

  function getVirtualTarget(profile: any, profiles: Record<string, any>): any {
    let target = profile;
    while (
      target?.profileType === "VirtualProfile" &&
      target.defaultProfileName
    ) {
      target = profiles[`+${target.defaultProfileName}`];
    }
    return target ?? profile;
  }

  function profileByName(name: string): any {
    return optionsStore.options[`+${name}`];
  }

  function referencedBySet(name: string): Record<string, string> {
    if (OmegaPac.Profiles?.referencedBySet) {
      return OmegaPac.Profiles.referencedBySet(name, optionsStore.options);
    }
    return {};
  }

  const selectableProfiles = computed(() => {
    const profiles: any[] = [];
    for (const key of Object.keys(optionsStore.options)) {
      if (key.startsWith("+")) {
        const p = optionsStore.options[key];
        if (!isProfileNameReserved(p.name)) profiles.push(p);
      }
    }
    const builtins = builtinProfiles.value;
    for (const key of Object.keys(builtins)) profiles.push(builtins[key]);
    return profiles;
  });

  function resolveTargetProfile(
    name: string,
  ): { name: string; icon: string; color: string } | null {
    const p = optionsStore.options[`+${name}`] ?? builtinProfiles.value[name];
    if (!p) return null;
    const target = getVirtualTarget(p, optionsStore.options);
    const icon =
      profileIcons[target?.profileType ?? ""] || "glyphicon-question-sign";
    return {
      name: name,
      icon,
      color: target?.color ?? "#aaa",
    };
  }

  return {
    profileIcons,
    profileOrder,
    builtinProfiles,
    allProfiles,
    visibleProfiles,
    sortedProfiles,
    profileColors,
    profileColorPalette,
    selectableProfiles,
    isProfileNameHidden,
    isProfileNameReserved,
    getAttachedName,
    getParentName,
    getVirtualTarget,
    resolveTargetProfile,
    profileByName,
    referencedBySet,
  };
});
