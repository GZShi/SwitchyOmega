#!/usr/bin/env node
// Copies frontend vendor libraries from node_modules to build/lib/.
// Replaces Bower with npm as the source for all frontend dependencies.

const fs = require("fs");
const path = require("path");

const nodeModules = path.join(__dirname, "..", "node_modules");
const destDir = path.join(__dirname, "..", "build", "lib");
const imgDir = path.join(__dirname, "..", "img");
const imgDest = path.join(__dirname, "..", "build", "img");
const popupDir = path.join(__dirname, "..", "src", "popup");
const popupDest = path.join(__dirname, "..", "build", "popup");
const localLibDir = path.join(__dirname, "..", "lib");
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
  // Simple glob: supports * wildcard in filename part
  if (!fs.existsSync(srcDir)) return;
  const globName = path.basename(globPattern);
  if (globName === "*") {
    // Copy all files in directory
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        copyFile(path.join(srcDir, entry.name), path.join(destDir, entry.name));
      }
    }
  } else if (globName.includes("*")) {
    // Pattern matching
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

// Vendor library mappings: [npm_package, src_path, dest_name]
// src_path is relative to node_modules/<npm_package>/
// dest_name is the directory name under build/lib/
const vendorMappings = [
  // AngularJS core
  ["angular", "", "angular"],
  ["angular-animate", "", "angular-animate"],
  ["angular-loader", "", "angular-loader"],
  ["angular-sanitize", "", "angular-sanitize"],

  // AngularJS i18n - locale files
  {
    src: path.join(nodeModules, "angular-i18n"),
    dest: path.join(destDir, "angular-i18n"),
    files: [
      "angular-locale_en-us.js",
      "angular-locale_zh-cn.js",
      "angular-locale_zh-hk.js",
      "angular-locale_zh-tw.js",
    ],
  },

  // AngularJS UI components
  ["angular-ui-bootstrap", "", "angular-bootstrap"],
  ["angular-ui-router", "release", "angular-ui-router"],
  ["angular-ui-sortable", "dist", "angular-ui-sortable"],
  ["angular-spectrum-colorpicker", "dist", "angular-spectrum-colorpicker"],
  ["angular-ladda", "dist", "angular-ladda"],

  // Bootstrap 3
  {
    src: path.join(nodeModules, "bootstrap", "dist"),
    dest: path.join(destDir, "bootstrap"),
    copyDir: true,
    subdirs: { css: "css", fonts: "fonts", js: "js" },
  },

  // Other libs
  ["scriptjs", "dist", "script.js"],
  ["ngprogress", "build", "ngprogress"],
  ["jsondiffpatch", "public/build", "jsondiffpatch"],
  ["shepherd.js", "", "shepherd.js"],
  ["spectrum-colorpicker", "", "spectrum"],
  ["file-saver", "", "FileSaver"],
  ["ladda", "dist", "ladda"],
  ["jquery-ui-touch-punch", "", "jqueryui-touch-punch"],
];

// Version-specific overrides
const jqueryDest = path.join(destDir, "jquery");
const jqueryUiTouchPunchDest = path.join(destDir, "jquery-ui-1.10.4.custom");

console.log("Copying vendor libraries...");

// Clean and recreate
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true });
  console.log("Cleaned build/lib/");
}

for (const mapping of vendorMappings) {
  if (Array.isArray(mapping)) {
    const [npmPkg, srcPath, destName] = mapping;
    const source = srcPath
      ? path.join(nodeModules, npmPkg, srcPath)
      : path.join(nodeModules, npmPkg);
    const destination = path.join(destDir, destName);

    if (!fs.existsSync(source)) {
      console.warn(`  SKIP ${npmPkg}: not found at ${source}`);
      continue;
    }

    if (fs.statSync(source).isDirectory()) {
      mkdir(destination);
      copyDir(source, destination);
    } else {
      mkdir(path.dirname(destination));
      copyFile(source, path.join(destDir, destName, path.basename(source)));
    }
    console.log(`  ${npmPkg} → ${destName}`);
  } else if (mapping.files) {
    // Specific file list
    mkdir(mapping.dest);
    for (const file of mapping.files) {
      copyFile(path.join(mapping.src, file), path.join(mapping.dest, file));
    }
    console.log(`  files → ${path.basename(mapping.dest)}`);
  } else if (mapping.copyDir) {
    // Copy full directory (optionally only selected subdirs)
    if (!fs.existsSync(mapping.src)) {
      console.warn(
        `  SKIP ${mapping.dest}: source not found at ${mapping.src}`,
      );
      continue;
    }
    mkdir(mapping.dest);
    if (mapping.subdirs) {
      for (const [srcSub, destSub] of Object.entries(mapping.subdirs)) {
        const subSrc = path.join(mapping.src, srcSub);
        const subDest = path.join(mapping.dest, destSub);
        if (!fs.existsSync(subSrc)) continue;
        mkdir(subDest);
        copyDir(subSrc, subDest);
      }
    } else {
      copyDir(mapping.src, mapping.dest);
    }
    console.log(
      `  ${path.basename(mapping.src)} → ${path.basename(mapping.dest)}`,
    );
  }
}

