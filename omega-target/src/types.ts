// Minimal public contracts shared across omega-target modules. These interfaces
// intentionally stay structural and permissive: downstream consumers
// (omega-target-chromium-extension, omega-web) subclass Options/Storage and
// rely on duck typing, so the types describe the surface rather than the
// concrete shape of every field.

export type StorageKeys =
  | null
  | undefined
  | string
  | readonly string[]
  | Record<string, unknown>;

export interface StorageChanges {
  [key: string]: unknown;
}

export interface StorageOperations {
  set: Record<string, unknown>;
  remove: string[];
}

export interface StorageMergeFn {
  (key: string, newVal: unknown, oldVal: unknown): unknown;
}

export interface StorageLike {
  get(keys: StorageKeys): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<unknown>;
  remove(keys: StorageKeys): Promise<unknown>;
  watch(keys: StorageKeys, callback: (changes: StorageChanges) => void): unknown;
  apply(operations: {
    changes?: StorageChanges;
    set?: Record<string, unknown>;
    remove?: string[];
    base?: Record<string, unknown>;
    merge?: StorageMergeFn;
  }): Promise<unknown>;
}

export interface ProxyImplLike {
  applyProfile(
    effectiveProfile: any,
    displayProfile: any,
    options: Record<string, unknown>,
  ): Promise<unknown>;
}

export interface OptionsSyncLike {
  enabled: boolean;
  storage: StorageLike;
  requestPush(changes: StorageChanges): void;
  pendingChanges(): StorageChanges;
  copyTo(local: StorageLike): Promise<unknown>;
  watchAndPull(local: StorageLike): unknown;
}

export interface LogLike {
  str(obj: unknown): string;
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  func(name: string, args: ArrayLike<unknown>): void;
  method(name: string, self: unknown, args: ArrayLike<unknown>): void;
}
