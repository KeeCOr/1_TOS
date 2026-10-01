# Meta Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 런 간 잠금 해제 시스템과 장비/칭호 태그 시너지를 추가해 "더 오래 플레이할수록 선택지가 넓어지는" 메타 진행을 만든다.

**Architecture:** `gameData.ts`에 UnlockKey 타입, SynergyEffect 인터페이스, 태그 시스템을 추가한다. `SwordmastersAscent.tsx`에 localStorage 기반 잠금 해제 관리와 시작 화면 반영, 시너지 계산을 추가한다. 시너지는 `getEffectiveStats`를 대체하는 `getEffectiveStatsWithSynergy`로 분리해 기존 로직을 건드리지 않는다.

**Tech Stack:** TypeScript, React, localStorage

---

## 파일 변경 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/gameData.ts` | EquipmentTag, SynergyDefinition, getEffectiveStatsWithSynergy, UnlockKey, UNLOCK_CONDITIONS |
| `src/components/SwordmastersAscent.tsx` | loadUnlocks/saveUnlocks, 시작화면 unlock 표시, 시너지 계산 적용 |

---

## Task 1: 장비/칭호 태그 시스템 (gameData.ts)

**Files:**
- Modify: `src/lib/gameData.ts`

- [ ] **Step 1: EquipmentTag 타입 추가**

`gameData.ts`의 `Equipment` 인터페이스 바로 위에 추가:

```typescript
export type EquipmentTag =
  | 'fire'      // 화염 계통
  | 'ice'       // 냉기 계통
  | 'dark'      // 암흑 계통
  | 'wind'      // 바람 계통
  | 'ranged'    // 원거리 무기
  | 'heavy'     // 중장갑
  | 'swift';    // 경장 / 민첩 계열
```

- [ ] **Step 2: Equipment 인터페이스에 tags 필드 추가**

```typescript
export interface Equipment {
  id: string; name: string; type: 'weapon' | 'armor';
  stats: Partial<Character['stats']>; description: string;
  range?: number;
  tags?: EquipmentTag[]; // 시너지 판별용 태그
}
```

- [ ] **Step 3: Title 인터페이스에 tags 추가**

```typescript
export interface Title {
  id: TitleId; name: string; condition: string;
  bonus: Partial<Character['stats']>; equipped: boolean;
  tags?: EquipmentTag[];
}
```

- [ ] **Step 4: 기존 장비에 태그 추가**

`EQUIPMENT_POOL`의 각 항목에 `tags` 필드 추가:

