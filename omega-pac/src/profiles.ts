import * as b from "./astree/builders";
import * as Conditions from "./conditions";
import * as RuleList from "./rule_list";
import { AttachedCache, Revision } from "./utils";
import type { ProfileHandler } from "./types";

// ---- Constants ----
const builtinProfiles: Record<string, any> = {
  "+direct": {
    name: "direct",
    profileType: "DirectProfile",
    color: "#aaaaaa",
    builtin: true,
  },
  "+system": {
    name: "system",
    profileType: "SystemProfile",
    color: "#000000",
    builtin: true,
  },
};

const schemes = [
  { scheme: "http", prop: "proxyForHttp" },
  { scheme: "https", prop: "proxyForHttps" },
  { scheme: "ftp", prop: "proxyForFtp" },
  { scheme: "", prop: "fallbackProxy" },
];

const pacProtocols: Record<string, string> = {
  http: "PROXY",
  https: "HTTPS",
  socks4: "SOCKS",
  socks5: "SOCKS5",
};

const formatByType: Record<string, string> = {
  SwitchyRuleListProfile: "Switchy",
  AutoProxyRuleListProfile: "AutoProxy",
};

const ruleListFormats = ["Switchy", "AutoProxy"];

// ---- Exported functions ----
function parseHostPort(
  str: string,
  scheme: string,
): { scheme: string; host: string; port: number } | undefined {
  const sep = str.lastIndexOf(":");
  if (sep < 0) return undefined;
  const port = parseInt(str.slice(sep + 1), 10) || 80;
  const host = str.slice(0, sep);
  if (!host) return undefined;
  return { scheme, host, port };
}

function pacResult(
  proxy?: { scheme: string; host: string; port: number } | null,
): string {
  if (proxy) {
    if (proxy.scheme === "socks5") {
      return `SOCKS5 ${proxy.host}:${proxy.port}; SOCKS ${proxy.host}:${proxy.port}`;
    } else {
      return `${pacProtocols[proxy.scheme]} ${proxy.host}:${proxy.port}`;
    }
  } else {
    return "DIRECT";
  }
}

function isFileUrl(url: string): boolean {
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain -- && guards method call chain, ?. would throw on null
  return !!(url && url.toUpperCase().startsWith("FILE:"));
}

function nameAsKey(profileName: any): string {
  if (typeof profileName !== "string") {
    profileName = profileName.name;
  }
  return `+${profileName}`;
}

function byName(profileName: any, options?: any): any {
  if (typeof profileName === "string") {
    const key = nameAsKey(profileName);
    profileName = builtinProfiles[key] ?? options?.[key];
  }
  return profileName;
}

function byKey(key: any, options?: any): any {
  if (typeof key === "string") {
    key = builtinProfiles[key] ?? options?.[key];
  }
  return key;
}

function each(
  options: any,
  callback: (key: string, profile: any) => void,
): void {
  for (const key of Object.keys(options)) {
    if (key.startsWith("+")) {
      callback(key, options[key]);
    }
  }
  for (const key of Object.keys(builtinProfiles)) {
    if (key.startsWith("+")) {
      callback(key, builtinProfiles[key]);
    }
  }
}

function profileResult(profileName: any): any {
  let key = nameAsKey(profileName);
  if (key === "+direct") {
    key = pacResult();
  }
  return b.str(key);
}

function isIncludable(profile: any): boolean {
  let includable = _getProfileHandler(profile).includable;
  if (typeof includable === "function") {
    includable = includable(profile);
  }
  return !!includable;
}

function isInclusive(profile: any): boolean {
  return !!_getProfileHandler(profile).inclusive;
}

const _profileTypes: Record<string, string | ProfileHandler> = {};

function _getProfileHandler(profileType: any): any {
  if (typeof profileType !== "string") {
    profileType = profileType.profileType;
  }
  let handler: any = profileType;
  while (typeof handler === "string") {
    handler = _profileTypes[handler];
  }
  if (handler == null) {
    throw new Error(`Unknown profile type: ${profileType}`);
  }
  return handler;
}

function updateUrl(profile: any): string | undefined {
  return _getProfileHandler(profile).updateUrl?.(profile);
}

function updateContentTypeHints(profile: any): string[] | undefined {
  return _getProfileHandler(profile).updateContentTypeHints?.(profile);
}

function update(profile: any, data: string): boolean {
  return _getProfileHandler(profile).update(profile, data);
}

const _profileCache = new AttachedCache((profile: any) => profile.revision);

function tag(profile: any): string {
  return _profileCache.tag(profile);
}

