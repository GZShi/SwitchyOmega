import * as b from "./astree/builders";
import { mangle } from "./astree/mangler";
import * as Profiles from "./profiles";

export function ascii(str: string): string {
  return str.replace(/[-￿]/g, (char: string) => {
    return "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0");
  });
}

export function compress(ast: any): any {
  mangle(ast);
  return ast;
}

export function script(options: any, profile: any, args?: any): any {
  if (typeof profile === "string") {
    profile = Profiles.byName(profile, options);
  }
  const refs = Profiles.allReferenceSet(profile, options, {
    profileNotFound: args?.profileNotFound,
  });

  // Build profiles AST object
  const profileArr: any[] = [];
  for (const key of Object.keys(refs)) {
    const name = refs[key];
    if (key === "+direct") continue;
    let p: any;
    if (typeof profile === "object" && profile.name === name) {
      p = profile;
    } else {
      p = Profiles.byName(name, options);
    }
    if (p == null) {
      p = Profiles.profileNotFound(name, args?.profileNotFound);
    }
    profileArr.push(b.prop(key, Profiles.compile(p)));
  }
  const profiles = b.obj(profileArr);

  // factory: function(init, profiles) { return function(url, host) { ... }; }
  const factory = b.func(
    [b.id("init"), b.id("profiles")],
    b.block([
      b.ret(
        b.func(
          [b.id("url"), b.id("host")],
          b.block([
            b.directive("use strict"),
            b.var_decl([
              b.vardef(b.id("result"), b.id("init")),
              b.vardef(
                b.id("scheme"),
                b.call(b.dot(b.id("url"), "substr"), [
                  b.num(0),
                  b.call(b.dot(b.id("url"), "indexOf"), [b.str(":")]),
                ]),
              ),
            ]),
            b.do_while(
              b.block([
                b.expr(
                  b.assign(
                    b.id("result"),
                    "=",
                    b.sub(b.id("profiles"), b.id("result")),
                  ),
                ),
                b.if_stmt(
                  b.binary(
                    b.unary("typeof", b.id("result")),
                    "===",
                    b.str("function"),
                  ),
                  b.expr(
                    b.assign(
                      b.id("result"),
                      "=",
                      b.call(b.id("result"), [
                        b.id("url"),
                        b.id("host"),
                        b.id("scheme"),
                      ]),
                    ),
                  ),
                ),
              ]),
              b.binary(
                b.binary(
                  b.unary("typeof", b.id("result")),
                  "!==",
                  b.str("string"),
                ),
                "||",
                b.binary(
                  b.call(b.dot(b.id("result"), "charCodeAt"), [b.num(0)]),
                  "===",
                  b.num("+".charCodeAt(0)),
                ),
              ),
            ),
            b.ret(b.id("result")),
          ]),
        ),
      ),
    ]),
  );

  const profileResult = Profiles.profileResult(profile);

  return b.toplevel([
    b.var_decl([
      b.vardef(
        b.id("FindProxyForURL"),
        b.call(factory, [profileResult, profiles]),
      ),
    ]),
  ]);
}
