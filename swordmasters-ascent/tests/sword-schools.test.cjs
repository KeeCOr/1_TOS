const test = require('node:test');
const assert = require('node:assert/strict');
const schools = require('../src/lib/swordSchools.json');

test('sword school list exposes five selectable schools', () => {
  assert.equal(schools.length, 5);
  assert.deepEqual(schools.map(s => s.id), ['default', 'assassin', 'magic_start', 'arcane', 'tank']);
});

test('each sword school has player-facing selection copy', () => {
  for (const school of schools) {
    assert.equal(typeof school.name, 'string');
    assert.ok(school.name.length >= 2);
    assert.match(school.description, /검|마법|방어|투척|균형/);
    assert.ok(school.bonusSummary.length > 0);
    assert.ok(school.legacyName.length > 0);
  }
});

test('school ids remain unique for save compatibility', () => {
  assert.equal(new Set(schools.map(s => s.id)).size, schools.length);
});