function create(profile: any, opt_profileType?: string): any {
  if (typeof profile === "string") {
    profile = {
      name: profile,
      profileType: opt_profileType,
    };
  } else if (opt_profileType) {
    profile.profileType = opt_profileType;
  }
  const createFn = _getProfileHandler(profile).create;
  if (!createFn) return profile;
  createFn(profile);
  return profile;
}

function updateRevision(profile: any, revision?: string): void {
  revision ??= Revision.fromTime();
  profile.revision = revision;
}

function replaceRef(profile: any, fromName: string, toName: string): boolean {
  if (!isInclusive(profile)) return false;
  const handler = _getProfileHandler(profile);
  return handler.replaceRef(profile, fromName, toName);
}

function analyze(profile: any): any {
  const cache = _profileCache.get(profile, {});
  if (!Object.hasOwn(cache, "analyzed")) {
    const analyzeFn = _getProfileHandler(profile).analyze;
    const result = analyzeFn?.(profile);
    cache.analyzed = result;
  }
  return cache;
}

function dropCache(profile: any): void {
  _profileCache.drop(profile);
}

function directReferenceSet(profile: any): Record<string, string> {
  if (!isInclusive(profile)) return {};
  const cache = _profileCache.get(profile, {});
  if (cache.directReferenceSet) return cache.directReferenceSet;
  const handler = _getProfileHandler(profile);
  cache.directReferenceSet = handler.directReferenceSet(profile);
  return cache.directReferenceSet;
}

function profileNotFound(name: string, action?: any): any {
  if (action == null) {
    throw new Error(`Profile ${name} does not exist!`);
  }
  if (typeof action === "function") {
    action = action(name);
  }
  if (typeof action === "object" && action.profileType) {
    return action;
  }
  switch (action) {
    case "ignore":
      return null;
    case "dumb":
      return create({
        name,
        profileType: "VirtualProfile",
        defaultProfileName: "direct",
      });
  }
  throw action;
}

function allReferenceSet(
  profile: any,
  options: any,
  opt_args?: any,
): Record<string, any> {
  const o_profile = profile;
  profile = byName(profile, options);
  profile ??= profileNotFound(o_profile, opt_args?.profileNotFound);
  opt_args ??= {};
  const has_out = opt_args.out != null;
  opt_args.out ??= {};
  const result = opt_args.out;
  if (profile) {
    result[nameAsKey(profile.name)] = profile.name;
    for (const name of Object.values(directReferenceSet(profile))) {
      allReferenceSet(name, options, opt_args);
    }
  }
  if (!has_out) delete opt_args.out;
  return result;
}

function referencedBySet(
  profile: any,
  options: any,
  opt_args?: any,
): Record<string, any> {
  const profileKey = nameAsKey(profile);
  opt_args ??= {};
  const has_out = opt_args.out != null;
  opt_args.out ??= {};
  const result = opt_args.out;
  each(options, (key: string, prof: any) => {
    if (directReferenceSet(prof)[profileKey]) {
      result[key] = prof.name;
      referencedBySet(prof, options, opt_args);
    }
  });
  if (!has_out) delete opt_args.out;
  return result;
}

function validResultProfilesFor(profile: any, options: any): any[] {
  profile = byName(profile, options);
  if (!isInclusive(profile)) return [];
  const profileKey = nameAsKey(profile);
  const ref = referencedBySet(profile, options);
  ref[profileKey] = profileKey;
  const result: any[] = [];
  each(options, (key: string, prof: any) => {
    if (!ref[key] && isIncludable(prof)) {
      result.push(prof);
    }
  });
  return result;
}

function match(profile: any, request: any, opt_profileType?: string): any {
  opt_profileType ??= profile.profileType;
  const cache = analyze(profile);
  const matchFn = _getProfileHandler(opt_profileType).match;
  return matchFn?.(profile, request, cache);
}

function compile(profile: any, opt_profileType?: string): any {
  opt_profileType ??= profile.profileType;
  const cache = analyze(profile);
  if (cache.compiled) return cache.compiled;
  const handler = _getProfileHandler(opt_profileType);
  cache.compiled = handler.compile(profile, cache);
  return cache.compiled;
}

// ---- _profileTypes ----
_profileTypes["SystemProfile"] = {
  compile: (_profile: any) => {
    throw new Error("SystemProfile cannot be used in PAC scripts");
  },
};

_profileTypes["DirectProfile"] = {
  includable: true,
  compile(_profile: any) {
    return b.str(pacResult());
  },
};

