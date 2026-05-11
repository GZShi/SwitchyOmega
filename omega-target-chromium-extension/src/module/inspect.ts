class Inspect {
  _enabled: boolean = false;
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

  enable(): void {
    if (!chrome.contextMenus) return;
    if (!chrome.i18n.getUILanguage) return;
    if (this._enabled) return;

    const webResource = ["http://*/*", "https://*/*", "ftp://*/*"];

    chrome.contextMenus.create({
      id: "inspectFrame",
      title: chrome.i18n.getMessage("contextMenu_inspectFrame"),
      contexts: ["frame"],
      onclick: this.inspect.bind(this),
      documentUrlPatterns: webResource,
    });

    chrome.contextMenus.create({
      id: "inspectLink",
      title: chrome.i18n.getMessage("contextMenu_inspectLink"),
      contexts: ["link"],
      onclick: this.inspect.bind(this),
      targetUrlPatterns: webResource,
    });

    chrome.contextMenus.create({
      id: "inspectElement",
      title: chrome.i18n.getMessage("contextMenu_inspectElement"),
      contexts: ["image", "video", "audio"],
      onclick: this.inspect.bind(this),
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
