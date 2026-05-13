#!/usr/bin/env node
// Creates release.zip for Chrome WebExtension.
// Packages the build/ directory.

const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const root = path.join(__dirname, "..");
const buildDir = path.join(root, "build");
const outputFile = path.join(root, "release.zip");

const output = fs.createWriteStream(outputFile);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(`release.zip created (${archive.pointer()} bytes)`);
});

archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);

const addDir = (dir, prefix) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const archivePath = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      addDir(fullPath, archivePath);
    } else if (entry.isFile()) {
      archive.file(fullPath, { name: archivePath });
    }
  }
};

addDir(buildDir, "");

archive.finalize();
