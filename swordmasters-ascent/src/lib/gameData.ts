import swordSchools from './swordSchools.json';

// ============================================================
// GAME DATA
// ============================================================

export type ActionType   = '공격' | '이동' | '방어' | '마법 사용' | '아이템 사용';

// 행동별 사거리 (그리드 하이라이트 + UI 표시용)
export const MAGIC_RANGE      = 5; // 마법은 최대 사거리까지 사용 가능 (거리 보너스는 distanceBonus에 정의)
export const ITEM_THROW_RANGE = 4; // 투척 아이템 기본 사거리
export const MOVE_RANGE       = 1; // 이동은 1칸씩
// 공격 사거리는 Character.weaponRange (무기에 따라 다름)
// 방어는 사거리 무관

export function getActionRange(action: ActionType, weaponRange: number): number {
  if (action === '공격') return weaponRange;
  if (action === '마법 사용') return MAGIC_RANGE;
  if (action === '아이템 사용') return ITEM_THROW_RANGE;
  return 0; // 이동/방어는 사거리 개념 없음
}
export type GamePhase    = 'start' | 'tutorial' | 'naming' | 'stat_roll' | 'battle' | 'reward' | 'event' | 'gameover';
export type TitleId      = 'weapon_breaker' | 'tower_climber' | 'boss_slayer' | 'magic_adept' | 'survivor' | 'novice' | `combat_${string}` | `school_${string}`;
export type MatchQuality = 'perfect' | 'partial' | 'miss';
export type CombatStep   = 'select_main' | 'select_sub' | 'rolling' | 'result';
export type DiceMode     = 'highest' | 'sum';   // kept for legacy/internal use
export type Condition    = 'excellent' | 'good' | 'normal' | 'bad' | 'terrible';

export const CONDITION_LABELS: Record<Condition, string> = {
  excellent: '최상', good: '좋음', normal: '보통', bad: '나쁨', terrible: '최악',
};
export const CONDITION_COLORS: Record<Condition, string> = {
  excellent: 'text-yellow-300', good: 'text-green-400', normal: 'text-gray-400',
  bad: 'text-orange-400', terrible: 'text-red-500',
};
export function rollCondition(): Condition {
  const r = Math.random();
  if (r < 0.10) return 'excellent';
  if (r < 0.30) return 'good';
  if (r < 0.60) return 'normal';
  if (r < 0.82) return 'bad';
  return 'terrible';
}
export function getConditionMultiplier(c?: Condition): number {
  switch (c) {
    case 'excellent': return 1.10;
    case 'good':      return 1.05;
    case 'bad':       return 0.92; // 기존 0.85 → 완화
    case 'terrible':  return 0.82; // 기존 0.70 → 완화
    default:          return 1.00;
  }
}

// ── Sub-actions ──────────────────────────────────────────────
export type AttackSub = '세로 베기' | '가로 베기' | '찌르기' | '뒤로 베기';
export type DefendSub = '세로 막기' | '올려막기' | '가로 막기';
export type MoveSub   = '전진 압박' | '후퇴' | '위로 이동' | '아래로 이동';
export type ItemSub   = '치유 물약' | '단검 던지기' | '폭발 물약' | '강화 단검' | '대형 치유 물약';
export type MagicSpell = '화염 쇄도' | '암흑 속박' | '회복술' | '빙결 창' | '번개 일격' | '바람 쇄도';
export type SubAction = AttackSub | DefendSub | MoveSub | ItemSub | MagicSpell;

export const MAGIC_SPELL_POOL: MagicSpell[] = ['화염 쇄도', '암흑 속박', '회복술', '빙결 창', '번개 일격', '바람 쇄도'];
export const STARTING_ITEMS: Item[] = [
  { id:'healing_potion', name:'치유 물약', kind:'potion', description:'체력 25 회복', heal:25 },
  { id:'throwing_dagger', name:'단검 던지기', kind:'throwing', description:'원거리 단검 던지기', damage:12, range:4 },
];

export const SUB_ACTIONS: Record<ActionType, SubAction[]> = {
  '공격':     ['세로 베기', '가로 베기', '찌르기'],
  '방어':     ['세로 막기', '올려막기', '가로 막기'],
  '이동':     ['전진 압박', '후퇴', '위로 이동', '아래로 이동'],
  '마법 사용': [...MAGIC_SPELL_POOL],
  '아이템 사용': ['치유 물약', '단검 던지기'],
};

export const PERFECT_COUNTER: Record<SubAction, SubAction> = {
  '세로 베기':  '올려막기',   // 올려막기가 내리베기를 막아냄
  '가로 베기':  '세로 막기',  // 세로 막기가 횡단 베기를 막아냄
  '찌르기':     '가로 막기',  // 가로 막기가 찌르기를 흘려냄
  '세로 막기':  '세로 베기',  // 세로 베기가 수직 방어를 짓눌러 뚫음
  '올려막기':   '가로 베기',  // 가로 베기가 올려막기를 옆으로 꺾음
  '가로 막기':  '찌르기',     // 찌르기가 가로 막기를 뚫고 들어옴
  '전진 압박':  '위로 이동',
  '후퇴':       '전진 압박',
  '위로 이동':  '아래로 이동',
  '아래로 이동':'위로 이동',
  '화염 쇄도':  '위로 이동',
  '암흑 속박':  '가로 막기',
  '회복술':     '세로 베기',
  '빙결 창':     '후퇴',
  '치유 물약':  '전진 압박',
  '단검 던지기':'세로 막기',
  '폭발 물약':  '후퇴',
  '강화 단검':  '가로 막기',
  '대형 치유 물약': '전진 압박',
  '번개 일격':  '올려막기',
  '바람 쇄도':  '전진 압박',
  '뒤로 베기':  '전진 압박',
};

export const SUB_ACTION_INFO: Record<SubAction, { desc: string; counter: string; hint: string }> = {
  '세로 베기':  { desc: '묵직한 내리치기',   counter: '→ 올려막기', hint: '검을 머리 위로 높이 들어올렸다' },
  '가로 베기':  { desc: '옆으로 베기+경직',  counter: '→ 세로 막기', hint: '검을 옆으로 크게 벌리며 자세를 낮췄다' },
  '찌르기':     { desc: '빠른 찌르기',       counter: '→ 가로 막기', hint: '검 끝을 앞으로 겨냥하며 중심을 낮췄다' },
  '세로 막기':  { desc: '수직 방어',         counter: '→ 세로 베기', hint: '검을 수직으로 세워 정면을 가렸다' },
  '올려막기':   { desc: '위쪽으로 막기',     counter: '→ 가로 베기', hint: '검날을 비스듬히 들어올려 위를 막았다' },
  '가로 막기':  { desc: '가로로 막아내기',   counter: '→ 찌르기',   hint: '검을 가로로 뻗어 힘을 흘려보낸다' },
  '전진 압박':  { desc: '거리 -1 압박',      counter: '→ 위로 이동',hint: '발을 크게 내딛으며 앞으로 밀어붙였다' },
  '후퇴':       { desc: '거리 +1 후퇴',      counter: '→ 전진 압박',hint: '뒷발을 당기며 거리를 벌렸다' },
  '위로 이동':  { desc: '위 행으로 이동',    counter: '→ 아래로 이동', hint: '옆으로 크게 발을 옮기며 위치를 바꿨다' },
  '아래로 이동':{ desc: '아래 행으로 이동',  counter: '→ 위로 이동', hint: '낮게 자세를 잡으며 아래쪽으로 이동했다' },
  '화염 쇄도':  { desc: '화염 마법 공격',    counter: '→ 위로 이동',hint: '손바닥에 붉은 불꽃이 피어오르기 시작했다' },
  '암흑 속박':  { desc: '속박 마법',         counter: '→ 가로 막기', hint: '손끝에서 검은 연기가 소용돌이치기 시작했다' },
  '회복술':     { desc: '체력 회복',         counter: '→ 세로 베기', hint: '몸 주위에 희미한 빛이 감돌기 시작했다' },
  '빙결 창':    { desc: '얼음 창을 던진다',  counter: '→ 후퇴',     hint: '팔을 들어올리며 차가운 기운이 모였다' },
  '치유 물약':  { desc: '체력 회복 물약 사용', counter: '→ 전진 압박', hint: '허리춤에서 무언가를 꺼내 들었다' },
  '단검 던지기':{ desc: '원거리 단검 공격',  counter: '→ 세로 막기', hint: '작은 단검을 손에 쥐고 팔을 뒤로 당겼다' },
  '폭발 물약':  { desc: '폭발 피해 (방어 무시)', counter: '→ 후퇴', hint: '주머니에서 붉게 빛나는 구슬을 꺼내 들었다' },
  '강화 단검':  { desc: '강력한 단검 투척',   counter: '→ 가로 막기', hint: '무거운 단검을 손에 쥐고 조준했다' },
  '대형 치유 물약': { desc: '체력 50 대량 회복', counter: '→ 전진 압박', hint: '큼지막한 물약을 꺼내 뚜껑을 열었다' },
  '번개 일격':  { desc: '번개 마법 공격',     counter: '→ 올려막기', hint: '팔끝에서 파란 전기가 지직거리기 시작했다' },
  '바람 쇄도':  { desc: '바람 마법 공격',     counter: '→ 전진 압박', hint: '양손이 바람을 끌어모으며 소용돌이쳤다' },
  '뒤로 베기':  { desc: '후퇴하며 베기 + 적 밀어냄 (밀착 전용)', counter: '→ 전진 압박', hint: '물러서면서 검을 옆으로 긋는다' },
};

export const SUB_ACTION_DICE_MODIFIERS: Partial<Record<SubAction, { speed?: number; strength?: number }>> = {
  '세로 베기': { speed: -1, strength: 1 },
};

// ── Distance ─────────────────────────────────────────────────
export const DISTANCE_LABELS: Record<number, string> = {
  0: '동일 칸', 1: '밀착', 2: '근접', 3: '중거리', 4: '원거리', 5: '최원거리',
};
export const DISTANCE_COLORS: Record<number, string> = {
  0: 'text-yellow-300', 1: 'text-red-400', 2: 'text-orange-400', 3: 'text-yellow-400',
  4: 'text-blue-400', 5: 'text-purple-400',
};

// How sub-actions change distance
export const SUB_DISTANCE_DELTA: Partial<Record<SubAction, number>> = {
  '전진 압박': -1,
  '후퇴':      +1,
  '뒤로 베기': +1, // 후퇴하며 공격: 플레이어가 1칸 물러남
};

// ── Row (Y-axis) movement ─────────────────────────────────────
// Grid rows 0-4; playable range is 1-3 (center = 2)
export const COMBAT_ROW_DEFAULT = 2;
export const COMBAT_ROW_MIN     = 1;
export const COMBAT_ROW_MAX     = 3;

export function calcNewRow(sub: SubAction, currentRow: number): number {
  if (sub === '위로 이동')   return Math.max(COMBAT_ROW_MIN, currentRow - 1);
  if (sub === '아래로 이동') return Math.min(COMBAT_ROW_MAX, currentRow + 1);
  return currentRow;
}

/** 공격은 같은 행에만 명중. 마법·아이템은 행 무관 (광역/투척). */
export function isAttackHitByRow(
  action: ActionType, attackerRow: number, defenderRow: number,
): boolean {
  if (action !== '공격') return true;
  return attackerRow === defenderRow;
}

