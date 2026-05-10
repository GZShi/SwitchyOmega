import * as b from "./astree/builders";
import { Address4, Address6 } from "ip-address";
import { shExp2RegExp, escapeSlash } from "./shexp_utils";
import { AttachedCache } from "./utils";
import type { ParsedRequest, ConditionHandler } from "./types";

// Internal state
const colonCharCode = ":".charCodeAt(0);
const localHosts = ["127.0.0.1", "[::1]", "localhost"];
const ipv6Max = new Address6("::/0").endAddress().canonicalForm();
let _abbrs: Record<string, string> | null = null;

// Minimal URL parser kept intentionally permissive: SwitchyOmega PAC tests use
// pseudo-URLs like "http://time-07:00:00/" whose host contains colons and
// would be rejected by the WHATWG URL constructor. We only need scheme + host
// for rule matching, so a small regex is both faster and more tolerant.
//
// Matches:  scheme://host/...    (host captured up to the first "/" after "//")
// Browsers produce real URLs before they ever reach this code, so losing the
// extra validation of `new URL()` is not a regression in production.
const urlPartsRegex = /^([a-zA-Z][a-zA-Z0-9+.\-]*):\/\/([^/?#]*)/;

function requestFromUrl(url: any): ParsedRequest {
  if (typeof url !== "string") {
    // Backward compat: accept a pre-parsed URL-like object.
    return {
      url: url.href ?? url.toString(),
      host: url.hostname,
      scheme: (url.protocol ?? "").replace(":", ""),
    };
  }
  const m = url.match(urlPartsRegex);
  if (!m) {
    return { url, host: "", scheme: "" };
  }
  let host = m[2];
  // Strip userinfo (user:pass@) if present.
  const atIdx = host.lastIndexOf("@");
  if (atIdx >= 0) host = host.substring(atIdx + 1);
  // Strip port and IPv6 literal brackets. Node's legacy url.parse reports
  // hostname as "::1" (no brackets), so we normalise the same way here.
  if (host.startsWith("[")) {
    const close = host.indexOf("]");
    host = close >= 0 ? host.substring(1, close) : host.substring(1);
  } else {
    const colonIdx = host.lastIndexOf(":");
    if (colonIdx >= 0 && /^\d+$/.test(host.substring(colonIdx + 1))) {
      host = host.substring(0, colonIdx);
    }
  }
  return { url, host, scheme: m[1] };
}

function urlWildcard2HostWildcard(pattern: string): string | null {
  const m = pattern.match(/^\*:\/\/((?:\w|[?*._\-])+)\/\*$/);
  return m != null ? m[1] : null;
}

// _conditionTypes (declared here so handlers can reference _handler)
const _conditionTypes: Record<string, ConditionHandler> = {};

function _getHandler(conditionType: any): any {
  if (typeof conditionType !== "string") {
    conditionType = conditionType.conditionType;
  }
  const handler = _conditionTypes[conditionType];
  if (handler == null) {
    throw new Error(`Unknown condition type: ${conditionType}`);
  }
  return handler;
}

function _setProp(obj: any, prop: string, value: any): void {
  if (!Object.hasOwn(obj, prop)) {
    Object.defineProperty(obj, prop, { writable: true });
  }
  obj[prop] = value;
}

function comment(commentText: string, node: any): any {
  // uglify-js 2 comment injection removed — astring does not read these fields.
  return node;
}

function safeRegex(expr: string): RegExp {
  try {
    return new RegExp(expr);
  } catch (_e) {
    return /(?!) /;
  }
}

function isInt(num: unknown): boolean {
  return typeof num === "number" && Number.isInteger(num);
}

function regTest(expr: any, regexp: any): any {
  if (typeof regexp === "string") {
    regexp = safeRegex(escapeSlash(regexp));
  }
  if (typeof expr === "string") {
    expr = b.id(expr);
  }
  return b.call(b.dot(b.re(regexp), "test"), [expr]);
}

function between(val: any, min: any, max: any, commentText: string): any {
  if (min === max) {
    if (typeof min === "number") {
      min = b.num(min);
    }
    return comment(commentText, b.binary(val, "===", min));
  }
  if (min > max) {
    return comment(commentText, b.bo(false));
  }
  if (isInt(min) && isInt(max) && max - min < 32) {
    commentText || (commentText = `${min} <= value && value <= ${max}`);
    const tmpl = "0123456789abcdefghijklmnopqrstuvwxyz";
    let str: string;
    if (max < tmpl.length) {
      str = tmpl.slice(min, max + 1);
    } else {
      str = tmpl.slice(0, max - min + 1);
    }
    const pos = min === 0 ? val : b.binary(val, "-", b.num(min));
    return comment(
      commentText,
      b.binary(b.call(b.dot(b.str(str), "charCodeAt"), [pos]), ">", b.num(0)),
    );
  }
  if (typeof min === "number") {
    min = b.num(min);
  }
  if (typeof max === "number") {
    max = b.num(max);
  }
  return comment(
    commentText,
    b.call(
      b.func(
        [b.id("value"), b.id("min"), b.id("max")],
        b.block([
          b.ret(
            b.binary(
              b.binary(b.id("min"), "<=", b.id("value")),
              "&&",
              b.binary(b.id("value"), "<=", b.id("max")),
            ),
          ),
        ]),
      ),
      [val, min, max],
    ),
  );
}

function parseIp(ip: string): any {
  if (ip.startsWith("[")) {
    ip = ip.slice(1, -1);
  }
  try {
    return new Address4(ip);
  } catch (_e4) {
    try {
      return new Address6(ip);
    } catch (_e6) {
      return null;
    }
  }
}

function normalizeIp(addr: any): string {
  return (
    addr.correctForm != null ? addr.correctForm : addr.canonicalForm
  ).call(addr);
}

function getWeekdayList(condition: any): boolean[] {
  if (condition.days) {
    const list: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      list.push(condition.days.charCodeAt(i) > 64);
    }
    return list;
  } else {
    const list: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      list.push(condition.startDay <= i && i <= condition.endDay);
    }
    return list;
  }
}

