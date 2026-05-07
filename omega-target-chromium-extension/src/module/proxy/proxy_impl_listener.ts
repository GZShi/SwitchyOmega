const OmegaTarget = require("omega-target");
const OmegaPac = OmegaTarget.OmegaPac;
const NativePromise = (typeof Promise !== "undefined" ? Promise : null) as typeof Promise | null;
const ProxyImpl = require("./proxy_impl");

class ListenerProxyImpl extends ProxyImpl {
  _options: any = null;
  _profile: any = null;
  _optionsReady: Promise<void> | null = null;
  _optionsReadyCallback: (() => void) | null = null;

  static isSupported(): boolean {
    return (
      NativePromise != null &&
      typeof browser !== "undefined" && browser != null &&
      browser.proxy != null && browser.proxy.onRequest != null
    );
  }

  features: string[] = ["fullUrl", "socks5Auth"];

  constructor(...args: any[]) {
    super(args[0]);
    this._optionsReady = new NativePromise!((resolve) => {
      this._optionsReadyCallback = resolve;
    });
    this._initRequestListeners();
  }

  _initRequestListeners(): void {
    browser.proxy.onRequest.addListener(this.onRequest.bind(this), {
      urls: ["<all_urls>"],
    });
    browser.proxy.onError.addListener(this.onError.bind(this));
  }

  watchProxyChange(_callback: Function): any {
    return null;
  }

  applyProfile(profile: any, _state: any, options: any): any {
    this._options = options;
    this._profile = profile;
    if (this._optionsReadyCallback != null) this._optionsReadyCallback();
    this._optionsReadyCallback = null;
    return this.setProxyAuth(profile, options);
  }

  onRequest(requestDetails: any): any {
    return NativePromise!.resolve(
      this._optionsReady!.then(() => {
        const request = OmegaPac.Conditions.requestFromUrl(requestDetails.url);
        let profile = this._profile;
        while (profile) {
          const result = OmegaPac.Profiles.match(profile, request);
          if (!result) {
            switch (profile.profileType) {
              case "DirectProfile":
                return { type: "direct" };
              case "SystemProfile":
                return undefined;
              default:
                throw new Error("Unsupported profile: " + profile.profileType);
            }
          }
          let next: any;
          if (Array.isArray(result)) {
            const proxy = result[2];
            const auth = result[3];
            if (proxy) return this.proxyInfo(proxy, auth);
            next = result[0];
          } else if (result.profileName) {
            next = OmegaPac.Profiles.nameAsKey(result.profileName);
          } else {
            break;
          }
          profile = OmegaPac.Profiles.byKey(next, this._options);
        }

        throw new Error("Profile not found: " + next);
      })
    );
  }

  onError(error: any): void {
    this.log.error(error);
  }

  proxyInfo(proxy: any, auth: any): any[] {
    const proxyInfo: any = {
      type: proxy.scheme,
      host: proxy.host,
      port: proxy.port,
    };
    if (proxyInfo.type === "socks5") {
      proxyInfo.type = "socks";
      if (auth) {
        proxyInfo.username = auth.username;
        proxyInfo.password = auth.password;
      }
    }
    if (proxyInfo.type === "socks") {
      proxyInfo.proxyDNS = true;
    }
    return [proxyInfo];
  }
}

module.exports = ListenerProxyImpl;