// Action effectiveness at given distance (damage multiplier)
export function distanceBonus(action: ActionType, distance: number): number {
  if (action === '공격') {
    if (distance <= 2) return 1.25;
    if (distance >= 4) return 0.70;
    return 1.00;
  }
  if (action === '마법 사용') {
    if (distance <= 2) return 0.70;
    if (distance >= 4) return 1.25;
    return 1.05;
  }
  if (action === '방어' && distance === 1) return 1.15; // close-range block bonus
  return 1.00;
}

export function getEffectiveStats(character: Character): Character['stats'] {
  const base = { ...character.stats };
  const hpRatio = Math.max(0, character.hp) / Math.max(1, character.maxHp);
  const staminaRatio = Math.max(0, character.stamina) / Math.max(1, character.maxStamina);
  const hpFactor = hpRatio < 0.5 ? 0.75 + hpRatio * 0.5 : 1;
  // Stamina penalty kicks in earlier (< 0.6 instead of < 0.5) because stamina is now scarcer
  const staminaFactor = staminaRatio < 0.6 ? 0.65 + staminaRatio * 0.6 : 1;
  const penalty = Math.min(1, hpFactor, staminaFactor);
  const condMult = getConditionMultiplier(character.condition);
  return {
    ...base,
    strength:   Math.max(1, Math.floor(base.strength   * penalty * condMult)),
    agility:    Math.max(1, Math.floor(base.agility    * penalty * condMult)),
    critChance: Math.max(1, Math.floor(base.critChance * Math.min(1, (hpFactor + staminaFactor) / 1.2) * condMult)),
  };
}

/** 부상이 strength/agility 스탯에 미치는 배율 */
export function getInjuryStatMult(injuries: Injury[], stat: 'strength' | 'agility'): number {
  let mult = 1.0;
  for (const inj of injuries) {
    if (inj.type === 'arm' && stat === 'strength') {
      mult *= inj.severity === 'minor' ? 0.80 : 0.65;
    }
    if (inj.type === 'leg' && stat === 'agility') {
      mult *= inj.severity === 'minor' ? 0.80 : 0.65;
    }
  }
  return mult;
}

/** 몸 부상으로 인한 턴당 스테미너 감소량 */
export function getBodyInjuryStaminaDrain(injuries: Injury[]): number {
  let drain = 0;
  for (const inj of injuries) {
    if (inj.type === 'body') {
      drain += inj.severity === 'minor' ? 3 : 6;
    }
  }
  return drain;
}

/** 큰 피해를 받았을 때 부상 발생 여부를 결정 */
export function rollInjury(damageTaken: number, playerMaxHp: number, existingInjuries: Injury[]): Injury | null {
  if (playerMaxHp <= 0) return null;

  // 모든 부위가 이미 중상이면 추가 부상 없음
  const allMajor = ['arm', 'leg', 'body'].every(t =>
    existingInjuries.some(i => i.type === t && i.severity === 'major')
  );
  if (allMajor) return null;

  const ratio = damageTaken / playerMaxHp;
  let chance = 0;
  if (ratio >= 0.50) chance = 0.60;
  else if (ratio >= 0.25) chance = 0.30;
  else return null;

  if (Math.random() >= chance) return null;

  // 부상 유형: 현재 부상이 없는 부위 우선
  const types: InjuryType[] = ['arm', 'leg', 'body'];
  const uninjured = types.filter(t => !existingInjuries.some(i => i.type === t));
  const candidates = uninjured.length > 0 ? uninjured : types;
  const type = candidates[Math.floor(Math.random() * candidates.length)];

  // 같은 부위 이미 부상 시 severity 업그레이드
  const existing = existingInjuries.find(i => i.type === type);
  const severity: InjurySeverity = existing ? 'major' : 'minor';

  return { type, severity };
}

export function getStaminaDelta(action: ActionType): number {
  switch (action) {
    case '이동':      return 10;
    case '방어':      return 4;   // 소극적 행동이라 회복 적음
    case '공격':      return -13;
    case '마법 사용': return -8;  // MP 제한이 이미 있으므로 스테미나 소모 축소
    case '아이템 사용': return -6;
    default: return 0;
  }
}

// Position-based movement on a 5-cell grid (positions 1–5)
// pDelta: 전진압박=-1(player moves right), 후퇴=+1(player moves left)
// eDelta: 전진압박=-1(enemy moves left toward player), 후퇴=+1(enemy moves right)
export function calcNewPositions(
  playerSub: SubAction, enemySub: SubAction,
  playerPos: number, enemyPos: number,
): { playerPos: number; enemyPos: number } {
  const pDelta = SUB_DISTANCE_DELTA[playerSub] ?? 0;
  const eDelta = SUB_DISTANCE_DELTA[enemySub] ?? 0;

  // player 전진압박(pDelta=-1) → player moves toward enemy → pos +1
  let np = playerPos + (-pDelta);
  // enemy 전진압박(eDelta=-1) → enemy moves toward player → pos -1
  let ne = enemyPos + eDelta;

  np = Math.max(1, Math.min(5, np));
  ne = Math.max(1, Math.min(5, ne));

  // 동일 칸(np === ne)은 허용 — 밀착 전투 발생
  // 단, 플레이어가 적을 지나칠 수 없음(np > ne는 불가)
  if (np > ne) {
    if (pDelta !== 0 && eDelta === 0) np = ne;           // only player moved → clamp to same cell
    else if (eDelta !== 0 && pDelta === 0) ne = np;      // only enemy moved → clamp to same cell
    else { np = playerPos; ne = enemyPos; }              // other conflict → neither moves
  }

  np = Math.max(1, Math.min(5, np));
  ne = Math.max(1, Math.min(5, ne));
  if (np > ne) { np = playerPos; ne = enemyPos; }        // safety fallback (no pass-through)

  return { playerPos: np, enemyPos: ne };
}

// Legacy wrapper kept for any callers that still use distance-only API
export function calcNewDistance(
  playerSub: SubAction, enemySub: SubAction, current: number,
): number {
  const { playerPos: np, enemyPos: ne } = calcNewPositions(playerSub, enemySub, 1, 1 + current);
  return ne - np;
}

// ── Intent & Dice ────────────────────────────────────────────
export interface EnemyIntent {
  mainAction: ActionType;
  subAction:  SubAction;
  mainProbs:  Record<ActionType, number>;
  subProbs:   Record<SubAction, number>;
}

// ── 주사위 콘테스트 ─────────────────────────────────────────────
// 속도 결정 / 힘싸움에서 사용되는 양측 대결 결과
export interface DiceContest {
  playerRolls: number[];
  enemyRolls:  number[];
  playerTotal: number;
  enemyTotal:  number;
  winner: 'player' | 'enemy' | 'tie';
}

// 마법 성공 판정 주사위
export interface MagicDiceRoll {
  rolls:     number[];
  total:     number;
  threshold: number;
  success:   boolean;
}

export interface TurnResult {
  quality:          MatchQuality;
  baseOutcome:      string;
  speedContest:     DiceContest;
  strengthContest?: DiceContest;
  magicRoll?:       MagicDiceRoll;
  damageTaken:      number;
  damageDealt:      number;
  healAmount?:      number;
  isCritical:       boolean;
  message:          string;
  newDistance:      number;
  newPlayerPos:     number;
  newEnemyPos:      number;
  newPlayerRow:     number;
  newEnemyRow:      number;
  playerRowMiss:    boolean;
  enemyRowMiss:     boolean;
  newEnemyEffects?: StatusEffect[];  // 이번 턴으로 적에게 걸리는 효과
  newPlayerEffects?: StatusEffect[]; // 이번 턴으로 플레이어에게 걸리는 효과
  bonusStamina?: number;             // 뒤로 베기 완벽 카운터 등 스테미너 보너스
  newPlayerInjury?: Injury;
}

// ── Structural types ─────────────────────────────────────────
export type EquipmentTag =
  | 'fire'
  | 'ice'
  | 'dark'
  | 'wind'
  | 'ranged'
  | 'heavy'
  | 'swift';

export interface ElementStats {
  fire: number; water: number; wind: number; earth: number; dark: number;
}

export interface Equipment {
  id: string; name: string; type: 'weapon' | 'armor';
  stats: Partial<Character['stats']>; description: string;
  range?: number;
  tags?: EquipmentTag[];
}

export interface Item {
  id: string; name: string; kind: 'potion' | 'throwing';
  description: string;
  heal?: number;
  damage?: number;
  range?: number;
}

export interface Title {
  id: TitleId; name: string; condition: string;
  bonus: Partial<Character['stats']>; equipped: boolean;
  tags?: EquipmentTag[];
}

export interface EnemyAbility {
  id: string; name: string; description: string;
  armor?: number; agility?: number; critChance?: number;
  hp?: number; mp?: number; mpRegen?: number;
  actionWeightBonus?: Partial<Record<ActionType, number>>;
  elementBonus?: Partial<ElementStats>;
}

export interface Character {
  id: string; name: string; level: number;
  swordSchool?: StartBuild;
  swordSchoolName?: string;
  life?: number; maxLife?: number;  // deprecated — kept for save compatibility only
  condition?: Condition;
  stats: {
    strength: number; agility: number;
    elements: ElementStats; armor: number; critChance: number;
  };
  hp: number; maxHp: number; mp: number; maxMp: number;
  stamina: number; maxStamina: number;
  equipment: Equipment[]; inventory: Item[]; magicSlots: MagicSpell[];
  weaponRange: number;
  titles: Title[];
  equippedTitle: TitleId | null;
  abilities?: EnemyAbility[];
  activeEffects?: StatusEffect[];
  injuries?: Injury[];
  phase2Triggered?: boolean; // 보스 왕 2페이즈 전용
  bossPattern?: 'wrath' | 'riposte' | 'judge' | 'king';
  imageId?: string;
  isLegacy?: boolean;
  isBoss?: boolean;
  actionWeights?: Record<ActionType, number>;
}

export type FloorEventType = 'shelter' | 'merchant' | 'ruins' | 'oath';

export interface FloorEventChoice {
  id: string;
  label: string;
  description: string;
  risk?: string;
  // WARNING: FloorEvent is NOT JSON-serializable — apply functions will be lost on JSON.stringify/parse. Regenerate on load.
  apply: (player: Character) => Character;
}

export interface FloorEvent {
  type: FloorEventType;
  title: string;
  narrative: string;
  choices: FloorEventChoice[];
}

// 층별 유령 저장 타입 (전체 게임 공유)
export type FloorGhosts = Record<number, Character[]>;

export type StatusEffectType =
  | 'stamina_drain'   // 화염 쇄도: 다음 턴 적 스테미너 -5
  | 'movement_lock'   // 암흑 속박: 다음 턴 적 이동 불가
  | 'agility_debuff'  // 빙결 창: 적 agility 30% 감소 (1턴)
  | 'extra_speed_die'; // 번개 일격: 다음 속도 주사위 +1

export interface StatusEffect {
  type: StatusEffectType;
  duration: number; // 남은 턴 수 (1 = 다음 턴 적용 후 소멸)
  value: number;    // 효과 크기
}

export type InjuryType = 'arm' | 'leg' | 'body';
export type InjurySeverity = 'minor' | 'major';

export interface Injury {
  type: InjuryType;
  severity: InjurySeverity;
}

export interface FloatingText {
  id: string; text: string;
  type: 'critical' | 'damage' | 'miss' | 'heal' | 'info';
  side: 'player' | 'enemy';
}

