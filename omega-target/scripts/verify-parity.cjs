#!/usr/bin/env node
// Smoke-check the tsdown-built bundles expose the expected public surface.
// Intended to run in CI after `pnpm build`.
//
// The script loads each CJS bundle via `require()` and the IIFE bundle in a
// shimmed Node environment (injecting `self` and `OmegaPac` as globals so the
// browser-targeted code runs without a real browser).

const path = require("path");
const Module = require("module");
const fs = require("fs");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const CJS = path.join(ROOT, "dist", "index.js");
const IIFE = path.join(ROOT, "dist", "omega_target.min.js");

for (const p of [CJS, IIFE]) {
  if (!fs.existsSync(p)) {
    console.error(`Missing bundle: ${p}`);
    console.error("Run `pnpm build` first.");
    process.exit(2);
  }
}

const EXPECTED_SURFACE = [
  "BrowserStorage",
  "ContentTypeRejectedError",
  "HttpError",
  "HttpNotFoundError",
  "HttpServerError",
  "Log",
  "NetworkError",
  "OmegaPac",
  "Options",
  "OptionsSync",
  "Storage",
];

function loadCjs(file) {
  const mod = new Module(file);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  mod._compile(fs.readFileSync(file, "utf8"), file);
  return mod.exports;
}

function loadIife(file) {
  const sandbox = {};
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.OmegaPac = require(path.join(ROOT, "node_modules", "omega-pac"));
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  if (!sandbox.OmegaTarget) {
    throw new Error(`No OmegaTarget global after loading ${file}`);
  }
  return sandbox.OmegaTarget;
}

function publicShape(obj) {
  return Object.keys(obj)
    .filter((k) => k !== "default")
    .sort();
}

function runChecks(label, mod) {
  const shape = publicShape(mod);
  for (const name of EXPECTED_SURFACE) {
    if (!shape.includes(name)) {
      console.error(`${label}: missing export ${name}`);
      process.exit(1);
    }
  }
  if (typeof mod.Options !== "function") {
    console.error(`${label}: Options is not a class`);
    process.exit(1);
  }
  for (const subclass of ["ProfileNotExistError", "NoOptionsError"]) {
    if (typeof mod.Options[subclass] !== "function") {
      console.error(`${label}: Options.${subclass} missing`);
      process.exit(1);
    }
  }
  const err = new mod.Options.ProfileNotExistError("ghost");
  // Realm boundaries mean `err instanceof Error` is unreliable for IIFE
  // bundles loaded inside `vm.createContext`; walk the prototype chain.
  const isErrorLike = (() => {
    let proto = Object.getPrototypeOf(err);
    while (proto) {
      const ctorName = proto.constructor && proto.constructor.name;
      if (ctorName === "Error") return true;
      proto = Object.getPrototypeOf(proto);
    }
    return false;
  })();
  if (!isErrorLike || err.profileName !== "ghost") {
    console.error(`${label}: ProfileNotExistError behaviour drift`);
    process.exit(1);
  }
  for (const nested of [
    ["Storage", "RateLimitExceededError"],
    ["Storage", "QuotaExceededError"],
    ["Storage", "StorageUnavailableError"],
    ["OptionsSync", "TokenBucket"],
  ]) {
    const [a, b] = nested;
    if (typeof mod[a][b] !== "function") {
      console.error(`${label}: ${a}.${b} missing`);
      process.exit(1);
    }
  }
  if (!mod.OmegaPac || typeof mod.OmegaPac.Profiles !== "object") {
    console.error(`${label}: OmegaPac.Profiles missing`);
    process.exit(1);
  }
  if (typeof mod.Log.log !== "function") {
    console.error(`${label}: Log.log missing`);
    process.exit(1);
  }
  const v = {
    profileType: "RuleListProfile",
    name: "r",
    sourceUrl: "https://x",
    ruleList: "a",
    pacScript: "b",
    lastUpdate: "z",
    keep: 1,
  };
  const transformed = mod.Options.transformValueForSync(v, "+r");
  const kept = Object.keys(transformed).sort();
  if (
    JSON.stringify(kept) !==
    JSON.stringify(["keep", "name", "profileType", "sourceUrl"])
  ) {
    console.error(`${label}: transformValueForSync drift: ${JSON.stringify(kept)}`);
    process.exit(1);
  }
  const ops = mod.Storage.operationsForChanges(
    { a: 1, b: undefined, c: 3 },
    { base: { a: 1, b: 2, c: 3 } },
  );
  if (
    JSON.stringify(ops.set) !== "{}" ||
    JSON.stringify(ops.remove) !== '["b"]'
  ) {
    console.error(`${label}: operationsForChanges drift: ${JSON.stringify(ops)}`);
    process.exit(1);
  }
  return shape;
}

console.log("=== CJS (dist/index.js) ===");
const cjsShape = runChecks("cjs", loadCjs(CJS));

console.log("=== IIFE (dist/omega_target.min.js) ===");
const iifeShape = runChecks("iife", loadIife(IIFE));

if (JSON.stringify(cjsShape) !== JSON.stringify(iifeShape)) {
  console.error("Public surface drifted between CJS and IIFE bundles:");
  console.error("  cjs  =", JSON.stringify(cjsShape));
  console.error("  iife =", JSON.stringify(iifeShape));
  process.exit(1);
}

console.log("\nOK: both bundles expose the expected public surface.");
console.log("  ", JSON.stringify(cjsShape));
