# Combat Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마법 부가효과 분리, 컨디션 완화, 뒤로 베기 강화, 신규 보스 2종 + 전용 AI 패턴을 추가해 전투 깊이를 늘린다.

**Architecture:** `gameData.ts`에 StatusEffect 타입과 보스 패턴 데이터를 추가하고, `resolveTurn` / `generateEnemyIntent`에 로직을 삽입한다. `SwordmastersAscent.tsx`는 StatusEffect 적용/만료 처리와 보스 2페이즈 UI만 담당한다.

**Tech Stack:** TypeScript, React, Next.js. 테스트는 `npx tsc --noEmit` 타입 검사 + 수동 인게임 확인.

---

## 파일 변경 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/gameData.ts` | StatusEffect 타입, Character 필드 추가, resolveTurn 마법 효과, 뒤로 베기 pushback, 컨디션 배수, 신규 보스, bossPattern AI |
| `src/components/SwordmastersAscent.tsx` | StatusEffect 적용/만료, bonusStamina 처리, 왕 2페이즈 부활, 효과 UI 표시 |

---

## Task 1: StatusEffect 타입 + Character 필드 추가

**Files:**
- Modify: `src/lib/gameData.ts` (Character 인터페이스 근처, 약 291~341번째 줄)

- [ ] **Step 1: StatusEffect 타입을 gameData.ts에 추가**

`src/lib/gameData.ts`의 `export interface FloatingText {` 바로 위에 삽입:

```typescript
export type StatusEffectType =
  | 'stamina_drain'   // 화염 쇄도: 다음 턴 적 스테미너 -5
  | 'movement_lock'   // 암흑 속박: 다음 턴 적 이동 불가
  | 'agility_debuff'  // 빙결 창: 적 agility 30% 감소 (1턴)
  | 'extra_speed_die' // 번개 일격: 다음 속도 주사위 +1
  | 'heal_regen';     // 회복술: 즉시 HP +15 (TurnResult로 전달)

export interface StatusEffect {
  type: StatusEffectType;
  duration: number; // 남은 턴 수 (1 = 다음 턴 적용 후 소멸)
  value: number;    // 효과 크기
}
```

- [ ] **Step 2: Character 인터페이스에 activeEffects 필드 추가**

`src/lib/gameData.ts`의 `Character` 인터페이스 `abilities?: EnemyAbility[];` 줄 바로 뒤에 추가:

```typescript
  activeEffects?: StatusEffect[];
  phase2Triggered?: boolean; // 보스 왕 2페이즈 전용
```

- [ ] **Step 3: TurnResult에 effect 결과 필드 추가**

`src/lib/gameData.ts`의 `TurnResult` 인터페이스에 아래 필드를 추가:

```typescript
  newEnemyEffects?: StatusEffect[]; // 이번 턴으로 적에게 걸리는 효과
  newPlayerEffects?: StatusEffect[]; // 이번 턴으로 플레이어에게 걸리는 효과
  bonusStamina?: number;            // 뒤로 베기 완벽 카운터 등 스테미너 보너스
```

- [ ] **Step 4: 타입 검사 통과 확인**

```bash
cd C:/Development/1_TOS/swordmasters-ascent && npx tsc --noEmit
```

Expected: 오류 없음 (기존 코드가 activeEffects를 optional로 선언했으므로)

---

## Task 2: 마법 부가효과 로직 (resolveTurn)

**Files:**
- Modify: `src/lib/gameData.ts` — `resolveTurn` 함수 내부

- [ ] **Step 1: 바람 쇄도 즉시 pushback 처리**

`resolveTurn` 안에서 `newEnemyPos` 계산 후(`const newDistance = finalEnemyPos - finalPlayerPos;` 줄 근처) 아래를 추가:

```typescript
  // 바람 쇄도 성공 시 즉시 적 1칸 밀어냄
  if (playerMain === '마법 사용' && playerSub === '바람 쇄도' && magicMult > 0 && damageDealt > 0) {
    finalEnemyPos = Math.min(5, finalEnemyPos + 1);
    message += ' — 바람에 밀려났다!';
  }
```

- [ ] **Step 2: 마법 부가효과 생성 로직 추가**

`return { ...base, damageTaken, damageDealt, message };` 바로 위에 삽입:

