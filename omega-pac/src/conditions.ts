const U2 = require("uglify-js");
const IP = require("ip-address");
const Url = require("url");
const { shExp2RegExp, escapeSlash } = require("./shexp_utils");
const { AttachedCache } = require("./utils");

// Internal state
const colonCharCode = ":".charCodeAt(0);
const localHosts = ["127.0.0.1", "[::1]", "localhost"];
const ipv6Max = new IP.v6.Address("::/0").endAddress().canonicalForm();
let _abbrs: Record<string, string> | null = null;

function requestFromUrl(url: any): {
  url: string;
  host: string;
  scheme: string;
} {
  if (typeof url === "string") {
    url = Url.parse(url);
  }
  return {
    url: Url.format(url),
    host: url.hostname,
    scheme: url.protocol.replace(":", ""),
  };
}
exports.requestFromUrl = requestFromUrl;

function urlWildcard2HostWildcard(pattern: string): string | null {
  const m = pattern.match(/^\*:\/\/((?:\w|[?*._\-])+)\/\*$/);
  return m != null ? m[1] : null;
}
exports.urlWildcard2HostWildcard = urlWildcard2HostWildcard;

// _conditionTypes (declared here so handlers can reference _handler)
const _conditionTypes: Record<string, any> = {};

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
  if (!Object.prototype.hasOwnProperty.call(obj, prop)) {
    Object.defineProperty(obj, prop, { writable: true });
  }
  obj[prop] = value;
}

function comment(commentText: string, node: any): any {
  if (!commentText) return node;
  if (node.start == null) node.start = {};
  Object.defineProperty(node.start, "_comments_dumped", {
    get: () => false,
    set: () => false,
  });
  if (node.start.comments_before == null) node.start.comments_before = [];
  node.start.comments_before.push({ type: "comment2", value: commentText });
  return node;
}
exports.comment = comment;

function safeRegex(expr: string): RegExp {
  try {
    return new RegExp(expr);
  } catch (_e) {
    return /(?!) /;
  }
}
exports.safeRegex = safeRegex;

function isInt(num: any): boolean {
  return (
    typeof num === "number" &&
    !isNaN(num) &&
    parseFloat(String(num)) === parseInt(String(num), 10)
  );
}
exports.isInt = isInt;

function regTest(expr: any, regexp: any): any {
  if (typeof regexp === "string") {
    regexp = safeRegex(escapeSlash(regexp));
  }
  if (typeof expr === "string") {
    expr = new U2.AST_SymbolRef({ name: expr });
  }
  return new U2.AST_Call({
    args: [expr],
    expression: new U2.AST_Dot({
      property: "test",
      expression: new U2.AST_RegExp({ value: regexp }),
    }),
  });
}
exports.regTest = regTest;

function between(val: any, min: any, max: any, commentText: string): any {
  if (min === max) {
    if (typeof min === "number") {
      min = new U2.AST_Number({ value: min });
    }
    return comment(
      commentText,
      new U2.AST_Binary({
        left: val,
        operator: "===",
        right: min,
      }),
    );
  }
  if (min > max) {
    return comment(commentText, new U2.AST_False({}));
  }
  if (isInt(min) && isInt(max) && max - min < 32) {
    commentText || (commentText = `${min} <= value && value <= ${max}`);
    const tmpl = "0123456789abcdefghijklmnopqrstuvwxyz";
    let str: string;
    if (max < tmpl.length) {
      str = tmpl.substr(min, max - min + 1);
    } else {
      str = tmpl.substr(0, max - min + 1);
    }
    const pos =
      min === 0
        ? val
        : new U2.AST_Binary({
            left: val,
            operator: "-",
            right: new U2.AST_Number({ value: min }),
          });
    return comment(
      commentText,
      new U2.AST_Binary({
        left: new U2.AST_Call({
          expression: new U2.AST_Dot({
            expression: new U2.AST_String({ value: str }),
            property: "charCodeAt",
          }),
          args: [pos],
        }),
        operator: ">",
        right: new U2.AST_Number({ value: 0 }),
      }),
    );
  }
  if (typeof min === "number") {
    min = new U2.AST_Number({ value: min });
  }
  if (typeof max === "number") {
    max = new U2.AST_Number({ value: max });
  }
  return comment(
    commentText,
    new U2.AST_Call({
      args: [val, min, max],
      expression: new U2.AST_Function({
        argnames: [
          new U2.AST_SymbolFunarg({ name: "value" }),
          new U2.AST_SymbolFunarg({ name: "min" }),
          new U2.AST_SymbolFunarg({ name: "max" }),
        ],
        body: [
          new U2.AST_Return({
            value: new U2.AST_Binary({
              left: new U2.AST_Binary({
                left: new U2.AST_SymbolRef({ name: "min" }),
                operator: "<=",
                right: new U2.AST_SymbolRef({ name: "value" }),
              }),
              operator: "&&",
              right: new U2.AST_Binary({
                left: new U2.AST_SymbolRef({ name: "value" }),
                operator: "<=",
                right: new U2.AST_SymbolRef({ name: "max" }),
              }),
            }),
          }),
        ],
      }),
    }),
  );
}
exports.between = between;

