#!/usr/bin/env node
// Moves Vite HTML output from build/src/* to build/* to match the output
// structure expected by build-extension.js.
//
// Vite preserves source paths relative to root, so src/options/index.html
// becomes build/src/options/index.html. This script flattens them per
// the expected extension layout:
//   build/options/index.html (from build/src/options/index.html)
//   build/popup/index.html  (from build/src/popup/index.html)

const fs = require("fs");
const path = require("path");

const buildDir = path.join(__dirname, "..", "build");
const srcBuildDir = path.join(buildDir, "src");

if (!fs.existsSync(srcBuildDir)) {
  process.exit(0);
}

function mkdir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// Collect all HTML files under build/src/
function collectHtml(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectHtml(fullPath, files);
    } else if (entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }
  return files;
}

const htmlFiles = collectHtml(srcBuildDir);

for (const srcPath of htmlFiles) {
  // e.g., build/src/options/index.html → options/index.html
  //       build/src/popup/index.html  → popup/index.html
  let relPath = path.relative(srcBuildDir, srcPath);
  const destPath = path.join(buildDir, relPath);
  mkdir(path.dirname(destPath));
  fs.renameSync(srcPath, destPath);
}

// Remove src/ if empty
const remaining = fs.readdirSync(srcBuildDir);
if (remaining.length === 0) {
  fs.rmdirSync(srcBuildDir);
} else {
  // Try to clean nested empty dirs
  function removeEmptyDirs(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDir = path.join(dir, entry.name);
        removeEmptyDirs(subDir);
        const after = fs.readdirSync(subDir);
        if (after.length === 0) {
          fs.rmdirSync(subDir);
        }
      }
    }
  }
  removeEmptyDirs(srcBuildDir);
  const afterClean = fs.readdirSync(srcBuildDir);
  if (afterClean.length === 0) {
    fs.rmdirSync(srcBuildDir);
  }
}

console.log("Moved HTML output files to build/");
