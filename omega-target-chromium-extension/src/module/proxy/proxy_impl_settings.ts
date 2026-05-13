import OmegaTarget from "omega-target";
const OmegaPac = OmegaTarget.OmegaPac;
import { chromeApiPromisify } from "../chrome_api";
import { ProxyImpl } from "./proxy_impl";

class SettingsProxyImpl extends ProxyImpl {
  _proxyChangeWatchers: Function[] | null = null;

  static isSupported(): boolean {
    return typeof chrome !== "undefined" && chrome?.proxy?.settings != null;
  }

  features: string[] = ["fullUrlHttp", "pacScript", "watchProxyChange"];

  async applyProfile(profile: any, meta: any, options: any): Promise<any> {
    meta ??= profile;
    if (profile.profileType === "SystemProfile") {
      await chromeApiPromisify(chrome.proxy.settings, "clear")({});
      chrome.proxy.settings.get({}, this._proxyChangeListener);
      return;
    }
    let config: any = {};
    if (profile.profileType === "DirectProfile") {
      config["mode"] = "direct";
    } else if (profile.profileType === "PacProfile") {
      config["mode"] = "pac_script";
      config["pacScript"] =
        !profile.pacScript || OmegaPac.Profiles.isFileUrl(profile.pacUrl)
          ? { url: profile.pacUrl, mandatory: true }
          : {
              data: OmegaPac.PacGenerator.ascii(profile.pacScript),
              mandatory: true,
            };
    } else if (profile.profileType === "FixedProfile") {
      config = this._fixedProfileConfig(profile);
    } else {
      config["mode"] = "pac_script";
      config["pacScript"] = {
        mandatory: true,
        data: this.getProfilePacScript(profile, meta, options),
      };
    }
    await this.setProxyAuth(profile, options);
    await chromeApiPromisify(chrome.proxy.settings, "set")({ value: config });
    chrome.proxy.settings.get({}, this._proxyChangeListener);
  }

  _fixedProfileConfig(profile: any): any {
    const config: any = {};
    config["mode"] = "fixed_servers";
    const rules: any = {};
    const protocols = ["proxyForHttp", "proxyForHttps", "proxyForFtp"];
    let protocolProxySet = false;

    for (const protocol of protocols) {
      if (profile[protocol] != null) {
        rules[protocol] = profile[protocol];
        protocolProxySet = true;
      }
    }

    if (profile.fallbackProxy) {
      if (profile.fallbackProxy.scheme === "http") {
        if (!protocolProxySet) {
          rules["singleProxy"] = profile.fallbackProxy;
        } else {
          for (const protocol of protocols) {
            rules[protocol] ??= JSON.parse(
              JSON.stringify(profile.fallbackProxy),
            );
          }
        }
      } else {
        rules["fallbackProxy"] = profile.fallbackProxy;
      }
    } else if (!protocolProxySet) {
      config["mode"] = "direct";
    }

    if (config["mode"] !== "direct") {
      const bypassList: string[] = [];
      for (const condition of profile.bypassList) {
        bypassList.push(this._formatBypassItem(condition));
      }
      rules["bypassList"] = bypassList;
      config["rules"] = rules;
    }
    return config;
  }

  _formatBypassItem(condition: any): string {
    const str = OmegaPac.Conditions.str(condition);
    const i = str.indexOf(" ");
    return str.slice(i + 1);
  }

  _proxyChangeListener = (details: any): void => {
    const watchers = this._proxyChangeWatchers ?? [];
    for (const watcher of watchers) {
      watcher(details);
    }
  };

  watchProxyChange(callback: Function): void {
    const isNew = this._proxyChangeWatchers == null;
    this._proxyChangeWatchers ??= [];
    if (isNew) {
      if (
        typeof chrome !== "undefined" &&
        chrome?.proxy?.settings?.onChange != null
      ) {
        chrome.proxy.settings.onChange.addListener(
          this._proxyChangeListener.bind(this),
        );
      }
    }
    this._proxyChangeWatchers.push(callback);
  }