// ── Action resolution table ──────────────────────────────────
export type OutcomeKey =
  | '공격-공격' | '공격-이동' | '공격-방어' | '공격-마법 사용' | '공격-아이템 사용'
  | '이동-공격' | '이동-이동' | '이동-방어' | '이동-마법 사용' | '이동-아이템 사용'
  | '방어-공격' | '방어-이동' | '방어-방어' | '방어-마법 사용' | '방어-아이템 사용'
  | '마법 사용-공격' | '마법 사용-이동' | '마법 사용-방어' | '마법 사용-마법 사용' | '마법 사용-아이템 사용'
  | '아이템 사용-공격' | '아이템 사용-이동' | '아이템 사용-방어' | '아이템 사용-마법 사용' | '아이템 사용-아이템 사용';

export const ACTION_TABLE: Record<OutcomeKey, [string, string]> = {
  '공격-공격':           ['draw',  'draw'],
  '공격-이동':           ['win',   'lose'],
  '공격-방어':           ['block', 'win'],
  '공격-마법 사용':      ['win',   'lose'],
  '공격-아이템 사용':    ['win',   'lose'],
  '이동-공격':           ['lose',  'win'],
  '이동-이동':           ['draw',  'draw'],
  '이동-방어':           ['win',   'lose'],
  '이동-마법 사용':      ['lose',  'win'],
  '이동-아이템 사용':   ['draw',  'draw'],
  '방어-공격':           ['win',   'lose'],
  '방어-이동':           ['lose',  'win'],
  '방어-방어':           ['draw',  'draw'],
  '방어-마법 사용':      ['lose',  'win'],
  '방어-아이템 사용':   ['draw',  'draw'],
  '마법 사용-공격':      ['lose',  'win'],
  '마법 사용-이동':      ['win',   'lose'],
  '마법 사용-방어':      ['win',   'lose'],
  '마법 사용-마법 사용': ['draw',  'draw'],
  '마법 사용-아이템 사용': ['lose','win'],
  '아이템 사용-공격':    ['lose',  'win'],
  '아이템 사용-이동':    ['draw',  'draw'],
  '아이템 사용-방어':    ['draw',  'draw'],
  '아이템 사용-마법 사용':['lose', 'win'],
  '아이템 사용-아이템 사용': ['draw', 'draw'],
};

// ── Enemy Templates ──────────────────────────────────────────
export interface EnemyTemplate {
  id: string; name: string; minFloor: number; maxFloor: number; isBoss: boolean;
  baseStats: Character['stats']; baseHp: number; baseMp: number;
  actionWeights: Record<ActionType, number>; description: string;
  weaponRange: number;
  bossPattern?: 'wrath' | 'riposte' | 'judge' | 'king';
}

export const ENEMY_TEMPLATES: EnemyTemplate[] = [
  {
    id:'goblin', name:'검사 연습생', minFloor:1, maxFloor:3, isBoss:false,
    baseStats:{ strength:12, agility:18, elements:{fire:5,water:5,wind:5,earth:5,dark:5}, armor:5, critChance:8 },
    baseHp:60, baseMp:20,
    actionWeights:{'공격':50,'이동':30,'방어':10,'마법 사용':10,'아이템 사용':0},
    description:'기초 훈련 중인 검사',
    weaponRange: 1,
  },
  {
    id:'orc_warrior', name:'검사 전사', minFloor:2, maxFloor:5, isBoss:false,
    baseStats:{ strength:28, agility:12, elements:{fire:8,water:3,wind:5,earth:12,dark:5}, armor:15, critChance:10 },
    baseHp:120, baseMp:30,
    actionWeights:{'공격':60,'이동':10,'방어':25,'마법 사용':5,'아이템 사용':0},
    description:'견고한 검술을 지닌 검사',
    weaponRange: 2,
  },
  {
    id:'dark_mage', name:'검사 마법사', minFloor:4, maxFloor:7, isBoss:false,
    baseStats:{ strength:10, agility:15, elements:{fire:20,water:15,wind:10,earth:5,dark:35}, armor:5, critChance:25 },
    baseHp:80, baseMp:100,
    actionWeights:{'공격':10,'이동':20,'방어':10,'마법 사용':60,'아이템 사용':0},
    description:'마법을 다루는 검사',
    weaponRange: 4,
  },
  {
    id:'knight_swordsman', name:'검사 기사', minFloor:3, maxFloor:7, isBoss:false,
    baseStats:{ strength:35, agility:10, elements:{fire:5,water:5,wind:5,earth:15,dark:5}, armor:28, critChance:8 },
    baseHp:150, baseMp:20,
    actionWeights:{'공격':30,'이동':10,'방어':45,'마법 사용':10,'아이템 사용':5},
    description:'중무장한 검사 기사',
    weaponRange: 2,
  },
  {
    id:'swift_swordsman', name:'검사 방랑자', minFloor:4, maxFloor:8, isBoss:false,
    baseStats:{ strength:20, agility:38, elements:{fire:8,water:8,wind:18,earth:5,dark:8}, armor:8, critChance:22 },
    baseHp:100, baseMp:40,
    actionWeights:{'공격':25,'이동':45,'방어':10,'마법 사용':20,'아이템 사용':0},
    description:'빠른 발놀림의 검사 방랑자',
    weaponRange: 2,
  },
  {
    id:'duelist_swordsman', name:'검사 결투사', minFloor:6, maxFloor:99, isBoss:false,
    baseStats:{ strength:32, agility:28, elements:{fire:10,water:10,wind:10,earth:10,dark:10}, armor:14, critChance:20 },
    baseHp:130, baseMp:60,
    actionWeights:{'공격':30,'이동':20,'방어':30,'마법 사용':20,'아이템 사용':0},
    description:'반격의 달인 검사 결투사',
    weaponRange: 2,
  },
  {
    id:'samurai_boss', name:'검사 대장', minFloor:5, maxFloor:9, isBoss:true,
    baseStats:{ strength:55, agility:45, elements:{fire:20,water:20,wind:20,earth:20,dark:20}, armor:30, critChance:20 },
    baseHp:250, baseMp:80,
    actionWeights:{'공격':40,'이동':20,'방어':20,'마법 사용':20,'아이템 사용':0},
    description:'탑을 지키는 검사 대장',
    weaponRange: 3,
    bossPattern: 'wrath',
  },
  {
    id:'elder_boss', name:'검사 원로', minFloor:10, maxFloor:99, isBoss:true,
    baseStats:{ strength:72, agility:58, elements:{fire:28,water:28,wind:28,earth:28,dark:28}, armor:38, critChance:28 },
    baseHp:320, baseMp:130,
    actionWeights:{'공격':25,'이동':20,'방어':25,'마법 사용':30,'아이템 사용':0},
    description:'탑의 수호자 검사 원로',
    weaponRange: 3,
    bossPattern: 'riposte',
  },
  {
    id:'executioner', name:'검사 집행관', minFloor:8, maxFloor:15, isBoss:false,
    baseStats:{ strength:45, agility:30, elements:{fire:10,water:5,wind:5,earth:18,dark:5}, armor:22, critChance:15 },
    baseHp:180, baseMp:30,
    actionWeights:{'공격':50,'이동':15,'방어':25,'마법 사용':10,'아이템 사용':0},
    description:'탑의 규율을 집행하는 검사',
    weaponRange: 2,
  },
  {
    id:'arcane_swordsman', name:'검사 마도사', minFloor:11, maxFloor:99, isBoss:false,
    baseStats:{ strength:15, agility:22, elements:{fire:30,water:20,wind:20,earth:10,dark:35}, armor:10, critChance:35 },
    baseHp:110, baseMp:120,
    actionWeights:{'공격':5,'이동':15,'방어':10,'마법 사용':70,'아이템 사용':0},
    description:'검과 마법을 동시에 다루는 마도사',
    weaponRange: 4,
  },
  {
    id: 'judge_boss', name: '검사 심판관', minFloor: 15, maxFloor: 29, isBoss: true,
    baseStats: {
      strength: 88, agility: 70,
      elements: { fire: 25, water: 25, wind: 25, earth: 25, dark: 40 },
      armor: 42, critChance: 32,
    },
    baseHp: 400, baseMp: 160,
    actionWeights: { '공격': 35, '이동': 15, '방어': 20, '마법 사용': 30, '아이템 사용': 0 },
    description: '플레이어 패턴을 분석해 완벽히 카운터하는 심판관',
    weaponRange: 3,
    bossPattern: 'judge',
  },
  {
    id: 'king_boss', name: '검사 왕', minFloor: 30, maxFloor: 99, isBoss: true,
    baseStats: {
      strength: 110, agility: 85,
      elements: { fire: 35, water: 35, wind: 35, earth: 35, dark: 35 },
      armor: 50, critChance: 38,
    },
    baseHp: 520, baseMp: 200,
    actionWeights: { '공격': 30, '이동': 15, '방어': 25, '마법 사용': 30, '아이템 사용': 0 },
    description: '2페이즈 보스 — HP 0 도달 시 절반 HP로 부활',
    weaponRange: 3,
    bossPattern: 'king',
  },
];

export const EQUIPMENT_POOL: Equipment[] = [
  { id:'iron_sword',   name:'철제 검',       type:'weapon', stats:{strength:10}, description:'기본 철제 검', range:2, tags: [] },
  { id:'swift_boots',  name:'신속의 장화',   type:'armor',  stats:{agility:12},  description:'발이 빨라진다', tags: ['swift'] },
  { id:'flame_blade',  name:'화염 도검',     type:'weapon',
    stats:{strength:8, elements:{fire:15,water:0,wind:0,earth:0,dark:0}}, description:'불꽃이 깃든 검', range:2, tags: ['fire'] },
  { id:'throwing_knife', name:'투척 단검',   type:'weapon', stats:{strength:6, agility:4}, description:'원거리 공격용 단검', range:4, tags: ['ranged', 'swift'] },
  { id:'iron_shield',  name:'철제 방패',     type:'armor',  stats:{armor:15},    description:'강인한 방어력', tags: ['heavy'] },
  { id:'shadow_cloak', name:'그림자 망토',   type:'armor',
    stats:{agility:8, elements:{fire:0,water:0,wind:0,earth:0,dark:10}}, description:'암흑 속에 숨는다', tags: ['dark', 'swift'] },
];

export const EQUIPMENT_POOL_T2: Equipment[] = [
  { id:'steel_sword',  name:'강철 대검',     type:'weapon', stats:{strength:18}, description:'묵직한 강철 대검', range:2, tags: ['heavy'] },
  { id:'agile_armor',  name:'경량 갑옷',     type:'armor',  stats:{agility:14, armor:6}, description:'빠르고 가벼운 갑옷', tags: ['swift'] },
  { id:'frost_blade',  name:'빙결 도검',     type:'weapon',
    stats:{strength:10, elements:{fire:0,water:22,wind:0,earth:0,dark:0}}, description:'얼음 기운이 깃든 검', range:2, tags: ['ice'] },
  { id:'heavy_shield', name:'중갑 방패',     type:'armor',  stats:{armor:22},    description:'두껍고 무거운 방패', tags: ['heavy'] },
  { id:'wind_cloak',   name:'폭풍 망토',     type:'armor',
    stats:{agility:12, elements:{fire:0,water:0,wind:18,earth:0,dark:0}}, description:'바람을 타는 망토', tags: ['wind', 'swift'] },
  { id:'thunder_blade',name:'뇌전 도검',     type:'weapon',
    stats:{strength:12, elements:{fire:0,water:0,wind:12,earth:0,dark:8}}, description:'번개가 깃든 검', range:2, tags: ['wind', 'dark'] },
];

