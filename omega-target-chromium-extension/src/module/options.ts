const OmegaTarget = require("omega-target");
const OmegaPac = OmegaTarget.OmegaPac;
const querystring = require("querystring");
const WebRequestMonitor = require("./web_request_monitor");
const ChromePort = require("./chrome_port");
const fetchUrl = require("./fetch_url");
const Url = require("url");

class ChromeOptions extends OmegaTarget.Options {
  fetchUrl = fetchUrl;
  _inspect: any = null;
  _proxyNotControllable: any = null;
  _badgeTitle: string | null = null;
  _quickSwitchInit: boolean = false;
  _quickSwitchHandlerReady: boolean = false;
  _quickSwitchCanEnable: boolean = false;
  _requestMonitor: any = null;
  _monitorWebRequests: boolean = false;
  _tabRequestInfoPorts: any = null;
  _alarms: Record<string, Function> | null = null;
  externalApi: any;
  switchySharp: any;

  proxyNotControllable(): any {
    return this._proxyNotControllable;
  }

  setProxyNotControllable(reason: any, badge?: any): void {
    this._proxyNotControllable = reason;
    if (reason) {
      this._state.set({ proxyNotControllable: reason });
      this.setBadge(badge);
    } else {
      this._state.remove(["proxyNotControllable"]);
      this.clearBadge();
    }
  }

  setBadge(options?: any): void {
    if (!options) {
      options = this._proxyNotControllable
        ? { text: "=", color: "#da4f49" }
        : { text: "?", color: "#49afcd" };
    }
    chrome.browserAction.setBadgeText({ text: options.text });
    chrome.browserAction.setBadgeBackgroundColor({ color: options.color });
    if (options.title) {
      this._badgeTitle = options.title;
      chrome.browserAction.setTitle({ title: options.title });
    } else {
      this._badgeTitle = null;
    }
  }

  clearBadge(): void {
    if (this.externalApi && this.externalApi.disabled) return;
    if (this._badgeTitle) {
      this.currentProfileChanged("clearBadge");
    }
    if (this._proxyNotControllable) {
      this.setBadge();
    } else {
      if (chrome.browserAction.setBadgeText != null) {
        chrome.browserAction.setBadgeText({ text: "" });
      }
    }
  }

  setQuickSwitch(quickSwitch: any, canEnable: boolean): any {
    this._quickSwitchCanEnable = canEnable;
    if (!this._quickSwitchHandlerReady) {
      this._quickSwitchHandlerReady = true;
      (window as any).OmegaContextMenuQuickSwitchHandler = (info: any) => {
        const changes: any = {};
        changes["-enableQuickSwitch"] = info.checked;
        const setOptions = this._setOptions(changes);
        if (info.checked && !this._quickSwitchCanEnable) {
          setOptions.then(() => {
            chrome.tabs.create({
              url: chrome.extension.getURL("options.html#/ui"),
            });
          });
        }
      };
    }

    if (quickSwitch || !(chrome.browserAction.setPopup != null)) {
      if (chrome.browserAction.setPopup != null) {
        chrome.browserAction.setPopup({ popup: "" });
      }
      if (!this._quickSwitchInit) {
        this._quickSwitchInit = true;
        chrome.browserAction.onClicked.addListener((tab: any) => {
          this.clearBadge();
          if (!this._options["-enableQuickSwitch"]) {
            chrome.tabs.create({ url: "popup/index.html" });
            return;
          }
          const profiles = this._options["-quickSwitchProfiles"];
          let index = profiles.indexOf(this._currentProfileName);
          index = (index + 1) % profiles.length;
          this.applyProfile(profiles[index]).then(() => {
            if (this._options["-refreshOnProfileChange"]) {
              const url = tab.url;
              if (!url) return;
              if (url.substr(0, 6) === "chrome") return;
              if (url.substr(0, 6) === "about:") return;
              if (url.substr(0, 4) === "moz-") return;
              chrome.tabs.reload(tab.id);
            }
          });
        });
      }
    } else {
      chrome.browserAction.setPopup({ popup: "popup/index.html" });
    }

    if (chrome.contextMenus != null) {
      chrome.contextMenus.update("enableQuickSwitch", {
        checked: !!quickSwitch,
      } as any);
    }
    return Promise.resolve();
  }

