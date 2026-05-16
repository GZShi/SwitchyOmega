#!/usr/bin/env node
// Copies vendor libraries from node_modules to build/lib/.
// Keeps spectrum-colorpicker and shepherd.js (Bootstrap replaced by Naive UI).

const fs = require("fs");
const path = require("path");

const nodeModules = path.join(__dirname, "..", "node_modules");
const destDir = path.join(__dirname, "..", "build", "lib");
const imgDir = path.join(__dirname, "..", "img");
const imgDest = path.join(__dirname, "..", "build", "img");

function mkdir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
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
console.log("Copying vendor libraries...");

// Clean and recreate
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true });
  console.log("Cleaned build/lib/");
}

// --- spectrum-colorpicker ---
const spectrumSrc = path.join(nodeModules, "spectrum-colorpicker");
if (fs.existsSync(spectrumSrc)) {
  const spectrumDest = path.join(destDir, "spectrum");
  mkdir(spectrumDest);
  copyFile(
    path.join(spectrumSrc, "spectrum.js"),
    path.join(spectrumDest, "spectrum.js"),
  );
  copyFile(
    path.join(spectrumSrc, "spectrum.css"),
    path.join(spectrumDest, "spectrum.css"),
  );
  console.log("  spectrum-colorpicker → spectrum/");
}

// --- shepherd.js v15 ---
const shepherdSrc = path.join(nodeModules, "shepherd.js");
if (fs.existsSync(shepherdSrc)) {
  const shepherdDest = path.join(destDir, "shepherd.js");
  mkdir(shepherdDest);
  copyFile(
    path.join(shepherdSrc, "dist", "js", "shepherd.mjs"),
    path.join(shepherdDest, "shepherd.mjs"),
  );
  copyFile(
    path.join(shepherdSrc, "dist", "css", "shepherd.css"),
    path.join(shepherdDest, "shepherd.css"),
  );
  console.log("  shepherd.js → shepherd.js/");
}

// --- Copy img/ ---
if (fs.existsSync(imgDir)) {
  if (fs.existsSync(imgDest)) fs.rmSync(imgDest, { recursive: true });
  copyDir(imgDir, imgDest);
  console.log("Copied img/ directory.");
}

console.log("Done copying vendor libraries.");