```typescript
  // 마법 성공 시 스펠별 부가효과 생성
  let newEnemyEffects: StatusEffect[] | undefined;
  let newPlayerEffects: StatusEffect[] | undefined;
  let extraHealAmount: number | undefined;

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
        extraHealAmount = 15;
        break;
    }
  }
```

- [ ] **Step 3: return 구문에 새 필드 포함**

기존 마지막 `return` 두 줄을 교체:

```typescript
  if (playerMain === '아이템 사용' && playerSub === '치유 물약') {
    return { ...base, damageTaken, damageDealt, healAmount: 25,
      newEnemyEffects, newPlayerEffects, bonusStamina: undefined,
      message: '치유 물약으로 회복' };
  }
  if (playerMain === '아이템 사용' && playerSub === '대형 치유 물약') {
    return { ...base, damageTaken, damageDealt, healAmount: 50,
      newEnemyEffects, newPlayerEffects, bonusStamina: undefined,
      message: '대형 치유 물약으로 대량 회복!' };
  }
  return {
    ...base,
    damageTaken,
    damageDealt,
    healAmount: extraHealAmount,
    newEnemyEffects,
    newPlayerEffects,
    bonusStamina: undefined,
    message,
  };
```

- [ ] **Step 4: active effects가 전투에 영향을 미치도록 resolveTurn 상단에 적용 코드 추가**

`resolveTurn` 함수 맨 위 `const distance = enemyPos - playerPos;` 바로 뒤에 삽입:

```typescript
  // ── 활성 상태효과 적용 ──────────────────────────────────────
  // movement_lock: 이 턴 적 이동 불가
  const enemyMoveLocked = (enemy.activeEffects ?? []).some(e => e.type === 'movement_lock');
  // agility_debuff: 적 민첩 30% 감소 (이미 getEffectiveStats 이후이므로 직접 패치)
  const enemyAgiDebuffed = (enemy.activeEffects ?? []).some(e => e.type === 'agility_debuff');
  // extra_speed_die: 플레이어 속도 주사위 +1
  const playerExtraSpeedDie = (player.activeEffects ?? []).some(e => e.type === 'extra_speed_die');
```

그 다음, `const pSpdDice = getDiceCount(playerStats.agility, enemyStats.agility);` 줄을 아래로 교체:

```typescript
  const pSpdDiceBase = getDiceCount(playerStats.agility,
    enemyAgiDebuffed ? Math.floor(enemyStats.agility * 0.7) : enemyStats.agility);
  const pSpdDice = Math.min(4, pSpdDiceBase + (playerExtraSpeedDie ? 1 : 0));
  const eSpdDice = enemyMoveLocked ? 0
    : getDiceCount(
        enemyAgiDebuffed ? Math.floor(enemyStats.agility * 0.7) : enemyStats.agility,
        playerStats.agility);
```

- [ ] **Step 5: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

---

## Task 3: SwordmastersAscent.tsx — StatusEffect 적용/만료 처리

**Files:**
- Modify: `src/components/SwordmastersAscent.tsx`

- [ ] **Step 1: 효과 적용 헬퍼 함수 추가**

컴포넌트 파일 상단 `// ── 저장 슬롯` 근처 위에 아래 함수를 추가:

```typescript
/** 활성 상태효과를 캐릭터에 즉시 적용하고 duration을 1 감소. duration=0이 되면 제거. */
function tickStatusEffects(char: Character): Character {
  const effects = char.activeEffects ?? [];
  if (effects.length === 0) return char;

  let { stamina } = char;
  effects.forEach(e => {
    if (e.type === 'stamina_drain' && e.duration > 0) {
      stamina = Math.max(0, stamina - e.value);
    }
  });

  return {
    ...char,
    stamina,
    activeEffects: effects
      .map(e => ({ ...e, duration: e.duration - 1 }))
      .filter(e => e.duration > 0),
  };
}

/** TurnResult의 newEffects를 캐릭터에 추가 */
function addStatusEffects(char: Character, effects?: StatusEffect[]): Character {
  if (!effects || effects.length === 0) return char;
  return { ...char, activeEffects: [...(char.activeEffects ?? []), ...effects] };
}
```

- [ ] **Step 2: 턴 처리 직후 효과 적용 추가**

`SwordmastersAscent.tsx`에서 `result = resolveTurn(...)` 호출 직후 결과를 처리하는 블록을 찾는다. `result.newEnemyEffects`, `result.newPlayerEffects`, `result.bonusStamina`를 처리한다.