function parseIp(ip: string): any {
  if (ip.charCodeAt(0) === "[".charCodeAt(0)) {
    ip = ip.substr(1, ip.length - 2);
  }
  let addr = new IP.v4.Address(ip);
  if (!addr.isValid()) {
    addr = new IP.v6.Address(ip);
    if (!addr.isValid()) {
      return null;
    }
  }
  return addr;
}
exports.parseIp = parseIp;

function normalizeIp(addr: any): string {
  return (
    addr.correctForm != null ? addr.correctForm : addr.canonicalForm
  ).call(addr);
}
exports.normalizeIp = normalizeIp;
exports.ipv6Max = ipv6Max;
exports.localHosts = localHosts;

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
exports.getWeekdayList = getWeekdayList;

// ---- _condCache ----
const _condCache = new AttachedCache(function (condition: any) {
  const handler = _getHandler(condition.conditionType);
  const tag = handler.tag;
  const result = tag ? tag.apply(null, arguments) : str(condition);
  return condition.conditionType + "$" + result;
});
exports._condCache = _condCache;

// ---- Core functions ----
function tag(condition: any): string {
  return _condCache.tag(condition);
}
exports.tag = tag;

function analyze(condition: any): any {
  return _condCache.get(condition, () => ({
    analyzed: _getHandler(condition.conditionType).analyze.call(
      exports,
      condition,
    ),
  }));
}
exports.analyze = analyze;

function match(condition: any, request: any): any {
  const cache = analyze(condition);
  return _getHandler(condition.conditionType).match.call(
    exports,
    condition,
    request,
    cache,
  );
}
exports.match = match;

function compileCond(condition: any): any {
  const cache = analyze(condition);
  if (cache.compiled) return cache.compiled;
  const handler = _getHandler(condition.conditionType);
  cache.compiled = handler.compile.call(exports, condition, cache);
  return cache.compiled;
}
exports.compile = compileCond;

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
  const part = strFn ? strFn.call(exports, condition) : condition.pattern;
  if (part) result += " " + part;
  return result;
}
exports.str = str;
exports.colonCharCode = colonCharCode;

function fromStr(input: string): any {
  input = input.trim();
  let i = input.indexOf(" ");
  if (i < 0) i = input.length;
  let conditionType: string;
  if (input.charCodeAt(i - 1) === colonCharCode) {
    conditionType = input.substr(0, i - 1);
    input = input.substr(i + 1).trim();
  } else {
    conditionType = "";
  }

  conditionType = typeFromAbbr(conditionType);
  if (!conditionType) return null;
  const condition: any = { conditionType: conditionType };
  const fromStrFn = _getHandler(condition.conditionType).fromStr;
  if (fromStrFn) {
    return fromStrFn.call(exports, input, condition);
  } else {
    condition.pattern = input;
    return condition;
  }
}
exports.fromStr = fromStr;

function typeFromAbbr(abbr: string): string | undefined {
  if (!_abbrs) {
    _abbrs = {};
    for (const type of Object.keys(_conditionTypes)) {
      if (!Object.prototype.hasOwnProperty.call(_conditionTypes, type))
        continue;
      const { abbrs: abbrsList } = _conditionTypes[type];
      _abbrs[type.toUpperCase()] = type;
      for (const ab of abbrsList) {
        _abbrs[ab.toUpperCase()] = type;
      }
    }
  }
  return _abbrs[abbr.toUpperCase()];
}
exports.typeFromAbbr = typeFromAbbr;