export const EQUIPMENT_POOL_T3: Equipment[] = [
  { id:'legendary_sword', name:'전설의 검',  type:'weapon', stats:{strength:28}, description:'탑의 전설로 불리는 검', range:3, tags: [] },
  { id:'master_armor',    name:'마스터 갑주',type:'armor',  stats:{armor:28, agility:10}, description:'최상급 장인의 작품', tags: ['heavy'] },
  { id:'arcane_staff',    name:'비전 지팡이',type:'weapon',
    stats:{strength:6, elements:{fire:18,water:18,wind:18,earth:18,dark:18}}, description:'모든 속성이 깃든 지팡이', range:5, tags: ['fire','ice','wind','dark'] },
  { id:'crimson_blade',   name:'홍염 대검',  type:'weapon',
    stats:{strength:22, elements:{fire:20,water:0,wind:0,earth:0,dark:0}}, description:'붉은 불꽃이 타오르는 대검', range:2, tags: ['fire'] },
  { id:'void_armor',      name:'허공의 갑주',type:'armor',
    stats:{armor:20, agility:14, elements:{fire:0,water:0,wind:0,earth:0,dark:20}}, description:'어둠과 하나된 갑옷', tags: ['dark', 'swift'] },
];

export function getRewardEquipment(floor: number): Equipment {
  const pool = floor >= 13 ? EQUIPMENT_POOL_T3 : floor >= 6 ? EQUIPMENT_POOL_T2 : EQUIPMENT_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

// 전투 후 적 능력치 기반으로 랜덤 칭호 3개 생성
export function generateCombatTitles(enemy: Character): Title[] {
  const s = enemy.stats;
  const maxEl = Math.max(s.elements.fire, s.elements.water, s.elements.wind, s.elements.earth, s.elements.dark);
  const elName = s.elements.fire >= maxEl ? '화염' : s.elements.water >= maxEl ? '냉기'
    : s.elements.wind >= maxEl ? '바람' : s.elements.earth >= maxEl ? '대지' : '암흑';

  const pool: Title[] = [
    {
      id: `combat_strength_${Date.now()}`,
      name: `${enemy.name} 격파자`,
      condition: `${enemy.name}을 쓰러뜨렸다`,
      bonus: { strength: Math.max(4, Math.floor(s.strength * 0.15)) },
      equipped: false,
    },
    {
      id: `combat_agility_${Date.now() + 1}`,
      name: enemy.stats.agility >= 30 ? '신속의 사냥꾼' : '날렵한 검사',
      condition: `빠른 적을 제압했다`,
      bonus: { agility: Math.max(4, Math.floor(s.agility * 0.15)) },
      equipped: false,
    },
    {
      id: `combat_armor_${Date.now() + 2}`,
      name: enemy.stats.armor >= 20 ? '철벽 파괴자' : '방어 격파자',
      condition: `견고한 방어를 뚫었다`,
      bonus: { armor: Math.max(3, Math.floor(s.armor * 0.25)) },
      equipped: false,
    },
    {
      id: `combat_element_${Date.now() + 3}`,
      name: `${elName}의 계승자`,
      condition: `${elName} 속성의 적을 쓰러뜨렸다`,
      bonus: { critChance: Math.max(4, Math.floor(s.critChance * 0.3)) },
      equipped: false,
    },
    ...(enemy.isBoss ? [{
      id: `combat_boss_${Date.now() + 4}` as TitleId,
      name: '보스 처치자',
      condition: '강력한 보스를 쓰러뜨렸다',
      bonus: { strength: 8, agility: 5, critChance: 5 },
      equipped: false,
    }] : []),
  ];

  // 3개 랜덤 선택
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

export const ITEM_REWARD_POOL: Item[] = [
  { id:'explosive_potion',      name:'폭발 물약',      kind:'throwing', description:'방어 무시 폭발 피해 (사거리 5)', damage:30, range:5 },
  { id:'reinforced_dagger',     name:'강화 단검',      kind:'throwing', description:'강력한 단검 투척 (사거리 4)', damage:20, range:4 },
  { id:'large_healing_potion',  name:'대형 치유 물약', kind:'potion',   description:'체력 50 대량 회복', heal:50 },
];

export const TITLES_DATA: Title[] = [
  { id:'novice',        name:'신참자',    condition:'처음 전투',        bonus:{},               equipped:false },
  { id:'weapon_breaker',name:'무기 파괴자',condition:'완벽 방어 10회',  bonus:{strength:5,critChance:5}, equipped:false },
  { id:'tower_climber', name:'탑 등반가', condition:'5층 돌파',         bonus:{agility:5},      equipped:false },
  { id:'boss_slayer',   name:'보스 사냥꾼',condition:'보스 처치',        bonus:{strength:10,critChance:5}, equipped:false },
  { id:'magic_adept',   name:'비전 연구자',condition:'10층 돌파',       bonus:{critChance:5,agility:5}, equipped:false },
  { id:'survivor',      name:'생존자',    condition:'생명력 1개로 승리', bonus:{armor:10},       equipped:false },
];

export const ENEMY_ABILITY_POOL: EnemyAbility[] = [
  { id:'obsidian_skin', name:'흑요석 갑옷', description:'적의 방어력이 강화된다', armor:6 },
  { id:'swift_strike', name:'신속한 일격', description:'적의 민첩이 상승한다', agility:6 },
  { id:'arcane_reserve', name:'비전력 축적', description:'MP 재생이 빨라진다', mpRegen:3 },
  { id:'spiteful_flame', name:'원한의 화염', description:'화염 속성이 강화된다', elementBonus:{fire:10} },
  { id:'shadow_curse', name:'암흑 저주', description:'치명타 확률이 상승한다', critChance:8 },
  { id:'earth_shaper', name:'대지의 울림', description:'대지 속성이 강화된다', elementBonus:{earth:10} },
];

export function getMagicCooldownByProgress(floor: number, player: Character): number {
  if (player.titles.some(t => t.id === 'magic_adept')) return 0;
  if (floor >= 5) return 0;
  return 1;
}

export function getMagicCostByProgress(floor: number, _player?: Character): number {
  return floor >= 10 ? 8 : 10;
}

export function getMagicRegenByProgress(floor: number, _player?: Character): number {
  return floor >= 10 ? 10 : 8;
}

export function getMagicHint(floor: number, player: Character): string {
  const cooldown = getMagicCooldownByProgress(floor, player);
  if (cooldown === 0) return '마법이 즉시 준비됩니다.';
  return '마법 시전 후 1턴 대기';
}

// ── Floor Events ─────────────────────────────────────────────
export function shouldTriggerEvent(floor: number): boolean {
  if (floor <= 1) return false;
  if (floor % 5 === 0) return false; // 보스 층에서는 이벤트 없음
  return floor % 3 === 0;
}

export function generateFloorEvent(floor: number, player: Character): FloorEvent {
  const hpLow = player.hp / player.maxHp < 0.4;
  const types: FloorEventType[] = hpLow
    ? ['shelter', 'shelter', 'merchant', 'ruins']
    : ['shelter', 'merchant', 'ruins', 'oath'];

  const type = types[Math.floor(Math.random() * types.length)];

  switch (type) {
    case 'shelter':
      return {
        type: 'shelter',
        title: '검사의 쉼터',
        narrative: '탑 안에 마련된 작은 쉼터를 발견했다. 잠시 쉬어가며 상처를 치료할 수 있다.',
        choices: [
          {
            id: 'rest',
            label: '쉬어 가기',
            description: `HP ${Math.floor(player.maxHp * 0.3)} 회복`,
            apply: (p) => ({ ...p, hp: Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.3)) }),
          },
          {
            id: 'train',
            label: '단련하기',
            description: 'HP 회복 없음. 대신 strength +3',
            apply: (p) => ({ ...p, stats: { ...p.stats, strength: p.stats.strength + 3 } }),
          },
          {
            id: 'heal_injury',
            label: '부상 치료',
            description: '가장 심한 부상 1개를 치료',
            apply: (p) => {
              if (!p.injuries || p.injuries.length === 0) return p;
              const majorIdx = p.injuries.findIndex(i => i.severity === 'major');
              const idx = majorIdx >= 0 ? majorIdx : 0;
              const newInjuries = p.injuries.filter((_, i) => i !== idx);
              return { ...p, injuries: newInjuries };
            },
          },
          {
            id: 'skip',
            label: '그냥 지나치기',
            description: '아무 효과 없음',
            apply: (p) => p,
          },
        ],
      };

    case 'merchant':
      return {
        type: 'merchant',
        title: '행상 검사',
        narrative: '낡은 짐을 짊어진 검사가 길목에 앉아 있다. HP를 지불하고 물건을 살 수 있다.',
        choices: [
          {
            id: 'buy_agility',
            label: `HP ${Math.floor(player.maxHp * 0.15)} 지불 → agility +8`,
            description: '신속의 비약',
            risk: `HP ${Math.floor(player.maxHp * 0.15)} 소모`,
            apply: (p) => ({
              ...p,
              hp: Math.max(1, p.hp - Math.floor(p.maxHp * 0.15)),
              stats: { ...p.stats, agility: p.stats.agility + 8 },
            }),
          },
          {
            id: 'buy_armor',
            label: `HP ${Math.floor(player.maxHp * 0.15)} 지불 → armor +10`,
            description: '단단한 비늘 갑옷 조각',
            risk: `HP ${Math.floor(player.maxHp * 0.15)} 소모`,
            apply: (p) => ({
              ...p,
              hp: Math.max(1, p.hp - Math.floor(p.maxHp * 0.15)),
              stats: { ...p.stats, armor: Math.min(70, p.stats.armor + 10) },
            }),
          },
          {
            id: 'skip',
            label: '그냥 지나치기',
            description: '거래 안 함',
            apply: (p) => p,
          },
        ],
      };

    case 'ruins':
      return {
        type: 'ruins',
        title: '검사의 폐허',
        narrative: '오래된 전투 흔적이 남아 있는 폐허다. 위험한 유물이 발견됐지만 효과가 불분명하다.',
        choices: [
          {
            id: 'gamble_strength',
            label: '붉은 검 조각을 잡는다',
            description: '50% 확률: strength +10 / 50% 확률: HP -20%',
            risk: '50% 확률로 HP 감소',
            apply: (p) => Math.random() < 0.5
              ? { ...p, stats: { ...p.stats, strength: p.stats.strength + 10 } }
              : { ...p, hp: Math.max(1, Math.floor(p.hp * 0.8)) },
          },
          {
            id: 'gamble_crit',
            label: '검은 수정을 삼킨다',
            description: '60% 확률: critChance +12 / 40% 확률: 즉시 컨디션 최악',
            risk: '40% 확률로 컨디션 최악',
            apply: (p) => Math.random() < 0.6
              ? { ...p, stats: { ...p.stats, critChance: p.stats.critChance + 12 } }
              : { ...p, condition: 'terrible' as Condition },
          },
          {
            id: 'skip',
            label: '무시하고 지나친다',
            description: '안전하게 통과',
            apply: (p) => p,
          },
        ],
      };

    case 'oath':
    default:
      return {
        type: 'oath',
        title: '검사의 맹세',
        narrative: '탑의 제단 앞에 섰다. 고통스러운 맹세를 통해 더 강해질 수 있다.',
        choices: [
          {
            id: 'oath_strength',
            label: `힘의 맹세`,
            description: `strength +${Math.floor(floor * 0.8) + 5}. 대신 현재 HP 절반으로`,
            risk: 'HP 50% 감소',
            apply: (p) => ({
              ...p,
              hp: Math.max(1, Math.floor(p.hp * 0.5)),
              stats: { ...p.stats, strength: p.stats.strength + Math.floor(floor * 0.8) + 5 },
            }),
          },
          {
            id: 'oath_agility',
            label: `신속의 맹세`,
            description: `agility +${Math.floor(floor * 0.6) + 4}. 대신 현재 HP 절반으로`,
            risk: 'HP 50% 감소',
            apply: (p) => ({
              ...p,
              hp: Math.max(1, Math.floor(p.hp * 0.5)),
              stats: { ...p.stats, agility: p.stats.agility + Math.floor(floor * 0.6) + 4 },
            }),
          },
          {
            id: 'skip',
            label: '맹세를 거부한다',
            description: '아무 변화 없음',
            apply: (p) => p,
          },
        ],
      };
  }
}

