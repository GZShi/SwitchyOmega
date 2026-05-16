export function query(
  queryInfo: chrome.tabs.QueryInfo,
): Promise<chrome.tabs.Tab[]> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query(queryInfo, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(tabs);
    });
  });
}

export function update(
  tabId: number | undefined,
  props: chrome.tabs.UpdateProperties,
): Promise<chrome.tabs.Tab | undefined> {
  return new Promise((resolve, reject) => {
    if (tabId == null) {
      reject(new Error("tabId is required for update"));
      return;
    }
    chrome.tabs.update(tabId, props, (tab) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(tab);
    });
  });
}

export function create(
  props: chrome.tabs.CreateProperties,
): Promise<chrome.tabs.Tab | undefined> {
  return new Promise((resolve, reject) => {
    chrome.tabs.create(props, (tab) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(tab);
    });
  });
}

export function reload(
  tabId: number | undefined,
  reloadProps?: chrome.tabs.ReloadProperties,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (tabId == null) {
      reject(new Error("tabId is required for reload"));
      return;
    }
    const props = reloadProps ?? {};
    chrome.tabs.reload(tabId, props, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}
