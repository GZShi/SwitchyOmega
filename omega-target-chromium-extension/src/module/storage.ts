import { chromeApiPromisify } from "./chrome_api";
import OmegaTarget from "omega-target";

class ChromeStorage extends OmegaTarget.Storage {
  areaName: string;
  storage: any;

  static onChangedListenerInstalled: boolean = false;
  static watchers: Record<string, any> = {};

  static parseStorageErrors(err: any): any {
    if (err?.message) {
      const sustainedPerMinute = "MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE";
      if (err.message.indexOf("QUOTA_BYTES_PER_ITEM") >= 0) {
        err = new OmegaTarget.Storage.QuotaExceededError();
        err.perItem = true;
      } else if (err.message.indexOf("QUOTA_BYTES") >= 0) {
        err = new OmegaTarget.Storage.QuotaExceededError();
      } else if (err.message.indexOf("MAX_ITEMS") >= 0) {
        err = new OmegaTarget.Storage.QuotaExceededError();
        err.maxItems = true;
      } else if (err.message.indexOf("MAX_WRITE_OPERATIONS_") >= 0) {
        err = new OmegaTarget.Storage.RateLimitExceededError();
        if (err.message.indexOf("MAX_WRITE_OPERATIONS_PER_HOUR") >= 0) {
          err.perHour = true;
        } else if (
          err.message.indexOf("MAX_WRITE_OPERATIONS_PER_MINUTE") >= 0
        ) {
          err.perMinute = true;
        }
      } else if (err.message.indexOf(sustainedPerMinute) >= 0) {
        err = new OmegaTarget.Storage.RateLimitExceededError();
        err.perMinute = true;
        err.sustained = 10;
      } else if (err.message.indexOf("is not available") >= 0) {
        err = new OmegaTarget.Storage.StorageUnavailableError();
      } else if (
        err.message.indexOf(
          "Please set webextensions.storage.sync.enabled to true",
        ) >= 0
      ) {
        err = new OmegaTarget.Storage.StorageUnavailableError();
      }
    }
    return Promise.reject(err);
  }

  static onChangedListener(changes: any, areaName: string): void {
    let map: Record<string, any> | null = null;
    const watchers = ChromeStorage.watchers[areaName];
    if (!watchers) return;

    for (const _id of Object.keys(watchers)) {
      const watcher = watchers[_id];
      let match = watcher.keys == null;
      if (!match) {
        for (const key of Object.keys(changes)) {
          if (watcher.keys[key]) {
            match = true;
            break;
          }
        }
      }
      if (match) {
        if (map == null) {
          map = {};
          for (const key of Object.keys(changes)) {
            map[key] = changes[key].newValue;
          }
        }
        watcher.callback(map);
      }
    }
  }

  constructor(areaName: string) {
    super();
    this.areaName = areaName;
    this.storage = {
      get: chromeApiPromisify(chrome.storage[areaName], "get"),
      set: chromeApiPromisify(chrome.storage[areaName], "set"),
      remove: chromeApiPromisify(chrome.storage[areaName], "remove"),
      clear: chromeApiPromisify(chrome.storage[areaName], "clear"),
    };
  }

  get(keys: any): any {
    keys ??= null;
    return Promise.resolve(this.storage.get(keys)).catch(
      ChromeStorage.parseStorageErrors,
    );
  }

  set(items: Record<string, any>): any {
    if (Object.keys(items).length === 0) return Promise.resolve({});
    return Promise.resolve(this.storage.set(items)).catch(
      ChromeStorage.parseStorageErrors,
    );
  }

  remove(keys: any): any {
    if (keys == null) return Promise.resolve(this.storage.clear());
    if (Array.isArray(keys) && keys.length === 0) return Promise.resolve({});
    return Promise.resolve(this.storage.remove(keys)).catch(
      ChromeStorage.parseStorageErrors,
    );
  }

  watch(keys: any, callback: Function): () => void {
    ChromeStorage.watchers[this.areaName] ??= {};
    const area = ChromeStorage.watchers[this.areaName];

    let id = Date.now().toString();
    while (area[id]) {
      id = Date.now().toString();
    }

    let keyMap: Record<string, boolean> | null = null;
    if (Array.isArray(keys)) {
      keyMap = {};
      for (const key of keys) {
        keyMap[key] = true;
      }
      keys = keyMap;
    }

    area[id] = { keys, callback };

    if (!ChromeStorage.onChangedListenerInstalled) {
      chrome.storage.onChanged.addListener(ChromeStorage.onChangedListener);
      ChromeStorage.onChangedListenerInstalled = true;
    }

    return () => {
      delete area[id];
    };
  }
}

export { ChromeStorage };
