declare let chrome: any;

export function query(queryInfo: Record<string, any>): Promise<any[]> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query(queryInfo, (tabs: any[]) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(tabs);
    });
  });
}

export function update(tabId: number, props: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.tabs.update(tabId, props, (tab: any) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(tab);
    });
  });
}

export function create(props: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.tabs.create(props, (tab: any) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(tab);
    });
  });
}

export function reload(tabId: number, reloadProps?: Record<string, any>): Promise<void> {
  return new Promise((resolve, reject) => {
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
