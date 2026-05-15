#!/usr/bin/env node
// Prepares the extension build/ directory for UI HMR development.
// Generates thin HTML wrappers that load JS from the Vite dev server,
// and a dev manifest with relaxed CSP. Does NOT touch production build logic.
//
// Reuses: background TS compilation (same as build-extension.js),
//        locale building (same as build-locales.js),
//        lib copying (same as copy-libs.js in omega-web).

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const buildDir = path.join(root, "build");
const omegaWebDir = path.join(root, "..", "omega-web");
const overlayDir = path.join(root, "overlay");

const VITE_DEV_URL = "http://localhost:5173";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function mkdir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`  WARN: source not found: ${src}`);
    return;
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      mkdir(destPath);
      copyDir(srcPath, destPath);
    } else {
      mkdir(path.dirname(destPath));
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`  WARN: source not found: ${src}`);
    return;
  }
  mkdir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

// ---------------------------------------------------------------------------
// Step 1: Clean + create build/
// ---------------------------------------------------------------------------
console.log("=== Step 1: Prepare build directory ===");
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
}
mkdir(buildDir);

// ---------------------------------------------------------------------------
// Step 2: Compile TypeScript background scripts
// ---------------------------------------------------------------------------
console.log("=== Step 2: Compile background TypeScript ===");
const backgroundDir = path.join(root, "src", "background");
const backgroundFiles = fs
  .readdirSync(backgroundDir)
  .filter((f) => f.endsWith(".ts"));
for (const file of backgroundFiles) {
  const src = path.join(backgroundDir, file);
  const outDir =
    file === "sw.ts" ? buildDir : path.join(buildDir, "js", "background");
  try {
    execSync(
      `"${path.join(root, "node_modules", ".bin", "tsc")}" --target ES2022 --module esnext --skipLibCheck --outDir "${outDir}" "${src}"`,
      { cwd: root, stdio: "pipe" },
    );
    console.log(`  ${file} → compiled`);
  } catch (_e) {
    // Ignore type errors; JS is still emitted.
    console.log(`  ${file} → compiled (with warnings)`);
  }
}

// ---------------------------------------------------------------------------
// Step 3: Bundle modules.mjs via tsdown (browser ESM bundle for SW)
// ---------------------------------------------------------------------------
console.log("=== Step 3: Bundle modules.mjs (tsdown) ===");
try {
  execSync(
    `"${path.join(root, "node_modules", ".bin", "tsdown")}" --config tsdown.config.ts`,
    {
      cwd: root,
      stdio: "inherit",
    },
  );
  console.log("  modules.mjs bundled");
} catch (e) {
  console.error("  ERROR: tsdown bundle failed");
  console.error(e.message);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Step 4: Generate dev manifest.json
// ---------------------------------------------------------------------------
console.log("=== Step 4: Generate dev manifest.json ===");
const manifestSrc = path.join(overlayDir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestSrc, "utf-8"));

manifest.content_security_policy = {
  extension_pages: `script-src 'self' ${VITE_DEV_URL}; object-src 'self'`,
};

// Add a visual marker so dev mode is obvious
manifest.name = "[DEV] " + manifest.name;

