const Storage = require("./storage");

class BrowserStorage extends Storage {
  storage: any;
  prefix: string;
  proto: any;

  constructor(storage: any, prefix?: string) {
    super();
    this.storage = storage;
    this.prefix = prefix || "";
    this.proto = Object.getPrototypeOf(this.storage);
  }

  get(keys: any): Promise<any> {
    const map: Record<string, any> = {};
    const storage = this.storage;
    const proto = this.proto;
    const prefix = this.prefix;

    if (keys == null) {
      // Retrieving all keys needs iteration over all storage items.
      let i = 0;
      while (i < storage.length) {
        const key = proto.key.call(storage, i);
        if (key && key.substr(0, prefix.length) === prefix) {
          try {
            map[key.substring(prefix.length)] = JSON.parse(
              proto.getItem.call(storage, key),
            );
          } catch (_e) {
            // Skip unparseable items
          }
        }
        i++;
      }
    } else if (typeof keys === "string") {
      try {
        const raw = proto.getItem.call(storage, prefix + keys);
        if (raw != null) map[keys] = JSON.parse(raw);
      } catch (_e) {
        // Skip unparseable
      }
    } else if (Array.isArray(keys)) {
      for (const key of keys) {
        try {
          const raw = proto.getItem.call(storage, prefix + key);
          if (raw != null) map[key] = JSON.parse(raw);
        } catch (_e) {
          // Skip unparseable
        }
      }
    } else if (typeof keys === "object") {
      for (const key of Object.keys(keys)) {
        const defVal = keys[key];
        try {
          const raw = proto.getItem.call(storage, prefix + key);
          if (raw != null) {
            map[key] = JSON.parse(raw);
          } else {
            map[key] = defVal;
          }
        } catch (_e) {
          map[key] = defVal;
        }
      }
    }
    return Promise.resolve(map);
  }

  set(items: Record<string, any>): Promise<any> {
    const storage = this.storage;
    const proto = this.proto;
    const prefix = this.prefix;
    for (const key of Object.keys(items)) {
      const value = JSON.stringify(items[key]);
      proto.setItem.call(storage, prefix + key, value);
    }
    return Promise.resolve(items);
  }

  remove(keys: any): Promise<void> {
    const storage = this.storage;
    const proto = this.proto;
    const prefix = this.prefix;

    if (keys == null) {
      if (prefix) {
        let i = 0;
        while (i < storage.length) {
          const key = proto.key.call(storage, i);
          if (key && key.substr(0, prefix.length) === prefix) {
            proto.removeItem.call(storage, key);
          } else {
            i++;
          }
        }
      } else {
        proto.clear.call(storage);
      }
    } else if (Array.isArray(keys)) {
      for (const key of keys) {
        proto.removeItem.call(storage, prefix + key);
      }
    } else {
      proto.removeItem.call(storage, prefix + keys);
    }
    return Promise.resolve();
  }
}

module.exports = BrowserStorage;
