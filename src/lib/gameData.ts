// ============================================================
// GAME DATA
// ============================================================

export type ActionType   = '공격' | '이동' | '방어' | '마법 사용' | '아이템 사용';
export type GamePhase    = 'start' | 'tutorial' | 'naming' | 'stat_roll' | 'battle' | 'reward' | 'gameover';
export type TitleId      = 'weapon_breaker' | 'tower_climber' | 'boss_slayer' | 'magic_adept' | 'survivor' | 'novice';
export type MatchQuality = 'perfect' | 'partial' | 'miss';
export type CombatStep   = 'select_main' | 'select_sub' | 'rolling' | 'result';
export type DiceMode     = 'highest' | 'sum';   // sum = 합산 크리티컬
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
    case 'bad':       return 0.85;
    case 'terrible':  return 0.70;
    default:          return 1.00;
  }
}

// ── Sub-actions ──────────────────────────────────────────────
export type AttackSub = '세로 베기' | '가로 베기' | '찌르기';
export type DefendSub = '정면 막기' | '올려막기' | '흘려막기';
export type MoveSub   = '전진 압박' | '후퇴' | '위로 이동' | '아래로 이동';
export type ItemSub   = '치유 물약' | '단검 던지기';
export type MagicSpell = '화염 쇄도' | '암흑 속박' | '회복술' | '빙결 창';
export type SubAction = AttackSub | DefendSub | MoveSub | ItemSub | MagicSpell;

export const MAGIC_SPELL_POOL: MagicSpell[] = ['화염 쇄도', '암흑 속박', '회복술', '빙결 창'];
export const STARTING_ITEMS: Item[] = [
  { id:'healing_potion', name:'치유 물약', kind:'potion', description:'체력 25 회복', heal:25 },
  { id:'throwing_dagger', name:'단검 던지기', kind:'throwing', description:'원거리 단검 던지기', damage:12, range:4 },
];

export const SUB_ACTIONS: Record<ActionType, SubAction[]> = {
  '공격':     ['세로 베기', '가로 베기', '찌르기'],
  '방어':     ['정면 막기', '올려막기', '흘려막기'],
  '이동':     ['전진 압박', '후퇴', '위로 이동', '아래로 이동'],
  '마법 사용': [...MAGIC_SPELL_POOL],
  '아이템 사용': ['치유 물약', '단검 던지기'],
};

export const PERFECT_COUNTER: Record<SubAction, SubAction> = {
  '세로 베기':  '정면 막기',
  '가로 베기':  '올려막기',
  '찌르기':     '흘려막기',
  '정면 막기':  '찌르기',
  '올려막기':   '가로 베기',
  '흘려막기':   '세로 베기',
  '전진 압박':  '위로 이동',
  '후퇴':       '전진 압박',
  '위로 이동':  '아래로 이동',
  '아래로 이동':'위로 이동',
  '화염 쇄도':  '위로 이동',
  '암흑 속박':  '흘려막기',
  '회복술':     '세로 베기',
  '빙결 창':     '후퇴',
  '치유 물약':  '전진 압박',
  '단검 던지기':'정면 막기',
};