// ---- _condCache ----
const _condCache = new AttachedCache((condition: any) => {
  const handler = _getHandler(condition.conditionType);
  const tag = handler.tag;
  const result = tag ? tag(condition) : str(condition);
  return condition.conditionType + "$" + result;
});

// ---- Core functions ----
function tag(condition: any): string {
  return _condCache.tag(condition);
}

function analyze(condition: any): any {
  return _condCache.get(condition, () => ({
    analyzed: _getHandler(condition.conditionType).analyze(condition),
  }));
}

function match(condition: any, request: any): any {
  const cache = analyze(condition);
  return _getHandler(condition.conditionType).match(condition, request, cache);
}

function compileCond(condition: any): any {
  const cache = analyze(condition);
  if (cache.compiled) return cache.compiled;
  const handler = _getHandler(condition.conditionType);
  cache.compiled = handler.compile(condition, cache);
  return cache.compiled;
}

function str(condition: any, opts?: { abbr?: number }): string {
  const opt_abbr = opts != null && opts.abbr != null ? opts.abbr : -1;
  const handler = _getHandler(condition.conditionType);
  if (handler.abbrs[0].length === 0) {
    const endCode = condition.pattern.charCodeAt(condition.pattern.length - 1);
    if (endCode !== colonCharCode && condition.pattern.indexOf(" ") < 0) {
      return condition.pattern;
    }
  }
  const strFn = handler.str;
  const typeStr =
    typeof opt_abbr === "number"
      ? handler.abbrs[(handler.abbrs.length + opt_abbr) % handler.abbrs.length]
      : condition.conditionType;
  let result = typeStr + ":";
  const part = strFn ? strFn(condition) : condition.pattern;
  if (part) result += " " + part;
  return result;
}

function fromStr(input: string): any {
  input = input.trim();
  let i = input.indexOf(" ");
  if (i < 0) i = input.length;
  let conditionType: string;
  if (input.charCodeAt(i - 1) === colonCharCode) {
    conditionType = input.slice(0, i - 1);
    input = input.slice(i + 1).trim();
  } else {
    conditionType = "";
  }

  conditionType = typeFromAbbr(conditionType);
  if (!conditionType) return null;
  const condition: any = { conditionType: conditionType };
  const fromStrFn = _getHandler(condition.conditionType).fromStr;
  if (fromStrFn) {
    return fromStrFn(input, condition);
  } else {
    condition.pattern = input;
    return condition;
  }
}

