class TrackedEvent {
  event: any;
  callbacks: Function[];

  constructor(event: any) {
    this.event = event;
    this.callbacks = [];
    const mes = [
      "hasListener",
      "hasListeners",
      "addRules",
      "getRules",
      "removeRules",
    ];
    for (const methodName of mes) {
      const method = this.event[methodName];
      if (method != null) {
        (this as any)[methodName] = method.bind(this.event);
      }
    }
  }

  addListener(callback: Function): this {
    this.event.addListener(callback);
    this.callbacks.push(callback);
    return this;
  }

  removeListener(callback: Function): this {
    this.event.removeListener(callback);
    const i = this.callbacks.indexOf(callback);
    if (i >= 0) this.callbacks.splice(i, 1);
    return this;
  }

  removeAllListeners(): this {
    for (const callback of this.callbacks) {
      this.event.removeListener(callback);
    }
    this.callbacks = [];
    return this;
  }

  dispose(): void {
    this.removeAllListeners();
    if (this.event.hasListeners?.()) {
      throw new Error("Underlying Event still has listeners!");
    }
    this.event = null;
    this.callbacks = null!;
  }
}

class ChromePort {
  port: any;
  name: string;
  sender: any;
  disconnect: () => void;
  postMessage: (...args: any[]) => void;
  onMessage: TrackedEvent;
  onDisconnect: TrackedEvent;

  constructor(port: any) {
    this.port = port;
    this.name = port.name;
    this.sender = port.sender;

    this.disconnect = port.disconnect.bind(port);
    this.postMessage = (...args: any[]) => {
      try {
        this.port.postMessage(...args);
      } catch (_e) {
        return;
      }
    };

    this.onMessage = new TrackedEvent(port.onMessage);
    this.onDisconnect = new TrackedEvent(port.onDisconnect);
    this.onDisconnect.addListener(this.dispose.bind(this));
  }

  dispose(): void {
    this.onMessage.dispose();
    this.onDisconnect.dispose();
  }
}

export { ChromePort };
