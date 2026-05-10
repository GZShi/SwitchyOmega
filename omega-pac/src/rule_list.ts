import * as Conditions from "./conditions";

function strStartsWith(str: string, prefix: string): boolean {
  return str.substr(0, prefix.length) === prefix;
}

function decodeBase64Utf8(text: string): string {
  const bin = atob(text);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

// ---- AutoProxy format ----
const AutoProxy: any = {
  magicPrefix: "W0F1dG9Qcm94", // Detect base-64 encoded "[AutoProxy".

  detect: (text: string): boolean | undefined => {
    if (strStartsWith(text, AutoProxy.magicPrefix)) return true;
    if (strStartsWith(text, "[AutoProxy")) return true;
    return undefined;
  },

  preprocess: (text: string): string => {
    if (strStartsWith(text, AutoProxy.magicPrefix)) {
      text = decodeBase64Utf8(text);
    }
    return text;
  },

  parse: (
    text: string,
    matchProfileName: string,
    defaultProfileName: string,
  ): any[] => {
    const normal_rules: any[] = [];
    const exclusive_rules: any[] = [];
    for (let line of text.split(/\n|\r/)) {
      line = line.trim();
      if (line.length === 0 || line[0] === "!" || line[0] === "[") continue;
      const source = line;
      let profile = matchProfileName;
      let list = normal_rules;
      if (line[0] === "@" && line[1] === "@") {
        profile = defaultProfileName;
        list = exclusive_rules;
        line = line.substring(2);
      }
      let cond: any;
      if (line[0] === "/") {
        cond = {
          conditionType: "UrlRegexCondition",
          pattern: line.substring(1, line.length - 1),
        };
      } else if (line[0] === "|") {
        if (line[1] === "|") {
          cond = {
            conditionType: "HostWildcardCondition",
            pattern: "*." + line.substring(2),
          };
        } else {
          cond = {
            conditionType: "UrlWildcardCondition",
            pattern: line.substring(1) + "*",
          };
        }
      } else if (line.indexOf("*") < 0) {
        cond = {
          conditionType: "KeywordCondition",
          pattern: line,
        };
      } else {
        cond = {
          conditionType: "UrlWildcardCondition",
          pattern: "http://*" + line + "*",
        };
      }
      list.push({ condition: cond, profileName: profile, source: source });
    }
    // Exclusive rules have higher priority, so they come first.
    return exclusive_rules.concat(normal_rules);
  },
};

// ---- Switchy format ----
const Switchy: any = {
  omegaPrefix: "[SwitchyOmega Conditions",
  specialLineStart: "[;#@!",

  detect: (text: string): boolean | undefined => {
    if (strStartsWith(text, Switchy.omegaPrefix)) return true;
    return undefined;
  },

  parse: (
    text: string,
    matchProfileName: string,
    defaultProfileName: string,
    args?: any,
  ): any[] => {
    const parser = Switchy.getParser(text);
    if (parser === "parseOmega") {
      return Switchy.parseOmega(
        text,
        matchProfileName,
        defaultProfileName,
        args,
      );
    } else {
      return Switchy.parseLegacy(text, matchProfileName, defaultProfileName);
    }
  },

  getParser: (text: string): string => {
    if (!strStartsWith(text, Switchy.omegaPrefix)) {
      if (text[0] === "#" || text.indexOf("\n#") >= 0) {
        return "parseLegacy";
      }
    }
    return "parseOmega";
  },

  directReferenceSet: (profile: any): Record<string, string> | null => {
    const { ruleList, matchProfileName, defaultProfileName } = profile;
    const parser = Switchy.getParser(ruleList);
    if (parser === "parseOmega") {
      if (ruleList.indexOf("@with result") >= 0) {
        const refs: Record<string, string> = {};
        for (const line of ruleList.split(/\n|\r/)) {
          if (!line || line[0] === "!") continue;
          const pos = line.lastIndexOf(" +");
          if (pos >= 0) {
            const name = line.substring(pos + 2).trim();
            if (name) {
              refs["+" + name] = name;
            }
          }
        }
        return refs;
      }
      return null;
    }
    return null;
  },

  compose: (
    profile: any,
    opts?: { withResult?: boolean; useExclusive?: boolean },
  ): string => {
    const { rules, defaultProfileName } = profile;
    const eol = "\r\n";
    let ruleList = Switchy.omegaPrefix + eol;
    const useExclusive = opts?.useExclusive ?? !opts?.withResult;
    const withResult = opts?.withResult ?? false;

    if (withResult) {
      ruleList += "@with result" + eol + eol;
    } else {
      ruleList += eol;
    }

    const specialLineStart = Switchy.specialLineStart + "+";
    for (const rule of rules) {
      if (rule.note) {
        ruleList += "@note " + rule.note + eol;
      }
      let line = Conditions.str(rule.condition);
      if (useExclusive && rule.profileName === defaultProfileName) {
        line = "!" + line;
      } else {
        if (specialLineStart.indexOf(line[0]) >= 0) {
          line = ": " + line;
        }
        if (withResult) {
          line += " +" + rule.profileName;
        }
      }
      ruleList += line + eol;
    }

    if (withResult) {
      ruleList += eol + "* +" + defaultProfileName + eol;
    }
    return ruleList;
  },

  conditionFromLegacyWildcard: (pattern: string): any => {
    if (pattern[0] === "@") {
      pattern = pattern.substring(1);
    }
    // Note: The original CS version had a bug where the else branch was missing
    // curly braces, meaning the padding logic ran for ALL non-@ patterns.
    // The intent was: for non-@ patterns, pad with * if needed.
    // Due to CS indentation, the following always runs (no else before if).
    // Actually looking at the CS more carefully:
    //   if pattern[0] == '@'
    //     pattern = pattern.substring(1)
    //   else
    //     if pattern.indexOf('://') <= 0 and pattern[0] != '*'
    //       pattern = '*' + pattern
    //     if pattern[pattern.length - 1] != '*'
    //       pattern += '*'
    // This means the else block contains both if statements.
    // For non-@ patterns, add * prefix if needed and * suffix if needed.
    if (pattern[0] !== "@") {
      if (pattern.indexOf("://") <= 0 && pattern[0] !== "*") {
        pattern = "*" + pattern;
      }
      if (pattern[pattern.length - 1] !== "*") {
        pattern += "*";
      }
    } else {
      // Remove the @ prefix
      pattern = pattern.substring(1);
    }

    const host = Conditions.urlWildcard2HostWildcard(pattern);
    if (host) {
      return {
        conditionType: "HostWildcardCondition",
        pattern: host,
      };
    } else {
      return {
        conditionType: "UrlWildcardCondition",
        pattern: pattern,
      };
    }
  },

  parseLegacy: (
    text: string,
    matchProfileName: string,
    defaultProfileName: string,
  ): any[] => {
    const normal_rules: any[] = [];
    const exclusive_rules: any[] = [];
    let begin = false;
    let section = "WILDCARD";

    for (let line of text.split(/\n|\r/)) {
      line = line.trim();
      if (line.length === 0 || line[0] === ";") continue;
      if (!begin) {
        if (line.toUpperCase() === "#BEGIN") {
          begin = true;
        }
        continue;
      }
      if (line.toUpperCase() === "#END") break;
      if (line[0] === "[" && line[line.length - 1] === "]") {
        section = line.substring(1, line.length - 1).toUpperCase();
        continue;
      }
      const source = line;
      let profile = matchProfileName;
      let list = normal_rules;
      if (line[0] === "!") {
        profile = defaultProfileName;
        list = exclusive_rules;
        line = line.substring(1);
      }
      let cond: any;
      switch (section) {
        case "WILDCARD":
          cond = Switchy.conditionFromLegacyWildcard(line);
          break;
        case "REGEXP":
          cond = {
            conditionType: "UrlRegexCondition",
            pattern: line,
          };
          break;
        default:
          cond = null;
      }
      if (cond != null) {
        list.push({ condition: cond, profileName: profile, source: source });
      }
    }
    // Exclusive rules have higher priority, so they come first.
    return exclusive_rules.concat(normal_rules);
  },

  parseOmega: (
    text: string,
    matchProfileName: string,
    defaultProfileName: string,
    args?: any,
  ): any[] => {
    const opt_args = args || {};
    const strict = opt_args.strict;
    let error: ((fields: any) => void) | null = null;
    if (strict) {
      error = (fields: any) => {
        const err: any = new Error(fields.message);
        for (const key of Object.keys(fields)) {
          if (Object.prototype.hasOwnProperty.call(fields, key)) {
            err[key] = fields[key];
          }
        }
        throw err;
      };
    }
    const includeSource = opt_args.source != null ? opt_args.source : true;
    const rules: any[] = [];
    const rulesWithDefaultProfile: any[] = [];
    let withResult = false;
    let exclusiveProfile: string | null = null;
    let noteForNextRule: string | null = null;
    let lno = 0;

    for (let line of text.split(/\n|\r/)) {
      lno++;
      line = line.trim();
      if (line.length === 0) continue;
      switch (line[0]) {
        case "[": // Header line: Ignore.
          continue;
        case ";": // Comment line: Ignore.
          continue;
        case "@": {
          // Directive line:
          let iSpace = line.indexOf(" ");
          if (iSpace < 0) iSpace = line.length;
          const directive = line.substr(1, iSpace - 1);
          line = line.substr(iSpace + 1).trim();
          switch (directive.toUpperCase()) {
            case "WITH":
              const feature = line.toUpperCase();
              if (feature === "RESULT" || feature === "RESULTS") {
                withResult = true;
              }
              break;
            case "NOTE":
              noteForNextRule = line;
              break;
          }
          continue;
        }
      }

      let source: string | null = null;
      let profile: string | null;
      if (strict) exclusiveProfile = null;
      if (line[0] === "!") {
        profile = withResult ? null : defaultProfileName;
        source = line;
        line = line.substr(1);
      } else if (withResult) {
        const iSpace = line.lastIndexOf(" +");
        if (iSpace < 0) {
          if (error) {
            error({
              message: "Missing result profile name: " + line,
              reason: "missingResultProfile",
              source: line,
              sourceLineNo: lno,
            });
          }
          continue;
        }
        profile = line.substr(iSpace + 2).trim();
        line = line.substr(0, iSpace).trim();
        if (line === "*") {
          exclusiveProfile = profile;
        }
      } else {
        profile = matchProfileName;
      }

      const cond = Conditions.fromStr(line);
      if (!cond) {
        if (error) {
          error({
            message: "Invalid rule: " + line,
            reason: "invalidRule",
            source: source != null ? source : line,
            sourceLineNo: lno,
          });
        }
        continue;
      }

      const rule: any = {
        condition: cond,
        profileName: profile,
        source: includeSource ? (source != null ? source : line) : undefined,
      };
      if (noteForNextRule != null) {
        rule.note = noteForNextRule;
        noteForNextRule = null;
      }
      rules.push(rule);
      if (!profile) {
        rulesWithDefaultProfile.push(rule);
      }
    }

    if (withResult) {
      if (!exclusiveProfile) {
        if (strict) {
          if (error) {
            error({
              message: "Missing default rule with catch-all '*' condition",
              reason: "noDefaultRule",
            });
          }
        }
        exclusiveProfile = defaultProfileName || "direct";
      }
      for (const rule of rulesWithDefaultProfile) {
        rule.profileName = exclusiveProfile;
      }
    }
    return rules;
  },
};

export { AutoProxy, Switchy };