function typeFromAbbr(abbr: string): string | undefined {
  if (!_abbrs) {
    _abbrs = {};
    for (const type of Object.keys(_conditionTypes)) {
      if (!Object.hasOwn(_conditionTypes, type)) continue;
      const { abbrs: abbrsList } = _conditionTypes[type];
      _abbrs[type.toUpperCase()] = type;
      for (const ab of abbrsList) {
        _abbrs[ab.toUpperCase()] = type;
      }
    }
  }
  return _abbrs[abbr.toUpperCase()];
}

function _handler(conditionType: any): any {
  return _getHandler(conditionType);
}

// ---- _conditionTypes definitions ----
_conditionTypes["TrueCondition"] = {
  abbrs: ["True"],
  analyze: (_c: any) => null,
  match: () => true,
  compile: (_c: any) => b.bo(true),
  str: (_c: any) => "",
  fromStr: (_s: string, condition: any) => condition,
};

_conditionTypes["FalseCondition"] = {
  abbrs: ["False", "Disabled"],
  analyze: (_c: any) => null,
  match: () => false,
  compile: (_c: any) => b.bo(false),
  fromStr: (fromStrStr: string, condition: any) => {
    if (fromStrStr.length > 0) {
      condition.pattern = fromStrStr;
    }
    return condition;
  },
};

_conditionTypes["UrlRegexCondition"] = {
  abbrs: ["UR", "URegex", "UrlR", "UrlRegex"],
  analyze: function (this: any, condition: any) {
    return safeRegex(escapeSlash(condition.pattern));
  },
  match: function (this: any, _c: any, request: any, cache: any) {
    return cache.analyzed.test(request.url);
  },
  compile: function (this: any, _c: any, cache: any) {
    return regTest("url", cache.analyzed);
  },
};

_conditionTypes["UrlWildcardCondition"] = {
  abbrs: [
    "U",
    "UW",
    "Url",
    "UrlW",
    "UWild",
    "UWildcard",
    "UrlWild",
    "UrlWildcard",
  ],
  analyze: function (this: any, condition: any) {
    const parts: string[] = [];
    for (const pattern of condition.pattern.split("|")) {
      if (!pattern) continue;
      parts.push(shExp2RegExp(pattern, { trimAsterisk: true }));
    }
    return safeRegex(parts.join("|"));
  },
  match: function (this: any, _c: any, request: any, cache: any) {
    return cache.analyzed.test(request.url);
  },
  compile: function (this: any, _c: any, cache: any) {
    return regTest("url", cache.analyzed);
  },
};

_conditionTypes["HostRegexCondition"] = {
  abbrs: ["R", "HR", "Regex", "HostR", "HRegex", "HostRegex"],
  analyze: function (this: any, condition: any) {
    return safeRegex(escapeSlash(condition.pattern));
  },
  match: function (this: any, _c: any, request: any, cache: any) {
    return cache.analyzed.test(request.host);
  },
  compile: function (this: any, _c: any, cache: any) {
    return regTest("host", cache.analyzed);
  },
};

_conditionTypes["HostWildcardCondition"] = {
  abbrs: [
    "",
    "H",
    "W",
    "HW",
    "Wild",
    "Wildcard",
    "Host",
    "HostW",
    "HWild",
    "HWildcard",
    "HostWild",
    "HostWildcard",
  ],
  analyze: function (this: any, condition: any) {
    const parts: string[] = [];
    for (const pattern of condition.pattern.split("|")) {
      if (!pattern) continue;
      let p = pattern;
      if (p.startsWith(".")) {
        p = "*" + p;
      }
      let re: string;
      if (p.indexOf("**.") === 0) {
        re = shExp2RegExp(p.substring(1), { trimAsterisk: true });
      } else if (p.indexOf("*.") === 0) {
        re = shExp2RegExp(p.substring(2), { trimAsterisk: false })
          .replace(/./, "(?:^|\\.)")
          .replace(/\\.\*\$$/, "");
      } else {
        re = shExp2RegExp(p, { trimAsterisk: true });
      }
      parts.push(re);
    }
    return safeRegex(parts.join("|"));
  },
  match: function (this: any, _c: any, request: any, cache: any) {
    return cache.analyzed.test(request.host);
  },
  compile: function (this: any, _c: any, cache: any) {
    return regTest("host", cache.analyzed);
  },
};

