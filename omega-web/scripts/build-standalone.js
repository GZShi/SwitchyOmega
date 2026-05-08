#!/usr/bin/env node
// Compile standalone scripts with tsc. These scripts are loaded as regular
// <script> tags (not ES modules), so we compile them to plain IIFE format.
// Type errors are ignored since these scripts use browser/Chrome globals.
// tsc still emits valid JS output even with type errors.

const { execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "build", "js");
const tscBin = path.join(root, "node_modules", ".bin", "tsc");

const scripts = [
  "src/omega_target_web.ts",
];

for (const script of scripts) {
  const src = path.join(root, script);
  try {
    execSync(
      `"${tscBin}" --target ES5 --module none --lib es2015,dom --skipLibCheck --outDir "${outDir}" "${src}"`,
      { cwd: root, stdio: "pipe" },
    );
  } catch (_e) {
    // Ignore type errors; the JS file is still written.
  }
  console.log(`Compiled ${script} → js/${path.basename(script, ".ts")}.js`);
}

console.log("Standalone scripts compiled.");
