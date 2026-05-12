// Type declarations for external globals injected via <script> tags.
// omegaTarget and OmegaPac are NOT npm imports -- they are loaded as separate
// script files by the extension host page.

export interface OmegaTargetWeb {
  getMessage(key: string, substitutions?: string | string[]): string;
  lastUrl(url?: string): string | undefined;
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

export interface OmegaTargetPopup {
  applyProfile(profileName: string, cb?: () => void): void;
  setDefaultProfile(
    profileName: string,
    defaultProfileName: string,
    cb?: () => void,
  ): void;
  addTempRule(domain: string, profileName: string, cb?: () => void): void;
  openOptions(hash?: string, cb?: () => void): void;
  openManage(cb?: () => void): void;
  getMessage(key: string, substitutions?: string | string[]): string;
  getState(keys: string[], cb: (err: any, state: any) => void): void;
  getActivePageInfo(
    cb: (
      err: any,
      info: {
        url: string;
        domain: string;
        tempRuleProfileName: string;
        errorCount: number;
      } | null,
    ) => void,
  ): void;
}

// OmegaPac namespace -- mirrors the structure exported by omega-pac's UMD build
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare namespace OmegaPac {
  namespace Profiles {
    const builtinProfiles: Record<string, any>;
    const formatByType: Record<string, string>;
    const ruleListFormats: string[];
    function byName(name: string, options: Record<string, any>): any;
    function byKey(key: string, options: Record<string, any>): any;
    function create(profile: any): any;
    function updateRevision(profile: any): void;
    function nameAsKey(profile: any): string;
    function isProfileNameHidden(name: string): boolean;
    function isProfileNameReserved(name: string): boolean;
    function referencedBySet(
      name: string,
      options: Record<string, any>,
    ): Record<string, string>;
    function validResultProfilesFor(
      name: string,
      options: Record<string, any>,
    ): any[];
    function isFileUrl(url: string): boolean;
    function each(
      options: Record<string, any>,
      cb: (key: string, profile: any) => void,
    ): void;
  }
  namespace PacGenerator {
    function script(
      options: Record<string, any>,
      profileName: string,
      opts?: any,
    ): any;
    function ascii(pac: string): string;
  }
  namespace Conditions {
    function parseIp(input: string): any;
    function getWeekdayList(condition: any): boolean[];
    function fromStr(str: string): any;
    function str(value: any): string;
    const conditionTypes: Record<string, any>;
  }
  namespace RuleList {
    namespace Switchy {
      function compose(args: any, opts?: any): string;
      function parseOmega(code: string, profiles?: Record<string, any>): any;
      function detect(code: string): boolean;
      function directReferenceSet(args: any): any;
    }
  }
}

declare global {
  var omegaTarget: OmegaTargetWeb | undefined;
  var OmegaTargetPopup: OmegaTargetPopup | undefined;
  var OmegaPac: typeof OmegaPac | undefined;
  var OmegaDebug: Record<string, any> | undefined;
  var saveAs: (blob: Blob, name: string, noAutoBom?: boolean) => void;
}

export {};
