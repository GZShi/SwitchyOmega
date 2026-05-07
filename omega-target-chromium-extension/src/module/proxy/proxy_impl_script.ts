const OmegaTarget = require("omega-target");
const Promise = OmegaTarget.Promise;
const ProxyImpl = require("./proxy_impl");

class ScriptProxyImpl extends ProxyImpl {
  _proxyScriptUrl: string = "js/omega_webext_proxy_script.min.js";
  _proxyScriptDisabled: boolean = false;
  _proxyScriptInitialized: boolean = false;
  _proxyScriptState: any = {};
  _options: any = null;

  static isSupported(): boolean {
    return (
      (typeof browser !== "undefined" && browser != null &&
       browser.proxy != null && browser.proxy.register != null) ||
      (typeof browser !== "undefined" && browser != null &&
       browser.proxy != null && browser.proxy.registerProxyScript != null)
    );
  }

  features: string[] = ["socks5Auth"];

  watchProxyChange(_callback: Function): any {
    return null;
  }

  applyProfile(profile: any, state: any, options: any): any {
    this.log.error(
      "Your browser is outdated! Full-URL based matching, etc. unsupported! " +
        "Please update your browser ASAP!"
    );
    if (state == null) state = {};
    this._options = options;
    state.currentProfileName = profile.name;
    if (profile.name === "") {
      state.tempProfile = profile;
    }
    if (profile.profileType === "SystemProfile") {
      if (browser.proxy.unregister != null) {
        browser.proxy.unregister();
      } else {
        browser.proxy.registerProxyScript("js/omega_invalid_proxy_script.js");
      }
      this._proxyScriptDisabled = true;
      return Promise.resolve();
    } else {
      this._proxyScriptState = state;
      return Promise.all([
        browser.runtime.getBrowserInfo(),
        this._initWebextProxyScript(),
      ]).then(([info]: [any, any]) => {
        if (info.vendor === "Mozilla" && info.buildID < "20170918220054") {
          this.log.error(
            "Your browser is outdated! SOCKS5 DNS/Auth unsupported! " +
              "Please update your browser ASAP! (Current Build " +
              info.buildID +
              ")"
          );
          this._proxyScriptState.useLegacyStringReturn = true;
        }
        this._proxyScriptStateChanged();
      });
    }
  }

  _initWebextProxyScript(): Promise<void> {
    if (!this._proxyScriptInitialized) {
      browser.proxy.onProxyError.addListener((err: any) => {
        if (err != null && err.message != null) {
          if (err.message.indexOf("Invalid Proxy Rule: DIRECT") >= 0) return;
          if (err.message.indexOf("Return type must be a string") >= 0) {
            this.log.error(
              "Your browser is outdated! SOCKS5 DNS/Auth unsupported! " +
                "Please update your browser ASAP!"
            );
            this._proxyScriptState.useLegacyStringReturn = true;
            this._proxyScriptStateChanged();
            return;
          }
        }
        this.log.error(err);
      });

      browser.runtime.onMessage.addListener((message: any) => {
        if (message.event !== "proxyScriptLog") return;
        if (message.level === "error") {
          this.log.error(message);
        } else if (message.level === "warn") {
          this.log.error(message);
        } else {
          this.log.log(message);
        }
      });
    }

    let promise: Promise<void>;
    if (!this._proxyScriptInitialized || this._proxyScriptDisabled) {
      promise = new Promise<void>((resolve) => {
        const onMessage = (message: any) => {
          if (message.event !== "proxyScriptLoaded") return;
          resolve();
          browser.runtime.onMessage.removeListener(onMessage);
        };
        browser.runtime.onMessage.addListener(onMessage);
      });
      if (browser.proxy.register != null) {
        browser.proxy.register(this._proxyScriptUrl);
      } else {
        browser.proxy.registerProxyScript(this._proxyScriptUrl);
      }
      this._proxyScriptDisabled = false;
    } else {
      promise = Promise.resolve();
    }
    this._proxyScriptInitialized = true;
    return promise;
  }

  _proxyScriptStateChanged(): void {
    browser.runtime.sendMessage(
      {
        event: "proxyScriptStateChanged",
        state: this._proxyScriptState,
        options: this._options,
      },
      { toProxyScript: true }
    );
  }
}

module.exports = ScriptProxyImpl;
