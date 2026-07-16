const TONE_CLASS = Object.freeze({
  windup: 'border-blue-500/40 bg-blue-950/35 text-blue-200',
  hit: 'border-yellow-500/45 bg-yellow-950/35 text-yellow-200',
  dodge: 'border-cyan-500/45 bg-cyan-950/35 text-cyan-200',
  miss: 'border-orange-500/45 bg-orange-950/35 text-orange-200',
  damage: 'border-red-500/45 bg-red-950/35 text-red-200',
  guard: 'border-slate-500/40 bg-slate-950/35 text-slate-200',
  growth: 'border-emerald-400/45 bg-emerald-950/35 text-emerald-200',
});

const VISUAL_PROFILES = Object.freeze({
  windup: { priority: 'center-read', screenAnchor: 'center', effect: 'stance-pulse', durationMs: 520, scale: 1 },
  hit: { priority: 'center-impact', screenAnchor: 'center', effect: 'slash-flash', durationMs: 640, scale: 1.14 },
  critical: { priority: 'center-impact', screenAnchor: 'center', effect: 'slash-flash', durationMs: 640, scale: 1.34 },
  dodge: { priority: 'center-evade', screenAnchor: 'center', effect: 'afterimage-step', durationMs: 560, scale: 1.08 },
  miss: { priority: 'center-miss', screenAnchor: 'center', effect: 'empty-row-spark', durationMs: 520, scale: 0.96 },
  damage: { priority: 'log-response', screenAnchor: 'log', effect: 'red-chip', durationMs: 480, scale: 1 },
  guard: { priority: 'log-response', screenAnchor: 'log', effect: 'guard-pulse', durationMs: 460, scale: 0.96 },
  growth: { priority: 'center-growth', screenAnchor: 'center', effect: 'aura-rise', durationMs: 760, scale: 1.22 },
});

function cue(id, label, detail, tone, visual = tone) {
  return {
    id,
    label,
    detail,
    tone,
    className: TONE_CLASS[tone] || TONE_CLASS.guard,
    ...(VISUAL_PROFILES[visual] || VISUAL_PROFILES.guard),
  };
}

function hasRangeMiss(result) {
  const message = String(result?.message ?? '').toLowerCase();
  return message.includes('range') || message.includes('사정거리');
}

function getAttackMissDetail(result) {
  if (result?.playerRowMiss) return 'Your attack crossed an empty row after the row shift.';
  if (hasRangeMiss(result)) return 'Attack fell short outside weapon range.';
  return 'Attack was countered or missed the opening.';
}

function getDodgeDetail(result) {
  if (result?.enemyRowMiss) return 'Row shift beat the enemy line before impact.';
  return 'You avoided the incoming hit.';
}

function getGrowthDetail(growth) {
  const stat = growth?.stat || 'Sword mastery';
  const amount = Number.isFinite(growth?.amount) ? growth.amount : 1;
  return `${stat} rises +${amount}.`;
}

function getCombatFeedbackCues(result, rolling = false) {
  if (rolling) {
    return [cue('windup', 'Windup', 'Read the enemy stance before dice settle.', 'windup')];
  }

  const cues = [];
  if (result?.damageDealt > 0) {
    cues.push(cue(
      'hit-result',
      result.isCritical ? 'Critical hit' : 'Hit result',
      `Enemy takes ${result.damageDealt} damage.`,
      'hit',
      result.isCritical || result.quality === 'critical' ? 'critical' : 'hit',
    ));
  }

  const playerAttackMiss = result?.playerRowMiss || hasRangeMiss(result) || (result?.quality === 'miss' && !result?.enemyRowMiss);
  if (playerAttackMiss) {
    cues.push(cue('attack-miss', 'Attack missed', getAttackMissDetail(result), 'miss'));
  }

  if (result?.enemyRowMiss) {
    cues.push(cue('dodge-success', 'Dodge success', getDodgeDetail(result), 'dodge'));
  }

  if (result?.growth) {
    cues.push(cue('growth-result', 'Growth pulse', getGrowthDetail(result.growth), 'growth'));
  }

  if (result?.damageTaken > 0) {
    cues.push(cue(
      'damage-response',
      'Damage response',
      `Player takes ${result.damageTaken} damage.`,
      'damage',
    ));
  }

  if (cues.length === 0) {
    cues.push(cue('guard-read', 'Guard read', 'No damage. Reposition or counter next beat.', 'guard'));
  }

  return cues;
}

module.exports = { getCombatFeedbackCues, TONE_CLASS, VISUAL_PROFILES };
