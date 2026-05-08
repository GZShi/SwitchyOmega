#!/usr/bin/env node
// Copies vendor libraries from node_modules to build/lib/.
// Phase A: Removed AngularJS/jQuery/ngprogress/ladda/script.js.
// Keeps Bootstrap CSS, spectrum, shepherd.js, file-saver, jsondiffpatch.

const fs = require("fs");
const path = require("path");

const nodeModules = path.join(__dirname, "..", "node_modules");
const destDir = path.join(__dirname, "..", "build", "lib");
const imgDir = path.join(__dirname, "..", "img");
const imgDest = path.join(__dirname, "..", "build", "img");
const pacBundle = path.join(nodeModules, "omega-pac", "omega_pac.min.js");
const pacDest = path.join(__dirname, "..", "build", "js", "omega_pac.min.js");

function mkdir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
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
    console.warn(`  WARN: source not found: ${src}`);
    return;
  }
  mkdir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyGlob(srcDir, globPattern, destDir) {
  if (!fs.existsSync(srcDir)) return;
  const globName = path.basename(globPattern);
  if (globName === "*") {
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        copyFile(path.join(srcDir, entry.name), path.join(destDir, entry.name));
      }
    }
  } else if (globName.includes("*")) {
    const prefix = globName.replace(/\*.*$/, "");
    const suffix = globName.replace(/^.*\*/, "");
    const entries = fs.readdirSync(srcDir);
    for (const entry of entries) {
      if (entry.startsWith(prefix) && entry.endsWith(suffix)) {
        copyFile(path.join(srcDir, entry), path.join(destDir, entry));
      }
    }
  } else {
    copyFile(path.join(srcDir, globName), path.join(destDir, globName));
  }
}

console.log("Copying vendor libraries...");

// Clean and recreate
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true });
  console.log("Cleaned build/lib/");
}

// --- Bootstrap 3 (CSS + fonts only, JS not needed with Vue) ---
const bootstrapSrc = path.join(nodeModules, "bootstrap", "dist");
if (fs.existsSync(bootstrapSrc)) {
  mkdir(path.join(destDir, "bootstrap", "css"));
  mkdir(path.join(destDir, "bootstrap", "fonts"));
  copyFile(
    path.join(bootstrapSrc, "css", "bootstrap.min.css"),
    path.join(destDir, "bootstrap", "css", "bootstrap.min.css"),
  );
  // Copy font files
  const fontsDir = path.join(bootstrapSrc, "fonts");
  if (fs.existsSync(fontsDir)) {
    const fontEntries = fs.readdirSync(fontsDir);
    for (const f of fontEntries) {
      copyFile(
        path.join(fontsDir, f),
        path.join(destDir, "bootstrap", "fonts", f),
      );
    }
  }
  console.log("  bootstrap → bootstrap/");
}

// --- spectrum-colorpicker ---
const spectrumSrc = path.join(nodeModules, "spectrum-colorpicker");
if (fs.existsSync(spectrumSrc)) {
  const spectrumDest = path.join(destDir, "spectrum");
  mkdir(spectrumDest);
  copyFile(path.join(spectrumSrc, "spectrum.js"), path.join(spectrumDest, "spectrum.js"));
  copyFile(path.join(spectrumSrc, "spectrum.css"), path.join(spectrumDest, "spectrum.css"));
  console.log("  spectrum-colorpicker → spectrum/");
}

// --- shepherd.js ---
const shepherdSrc = path.join(nodeModules, "shepherd.js");
if (fs.existsSync(shepherdSrc)) {
  const shepherdDest = path.join(destDir, "shepherd.js");
  mkdir(shepherdDest);
  copyGlob(shepherdSrc, "shepherd.min.js", shepherdDest);
  const shepherdCssSrc = path.join(shepherdSrc, "css");
  if (fs.existsSync(shepherdCssSrc)) {
    copyFile(
      path.join(shepherdCssSrc, "shepherd-theme-arrows.css"),
      path.join(shepherdDest, "shepherd-theme-arrows.css"),
    );
  }
  console.log("  shepherd.js → shepherd.js/");
}

// --- file-saver ---
const fileSaverSrc = path.join(nodeModules, "file-saver");
if (fs.existsSync(fileSaverSrc)) {
  const fileSaverDest = path.join(destDir, "FileSaver");
  mkdir(fileSaverDest);
  copyFile(
    path.join(fileSaverSrc, "FileSaver.min.js"),
    path.join(fileSaverDest, "FileSaver.min.js"),
  );
  console.log("  file-saver → FileSaver/");
}

// --- jsondiffpatch ---
const jsondiffpatchSrc = path.join(nodeModules, "jsondiffpatch", "public", "build");
if (fs.existsSync(jsondiffpatchSrc)) {
  const jdpDest = path.join(destDir, "jsondiffpatch");
  mkdir(jdpDest);
  copyGlob(jsondiffpatchSrc, "jsondiffpatch.min.js", jdpDest);
  copyGlob(jsondiffpatchSrc, "jsondiffpatch-formatters.min.js", jdpDest);
  console.log("  jsondiffpatch → jsondiffpatch/");
}

// --- Copy img/ ---
if (fs.existsSync(imgDir)) {
  if (fs.existsSync(imgDest)) fs.rmSync(imgDest, { recursive: true });
  copyDir(imgDir, imgDest);
  console.log("Copied img/ directory.");
}

// --- Copy omega_pac.min.js from workspace ---
if (fs.existsSync(pacBundle)) {
  copyFile(pacBundle, pacDest);
  console.log("Copied omega_pac.min.js");
}

console.log("Done copying vendor libraries.");
