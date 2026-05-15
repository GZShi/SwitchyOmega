import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { usePopupTarget } from "@/composables/usePopupTarget";
import { useProfilesStore } from "@/stores/profiles";

interface Profile {
  name: string;
  profileType: string;
  color?: string;
  desc?: string;
  builtin?: boolean;
  defaultProfileName?: string;
  validResultProfiles?: string[];
}

interface PageInfo {
  url: string;
  domain: string;
  tempRuleProfileName: string | null;
  errorCount: number;
}

interface RequestInfo {
  domains: Array<{ domain: string; errorCount: number; [key: string]: any }>;
  summary?: Record<string, any>;
  [key: string]: any;
}

export const usePopupStore = defineStore("popup", () => {
  const target = usePopupTarget();

  // -- State --
  const availableProfiles = ref<Record<string, Profile>>({});
  const currentProfileName = ref("");
  const isSystemProfile = ref(false);
  const refreshOnProfileChange = ref(true);
  const proxyNotControllable = ref<string | false>(false);
  const externalProfile = ref<Profile | null>(null);

  const validResultProfiles = ref<Profile[]>([]);
  const builtinProfiles = ref<Profile[]>([]);
  const customProfiles = ref<Profile[]>([]);

  // UI state
  const showConditionForm = ref(false);
  const showRequestInfo = ref(false);
  const showKeyboardHelp = ref(false);
  const tempRuleMenuOpen = ref(false);
  const saveExternalOpen = ref(false);

  // Current page info
  const pageInfo = ref<PageInfo | null>(null);
  const currentTempRuleProfile = ref<string | null>(null);
  const currentDomain = ref("");
  const currentProfileCanAddRule = ref(false);

  // Condition form
  const rule = ref<{
    condition: { conditionType: string; pattern: string };
    profileName: string;
  }>({
    condition: { conditionType: "HostWildcardCondition", pattern: "" },
    profileName: "direct",
  });
  const conditionSuggestion = ref<Record<string, string>>({});
  const domainsForCondition = ref<Record<string, boolean>>({});
  const profileForDomains = ref<string | null>(null);

  // Request info
  const requestInfo = ref<RequestInfo | null>(null);
  const requestInfoProvided = ref<boolean | null>(null);

  // -- Computed --
  const currentProfile = computed(() => {
    return availableProfiles.value[`+${currentProfileName.value}`] || null;
  });

  const profilesStore = useProfilesStore();

  const sortedCustomProfiles = computed(() => {
    const order = profilesStore.profileOrder;
    return [...customProfiles.value].sort((a, b) => {
      const diff = (order[a.profileType] || 0) - (order[b.profileType] || 0);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  });

  // -- Actions --
  function closeWindow() {
    window.close();
    // Fallback for when popup is opened as a tab
    document.body.style.opacity = "0";
    setTimeout(() => history.go(0), 300);
  }

  function refresh() {
    if (refreshOnProfileChange.value) {
      // Can't refresh from popup directly; just close
    }
    closeWindow();
  }

  async function loadState() {
    try {
      const state = await target.getState([
        "availableProfiles",
        "currentProfileName",
        "validResultProfiles",
        "isSystemProfile",
        "currentProfileCanAddRule",
        "proxyNotControllable",
        "externalProfile",
        "showExternalProfile",
        "web.switchGuide",
        "lastProfileNameForCondition",
      ]);

      // getState returns a key-value object, not an array
      const avails = state.availableProfiles;
      const curName = state.currentProfileName;
      const validNames = state.validResultProfiles;
      const isSys = state.isSystemProfile;
      const canAddRule = state.currentProfileCanAddRule;
      const isNotControllable = state.proxyNotControllable;
      const extProfile = state.externalProfile;

      if (isNotControllable) {
        proxyNotControllable.value = isNotControllable as string;
        return;
      }

      availableProfiles.value = avails ?? {};
      currentProfileName.value = curName ?? "";
      isSystemProfile.value = !!isSys;
      currentProfileCanAddRule.value = !!canAddRule;
      externalProfile.value = extProfile ?? null;

      // Build profile lists
      const charCodeUnderscore = "_".charCodeAt(0);
      const builtin: Profile[] = [];
      const custom: Profile[] = [];
      const preselectedProfileName = "direct";

      for (const key of Object.keys(avails ?? {})) {
        const profile = avails[key];
        if (profile.builtin) {
          builtin.push(profile);
        } else if (profile.name.charCodeAt(0) !== charCodeUnderscore) {
          custom.push(profile);
        }
      }

      // Build valid result profiles
      const valid: Profile[] = [];
      if (validNames) {
        for (const name of validNames) {
          const shown =
            name.charCodeAt(0) !== charCodeUnderscore ||
            name.charCodeAt(1) !== charCodeUnderscore;
          if (shown && avails[`+${name}`]) {
            valid.push(avails[`+${name}`]);
          }
        }
      }

      builtinProfiles.value = builtin;
      customProfiles.value = custom;
      validResultProfiles.value = valid;

      // Check lastProfileNameForCondition for pre-selection
      const lastProfile = state.lastProfileNameForCondition;
      if (lastProfile) {
        for (const p of valid) {
          if (p.name === lastProfile) {
            rule.value.profileName = lastProfile;
            break;
          }
        }
      }
      if (rule.value.profileName !== lastProfile) {
        rule.value.profileName = preselectedProfileName;
      }

      // Register callback for live request error updates from background
      target.setRequestInfoCallback((info: any) => {
        // Process summary into sorted domains array
        info.domains = [];
        for (const [domain, domainInfo] of Object.entries(info.summary ?? {})) {
          (domainInfo as any).domain = domain;
          info.domains.push(domainInfo);
        }
        info.domains.sort((a: any, b: any) => b.errorCount - a.errorCount);

        requestInfo.value = info;
        if (requestInfoProvided.value == null) {
          requestInfoProvided.value = (info.domains?.length ?? 0) > 0;
        }
        // Initialize domain checkboxes
        for (const domain of info.domains) {
          if (!(domain.domain in domainsForCondition.value)) {
            domainsForCondition.value[domain.domain] = true;
          }
        }
        // Set default profile for domains if not set
        if (!profileForDomains.value) {
          profileForDomains.value = "direct";
        }
      });
    } catch (e) {
      // eslint-disable-next-line no-console -- error log for popup state load failure
      console.error("Failed to load popup state:", e);
    }
  }

  async function loadPageInfo() {
    try {
      const info = await target.getActivePageInfo();
      if (!info) return;
      pageInfo.value = info;
      currentDomain.value = info.domain;
      currentTempRuleProfile.value = info.tempRuleProfileName;

      if (info.tempRuleProfileName) {
        rule.value.profileName = info.tempRuleProfileName;
      }
    } catch (e) {
      // eslint-disable-next-line no-console -- error log for page info load failure
      console.error("Failed to load page info:", e);
    }
  }

  async function applyProfile(profileName: string) {
    if (!refreshOnProfileChange.value) {
      await target.applyProfile(profileName);
      closeWindow();
    } else {
      try {
        await target.applyProfile(profileName);
        // Refresh active page after profile change
        try {
          await target.refreshActivePage();
        } catch (_) {
          /* ignore */
        }
      } catch (_) {
        /* ignore */
      }
      closeWindow();
    }
  }

  async function addTempRule(domain: string, profileName: string) {
    tempRuleMenuOpen.value = false;
    try {
      await target.addTempRule(domain, profileName);
    } catch (_) {
      /* ignore */
    }
    closeWindow();
  }

  async function setDefaultProfile(
    profileName: string,
    defaultProfileName: string,
  ) {
    try {
      await target.setDefaultProfile(profileName, defaultProfileName);
    } catch (_) {
      /* ignore */
    }
    closeWindow();
  }

  function prepareConditionForm() {
    const domain = currentDomain.value;
    let domainLooksLikeIp = false;
    let domainForPattern = domain;

    if (domain.includes(":")) {
      domainLooksLikeIp = true;
      if (!domain.startsWith("[")) {
        domainForPattern = `[${domain}]`;
      }
    } else if (!isNaN(Number(domain[domain.length - 1]))) {
      domainLooksLikeIp = true;
    }

    let suggestionMap: Record<string, string>;
    const escaped = domain.replace(/\./g, "\\.");

    if (domainLooksLikeIp) {
      const ipEscaped = domainForPattern
        .replace(/\./g, "\\.")
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]");
      suggestionMap = {
        HostWildcardCondition: domainForPattern,
        HostRegexCondition: `^${ipEscaped}$`,
        UrlWildcardCondition: `*://${domainForPattern}/*`,
        UrlRegexCondition: `://${ipEscaped}(:\\d+)?/`,
        KeywordCondition: domainForPattern,
      };
    } else {
      suggestionMap = {
        HostWildcardCondition: `*.${domain}`,
        HostRegexCondition: `(^|\\.)${escaped}$`,
        UrlWildcardCondition: `*://*.${domain}/*`,
        UrlRegexCondition: `://([^/.]+\\.)*${escaped}(:\\d+)?/`,
        KeywordCondition: domain,
      };
    }

    conditionSuggestion.value = suggestionMap;

    rule.value = {
      condition: {
        conditionType: "HostWildcardCondition",
        pattern: suggestionMap["HostWildcardCondition"],
      },
      profileName: rule.value.profileName || "direct",
    };

    showConditionForm.value = true;
  }

  async function saveExternal(name: string) {
    saveExternalOpen.value = false;
    if (!name || !externalProfile.value) return;
    // Validate name: no conflict with existing profiles, not hidden
    if (availableProfiles.value[`+${name}`]) return;
    if (name.startsWith("_")) return;

    const profile = { ...externalProfile.value, name };
    await target.addProfile(profile);
    await target.applyProfile(name);
    closeWindow();
  }

  function returnToMenu() {
    showConditionForm.value = false;
    showRequestInfo.value = false;
  }

  return {
    // State
    availableProfiles,
    currentProfileName,
    isSystemProfile,
    refreshOnProfileChange,
    proxyNotControllable,
    externalProfile,
    validResultProfiles,
    builtinProfiles,
    customProfiles,
    showConditionForm,
    showRequestInfo,
    showKeyboardHelp,
    tempRuleMenuOpen,
    saveExternalOpen,
    pageInfo,
    currentTempRuleProfile,
    currentDomain,
    currentProfileCanAddRule,
    rule,
    conditionSuggestion,
    domainsForCondition,
    profileForDomains,
    requestInfo,
    requestInfoProvided,
    // Computed
    currentProfile,
    sortedCustomProfiles,
    // Actions
    closeWindow,
    refresh,
    loadState,
    loadPageInfo,
    applyProfile,
    addTempRule,
    setDefaultProfile,
    prepareConditionForm,
    saveExternal,
    returnToMenu,
  };
});
