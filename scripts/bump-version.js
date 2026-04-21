#!/usr/bin/env node
// 패치 버전 자동 증가: 1.5.0 → 1.5.1
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);
pkg.version = `${major}.${minor}.${patch + 1}`;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`버전 업: ${major}.${minor}.${patch} → ${pkg.version}`);
