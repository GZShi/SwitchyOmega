const tld = require("tldjs");

exports.Revision = {
  fromTime: (time?: string | number | Date): string => {
    const d = time ? new Date(time) : new Date();
    return d.getTime().toString(16);
  },
  compare: (a: string | null, b: string | null): number => {
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

class AttachedCache {
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
    if (cache != null && cache.tag === tag) {
      return cache.value;
    }
    const value = typeof otherwise === "function" ? otherwise() : otherwise;
    this._setCache(obj, { tag: tag, value: value });
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
    if (!Object.prototype.hasOwnProperty.call(obj, this.prop)) {
      Object.defineProperty(obj, this.prop, { writable: true });
    }
    obj[this.prop] = value;
  }
}

exports.AttachedCache = AttachedCache;

exports.isIp = (domain: string): boolean => {
  // IPv6
  if (domain.indexOf(":") > 0) return true;
  // IP address ending with number.
  const lastCharCode = domain.charCodeAt(domain.length - 1);
  if (lastCharCode >= 48 && lastCharCode <= 57) return true;
  return false;
};

exports.getBaseDomain = (domain: string): string => {
  if (exports.isIp(domain)) return domain;
  return tld.getDomain(domain) ?? domain;
};

exports.wildcardForDomain = (domain: string): string => {
  if (exports.isIp(domain)) return domain;
  return "*." + exports.getBaseDomain(domain);
};

const Url = require("url");
exports.wildcardForUrl = (url: string): string => {
  const domain = Url.parse(url).hostname;
  return exports.wildcardForDomain(domain);
};