  parseExternalProfile(details: any, options: any): any {
    if (details.name) return details;
    switch (details.value.mode) {
      case "system":
        return OmegaPac.Profiles.byName("system");
      case "direct":
        return OmegaPac.Profiles.byName("direct");
      case "auto_detect":
        return OmegaPac.Profiles.create({
          profileType: "PacProfile",
          name: "",
          pacUrl: "http://wpad/wpad.dat",
        });
      case "pac_script": {
        const url = details.value.pacScript.url;
        if (url) {
          let profile: any = null;
          OmegaPac.Profiles.each(options, (_key: string, p: any) => {
            if (p.profileType === "PacProfile" && p.pacUrl === url) {
              profile = p;
            }
          });
          return (
            profile ??
            OmegaPac.Profiles.create({
              profileType: "PacProfile",
              name: "",
              pacUrl: url,
            })
          );
        } else {
          let profile: any = null;
          const script = details.value.pacScript.data;
          OmegaPac.Profiles.each(options, (_key: string, p: any) => {
            if (p.profileType === "PacProfile" && p.pacScript === script) {
              profile = p;
            }
          });
          if (profile) return profile;
          const trimmed = script.trim();
          const magic = "/*OmegaProfile*";
          if (trimmed.startsWith(magic)) {
            const end = trimmed.indexOf("*/");
            if (end > 0) {
              const tokens = trimmed.slice(magic.length, end).split("*");
              let profileName = tokens[0];
              const revision = tokens[1];
              try {
                profileName = JSON.parse(profileName);
              } catch (_e) {
                profileName = null;
              }
              if (profileName && revision) {
                const p = OmegaPac.Profiles.byName(profileName, options);
                if (OmegaPac.Revision.compare(p.revision, revision) === 0) {
                  return p;
                }
              }
            }
          }
          return OmegaPac.Profiles.create({
            profileType: "PacProfile",
            name: "",
            pacScript: script,
          });
        }
      }
      case "fixed_servers": {
        const props = [
          "proxyForHttp",
          "proxyForHttps",
          "proxyForFtp",
          "fallbackProxy",
          "singleProxy",
        ];
        const proxies: any = {};
        for (const prop of props) {
          const result = OmegaPac.Profiles.pacResult(details.value.rules[prop]);
          if (prop === "singleProxy" && details.value.rules[prop] != null) {
            proxies["fallbackProxy"] = result;
          } else {
            proxies[prop] = result;
          }
        }
        const bypassSet: Record<string, boolean> = {};
        let bypassCount = 0;
        if (details.value.rules.bypassList) {
          for (const pattern of details.value.rules.bypassList) {
            bypassSet[pattern] = true;
            bypassCount++;
          }
        }
        if (bypassSet["<local>"]) {
          for (const host of OmegaPac.Conditions.localHosts) {
            if (bypassSet[host]) {
              delete bypassSet[host];
              bypassCount--;
            }
          }
        }
        let profile: any = null;
        OmegaPac.Profiles.each(options, (_key: string, p: any) => {
          if (p.profileType !== "FixedProfile") return;
          if (p.bypassList.length !== bypassCount) return;
          for (const condition of p.bypassList) {
            if (!bypassSet[condition.pattern]) return;
          }
          const rules = this._fixedProfileConfig(p).rules;
          if (rules["singleProxy"]) {
            rules["fallbackProxy"] = rules["singleProxy"];
            delete rules["singleProxy"];
          }
          if (rules == null) return;
          for (const prop of props) {
            if (rules[prop] || proxies[prop]) {
              if (OmegaPac.Profiles.pacResult(rules[prop]) !== proxies[prop])
                return;
            }
          }
          profile = p;
        });
        if (profile) return profile;

        profile = OmegaPac.Profiles.create({
          profileType: "FixedProfile",
          name: "",
        });
        for (const prop of props) {
          if (details.value.rules[prop]) {
            if (prop === "singleProxy") {
              profile["fallbackProxy"] = details.value.rules[prop];
            } else {
              profile[prop] = details.value.rules[prop];
            }
          }
        }
        profile.bypassList = [];
        for (const pattern of Object.keys(bypassSet)) {
          profile.bypassList.push({
            conditionType: "BypassCondition",
            pattern,
          });
        }
        return profile;
      }
    }
    return null;
  }
}

export { SettingsProxyImpl };
