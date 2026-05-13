import { ChromePort } from "./chrome_port";

class ExternalApi {
  options: any;
  knownExts: Record<string, number> = {
    padekgcemlokbadohgkifijomclgjgif: 32,
  };
  disabled: boolean = false;
  _previousProfileName: string | null = null;

  constructor(options: any) {
    this.options = options;
  }

  listen(): void {
    if (!chrome.runtime.onConnectExternal) return;
    chrome.runtime.onConnectExternal.addListener((rawPort: any) => {
      const port = new ChromePort(rawPort);
      port.onMessage.addListener((msg: any) => this.onMessage(msg, port));
      port.onDisconnect.addListener(this.reenable.bind(this));
    });
  }

  reenable(): void {
    if (!this.disabled) return;
    this.options.setProxyNotControllable(null);
    if (chrome.action.setPopup != null) {
      chrome.action.setPopup({ popup: "popup/index.html" });
    }
    this.options.reloadQuickSwitch();
    this.disabled = false;
    this.options.clearBadge();
    this.options.applyProfile(this._previousProfileName);
  }

  checkPerm(port: any, level: number): boolean {
    const perm = this.knownExts[port.sender.id] || 0;
    if (perm < level) {
      port.postMessage({ action: "error", error: "permission" });
      return false;
    }
    return true;
  }

  onMessage(msg: any, port: any): void {
    this.options.log.log(`${port.sender.id} -> ${msg.action}`, msg);
    switch (msg.action) {
      case "disable":
        if (!this.checkPerm(port, 16)) return;
        if (this.disabled) return;
        this.disabled = true;
        this._previousProfileName =
          (this.options.currentProfile() != null
            ? this.options.currentProfile().name
            : null) ?? "system";
        this.options.applyProfile("system").then(() => {
          let reason = "disabled";
          if (this.knownExts[port.sender.id] >= 32) {
            reason = "upgrade";
          }
          this.options.setProxyNotControllable(reason, {
            text: "X",
            color: "#5ab432",
          });
        });
        if (chrome.action.setPopup != null) {
          chrome.action.setPopup({ popup: "popup/index.html" });
        }
        port.postMessage({ action: "state", state: "disabled" });
        break;
      case "enable":
        this.reenable();
        port.postMessage({ action: "state", state: "enabled" });
        break;
      case "getOptions":
        if (!this.checkPerm(port, 8)) return;
        port.postMessage({
          action: "options",
          options: this.options.getAll(),
        });
        break;
      default:
        port.postMessage({
          action: "error",
          error: "noSuchAction",
          action_name: msg.action,
        });
    }
  }
}

export { ExternalApi };
