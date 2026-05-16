import { sendMessage, connect } from "@/services/chrome/runtime";
import { query, create } from "@/services/chrome/tabs";
import { localGet, localSet, localAvailable } from "@/services/chrome/storage";
import { decodeError } from "@/services/chrome/rpc";
import type { OmegaTargetWeb } from "@/types/globals";
import {
  createBaseMethods,
  getRequestInfoCallback,
} from "@/services/omegaTargetBase";

const prefix = "omega.local.";

async function callBackground(method: string, ...args: any[]): Promise<any> {
  const response = await sendMessage<{ error?: any; result?: any }>({
    method,
    args,
  });
  if (response.error) {
    throw decodeError(response.error);
  }
  return response.result;
}

/** Adapt spread-signature callBackground to array-signature expected by createBaseMethods. */
function callBgArray(method: string, args: any[]): Promise<any> {
  return callBackground(method, ...args);
}

const optionsChangeCallbacks: Array<(options: Record<string, any>) => void> =
  [];
let _refreshTimer: ReturnType<typeof setTimeout> | null = null;

function _notifyCallbacks(opt: Record<string, any>): void {
  for (const cb of optionsChangeCallbacks) {
    cb(opt);
  }
}

/** Debounced refresh triggered by external storage changes (e.g. popup added a condition). */
function _onStorageChange(
  changes: Record<string, any>,
  areaName: string,
): void {
  if (areaName !== "local") return;
  // Only refresh if profile data changed (keys starting with "+")
  const hasProfileChange = Object.keys(changes).some((k) => k.startsWith("+"));
  if (!hasProfileChange) return;
  if (_refreshTimer != null) clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(() => {
    _refreshTimer = null;
    omegaTarget.refresh().catch((err) => {
      console.warn("Refresh after storage change failed:", err);
    });
  }, 300);
}

function _connectBackground(
  name: string,
  message: any,
  callback: (info: any) => void,
): void {
  const port = connect(name);
  port.onDisconnect.addListener(() => {
    port.onMessage.removeListener(callback);
  });
  port.postMessage(message);
  port.onMessage.addListener(callback);
}

export const omegaTarget: OmegaTargetWeb = {
  options: null as Record<string, any> | null,

  ...createBaseMethods(callBgArray),

  // Override addProfile from base to also refresh options after adding
  async addProfile(profile: any): Promise<any> {
    await callBackground("addProfile", profile);
    return omegaTarget.refresh();
  },

  async state(name: string | string[], value?: any): Promise<any> {
    if (!localAvailable) return undefined;
    if (arguments.length === 1) {
      if (Array.isArray(name)) {
        const keys = name.map((k) => prefix + k);
        const result = await localGet(keys);
        return name.map((k) => result[prefix + k] ?? undefined);
      }
      const result = await localGet(prefix + name);
      return result[prefix + name] ?? undefined;
    }
    const items: Record<string, any> = {};
    items[prefix + (name as string)] = value;
    await localSet(items);
    return value;
  },

  async lastUrl(url?: string): Promise<string | undefined> {
    const name = "web.last_url";
    if (url) {
      try {
        await omegaTarget.state(name, url);
      } catch {
        /* storage write failed, non-critical */
      }
      return url;
    }
    return omegaTarget.state(name) as Promise<string | undefined>;
  },

  addOptionsChangeCallback(
    callback: (options: Record<string, any>) => void,
  ): void {
    optionsChangeCallbacks.push(callback);
    // Set up storage listener on first callback registration to detect
    // external changes (e.g. conditions added from the popup).
    if (
      optionsChangeCallbacks.length === 1 &&
      typeof chrome?.storage?.onChanged !== "undefined"
    ) {
      chrome.storage.onChanged.addListener(_onStorageChange);
    }
  },

  removeOptionsChangeCallback(
    callback: (options: Record<string, any>) => void,
  ): void {
    const idx = optionsChangeCallbacks.indexOf(callback);
    if (idx >= 0) {
      optionsChangeCallbacks.splice(idx, 1);
    }
    if (
      optionsChangeCallbacks.length === 0 &&
      typeof chrome?.storage?.onChanged !== "undefined"
    ) {
      chrome.storage.onChanged.removeListener(_onStorageChange);
    }
  },

  async refresh(): Promise<any> {
    const opt = await callBackground("getAll");
    omegaTarget.options = opt;
    if (opt) {
      _notifyCallbacks(opt);
    }
  },

  async renameProfile(fromName: string, toName: string): Promise<any> {
    await callBackground("renameProfile", fromName, toName);
    return omegaTarget.refresh();
  },

  async replaceRef(fromName: string, toName: string): Promise<any> {
    await callBackground("replaceRef", fromName, toName);
    return omegaTarget.refresh();
  },

  async optionsPatch(patch: any): Promise<any> {
    await callBackground("patch", patch);
    return omegaTarget.refresh();
  },

  async resetOptions(opt?: any): Promise<any> {
    await callBackground("reset", opt);
    return omegaTarget.refresh();
  },

  async updateProfile(name: string, bypassCache?: string): Promise<any> {
    const results = await callBackground("updateProfile", name, bypassCache);
    for (const key of Object.keys(results)) {
      results[key] = decodeError(results[key]);
    }
    return omegaTarget.refresh();
  },

  async getActivePageInfo(): Promise<any> {
    const tabs = await query({ active: true, lastFocusedWindow: true });
    if (!tabs[0]?.url) return null;
    const args = { tabId: tabs[0].id, url: tabs[0].url };
    const cb = getRequestInfoCallback();
    if (tabs[0].id && cb) {
      _connectBackground("tabRequestInfo", args, cb);
    }
    const info = await callBackground("getPageInfo", args);
    return info?.url ? info : null;
  },

  openShortcutConfig(): void {
    create({ url: "chrome://extensions/configureCommands" });
  },

  setOptionsSync(enabled: boolean, args?: any): Promise<any> {
    return callBackground("setOptionsSync", enabled, args);
  },

  resetOptionsSync(): Promise<any> {
    return callBackground("resetOptionsSync");
  },
};
