function contestMargin(contest) {
  if (!contest) return 0;
  return Math.abs(contest.playerTotal - contest.enemyTotal);
}

function getMomentumReward(result, randomValue = Math.random()) {
  if (!result || result.quality !== 'perfect') return null;
  const margin = Math.max(contestMargin(result.speedContest), contestMargin(result.strengthContest));
  if (margin < 4) return null;
  return randomValue < 0.5 ? 'dice' : 'extra-action';
}

module.exports = { contestMargin, getMomentumReward };