`resolveTurn` 결과를 `setEnemy(...)` / `setPlayer(...)` 하는 부분을 찾아 아래처럼 수정:

```typescript
// 기존: setPlayer(p => ({ ...p, hp: ..., stamina: ... }))
// 수정: result의 효과 필드도 반영

setPlayer(p => {
  let next = { ...p };
  // HP 변경
  if (result.healAmount) next.hp = Math.min(next.maxHp, next.hp + result.healAmount);
  next.hp = Math.max(0, next.hp - result.damageTaken);
  // 스테미너
  const delta = getStaminaDelta(playerAction);
  next.stamina = Math.max(0, Math.min(next.maxStamina, next.stamina + delta + (result.bonusStamina ?? 0)));
  // 새 효과 추가 + 기존 효과 틱
  next = tickStatusEffects(next);
  next = addStatusEffects(next, result.newPlayerEffects);
  return next;
});

setEnemy(e => {
  let next = { ...e };
  next.hp = Math.max(0, next.hp - result.damageDealt);
  // 적 스테미너 (기존 로직 유지)
  const eDelta = getStaminaDelta(result.baseOutcome === 'draw' ? intent.mainAction : intent.mainAction);
  next.stamina = Math.max(0, Math.min(next.maxStamina, next.stamina + eDelta));
  // 새 효과 추가 + 기존 효과 틱
  next = tickStatusEffects(next);
  next = addStatusEffects(next, result.newEnemyEffects);
  return next;
});
```

> **Note:** 기존 setPlayer/setEnemy 패턴이 다를 수 있으므로 실제 코드에서 해당 블록을 찾아 위 로직을 병합한다. `result.healAmount`, `result.damageTaken`, `result.damageDealt`는 이미 존재하는 필드다.

- [ ] **Step 3: 활성 효과 UI 표시**

`BattleGrid` 컴포넌트의 플레이어 카드 / 적 카드 하단(컨디션 뱃지 표시 근처)에 효과 표시 추가:

```typescript
{/* 플레이어 카드 하단 — 상태효과 */}
{(player.activeEffects ?? []).length > 0 && (
  <div className="flex gap-1 flex-wrap mt-0.5">
    {(player.activeEffects ?? []).map((e, i) => (
      <span key={i} className="text-[8px] px-1 rounded bg-blue-900/60 text-blue-300 border border-blue-700/40">
        {e.type === 'extra_speed_die' ? '⚡+속도' : e.type}({e.duration})
      </span>
    ))}
  </div>
)}

{/* 적 카드 하단 — 상태효과 */}
{(enemy.activeEffects ?? []).length > 0 && (
  <div className="flex gap-1 flex-wrap mt-0.5 justify-end">
    {(enemy.activeEffects ?? []).map((e, i) => (
      <span key={i} className="text-[8px] px-1 rounded bg-red-900/60 text-red-300 border border-red-700/40">
        {e.type === 'stamina_drain' ? '🔥화상'
          : e.type === 'movement_lock' ? '⛓속박'
          : e.type === 'agility_debuff' ? '❄빙결'
          : e.type}({e.duration})
      </span>
    ))}
  </div>
)}
```

- [ ] **Step 4: 빌드 확인**

```bash
cd C:/Development/1_TOS/swordmasters-ascent && npm run dist
```

Expected: 빌드 성공, 버전 번호 출력

---

## Task 4: 컨디션 배수 완화

**Files:**
- Modify: `src/lib/gameData.ts` — `getConditionMultiplier` 함수

- [ ] **Step 1: 배수 조정**

`getConditionMultiplier` 함수를 아래로 교체:

```typescript
export function getConditionMultiplier(c?: Condition): number {
  switch (c) {
    case 'excellent': return 1.10;
    case 'good':      return 1.05;
    case 'bad':       return 0.92; // 기존 0.85 → 완화
    case 'terrible':  return 0.82; // 기존 0.70 → 완화
    default:          return 1.00;
  }
}
```

- [ ] **Step 2: 타입 검사 + 빌드**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

---

## Task 5: 뒤로 베기 강화 — 적 밀어냄 + 스테미너 보너스

**Files:**
- Modify: `src/lib/gameData.ts` — `resolveTurn` 내부

- [ ] **Step 1: 뒤로 베기 적 밀어냄 처리**

`resolveTurn`에서 `finalPlayerPos` / `finalEnemyPos` 계산 직후에 삽입:

```typescript
  // 뒤로 베기: 공격 성공 시 적도 1칸 추가 밀어냄 (총 distance +2)
  if (playerSub === '뒤로 베기' && damageDealt > 0) {
    finalEnemyPos = Math.min(5, finalEnemyPos + 1);
    message += ' — 뒤로 베기로 적을 밀어냈다!';
  }
```

- [ ] **Step 2: 뒤로 베기 완벽 카운터 시 스테미너 +5 보너스**

이미 `bonusStamina` 필드를 TurnResult에 추가했으므로, return 직전 로직을 수정:

```typescript
  const bonusStamina = (playerSub === '뒤로 베기' && quality === 'perfect') ? 5 : 0;
```

그리고 마지막 return의 `bonusStamina: undefined`를 `bonusStamina`로 교체.

- [ ] **Step 3: SUB_ACTION_INFO 업데이트**

`SUB_ACTION_INFO`의 `'뒤로 베기'` 항목을 갱신:

```typescript
  '뒤로 베기': {
    desc: '후퇴하며 베기 + 적 밀어냄 (밀착 전용)',
    counter: '→ 전진 압박',
    hint: '물러서면서 검을 옆으로 긋는다',
  },
```

- [ ] **Step 4: 빌드**

```bash
npm run dist
```

Expected: 빌드 성공

---

## Task 6: 신규 보스 2종 추가

**Files:**
- Modify: `src/lib/gameData.ts` — `ENEMY_TEMPLATES`, `BossPattern` 타입

- [ ] **Step 1: BossPattern 타입 추가**

`EnemyTemplate` 인터페이스에 필드 추가:

```typescript
export interface EnemyTemplate {
  id: string; name: string; minFloor: number; maxFloor: number; isBoss: boolean;
  baseStats: Character['stats']; baseHp: number; baseMp: number;
  actionWeights: Record<ActionType, number>; description: string;
  weaponRange: number;
  bossPattern?: 'wrath' | 'riposte' | 'judge' | 'king'; // 보스 전용 패턴
}
```

- [ ] **Step 2: 신규 보스 검사 심판관 + 검사 왕 추가**

`ENEMY_TEMPLATES` 배열 끝에 추가:

```typescript
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
```

- [ ] **Step 3: 보스 등장 조건 수정**

`generateEnemy` 함수의 eligible 필터를 수정해 다단계 보스를 지원:

```typescript
  // 기존 코드:
  // const eligible = ENEMY_TEMPLATES.filter(t => t.minFloor <= floor && (t.isBoss ? floor % 5 === 0 : !t.isBoss));

  // 수정 코드:
  const eligible = ENEMY_TEMPLATES.filter(t => {
    if (t.maxFloor < floor) return false;
    if (t.minFloor > floor) return false;
    if (t.isBoss) return floor % 5 === 0;
    return true;
  });
```

- [ ] **Step 4: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

---

## Task 7: 보스 전용 AI 패턴 + 왕 2페이즈

**Files:**
- Modify: `src/lib/gameData.ts` — `generateEnemyIntent`
- Modify: `src/components/SwordmastersAscent.tsx` — 적 HP 0 처리 블록

- [ ] **Step 1: AIContext에 bossPattern 추가**

`AIContext` 인터페이스에 필드 추가:

```typescript
  bossPattern?: 'wrath' | 'riposte' | 'judge' | 'king';
```

- [ ] **Step 2: generateEnemyIntent에 보스 패턴 처리 추가**

`generateEnemyIntent` 함수 내부, 기존 `if (ctx)` 블록 마지막(플레이어 자원 파악 직후)에 추가:

```typescript
    // ── 보스 전용 패턴 ─────────────────────────────────────────
    if (ctx.bossPattern === 'wrath' && enemyHpRatio < 0.5) {
      // 분노: HP 50% 이하에서 공격 가중치 2배
      w['공격'] = (w['공격'] ?? 0) * 2;
      w['마법 사용'] = (w['마법 사용'] ?? 0) + 20;
    }
    if (ctx.bossPattern === 'riposte' && playerLastMain === '방어') {
      // 반격 자세: 플레이어가 방어하면 반드시 이동 또는 마법으로 우회
      w['이동']     = (w['이동']     ?? 0) + 60;
      w['마법 사용'] = (w['마법 사용'] ?? 0) + 40;
      w['공격'] = Math.max(5, (w['공격'] ?? 0) - 40);
    }
    if (ctx.bossPattern === 'judge' && playerLastMain) {
      // 심판관: 플레이어 마지막 메인 액션의 카운터로 가중치 몰기
      // 공격 카운터 = 방어, 마법 카운터 = 이동, 이동 카운터 = 공격
      const judgeCounter: Partial<Record<ActionType, ActionType>> = {
        '공격': '방어', '마법 사용': '이동', '이동': '공격',
        '방어': '마법 사용', '아이템 사용': '공격',
      };
      const counter = judgeCounter[playerLastMain];
      if (counter) w[counter] = (w[counter] ?? 0) + 80;
    }
    // 왕 패턴은 컴포넌트에서 2페이즈 부활로 처리
```