export const SUB_ACTION_INFO: Record<SubAction, { desc: string; counter: string; hint: string }> = {
  '세로 베기':  { desc: '강력한 내리치기',   counter: '→ 정면 막기', hint: '검을 머리 위로 높이 들어올렸다' },
  '가로 베기':  { desc: '옆으로 베기+경직',  counter: '→ 올려막기', hint: '검을 옆으로 크게 벌리며 자세를 낮췄다' },
  '찌르기':     { desc: '빠른 찌르기',       counter: '→ 흘려막기', hint: '검 끝을 앞으로 겨냥하며 중심을 낮췄다' },
  '정면 막기':  { desc: '정면 방어',         counter: '→ 찌르기',   hint: '검을 수직으로 세워 정면을 가렸다' },
  '올려막기':   { desc: '위쪽으로 막기',     counter: '→ 가로 베기',hint: '검날을 비스듬히 들어올려 위를 막았다' },
  '흘려막기':   { desc: '힘을 흘려보내기',   counter: '→ 세로 베기',hint: '검을 옆으로 기울이며 흘려보낼 준비를 했다' },
  '전진 압박':  { desc: '거리 -1 압박',      counter: '→ 위로 이동',hint: '발을 크게 내딛으며 앞으로 밀어붙였다' },
  '후퇴':       { desc: '거리 +1 후퇴',      counter: '→ 전진 압박',hint: '뒷발을 당기며 거리를 벌렸다' },
  '위로 이동':  { desc: '위 행으로 이동',    counter: '→ 아래로 이동', hint: '옆으로 크게 발을 옮기며 위치를 바꿨다' },
  '아래로 이동':{ desc: '아래 행으로 이동',  counter: '→ 위로 이동', hint: '낮게 자세를 잡으며 아래쪽으로 이동했다' },
  '화염 쇄도':  { desc: '화염 마법 공격',    counter: '→ 위로 이동',hint: '손바닥에 붉은 불꽃이 피어오르기 시작했다' },
  '암흑 속박':  { desc: '속박 마법',         counter: '→ 흘려막기', hint: '손끝에서 검은 연기가 소용돌이치기 시작했다' },
  '회복술':     { desc: '체력 회복',         counter: '→ 세로 베기', hint: '몸 주위에 희미한 빛이 감돌기 시작했다' },
  '빙결 창':    { desc: '얼음 창을 던진다',  counter: '→ 후퇴',     hint: '팔을 들어올리며 차가운 기운이 모였다' },
  '치유 물약':  { desc: '체력 회복 물약 사용', counter: '→ 전진 압박', hint: '허리춤에서 무언가를 꺼내 들었다' },
  '단검 던지기':{ desc: '원거리 단검 공격',  counter: '→ 정면 막기', hint: '작은 단검을 손에 쥐고 팔을 뒤로 당겼다' },
};

// ── Distance ─────────────────────────────────────────────────
export const DISTANCE_LABELS: Record<number, string> = {
  1: '밀착', 2: '근접', 3: '중거리', 4: '원거리', 5: '최원거리',
};
export const DISTANCE_COLORS: Record<number, string> = {
  1: 'text-red-400', 2: 'text-orange-400', 3: 'text-yellow-400',
  4: 'text-blue-400', 5: 'text-purple-400',
};

