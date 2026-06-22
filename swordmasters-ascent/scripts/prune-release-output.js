#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { getPortableExeName } = require('./release-names');

const projectRoot = path.resolve(__dirname, '..');
const outerRoot = path.resolve(projectRoot, '..');
const releaseDir = path.join(outerRoot, 'release');
const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const keep = getPortableExeName(pkg.version);

for (const file of fs.readdirSync(releaseDir)) {
  if (file !== keep) {
    fs.rmSync(path.join(releaseDir, file), { recursive: true, force: true });
  }
}

console.log(`[prune-release-output] release folder contains only: ${keep}`);
