import Storage from "./storage";
import Log from "./log";
import { Revision } from "omega-pac";
import * as jsondiffpatch from "jsondiffpatch";
import { TokenBucket as LimiterTokenBucket } from "limiter";
import type { StorageLike, OptionsSyncLike } from "./types";

// Thin wrapper over limiter v3's TokenBucket preserving the legacy positional
// constructor used by downstream callers (OptionsSync itself and tests).
class TokenBucket {
  _bucket: LimiterTokenBucket;

  constructor(
    bucketSize?: number,
    tokensPerInterval?: number,
    interval?: string | number,
    parentBucket?: LimiterTokenBucket,
  ) {
    this._bucket = new LimiterTokenBucket({
      bucketSize: bucketSize ?? Number.MAX_SAFE_INTEGER,
      tokensPerInterval: tokensPerInterval ?? Number.MAX_SAFE_INTEGER,
      interval: (interval ?? "minute") as any,
      parentBucket: parentBucket ?? undefined,
    });
  }

  get content(): number {
    return this._bucket.content;
  }

  removeTokens(count: number): Promise<number> {
    return this._bucket.removeTokens(count);
  }

  tryRemoveTokens(count: number): boolean {
    return this._bucket.tryRemoveTokens(count);
  }

  clear(): void {
    this._bucket.tryRemoveTokens(this._bucket.content);
  }
}

class OptionsSync implements OptionsSyncLike {
  static TokenBucket = TokenBucket;

  _timeout: ReturnType<typeof setTimeout> | null = null;
  _bucket: TokenBucket;
  _waiting = false;
  _pending: Record<string, any> = {};

  debounce = 1000;
  pullThrottle = 1000;
  storage: StorageLike;
  enabled = true;

  private readonly _diffEngine = jsondiffpatch.create({
    objectHash: (obj: any) => JSON.stringify(obj),
    textDiff: { minLength: Infinity } as any,
  });

  constructor(storage?: StorageLike, bucket?: TokenBucket) {
    this.storage = storage as StorageLike;
    this._bucket = bucket ?? new TokenBucket(10, 10, "minute");
    if (typeof (this._bucket as any).clear !== "function") {
      (this._bucket as any).clear = () => {
        this._bucket.tryRemoveTokens(this._bucket.content);
      };
    }
    this._pending = {};
  }

  transformValue = (v: any, _key?: string): any => v;

  merge = (key: string, newVal: any, oldVal: any) => {
    if (newVal === oldVal) return oldVal;
    if (
      oldVal?.syncOptions === "disabled" ||
      newVal?.syncOptions === "disabled"
    ) {
      return oldVal;
    }
    if (oldVal?.revision != null && newVal?.revision != null) {
      if (Revision.compare(oldVal.revision, newVal.revision) >= 0)
        return oldVal;
    }
    if (this._diffEngine.diff(oldVal, newVal) == null) return oldVal;
    return newVal;
  };

  requestPush(changes: Record<string, any>): void {
    if (this._timeout != null) clearTimeout(this._timeout);
    for (const key of Object.keys(changes)) {
      let value = changes[key];
      if (typeof value !== "undefined") {
        value = this.transformValue(value, key);
        if (typeof value === "undefined") continue;
      }
      this._pending[key] = value;
    }
    if (!this.enabled) return;
    this._timeout = setTimeout(() => this._doPush(), this.debounce);
  }

  pendingChanges(): Record<string, any> {
    return this._pending;
  }

  private _reEnqueue(set: Record<string, any>, remove: string[]) {
    for (const key of Object.keys(set)) {
      if (!(key in this._pending)) this._pending[key] = set[key];
    }
    for (const key of remove) {
      if (!(key in this._pending)) this._pending[key] = undefined;
    }
  }

  private async _doPush(): Promise<void> {
    this._timeout = null;
    if (this._waiting) return;
    this._waiting = true;

    await this._bucket.removeTokens(1);

    const base = await this.storage.get(null);
    const changes = this._pending;
    this._pending = {};
    this._waiting = false;

    const { set, remove } = Storage.operationsForChanges(changes, {
      base,
      merge: this.merge,
    });

    try {
      let cost = 0;
      if (Object.keys(set).length > 0) {
        Log.log("OptionsSync::set", set);
        await this.storage.set(set);
        cost = 1;
      }
      if (remove.length > 0) {
        if (!this._bucket.tryRemoveTokens(cost)) {
          this._reEnqueue(set, remove);
          return this._doPush();
        }
        Log.log("OptionsSync::remove", remove);
        await this.storage.remove(remove);
      }
    } catch (e: any) {
      this._reEnqueue(set, remove);

      if (e === "bucket") {
        return this._doPush();
      }
      if (e instanceof Storage.RateLimitExceededError) {
        Log.log("OptionsSync::rateLimitExceeded");
        this._bucket.clear();
        this.requestPush({});
        return;
      }
      if (e instanceof Storage.QuotaExceededError) {
        let valuesAffected = 0;
        for (const key of Object.keys(set)) {
          const value: any = set[key];
          if (key.startsWith("+") && value.syncOptions !== "disabled") {
            value.syncOptions = "disabled";
            value.syncError = { reason: "quotaPerItem" };
            valuesAffected++;
          }
        }
        if (valuesAffected > 0) {
          this.requestPush({});
        } else {
          this._pending = {};
        }
        return;
      }
      throw e;
    }
  }

  _logOperations(text: string, operations: any): void {
    if (Object.keys(operations.set).length) {
      Log.log(`${text}::set`, operations.set);
    }
    if (operations.remove.length) {
      Log.log(`${text}::remove`, operations.remove);
    }
  }

  async copyTo(local: StorageLike): Promise<void> {
    const [base, changes] = await Promise.all([
      local.get(null),
      this.storage.get(null),
    ]);
    for (const key of Object.keys(base)) {
      if (key in changes) continue;
      if (
        key.startsWith("+") &&
        (base[key] as any)?.syncOptions !== "disabled"
      ) {
        changes[key] = undefined;
      }
    }
    const operations = await local.apply({
      changes,
      base,
      merge: this.merge,
    });
    this._logOperations("OptionsSync::copyTo", operations);
  }

  watchAndPull(local: StorageLike): void {
    let pullScheduled: ReturnType<typeof setTimeout> | null = null;
    const pull: Record<string, any> = {};

    const doPull = async () => {
      const base = await local.get(null);
      const changes: Record<string, any> = {};
      for (const key of Object.keys(pull)) {
        changes[key] = pull[key];
        delete pull[key];
      }
      pullScheduled = null;
      const operations = Storage.operationsForChanges(changes, {
        base,
        merge: this.merge,
      });
      this._logOperations("OptionsSync::pull", operations);
      await local.apply(operations);
    };

    this.storage.watch(null, (changes: any) => {
      for (const key of Object.keys(changes)) {
        pull[key] = changes[key];
      }
      if (pullScheduled != null) return;
      pullScheduled = setTimeout(doPull, this.pullThrottle);
    });
  }
}

export default OptionsSync;
