import { getURL, RUNTIME_ID } from "@/services/chrome/runtime";
import { query, update, create, reload } from "@/services/chrome/tabs";
import { getMessage } from "@/services/chrome/i18n";
import { isChromeUrl } from "@/services/chrome/rpc";

let requestInfoCallback: ((info: any) => void) | null = null;

export function getRequestInfoCallback(): ((info: any) => void) | null {
  return requestInfoCallback;
}

export function createBaseMethods(
  callBg: (method: string, args: any[]) => Promise<any>,
) {
  return {
    getMessage,

    applyProfile(name: string): Promise<any> {
      return callBg("applyProfile", [name]);
    },

    addTempRule(domain: string, profileName: string): Promise<any> {
      return callBg("addTempRule", [domain, profileName]);
    },

    addCondition(condition: any, profileName: string): Promise<any> {
      return callBg("addCondition", [condition, profileName]);
    },

    setDefaultProfile(
      profileName: string,
      defaultProfileName: string,
    ): Promise<any> {
      return callBg("setDefaultProfile", [profileName, defaultProfileName]);
    },

    addProfile(profile: any): Promise<any> {
      return callBg("addProfile", [profile]);
    },

    async openOptions(hash?: string): Promise<void> {
      const optionsUrl = getURL("options/index.html");
      const tabs = await query({ url: optionsUrl });
      let url: string;
      if (hash) {
        const urlParser = document.createElement("a");
        urlParser.href = tabs[0]?.url ?? optionsUrl;
        urlParser.hash = hash;
        url = urlParser.href;
      } else {
        url = optionsUrl;
      }
      if (tabs.length > 0) {
        const props: any = { active: true };
        if (hash) props.url = url;
        await update(tabs[0].id, props);
      } else {
        await create({ url });
      }
    },

    async refreshActivePage(): Promise<void> {
      const tabs = await query({ active: true, lastFocusedWindow: true });
      if (tabs[0]?.url && !isChromeUrl(tabs[0].url)) {
        await reload(tabs[0].id, { bypassCache: true });
      }
    },

    openManage(): void {
      create({ url: `chrome://extensions/?id=${RUNTIME_ID}` });
    },

    setRequestInfoCallback(callback: (info: any) => void): void {
      requestInfoCallback = callback;
    },

    removeRequestInfoCallback(): void {
      requestInfoCallback = null;
    },
  };
}
