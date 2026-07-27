const test = require('node:test');
const assert = require('node:assert/strict');

const { getCombatFeedbackCues } = require('../src/lib/combatFeedback.cjs');

test('combat feedback exposes attack windup before dice resolve', () => {
  const cues = getCombatFeedbackCues(null, true);
  assert.equal(cues[0].id, 'windup');
  assert.match(cues[0].detail, /enemy stance/);
});

test('combat feedback separates hit result from generic outcome text', () => {
  const cues = getCombatFeedbackCues({ quality: 'partial', damageDealt: 18, damageTaken: 0, isCritical: false });
  assert.equal(cues.find(cue => cue.id === 'hit-result').label, 'Hit result');
  assert.match(cues.find(cue => cue.id === 'hit-result').detail, /18/);
});

test('combat feedback calls out dodge success for miss or row dodge', () => {
  const cues = getCombatFeedbackCues({ quality: 'miss', damageDealt: 0, damageTaken: 0, enemyRowMiss: true });
  assert.equal(cues.find(cue => cue.id === 'dodge-success').tone, 'dodge');
});

test('combat feedback separates player row attack misses from dodge success', () => {
  const cues = getCombatFeedbackCues({
    quality: 'miss',
    damageDealt: 0,
    damageTaken: 0,
    playerRowMiss: true,
    enemyRowMiss: false,
  });

  const missCue = cues.find(cue => cue.id === 'attack-miss');
  assert.equal(missCue.label, 'Attack missed');
  assert.match(missCue.detail, /empty row/i);
  assert.equal(cues.some(cue => cue.id === 'dodge-success'), false);
});

test('combat feedback explains range miss cause from the resolver message', () => {
  const cues = getCombatFeedbackCues({
    quality: 'miss',
    damageDealt: 0,
    damageTaken: 0,
    message: '⚠ 사정거리 밖! 공격 빗나감',
  });

  const missCue = cues.find(cue => cue.id === 'attack-miss');
  assert.equal(missCue.tone, 'miss');
  assert.match(missCue.className, /orange/);
  assert.match(missCue.detail, /range/i);
});

test('combat feedback describes enemy row miss as a player dodge', () => {
  const cues = getCombatFeedbackCues({
    quality: 'partial',
    damageDealt: 0,
    damageTaken: 0,
    playerRowMiss: false,
    enemyRowMiss: true,
  });

  const dodgeCue = cues.find(cue => cue.id === 'dodge-success');
  assert.equal(dodgeCue.label, 'Dodge success');
  assert.match(dodgeCue.detail, /row shift/i);
});
test('combat feedback separates player damage response', () => {
  const cues = getCombatFeedbackCues({ quality: 'partial', damageDealt: 0, damageTaken: 12, isCritical: false });
  assert.equal(cues.find(cue => cue.id === 'damage-response').label, 'Damage response');
  assert.match(cues.find(cue => cue.id === 'damage-response').detail, /12/);
});



test('combat feedback gives hit, dodge, and growth cues center-screen visual priority', () => {
  const hitCue = getCombatFeedbackCues({ quality: 'hit', damageDealt: 31, damageTaken: 0, isCritical: true })
    .find(cue => cue.id === 'hit-result');
  const dodgeCue = getCombatFeedbackCues({ quality: 'miss', damageDealt: 0, damageTaken: 0, enemyRowMiss: true })
    .find(cue => cue.id === 'dodge-success');
  const growthCue = getCombatFeedbackCues({ quality: 'growth', growth: { stat: 'Sword Aura', amount: 2 } })
    .find(cue => cue.id === 'growth-result');

  assert.equal(hitCue.priority, 'center-impact');
  assert.equal(hitCue.screenAnchor, 'center');
  assert.equal(hitCue.effect, 'slash-flash');
  assert.equal(dodgeCue.priority, 'center-evade');
  assert.equal(dodgeCue.effect, 'afterimage-step');
  assert.equal(growthCue.priority, 'center-growth');
  assert.equal(growthCue.effect, 'aura-rise');
});

test('combat feedback keeps visual strength stable for the same action type', () => {
  const lightHit = getCombatFeedbackCues({ quality: 'partial', damageDealt: 8, damageTaken: 0 })
    .find(cue => cue.id === 'hit-result');
  const heavyHit = getCombatFeedbackCues({ quality: 'critical', damageDealt: 88, damageTaken: 0, isCritical: true })
    .find(cue => cue.id === 'hit-result');

  assert.equal(lightHit.screenAnchor, heavyHit.screenAnchor);
  assert.equal(lightHit.effect, heavyHit.effect);
  assert.equal(lightHit.durationMs, heavyHit.durationMs);
  assert.ok(heavyHit.scale > lightHit.scale);
});

test('combat feedback orders center impact before log-style damage response', () => {
  const cues = getCombatFeedbackCues({ quality: 'partial', damageDealt: 20, damageTaken: 12 });
  assert.deepEqual(cues.map(cue => cue.id), ['hit-result', 'damage-response']);
  assert.equal(cues[0].priority, 'center-impact');
  assert.equal(cues[1].priority, 'log-response');
});
test('combat feedback assigns distinct sound cues to hit, dodge, and growth', () => {
  const hitCue = getCombatFeedbackCues({ quality: 'hit', damageDealt: 12, damageTaken: 0 })
    .find(cue => cue.id === 'hit-result');
  const dodgeCue = getCombatFeedbackCues({ quality: 'miss', damageDealt: 0, damageTaken: 0, enemyRowMiss: true })
    .find(cue => cue.id === 'dodge-success');
  const growthCue = getCombatFeedbackCues({ quality: 'growth', growth: { stat: 'Sword Aura', amount: 1 } })
    .find(cue => cue.id === 'growth-result');

  assert.equal(hitCue.soundCue, 'slash');
  assert.equal(dodgeCue.soundCue, 'whoosh');
  assert.equal(growthCue.soundCue, 'chime');
});
