import { defineConfig } from "tsdown";

// ESM + CJS library output consumed by the Node-based test runner,
// workspace bundlers (Vite / tsdown) and downstream packages.
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
]);
