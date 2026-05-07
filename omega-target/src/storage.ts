const Promise = require("bluebird");
const Log = require("./log");

class Storage {
  _items: any;

  static RateLimitExceededError = class RateLimitExceededError extends Error {
    constructor() {
      super();
    }
  };

  static QuotaExceededError = class QuotaExceededError extends Error {
    constructor() {
      super();
    }
  };

  static StorageUnavailableError = class StorageUnavailableError extends Error {
    constructor() {
      super();
    }
  };

  static operationsForChanges(
    changes: Record<string, any>,
    opts?: { base?: Record<string, any>; merge?: (key: string, newVal: any, oldVal: any) => any }
  ): { set: Record<string, any>; remove: string[] } {
    const base = opts?.base;
    const merge = opts?.merge;
    const set: Record<string, any> = {};
    const remove: string[] = [];

    for (const key of Object.keys(changes)) {
      let newVal = changes[key];
      const oldVal = base != null ? base[key] : newVal;
      if (merge) {
        newVal = merge(key, newVal, oldVal);
      }
      if (base != null && newVal === oldVal) continue;
      if (typeof newVal === "undefined") {
        if (typeof oldVal !== "undefined" || base == null) {
          remove.push(key);
        }
      } else {
        set[key] = newVal;
      }
    }
    return { set: set, remove: remove };
  }

  get(keys: any): Promise<any> {
    Log.method("Storage#get", this, arguments);
    if (!this._items) return Promise.resolve({});

    if (keys == null) {
      keys = this._items;
    }
    const map: Record<string, any> = {};
    if (typeof keys === "string") {
      map[keys] = this._items[keys];
    } else if (Array.isArray(keys)) {
      for (const key of keys) {
        map[key] = this._items[key];
      }
    } else if (typeof keys === "object") {
      for (const key of Object.keys(keys)) {
        const value = keys[key];
        map[key] = this._items[key] != null ? this._items[key] : value;
      }
    }
    return Promise.resolve(map);
  }

  set(items: Record<string, any>): Promise<any> {
    Log.method("Storage#set", this, arguments);
    if (this._items == null) this._items = {};
    for (const key of Object.keys(items)) {
      this._items[key] = items[key];
    }
    return Promise.resolve(items);
  }

  remove(keys: any): Promise<void> {
    Log.method("Storage#remove", this, arguments);
    if (this._items) {
      if (keys == null) {
        this._items = {};
      } else if (Array.isArray(keys)) {
        for (const key of keys) {
          delete this._items[key];
        }
      } else {
        delete this._items[keys];
      }
    }
    return Promise.resolve();
  }

  watch(keys: any, callback: Function): Function {
    Log.method("Storage#watch", this, arguments);
    return () => null;
  }

  apply(operations: any): Promise<any> {
    if ("changes" in operations) {
      operations = Storage.operationsForChanges(operations.changes, operations);
    }
    return this.set(operations.set).then(() => this.remove(operations.remove)).return(operations);
  }
}

module.exports = Storage;