_conditionTypes["BypassCondition"] = {
  abbrs: ["B", "Bypass"],
  analyze: function (this: any, condition: any) {
    const cache: any = {
      host: null,
      ip: null,
      scheme: null,
      url: null,
      normalizedPattern: "",
    };
    let server: string = condition.pattern;
    if (server === "<local>") {
      cache.host = server;
      return cache;
    }
    let parts = server.split("://");
    if (parts.length > 1) {
      cache.scheme = parts[0];
      cache.normalizedPattern = cache.scheme + "://";
      server = parts[1];
    }

    parts = server.split("/");
    if (parts.length > 1) {
      const addr = parseIp(parts[0]);
      const prefixLen = parseInt(parts[1], 10);
      if (addr && !isNaN(prefixLen)) {
        cache.ip = {
          conditionType: "IpCondition",
          ip: normalizeIp(addr),
          prefixLength: prefixLen,
        };
        cache.normalizedPattern += cache.ip.ip + "/" + cache.ip.prefixLength;
        return cache;
      }
    }
    let serverIp = parseIp(server);
    let matchPort: string | null = null;
    if (serverIp == null) {
      const pos = server.lastIndexOf(":");
      if (pos >= 0) {
        matchPort = server.substring(pos + 1);
        server = server.substring(0, pos);
      }
      serverIp = parseIp(server);
    }
    if (serverIp != null) {
      const normalized = normalizeIp(serverIp);
      server = normalized;
      if (serverIp.v4) {
        cache.normalizedPattern += normalized;
      } else {
        cache.normalizedPattern += "[" + normalized + "]";
      }
    } else {
      if (server.startsWith(".")) {
        server = "*" + server;
      }
      cache.normalizedPattern = server;
    }

    if (matchPort) {
      cache.port = matchPort;
      cache.normalizedPattern += ":" + cache.port;
      if (serverIp != null && !serverIp.v4) {
        server =
          "[" + (serverIp != null ? normalizeIp(serverIp) : server) + "]";
      }
      let serverRegex = shExp2RegExp(server);
      serverRegex = serverRegex.substring(1, serverRegex.length - 1);
      const scheme = cache.scheme != null ? cache.scheme : "[^:]+";
      cache.url = safeRegex(
        "^" + scheme + ":\\/\\/" + serverRegex + ":" + matchPort + "\\/",
      );
    } else if (server !== "*") {
      const serverRegex = shExp2RegExp(server, { trimAsterisk: true });
      cache.host = safeRegex(serverRegex);
    }
    return cache;
  },
  match: function (condition: any, request: any, cacheContainer: any) {
    const cache = cacheContainer.analyzed;
    if (cache.scheme != null && cache.scheme !== request.scheme) return false;
    if (cache.ip != null && !match(cache.ip, request)) return false;
    if (cache.host != null) {
      if (cache.host === "<local>") {
        return (
          request.host === "127.0.0.1" ||
          request.host === "::1" ||
          request.host.indexOf(".") < 0
        );
      } else {
        if (!cache.host.test(request.host)) return false;
      }
    }
    if (cache.url != null && !cache.url.test(request.url)) return false;
    return true;
  },
  str: function (condition: any) {
    const handler = _getHandler(condition);
    const cache = handler.analyze(condition);
    if (cache.normalizedPattern) {
      return cache.normalizedPattern;
    } else {
      return condition.pattern;
    }
  },
  compile: function (condition: any, cacheContainer: any) {
    const cache = cacheContainer.analyzed;
    if (cache.url != null) {
      return regTest("url", cache.url);
    }
    const conditions: any[] = [];
    if (cache.host === "<local>") {
      const hostEquals = (host: string) =>
        b.binary(b.id("host"), "===", b.str(host));
      return b.binary(
        b.binary(hostEquals("127.0.0.1"), "||", hostEquals("::1")),
        "||",
        b.binary(
          b.call(b.dot(b.id("host"), "indexOf"), [b.str(".")]),
          "<",
          b.num(0),
        ),
      );
    }
    if (cache.scheme != null) {
      conditions.push(b.binary(b.id("scheme"), "===", b.str(cache.scheme)));
    }
    if (cache.host != null) {
      conditions.push(regTest("host", cache.host));
    } else if (cache.ip != null) {
      conditions.push(compileCond(cache.ip));
    }
    switch (conditions.length) {
      case 0:
        return b.bo(true);
      case 1:
        return conditions[0];
      case 2:
        return b.binary(conditions[0], "&&", conditions[1]);
    }
  },
};