- [ ] **Step 3: generateEnemy가 bossPattern을 AIContext에 전달할 수 있도록**

`generateEnemyIntent` 호출부에서 `bossPattern`을 context에 포함하도록 컴포넌트를 수정한다.

`SwordmastersAscent.tsx`에서 `generateEnemyIntent` 호출 시 ctx 객체에 추가:

```typescript
const intent = generateEnemyIntent(enemy.actionWeights ?? DEFAULT_ACTION_WEIGHTS, {
  enemyHp: enemy.hp,
  enemyMaxHp: enemy.maxHp,
  playerHp: player.hp,
  playerMaxHp: player.maxHp,
  distance,
  enemyWeaponRange: enemy.weaponRange ?? 1,
  playerRow,
  enemyRow,
  enemyPos,
  playerLastMain: lastPlayerMain ?? undefined,
  playerLastSub: lastPlayerSub ?? undefined,
  playerMagicAvailable: canUseMagic,
  playerItemAvailable: player.inventory.length > 0,
  bossPattern: (enemy as Character & { bossPattern?: string }).bossPattern as AIContext['bossPattern'],
});
```

> **Note:** enemy 객체에 bossPattern이 없다면 Character 인터페이스에 `bossPattern?: string` 추가하거나 template에서 저장된 값을 enemy에 복사해야 한다.

- [ ] **Step 4: Character에 bossPattern 저장, generateEnemy에서 복사**

`Character` 인터페이스에 추가:

```typescript
  bossPattern?: 'wrath' | 'riposte' | 'judge' | 'king';
```

`generateEnemy` 함수에서 return 객체에 추가:

```typescript
    bossPattern: template.bossPattern,
```

- [ ] **Step 5: 왕 2페이즈 — 컴포넌트에서 HP 0 처리 수정**

`SwordmastersAscent.tsx`에서 적 HP가 0 이하가 될 때 처리하는 블록을 찾아 아래 조건을 추가:

```typescript
if (newEnemyHp <= 0) {
  // 검사 왕: 아직 2페이즈가 발동 안 됐으면 절반 HP로 부활
  if (enemy.bossPattern === 'king' && !enemy.phase2Triggered) {
    const reviveHp = Math.floor(enemy.maxHp * 0.5);
    setEnemy(e => ({
      ...e,
      hp: reviveHp,
      phase2Triggered: true,
      name: '검사 왕 (2페이즈)',
      // 2페이즈: 공격 가중치 증가
      actionWeights: { '공격': 50, '이동': 10, '방어': 15, '마법 사용': 25, '아이템 사용': 0 },
    }));
    addLog('검사 왕이 쓰러지지 않는다! 더 강한 힘으로 부활했다!');
    // 전투 계속 (보상으로 넘어가지 않음)
    return;
  }
  // 일반 처치 처리 (기존 코드)
  handleEnemyDefeated();
}
```

- [ ] **Step 6: 최종 빌드**

```bash
npm run dist
```

Expected: 빌드 성공, 버전 번호 출력

---

## 자가 검토 체크리스트

- [x] StatusEffectType 모든 5종 정의됨
- [x] activeEffects optional이므로 기존 세이브 데이터 호환
- [x] 바람 쇄도 pushback은 즉시 처리 (effect 아님)
- [x] 회복술 부가효과는 healAmount로 전달
- [x] 컨디션 terrible 0.82, bad 0.92으로 완화
- [x] 뒤로 베기: 적 pushback + 완벽 카운터 시 스테미너 +5
- [x] 보스 2종: 심판관(15F), 왕(30F)
- [x] 왕 2페이즈: phase2Triggered 플래그로 한 번만 발동
- [x] bossPattern은 Character에 저장돼 세이브/로드 시 유지됨