// ── Dice ─────────────────────────────────────────────────────
export const DICE_FACE = ['','⚀','⚁','⚂','⚃','⚄','⚅'];

export function rollDice(count: number): number[] {
  return Array.from({ length: Math.max(1, count) }, () => Math.floor(Math.random() * 6) + 1);
}

function rollContest(playerCount: number, enemyCount: number): DiceContest {
  if (enemyCount === 0) {
    const playerRolls = rollDice(playerCount);
    const playerTotal = playerRolls.reduce((a, b) => a + b, 0);
    return { playerRolls, enemyRolls: [], playerTotal, enemyTotal: 0, winner: 'player' };
  }
  const playerRolls = rollDice(playerCount);
  const enemyRolls  = rollDice(enemyCount);
  const playerTotal = playerRolls.reduce((a, b) => a + b, 0);
  const enemyTotal  = enemyRolls.reduce((a, b) => a + b, 0);
  const winner: DiceContest['winner'] =
    playerTotal > enemyTotal ? 'player' : playerTotal < enemyTotal ? 'enemy' : 'tie';
  return { playerRolls, enemyRolls, playerTotal, enemyTotal, winner };
}

export function getDiceCount(myStat: number, theirStat: number): number {
  const ratio = myStat / Math.max(1, theirStat);
  if (ratio >= 2.0) return 4;
  if (ratio >= 1.4) return 3;
  if (ratio >= 0.9) return 2;
  return 1;
}

// ── Match quality ────────────────────────────────────────────
export function getMatchQuality(
  playerSub: SubAction, enemySub: SubAction,
): MatchQuality {
  if (PERFECT_COUNTER[enemySub] === playerSub) return 'perfect'; // 플레이어가 적 서브를 카운터
  if (PERFECT_COUNTER[playerSub] === enemySub) return 'miss';    // 적이 플레이어 서브를 카운터
  return 'partial';
}