fs.writeFileSync(
  path.join(buildDir, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);
console.log("  manifest.json written with dev CSP");

// ---------------------------------------------------------------------------
// Step 5: Generate thin HTML wrappers
// ---------------------------------------------------------------------------
console.log("=== Step 5: Generate HTML wrappers ===");

const popupHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SwitchyOmega</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <link rel="stylesheet" href="/lib/bootstrap/css/bootstrap.min.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="${VITE_DEV_URL}/src/popup/main.ts"></script>
</body>
</html>
`;

const optionsHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SwitchyOmega</title>
  <link rel="stylesheet" href="/lib/bootstrap/css/bootstrap.min.css">
  <link rel="stylesheet" href="/lib/spectrum/spectrum.css">
  <link rel="stylesheet" href="/lib/shepherd.js/shepherd.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="${VITE_DEV_URL}/src/options/main.ts"></script>
</body>
</html>
`;

mkdir(path.join(buildDir, "popup"));
fs.writeFileSync(path.join(buildDir, "popup", "index.html"), popupHtml);
mkdir(path.join(buildDir, "options"));
fs.writeFileSync(path.join(buildDir, "options", "index.html"), optionsHtml);
console.log("  popup/index.html → loads from Vite dev server");
console.log("  options/index.html → loads from Vite dev server");

// ---------------------------------------------------------------------------
// Step 6: Copy lib/ vendor files from node_modules
// ---------------------------------------------------------------------------
console.log("=== Step 6: Copy vendor libraries ===");
const nodeModules = path.join(omegaWebDir, "node_modules");
const libDest = path.join(buildDir, "lib");

// bootstrap
const bootstrapSrc = path.join(nodeModules, "bootstrap", "dist");
if (fs.existsSync(bootstrapSrc)) {
  mkdir(path.join(libDest, "bootstrap", "css"));
  mkdir(path.join(libDest, "bootstrap", "fonts"));
  copyFile(
    path.join(bootstrapSrc, "css", "bootstrap.min.css"),
    path.join(libDest, "bootstrap", "css", "bootstrap.min.css"),
  );
  const fontsDir = path.join(bootstrapSrc, "fonts");
  if (fs.existsSync(fontsDir)) {
    for (const f of fs.readdirSync(fontsDir)) {
      copyFile(
        path.join(fontsDir, f),
        path.join(libDest, "bootstrap", "fonts", f),
      );
    }
  }
  console.log("  bootstrap → lib/bootstrap/");
}

// spectrum-colorpicker
const spectrumSrc = path.join(nodeModules, "spectrum-colorpicker");
if (fs.existsSync(spectrumSrc)) {
  copyFile(
    path.join(spectrumSrc, "spectrum.js"),
    path.join(libDest, "spectrum", "spectrum.js"),
  );
  copyFile(
    path.join(spectrumSrc, "spectrum.css"),
    path.join(libDest, "spectrum", "spectrum.css"),
  );
  console.log("  spectrum-colorpicker → lib/spectrum/");
}

// shepherd.js
const shepherdSrc = path.join(nodeModules, "shepherd.js");
if (fs.existsSync(shepherdSrc)) {
  copyFile(
    path.join(shepherdSrc, "dist", "js", "shepherd.mjs"),
    path.join(libDest, "shepherd.js", "shepherd.mjs"),
  );
  copyFile(
    path.join(shepherdSrc, "dist", "css", "shepherd.css"),
    path.join(libDest, "shepherd.js", "shepherd.css"),
  );
  console.log("  shepherd.js → lib/shepherd.js/");
}

// ---------------------------------------------------------------------------
// Step 7: Copy img/ from omega-web
// ---------------------------------------------------------------------------
console.log("=== Step 7: Copy images ===");
const imgSrc = path.join(omegaWebDir, "img");
if (fs.existsSync(imgSrc)) {
  copyDir(imgSrc, path.join(buildDir, "img"));
  console.log("  img/ copied");
} else {
  console.log("  img/ not found, skipping");
}

// ---------------------------------------------------------------------------
// Step 8: Build locales
// ---------------------------------------------------------------------------
console.log("=== Step 8: Build locale files ===");
require("./build-locales");

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------
console.log("");
console.log("=== Dev extension ready! ===");
console.log(`Build directory: ${buildDir}`);
console.log("");
console.log("Next steps:");
console.log(`  1. Start Vite dev server:  cd omega-web && pnpm dev`);
console.log(
  `  2. Load extension: chrome://extensions → "Load unpacked" → ${buildDir}`,
);
console.log(`  3. Open popup or options page — HMR is active!`);
