import {
  sendMessage,
  getURL,
  RUNTIME_ID,
  connect,
} from "@/services/chrome/runtime";
import { query, update, create, reload } from "@/services/chrome/tabs";
import { getMessage } from "@/services/chrome/i18n";
import { decodeError, isChromeUrl } from "@/services/chrome/rpc";

async function callBackground(method: string, args: any[]): Promise<any> {
  const response = await sendMessage<{ error?: any; result?: any }>({
    method,
    args,
  });
  if (response.error) throw decodeError(response.error);
  return response.result;
}

let requestInfoCallback: ((info: any) => void) | null = null;

export const omegaTargetPopup = {
  getState(keys: string[]): Promise<any> {
    return callBackground("getState", [keys]);
  },

  applyProfile(name: string): Promise<any> {
    return callBackground("applyProfile", [name]);
  },

  async openOptions(hash?: string): Promise<void> {
    const optionsUrl = getURL("options/index.html");
    const tabs = await query({ url: optionsUrl });
    if (tabs.length > 0) {
      const props: any = { active: true };
      if (hash) props.url = optionsUrl + hash;
      await update(tabs[0].id, props);
    } else {
      await create({ url: optionsUrl });
    }
  },

  async getActivePageInfo(): Promise<any> {
    const tabs = await query({ active: true, lastFocusedWindow: true });
    if (tabs.length === 0 || !tabs[0].url) return undefined;
    const args = { tabId: tabs[0].id, url: tabs[0].url };

    // Connect tabRequestInfo port for live request error updates
    if (tabs[0].id && requestInfoCallback) {
      const port = connect("tabRequestInfo");
      port.postMessage(args);
      port.onMessage.addListener(requestInfoCallback);
      port.onDisconnect.addListener(() => {
        port.onMessage.removeListener(requestInfoCallback!);
      });
    }

    return callBackground("getPageInfo", [args]);
  },

  setDefaultProfile(
    profileName: string,
    defaultProfileName: string,
  ): Promise<any> {
    return callBackground("setDefaultProfile", [
      profileName,
      defaultProfileName,
    ]);
  },

  addTempRule(domain: string, profileName: string): Promise<any> {
    return callBackground("addTempRule", [domain, profileName]);
  },

  /** Add condition(s) to a profile. Accepts a single condition or an array. */
  addCondition(condition: any, profileName: string): Promise<any> {
    return callBackground("addCondition", [condition, profileName]);
  },

  /** Reload the active tab (if it is not a chrome: / about: / moz- page). */
  async refreshActivePage(): Promise<void> {
    const tabs = await query({ active: true, lastFocusedWindow: true });
    if (tabs[0]?.url && !isChromeUrl(tabs[0].url)) {
      await reload(tabs[0].id, { bypassCache: true });
    }
  },

  /** Register a callback for live request error updates from background. */
  setRequestInfoCallback(cb: (info: any) => void): void {
    requestInfoCallback = cb;
  },

  addProfile(profile: any): Promise<any> {
    return callBackground("addProfile", [profile]);
  },

  openManage(): Promise<any> {
    return create({ url: `chrome://extensions/?id=${RUNTIME_ID}` });
  },

  getMessage,
};