```typescript
export const EQUIPMENT_POOL: Equipment[] = [
  { id:'iron_sword',   name:'철제 검',     type:'weapon', stats:{strength:10},  description:'기본 철제 검', range:2, tags:[] },
  { id:'swift_boots',  name:'신속의 장화', type:'armor',  stats:{agility:12},   description:'발이 빨라진다', tags:['swift'] },
  { id:'flame_blade',  name:'화염 도검',   type:'weapon',
    stats:{strength:8, elements:{fire:15,water:0,wind:0,earth:0,dark:0}}, description:'불꽃이 깃든 검', range:2, tags:['fire'] },
  { id:'throwing_knife', name:'투척 단검', type:'weapon', stats:{strength:6, agility:4}, description:'원거리 공격용 단검', range:4, tags:['ranged', 'swift'] },
  { id:'iron_shield',  name:'철제 방패',   type:'armor',  stats:{armor:15},     description:'강인한 방어력', tags:['heavy'] },
  { id:'shadow_cloak', name:'그림자 망토', type:'armor',
    stats:{agility:8, elements:{fire:0,water:0,wind:0,earth:0,dark:10}}, description:'암흑 속에 숨는다', tags:['dark', 'swift'] },
];

export const EQUIPMENT_POOL_T2: Equipment[] = [
  { id:'steel_sword',   name:'강철 대검',   type:'weapon', stats:{strength:18},  description:'묵직한 강철 대검', range:2, tags:['heavy'] },
  { id:'agile_armor',   name:'경량 갑옷',   type:'armor',  stats:{agility:14, armor:6}, description:'빠르고 가벼운 갑옷', tags:['swift'] },
  { id:'frost_blade',   name:'빙결 도검',   type:'weapon',
    stats:{strength:10, elements:{fire:0,water:22,wind:0,earth:0,dark:0}}, description:'얼음 기운이 깃든 검', range:2, tags:['ice'] },
  { id:'heavy_shield',  name:'중갑 방패',   type:'armor',  stats:{armor:22},     description:'두껍고 무거운 방패', tags:['heavy'] },
  { id:'wind_cloak',    name:'폭풍 망토',   type:'armor',
    stats:{agility:12, elements:{fire:0,water:0,wind:18,earth:0,dark:0}}, description:'바람을 타는 망토', tags:['wind', 'swift'] },
  { id:'thunder_blade', name:'뇌전 도검',   type:'weapon',
    stats:{strength:12, elements:{fire:0,water:0,wind:12,earth:0,dark:8}}, description:'번개가 깃든 검', range:2, tags:['wind', 'dark'] },
];

export const EQUIPMENT_POOL_T3: Equipment[] = [
  { id:'legendary_sword', name:'전설의 검',   type:'weapon', stats:{strength:28}, description:'탑의 전설로 불리는 검', range:3, tags:[] },
  { id:'master_armor',    name:'마스터 갑주', type:'armor',  stats:{armor:28, agility:10}, description:'최상급 장인의 작품', tags:['heavy'] },
  { id:'arcane_staff',    name:'비전 지팡이', type:'weapon',
    stats:{strength:6, elements:{fire:18,water:18,wind:18,earth:18,dark:18}}, description:'모든 속성이 깃든 지팡이', range:5, tags:['fire','ice','wind','dark'] },
  { id:'crimson_blade',   name:'홍염 대검',   type:'weapon',
    stats:{strength:22, elements:{fire:20,water:0,wind:0,earth:0,dark:0}}, description:'붉은 불꽃이 타오르는 대검', range:2, tags:['fire'] },
  { id:'void_armor',      name:'허공의 갑주', type:'armor',
    stats:{armor:20, agility:14, elements:{fire:0,water:0,wind:0,earth:0,dark:20}}, description:'어둠과 하나된 갑옷', tags:['dark', 'swift'] },
];
```

- [ ] **Step 5: 타입 검사**

```bash
cd C:/Development/1_TOS/swordmasters-ascent && npx tsc --noEmit
```

Expected: 오류 없음

---

## Task 2: SynergyDefinition + getEffectiveStatsWithSynergy

**Files:**
- Modify: `src/lib/gameData.ts`

- [ ] **Step 1: SynergyDefinition 타입 추가**

`ENEMY_ABILITY_POOL` 근처에 추가:

```typescript
export interface SynergyBonus {
  strength?: number;
  agility?: number;
  armor?: number;
  critChance?: number;
  magicDamageBonus?: number; // 마법 피해 배율 추가 (%)
  rangedDamageBonus?: number; // 원거리 투척 피해 배율 추가 (%)
}

export interface SynergyDefinition {
  id: string;
  name: string;
  description: string;
  /** 활성화 조건: 태그 배열 중 requiredTags를 모두 가진 장비/칭호 개수가 minCount 이상이면 활성화 */
  requiredTag: EquipmentTag;
  minCount: number; // 해당 태그를 가진 장비+칭호 개수
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
```

- [ ] **Step 2: 활성 시너지 계산 함수 추가**

```typescript
/** 플레이어의 장비+칭호 태그를 집계해 활성화된 시너지 목록 반환 */
export function getActiveSynergies(player: Character): SynergyDefinition[] {
  // 장비의 tags
  const equipTags: EquipmentTag[] = player.equipment.flatMap(e => e.tags ?? []);
  // 장착된 칭호의 tags
  const titleTags: EquipmentTag[] = player.titles
    .filter(t => t.equipped)
    .flatMap(t => t.tags ?? []);
  const allTags = [...equipTags, ...titleTags];

  return SYNERGY_DEFINITIONS.filter(syn => {
    const count = allTags.filter(tag => tag === syn.requiredTag).length;
    return count >= syn.minCount;
  });
}

/** 시너지 보너스가 적용된 effective stats 반환 */
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
```

