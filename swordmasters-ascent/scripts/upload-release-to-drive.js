#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const {
  getPortableExeName,
  getDrivePortableExeName,
  isManagedPortableArtifact,
} = require('./release-names');

const projectRoot = path.resolve(__dirname, '..');
const outerRoot = path.resolve(projectRoot, '..');
const driveDir = 'G:\\내 드라이브\\실행파일';
const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

const source = path.join(outerRoot, getPortableExeName(pkg.version));
const target = path.join(driveDir, getDrivePortableExeName(pkg.version));

if (!fs.existsSync(source)) {
  throw new Error(`[upload-release-to-drive] source executable not found: ${source}`);
}

if (!fs.existsSync(driveDir)) {
  throw new Error(`[upload-release-to-drive] Google Drive folder not found: ${driveDir}`);
}

for (const file of fs.readdirSync(driveDir)) {
  if (isManagedPortableArtifact(file)) {
    fs.rmSync(path.join(driveDir, file), { force: true });
  }
}

fs.copyFileSync(source, target);
console.log(`[upload-release-to-drive] copied executable: ${target}`);
