# Injury System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 전투 중 큰 피해를 받으면 팔/다리/몸 부상이 생기고, 부상마다 다른 페널티를 부과한다.

**Architecture:** `gameData.ts`에 Injury 타입과 효과 함수를 추가하고, `resolveTurn`에서 부상 발생 로직을 처리한다. `SwordmastersAscent.tsx`에서 부상 적용/UI/치료를 담당한다.

**Tech Stack:** TypeScript, React, localStorage

---

## 파일 변경 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/gameData.ts` | InjuryType, Injury 타입, Character.injuries 필드, getInjuryStatMult, rollInjury, TurnResult.newPlayerInjury |
| `src/components/SwordmastersAscent.tsx` | 부상 적용, 몸 부상 틱, 부상 UI 배지, 쉼터 이벤트 치료 옵션 |

---

## Task 1: Injury 타입 + Character 필드 + 효과 함수 (gameData.ts)

**Files:**
- Modify: `src/lib/gameData.ts`

- [ ] **Step 1: Injury 타입 추가**

`StatusEffect` 타입 근처에 추가:

```typescript
export type InjuryType = 'arm' | 'leg' | 'body';
export type InjurySeverity = 'minor' | 'major';

export interface Injury {
  type: InjuryType;
  severity: InjurySeverity;
}
```

- [ ] **Step 2: Character 인터페이스에 injuries 필드 추가**

`Character` 인터페이스의 `activeEffects?` 줄 근처에 추가:

```typescript
  injuries?: Injury[];
```

- [ ] **Step 3: TurnResult에 newPlayerInjury 필드 추가**

`TurnResult` 인터페이스에 추가:

```typescript
  newPlayerInjury?: Injury;
```

- [ ] **Step 4: 부상 효과 함수 추가**

`getEffectiveStats` 함수 근처에 추가:

```typescript
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
```

- [ ] **Step 5: 타입 검사**

```bash
cd C:/Development/1_TOS/swordmasters-ascent && npx tsc --noEmit
```

Expected: 오류 없음

---

## Task 2: resolveTurn에서 부상 효과 적용 + 부상 발생 로직

**Files:**
- Modify: `src/lib/gameData.ts` — `resolveTurn` 함수

- [ ] **Step 1: resolveTurn 상단에서 부상 효과를 playerStats에 적용**

`const playerStats = getEffectiveStats(player);` 줄 바로 뒤에 삽입:

```typescript
  // 부상 페널티 적용
  const playerInjuries = player.injuries ?? [];
  const injStrMult = getInjuryStatMult(playerInjuries, 'strength');
  const injAgiMult = getInjuryStatMult(playerInjuries, 'agility');
  if (injStrMult < 1 || injAgiMult < 1) {
    playerStats.strength  = Math.max(1, Math.floor(playerStats.strength  * injStrMult));
    playerStats.agility   = Math.max(1, Math.floor(playerStats.agility   * injAgiMult));
  }
```

- [ ] **Step 2: damageTaken 확정 후 부상 롤**

`damageTaken`이 최종 결정되는 `if (enemyAttacks && enemyInRange)` 블록 직후에 삽입:

```typescript
  // 부상 발생 체크
  const newPlayerInjury = damageTaken > 0
    ? rollInjury(damageTaken, player.maxHp, playerInjuries)
    : undefined;
```

- [ ] **Step 3: return 구문에 newPlayerInjury 추가**

마지막 return의 `newEnemyEffects` 뒤에 추가:

```typescript
    newPlayerInjury,
```

(item-use early returns에도 `newPlayerInjury: undefined,` 추가)

- [ ] **Step 4: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

---

## Task 3: 컴포넌트 — 부상 적용 + UI + 치료

**Files:**
- Modify: `src/components/SwordmastersAscent.tsx`

- [ ] **Step 1: Injury 타입 import 추가**

```typescript
import {
  // 기존...
  Injury, InjuryType, InjurySeverity,
  getBodyInjuryStaminaDrain, getInjuryStatMult,
} from '@/lib/gameData';
```

- [ ] **Step 2: 턴 결과 처리에서 부상 적용 + 몸 부상 스테미너 틱**

`updatedPlayer` 생성 후, 스테미너 계산 부분에 body injury drain 포함:

```typescript
// 몸 부상 스테미너 틱
const bodyDrain = getBodyInjuryStaminaDrain(player.injuries ?? []);
// playerStamDelta 계산 기존 줄에서 bodyDrain 빼기:
// stamina: Math.max(0, Math.min(..., player.stamina + playerStamDelta + (result.bonusStamina ?? 0) - bodyDrain))
```

그리고 `updatedPlayer` 빌드 직후:

```typescript
// 새 부상 추가
if (result.newPlayerInjury) {
  const existingInjuries = updatedPlayer.injuries ?? [];
  // 같은 부위 기존 부상 제거 후 새 부상(업그레이드된) 추가
  const filtered = existingInjuries.filter(i => i.type !== result.newPlayerInjury!.type);
  updatedPlayer = { ...updatedPlayer, injuries: [...filtered, result.newPlayerInjury] };
  addLog(`  부상 발생: ${result.newPlayerInjury.type === 'arm' ? '팔' : result.newPlayerInjury.type === 'leg' ? '다리' : '몸'} 부상 (${result.newPlayerInjury.severity === 'minor' ? '경상' : '중상'})`);
}
```

- [ ] **Step 3: 부상 UI 배지 추가**

플레이어 카드의 activeEffects 배지 근처에 추가:

```tsx
{/* 플레이어 부상 배지 */}
{(player.injuries ?? []).length > 0 && (
  <div className="flex gap-1 flex-wrap mt-0.5">
    {(player.injuries ?? []).map((inj, i) => (
      <span key={i} className={`text-[8px] px-1 rounded font-bold border ${
        inj.severity === 'major'
          ? 'bg-red-900/70 text-red-200 border-red-600/60'
          : 'bg-orange-900/60 text-orange-300 border-orange-700/50'
      }`}>
        {inj.type === 'arm' ? '💪부상' : inj.type === 'leg' ? '🦵부상' : '🫀부상'}
        {inj.severity === 'major' ? '(중)' : '(경)'}
      </span>
    ))}
  </div>
)}
```

- [ ] **Step 4: 쉼터 이벤트에 부상 치료 선택지 추가**

`generateFloorEvent`의 `shelter` case에서 `choices` 배열에 추가:

```typescript
          {
            id: 'heal_injury',
            label: '부상 치료',
            description: '가장 심한 부상 1개를 치료',
            apply: (p) => {
              if (!p.injuries || p.injuries.length === 0) return p;
              // 중상 먼저, 없으면 경상 치료
              const majorIdx = p.injuries.findIndex(i => i.severity === 'major');
              const idx = majorIdx >= 0 ? majorIdx : 0;
              const newInjuries = p.injuries.filter((_, i) => i !== idx);
              return { ...p, injuries: newInjuries };
            },
          },
```

- [ ] **Step 5: 빌드**

```bash
cd C:/Development/1_TOS/swordmasters-ascent && npm run dist
```

Expected: 빌드 성공, 버전 번호 출력
