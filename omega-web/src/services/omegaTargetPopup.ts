import { sendMessage, connect } from "@/services/chrome/runtime";
import { query } from "@/services/chrome/tabs";
import { decodeError } from "@/services/chrome/rpc";
import {
  createBaseMethods,
  getRequestInfoCallback,
} from "@/services/omegaTargetBase";

async function callBackground(method: string, args: any[]): Promise<any> {
  const response = await sendMessage<{ error?: any; result?: any }>({
    method,
    args,
  });
  if (response.error) throw decodeError(response.error);
  return response.result;
}

export const omegaTargetPopup = {
  ...createBaseMethods(callBackground),

  getState(keys: string[]): Promise<any> {
    return callBackground("getState", [keys]);
  },

  async getActivePageInfo(): Promise<any> {
    const tabs = await query({ active: true, lastFocusedWindow: true });
    if (tabs.length === 0 || !tabs[0].url) return undefined;
    const args = { tabId: tabs[0].id, url: tabs[0].url };
    const cb = getRequestInfoCallback();
    if (tabs[0].id && cb) {
      const port = connect("tabRequestInfo");
      port.postMessage(args);
      port.onMessage.addListener(cb);
      port.onDisconnect.addListener(() => {
        port.onMessage.removeListener(cb);
      });
    }
    return callBackground("getPageInfo", [args]);
  },
};