_conditionTypes["KeywordCondition"] = {
  abbrs: ["K", "KW", "Keyword"],
  analyze: (_c: any) => null,
  match: (_c: any, request: any) => {
    return request.scheme === "http" && request.url.indexOf(_c.pattern) >= 0;
  },
  compile: (condition: any) => {
    return b.binary(
      b.binary(b.id("scheme"), "===", b.str("http")),
      "&&",
      b.binary(
        b.call(b.dot(b.id("url"), "indexOf"), [b.str(condition.pattern)]),
        ">=",
        b.num(0),
      ),
    );
  },
};

_conditionTypes["IpCondition"] = {
  abbrs: ["Ip"],
  analyze: function (this: any, condition: any) {
    const cache: any = {
      addr: null,
      normalized: null,
    };
    let ip = condition.ip;
    if (ip.startsWith("[")) {
      ip = ip.slice(1, -1);
    }
    const addrStr = ip + "/" + condition.prefixLength;
    cache.addr = parseIp(addrStr);
    if (cache.addr == null) {
      throw new Error(`Invalid IP address ${addrStr}`);
    }
    cache.normalized = normalizeIp(cache.addr);
    let mask: any;
    if (cache.addr.v4) {
      mask = new Address4("255.255.255.255/" + cache.addr.subnetMask);
    } else {
      mask = new Address6(ipv6Max + "/" + cache.addr.subnetMask);
    }
    cache.mask = normalizeIp(mask.startAddress());
    return cache;
  },
  match: function (
    this: any,
    condition: any,
    request: any,
    cacheContainer: any,
  ) {
    const addr = parseIp(request.host);
    if (addr == null) return false;
    const cache = cacheContainer.analyzed;
    if (addr.v4 !== cache.addr.v4) return false;
    return addr.isInSubnet(cache.addr);
  },
  compile: function (this: any, condition: any, cacheContainer: any) {
    const cache = cacheContainer.analyzed;
    let hostLooksLikeIp: any;
    if (cache.addr.v4) {
      hostLooksLikeIp = b.binary(
        b.sub(
          b.id("host"),
          b.binary(b.dot(b.id("host"), "length"), "-", b.num(1)),
        ),
        ">=",
        b.num(0),
      );
    } else {
      hostLooksLikeIp = b.binary(
        b.call(b.dot(b.id("host"), "indexOf"), [b.str(":")]),
        ">=",
        b.num(0),
      );
    }
    if (cache.addr.subnetMask === 0) {
      return hostLooksLikeIp;
    }
    let hostIsInNet = b.call(b.id("isInNet"), [
      b.id("host"),
      b.str(cache.normalized),
      b.str(cache.mask),
    ]);
    if (!cache.addr.v4) {
      const hostIsInNetEx = b.call(b.id("isInNetEx"), [
        b.id("host"),
        b.str(cache.normalized + cache.addr.subnet),
      ]);
      hostIsInNet = b.cond(
        b.binary(
          b.unary("typeof", b.id("isInNetEx")),
          "===",
          b.str("function"),
        ),
        hostIsInNetEx,
        hostIsInNet,
      );
    }
    return b.binary(hostLooksLikeIp, "&&", hostIsInNet);
  },
  str: (condition: any) => condition.ip + "/" + condition.prefixLength,
  fromStr: function (this: any, s: string, condition: any) {
    const addr = parseIp(s);
    if (addr != null) {
      condition.ip = addr.addressMinusSuffix;
      condition.prefixLength = addr.subnetMask;
    } else {
      condition.ip = "0.0.0.0";
      condition.prefixLength = 0;
    }
    return condition;
  },
};

