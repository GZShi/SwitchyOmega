import { defineConfig } from "tsdown";

// Two-entry configuration:
//
// 1. Library output (ESM + CJS) consumed by the Node-based test runner and by
//    the in-repo workspace packages. Keeps jsondiffpatch, limiter and
//    omega-pac as external dependencies so downstream bundlers (or the Node
//    resolver) pick them up themselves.
//
// 2. Browser IIFE bundle (`dist/omega_target.min.js`) used by the Chromium
//    extension via a <script> tag. This bundle inlines jsondiffpatch and
//    limiter, and expects omega-pac to be available as `window.OmegaPac`
//    (the extension loads `omega_pac.min.js` first), matching the existing
//    runtime contract.
export default defineConfig([
  {
    entry: "./src/index.ts",
    format: ["esm", "cjs"],
    outDir: "dist",
    target: "es2022",
    dts: false,
    platform: "neutral",
    deps: { neverBundle: ["omega-pac", "jsondiffpatch", "limiter"] },
    sourcemap: false,
    clean: true,
    onSuccess: "eslint src/ --no-cache --max-warnings 0",
  },
  {
    entry: "./src/index.ts",
    format: "iife",
    globalName: "OmegaTarget",
    outDir: "dist",
    target: "es2022",
    platform: "browser",
    minify: true,
    deps: {
      neverBundle: ["omega-pac"],
      alwaysBundle: ["jsondiffpatch", "limiter"],
    },
    outputOptions: {
      entryFileNames: "omega_target.min.js",
      chunkFileNames: "omega_target-[hash].js",
      exports: "named",
      globals: { "omega-pac": "OmegaPac" },
    },
    sourcemap: false,
    dts: false,
  },
]);
