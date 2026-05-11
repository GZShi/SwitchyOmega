declare var angular: any;
declare var chrome: any;
declare var localStorage: any;

angular.module("omegaTarget", []).factory("omegaTarget", [
  "$q",
  function ($q: any) {
    function decodeError(obj: any): any {
      if (obj._error === "error") {
        const err: any = new Error(obj.message);
        err.name = obj.name;
        err.stack = obj.stack;
        err.original = obj.original;
        return err;
      } else {
        return obj;
      }
    }

    function callBackgroundNoReply(method: string, ...args: any[]): void {
      chrome.runtime.sendMessage({
        method,
        args,
        noReply: true,
      });
    }

    function callBackground(method: string, ...args: any[]): Promise<any> {
      const d = $q["defer"]();
      chrome.runtime.sendMessage({ method, args }, (response: any) => {
        if (chrome.runtime.lastError != null) {
          d.reject(chrome.runtime.lastError);
          return;
        }
        if (response.error) {
          d.reject(decodeError(response.error));
        } else {
          d.resolve(response.result);
        }
      });
      return d.promise;
    }

    function connectBackground(
      name: string,
      message: any,
      callback: Function,
    ): void {
      const port = chrome.runtime.connect({ name });
      const onDisconnect = () => {
        port.onDisconnect.removeListener(onDisconnect);
        port.onMessage.removeListener(callback);
      };
      port.onDisconnect.addListener(onDisconnect);
      port.postMessage(message);
      port.onMessage.addListener(callback);
    }

    function isChromeUrl(url: string): boolean {
      return (
        url.startsWith("chrome") ||
        url.startsWith("about:") ||
        url.startsWith("moz-")
      );
    }

    const optionsChangeCallback: Function[] = [];
    let requestInfoCallback: Function | null = null;
    const prefix = "omega.local.";
    const urlParser = document.createElement("a");

    const omegaTarget: any = {
      options: null,

      state(name: any, value?: any): any {
        if (arguments.length === 1) {
          const getValue = (key: string) => {
            try {
              return JSON.parse(localStorage[prefix + key]);
            } catch (_e) {
              return undefined;
            }
          };
          if (Array.isArray(name)) {
            return $q.when(name.map(getValue));
          } else {
            return $q.when(getValue(name));
          }
        } else {
          localStorage[prefix + name] = JSON.stringify(value);
        }
        return $q.when(value);
      },

      lastUrl(url?: string): any {
        const name = "web.last_url";
        if (url) {
          omegaTarget.state(name, url);
          return url;
        } else {
          try {
            return JSON.parse(localStorage[prefix + name]);
          } catch (_e) {
            return undefined;
          }
        }
      },

      addOptionsChangeCallback(callback: Function): void {
        optionsChangeCallback.push(callback);
      },

      refresh(args?: any): Promise<any> {
        return callBackground("getAll").then((opt: any) => {
          omegaTarget.options = opt;
          for (const callback of optionsChangeCallback) {
            callback(omegaTarget.options);
          }
          return args;
        });
      },

      renameProfile(fromName: string, toName: string): Promise<any> {
        return callBackground("renameProfile", fromName, toName).then(
          omegaTarget.refresh,
        );
      },

      replaceRef(fromName: string, toName: string): Promise<any> {
        return callBackground("replaceRef", fromName, toName).then(
          omegaTarget.refresh,
        );
      },

      optionsPatch(patch: any): Promise<any> {
        return callBackground("patch", patch).then(omegaTarget.refresh);
      },

      resetOptions(opt: any): Promise<any> {
        return callBackground("reset", opt).then(omegaTarget.refresh);
      },

      updateProfile(name: string, opt_bypass_cache?: boolean): Promise<any> {
        return callBackground("updateProfile", name, opt_bypass_cache)
          .then((results: any) => {
            for (const key of Object.keys(results)) {
              results[key] = decodeError(results[key]);
            }
            return results;
          })
          .then(omegaTarget.refresh);
      },

      getMessage: chrome.i18n.getMessage.bind(chrome.i18n),

      openOptions(hash?: string): Promise<void> {
        const d = $q["defer"]();
        const options_url = chrome.extension.getURL("options.html");
        chrome.tabs.query({ url: options_url }, (tabs: any[]): void => {
          let url: string;
          if (hash) {
            urlParser.href =
              // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
              (tabs[0] != null ? tabs[0].url : undefined) || options_url;
            urlParser.hash = hash;
            url = urlParser.href;
          } else {
            url = options_url;
          }
          if (tabs.length > 0) {
            const props: any = { active: true };
            if (hash) props.url = url;
            chrome.tabs.update(tabs[0].id, props);
          } else {
            chrome.tabs.create({ url });
          }
          d.resolve();
        });
        return d.promise;
      },

      applyProfile(name: string): Promise<any> {
        return callBackground("applyProfile", name);
      },

      applyProfileNoReply(name: string): void {
        callBackgroundNoReply("applyProfile", name);
      },

      addTempRule(domain: string, profileName: string): Promise<any> {
        return callBackground("addTempRule", domain, profileName);
      },

      addCondition(condition: any, profileName: string): Promise<any> {
        return callBackground("addCondition", condition, profileName);
      },

      addProfile(profile: any): Promise<any> {
        return callBackground("addProfile", profile).then(omegaTarget.refresh);
      },

      setDefaultProfile(
        profileName: string,
        defaultProfileName: string,
      ): Promise<any> {
        return callBackground(
          "setDefaultProfile",
          profileName,
          defaultProfileName,
        );
      },

      getActivePageInfo(): Promise<any> {
        const clearBadge = true;
        const d = $q["defer"]();
        chrome.tabs.query(
          { active: true, lastFocusedWindow: true },
          (tabs: any[]): void => {
            if (!tabs[0]?.url) {
              d.resolve(null);
              return;
            }
            const args = { tabId: tabs[0].id, url: tabs[0].url };
            if (tabs[0].id && requestInfoCallback) {
              connectBackground("tabRequestInfo", args, requestInfoCallback);
            }
            d.resolve(callBackground("getPageInfo", args));
          },
        );
        return d.promise.then((info: any) => {
          return info?.url ? info : null;
        });
      },

      refreshActivePage(): Promise<void> {
        const d = $q["defer"]();
        chrome.tabs.query(
          { active: true, lastFocusedWindow: true },
          (tabs: any[]): void => {
            if (tabs[0].url && !isChromeUrl(tabs[0].url)) {
              chrome.tabs.reload(tabs[0].id, { bypassCache: true });
            }
            d.resolve();
          },
        );
        return d.promise;
      },

      openManage(): void {
        chrome.tabs.create({
          url: `chrome://extensions/?id=${chrome.runtime.id}`,
        });
      },

      openShortcutConfig(): void {
        chrome.tabs.create({ url: "chrome://extensions/configureCommands" });
      },

      setOptionsSync(enabled: boolean, args?: any): Promise<any> {
        return callBackground("setOptionsSync", enabled, args);
      },

      resetOptionsSync(): Promise<any> {
        return callBackground("resetOptionsSync");
      },

      setRequestInfoCallback(callback: Function): void {
        requestInfoCallback = callback;
      },
    };

    return omegaTarget;
  },
]);
