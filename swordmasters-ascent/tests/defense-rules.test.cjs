const test = require('node:test');
const assert = require('node:assert/strict');

const { DEFENSE_SUB_ACTIONS, GUARD_BLOCK_RATIO, applyGuardReduction } = require('../src/lib/defenseRules.cjs');

test('defense exposes only vertical and horizontal guards', () => {
  assert.deepEqual(DEFENSE_SUB_ACTIONS, ['세로 막기', '가로 막기']);
});

test('both guards block half of incoming attack damage', () => {
  assert.equal(GUARD_BLOCK_RATIO, 0.5);
  for (const guard of DEFENSE_SUB_ACTIONS) {
    assert.ok(guard.endsWith('막기'));
    assert.equal(applyGuardReduction(20), 10);
    assert.equal(applyGuardReduction(21), 11);
  }
});