  setInspect(settings: any): any {
    if (this._inspect) {
      if (settings.showMenu) {
        this._inspect.enable();
      } else {
        this._inspect.disable();
      }
    }
    return Promise.resolve();
  }

  setMonitorWebRequests(enabled: boolean): any {
    this._monitorWebRequests = enabled;
    if (enabled && this._requestMonitor == null) {
      this._tabRequestInfoPorts = {};
      const wildcardForReq = (req: any) => OmegaPac.wildcardForUrl(req.url);
      this._requestMonitor = new WebRequestMonitor(wildcardForReq);
      this._requestMonitor.watchTabs((tabId: number, info: any) => {
        if (!this._monitorWebRequests) return;
        if (info.errorCount > 0) {
          info.badgeSet = true;
          const badge = {
            text: info.errorCount.toString(),
            color: "#f0ad4e",
          };
          chrome.browserAction.setBadgeText({
            text: badge.text,
            tabId: tabId,
          });
          chrome.browserAction.setBadgeBackgroundColor({
            color: badge.color,
            tabId: tabId,
          });
        } else if (info.badgeSet) {
          info.badgeSet = false;
          chrome.browserAction.setBadgeText({ text: "", tabId: tabId });
        }
        if (this._tabRequestInfoPorts[tabId] != null) {
          this._tabRequestInfoPorts[tabId].postMessage({
            errorCount: info.errorCount,
            summary: info.summary,
          });
        }
      });

      chrome.runtime.onConnect.addListener((rawPort: any) => {
        if (rawPort.name !== "tabRequestInfo") return;
        if (!this._monitorWebRequests) return;
        let tabId: number | null = null;
        const port = new ChromePort(rawPort);
        port.onMessage.addListener((msg: any) => {
          tabId = msg.tabId;
          this._tabRequestInfoPorts[tabId] = port;
          const info = this._requestMonitor.tabInfo[tabId];
          if (info) {
            port.postMessage({
              errorCount: info.errorCount,
              summary: info.summary,
            });
          }
        });
        port.onDisconnect.addListener(() => {
          if (tabId != null) {
            delete this._tabRequestInfoPorts[tabId];
          }
        });
      });
    }
    return Promise.resolve();
  }

  schedule(name: string, periodInMinutes: number, callback: Function): any {
    name = "omega." + name;
    if (this._alarms == null) {
      this._alarms = {};
      chrome.alarms.onAlarm.addListener((alarm: any) => {
        if (this._alarms != null && this._alarms[alarm.name] != null) {
          this._alarms[alarm.name]();
        }
      });
    }
    if (periodInMinutes < 0) {
      delete this._alarms[name];
      chrome.alarms.clear(name);
    } else {
      this._alarms[name] = callback;
      chrome.alarms.create(name, { periodInMinutes: periodInMinutes } as any);
    }
    return Promise.resolve();
  }

  updateProfile(...args: any[]): any {
    return OmegaTarget.Options.prototype.updateProfile
      .apply(this, args)
      .then((results: any) => {
        let error = false;
        for (const profileName of Object.keys(results)) {
          if (results[profileName] instanceof Error) {
            error = true;
            break;
          }
        }
        if (error) {
          // Error handling - currently no-op
        }
        return results;
      });
  }

  printFixedProfile(profile: any): string | undefined {
    if (profile.profileType !== "FixedProfile") return undefined;
    let result = "";
    for (const scheme of OmegaPac.Profiles.schemes) {
      if (profile[scheme.prop]) {
        const pacResult = OmegaPac.Profiles.pacResult(profile[scheme.prop]);
        if (scheme.scheme) {
          result += scheme.scheme + ": " + pacResult + "\n";
        } else {
          result += pacResult + "\n";
        }
      }
    }
    result =
      result ||
      chrome.i18n.getMessage("browserAction_profileDetails_DirectProfile");
    return result;
  }