_profileTypes["FixedProfile"] = {
  includable: true,
  create: (profile: any) => {
    profile.bypassList ??= [
      { conditionType: "BypassCondition", pattern: "127.0.0.1" },
      { conditionType: "BypassCondition", pattern: "[::1]" },
      { conditionType: "BypassCondition", pattern: "localhost" },
    ];
  },
  match(profile: any, request: any) {
    if (profile.bypassList) {
      for (const cond of profile.bypassList) {
        if (Conditions.match(cond, request)) {
          return [pacResult(), cond, { scheme: "direct" }, undefined];
        }
      }
    }
    for (const s of schemes) {
      if (s.scheme === request.scheme && profile[s.prop]) {
        return [
          pacResult(profile[s.prop]),
          s.scheme,
          profile[s.prop],
          profile.auth?.[s.prop] ?? profile.auth?.["all"],
        ];
      }
    }
    return [
      pacResult(profile.fallbackProxy),
      "",
      profile.fallbackProxy,
      profile.auth?.fallbackProxy ?? profile.auth?.["all"],
    ];
  },
  compile(profile: any) {
    if (
      (!profile.bypassList || !profile.fallbackProxy) &&
      !profile.proxyForHttp &&
      !profile.proxyForHttps &&
      !profile.proxyForFtp
    ) {
      return b.str(pacResult(profile.fallbackProxy));
    }
    const body: any[] = [b.directive("use strict")];

    if (profile.bypassList?.length) {
      let conditions: any = null;
      for (const cond of profile.bypassList) {
        const condition = Conditions.compile(cond);
        if (conditions) {
          conditions = b.binary(conditions, "||", condition);
        } else {
          conditions = condition;
        }
      }
      body.push(b.if_stmt(conditions, b.ret(b.str(pacResult()))));
    }

    if (
      !profile.proxyForHttp &&
      !profile.proxyForHttps &&
      !profile.proxyForFtp
    ) {
      body.push(b.ret(b.str(pacResult(profile.fallbackProxy))));
    } else {
      const cases: any[] = [];
      for (const s of schemes) {
        if (!s.scheme || profile[s.prop]) {
          const ret = [b.ret(b.str(pacResult(profile[s.prop])))];
          if (s.scheme) {
            cases.push(b.case_stmt(b.str(s.scheme), ret));
          } else {
            cases.push(b.default_stmt(ret));
          }
        }
      }
      body.push(b.switch_stmt(b.id("scheme"), cases));
    }

    return b.func([b.id("url"), b.id("host"), b.id("scheme")], b.block(body));
  },
};

_profileTypes["PacProfile"] = {
  includable: (profile: any) => !isFileUrl(profile.pacUrl),
  create: (profile: any) => {
    profile.pacScript ??=
      'function FindProxyForURL(url, host) {\n  return "DIRECT";\n}\n';
  },
  compile: (_profile: any) => {
    const innerFunc = b.func(
      [],
      b.block([
        b.raw(`;\n${_profile.pacScript}\n\n/* End of PAC */;`),
        b.ret(b.id("FindProxyForURL")),
      ]),
    );
    return b.call(b.dot(innerFunc, "call"), [b.this_expr()]);
  },
  updateUrl: (profile: any) => {
    if (isFileUrl(profile.pacUrl)) return undefined;
    return profile.pacUrl;
  },
  updateContentTypeHints: () => [
    "!text/html",
    "!application/xhtml+xml",
    "application/x-ns-proxy-autoconfig",
    "application/x-javascript-config",
  ],
  update: (profile: any, data: string) => {
    if (profile.pacScript === data) return false;
    profile.pacScript = data;
    return true;
  },
};

_profileTypes["AutoDetectProfile"] = "PacProfile";

_profileTypes["SwitchProfile"] = {
  includable: true,
  inclusive: true,
  create: (profile: any) => {
    profile.defaultProfileName ??= "direct";
    profile.rules ??= [];
  },
  directReferenceSet(profile: any) {
    const refs: Record<string, string> = {};
    refs[nameAsKey(profile.defaultProfileName)] = profile.defaultProfileName;
    for (const rule of profile.rules) {
      refs[nameAsKey(rule.profileName)] = rule.profileName;
    }
    return refs;
  },
  analyze: (_profile: any, _cache?: any) => _profile.rules,
  replaceRef: (profile: any, fromName: string, toName: string) => {
    let changed = false;
    if (profile.defaultProfileName === fromName) {
      profile.defaultProfileName = toName;
      changed = true;
    }
    for (const rule of profile.rules) {
      if (rule.profileName === fromName) {
        rule.profileName = toName;
        changed = true;
      }
    }
    return changed;
  },
  match(profile: any, request: any, cache: any) {
    for (const rule of cache.analyzed) {
      if (Conditions.match(rule.condition, request)) {
        return rule;
      }
    }
    return [nameAsKey(profile.defaultProfileName), null];
  },
  compile(profile: any, cache: any) {
    const rules = cache.analyzed;
    if (rules.length === 0) {
      return profileResult(profile.defaultProfileName);
    }
    const body: any[] = [b.directive("use strict")];
    for (const rule of rules) {
      body.push(
        b.if_stmt(
          Conditions.compile(rule.condition),
          b.ret(profileResult(rule.profileName)),
        ),
      );
    }
    body.push(b.ret(profileResult(profile.defaultProfileName)));

    const p = [b.id("url"), b.id("host"), b.id("scheme")];
    return b.func(p, b.block(body));
  },
};

