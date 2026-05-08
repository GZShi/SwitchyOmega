const Storage = require("./storage");
const Log = require("./log");
const { Revision } = require("omega-pac");
const jsondiffpatch = require("jsondiffpatch");
const { TokenBucket: LimiterTokenBucket } = require("limiter");

// Thin wrapper over limiter v3's TokenBucket preserving the legacy callback
// and positional-args shape used by OptionsSync. The class doubles as an
// `unlimited bucket` when constructed with no arguments.
class TokenBucket {
  _bucket: any;

  constructor(
    bucketSize?: number,
    tokensPerInterval?: number,
    interval?: string | number,
    parentBucket?: any,
  ) {
    this._bucket = new LimiterTokenBucket({
      bucketSize: bucketSize ?? Number.MAX_SAFE_INTEGER,
      tokensPerInterval: tokensPerInterval ?? Number.MAX_SAFE_INTEGER,
      interval: interval ?? "minute",
      parentBucket: parentBucket ?? null,
    });
  }

  get content(): number {
    return this._bucket.content;
  }

  removeTokens(
    count: number,
    callback?: (err: any, tokens: number) => void,
  ): any {
    const promise = this._bucket.removeTokens(count);
    if (typeof callback === "function") {
      promise.then(
        (tokens: number) => callback(null, tokens),
        (err: any) => callback(err, 0),
      );
      return;
    }
    return promise;
  }

  tryRemoveTokens(count: number): boolean {
    return this._bucket.tryRemoveTokens(count);
  }

  clear(): void {
    this._bucket.tryRemoveTokens(this._bucket.content);
  }
}

class OptionsSync {
  static TokenBucket = TokenBucket;

  _timeout: any = null;
  _bucket: any = null;
  _waiting: boolean = false;
  _pending: Record<string, any> = {};

  debounce: number = 1000;
  pullThrottle: number = 1000;
  storage: any = null;
  enabled: boolean = true;

  constructor(storage?: any, bucket?: any) {
    this.storage = storage;
    this._bucket = bucket;
    this._pending = {};
    if (this._bucket == null) {
      this._bucket = new TokenBucket(10, 10, "minute", null);
    }
    if (this._bucket.clear == null) {
      this._bucket.clear = () => {
        this._bucket.tryRemoveTokens(this._bucket.content);
      };
    }
  }

  transformValue = (v: any, _key?: string): any => v;

  merge: (key: string, newVal: any, oldVal: any) => any = (() => {
    const diff = jsondiffpatch.create({
      objectHash: (obj: any) => JSON.stringify(obj),
      textDiff: { minLength: Infinity },
    });
    return (key: string, newVal: any, oldVal: any) => {
      if (newVal === oldVal) return oldVal;
      if (
        (oldVal != null && oldVal.syncOptions === "disabled") ||
        (newVal != null && newVal.syncOptions === "disabled")
      ) {
        return oldVal;
      }
      if (
        oldVal != null &&
        oldVal.revision != null &&
        newVal != null &&
        newVal.revision != null
      ) {
        const result = Revision.compare(oldVal.revision, newVal.revision);
        if (result >= 0) return oldVal;
      }
      if (diff.diff(oldVal, newVal) == null) return oldVal;
      return newVal;
    };
  })();

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
    this._timeout = setTimeout(this._doPush.bind(this), this.debounce);
  }

  pendingChanges(): Record<string, any> {
    return this._pending;
  }

  _doPush(): void {
    this._timeout = null;
    if (this._waiting) return;
    this._waiting = true;
    this._bucket.removeTokens(1, () => {
      this.storage
        .get(null)
        .then((base: any) => {
          const changes = this._pending;
          this._pending = {};
          this._waiting = false;
          return Storage.operationsForChanges(changes, {
            base: base,
            merge: this.merge,
          });
        })
        .then(
          ({ set, remove }: { set: Record<string, any>; remove: string[] }) => {
            const doSet =
              Object.keys(set).length === 0
                ? Promise.resolve(0)
                : (Log.log("OptionsSync::set", set),
                  this.storage.set(set).then(() => 1));
            doSet
              .then((cost: number) => {
                const s: Record<string, any> = {};
                if (remove.length > 0) {
                  if (this._bucket.tryRemoveTokens(cost)) {
                    Log.log("OptionsSync::remove", remove);
                    return this.storage.remove(remove);
                  } else {
                    return Promise.reject("bucket");
                  }
                }
                return;
              })
              .catch((e: any) => {
                for (const key of Object.keys(set)) {
                  if (!(key in this._pending)) {
                    this._pending[key] = set[key];
                  }
                }
                for (const key of remove) {
                  if (!(key in this._pending)) {
                    this._pending[key] = undefined;
                  }
                }

                if (e === "bucket") {
                  this._doPush();
                } else if (e instanceof Storage.RateLimitExceededError) {
                  Log.log("OptionsSync::rateLimitExceeded");
                  this._bucket.clear();
                  this.requestPush({});
                  return;
                } else if (e instanceof Storage.QuotaExceededError) {
                  let valuesAffected = 0;
                  for (const key of Object.keys(set)) {
                    const value = set[key];
                    if (key[0] === "+" && value.syncOptions !== "disabled") {
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
                } else {
                  return Promise.reject(e);
                }
              });
          },
        );
    });
  }

  _logOperations(text: string, operations: any): void {
    if (Object.keys(operations.set).length) {
      Log.log(text + "::set", operations.set);
    }
    if (operations.remove.length) {
      Log.log(text + "::remove", operations.remove);
    }
  }

  copyTo(local: any): Promise<void> {
    return Promise.all([local.get(null), this.storage.get(null)]).then(
      ([base, changes]: [any, any]) => {
        for (const key of Object.keys(base)) {
          if (!(key in changes)) {
            if (
              key[0] === "+" &&
              !(base[key] != null && base[key].syncOptions === "disabled")
            ) {
              changes[key] = undefined;
            }
          }
        }
        return local
          .apply({
            changes: changes,
            base: base,
            merge: this.merge,
          })
          .then((operations: any) => {
            this._logOperations("OptionsSync::copyTo", operations);
          });
      },
    );
  }

  watchAndPull(local: any): void {
    let pullScheduled: any = null;
    const pull: Record<string, any> = {};

    const doPull = () => {
      local
        .get(null)
        .then((base: any) => {
          // Capture a copy of pull since we will clear it immediately
          const changes: Record<string, any> = {};
          for (const key of Object.keys(pull)) {
            changes[key] = pull[key];
            delete pull[key];
          }
          pullScheduled = null;
          return Storage.operationsForChanges(changes, {
            base: base,
            merge: this.merge,
          });
        })
        .then((operations: any) => {
          this._logOperations("OptionsSync::pull", operations);
          return local.apply(operations);
        });
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

module.exports = OptionsSync;