// ── Full turn resolution ─────────────────────────────────────
export function resolveTurn(
  playerMain: ActionType, playerSub: SubAction,
  enemy: Character, intent: EnemyIntent,
  player: Character,
  playerPos: number, enemyPos: number,
  playerRow: number = COMBAT_ROW_DEFAULT,
  enemyRow:  number = COMBAT_ROW_DEFAULT,
  playerMagicBonus: number = 0,
  playerRangedBonus: number = 0,
): TurnResult {
  const distance = enemyPos - playerPos;

  // ── 활성 상태효과 확인 ──────────────────────────────────────
  const enemyMoveLocked = (enemy.activeEffects ?? []).some(e => e.type === 'movement_lock');
  const enemyAgiDebuffed = (enemy.activeEffects ?? []).some(e => e.type === 'agility_debuff');
  const playerExtraSpeedDie = (player.activeEffects ?? []).some(e => e.type === 'extra_speed_die');

  const quality = getMatchQuality(playerSub, intent.subAction);
  const playerStats = getEffectiveStats(player);
  const enemyStats = getEffectiveStats(enemy);

  // 부상 페널티 적용
  const playerInjuries = player.injuries ?? [];
  const injStrMult = getInjuryStatMult(playerInjuries, 'strength');
  const injAgiMult = getInjuryStatMult(playerInjuries, 'agility');
  if (injStrMult < 1 || injAgiMult < 1) {
    playerStats.strength  = Math.max(1, Math.floor(playerStats.strength  * injStrMult));
    playerStats.agility   = Math.max(1, Math.floor(playerStats.agility   * injAgiMult));
  }
  const playerWeaponRange = player.weaponRange ?? 1;
  const enemyWeaponRange = enemy.weaponRange ?? 1;
  const playerItemRange = playerMain === '아이템 사용'
    ? (playerSub === '폭발 물약' ? 5 : playerSub === '단검 던지기' || playerSub === '강화 단검' ? 4 : 0)
    : 0;
  const playerInRange = playerMain !== '공격' || distance <= playerWeaponRange;
  const enemyInRange = intent.mainAction !== '공격' || distance <= enemyWeaponRange;
  const isThrowingItem = playerMain === '아이템 사용' && (playerSub === '단검 던지기' || playerSub === '강화 단검' || playerSub === '폭발 물약');
  const itemCanHit = isThrowingItem ? distance <= playerItemRange : true;

  // Distance bonus multipliers
  const pDistMult = distanceBonus(playerMain, distance);
  const eDistMult = distanceBonus(intent.mainAction, distance);

  const pArmorRed = playerStats.armor / 100;
  const eArmorRed = enemyStats.armor  / 100;

  const playerAttacks = playerMain === '공격' || playerMain === '마법 사용' || isThrowingItem;
  const enemyAttacks  = intent.mainAction === '공격' || intent.mainAction === '마법 사용';

  // ── 1. 속도 결정 주사위 ──────────────────────────────────────
  // 민첩 상대 비율로 주사위 수 결정 (스테미나 감소 시 effective agility가 이미 낮아짐)
  const playerDiceMods = SUB_ACTION_DICE_MODIFIERS[playerSub] ?? {};
  const pSpdDiceBase = getDiceCount(playerStats.agility, enemyStats.agility); // 적 디버프는 플레이어 주사위에 도움 안 됨
  const pSpdDice = Math.min(4, Math.max(1, pSpdDiceBase + (playerExtraSpeedDie ? 1 : 0) + (playerDiceMods.speed ?? 0)));
  const eSpdDice = enemyMoveLocked ? 0
    : getDiceCount(
        enemyAgiDebuffed ? Math.floor(enemyStats.agility * 0.7) : enemyStats.agility, // 디버프로 적 자신 주사위 감소
        playerStats.agility);
  const speedContest = rollContest(pSpdDice, eSpdDice);

  let pSpeedMult = 1.0, eSpeedMult = 1.0;
  if (speedContest.winner === 'player') { pSpeedMult = 1.2;  eSpeedMult = 0.85; }
  else if (speedContest.winner === 'enemy')  { pSpeedMult = 0.85; eSpeedMult = 1.2; }

  // 이동: 속도에서 이기면 피해 0으로 회피 (먼저 빠져나감)
  if (playerMain === '이동' && speedContest.winner === 'player') eSpeedMult = 0;

  // ── 2. 힘싸움 주사위 ────────────────────────────────────────
  // 힘 상대 비율로 주사위 수 결정 (스테미나 감소 시 effective strength가 이미 낮아짐)
  let strengthContest: DiceContest | undefined;
  let pStrMult = 1.0, eStrMult = 1.0;
  const combatEngaged = (playerAttacks || playerMain === '방어') && (enemyAttacks || intent.mainAction === '방어');
  if (combatEngaged) {
    let pStrDice = getDiceCount(playerStats.strength, enemyStats.strength);
    let eStrDice = getDiceCount(enemyStats.strength, playerStats.strength);
    // 서브 액션 매칭이 힘싸움 다이스를 추가 조정
    if (playerDiceMods.strength) pStrDice = Math.min(4, Math.max(1, pStrDice + playerDiceMods.strength));
    if (quality === 'perfect') pStrDice = Math.min(4, pStrDice + 1);
    if (quality === 'miss')    pStrDice = Math.max(1, pStrDice - 1);

    strengthContest = rollContest(pStrDice, eStrDice);
    const margin = Math.abs(strengthContest.playerTotal - strengthContest.enemyTotal);
    if (strengthContest.winner === 'player') {
      pStrMult = margin >= 4 ? 1.5 : 1.25;
      eStrMult = margin >= 4 ? 0.65 : 0.8;
    } else if (strengthContest.winner === 'enemy') {
      pStrMult = margin >= 4 ? 0.65 : 0.8;
      eStrMult = margin >= 4 ? 1.5 : 1.25;
    }
  }

  // ── 3. 마법 성공 주사위 ─────────────────────────────────────
  // 2d6을 굴려 합계 6 이상이면 성공, 10 이상이면 강화
  let magicRoll: MagicDiceRoll | undefined;
  let magicMult = 1.0;
  if (playerMain === '마법 사용') {
    const rolls  = rollDice(2);
    const total  = rolls.reduce((a, b) => a + b, 0);
    const threshold = 6;
    const success   = total >= threshold;
    magicRoll = { rolls, total, threshold, success };
    if (!success)    magicMult = 0;
    else if (total >= 10) magicMult = 1.3;
  }

  // ── 최종 배율 합산 ───────────────────────────────────────────
  const pFinalMult = pSpeedMult * pStrMult * magicMult * pDistMult;
  const eFinalMult = eSpeedMult * eStrMult * eDistMult;

  // 양쪽 모두 선제·힘싸움 승리 시 크리티컬
  const isCritical = speedContest.winner === 'player' &&
    (strengthContest?.winner === 'player') === true &&
    speedContest.playerTotal - speedContest.enemyTotal +
    ((strengthContest?.playerTotal ?? 0) - (strengthContest?.enemyTotal ?? 0)) >= 5;

  let damageDealt = 0, damageTaken = 0;
  let message = '';

  // ── 투척 원거리 회피: 속도 주사위로 피했는지 판정 ──────────
  const rangedDodged = isThrowingItem && itemCanHit && speedContest.winner === 'enemy';

  // ── 플레이어 공격 피해 ───────────────────────────────────────
  if (playerAttacks && playerInRange && (isThrowingItem ? itemCanHit : true) && !rangedDodged) {
    if (playerMain === '마법 사용') {
      // 마법: 성공 시 무조건 피격 — 속도/힘싸움 배율 무시
      if (magicMult > 0) {
        const sp = Math.floor(playerStats.strength * 0.7 + (player.stats.elements.fire + player.stats.elements.dark) * 0.3);
        const magicSynergyMult = 1 + playerMagicBonus / 100;
        damageDealt = Math.max(1, Math.floor(sp * magicMult * pDistMult * magicSynergyMult * (1 - eArmorRed)));
      }
    } else if (playerSub === '단검 던지기') {
      const rangedSynergyMult = 1 + playerRangedBonus / 100;
      damageDealt = Math.max(1, Math.floor(playerStats.strength * 0.9 * pFinalMult * rangedSynergyMult * (1 - eArmorRed)));
    } else if (playerSub === '강화 단검') {
      const rangedSynergyMult = 1 + playerRangedBonus / 100;
      damageDealt = Math.max(1, Math.floor(playerStats.strength * 1.2 * pFinalMult * rangedSynergyMult * (1 - eArmorRed)));
    } else if (playerSub === '폭발 물약') {
      damageDealt = Math.max(1, Math.floor(32 * pFinalMult));
    } else {
      damageDealt = Math.max(1, Math.floor(playerStats.strength * pFinalMult * (1 - eArmorRed)));
    }
  }

  // ── 적 공격 피해 ─────────────────────────────────────────────
  if (enemyAttacks && enemyInRange) {
    damageTaken = Math.max(1, Math.floor(enemyStats.strength * eFinalMult * (1 - pArmorRed)));
  }

  // ── 방어 행동 ────────────────────────────────────────────────
  // 힘싸움 결과가 방어 성패를 결정
  if (playerMain === '방어') {
    damageDealt = 0;
    if (enemyAttacks && enemyInRange) {
      if (strengthContest?.winner === 'player') {
        const margin = (strengthContest.playerTotal - strengthContest.enemyTotal);
        if (margin >= 4) {
          damageTaken = 0;
          damageDealt = Math.max(1, Math.floor(playerStats.strength * 0.6 * pFinalMult * (1 - eArmorRed)));
          message = `힘싸움 압승! 완벽 차단 + 반격`;
        } else {
          damageTaken = Math.max(1, Math.floor(enemyStats.strength * eFinalMult * 0.20 * (1 - pArmorRed)));
          message = `힘싸움 승리 — 대부분 막음`;
        }
      } else if (strengthContest?.winner === 'tie') {
        damageTaken = Math.max(1, Math.floor(enemyStats.strength * eFinalMult * 0.55 * (1 - pArmorRed)));
        message = `힘싸움 팽팽 — 절반 막음`;
      } else {
        // 힘싸움 패배: 방어를 선택했지만 밀렸음 → 공격받은 것보다 더 아픔 (무방비 틈을 파고듦)
        damageTaken = Math.max(1, Math.floor(enemyStats.strength * eFinalMult * 1.1 * (1 - pArmorRed)));
        message = `힘싸움 패배 — 방어 역이용당함`;
      }
    }
  }

  // ── 이동 행동 ────────────────────────────────────────────────
  if (playerMain === '이동') {
    damageDealt = 0;
    // 속도 결과에 따라 피해 결정 (eFinalMult에 이미 반영됨)
    if (damageTaken > 0) damageTaken = Math.max(1, Math.floor(enemyStats.strength * eFinalMult * (1 - pArmorRed)));
    message = speedContest.winner === 'player' ? '속도 우위 — 회피 성공!' :
              speedContest.winner === 'enemy'   ? '속도 열세 — 피격!' : '이동';
  }

  // ── 아이템 사용 (투척 외) ────────────────────────────────────
  if (playerMain === '아이템 사용' && !isThrowingItem) {
    damageDealt = 0;
  }

  // ── 사정거리 밖 / 원거리 회피 ───────────────────────────────
  if (playerMain === '공격' && !playerInRange) {
    damageDealt = 0; message = '⚠ 사정거리 밖! 공격 빗나감';
  }
  if (isThrowingItem && !itemCanHit) {
    damageDealt = 0; message = '⚠ 투척 사정거리 밖';
  }
  if (rangedDodged) {
    damageDealt = 0; message = '속도 우위로 투척 회피!';
  }
  if (intent.mainAction === '공격' && !enemyInRange) damageTaken = 0;

  // ── 메시지 생성 ──────────────────────────────────────────────
  if (!message) {
    const spdLabel = speedContest.winner === 'player' ? '선제' : speedContest.winner === 'enemy' ? '후공' : '';
    const strLabel = strengthContest
      ? (strengthContest.winner === 'player' ? '힘싸움 승' : strengthContest.winner === 'enemy' ? '힘싸움 패' : '힘싸움 팽팽')
      : '';
    const magLabel = magicRoll
      ? (magicRoll.success ? (magicRoll.total >= 10 ? '마법 강화 성공' : '마법 성공') : '마법 실패!')
      : '';
    const parts = [spdLabel, strLabel, magLabel].filter(Boolean);
    if (damageDealt > 0 && damageTaken > 0) message = parts.join(' / ') || '교전';
    else if (damageDealt > 0) message = parts.join(' / ') || '공격 적중';
    else if (damageTaken > 0) message = parts.join(' / ') || '피격';
    else message = parts.join(' / ') || '교전 없음';
  }
  if (isCritical) message += ' 🔥크리티컬!';

  // ── 동일 칸(distance=0) 강제 교전 ────────────────────────────
  if (distance === 0) {
    const pAtk = Math.max(1, Math.floor(playerStats.strength * pFinalMult * (1 - eArmorRed)));
    const eAtk = Math.max(1, Math.floor(enemyStats.strength * eFinalMult * (1 - pArmorRed)));
    damageDealt = pAtk; damageTaken = eAtk;
    message = '⚔ 밀착 교전!';
  }

  const { playerPos: newPlayerPos, enemyPos: newEnemyPos } =
    calcNewPositions(playerSub, intent.subAction, playerPos, enemyPos);
  let finalPlayerPos = newPlayerPos;
  let finalEnemyPos  = newEnemyPos;

  // ── 동일 칸 패자 밀려남 ──────────────────────────────────────
  if (distance === 0 && finalPlayerPos === finalEnemyPos) {
    if (damageDealt >= damageTaken) {
      finalEnemyPos = Math.min(5, finalEnemyPos + 1);
      message += ' — 적이 밀려났다!';
    } else {
      finalPlayerPos = Math.max(1, finalPlayerPos - 1);
      message += ' — 플레이어가 밀려났다!';
    }
  }
  // 바람 쇄도 성공 시 즉시 적 1칸 밀어냄
  if (playerMain === '마법 사용' && playerSub === '바람 쇄도' && magicMult > 0 && damageDealt > 0) {
    finalEnemyPos = Math.min(5, finalEnemyPos + 1);
    message += ' — 바람에 밀려났다!';
  }
  // 뒤로 베기: 공격 성공 시 적도 1칸 추가 밀어냄
  if (playerSub === '뒤로 베기' && damageDealt > 0) {
    finalEnemyPos = Math.min(5, finalEnemyPos + 1);
    message += ' — 뒤로 베기로 적을 밀어냈다!';
  }
  const newDistance = finalEnemyPos - finalPlayerPos;

  // ── 행(Y축) 이동 및 miss 판정 ────────────────────────────────
  const newPlayerRow = calcNewRow(playerSub, playerRow);
  const newEnemyRow  = calcNewRow(intent.subAction, enemyRow);
  const rowsWereAligned = playerRow === enemyRow;
  const rowsAreAligned = newPlayerRow === newEnemyRow;
  const playerShiftedRow = newPlayerRow !== playerRow;
  const enemyShiftedRow = newEnemyRow !== enemyRow;
  const playerRowMiss = playerMain === '공격' && !rowsAreAligned &&
    (!rowsWereAligned || (enemyShiftedRow && speedContest.winner === 'enemy'));
  const enemyRowMiss = intent.mainAction === '공격' && !rowsAreAligned &&
    (!rowsWereAligned || (playerShiftedRow && speedContest.winner === 'player'));

  if (playerRowMiss && damageDealt > 0) {
    damageDealt = 0; message = '행 이동으로 공격이 빗나갔다!';
  }
  if (enemyRowMiss && damageTaken > 0) {
    damageTaken = 0;
    message += message ? ' (행 이동으로 회피!)' : '행 이동으로 회피!';
  }

  // 부상 발생 체크
  const newPlayerInjury = damageTaken > 0
    ? rollInjury(damageTaken, player.maxHp, playerInjuries) ?? undefined
    : undefined;

  const base = { quality, baseOutcome: 'draw', speedContest, strengthContest, magicRoll,
    isCritical, newDistance, newPlayerPos: finalPlayerPos, newEnemyPos: finalEnemyPos,
    newPlayerRow, newEnemyRow, playerRowMiss, enemyRowMiss };

  // 마법 성공 시 스펠별 부가효과 생성
  let newEnemyEffects: StatusEffect[] | undefined;
  let newPlayerEffects: StatusEffect[] | undefined;
  let spellHealAmount: number | undefined;
  const bonusStamina = (playerSub === '뒤로 베기' && quality === 'perfect') ? 5 : 0;

  // 바람 쇄도의 위치 밀어냄은 위 position 블록에서 처리됨 — 여기서는 별도 효과 없음
  if (playerMain === '마법 사용' && magicMult > 0) {
    switch (playerSub) {
      case '화염 쇄도':
        newEnemyEffects = [{ type: 'stamina_drain', duration: 1, value: 5 }];
        message += ' 🔥(화상)';
        break;
      case '암흑 속박':
        newEnemyEffects = [{ type: 'movement_lock', duration: 1, value: 0 }];
        message += ' ⛓(속박)';
        break;
      case '빙결 창':
        newEnemyEffects = [{ type: 'agility_debuff', duration: 1, value: 0.30 }];
        message += ' ❄(빙결)';
        break;
      case '번개 일격':
        newPlayerEffects = [{ type: 'extra_speed_die', duration: 1, value: 1 }];
        message += ' ⚡(가속)';
        break;
      case '회복술':
        spellHealAmount = 15; // 회복술 기본 회복량: 마법은 발동 조건(주사위 성공) 있어 포션(25)보다 낮게 설계
        break;
    }
  }

  if (playerMain === '아이템 사용' && playerSub === '치유 물약') {
    return { ...base, damageTaken, damageDealt, healAmount: 25,
      newEnemyEffects, newPlayerEffects, bonusStamina: undefined,
      newPlayerInjury: undefined,
      message: '치유 물약으로 회복' };
  }
  if (playerMain === '아이템 사용' && playerSub === '대형 치유 물약') {
    return { ...base, damageTaken, damageDealt, healAmount: 50,
      newEnemyEffects, newPlayerEffects, bonusStamina: undefined,
      newPlayerInjury: undefined,
      message: '대형 치유 물약으로 대량 회복!' };
  }
  return {
    ...base,
    damageTaken,
    damageDealt,
    healAmount: spellHealAmount,
    newEnemyEffects,
    newPlayerEffects,
    bonusStamina,
    newPlayerInjury,
    message,
  };
}

// ── Intent generation ────────────────────────────────────────
export interface AIContext {
  enemyHp: number;
  enemyMaxHp: number;
  playerHp: number;
  playerMaxHp: number;
  distance: number;
  enemyWeaponRange: number;
  playerRow: number;
  enemyRow: number;
  enemyPos?: number;
  playerLastMain?: ActionType;
  playerLastSub?: SubAction;
  playerMagicAvailable?: boolean;
  playerItemAvailable?: boolean;
  turnCount?: number;
  bossPattern?: 'wrath' | 'riposte' | 'judge' | 'king';
}

function biasedProbs<T extends string>(
  actual: T, keys: T[], baseWeights: number[],
): Record<T, number> {
  const bias = 0.35 + Math.random() * 0.30;
  const raw: Record<string, number> = {};
  keys.forEach((k, i) => { raw[k] = baseWeights[i] * (1 - bias); });
  raw[actual] = (raw[actual] ?? 0) + bias;
  const total = Object.values(raw).reduce((a, b) => a + b, 0);
  const result = {} as Record<T, number>;
  keys.forEach(k => { result[k] = Math.round(raw[k] / total * 100); });
  return result;
}

