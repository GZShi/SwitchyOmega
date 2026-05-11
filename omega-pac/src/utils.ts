import { getDomain as tldsGetDomain } from "tldts";

export const Revision = {
  fromTime(time?: string | number | Date): string {
    const d = time ? new Date(time) : new Date();
    return d.getTime().toString(16);
  },
  compare(a: string | null, b: string | null): number {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    if (a.length > b.length) return 1;
    if (a.length < b.length) return -1;
    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
  },
};

export class AttachedCache {
  prop: string;
  tag: (obj: any) => string;

  constructor(
    opt_prop: string | ((obj: any) => string),
    tag?: (obj: any) => string,
  ) {
    this.prop = opt_prop as string;
    if (typeof tag === "undefined") {
      this.tag = opt_prop as (obj: any) => string;
      this.prop = "_cache";
    } else {
      this.tag = tag;
    }
  }

  get(obj: any, otherwise: any): any {
    const tag = this.tag(obj);
    const cache = this._getCache(obj);
    if (cache?.tag === tag) {
      return cache.value;
    }
    const value = typeof otherwise === "function" ? otherwise() : otherwise;
    this._setCache(obj, { tag, value });
    return value;
  }

  drop(obj: any): void {
    if (obj[this.prop] != null) {
      obj[this.prop] = undefined;
    }
  }

  _getCache(obj: any): any {
    return obj[this.prop];
  }

  _setCache(obj: any, value: any): void {
    if (!Object.hasOwn(obj, this.prop)) {
      Object.defineProperty(obj, this.prop, { writable: true });
    }
    obj[this.prop] = value;
  }
}

export function isIp(domain: string): boolean {
  // IPv6 contains at least one colon.
  if (domain.indexOf(":") > 0) return true;
  // IP addresses end with a digit.
  const lastCharCode = domain.charCodeAt(domain.length - 1);
  if (lastCharCode >= 48 && lastCharCode <= 57) return true;
  return false;
}

export function getBaseDomain(domain: string): string {
  if (isIp(domain)) return domain;
  return tldsGetDomain(domain) ?? domain;
}

export function wildcardForDomain(domain: string): string {
  if (isIp(domain)) return domain;
  return `*.${  getBaseDomain(domain)}`;
}

export function wildcardForUrl(url: string): string {
  const domain = new URL(url).hostname;
  return wildcardForDomain(domain);
}
