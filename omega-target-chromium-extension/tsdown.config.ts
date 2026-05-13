import { defineConfig } from "tsdown";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Two-entry configuration:
//
// 1. Library output (ESM + CJS) consumed by the Node-based test runner and
//    workspace packages. Keeps omega-pac, omega-target, omega-web and heap-js
//    as external dependencies.
//
// 2. Browser ESM bundle (`build/js/modules.mjs`) loaded by the module service
//    worker via `import "./modules.mjs"`. Bundles omega-pac, omega-target
//    and heap-js inline so the output is a single self-contained ES module.
export default defineConfig([
  // ---- Library (ESM + CJS) ----
  {
    entry: "./index.ts",
    format: ["esm", "cjs"],
    outDir: "dist",
    target: "es2022",
    dts: false,
    platform: "neutral",
    deps: {
      neverBundle: ["omega-pac", "omega-target", "omega-web", "heap-js"],
    },
    sourcemap: false,
    clean: true,
    onSuccess: "eslint src/ --no-cache",
  },

  // ---- Browser ESM bundle ----
  {
    entry: "./index.ts",
    format: "esm",
    outDir: "build/js",
    target: "es2022",
    platform: "browser",
    minify: false,
    sourcemap: true,
    deps: {
      alwaysBundle: ["omega-pac", "omega-target", "heap-js"],
    },
    // Redirect Node.js built-ins to browser-compatible shims
    alias: {
      url: path.resolve(__dirname, "src/shim/url.ts"),
      querystring: path.resolve(__dirname, "src/shim/querystring.ts"),
      buffer: path.resolve(__dirname, "src/shim/buffer.ts"),
    },
    outputOptions: {
      entryFileNames: "modules.mjs",
      exports: "named",
    },
    dts: false,
    // Don't clean — build/js is populated by build-extension.js
    clean: false,
  },
]);