export function generateEnemyIntent(
  actionWeights: Record<ActionType, number>,
  ctx?: AIContext,
): EnemyIntent {
  const w = { ...actionWeights };

  if (ctx) {
    const {
      enemyHp, enemyMaxHp, playerHp, playerMaxHp,
      distance, enemyWeaponRange,
      playerLastMain, playerMagicAvailable, playerItemAvailable,
    } = ctx;
    const enemyHpRatio  = enemyHp  / Math.max(1, enemyMaxHp);
    const playerHpRatio = playerHp / Math.max(1, playerMaxHp);
    const outOfRange    = distance > enemyWeaponRange;
    const closeRange    = distance <= 2;

    // ── 체력 기반 ──────────────────────────────────────────────
    if (enemyHpRatio < 0.25) {
      // 위기: 도망 + 방어 위주
      w['방어'] = (w['방어'] ?? 0) + 50;
      w['이동'] = (w['이동'] ?? 0) + 30;
      w['공격'] = Math.max(5, (w['공격'] ?? 0) - 30);
    } else if (enemyHpRatio < 0.5) {
      w['방어'] = (w['방어'] ?? 0) + 25;
      w['이동'] = (w['이동'] ?? 0) + 10;
    }

    // 플레이어 체력 낮으면 공격적으로
    if (playerHpRatio < 0.25) {
      w['공격'] = (w['공격'] ?? 0) + 50;
      w['마법 사용'] = (w['마법 사용'] ?? 0) + 20;
      w['방어'] = Math.max(5, (w['방어'] ?? 0) - 20);
    } else if (playerHpRatio < 0.5) {
      w['공격'] = (w['공격'] ?? 0) + 25;
    }

    // ── 거리 기반 ──────────────────────────────────────────────
    if (outOfRange) {
      w['이동'] = (w['이동'] ?? 0) + 50;
      w['공격'] = Math.max(5, (w['공격'] ?? 0) - 25);
    } else if (closeRange) {
      w['공격']     = (w['공격']     ?? 0) + 25;
      w['마법 사용'] = Math.max(5, (w['마법 사용'] ?? 0) - 10); // 근거리 마법 약세
    } else {
      // 중거리: 마법 효율 높음
      w['마법 사용'] = (w['마법 사용'] ?? 0) + 15;
    }

    // ── 플레이어 패턴 카운터 ───────────────────────────────────
    if (playerLastMain === '공격') {
      // 플레이어가 공격했으면 방어로 받아치거나 이동으로 회피
      w['방어'] = (w['방어'] ?? 0) + 30;
      w['이동'] = (w['이동'] ?? 0) + 15;
    } else if (playerLastMain === '방어') {
      // 방어하면 이동이나 마법으로 우회
      w['이동']     = (w['이동']     ?? 0) + 25;
      w['마법 사용'] = (w['마법 사용'] ?? 0) + 20;
      w['공격']     = Math.max(5, (w['공격'] ?? 0) - 15);
    } else if (playerLastMain === '이동') {
      // 이동하면 공격으로 압박
      w['공격'] = (w['공격'] ?? 0) + 25;
    } else if (playerLastMain === '마법 사용') {
      // 마법은 이동으로 회피
      w['이동'] = (w['이동'] ?? 0) + 30;
    }

    // ── 플레이어 자원 파악 ─────────────────────────────────────
    if (!playerMagicAvailable) {
      // 마법 없으면 마법 카운터 서브를 골라도 위험 없음 → 공격적으로
      w['공격'] = (w['공격'] ?? 0) + 10;
    }
    if (!playerItemAvailable) {
      w['공격'] = (w['공격'] ?? 0) + 5;
    }

    // ── 보스 전용 패턴 ─────────────────────────────────────
    if (ctx.bossPattern === 'wrath' && enemyHpRatio < 0.5) {
      // 분노: HP 50% 이하에서 공격 가중치 2배
      w['공격'] = (w['공격'] ?? 0) * 2;
      w['마법 사용'] = (w['마법 사용'] ?? 0) + 20;
    }
    if (ctx.bossPattern === 'riposte' && ctx.playerLastMain === '방어') {
      // 반격: 플레이어가 방어하면 우회 행동
      w['이동']     = (w['이동']     ?? 0) + 60;
      w['마법 사용'] = (w['마법 사용'] ?? 0) + 40;
      w['공격'] = Math.max(5, (w['공격'] ?? 0) - 40);
    }
    if (ctx.bossPattern === 'judge' && ctx.playerLastMain) {
      // 심판관: 플레이어 마지막 메인 액션의 카운터
      const judgeCounter: Partial<Record<ActionType, ActionType>> = {
        '공격': '방어', '마법 사용': '이동', '이동': '공격',
        '방어': '마법 사용', '아이템 사용': '공격',
      };
      const counter = judgeCounter[ctx.playerLastMain];
      if (counter) w[counter] = (w[counter] ?? 0) + 80;
    }
    // 왕 패턴: 2페이즈는 컴포넌트에서 처리
  }

  const mainAction = rollActionFromWeights(w);
  const subs = SUB_ACTIONS[mainAction] as SubAction[];

  // ── 전략적 서브액션 선택 ──────────────────────────────────────
  let subAction: SubAction;

  if (mainAction === '이동' && ctx) {
    const { distance, enemyWeaponRange, playerRow, enemyRow, enemyPos } = ctx;
    const outOfRange = distance > enemyWeaponRange;
    const rowDiff    = playerRow !== enemyRow;

    // Filter physically impossible move subs
    const canAdvance = enemyPos === undefined || enemyPos > 1; // pos 1 = leftmost, can't advance further left
    const canRetreat = enemyPos === undefined || enemyPos < 5;
    const canMoveUp  = (ctx.enemyRow ?? 2) > COMBAT_ROW_MIN;
    const canMoveDown= (ctx.enemyRow ?? 2) < COMBAT_ROW_MAX;

    const possibleMoveSubs: MoveSub[] = (
      ['전진 압박', '후퇴', '위로 이동', '아래로 이동'] as MoveSub[]
    ).filter(s => {
      if (s === '전진 압박') return canAdvance;
      if (s === '후퇴')      return canRetreat;
      if (s === '위로 이동') return canMoveUp;
      if (s === '아래로 이동') return canMoveDown;
      return true;
    });
    const fallbackSub = possibleMoveSubs[0] ?? '후퇴';

    if (outOfRange && canAdvance) {
      subAction = '전진 압박';
    } else if (rowDiff) {
      const wantUp = playerRow < enemyRow;
      subAction = wantUp && canMoveUp ? '위로 이동'
        : !wantUp && canMoveDown ? '아래로 이동'
        : fallbackSub;
    } else if (distance <= 1 && canRetreat) {
      subAction = '후퇴';
    } else {
      const validSubs = possibleMoveSubs.length > 0 ? possibleMoveSubs : (['후퇴'] as MoveSub[]);
      subAction = validSubs[Math.floor(Math.random() * validSubs.length)];
    }

  } else if (mainAction === '공격' && ctx) {
    // 플레이어가 마법/아이템 없으면 해당 카운터 서브를 우선 선택
    const attackSubs: AttackSub[] = ['세로 베기', '가로 베기', '찌르기'];
    const { playerMagicAvailable } = ctx;
    // 플레이어가 막기 어려운 공격 우선 (카운터가 없는 서브)
    const hardToCounter = attackSubs.filter(s => {
      const counter = PERFECT_COUNTER[s];
      if (counter === '회복술' || counter === '빙결 창' || counter === '화염 쇄도' || counter === '암흑 속박')
        return !playerMagicAvailable;
      return false;
    });
    subAction = hardToCounter.length > 0 && Math.random() < 0.6
      ? hardToCounter[Math.floor(Math.random() * hardToCounter.length)]
      : subs[Math.floor(Math.random() * subs.length)];

  } else if (mainAction === '방어' && ctx?.playerLastSub) {
    // 플레이어 마지막 서브의 카운터를 방어 서브로 사용
    const idealCounter = PERFECT_COUNTER[ctx.playerLastSub] as SubAction | undefined;
    const defendSubs: SubAction[] = ['세로 막기', '올려막기', '가로 막기'];
    subAction = (idealCounter && defendSubs.includes(idealCounter))
      ? idealCounter
      : subs[Math.floor(Math.random() * subs.length)];

  } else {
    subAction = subs[Math.floor(Math.random() * subs.length)];
  }

  const mainKeys = Object.keys(actionWeights) as ActionType[];
  const mainProbs = biasedProbs(mainAction, mainKeys, mainKeys.map(k => actionWeights[k]));
  const subProbs  = biasedProbs(subAction, subs, subs.map(() => 1));
  return { mainAction, subAction, mainProbs, subProbs };
}

