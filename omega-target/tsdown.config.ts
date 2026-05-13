import { defineConfig } from "tsdown";

// ESM + CJS library output consumed by the Node-based test runner,
// workspace bundlers (tsdown / Vite), and downstream packages.
// Keeps omega-pac, jsondiffpatch and limiter as external deps so
// bundlers dedupe them.
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
]);
