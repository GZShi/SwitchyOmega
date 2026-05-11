import InMemoryStorage from "./storage";

class BrowserStorage extends InMemoryStorage {
  constructor(
    private readonly _raw: Storage,
    private readonly _prefix = "",
  ) {
    super();
  }

  override async get(keys: any): Promise<Record<string, any>> {
    const read = (key: string): any => {
      const raw = this._raw.getItem(this._prefix + key);
      if (raw == null) return undefined;
      try {
        return JSON.parse(raw);
      } catch {
        return undefined;
      }
    };

    if (keys == null) {
      const map: Record<string, any> = {};
      for (let i = 0; i < this._raw.length; i++) {
        const full = this._raw.key(i);
        if (!full?.startsWith(this._prefix)) continue;
        const short = full.slice(this._prefix.length);
        const val = read(short);
        if (val !== undefined) map[short] = val;
      }
      return map;
    }

    if (typeof keys === "string") {
      const v = read(keys);
      return v === undefined ? {} : { [keys]: v };
    }

    if (Array.isArray(keys)) {
      return Object.fromEntries(
        keys.map((k) => [k, read(k)]).filter(([, v]) => v !== undefined),
      ) as Record<string, any>;
    }

    // Defaults object: each value is the default
    return Object.fromEntries(
      Object.entries(keys).map(([k, def]) => [k, read(k) ?? def]),
    );
  }

  override async set(items: Record<string, any>): Promise<any> {
    for (const key of Object.keys(items)) {
      this._raw.setItem(this._prefix + key, JSON.stringify(items[key]));
    }
    return items;
  }

  override async remove(keys: any): Promise<void> {
    if (keys == null) {
      if (this._prefix) {
        for (let i = 0; i < this._raw.length; ) {
          const full = this._raw.key(i);
          if (full?.startsWith(this._prefix)) {
            this._raw.removeItem(full);
          } else {
            i++;
          }
        }
      } else {
        this._raw.clear();
      }
    } else if (Array.isArray(keys)) {
      for (const key of keys) this._raw.removeItem(this._prefix + key);
    } else {
      this._raw.removeItem(this._prefix + keys);
    }
  }
}

export default BrowserStorage;
