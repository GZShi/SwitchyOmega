import OmegaTarget from "omega-target";
const OmegaPac = OmegaTarget.OmegaPac;
import querystring from "querystring";
import { WebRequestMonitor } from "./web_request_monitor";
import { ChromePort } from "./chrome_port";
import { fetchUrl } from "./fetch_url";
import { upgrade } from "./upgrade";
import Url from "url";

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
    options ??= this._proxyNotControllable
      ? { text: "=", color: "#da4f49" }
      : { text: "?", color: "#49afcd" };
    chrome.action.setBadgeText({ text: options.text });
    chrome.action.setBadgeBackgroundColor({ color: options.color });
    if (options.title) {
      this._badgeTitle = options.title;
      chrome.action.setTitle({ title: options.title });
    } else {
      this._badgeTitle = null;
    }
  }

  clearBadge(): void {
    if (this.externalApi?.disabled) return;
    if (this._badgeTitle) {
      this.currentProfileChanged("clearBadge");
    }
    if (this._proxyNotControllable) {
      this.setBadge();
    } else {
      if (chrome.action.setBadgeText != null) {
        chrome.action.setBadgeText({ text: "" });
      }
    }
  }

  setQuickSwitch(quickSwitch: any, canEnable: boolean): any {
    this._quickSwitchCanEnable = canEnable;
    if (!this._quickSwitchHandlerReady) {
      this._quickSwitchHandlerReady = true;
      (self as any).OmegaContextMenuQuickSwitchHandler = async (info: any) => {
        const changes: any = {};
        changes["-enableQuickSwitch"] = info.checked;
        const setOptions = this._setOptions(changes);
        if (info.checked && !this._quickSwitchCanEnable) {
          await setOptions;
          chrome.tabs.create({
            url: chrome.runtime.getURL("options/index.html#/ui"),
          });
        }
      };
    }

    if (quickSwitch || !(chrome.action.setPopup != null)) {
      if (chrome.action.setPopup != null) {
        chrome.action.setPopup({ popup: "" });
      }
      if (!this._quickSwitchInit) {
        this._quickSwitchInit = true;
        chrome.action.onClicked.addListener(async (tab: any) => {
          this.clearBadge();
          if (!this._options["-enableQuickSwitch"]) {
            chrome.tabs.create({ url: "popup/index.html" });
            return;
          }
          const profiles = this._options["-quickSwitchProfiles"];
          let index = profiles.indexOf(this._currentProfileName);
          index = (index + 1) % profiles.length;
          await this.applyProfile(profiles[index]);
          if (this._options["-refreshOnProfileChange"]) {
            const url = tab.url;
            if (!url) return;
            if (url.startsWith("chrome")) return;
            if (url.startsWith("about:")) return;
            if (url.startsWith("moz-")) return;
            chrome.tabs.reload(tab.id);
          }
        });
      }
    } else {
      chrome.action.setPopup({ popup: "popup/index.html" });
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
          chrome.action.setBadgeText({
            text: badge.text,
            tabId,
          });
          chrome.action.setBadgeBackgroundColor({
            color: badge.color,
            tabId,
          });
        } else if (info.badgeSet) {
          info.badgeSet = false;
          chrome.action.setBadgeText({ text: "", tabId });
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
          if (tabId == null) return;
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
    name = `omega.${name}`;
    if (this._alarms == null) {
      this._alarms = {};
      chrome.alarms.onAlarm.addListener((alarm: any) => {
        if (this._alarms?.[alarm.name] != null) {
          this._alarms[alarm.name]();
        }
      });
    }
    if (periodInMinutes < 0) {
      delete this._alarms[name];
      chrome.alarms.clear(name);
    } else {
      this._alarms[name] = callback;
      chrome.alarms.create(name, { periodInMinutes } as any);
    }
    return Promise.resolve();
  }

  async updateProfile(...args: any[]): Promise<any> {
    const results = await OmegaTarget.Options.prototype.updateProfile.apply(
      this,
      args as Parameters<typeof OmegaTarget.Options.prototype.updateProfile>,
    );
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
  }

  printFixedProfile(profile: any): string | undefined {
    if (profile.profileType !== "FixedProfile") return undefined;
    let result = "";
    for (const scheme of OmegaPac.Profiles.schemes) {
      if (profile[scheme.prop]) {
        const pacResult = OmegaPac.Profiles.pacResult(profile[scheme.prop]);
        if (scheme.scheme) {
          result += `${scheme.scheme}: ${pacResult}\n`;
        } else {
          result += `${pacResult}\n`;
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
      return this.printFixedProfile(profile) ?? null;
    } else if (type === "PacProfile" && profile.pacUrl) {
      return profile.pacUrl;
    } else {
      return (
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        chrome.i18n.getMessage(`browserAction_profileDetails_${type}`) || null
      );
    }
  }

  async upgrade(options: any, changes?: any): Promise<any> {
    try {
      return await OmegaTarget.Options.prototype.upgrade.call(
        this,
        options,
        changes,
      );
    } catch (err: any) {
      if (options?.["schemaVersion"]) {
        throw err;
      }

      let oldOptions: any;
      try {
        if (this.switchySharp) {
          oldOptions = await Promise.race([
            this.switchySharp.getOptions(),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("SwitchySharp getOptions timed out")),
                1000,
              ),
            ),
          ]);
        } else {
          // eslint-disable-next-line preserve-caught-error -- unrelated fallback path, not wrapping the outer err
          throw new Error("no switchysharp");
        }
      } catch {
        if (options?.["config"]) {
          oldOptions = options;
        } else {
          throw new OmegaTarget.Options.NoOptionsError();
        }
      }

      const i18n: any = {
        upgrade_profile_auto: chrome.i18n.getMessage("upgrade_profile_auto"),
      };
      let upgraded: any;
      try {
        upgraded = upgrade(oldOptions, i18n);
      } catch (ex) {
        this.log.error(ex);
        throw ex;
      }
      this._state.set({ firstRun: "upgrade" });
      return OmegaTarget.Options.prototype.upgrade.call(
        this,
        upgraded,
        upgraded,
      );
    }
  }

  onFirstRun(_reason: string): void {
    chrome.tabs.create({ url: chrome.runtime.getURL("options/index.html") });
  }

  async getPageInfo({
    tabId,
    url,
  }: {
    tabId: number;
    url: string;
  }): Promise<any> {
    const errorCount =
      this._requestMonitor?.tabInfo[tabId] != null
        ? this._requestMonitor.tabInfo[tabId].errorCount
        : undefined;
    const result = errorCount ? { errorCount } : null;

    const getBadge = new Promise<string>((resolve) => {
      if (!(chrome.action.getBadgeText != null)) {
        resolve("");
        return;
      }
      chrome.action.getBadgeText({ tabId }, (text: string) => {
        resolve(text);
      });
    });

    const getInspectUrl = this._state.get({ inspectUrl: "" });

    const [badge, st] = await Promise.all([getBadge, getInspectUrl]);

    let resolvedUrl = url;
    if (badge === "#" && st.inspectUrl) {
      resolvedUrl = st.inspectUrl;
    } else {
      this.clearBadge();
    }
    if (!resolvedUrl) return result;
    if (resolvedUrl.startsWith("chrome")) {
      const errorPagePrefix = "chrome://errorpage/";
      if (resolvedUrl.startsWith(errorPagePrefix)) {
        resolvedUrl =
          (querystring.parse(resolvedUrl.slice(resolvedUrl.indexOf("?") + 1))
            .lasturl as string) ?? undefined;
        if (!resolvedUrl) return result;
      } else {
        return result;
      }
    }
    if (resolvedUrl.startsWith("about:")) return result;
    if (resolvedUrl.startsWith("moz-")) return result;

    const hostname = Url.parse(resolvedUrl).hostname;
    if (!hostname) return result;
    const domain = OmegaPac.getBaseDomain(hostname);
    return {
      url: resolvedUrl,
      domain,
      tempRuleProfileName: this.queryTempRule(domain),
      errorCount,
    };
  }
}

export { ChromeOptions };
