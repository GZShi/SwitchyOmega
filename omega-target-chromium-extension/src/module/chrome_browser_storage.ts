class ChromeBrowserStorage {
  private _prefix: string;

  constructor(prefix: string) {
    this._prefix = prefix;
  }

  async get(keys: any): Promise<Record<string, any>> {
    if (keys == null) {
      const all = await chrome.storage.local.get(null);
      const result: Record<string, any> = {};
      for (const key of Object.keys(all)) {
        if (key.startsWith(this._prefix)) {
          result[key.slice(this._prefix.length)] = all[key];
        }
      }
      return result;
    }

    if (typeof keys === "string") {
      const value = await chrome.storage.local.get(this._prefix + keys);
      const prefixed = this._prefix + keys;
      return value[prefixed] !== undefined ? { [keys]: value[prefixed] } : {};
    }

    if (Array.isArray(keys)) {
      const prefixedKeys = keys.map((k) => this._prefix + k);
      const values = await chrome.storage.local.get(prefixedKeys);
      const result: Record<string, any> = {};
      for (const key of keys) {
        const prefixed = this._prefix + key;
        if (values[prefixed] !== undefined) {
          result[key] = values[prefixed];
        }
      }
      return result;
    }

    const prefixedKeys = Object.keys(keys).map((k) => this._prefix + k);
    const values = await chrome.storage.local.get(prefixedKeys);
    const result: Record<string, any> = {};
    for (const [key, defaultValue] of Object.entries(keys)) {
      const prefixed = this._prefix + key;
      result[key] =
        values[prefixed] !== undefined ? values[prefixed] : defaultValue;
    }
    return result;
  }

  async set(items: Record<string, any>): Promise<any> {
    const prefixed: Record<string, any> = {};
    for (const key of Object.keys(items)) {
      prefixed[this._prefix + key] = items[key];
    }
    await chrome.storage.local.set(prefixed);
    return items;
  }

  async remove(keys: any): Promise<void> {
    if (keys == null) {
      const all = await chrome.storage.local.get(null);
      const toRemove = Object.keys(all).filter((k) =>
        k.startsWith(this._prefix),
      );
      if (toRemove.length > 0) {
        await chrome.storage.local.remove(toRemove);
      }
    } else if (Array.isArray(keys)) {
      const prefixed = keys.map((k) => this._prefix + k);
      await chrome.storage.local.remove(prefixed);
    } else {
      await chrome.storage.local.remove(this._prefix + keys);
    }
  }
}

export { ChromeBrowserStorage };
