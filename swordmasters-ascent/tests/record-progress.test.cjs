const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');

const source = readFileSync(resolve(__dirname, '../src/components/SwordmastersAscent.tsx'), 'utf8');

test('battle HUD keeps current floor, personal best, and record gap visible', () => {
  assert.match(source, /현재 \{floor\}F/);
  assert.match(source, /최고 \{highScore > 0 \? `\$\{highScore\}F` : '-'\}/);
  assert.match(source, /기록까지 \$\{Math\.abs\(delta\)\}층/);
});

test('record progress has first-run, tied, and new-record states', () => {
  assert.match(source, /첫 기록 도전/);
  assert.match(source, /기록 동률/);
  assert.match(source, /신기록 \+\$\{delta\}층/);
});
