function callBackgroundNoReply(method: string, args: any[], cb?: Function): void {
  chrome.runtime.sendMessage({
    method,
    args,
    noReply: true,
    refreshActivePage: true,
  });
  if (cb) cb();
}

function callBackground(method: string, args: any[], cb?: Function): void {
  chrome.runtime.sendMessage({ method, args }, (response: any) => {
    if (chrome.runtime.lastError != null) return cb && cb(chrome.runtime.lastError);
    if (response.error) return cb && cb(response.error);
    return cb && cb(null, response.result);
  });
}

export const OmegaTargetPopup = {
  getState(keys: string[], cb?: Function): void {
    callBackground("getState", [keys], cb);
  },

  applyProfile(name: string, cb?: Function): void {
    callBackgroundNoReply("applyProfile", [name], cb);
  },

  openOptions(hash?: string, cb?: Function): void {
    const options_url = chrome.runtime.getURL("options.html");

    chrome.tabs.query({ url: options_url }, (tabs: any[]) => {
      if (!chrome.runtime.lastError && tabs && tabs.length > 0) {
        const props: any = { active: true };
        if (hash) {
          props.url = options_url + hash;
        }
        chrome.tabs.update(tabs[0].id, props);
      } else {
        chrome.tabs.create({ url: options_url });
      }
      if (cb) cb();
    });
  },

  getActivePageInfo(cb?: Function): void {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs: any[]) => {
      if (tabs.length === 0 || !tabs[0].url) return cb?.();
      const args = { tabId: tabs[0].id, url: tabs[0].url };
      callBackground("getPageInfo", [args], cb);
    });
  },

  setDefaultProfile(profileName: string, defaultProfileName: string, cb?: Function): void {
    callBackgroundNoReply("setDefaultProfile", [profileName, defaultProfileName], cb);
  },

  addTempRule(domain: string, profileName: string, cb?: Function): void {
    callBackgroundNoReply("addTempRule", [domain, profileName], cb);
  },

  openManage(): void {
    chrome.tabs.create({ url: "chrome://extensions/?id=" + chrome.runtime.id });
  },

  getMessage: chrome.i18n.getMessage.bind(chrome.i18n),
};