_profileTypes["VirtualProfile"] = "SwitchProfile";

_profileTypes["RuleListProfile"] = {
  includable: true,
  inclusive: true,
  create: (profile: any) => {
    profile.profileType ??= "RuleListProfile";
    profile.format ??= formatByType[profile.profileType] ?? "Switchy";
    profile.defaultProfileName ??= "direct";
    profile.matchProfileName ??= "direct";
    profile.ruleList ??= "";
  },
  directReferenceSet: (profile: any) => {
    if (profile.ruleList != null) {
      const refs = RuleList[profile.format]?.directReferenceSet?.(profile);
      if (refs) return refs;
    }
    const refs: Record<string, string> = {};
    for (const name of [profile.matchProfileName, profile.defaultProfileName]) {
      refs[nameAsKey(name)] = name;
    }
    return refs;
  },
  replaceRef: (profile: any, fromName: string, toName: string) => {
    let changed = false;
    if (profile.defaultProfileName === fromName) {
      profile.defaultProfileName = toName;
      changed = true;
    }
    if (profile.matchProfileName === fromName) {
      profile.matchProfileName = toName;
      changed = true;
    }
    return changed;
  },
  analyze: (profile: any) => {
    const format = profile.format ?? formatByType[profile.profileType];
    const formatHandler = RuleList[format];
    if (!formatHandler) {
      throw new Error(`Unsupported rule list format ${format}!`);
    }
    let ruleList = profile.ruleList?.trim() || "";
    if (formatHandler.preprocess != null) {
      ruleList = formatHandler.preprocess(ruleList);
    }
    return formatHandler.parse(
      ruleList,
      profile.matchProfileName,
      profile.defaultProfileName,
    );
  },
  match(profile: any, request: any) {
    return match(profile, request, "SwitchProfile");
  },
  compile(profile: any) {
    return compile(profile, "SwitchProfile");
  },
  updateUrl: (profile: any) => profile.sourceUrl,
  updateContentTypeHints: () => [
    "!text/html",
    "!application/xhtml+xml",
    "text/plain",
    "*",
  ],
  update: (profile: any, data: string) => {
    data = data.trim();
    const original = profile.format ?? formatByType[profile.profileType];
    profile.profileType = "RuleListProfile";
    let format = original;
    if (RuleList[format].detect?.(data) === false) {
      format = null;
    }
    for (const formatName of Object.keys(RuleList)) {
      if (!Object.hasOwn(RuleList, formatName)) continue;
      const result = RuleList[formatName].detect?.(data);
      if (result === true || (result !== false && format == null)) {
        profile.format = format = formatName;
      }
    }
    format ??= original;
    const formatHandler = RuleList[format];
    if (formatHandler.preprocess != null) {
      data = formatHandler.preprocess(data);
    }
    if (profile.ruleList === data) return false;
    profile.ruleList = data;
    return true;
  },
};

_profileTypes["SwitchyRuleListProfile"] = "RuleListProfile";
_profileTypes["AutoProxyRuleListProfile"] = "RuleListProfile";

// _self shim removed — ESM module-level functions are referenced directly
// by handler definitions, no need for the `self` namespace anymore.

export {
  parseHostPort,
  pacResult,
  isFileUrl,
  nameAsKey,
  byName,
  byKey,
  each,
  profileResult,
  isIncludable,
  isInclusive,
  _getProfileHandler as _handler,
  updateUrl,
  updateContentTypeHints,
  update,
  _profileCache,
  tag,
  create,
  updateRevision,
  replaceRef,
  analyze,
  dropCache,
  directReferenceSet,
  profileNotFound,
  allReferenceSet,
  referencedBySet,
  validResultProfilesFor,
  match,
  compile,
  builtinProfiles,
  schemes,
  pacProtocols,
  formatByType,
  ruleListFormats,
  _profileTypes,
};
