// omegaTarget service for the options page.
// ES module — imported by options/main.ts and built by Vite.

import type { OmegaTargetWeb } from "./types/globals";

declare var chrome: any;

const prefix = "omega.local.";
const urlParser = document.createElement("a");
const storageArea =
  typeof chrome !== "undefined" && chrome?.storage?.local
    ? chrome.storage.local
    : null;

function callBackground(method: string, ...args: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ method, args }, (response: any) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      if (response.error) {
        reject(_decodeError(response.error));
      } else {
        resolve(response.result);
      }
    });
  });
}

function _decodeError(obj: any): Error {
  if (obj._error === "error") {
    const err: any = new Error(obj.message);
    err.name = obj.name;
    err.stack = obj.stack;
    err.original = obj.original;
    return err;
  }
  return obj;
}

const optionsChangeCallbacks: Array<(options: Record<string, any>) => void> =
  [];
let requestInfoCallback: ((info: any) => void) | null = null;

function _isChromeUrl(url: string): boolean {
  return (
    url.substring(0, 6) === "chrome" ||
    url.substring(0, 6) === "about:" ||
    url.substring(0, 4) === "moz-"
  );
}

function _connectBackground(
  name: string,
  message: any,
  callback: (info: any) => void,
): void {
  const port = chrome.runtime.connect({ name });
  port.onDisconnect.addListener(() => {
    port.onMessage.removeListener(callback);
  });
  port.postMessage(message);
  port.onMessage.addListener(callback);
}

export const omegaTarget: OmegaTargetWeb = {
  options: null as Record<string, any> | null,

  state(name: string | string[], value?: any): Promise<any> {
    if (!storageArea) return Promise.resolve(undefined);
    if (arguments.length === 1) {
      if (Array.isArray(name)) {
        const keys = name.map((k) => prefix + k);
        return new Promise((resolve) => {
          storageArea.get(keys, (result: Record<string, any>) => {
            resolve(name.map((k) => result[prefix + k] ?? undefined));
          });
        });
      }
      return new Promise((resolve) => {
        storageArea.get(prefix + name, (result: Record<string, any>) => {
          resolve(result[prefix + name] ?? undefined);
        });
      });
    }
    const items: Record<string, any> = {};
    items[prefix + (name as string)] = value;
    return new Promise((resolve) => {
      storageArea.set(items, () => resolve(value));
    });
  },

  lastUrl(url?: string): Promise<string | undefined> {
    const name = "web.last_url";
    if (url) {
      omegaTarget.state(name, url);
      return Promise.resolve(url);
    }
    return omegaTarget.state(name) as Promise<string | undefined>;
  },

  addOptionsChangeCallback(
    callback: (options: Record<string, any>) => void,
  ): void {
    optionsChangeCallbacks.push(callback);
  },

  refresh(): Promise<any> {
    return callBackground("getAll").then((opt: Record<string, any>) => {
      omegaTarget.options = opt;
      for (const cb of optionsChangeCallbacks) {
        cb(omegaTarget.options);
      }
    });
  },

  renameProfile(fromName: string, toName: string): Promise<any> {
    return callBackground("renameProfile", fromName, toName).then(() =>
      omegaTarget.refresh(),
    );
  },

  replaceRef(fromName: string, toName: string): Promise<any> {
    return callBackground("replaceRef", fromName, toName).then(() =>
      omegaTarget.refresh(),
    );
  },

  optionsPatch(patch: any): Promise<any> {
    return callBackground("patch", patch).then(() => omegaTarget.refresh());
  },

  resetOptions(opt?: any): Promise<any> {
    return callBackground("reset", opt).then(() => omegaTarget.refresh());
  },

  updateProfile(name: string, bypassCache?: string): Promise<any> {
    return callBackground("updateProfile", name, bypassCache)
      .then((results: any) => {
        for (const key of Object.keys(results)) {
          results[key] = _decodeError(results[key]);
        }
        return results;
      })
      .then(() => omegaTarget.refresh());
  },

  getMessage: chrome.i18n.getMessage.bind(chrome.i18n),

  openOptions(hash?: string): Promise<void> {
    return new Promise((resolve) => {
      const optionsUrl = chrome.runtime.getURL("options.html");
      chrome.tabs.query({ url: optionsUrl }, (tabs: any[]) => {
        let url: string;
        if (hash) {
          urlParser.href = tabs[0]?.url || optionsUrl;
          urlParser.hash = hash;
          url = urlParser.href;
        } else {
          url = optionsUrl;
        }
        if (tabs.length > 0) {
          const props: any = { active: true };
          if (hash) props.url = url;
          chrome.tabs.update(tabs[0].id, props);
        } else {
          chrome.tabs.create({ url });
        }
        resolve();
      });
    });
  },

  applyProfile(name: string): Promise<any> {
    return callBackground("applyProfile", name);
  },

  applyProfileNoReply(name: string): void {
    chrome.runtime.sendMessage({
      method: "applyProfile",
      args: [name],
      noReply: true,
    });
  },

  addTempRule(domain: string, profileName: string): Promise<any> {
    return callBackground("addTempRule", domain, profileName);
  },

  addCondition(condition: any, profileName: string): Promise<any> {
    return callBackground("addCondition", condition, profileName);
  },

  addProfile(profile: any): Promise<any> {
    return callBackground("addProfile", profile).then(() =>
      omegaTarget.refresh(),
    );
  },

  setDefaultProfile(
    profileName: string,
    defaultProfileName: string,
  ): Promise<any> {
    return callBackground("setDefaultProfile", profileName, defaultProfileName);
  },

  getActivePageInfo(): Promise<any> {
    return new Promise((resolve) => {
      chrome.tabs.query(
        { active: true, lastFocusedWindow: true },
        (tabs: any[]) => {
          if (!tabs[0]?.url) {
            resolve(null);
            return;
          }
          const args = { tabId: tabs[0].id, url: tabs[0].url };
          if (tabs[0].id && requestInfoCallback) {
            _connectBackground("tabRequestInfo", args, requestInfoCallback);
          }
          resolve(
            callBackground("getPageInfo", args).then((info: any) =>
              info?.url ? info : null,
            ),
          );
        },
      );
    });
  },

  refreshActivePage(): Promise<void> {
    return new Promise((resolve) => {
      chrome.tabs.query(
        { active: true, lastFocusedWindow: true },
        (tabs: any[]) => {
          if (tabs[0]?.url && !_isChromeUrl(tabs[0].url)) {
            chrome.tabs.reload(tabs[0].id, { bypassCache: true });
          }
          resolve();
        },
      );
    });
  },

  openManage(): void {
    chrome.tabs.create({
      url: "chrome://extensions/?id=" + chrome.runtime.id,
    });
  },

  openShortcutConfig(): void {
    chrome.tabs.create({ url: "chrome://extensions/configureCommands" });
  },

  setOptionsSync(enabled: boolean, args?: any): Promise<any> {
    return callBackground("setOptionsSync", enabled, args);
  },

  resetOptionsSync(): Promise<any> {
    return callBackground("resetOptionsSync");
  },

  setRequestInfoCallback(callback: (info: any) => void): void {
    requestInfoCallback = callback;
  },
};
