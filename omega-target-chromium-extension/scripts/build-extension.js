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
  } catch (_e) {
    // Ignore type errors; the JS file was written regardless.
  }
}

console.log("=== Step 2: Copy omega-web build ===");
copyDir(webBuildDir, buildDir);

console.log("=== Step 3: Copy overlay files (manifest, etc.) ===");
copyDir(path.join(root, "overlay"), buildDir);

console.log("=== Step 4: Copy docs (COPYING) ===");
copyFile(path.join(root, "..", "COPYING"), path.join(buildDir, "COPYING"));

console.log("=== Step 5: Build locale files (.po → Chrome messages.json) ===");
require("./build-locales");

console.log("=== Extension build complete! ===");
console.log(`Build directory: ${buildDir}`);
