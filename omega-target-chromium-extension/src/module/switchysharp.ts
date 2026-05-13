import { ChromePort } from "./chrome_port";

class SwitchySharp {
  static extId: string = "dpplabbmogkhghncfbfdeeokoefdjegm";
  port: any = null;
  _getOptions: Promise<any> | null = null;
  _getOptionsResolver: ((value: any) => void) | null = null;
  _monitorTimerId: any = null;

  monitor(action?: string): void {
    if (this.port == null && this._monitorTimerId == null) {
      this._monitorTimerId = setInterval(this._connect.bind(this), 5000);
      if (action !== "reconnect") {
        this._connect();
      }
    }
  }

  getOptions(): Promise<any> {
    this._getOptions ??= new Promise((resolve) => {
      this._getOptionsResolver = resolve;
      this.monitor();
    });
    return this._getOptions;
  }

  _onMessage(msg: any): void {
    if (this._monitorTimerId) {
      clearInterval(this._monitorTimerId);
      this._monitorTimerId = null;
    }
    switch (msg != null ? msg.action : undefined) {
      case "state":
        OmegaTarget.Log.log(msg);
        if (this._getOptionsResolver) {
          this.port.postMessage({ action: "getOptions" });
        }
        break;
      case "options":
        if (this._getOptionsResolver != null) {
          this._getOptionsResolver(msg.options);
        }
        this._getOptionsResolver = null;
        break;
    }
  }

  _onDisconnect(_msg: any): void {
    // Accessing lastError suppresses the "Unchecked runtime.lastError:
    // Could not establish connection" warning when the legacy SwitchySharp
    // extension is not installed.
    void chrome.runtime.lastError;
    this.port = null;
    this._getOptions = null;
    this._getOptionsResolver = null;
    this.monitor("reconnect");
  }

  _connect(): boolean | null {
    if (!this.port) {
      const rawPort = chrome.runtime.connect(SwitchySharp.extId);
      this.port = new ChromePort(rawPort);
      this.port.onDisconnect.addListener(this._onDisconnect.bind(this));
      if (this.port != null) {
        this.port.onMessage.addListener(this._onMessage.bind(this));
      }
    }
    try {
      this.port.postMessage({ action: "disable" });
    } catch (_e) {
      this.port = null;
    }
    return this.port != null ? true : null;
  }
}

export { SwitchySharp };