- [ ] **Step 3: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

---

## Task 3: resolveTurn에 시너지 보너스 적용

**Files:**
- Modify: `src/lib/gameData.ts` — `resolveTurn` 함수 시그니처 + 내부

- [ ] **Step 1: resolveTurn 파라미터에 시너지 보너스 추가**

`resolveTurn` 함수 시그니처를 확장:

```typescript
export function resolveTurn(
  playerMain: ActionType, playerSub: SubAction,
  enemy: Character, intent: EnemyIntent,
  player: Character,
  playerPos: number, enemyPos: number,
  playerRow: number = COMBAT_ROW_DEFAULT,
  enemyRow:  number = COMBAT_ROW_DEFAULT,
  playerMagicBonus: number = 0,   // 시너지 마법 피해 추가 (%)
  playerRangedBonus: number = 0,  // 시너지 원거리 피해 추가 (%)
): TurnResult {
```

- [ ] **Step 2: 마법 데미지 계산에 magicBonus 적용**

`resolveTurn` 내부에서 마법 데미지 계산 블록 수정:

```typescript
    if (playerMain === '마법 사용') {
      if (magicMult > 0) {
        const sp = Math.floor(playerStats.strength * 0.7 + (player.stats.elements.fire + player.stats.elements.dark) * 0.3);
        const magicSynergyMult = 1 + playerMagicBonus / 100;
        damageDealt = Math.max(1, Math.floor(sp * magicMult * pDistMult * magicSynergyMult * (1 - eArmorRed)));
      }
    }
```

- [ ] **Step 3: 원거리 투척 데미지에 rangedBonus 적용**

```typescript
    } else if (playerSub === '단검 던지기') {
      const rangedSynergyMult = 1 + playerRangedBonus / 100;
      damageDealt = Math.max(1, Math.floor(playerStats.strength * 0.9 * pFinalMult * rangedSynergyMult * (1 - eArmorRed)));
    } else if (playerSub === '강화 단검') {
      const rangedSynergyMult = 1 + playerRangedBonus / 100;
      damageDealt = Math.max(1, Math.floor(playerStats.strength * 1.2 * pFinalMult * rangedSynergyMult * (1 - eArmorRed)));
    }
```

- [ ] **Step 4: 컴포넌트에서 resolveTurn 호출 시 시너지 보너스 전달**

`SwordmastersAscent.tsx`에서 `resolveTurn` 호출부를 수정:

```typescript
const { stats: synergyStats, magicDamageBonus, rangedDamageBonus } = getEffectiveStatsWithSynergy(player);
// (synergyStats는 표시용으로 사용, resolveTurn은 내부에서 getEffectiveStats를 직접 호출하므로
//  bonus만 전달하면 됨)

const result = resolveTurn(
  playerAction, playerSub,
  enemy, intent,
  player,
  playerPos, enemyPos,
  playerRow, enemyRow,
  magicDamageBonus,
  rangedDamageBonus,
);
```

- [ ] **Step 5: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

---

## Task 4: 메타 잠금 해제 시스템

**Files:**
- Modify: `src/lib/gameData.ts`
- Modify: `src/components/SwordmastersAscent.tsx`

- [ ] **Step 1: UnlockKey 타입 + UNLOCK_CONDITIONS 추가 (gameData.ts)**

```typescript
export type UnlockKey =
  | 'unlock_assassin'    // 5층 돌파 → 암살자 시작 빌드 해금
  | 'unlock_magic_start' // 첫 보스 처치 → 시작 마법 슬롯 2개 옵션
  | 'unlock_arcane'      // 10층 돌파 → 비전술사 시작 빌드 해금
  | 'unlock_tank'        // 20층 돌파 → 철벽 기사 시작 빌드 해금
  | 'unlock_hard_mode';  // 보스 5마리 처치 → 하드 모드 (적 스탯 +20%)

export interface UnlockCondition {
  key: UnlockKey;
  label: string;          // 해금 항목 이름
  description: string;    // 어떤 기능이 해금되는지
  hint: string;           // 해금 전 힌트 (조건 표시)
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
```

