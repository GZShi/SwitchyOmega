class ChromeTabs {
  _defaultAction: any = null;
  _badgeTab: any = null;
  _dirtyTabs: Record<string, any> = {};
  actionForUrl: (url: string) => Promise<any>;

  constructor(actionForUrl: (url: string) => Promise<any>) {
    this.actionForUrl = actionForUrl;
    this._dirtyTabs = {};
  }

  ignoreError(): void {
    chrome.runtime.lastError;
  }

  watch(): void {
    chrome.tabs.onUpdated.addListener(this.onUpdated.bind(this));
    chrome.tabs.onActivated.addListener((info: any) => {
      chrome.tabs.get(info.tabId, (tab: any) => {
        if (chrome.runtime.lastError) return;
        if (Object.hasOwn(this._dirtyTabs, info.tabId)) {
          this.onUpdated(tab.id, {}, tab);
        }
      });
    });
  }

  resetAll(action: any): void {
    this._defaultAction = action;
    chrome.tabs.query({}, (tabs: any[]) => {
      this._dirtyTabs = {};
      tabs.forEach((tab: any) => {
        this._dirtyTabs[tab.id] = tab.id;
        if (tab.active) this.onUpdated(tab.id, {}, tab);
      });
    });
    if (chrome.action.setPopup != null) {
      chrome.action.setTitle({ title: action.title });
    } else {
      chrome.action.setTitle({ title: action.shortTitle });
    }
    this.setIcon(action.icon);
  }

  onUpdated(tabId: number, changeInfo: any, tab: any): void {
    if (Object.hasOwn(this._dirtyTabs, tab.id)) {
      delete this._dirtyTabs[tab.id];
    } else if (changeInfo.url == null) {
      if (changeInfo.status != null && changeInfo.status !== "loading") {
        return;
      }
    }
    this.processTab(tab, changeInfo);
  }

  async processTab(tab: any): Promise<void> {
    // Skip uncommitted tabs (tab.id is -1 in Chrome MV3 for pre-commit tabs)
    if (tab.id == null || tab.id < 0) return;

    if (this._badgeTab) {
      for (const id of Object.keys(this._badgeTab)) {
        try {
          if (chrome.action.setBadgeText != null) {
            chrome.action.setBadgeText({
              text: "",
              tabId: parseInt(id),
            });
          }
        } catch (_e) {
          // ignore
        }
      }
      this._badgeTab = null;
    }

    if (tab.url == null || tab.url.indexOf("chrome") === 0) {
      if (this._defaultAction) {
        try {
          chrome.action.setTitle({
            title: this._defaultAction.title,
            tabId: tab.id,
          });
        } catch (_e) {
          /* tab may have closed */
        }
        this.clearIcon(tab.id);
      }
      return;
    }

    try {
      const action = await this.actionForUrl(tab.url);
      if (!action) {
        this.clearIcon(tab.id);
        return;
      }
      this.setIcon(action.icon, tab.id);
      if (chrome.action.setPopup != null) {
        chrome.action.setTitle({ title: action.title, tabId: tab.id });
      } else {
        chrome.action.setTitle({
          title: action.shortTitle,
          tabId: tab.id,
        });
      }
    } catch (_e) {
      // Tab may have been closed while waiting for actionForUrl
    }
  }

  setTabBadge(tab: any, badge: any): void {
    this._badgeTab ??= {};
    this._badgeTab[tab.id] = true;
    if (chrome.action.setBadgeText != null) {
      chrome.action.setBadgeText({ text: badge.text, tabId: tab.id });
    }
    if (chrome.action.setBadgeBackgroundColor != null) {
      chrome.action.setBadgeBackgroundColor({
        color: badge.color,
        tabId: tab.id,
      });
    }
  }

  setIcon(icon: any, tabId?: number): void {
    if (icon == null) return;
    let params: any;
    if (tabId != null && tabId >= 0) {
      params = { imageData: icon, tabId };
    } else {
      params = { imageData: icon };
    }
    this._chromeSetIcon(params);
  }

  _chromeSetIcon(params: any): void {
    try {
      if (chrome.action.setIcon != null) {
        chrome.action.setIcon(params, this.ignoreError);
      }
    } catch (_e) {
      params.imageData = {
        19: params.imageData[19],
        38: params.imageData[38],
      };
      if (chrome.action.setIcon != null) {
        chrome.action.setIcon(params, this.ignoreError);
      }
    }
  }

  clearIcon(tabId?: number): void {
    if (this._defaultAction?.icon == null) return;
    const params: any = { imageData: this._defaultAction.icon };
    if (tabId != null && tabId >= 0) params.tabId = tabId;
    this._chromeSetIcon(params);
  }
}

export { ChromeTabs };