function _handler(conditionType: any): any {
  return _getHandler(conditionType);
}
exports._handler = _handler;

// ---- _conditionTypes definitions ----
_conditionTypes["TrueCondition"] = {
  abbrs: ["True"],
  analyze: (_c: any) => null,
  match: () => true,
  compile: (_c: any) => new U2.AST_True({}),
  str: (_c: any) => "",
  fromStr: (_s: string, condition: any) => condition,
};

_conditionTypes["FalseCondition"] = {
  abbrs: ["False", "Disabled"],
  analyze: (_c: any) => null,
  match: () => false,
  compile: (_c: any) => new U2.AST_False({}),
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
      if (p.charCodeAt(0) === ".".charCodeAt(0)) {
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
      if (server.charCodeAt(0) === ".".charCodeAt(0)) {
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
  match: function (
    this: any,
    condition: any,
    request: any,
    cacheContainer: any,
  ) {
    const cache = cacheContainer.analyzed;
    if (cache.scheme != null && cache.scheme !== request.scheme) return false;
    if (cache.ip != null && !this.match(cache.ip, request)) return false;
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
  str: function (this: any, condition: any) {
    const analyzeFn = this._handler(condition).analyze;
    const cache = analyzeFn.call(exports, condition);
    if (cache.normalizedPattern) {
      return cache.normalizedPattern;
    } else {
      return condition.pattern;
    }
  },
  compile: function (this: any, condition: any, cacheContainer: any) {
    const cache = cacheContainer.analyzed;
    if (cache.url != null) {
      return regTest("url", cache.url);
    }
    const conditions: any[] = [];
    if (cache.host === "<local>") {
      const hostEquals = (host: string) =>
        new U2.AST_Binary({
          left: new U2.AST_SymbolRef({ name: "host" }),
          operator: "===",
          right: new U2.AST_String({ value: host }),
        });
      return new U2.AST_Binary({
        left: new U2.AST_Binary({
          left: hostEquals("127.0.0.1"),
          operator: "||",
          right: hostEquals("::1"),
        }),
        operator: "||",
        right: new U2.AST_Binary({
          left: new U2.AST_Call({
            expression: new U2.AST_Dot({
              expression: new U2.AST_SymbolRef({ name: "host" }),
              property: "indexOf",
            }),
            args: [new U2.AST_String({ value: "." })],
          }),
          operator: "<",
          right: new U2.AST_Number({ value: 0 }),
        }),
      });
    }
    if (cache.scheme != null) {
      conditions.push(
        new U2.AST_Binary({
          left: new U2.AST_SymbolRef({ name: "scheme" }),
          operator: "===",
          right: new U2.AST_String({ value: cache.scheme }),
        }),
      );
    }
    if (cache.host != null) {
      conditions.push(regTest("host", cache.host));
    } else if (cache.ip != null) {
      conditions.push(this.compile(cache.ip));
    }
    switch (conditions.length) {
      case 0:
        return new U2.AST_True({});
      case 1:
        return conditions[0];
      case 2:
        return new U2.AST_Binary({
          left: conditions[0],
          operator: "&&",
          right: conditions[1],
        });
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
    return new U2.AST_Binary({
      left: new U2.AST_Binary({
        left: new U2.AST_SymbolRef({ name: "scheme" }),
        operator: "===",
        right: new U2.AST_String({ value: "http" }),
      }),
      operator: "&&",
      right: new U2.AST_Binary({
        left: new U2.AST_Call({
          expression: new U2.AST_Dot({
            expression: new U2.AST_SymbolRef({ name: "url" }),
            property: "indexOf",
          }),
          args: [new U2.AST_String({ value: condition.pattern })],
        }),
        operator: ">=",
        right: new U2.AST_Number({ value: 0 }),
      }),
    });
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
    if (ip.charCodeAt(0) === "[".charCodeAt(0)) {
      ip = ip.substr(1, ip.length - 2);
    }
    const addrStr = ip + "/" + condition.prefixLength;
    cache.addr = parseIp(addrStr);
    if (cache.addr == null) {
      throw new Error(`Invalid IP address ${addrStr}`);
    }
    cache.normalized = normalizeIp(cache.addr);
    let mask: any;
    if (cache.addr.v4) {
      mask = new IP.v4.Address("255.255.255.255/" + cache.addr.subnetMask);
    } else {
      mask = new IP.v6.Address(ipv6Max + "/" + cache.addr.subnetMask);
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
      hostLooksLikeIp = new U2.AST_Binary({
        left: new U2.AST_Sub({
          expression: new U2.AST_SymbolRef({ name: "host" }),
          property: new U2.AST_Binary({
            left: new U2.AST_Dot({
              expression: new U2.AST_SymbolRef({ name: "host" }),
              property: "length",
            }),
            operator: "-",
            right: new U2.AST_Number({ value: 1 }),
          }),
        }),
        operator: ">=",
        right: new U2.AST_Number({ value: 0 }),
      });
    } else {
      hostLooksLikeIp = new U2.AST_Binary({
        left: new U2.AST_Call({
          expression: new U2.AST_Dot({
            expression: new U2.AST_SymbolRef({ name: "host" }),
            property: "indexOf",
          }),
          args: [new U2.AST_String({ value: ":" })],
        }),
        operator: ">=",
        right: new U2.AST_Number({ value: 0 }),
      });
    }
    if (cache.addr.subnetMask === 0) {
      return hostLooksLikeIp;
    }
    let hostIsInNet = new U2.AST_Call({
      expression: new U2.AST_SymbolRef({ name: "isInNet" }),
      args: [
        new U2.AST_SymbolRef({ name: "host" }),
        new U2.AST_String({ value: cache.normalized }),
        new U2.AST_String({ value: cache.mask }),
      ],
    });
    if (!cache.addr.v4) {
      const hostIsInNetEx = new U2.AST_Call({
        expression: new U2.AST_SymbolRef({ name: "isInNetEx" }),
        args: [
          new U2.AST_SymbolRef({ name: "host" }),
          new U2.AST_String({ value: cache.normalized + cache.addr.subnet }),
        ],
      });
      hostIsInNet = new U2.AST_Conditional({
        condition: new U2.AST_Binary({
          left: new U2.AST_UnaryPrefix({
            operator: "typeof",
            expression: new U2.AST_SymbolRef({ name: "isInNetEx" }),
          }),
          operator: "===",
          right: new U2.AST_String({ value: "function" }),
        }),
        consequent: hostIsInNetEx,
        alternative: hostIsInNet,
      });
    }
    return new U2.AST_Binary({
      left: hostLooksLikeIp,
      operator: "&&",
      right: hostIsInNet,
    });
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
  compile: function (this: any, condition: any) {
    const val = new U2.AST_Dot({
      property: "length",
      expression: new U2.AST_Call({
        args: [new U2.AST_String({ value: "." })],
        expression: new U2.AST_Dot({
          expression: new U2.AST_SymbolRef({ name: "host" }),
          property: "split",
        }),
      }),
    });
    return this.between(
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
  compile: function (this: any, condition: any) {
    const getDay = new U2.AST_Call({
      args: [],
      expression: new U2.AST_Dot({
        property: "getDay",
        expression: new U2.AST_New({
          args: [],
          expression: new U2.AST_SymbolRef({ name: "Date" }),
        }),
      }),
    });
    if (condition.days) {
      return new U2.AST_Binary({
        left: new U2.AST_Call({
          expression: new U2.AST_Dot({
            expression: new U2.AST_String({ value: condition.days }),
            property: "charCodeAt",
          }),
          args: [getDay],
        }),
        operator: ">",
        right: new U2.AST_Number({ value: 64 }),
      });
    } else {
      return this.between(getDay, condition.startDay, condition.endDay, "");
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
  compile: function (this: any, condition: any) {
    const val = new U2.AST_Call({
      args: [],
      expression: new U2.AST_Dot({
        property: "getHours",
        expression: new U2.AST_New({
          args: [],
          expression: new U2.AST_SymbolRef({ name: "Date" }),
        }),
      }),
    });
    return this.between(val, condition.startHour, condition.endHour, "");
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

exports._conditionTypes = _conditionTypes;
exports._abbrs = _abbrs;