// Special handling: jQuery
const jquerySrc = path.join(nodeModules, "jquery", "dist", "jquery.min.js");
mkdir(jqueryDest);
copyFile(jquerySrc, path.join(jqueryDest, "jquery.min.js"));
console.log("  jquery → jquery/jquery.min.js");

// Special handling: jQuery UI (copy from node_modules)
const jquiBase = path.join(nodeModules, "jquery-ui", "dist");
if (fs.existsSync(jquiBase)) {
  mkdir(jqueryUiTouchPunchDest);
  copyFile(
    path.join(jquiBase, "jquery-ui.min.js"),
    path.join(jqueryUiTouchPunchDest, "jquery-ui-1.10.4.custom.min.js"),
  );
  console.log("  jquery-ui → jquery-ui-1.10.4.custom/");
}

// Special handling: jquery-ui-touch-punch
const touchPunchSrc = path.join(nodeModules, "jquery-ui-touch-punch");
if (fs.existsSync(touchPunchSrc)) {
  mkdir(path.join(destDir, "jqueryui-touch-punch"));
  copyGlob(
    touchPunchSrc,
    "jquery.ui.touch-punch.min.js",
    path.join(destDir, "jqueryui-touch-punch"),
  );
  console.log("  jquery-ui-touch-punch");
}

// Special handling: spectrum (needs both spectrum.js and spectrum.css)
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

// Special handling: shepherd.js
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

// Special handling: bootstrap dropdown JS
const bsJsDest = path.join(destDir, "bootstrap", "js");
mkdir(bsJsDest);
const bsDropdownSrc = path.join(nodeModules, "bootstrap", "js", "dropdown.js");
if (fs.existsSync(bsDropdownSrc)) {
  copyFile(bsDropdownSrc, path.join(bsJsDest, "dropdown.js"));
  console.log("  bootstrap dropdown.js");
}

// Special handling: spin.js (bundled inside ladda/dist; loaded by options.coffee
// as lib/spin.js/spin.js, required by ladda to render spinners).
const spinSrc = path.join(nodeModules, "ladda", "dist", "spin.min.js");
if (fs.existsSync(spinSrc)) {
  const spinDest = path.join(destDir, "spin.js");
  mkdir(spinDest);
  copyFile(spinSrc, path.join(spinDest, "spin.js"));
  console.log("  spin.js (from ladda/dist/spin.min.js)");
}

// Special handling: lib/blob/Blob.js shim.
// The legacy code uses `new Blob(...)` (native API) and only references
// lib/blob/Blob.js to satisfy a $script('blob') dependency marker.
// Modern browsers ship Blob natively, so we emit an empty file that resolves
// the loader without shadowing the global constructor.
const blobDest = path.join(destDir, "blob");
mkdir(blobDest);
fs.writeFileSync(
  path.join(blobDest, "Blob.js"),
  "// Intentionally empty: Blob is provided natively by the browser.\n",
);
console.log("  blob/Blob.js (native shim)");

// Special handling: angular-ui-utils (npm package has no pre-built min files)
const uiUtilsSrc = path.join(nodeModules, "angular-ui-utils", "modules");
if (fs.existsSync(uiUtilsSrc)) {
  const uiUtilsDest = path.join(destDir, "angular-ui-utils");
  mkdir(uiUtilsDest);
  copyFile(
    path.join(uiUtilsSrc, "validate", "validate.js"),
    path.join(uiUtilsDest, "validate.min.js"),
  );
  console.log("  angular-ui-utils validate");
}

// Copy local lib/ files (jquery-ui custom, spin.js, etc.)
if (fs.existsSync(localLibDir)) {
  copyDir(localLibDir, destDir);
  console.log("Copied local lib/ files.");
}

// Copy img/
if (fs.existsSync(imgDir)) {
  if (fs.existsSync(imgDest)) fs.rmSync(imgDest, { recursive: true });
  copyDir(imgDir, imgDest);
  console.log("Copied img/ directory.");
}

// Copy popup/ static files
if (fs.existsSync(popupDir)) {
  if (fs.existsSync(popupDest)) fs.rmSync(popupDest, { recursive: true });
  copyDir(popupDir, popupDest);
  console.log("Copied popup/ directory.");
}

// Copy omega_pac.min.js from workspace
if (fs.existsSync(pacBundle)) {
  copyFile(pacBundle, pacDest);
  console.log("Copied omega_pac.min.js");
}

console.log("Done copying vendor libraries.");
