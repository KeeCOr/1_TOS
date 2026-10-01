const DEFENSE_SUB_ACTIONS = ['세로 막기', '가로 막기'];
const GUARD_BLOCK_RATIO = 0.5;

function applyGuardReduction(incomingDamage) {
  if (incomingDamage <= 0) return 0;
  return Math.max(1, Math.ceil(incomingDamage * (1 - GUARD_BLOCK_RATIO)));
}

module.exports = { DEFENSE_SUB_ACTIONS, GUARD_BLOCK_RATIO, applyGuardReduction };
