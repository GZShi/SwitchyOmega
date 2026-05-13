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
// 2. Browser IIFE bundle (`build/js/omega_target_chromium_extension.min.js`)
//    used by the Chromium extension via a <script> tag. Bundles all dependencies
//    so the output has zero `require()` calls and runs standalone.
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

  // ---- Browser IIFE bundle ----
  {
    entry: "./index.ts",
    format: "iife",
    globalName: "OmegaTargetChromium",
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
      entryFileNames: "omega_target_chromium_extension.min.js",
    },
    dts: false,
    // Don't clean — build/js is populated by build-extension.js
    clean: false,
  },
]);