// ── Other helpers ────────────────────────────────────────────
export function rollActionFromWeights(weights: Record<ActionType, number>): ActionType {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (const [action, weight] of Object.entries(weights)) {
    rand -= weight;
    if (rand <= 0) return action as ActionType;
  }
  return '공격';
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateEnemy(floor: number, legacyCharacters: Character[], floorGhosts?: FloorGhosts, player?: Character): Character {
  // 해당 층에 저장된 유령이 있으면 항상 소환
  if (floorGhosts?.[floor]?.length) {
    const ghosts = floorGhosts[floor];
    const ghost = { ...ghosts[Math.floor(Math.random() * ghosts.length)] };
    ghost.hp = ghost.maxHp; ghost.mp = ghost.maxMp;
    ghost.stamina = ghost.maxStamina ?? 30;
    return ghost;
  }
  if (floor > 1 && legacyCharacters.length > 0 && Math.random() < 0.10) {
    const legacy = { ...legacyCharacters[Math.floor(Math.random() * legacyCharacters.length)] };
    legacy.hp = legacy.maxHp; legacy.mp = legacy.maxMp;
    return legacy;
  }
  // 1층: 플레이어 능력치 기반으로 비슷한 적 생성
  if (floor === 1 && player) {
    const rv = (base: number, variance: number) =>
      Math.max(1, base + Math.floor((Math.random() * 2 - 1) * variance));
    const ps = player.stats;
    const spell = MAGIC_SPELL_POOL[Math.floor(Math.random() * MAGIC_SPELL_POOL.length)];
    return {
      id: `floor1_rival_${Date.now()}`,
      name: '검사 신입', level: 1, condition: rollCondition(),
      stats: {
        strength:   rv(ps.strength,  Math.ceil(ps.strength  * 0.2)),
        agility:    rv(ps.agility,   Math.ceil(ps.agility   * 0.2)),
        elements: {
          fire:  rv(ps.elements.fire,  3),
          water: rv(ps.elements.water, 3),
          wind:  rv(ps.elements.wind,  3),
          earth: rv(ps.elements.earth, 3),
          dark:  rv(ps.elements.dark,  3),
        },
        armor:      rv(ps.armor,      Math.ceil(ps.armor     * 0.2)),
        critChance: rv(ps.critChance, Math.ceil(ps.critChance * 0.2)),
      },
      hp: Math.floor(player.maxHp * (0.85 + Math.random() * 0.3)),
      maxHp: Math.floor(player.maxHp * (0.85 + Math.random() * 0.3)),
      mp: player.maxMp, maxMp: player.maxMp,
      stamina: 20, maxStamina: 20,
      equipment: [], inventory: [], magicSlots: [spell],
      weaponRange: 1,
      titles: [], equippedTitle: null, isLegacy: false, isBoss: false,
      imageId: 'goblin',
      actionWeights: { '공격': 40, '이동': 25, '방어': 20, '마법 사용': 15, '아이템 사용': 0 },
      abilities: [],
    };
  }

  const eligible = ENEMY_TEMPLATES.filter(t => {
    if (t.maxFloor < floor) return false;
    if (t.minFloor > floor) return false;
    if (t.isBoss) return floor % 5 === 0;
    return true;
  });
  const template  = eligible[Math.floor(Math.random() * eligible.length)] ?? ENEMY_TEMPLATES[0];
  const scale     = 1 + (floor - 1) * 0.15;
  const chosenAbilities = shuffleArray(ENEMY_ABILITY_POOL).slice(0, Math.min(floor, ENEMY_ABILITY_POOL.length));
  const adjustedStats = { ...template.baseStats };
  let extraHp = 0;
  let extraMp = 0;
  const adjustedWeights = { ...template.actionWeights };

  chosenAbilities.forEach(a => {
    if (a.armor) adjustedStats.armor = Math.min(70, adjustedStats.armor + a.armor);
    if (a.agility) adjustedStats.agility += a.agility;
    if (a.critChance) adjustedStats.critChance += a.critChance;
    if (a.hp) extraHp += a.hp;
    if (a.mp) extraMp += a.mp;
    if (a.elementBonus) {
      Object.entries(a.elementBonus).forEach(([key, value]) => {
        (adjustedStats.elements as any)[key] += value as number;
      });
    }
    if (a.actionWeightBonus) {
      Object.entries(a.actionWeightBonus).forEach(([k, v]) => {
        adjustedWeights[k as ActionType] = (adjustedWeights[k as ActionType] ?? 0) + (v ?? 0);
      });
    }
  });

  const enemySpell = (template.actionWeights['마법 사용'] ?? 0) > 20 || floor >= 4
    ? [MAGIC_SPELL_POOL[Math.floor(Math.random() * MAGIC_SPELL_POOL.length)]]
    : [];
  const enemyRange = template.weaponRange ?? 1;

  return {
    id: `${template.id}_${floor}_${Date.now()}`,
    name: template.name, level: floor, condition: rollCondition(),
    stats: {
      strength:  Math.floor(adjustedStats.strength  * scale),
      agility:   Math.floor(adjustedStats.agility   * scale),
      elements:  (Object.fromEntries(Object.entries(adjustedStats.elements).map(([k,v])=>[k,Math.floor(v*scale)])) as unknown) as ElementStats,
      armor:     Math.min(adjustedStats.armor + floor, 70),
      critChance: adjustedStats.critChance,
    },
    hp: Math.floor((template.baseHp + extraHp) * scale), maxHp: Math.floor((template.baseHp + extraHp) * scale),
    mp: Math.max(0, template.baseMp + extraMp), maxMp: Math.max(0, template.baseMp + extraMp),
    stamina: Math.max(12, Math.floor(20 + floor)), maxStamina: Math.max(12, Math.floor(20 + floor)),
    equipment: [], inventory: [], magicSlots: enemySpell,
    weaponRange: enemyRange,
    titles: [], equippedTitle: null, isLegacy: false,
    isBoss: template.isBoss,
    bossPattern: template.bossPattern,
    imageId: template.id,
    actionWeights: adjustedWeights,
    abilities: chosenAbilities,
  };
}

export type StartBuild = 'default' | 'assassin' | 'magic_start' | 'arcane' | 'tank';

export interface SwordSchoolDefinition {
  id: StartBuild;
  name: string;
  description: string;
  bonusSummary: string;
  legacyName: string;
}

export const SWORD_SCHOOLS = swordSchools as SwordSchoolDefinition[];

export function getSwordSchool(id: StartBuild): SwordSchoolDefinition {
  return SWORD_SCHOOLS.find(s => s.id === id) ?? SWORD_SCHOOLS[0];
}

export function createPlayer(highScore: number, name: string = '검사', build: StartBuild = 'default'): Character {
  const school = getSwordSchool(build);
  const bonus = Math.floor(highScore * 0.1);
  const rand = (base: number, variance: number) =>
    base + bonus + Math.floor(Math.random() * variance * 2) - variance;
  const startSpell = MAGIC_SPELL_POOL[Math.floor(Math.random() * MAGIC_SPELL_POOL.length)];
  const base: Character = {
    id: 'player', name, level: 1,
    swordSchool: build,
    swordSchoolName: school.name,
    condition: 'normal',
    stats: {
      strength:  Math.max(10, rand(20, 5)),
      agility:   Math.max(8,  rand(15, 5)),
      elements:  {
        fire:  Math.max(5, rand(10, 4)),
        water: Math.max(5, rand(10, 4)),
        wind:  Math.max(5, rand(10, 4)),
        earth: Math.max(5, rand(10, 4)),
        dark:  Math.max(5, rand(10, 4)),
      },
      armor:     Math.max(5, rand(10, 4)),
      critChance: Math.max(5, rand(10, 4)),
    },
    hp: 90, maxHp: 90, mp: 45, maxMp: 45,
    stamina: 22, maxStamina: 22,
    equipment: [], inventory: [...STARTING_ITEMS], magicSlots: [startSpell], weaponRange: 1,
    titles: [{ ...(TITLES_DATA.find(t => t.id === 'novice') ?? TITLES_DATA[0]), equipped: true }],
    equippedTitle: 'novice',
  };

  switch (build) {
    case 'assassin':
      return {
        ...base,
        stats: { ...base.stats, agility: base.stats.agility + 10 },
        inventory: [
          { id:'healing_potion', name:'치유 물약', kind:'potion', description:'체력 25 회복', heal:25 },
          { id:'throwing_dagger', name:'단검 던지기', kind:'throwing', description:'원거리 단검 던지기', damage:12, range:4 },
          { id:'throwing_dagger2', name:'단검 던지기', kind:'throwing', description:'원거리 단검 던지기', damage:12, range:4 },
        ],
      };
    case 'magic_start': {
      const otherSpells = MAGIC_SPELL_POOL.filter(s => s !== base.magicSlots[0]);
      const startSpell2 = otherSpells[Math.floor(Math.random() * otherSpells.length)];
      return { ...base, magicSlots: [base.magicSlots[0], startSpell2] as typeof base.magicSlots };
    }
    case 'arcane':
      return {
        ...base,
        mp: 70, maxMp: 70,
        stats: { ...base.stats, strength: Math.max(5, base.stats.strength - 5) },
      };
    case 'tank':
      return {
        ...base,
        hp: 110, maxHp: 110,
        stats: {
          ...base.stats,
          armor: Math.min(70, base.stats.armor + 15),
          agility: Math.max(3, base.stats.agility - 8),
        },
      };
    default:
      return base;
  }
}

export const DEFAULT_ACTION_WEIGHTS: Record<ActionType, number> = {
  '공격': 40, '이동': 20, '방어': 20, '마법 사용': 20, '아이템 사용': 0,
};

export type UnlockKey =
  | 'unlock_assassin'
  | 'unlock_magic_start'
  | 'unlock_arcane'
  | 'unlock_tank'
  | 'unlock_hard_mode';

export interface UnlockCondition {
  key: UnlockKey;
  label: string;
  description: string;
  hint: string;
}

export const UNLOCK_CONDITIONS: UnlockCondition[] = [
  {
    key: 'unlock_assassin',
    label: '암살자 빌드',
    description: '시작 시 agility +10, 단검 던지기 2개로 시작',
    hint: '5층을 돌파하면 해금',
  },
  {
    key: 'unlock_magic_start',
    label: '이중 마법사 빌드',
    description: '시작 시 마법 슬롯 2개 (랜덤)',
    hint: '첫 보스를 처치하면 해금',
  },
  {
    key: 'unlock_arcane',
    label: '비전술사 빌드',
    description: '시작 시 MP 70, 마법 쿨다운 0, strength -5',
    hint: '10층을 돌파하면 해금',
  },
  {
    key: 'unlock_tank',
    label: '철벽 기사 빌드',
    description: '시작 시 armor +15, HP +20, agility -8',
    hint: '20층을 돌파하면 해금',
  },
  {
    key: 'unlock_hard_mode',
    label: '하드 모드',
    description: '모든 적 스탯 +20%. 대신 보상 장비 티어 +1',
    hint: '보스를 5마리 처치하면 해금',
  },
];

export interface SynergyBonus {
  strength?: number;
  agility?: number;
  armor?: number;
  critChance?: number;
  magicDamageBonus?: number;
  rangedDamageBonus?: number;
}

export interface SynergyDefinition {
  id: string;
  name: string;
  description: string;
  requiredTag: EquipmentTag;
  minCount: number;
  bonus: SynergyBonus;
}

export const SYNERGY_DEFINITIONS: SynergyDefinition[] = [
  {
    id: 'fire_mastery',
    name: '화염 지배자',
    description: '화염 계통 장비/칭호 2개 이상 → 마법 피해 +25%',
    requiredTag: 'fire',
    minCount: 2,
    bonus: { magicDamageBonus: 25 },
  },
  {
    id: 'swift_dancer',
    name: '신속의 무희',
    description: '민첩 계통 장비/칭호 2개 이상 → agility +10, 원거리 투척 피해 +15%',
    requiredTag: 'swift',
    minCount: 2,
    bonus: { agility: 10, rangedDamageBonus: 15 },
  },
  {
    id: 'iron_fortress',
    name: '철의 요새',
    description: '중장갑 계통 장비 2개 이상 → armor +12, strength +5',
    requiredTag: 'heavy',
    minCount: 2,
    bonus: { armor: 12, strength: 5 },
  },
  {
    id: 'dark_assassin',
    name: '암흑 자객',
    description: '암흑 계통 장비/칭호 2개 이상 → critChance +15',
    requiredTag: 'dark',
    minCount: 2,
    bonus: { critChance: 15 },
  },
  {
    id: 'wind_dancer',
    name: '바람의 춤꾼',
    description: '바람 계통 장비/칭호 2개 이상 → agility +8, 마법 피해 +15%',
    requiredTag: 'wind',
    minCount: 2,
    bonus: { agility: 8, magicDamageBonus: 15 },
  },
  {
    id: 'ice_king',
    name: '빙왕',
    description: '냉기 계통 장비/칭호 2개 이상 → strength +8, armor +8',
    requiredTag: 'ice',
    minCount: 2,
    bonus: { strength: 8, armor: 8 },
  },
];

export function getActiveSynergies(player: Character): SynergyDefinition[] {
  const equipTags: EquipmentTag[] = player.equipment.flatMap(e => e.tags ?? []);
  const titleTags: EquipmentTag[] = player.titles
    .filter(t => t.equipped)
    .flatMap(t => t.tags ?? []);
  const allTags = [...equipTags, ...titleTags];

  return SYNERGY_DEFINITIONS.filter(syn => {
    const count = allTags.filter(tag => tag === syn.requiredTag).length;
    return count >= syn.minCount;
  });
}

export function getEffectiveStatsWithSynergy(player: Character): {
  stats: Character['stats'];
  activeSynergies: SynergyDefinition[];
  magicDamageBonus: number;
  rangedDamageBonus: number;
} {
  const baseStats = getEffectiveStats(player);
  const synergies = getActiveSynergies(player);

  let magicDamageBonus = 0;
  let rangedDamageBonus = 0;
  const finalStats = { ...baseStats };

  synergies.forEach(syn => {
    if (syn.bonus.strength)   finalStats.strength   += syn.bonus.strength;
    if (syn.bonus.agility)    finalStats.agility    += syn.bonus.agility;
    if (syn.bonus.armor)      finalStats.armor       = Math.min(70, finalStats.armor + syn.bonus.armor);
    if (syn.bonus.critChance) finalStats.critChance += syn.bonus.critChance;
    if (syn.bonus.magicDamageBonus)  magicDamageBonus  += syn.bonus.magicDamageBonus;
    if (syn.bonus.rangedDamageBonus) rangedDamageBonus += syn.bonus.rangedDamageBonus;
  });

  return { stats: finalStats, activeSynergies: synergies, magicDamageBonus, rangedDamageBonus };
}