- [ ] **Step 2: createPlayer에 startBuild 파라미터 추가**

```typescript
export type StartBuild = 'default' | 'assassin' | 'magic_start' | 'arcane' | 'tank';

export function createPlayer(highScore: number, name: string = '검사', build: StartBuild = 'default'): Character {
  const bonus = Math.floor(highScore * 0.1);
  const rand = (base: number, variance: number) =>
    base + bonus + Math.floor(Math.random() * variance * 2) - variance;
  const startSpell = MAGIC_SPELL_POOL[Math.floor(Math.random() * MAGIC_SPELL_POOL.length)];
  const startSpell2 = MAGIC_SPELL_POOL[Math.floor(Math.random() * MAGIC_SPELL_POOL.length)];

  const base: Character = {
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
    case 'magic_start':
      return { ...base, magicSlots: [startSpell, startSpell2] };
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
```

- [ ] **Step 3: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

---

## Task 5: 컴포넌트 — 잠금 해제 관리 + 시작 화면

**Files:**
- Modify: `src/components/SwordmastersAscent.tsx`

- [ ] **Step 1: unlock 로드/저장 헬퍼 추가**

컴포넌트 파일 상단 상수 선언부에 추가:

```typescript
const UNLOCKS_KEY = 'swordmasters-unlocks';
const BOSS_COUNT_KEY = 'swordmasters-boss-count';

function loadUnlocks(): Set<UnlockKey> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(UNLOCKS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as UnlockKey[]);
  } catch { return new Set(); }
}

function saveUnlocks(unlocks: Set<UnlockKey>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(UNLOCKS_KEY, JSON.stringify([...unlocks]));
}

function loadBossCount(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(BOSS_COUNT_KEY) ?? '0', 10) || 0;
}

function saveBossCount(n: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BOSS_COUNT_KEY, String(n));
}
```

- [ ] **Step 2: StartBuild import 추가**

```typescript
import {
  // 기존...
  UnlockKey, StartBuild, UNLOCK_CONDITIONS,
  getActiveSynergies, getEffectiveStatsWithSynergy,
  SYNERGY_DEFINITIONS, SynergyDefinition,
} from '@/lib/gameData';
```

- [ ] **Step 3: 컴포넌트 state에 unlock + build 추가**

```typescript
const [unlockedKeys, setUnlockedKeys] = useState<Set<UnlockKey>>(() => loadUnlocks());
const [selectedBuild, setSelectedBuild] = useState<StartBuild>('default');
```

- [ ] **Step 4: 잠금 해제 조건 체크 함수**

```typescript
function checkAndUnlock(floor: number, bossKilled: boolean) {
  const updated = new Set(unlockedKeys);
  const bossCount = loadBossCount() + (bossKilled ? 1 : 0);
  if (bossKilled) saveBossCount(bossCount);

  if (floor >= 5)  updated.add('unlock_assassin');
  if (floor >= 10) updated.add('unlock_arcane');
  if (floor >= 20) updated.add('unlock_tank');
  if (bossKilled && bossCount >= 1) updated.add('unlock_magic_start');
  if (bossCount >= 5) updated.add('unlock_hard_mode');

  if (updated.size !== unlockedKeys.size) {
    setUnlockedKeys(updated);
    saveUnlocks(updated);
  }
}
```

- [ ] **Step 5: 층 클리어 / 보스 처치 시 체크 호출**

보스 처치 또는 층 클리어가 일어나는 핸들러(Task 4 Step 2의 `handleEnemyDefeated`)에 삽입:

```typescript
function handleEnemyDefeated() {
  const isBoss = enemy.isBoss;
  checkAndUnlock(floor, isBoss);
  // ... 기존 이벤트/보상 분기
}
```

- [ ] **Step 6: 시작 화면에 빌드 선택 UI 추가**

`phase === 'start'` 렌더링 블록에서 "새 게임" 버튼 근처에 추가:

