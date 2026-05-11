#!/usr/bin/env node
// Complete build script for omega-target-chromium-extension.
// Replaces: grunt coffee, grunt copy, grunt-po2crx, chromium-manifest tasks.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const buildDir = path.join(root, "build");
const webBuildDir = path.join(root, "..", "omega-web", "build");

function mkdir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Warning: source not found: ${src}`);
    return;
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
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
    console.warn(`Warning: source not found: ${src}`);
    return;
  }
  mkdir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

// Clean build directory
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
}
mkdir(buildDir);

console.log("=== Step 1: Compile TypeScript background scripts ===");
const coffeeDir = path.join(root, "src", "coffee");
const coffeeFiles = fs.readdirSync(coffeeDir).filter((f) => f.endsWith(".ts"));
for (const file of coffeeFiles) {
  const src = path.join(coffeeDir, file);
  // tsc may show type errors for standalone scripts using browser globals
  // but it still produces the output JS file.
  try {
    execSync(
      `"${path.join(root, "node_modules", ".bin", "tsc")}" --target ES5 --module none --skipLibCheck --outDir "${path.join(buildDir, "js")}" "${src}"`,
      { cwd: root, stdio: "pipe" },
    );
  } catch (_e) {
    // Ignore type errors; the JS file was written regardless.
  }
}

console.log("=== Step 2: Copy omega-web build ===");
copyDir(webBuildDir, buildDir);

console.log("=== Step 3: Copy omega_target.min.js ===");
const omegaTargetMin = path.join(
  root,
  "node_modules",
  "omega-target",
  "dist",
  "omega_target.min.js",
);
copyFile(omegaTargetMin, path.join(buildDir, "js", "omega_target.min.js"));

console.log("=== Step 4: Copy target popup JS ===");
copyFile(
  path.join(root, "src", "js", "omega_target_popup.js"),
  path.join(buildDir, "js", "omega_target_popup.js"),
);

console.log(
  "=== Step 5: Copy overlay files (manifest, background.html, etc.) ===",
);
copyDir(path.join(root, "overlay"), buildDir);

console.log("=== Step 6: Copy docs (COPYING, AUTHORS) ===");
copyFile(path.join(root, "..", "COPYING"), path.join(buildDir, "COPYING"));
copyFile(path.join(root, "..", "AUTHORS"), path.join(buildDir, "AUTHORS"));

console.log("=== Step 7: Build locale files (.po → Chrome messages.json) ===");
require("./build-locales");

console.log("=== Step 8: Generate Firefox manifest ===");
const manifest = require(path.join(root, "overlay", "manifest.json"));
manifest.permissions = manifest.permissions.filter((p) => p !== "downloads");
const tmpDir = path.join(root, "tmp");
mkdir(tmpDir);
fs.writeFileSync(
  path.join(tmpDir, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);
console.log("Firefox manifest written to tmp/manifest.json");

console.log("=== Extension build complete! ===");
console.log(`Build directory: ${buildDir}`);
