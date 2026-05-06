#!/usr/bin/env node
// Creates release.zip for Firefox WebExtension.
// Uses tmp/manifest.json (Firefox-compatible, no 'downloads' permission)
// with all other files from build/.

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'build');
const outputFile = path.join(root, 'release.zip');

const output = fs.createWriteStream(outputFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`release.zip created (${archive.pointer()} bytes)`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Add all files from build/ except manifest.json
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

addDir(buildDir, '');

// Remove the build manifest (if exists)
// and add the Firefox-compatible manifest from tmp/
const tmpManifest = path.join(root, 'tmp', 'manifest.json');
if (fs.existsSync(tmpManifest)) {
  archive.file(tmpManifest, { name: 'manifest.json' });
  console.log('Using Firefox-compatible manifest.json');
}

archive.finalize();