```typescript
{/* 빌드 선택 (해금된 항목만 표시) */}
<div className="mt-4 mb-2">
  <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">시작 빌드</div>
  <div className="flex flex-col gap-2">
    {/* 기본 빌드 */}
    <button
      onClick={() => setSelectedBuild('default')}
      className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
        selectedBuild === 'default'
          ? 'border-yellow-600 bg-yellow-950/40 text-yellow-200'
          : 'border-gray-700/50 bg-gray-900/40 text-gray-400 hover:border-gray-600'
      }`}
    >
      <span className="font-bold">기본 검사</span>
      <span className="text-xs text-gray-500 ml-2">— 표준 능력치 시작</span>
    </button>

    {/* 해금된 빌드만 표시 */}
    {UNLOCK_CONDITIONS.filter(u => u.key !== 'unlock_hard_mode').map(uc => {
      const buildMap: Record<UnlockKey, StartBuild> = {
        unlock_assassin: 'assassin',
        unlock_magic_start: 'magic_start',
        unlock_arcane: 'arcane',
        unlock_tank: 'tank',
        unlock_hard_mode: 'default',
      };
      const isUnlocked = unlockedKeys.has(uc.key);
      const build = buildMap[uc.key];
      return (
        <button
          key={uc.key}
          disabled={!isUnlocked}
          onClick={() => isUnlocked && setSelectedBuild(build)}
          className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
            !isUnlocked
              ? 'border-gray-800/40 bg-gray-950/20 text-gray-700 cursor-not-allowed'
              : selectedBuild === build
              ? 'border-yellow-600 bg-yellow-950/40 text-yellow-200'
              : 'border-gray-700/50 bg-gray-900/40 text-gray-300 hover:border-gray-600'
          }`}
        >
          {isUnlocked ? (
            <>
              <span className="font-bold text-yellow-300">{uc.label}</span>
              <span className="text-xs text-gray-400 block mt-0.5">{uc.description}</span>
            </>
          ) : (
            <>
              <span className="font-bold text-gray-600">???</span>
              <span className="text-xs text-gray-700 block mt-0.5">{uc.hint}</span>
            </>
          )}
        </button>
      );
    })}
  </div>
</div>
```

- [ ] **Step 7: createPlayer 호출에 selectedBuild 전달**

`stat_roll` 또는 `naming` 화면에서 `createPlayer` 호출 시 빌드 전달:

```typescript
// 기존:
// const player = createPlayer(highScore, playerName);
// 수정:
const player = createPlayer(highScore, playerName, selectedBuild);
```

---

## Task 6: 시너지 UI 표시

**Files:**
- Modify: `src/components/SwordmastersAscent.tsx`

- [ ] **Step 1: 활성 시너지 배지 표시**

전투 화면 어딘가(플레이어 스탯 패널 또는 장비 표시 영역)에 활성 시너지 표시 추가:

```typescript
{/* 활성 시너지 배지 */}
{(() => {
  const synergies = getActiveSynergies(player);
  if (synergies.length === 0) return null;
  return (
    <div className="flex gap-1 flex-wrap mt-1">
      {synergies.map(syn => (
        <span key={syn.id}
          className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-700/40 font-bold"
          title={syn.description}
        >
          ✦ {syn.name}
        </span>
      ))}
    </div>
  );
})()}
```

- [ ] **Step 2: 최종 빌드**

```bash
npm run dist
```

Expected: 빌드 성공, 버전 번호 출력

---

## 자가 검토 체크리스트

- [x] `tags` 필드가 모두 optional — 기존 세이브 데이터 호환
- [x] `getEffectiveStatsWithSynergy`는 기존 `getEffectiveStats`를 내부 호출 — 중복 없음
- [x] `resolveTurn`의 새 파라미터 `playerMagicBonus`, `playerRangedBonus` 기본값 0 — 기존 호출부 변경 불필요
- [x] `StartBuild`를 `createPlayer`에 추가하되 기본값 `'default'` — 기존 호출부 영향 없음
- [x] unlock 조건은 누적(Set) 방식 — 중복 저장 없음
- [x] `unlock_hard_mode` 빌드 선택 UI에서 제외 (하드 모드는 별도 체크박스로 구현 가능)
- [x] 시너지 보너스는 전투 중 계산 — 세이브 데이터에 저장 불필요
