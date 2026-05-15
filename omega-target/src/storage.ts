import Log from "./log";
import type { StorageLike, StorageOperations, StorageMergeFn } from "./types";

class RateLimitExceededError extends Error {
  override name = "RateLimitExceededError";
}

class QuotaExceededError extends Error {
  override name = "QuotaExceededError";
}

class StorageUnavailableError extends Error {
  override name = "StorageUnavailableError";
}

class Storage implements StorageLike {
  _items: Record<string, any> | null = null;

  static RateLimitExceededError = RateLimitExceededError;
  static QuotaExceededError = QuotaExceededError;
  static StorageUnavailableError = StorageUnavailableError;

  static operationsForChanges(
    changes: Record<string, any>,
    opts?: {
      base?: Record<string, any>;
      merge?: StorageMergeFn;
    },
  ): StorageOperations {
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
    return { set, remove };
  }

  get(keys: any): Promise<any> {
    Log.method("Storage#get", this, arguments);
    if (!this._items) return Promise.resolve({});

    const items = this._items;
    if (keys == null) return Promise.resolve({ ...items });
    if (typeof keys === "string")
      return Promise.resolve({ [keys]: items[keys] });
    if (Array.isArray(keys))
      return Promise.resolve(
        Object.fromEntries(keys.map((k) => [k, items[k]])),
      );
    // Object form: keys are defaults
    return Promise.resolve(
      Object.fromEntries(
        Object.entries(keys).map(([k, def]) => [k, items[k] ?? def]),
      ),
    );
  }

  set(items: Record<string, any>): Promise<any> {
    Log.method("Storage#set", this, arguments);
    this._items ??= {};
    Object.assign(this._items, items);
    return Promise.resolve(items);
  }

  remove(keys: any): Promise<void> {
    Log.method("Storage#remove", this, arguments);
    if (!this._items) return Promise.resolve();

    if (keys == null) {
      this._items = {};
    } else if (Array.isArray(keys)) {
      for (const key of keys) delete this._items[key];
    } else {
      delete this._items[keys];
    }
    return Promise.resolve();
  }

  watch(_keys: any, _callback: Function): Function {
    Log.method("Storage#watch", this, arguments);
    return () => undefined;
  }

  async apply(operations: any): Promise<any> {
    if ("changes" in operations) {
      operations = Storage.operationsForChanges(operations.changes, operations);
    }
    await this.set(operations.set);
    await this.remove(operations.remove);
    return operations;
  }
}

export default Storage;
