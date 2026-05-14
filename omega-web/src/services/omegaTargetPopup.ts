import {
  sendMessage,
  sendMessageNoReply,
  getURL,
  RUNTIME_ID,
} from "@/services/chrome/runtime";
import { query, update, create } from "@/services/chrome/tabs";
import { getMessage } from "@/services/chrome/i18n";

async function callBackground(method: string, args: any[]): Promise<any> {
  const response = await sendMessage<{ error?: any; result?: any }>({
    method,
    args,
  });
  if (response.error) throw response.error;
  return response.result;
}

export const omegaTargetPopup = {
  getState(keys: string[]): Promise<any> {
    return callBackground("getState", [keys]);
  },

  applyProfile(name: string): Promise<void> {
    sendMessageNoReply({
      method: "applyProfile",
      args: [name],
      noReply: true,
      refreshActivePage: true,
    });
    return Promise.resolve();
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
    return callBackground("getPageInfo", [args]);
  },

  setDefaultProfile(
    profileName: string,
    defaultProfileName: string,
  ): Promise<void> {
    sendMessageNoReply({
      method: "setDefaultProfile",
      args: [profileName, defaultProfileName],
      noReply: true,
      refreshActivePage: true,
    });
    return Promise.resolve();
  },

  addTempRule(domain: string, profileName: string): Promise<void> {
    sendMessageNoReply({
      method: "addTempRule",
      args: [domain, profileName],
      noReply: true,
      refreshActivePage: true,
    });
    return Promise.resolve();
  },

  openManage(): Promise<any> {
    return create({ url: `chrome://extensions/?id=${RUNTIME_ID}` });
  },

  getMessage,
};