// How sub-actions change distance
export const SUB_DISTANCE_DELTA: Partial<Record<SubAction, number>> = {
  '전진 압박': -1,
  '후퇴':      +1,
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

/** 사정거리 이내라면 행 차이에 관계없이 명중 */
export function isAttackHitByRow(
  _action: ActionType, _attackerRow: number, _defenderRow: number,
): boolean {
  return true;
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

export function getStaminaDelta(action: ActionType): number {
  switch (action) {
    case '이동':      return 4;   // 이동 회복량 감소 — 더 적극적 이동 필요
    case '방어':      return -6;
    case '공격':      return -13;
    case '마법 사용': return -16;
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

  // Prevent overlap (must maintain at least 1 gap)
  if (np >= ne) {
    if (pDelta !== 0 && eDelta === 0) np = ne - 1;       // only player moved → revert player
    else if (eDelta !== 0 && pDelta === 0) ne = np + 1;  // only enemy moved → push enemy back
    else if (pDelta < 0 && eDelta < 0) {
      // Both advancing toward each other — player's advance takes priority
      ne = enemyPos;                                     // undo enemy advance
      if (np >= ne) np = ne - 1;                         // still blocked → player also can't advance
    } else { np = playerPos; ne = enemyPos; }            // other conflict → neither moves
  }

  np = Math.max(1, Math.min(5, np));
  ne = Math.max(1, Math.min(5, ne));
  if (np >= ne) { np = playerPos; ne = enemyPos; }       // safety fallback

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

export interface DiceResult {
  rolls:     number[];
  kept:      number;        // highest single die
  sum:       number;        // sum of all dice
  mode:      DiceMode;      // 'highest' or 'sum'
  value:     number;        // the actually-used value (kept or sum)
  diceCount: number;
}

export interface TurnResult {
  quality:       MatchQuality;
  baseOutcome:   string;
  playerDice:    DiceResult;
  enemyDice:     DiceResult;
  damageTaken:   number;
  damageDealt:   number;
  healAmount?:   number;
  isCritical:    boolean;
  message:       string;
  newDistance:   number;
  newPlayerPos:  number;
  newEnemyPos:   number;
  newPlayerRow:  number;
  newEnemyRow:   number;
  playerRowMiss: boolean;
  enemyRowMiss:  boolean;
}

// ── Structural types ─────────────────────────────────────────
export interface ElementStats {
  fire: number; water: number; wind: number; earth: number; dark: number;
}

export interface Equipment {
  id: string; name: string; type: 'weapon' | 'armor';
  stats: Partial<Character['stats']>; description: string;
  range?: number;
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
  isLegacy?: boolean;
  isBoss?: boolean;
  actionWeights?: Record<ActionType, number>;
}

// 층별 유령 저장 타입 (전체 게임 공유)
export type FloorGhosts = Record<number, Character[]>;

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
  },
  {
    id:'elder_boss', name:'검사 원로', minFloor:10, maxFloor:99, isBoss:true,
    baseStats:{ strength:72, agility:58, elements:{fire:28,water:28,wind:28,earth:28,dark:28}, armor:38, critChance:28 },
    baseHp:320, baseMp:130,
    actionWeights:{'공격':25,'이동':20,'방어':25,'마법 사용':30,'아이템 사용':0},
    description:'탑의 수호자 검사 원로',
    weaponRange: 3,
  },
];

export const EQUIPMENT_POOL: Equipment[] = [
  { id:'iron_sword',   name:'철제 검',       type:'weapon', stats:{strength:10}, description:'기본 철제 검', range:2 },
  { id:'swift_boots',  name:'신속의 장화',   type:'armor',  stats:{agility:12},  description:'발이 빨라진다' },
  { id:'flame_blade',  name:'화염 도검',     type:'weapon',
    stats:{strength:8, elements:{fire:15,water:0,wind:0,earth:0,dark:0}}, description:'불꽃이 깃든 검', range:2 },
  { id:'throwing_knife', name:'투척 단검',   type:'weapon', stats:{strength:6, agility:4}, description:'원거리 공격용 단검', range:4 },
  { id:'iron_shield',  name:'철제 방패',     type:'armor',  stats:{armor:15},    description:'강인한 방어력' },
  { id:'shadow_cloak', name:'그림자 망토',   type:'armor',
    stats:{agility:8, elements:{fire:0,water:0,wind:0,earth:0,dark:10}}, description:'암흑 속에 숨는다' },
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

export function getMagicCostByProgress(floor: number, player: Character): number {
  return floor >= 10 ? 8 : 10;
}

export function getMagicRegenByProgress(floor: number, player: Character): number {
  return floor >= 10 ? 10 : 8;
}

export function getMagicHint(floor: number, player: Character): string {
  const cooldown = getMagicCooldownByProgress(floor, player);
  if (cooldown === 0) return '마법이 즉시 준비됩니다.';
  return '마법 시전 후 1턴 대기';
}

// ── Dice ─────────────────────────────────────────────────────
export const DICE_FACE = ['','⚀','⚁','⚂','⚃','⚄','⚅'];

export function rollDice(count: number): number[] {
  return Array.from({ length: Math.max(1, count) }, () => Math.floor(Math.random() * 6) + 1);
}

export function rollWithAdvantage(count: number): DiceResult {
  const rolls = rollDice(count);
  const kept  = Math.max(...rolls);
  const sum   = rolls.reduce((a, b) => a + b, 0);
  // Sum mode (합산 크리티컬): ALL dice are 4+
  const mode: DiceMode = rolls.every(v => v >= 4) ? 'sum' : 'highest';
  const value = mode === 'sum' ? sum : kept;
  return { rolls, kept, sum, mode, value, diceCount: count };
}

/** Damage multiplier from dice result */
export function diceMultiplier(dr: DiceResult): number {
  if (dr.mode === 'sum') {
    // sum ranges from diceCount*4 to diceCount*6
    const min = dr.diceCount * 4;
    const max = dr.diceCount * 6;
    const ratio = (dr.sum - min) / Math.max(1, max - min); // 0 to 1
    return 1.4 + ratio * 1.4; // 1.4× to 2.8×
  }
  return ([0, 0.4, 0.6, 0.8, 1.0, 1.35, 1.8] as const)[dr.kept] ?? 1.0;
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
  playerSub: SubAction, enemySub: SubAction, baseOutcome: string,
): MatchQuality {
  if (baseOutcome === 'lose') return 'miss';
  return PERFECT_COUNTER[enemySub] === playerSub ? 'perfect' : 'partial';
}

// ── Full turn resolution ─────────────────────────────────────
export function resolveTurn(
  playerMain: ActionType, playerSub: SubAction,
  enemy: Character, intent: EnemyIntent,
  player: Character,
  playerPos: number, enemyPos: number,
  playerRow: number = COMBAT_ROW_DEFAULT,
  enemyRow:  number = COMBAT_ROW_DEFAULT,
): TurnResult {
  const distance = enemyPos - playerPos;
  const key = `${playerMain}-${intent.mainAction}` as OutcomeKey;
  const [playerOutcome] = ACTION_TABLE[key];

  const quality = getMatchQuality(playerSub, intent.subAction, playerOutcome);
  const playerStats = getEffectiveStats(player);
  const enemyStats = getEffectiveStats(enemy);
  const playerWeaponRange = player.weaponRange ?? 1;
  const enemyWeaponRange = enemy.weaponRange ?? 1;
  const playerItemRange = playerMain === '아이템 사용' && playerSub === '단검 던지기' ? 4 : 0;
  const playerInRange = playerMain !== '공격' || distance <= playerWeaponRange;
  const enemyInRange = intent.mainAction !== '공격' || distance <= enemyWeaponRange;
  const itemCanHit = playerMain === '아이템 사용' && playerSub === '단검 던지기' ? distance <= playerItemRange : true;

  // Distance bonus multipliers
  const pDistMult = distanceBonus(playerMain, distance);
  const eDistMult = distanceBonus(intent.mainAction, distance);

  // Dice counts
  let pDice = getDiceCount(playerStats.strength, enemyStats.strength);
  let eDice = getDiceCount(enemyStats.strength, playerStats.strength);
  const agiRatio = playerStats.agility / Math.max(1, enemyStats.agility);

  if (quality === 'perfect') pDice = Math.min(5, pDice + 1);
  if (quality === 'miss')    pDice = Math.max(1, pDice - 1);
  if ((playerMain === '방어' || playerMain === '이동') && agiRatio >= 1.4)
    pDice = Math.min(5, pDice + 1);

  const playerDice = rollWithAdvantage(pDice);
  const enemyDice  = rollWithAdvantage(eDice);

  const pMult = diceMultiplier(playerDice) * pDistMult;
  const eMult = diceMultiplier(enemyDice)  * eDistMult;

  const pArmorRed = playerStats.armor / 100;
  const eArmorRed = enemyStats.armor  / 100;

  let damageDealt = 0, damageTaken = 0;
  let isCritical = false;
  let message = '';

  switch (playerOutcome) {
    case 'win': {
      if (playerMain === '이동') {
        damageDealt = 0;
        message = '위치 선점 성공 — 거리 조절';
      } else if (playerMain === '아이템 사용') {
        if (playerSub === '단검 던지기') {
          if (!itemCanHit) {
            damageDealt = 0;
            message = '단검이 사정 거리 밖으로 벗어났다';
          } else {
            damageDealt = Math.max(1, Math.floor(playerStats.strength * 0.9 * pMult * (1 - eArmorRed)));
            isCritical = playerDice.mode === 'sum';
            message = quality === 'perfect' ? '단검이 치명타로 명중!' : '단검이 적중했다';
          }
        } else {
          damageDealt = 0;
          message = '치유 물약을 사용했다';
        }
      } else {
        const spellPower = playerMain === '마법 사용'
          ? Math.floor(playerStats.strength * 0.7 + (player.stats.elements.fire + player.stats.elements.dark) * 0.3)
          : playerStats.strength;
        damageDealt = Math.max(1, Math.floor(spellPower * pMult * (1 - eArmorRed)));
        isCritical = playerDice.mode === 'sum';
        if (playerMain === '마법 사용') {
          message = quality === 'perfect' ? '마법 폭발! 강력한 일격' : '마법으로 적중';
          if (isCritical) message = '마법 합산 크리티컬! 🔥';
        } else {
          message = quality === 'perfect' ? '완벽 대응! 직격!' : '공격 성공';
          if (isCritical) message = '합산 크리티컬! 🔥';
        }
      }
      break;
    }
    case 'lose': {
      if (intent.mainAction === '이동') {
        damageTaken = 0;
        message = '적이 위치를 바꿨다';
      } else if (intent.mainAction === '공격' && !enemyInRange) {
        damageTaken = 0;
        message = '적의 공격이 사정 거리 밖으로 벗어났다';
      } else {
        const red = quality === 'perfect' ? 0.4 : quality === 'partial' ? 0.7 : 1.0;
        damageTaken = Math.max(1, Math.floor(enemyStats.strength * eMult * red * (1 - pArmorRed)));
        isCritical = enemyDice.mode === 'sum';
        message = quality === 'perfect' ? '반응 방어 — 피해 감소' : '피격!';
      }
      break;
    }
    case 'block': {
      if (playerMain === '방어') {
        const strengthGap = enemyStats.strength / Math.max(1, playerStats.strength);
        if (quality === 'perfect') {
          if (strengthGap > 1.1) {
            damageTaken = Math.max(1, Math.floor(enemyStats.strength * eMult * 0.25 * (1 - pArmorRed)));
            message = '방어했지만 힘이 부족해 일부 피해';
          } else {
            damageDealt = Math.max(1, Math.floor(playerStats.strength * 0.6 * pMult * (1 - eArmorRed)));
            message = '완벽 차단 + 반격!';
          }
        } else if (quality === 'partial') {
          damageTaken = Math.max(1, Math.floor(enemyStats.strength * eMult * 0.35 * (1 - pArmorRed)));
          message = '방어 성공 (일부 피해)';
        } else {
          damageTaken = Math.max(1, Math.floor(enemyStats.strength * eMult * 0.6 * (1 - pArmorRed)));
          message = '방어 실패!';
        }
      } else {
        if (quality === 'perfect') {
          damageDealt = Math.max(1, Math.floor(playerStats.strength * pMult * 0.8 * (1 - eArmorRed)));
          message = '가드 파괴!';
        } else if (quality === 'partial') {
          damageDealt = Math.max(1, Math.floor(playerStats.strength * pMult * 0.3 * (1 - eArmorRed)));
          message = '방어를 일부 뚫었다';
        } else {
          message = '공격이 완전히 막혔다!';
        }
      }
      break;
    }
    case 'draw': {
      // 단검 던지기 vs 적 전진 압박 — 교전 draw지만 단검은 이동 중인 적에게 효과 없음
      if (playerMain === '아이템 사용' && playerSub === '단검 던지기' && intent.mainAction === '이동') {
        damageDealt = 0;
        message = '단검을 던졌지만 전진하는 적의 기세에 밀려 빗나갔다';
        break;
      }
      // 공격/마법 행동만 draw에서 피해를 줄 수 있음 — 이동·방어·아이템은 데미지 없음
      const playerDealsInDraw = playerMain === '공격' || playerMain === '마법 사용'
        || (playerMain === '아이템 사용' && playerSub === '단검 던지기');
      const enemyDealsInDraw  = intent.mainAction === '공격' || intent.mainAction === '마법 사용';

      if (playerDealsInDraw || enemyDealsInDraw) {
        const agiDiff  = playerStats.agility - enemyStats.agility;
        const bigSpeed = Math.abs(agiDiff) >= 12; // 민첩 차이가 크면 선제권

        if (bigSpeed) {
          // 민첩 우세 → 빠른 쪽이 선제 타격, 느린 쪽은 반격 감소
          const playerFaster = agiDiff > 0;
          if (playerFaster) {
            if (playerDealsInDraw && playerInRange)
              damageDealt = Math.max(1, Math.floor(playerStats.strength * pMult * 0.85 * (1 - eArmorRed)));
            if (enemyDealsInDraw && enemyInRange)
              damageTaken = Math.max(1, Math.floor(enemyStats.strength * eMult * 0.25 * (1 - pArmorRed)));
            message = '민첩 우세 — 선제 공격!';
          } else {
            if (playerDealsInDraw && playerInRange)
              damageDealt = Math.max(1, Math.floor(playerStats.strength * pMult * 0.25 * (1 - eArmorRed)));
            if (enemyDealsInDraw && enemyInRange)
              damageTaken = Math.max(1, Math.floor(enemyStats.strength * eMult * 0.85 * (1 - pArmorRed)));
            message = '적의 민첩 우세 — 선제 당함!';
          }
        } else {
          // 속도 비슷 → 힘 주사위로 승부
          const pVal     = playerDice.value;
          const eVal     = enemyDice.value;
          const diceDiff = pVal - eVal;
          if (diceDiff > 2) {
            // 힘 주사위 플레이어 우세
            if (playerDealsInDraw && playerInRange)
              damageDealt = Math.max(1, Math.floor(playerStats.strength * pMult * 0.80 * (1 - eArmorRed)));
            if (enemyDealsInDraw && enemyInRange)
              damageTaken = Math.max(1, Math.floor(enemyStats.strength * eMult * 0.20 * (1 - pArmorRed)));
            message = '힘 주사위 우세 — 교전 승리!';
          } else if (diceDiff < -2) {
            // 힘 주사위 적 우세
            if (playerDealsInDraw && playerInRange)
              damageDealt = Math.max(1, Math.floor(playerStats.strength * pMult * 0.20 * (1 - eArmorRed)));
            if (enemyDealsInDraw && enemyInRange)
              damageTaken = Math.max(1, Math.floor(enemyStats.strength * eMult * 0.80 * (1 - pArmorRed)));
            message = '힘 주사위 열세 — 교전 패배!';
          } else {
            // 팽팽한 교전
            if (playerDealsInDraw && playerInRange)
              damageDealt = Math.max(1, Math.floor(playerStats.strength * pMult * 0.50 * (1 - eArmorRed)));
            if (enemyDealsInDraw && enemyInRange)
              damageTaken = Math.max(1, Math.floor(enemyStats.strength * eMult * 0.50 * (1 - pArmorRed)));
            message = '팽팽한 교전 — 서로 피해';
          }
        }

        if (quality === 'perfect') {
          if (damageDealt > 0) damageDealt = Math.floor(damageDealt * 1.3);
          if (damageTaken  > 0) damageTaken  = Math.floor(damageTaken  * 0.7);
        }
      }

      if (damageDealt === 0 && damageTaken === 0) {
        message = '서로 위치를 조정했다';
      }
      break;
    }
  }

  // Out-of-range override: attacking out of range always misses completely
  if (playerMain === '공격' && !playerInRange) {
    damageDealt = 0;
    message = '⚠ 사정거리 밖! 공격이 완전히 빗나갔다';
  }
  if (intent.mainAction === '공격' && !enemyInRange) {
    damageTaken = 0;
    if (!message || message === '교전 — 서로 피해') {
      message = '적의 공격이 사정거리 밖 — 빗나갔다';
    }
  }

  const { playerPos: newPlayerPos, enemyPos: newEnemyPos } =
    calcNewPositions(playerSub, intent.subAction, playerPos, enemyPos);
  const newDistance = newEnemyPos - newPlayerPos;

  // ── 행(Y축) 이동 및 miss 판정 ────────────────────────────────
  const newPlayerRow = calcNewRow(playerSub, playerRow);
  const newEnemyRow  = calcNewRow(intent.subAction, enemyRow);

  // 행 이동은 동시에 발생 → 이동 후 위치(newRow)로 miss 판정
  // 공격은 같은 행에만 명중 (마법·아이템은 행 무관)
  const playerRowMiss = !isAttackHitByRow(playerMain, newPlayerRow, newEnemyRow);
  const enemyRowMiss  = !isAttackHitByRow(intent.mainAction, newEnemyRow, newPlayerRow);

  if (playerRowMiss && damageDealt > 0) {
    damageDealt = 0;
    message = '행 이동으로 공격이 빗나갔다!';
  }
  if (enemyRowMiss && damageTaken > 0) {
    damageTaken = 0;
    message += message ? ' (행 이동으로 회피!)' : '행 이동으로 회피!';
  }

  if (playerMain === '아이템 사용' && playerSub === '치유 물약') {
    return {
      quality, baseOutcome: playerOutcome,
      playerDice, enemyDice,
      damageTaken, damageDealt,
      healAmount: 25,
      isCritical, message: '치유 물약으로 회복',
      newDistance, newPlayerPos, newEnemyPos,
      newPlayerRow, newEnemyRow, playerRowMiss, enemyRowMiss,
    };
  }

  return {
    quality, baseOutcome: playerOutcome,
    playerDice, enemyDice,
    damageTaken, damageDealt, isCritical, message,
    newDistance, newPlayerPos, newEnemyPos,
    newPlayerRow, newEnemyRow, playerRowMiss, enemyRowMiss,
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
    const defendSubs: SubAction[] = ['정면 막기', '올려막기', '흘려막기'];
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
      actionWeights: { '공격': 40, '이동': 25, '방어': 20, '마법 사용': 15, '아이템 사용': 0 },
      abilities: [],
    };
  }

  const eligible = ENEMY_TEMPLATES.filter(t => t.minFloor <= floor && (t.isBoss ? floor % 5 === 0 : !t.isBoss));
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
    actionWeights: adjustedWeights,
    abilities: chosenAbilities,
  };
}

export function createPlayer(highScore: number, name: string = '검사'): Character {
  const bonus = Math.floor(highScore * 0.1);
  const rand = (base: number, variance: number) =>
    base + bonus + Math.floor(Math.random() * variance * 2) - variance;
  const startSpell = MAGIC_SPELL_POOL[Math.floor(Math.random() * MAGIC_SPELL_POOL.length)];
  return {
    id: 'player', name, level: 1,
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
}

export const DEFAULT_ACTION_WEIGHTS: Record<ActionType, number> = {
  '공격': 40, '이동': 20, '방어': 20, '마법 사용': 20, '아이템 사용': 0,
};