_conditionTypes["HostLevelsCondition"] = {
  abbrs: [
    "Lv",
    "Level",
    "Levels",
    "HL",
    "HLv",
    "HLevel",
    "HLevels",
    "HostL",
    "HostLv",
    "HostLevel",
    "HostLevels",
  ],
  analyze: (_c: any) => ".".charCodeAt(0),
  match: function (this: any, condition: any, request: any, cache: any) {
    const dotCharCode = cache.analyzed;
    let dotCount = 0;
    for (let i = 0; i < request.host.length; i++) {
      if (request.host.charCodeAt(i) === dotCharCode) {
        dotCount++;
        if (dotCount > condition.maxValue) return false;
      }
    }
    return dotCount >= condition.minValue;
  },
  compile: function (condition: any) {
    const val = b.dot(
      b.call(b.dot(b.id("host"), "split"), [b.str(".")]),
      "length",
    );
    return between(
      val,
      condition.minValue + 1,
      condition.maxValue + 1,
      `${condition.minValue} <= hostLevels <= ${condition.maxValue}`,
    );
  },
  str: (condition: any) => condition.minValue + "~" + condition.maxValue,
  fromStr: (s: string, condition: any) => {
    const [minVal, maxVal] = s.split("~");
    condition.minValue = parseInt(minVal, 10);
    condition.maxValue = parseInt(maxVal, 10);
    if (!(condition.minValue > 0)) condition.minValue = 1;
    if (!(condition.maxValue > 0)) condition.maxValue = 1;
    return condition;
  },
};

_conditionTypes["WeekdayCondition"] = {
  abbrs: ["WD", "Week", "Day", "Weekday"],
  analyze: (_c: any) => null,
  match: (condition: any, _request: any) => {
    const day = new Date().getDay();
    if (condition.days) {
      return condition.days.charCodeAt(day) > 64;
    }
    return condition.startDay <= day && day <= condition.endDay;
  },
  compile: function (condition: any) {
    const getDay = b.call(b.dot(b.newexp(b.id("Date"), []), "getDay"), []);
    if (condition.days) {
      return b.binary(
        b.call(b.dot(b.str(condition.days), "charCodeAt"), [getDay]),
        ">",
        b.num(64),
      );
    } else {
      return between(getDay, condition.startDay, condition.endDay, "");
    }
  },
  str: (condition: any) => {
    if (condition.days) {
      return condition.days;
    } else {
      return condition.startDay + "~" + condition.endDay;
    }
  },
  fromStr: (s: string, condition: any) => {
    if (s.indexOf("~") < 0 && s.length === 7) {
      condition.days = s;
    } else {
      const [startDayStr, endDayStr] = s.split("~");
      condition.startDay = parseInt(startDayStr, 10);
      condition.endDay = parseInt(endDayStr, 10);
      if (!(0 <= condition.startDay && condition.startDay <= 6))
        condition.startDay = 0;
      if (!(0 <= condition.endDay && condition.endDay <= 6))
        condition.endDay = 0;
    }
    return condition;
  },
};

_conditionTypes["TimeCondition"] = {
  abbrs: ["T", "Time", "Hour"],
  analyze: (_c: any) => null,
  match: (condition: any, _request: any) => {
    const hour = new Date().getHours();
    return condition.startHour <= hour && hour <= condition.endHour;
  },
  compile: function (condition: any) {
    const val = b.call(b.dot(b.newexp(b.id("Date"), []), "getHours"), []);
    return between(val, condition.startHour, condition.endHour, "");
  },
  str: (condition: any) => condition.startHour + "~" + condition.endHour,
  fromStr: (s: string, condition: any) => {
    const [startH, endH] = s.split("~");
    condition.startHour = parseInt(startH, 10);
    condition.endHour = parseInt(endH, 10);
    if (!(0 <= condition.startHour && condition.startHour < 24))
      condition.startHour = 0;
    if (!(0 <= condition.endHour && condition.endHour < 24))
      condition.endHour = 0;
    return condition;
  },
};

// _self shim removed — ESM module-level functions are referenced directly
// by handler definitions, no need for the `self` namespace anymore.

export {
  requestFromUrl,
  urlWildcard2HostWildcard,
  comment,
  safeRegex,
  isInt,
  regTest,
  between,
  parseIp,
  normalizeIp,
  ipv6Max,
  localHosts,
  getWeekdayList,
  _condCache,
  tag,
  analyze,
  match,
  compileCond as compile,
  str,
  colonCharCode,
  fromStr,
  typeFromAbbr,
  _handler,
  _conditionTypes,
};
export { _abbrs };
