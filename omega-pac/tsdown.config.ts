import { defineConfig } from "tsdown";
import { renameSync, existsSync } from "node:fs";

// Two parallel builds:
//   1. ESM + CJS library (consumed via Node require / bundler import).
//      Keeps runtime deps external so downstream bundlers dedupe them.
//   2. UMD single-file bundle exposing `OmegaPac` globally. The proxy script
//      inside the Chromium extension loads this file via <script>, so every
//      dep must be inlined.
export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    outDir: "dist",
    platform: "neutral",
    target: "es2020",
    dts: false,
    minify: false,
    clean: true,
    onSuccess: "eslint src/ --no-cache --max-warnings 0",
  },
  {
    entry: { "omega_pac.min": "src/index.ts" },
    format: ["umd"],
    outDir: ".",
    platform: "neutral",
    target: "es2020",
    globalName: "OmegaPac",
    dts: false,
    minify: true,
    clean: false,
    deps: { alwaysBundle: [/.*/] },
    inputOptions: {
      resolve: {
        // Force rolldown to honour `main`/`module` so tldts resolves to its
        // compiled dist rather than its bundled TypeScript sources.
        mainFields: ["module", "main"],
      },
    },
    // tsdown 0.14 always appends the format suffix (.umd.js) for UMD output.
    // Rename to the legacy filename that downstream extension bundler
    // consumes via webpack alias.
    hooks: {
      "build:done": () => {
        const from = "./omega_pac.min.umd.js";
        const to = "./omega_pac.min.js";
        if (existsSync(from)) renameSync(from, to);
      },
    },
  },
]);
