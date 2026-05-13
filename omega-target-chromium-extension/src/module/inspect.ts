class Inspect {
  _enabled: boolean = false;
  _listenerRegistered: boolean = false;
  onInspect: (url: string, tab: any) => void;

  propForMenuItem: Record<string, string> = {
    inspectPage: "pageUrl",
    inspectFrame: "frameUrl",
    inspectLink: "linkUrl",
    inspectElement: "srcUrl",
  };

  constructor(onInspect: (url: string, tab: any) => void) {
    this.onInspect = onInspect;
  }

  _ensureListener(): void {
    if (this._listenerRegistered) return;
    if (!chrome.contextMenus) return;
    chrome.contextMenus.onClicked.addListener((info: any, tab: any) => {
      if (info.menuItemId in this.propForMenuItem) {
        this.inspect(info, tab);
      }
    });
    this._listenerRegistered = true;
  }

  enable(): void {
    if (!chrome.contextMenus) return;
    if (!chrome.i18n.getUILanguage) return;
    if (this._enabled) return;

    this._ensureListener();

    const webResource = ["http://*/*", "https://*/*", "ftp://*/*"];

    chrome.contextMenus.create({
      id: "inspectFrame",
      title: chrome.i18n.getMessage("contextMenu_inspectFrame"),
      contexts: ["frame"],
      documentUrlPatterns: webResource,
    });

    chrome.contextMenus.create({
      id: "inspectLink",
      title: chrome.i18n.getMessage("contextMenu_inspectLink"),
      contexts: ["link"],
      targetUrlPatterns: webResource,
    });

    chrome.contextMenus.create({
      id: "inspectElement",
      title: chrome.i18n.getMessage("contextMenu_inspectElement"),
      contexts: ["image", "video", "audio"],
      targetUrlPatterns: webResource,
    });

    this._enabled = true;
  }

  disable(): void {
    if (!this._enabled) return;
    for (const menuId of Object.keys(this.propForMenuItem)) {
      try {
        chrome.contextMenus.remove(menuId as any);
      } catch (_e) {
        // ignore
      }
    }
    this._enabled = false;
  }

  inspect(info: any, tab: any): void {
    if (!info.menuItemId) return;
    let url = info[this.propForMenuItem[info.menuItemId]];
    if (!url && info.menuItemId === "inspectPage") {
      url = tab.url;
    }
    if (!url) return;
    this.onInspect(url, tab);
  }
}

export { Inspect };
