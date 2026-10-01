const test = require('node:test');
const assert = require('node:assert/strict');
const { getMomentumReward } = require('../src/lib/momentumRules.cjs');

const decisivePerfect = {
  quality: 'perfect',
  speedContest: { playerTotal: 10, enemyTotal: 5 },
  strengthContest: { playerTotal: 7, enemyTotal: 6 },
};

test('decisive perfect response grants a random next-turn reward', () => {
  assert.equal(getMomentumReward(decisivePerfect, 0.1), 'dice');
  assert.equal(getMomentumReward(decisivePerfect, 0.9), 'extra-action');
});

test('small margins and non-advantageous actions grant no reward', () => {
  assert.equal(getMomentumReward({ ...decisivePerfect, quality: 'partial' }, 0.1), null);
  assert.equal(getMomentumReward({
    quality: 'perfect',
    speedContest: { playerTotal: 7, enemyTotal: 5 },
    strengthContest: { playerTotal: 6, enemyTotal: 4 },
  }, 0.1), null);
});