  printProfile(profile: any): string | null {
    let type = profile.profileType;
    if (type.indexOf("RuleListProfile") >= 0) {
      type = "RuleListProfile";
    }
    if (type === "FixedProfile") {
      return this.printFixedProfile(profile) || null;
    } else if (type === "PacProfile" && profile.pacUrl) {
      return profile.pacUrl;
    } else {
      return (
        chrome.i18n.getMessage("browserAction_profileDetails_" + type) || null
      );
    }
  }

  upgrade(options: any, changes?: any): any {
    return OmegaTarget.Options.prototype.upgrade
      .call(this, options, changes)
      .catch((err: any) => {
        if (options != null && options["schemaVersion"]) {
          return Promise.reject(err);
        }

        let getOldOptions: any;
        if (this.switchySharp) {
          getOldOptions = this.switchySharp.getOptions().timeout(1000);
        } else {
          getOldOptions = Promise.reject();
        }

        getOldOptions = getOldOptions.catch(() => {
          if (options != null && options["config"]) {
            return Promise.resolve(options);
          } else if (localStorage["config"]) {
            return Promise.resolve(localStorage);
          } else {
            return Promise.reject(new OmegaTarget.Options.NoOptionsError());
          }
        });

        return getOldOptions.then((oldOptions: any) => {
          const i18n: any = {
            upgrade_profile_auto: chrome.i18n.getMessage(
              "upgrade_profile_auto",
            ),
          };
          let upgraded: any;
          try {
            upgraded = require("./upgrade")(oldOptions, i18n);
          } catch (ex) {
            this.log.error(ex);
            return Promise.reject(ex);
          }
          if (localStorage["config"]) {
            Object.getPrototypeOf(localStorage).clear.call(localStorage);
          }
          this._state.set({ firstRun: "upgrade" });
          return OmegaTarget.Options.prototype.upgrade.call(
            this,
            upgraded,
            upgraded,
          );
        });
      });
  }

  onFirstRun(reason: string): void {
    chrome.tabs.create({ url: chrome.extension.getURL("options.html") });
  }

  getPageInfo({ tabId, url }: { tabId: number; url: string }): Promise<any> {
    const errorCount =
      this._requestMonitor != null &&
      this._requestMonitor.tabInfo[tabId] != null
        ? this._requestMonitor.tabInfo[tabId].errorCount
        : undefined;
    const result = errorCount ? { errorCount: errorCount } : null;

    const getBadge = new Promise((resolve, _reject) => {
      if (!(chrome.browserAction.getBadgeText != null)) {
        resolve("");
        return;
      }
      chrome.browserAction.getBadgeText({ tabId: tabId }, (text: string) => {
        resolve(text);
      });
    });

    const getInspectUrl = this._state.get({ inspectUrl: "" });

    return Promise.all([getBadge, getInspectUrl]).then(
      ([badge, st]: [string, any]) => {
        let resolvedUrl = url;
        if (badge === "#" && st.inspectUrl) {
          resolvedUrl = st.inspectUrl;
        } else {
          this.clearBadge();
        }
        if (!resolvedUrl) return result;
        if (resolvedUrl.substr(0, 6) === "chrome") {
          const errorPagePrefix = "chrome://errorpage/";
          if (
            resolvedUrl.substr(0, errorPagePrefix.length) === errorPagePrefix
          ) {
            resolvedUrl = querystring.parse(
              resolvedUrl.substr(resolvedUrl.indexOf("?") + 1),
            ).lasturl;
            if (!resolvedUrl) return result;
          } else {
            return result;
          }
        }
        if (resolvedUrl.substr(0, 6) === "about:") return result;
        if (resolvedUrl.substr(0, 4) === "moz-") return result;

        const domain = OmegaPac.getBaseDomain(Url.parse(resolvedUrl).hostname);
        return {
          url: resolvedUrl,
          domain: domain,
          tempRuleProfileName: this.queryTempRule(domain),
          errorCount: errorCount,
        };
      },
    );
  }
}

module.exports = ChromeOptions;
