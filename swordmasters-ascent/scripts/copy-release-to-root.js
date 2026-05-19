#!/usr/bin/env node
// Copy the latest portable exe to the outer Codex project folder for easy access.
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outerRoot = path.resolve(projectRoot, '..');
const releaseDir = path.join(outerRoot, 'release');
const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

const exeName = `TOS_v${pkg.version}.exe`;
const source = path.join(releaseDir, exeName);
const target = path.join(outerRoot, exeName);

if (!fs.existsSync(source)) {
  throw new Error(`[copy-release-to-root] 빌드 산출물을 찾을 수 없습니다: ${source}`);
}

for (const file of fs.readdirSync(outerRoot)) {
  if (/^(TOS_v.*\.exe|SwordMastersAscent_v.*_portable\.exe)$/i.test(file)) {
    fs.rmSync(path.join(outerRoot, file), { force: true });
  }
}

fs.copyFileSync(source, target);
console.log(`[copy-release-to-root] 최신 실행파일 복사 완료: ${target}`);
