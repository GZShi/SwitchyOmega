// Type declarations for omega-web.
// omegaTarget is an ES module imported directly (no longer a window global).
// OmegaPac is a workspace dependency imported by useOmegaPac composable.

declare module "vue" {
  interface ComponentCustomProperties {
    /** Shortcut for chrome.i18n.getMessage. Falls back to the key if no translation found. */
    $t(key: string, substitutions?: string | string[]): string;
  }
}

export interface OmegaTargetWeb {
  getMessage(key: string, substitutions?: string | string[]): string;
  lastUrl(url?: string): Promise<string | undefined>;
  state(name: string): Promise<any>;
  state(name: string[]): Promise<any[]>;
  state(name: string, value: any): Promise<void>;
  options: Record<string, any> | null;
  refresh(): Promise<void>;
  addOptionsChangeCallback(cb: (options: Record<string, any>) => void): void;
  applyProfile(name: string): Promise<void>;
  applyProfileNoReply(name: string): void;
  renameProfile(from: string, to: string): Promise<void>;
  replaceRef(from: string, to: string): Promise<void>;
  addProfile(profile: Record<string, any>): Promise<void>;
  setDefaultProfile(
    profileName: string,
    defaultProfileName: string,
  ): Promise<void>;
  addTempRule(domain: string, profileName: string): Promise<void>;
  addCondition(
    condition: Record<string, any>,
    profileName: string,
  ): Promise<void>;
  optionsPatch(patch: any): Promise<void>;
  resetOptions(opt?: string | Record<string, any>): Promise<void>;
  updateProfile(
    name: string,
    bypassCache?: string,
  ): Promise<Record<string, any>>;
  setOptionsSync(enabled: boolean, args?: Record<string, any>): Promise<void>;
  resetOptionsSync(): Promise<void>;
  openOptions(hash?: string): Promise<void>;
  openManage(): void;
  openShortcutConfig(): void;
  getActivePageInfo(): Promise<{
    url: string;
    domain: string;
    tempRuleProfileName: string;
    errorCount: number;
  } | null>;
  refreshActivePage(): Promise<void>;
  setRequestInfoCallback(cb: (info: any) => void): void;
}
