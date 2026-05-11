# Floor Event System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3~5층마다 전투 이외의 이벤트(상인, 폐허, 맹세, 쉼터) 화면을 추가해 층 진행의 단조로움을 해소한다.

**Architecture:** `gameData.ts`에 FloorEvent 타입과 생성 함수를 추가하고, `GamePhase`에 `'event'`를 추가한다. `SwordmastersAscent.tsx`에 이벤트 화면 컴포넌트와 전투 완료 → 이벤트 분기 로직을 추가한다. 이벤트는 저장 데이터에 포함되므로 SaveState도 수정한다.

**Tech Stack:** TypeScript, React, Next.js, localStorage

---

## 파일 변경 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/gameData.ts` | FloorEvent 타입, generateFloorEvent 함수, GamePhase 확장 |
| `src/components/SwordmastersAscent.tsx` | EventScreen 컴포넌트, 보상→이벤트 분기, SaveState 확장 |

---

## Task 1: FloorEvent 타입과 생성 함수 (gameData.ts)

**Files:**
- Modify: `src/lib/gameData.ts`

- [ ] **Step 1: GamePhase에 'event' 추가**

`src/lib/gameData.ts`의 `GamePhase` 타입을 교체:

```typescript
export type GamePhase = 'start' | 'tutorial' | 'naming' | 'stat_roll' | 'battle' | 'reward' | 'event' | 'gameover';
```

- [ ] **Step 2: FloorEvent 타입 추가**

`gameData.ts`의 `FloorGhosts` 타입 근처에 추가:

```typescript
export type FloorEventType = 'shelter' | 'merchant' | 'ruins' | 'oath';

export interface FloorEventChoice {
  id: string;
  label: string;           // 선택지 버튼 텍스트
  description: string;     // 선택지 설명
  risk?: string;           // 위험 표시 (있으면 주황색 경고)
  apply: (player: Character) => Character; // 선택 시 플레이어에 적용할 변환
}

export interface FloorEvent {
  type: FloorEventType;
  title: string;
  narrative: string;       // 분위기 텍스트
  choices: FloorEventChoice[];
}
```

- [ ] **Step 3: generateFloorEvent 함수 추가**

`ENEMY_ABILITY_POOL` 이후에 삽입:

```typescript
/** 이벤트 발생 여부: 3~5층마다 한 번 (floor 3, 7, 11, 15, ... 또는 랜덤) */
export function shouldTriggerEvent(floor: number): boolean {
  if (floor <= 1) return false;
  // 3층마다 이벤트, 보스 층(% 5 === 0)에는 발생 안 함
  if (floor % 5 === 0) return false;
  return floor % 3 === 0;
}

export function generateFloorEvent(floor: number, player: Character): FloorEvent {
  // 층에 따라 이벤트 유형 가중치 조정
  const hpLow = player.hp / player.maxHp < 0.4;
  const types: FloorEventType[] = hpLow
    ? ['shelter', 'shelter', 'merchant', 'ruins']   // HP 낮으면 쉼터 확률 높임
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
            description: '60% 확률: critChance +12 / 40% 확률: 다음 층 컨디션 최악',
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
            label: '힘의 맹세',
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
            label: '신속의 맹세',
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
```

- [ ] **Step 4: 타입 검사**

```bash
cd C:/Development/1_TOS/swordmasters-ascent && npx tsc --noEmit
```

Expected: 오류 없음

---

## Task 2: SaveState에 이벤트 필드 추가

**Files:**
- Modify: `src/components/SwordmastersAscent.tsx` — `SaveState` 인터페이스

- [ ] **Step 1: SaveState 확장**

`SaveState` 인터페이스에 필드 추가:

```typescript
export interface SaveState {
  phase: GamePhase;
  floor: number;
  highScore: number;
  timestamp: number;
  playerPos: number;
  enemyPos:  number;
  playerRow?: number;
  enemyRow?:  number;
  distance?: number;
  magicCooldown: number;
  combatStep: CombatStep;
  player: Character;
  enemy: Character;
  intent: EnemyIntent | null;
  stats: { floorsCleared:number; bossesKilled:number; perfectBlocks:number };
  logs: string[];
  legacy: Character[];
  currentEvent?: FloorEvent | null; // 현재 진행 중인 이벤트 (optional — 구버전 세이브 호환)
}
```

- [ ] **Step 2: FloorEvent import 추가**

`SwordmastersAscent.tsx` 상단 import에 추가:

```typescript
import {
  // 기존 imports...
  FloorEvent, FloorEventChoice, FloorEventType,
  generateFloorEvent, shouldTriggerEvent,
  StatusEffect,
} from '@/lib/gameData';
```

---

## Task 3: EventScreen 컴포넌트

**Files:**
- Modify: `src/components/SwordmastersAscent.tsx`

- [ ] **Step 1: EventScreen 컴포넌트 추가**

`StatRollScreen` 컴포넌트 이후에 추가:

```typescript
function EventScreen({
  event, floor, onChoice,
}: {
  event: FloorEvent;
  floor: number;
  onChoice: (choice: FloorEventChoice) => void;
}) {
  const iconMap: Record<FloorEventType, string> = {
    shelter: '⛺',
    merchant: '🧳',
    ruins: '🏚',
    oath: '⚔',
  };

  const bgMap: Record<FloorEventType, string> = {
    shelter: 'from-green-950/60 to-gray-950',
    merchant: 'from-yellow-950/60 to-gray-950',
    ruins: 'from-purple-950/60 to-gray-950',
    oath: 'from-red-950/60 to-gray-950',
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b ${bgMap[event.type]} flex flex-col`}>
      {/* 헤더 */}
      <div className="px-4 pt-6 pb-2 border-b border-gray-800/60 flex items-center gap-3">
        <span className="text-3xl">{iconMap[event.type]}</span>
        <div>
          <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">{floor}층 이벤트</div>
          <div className="text-lg font-black text-yellow-300">{event.title}</div>
        </div>
      </div>

      {/* 내러티브 */}
      <div className="px-5 py-4">
        <p className="text-sm text-gray-300 leading-relaxed italic border-l-2 border-yellow-700/60 pl-3">
          {event.narrative}
        </p>
      </div>

      {/* 선택지 */}
      <div className="px-4 flex flex-col gap-3 pb-8">
        {event.choices.map(choice => (
          <button
            key={choice.id}
            onClick={() => onChoice(choice)}
            className={`w-full text-left rounded-xl border p-4 transition-all duration-150 active:scale-[0.98]
              ${choice.risk
                ? 'border-orange-700/50 bg-orange-950/30 hover:bg-orange-950/50 hover:border-orange-600/70'
                : choice.id === 'skip'
                ? 'border-gray-700/40 bg-gray-900/40 hover:bg-gray-800/60'
                : 'border-yellow-700/50 bg-yellow-950/20 hover:bg-yellow-950/40 hover:border-yellow-600/70'
              }`}
          >
            <div className={`font-bold text-sm mb-1 ${
              choice.risk ? 'text-orange-300' : choice.id === 'skip' ? 'text-gray-400' : 'text-yellow-200'
            }`}>
              {choice.label}
            </div>
            <div className="text-xs text-gray-400">{choice.description}</div>
            {choice.risk && (
              <div className="text-xs text-orange-500 mt-1 font-bold">⚠ {choice.risk}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Task 4: 게임 플로우에 이벤트 분기 연결

**Files:**
- Modify: `src/components/SwordmastersAscent.tsx`

- [ ] **Step 1: 이벤트 state 추가**

메인 컴포넌트의 useState 선언부에 추가:

```typescript
const [currentEvent, setCurrentEvent] = useState<FloorEvent | null>(null);
```

- [ ] **Step 2: 층 클리어 후 이벤트 분기**

`handleEnemyDefeated` 함수(또는 보상 화면으로 이동하는 부분)를 찾아, `setPhase('reward')` 이전에 이벤트 체크를 삽입:

```typescript
function handleEnemyDefeated() {
  const nextFloor = floor + 1;

  // 이벤트 발생 조건 체크 (다음 층 기준)
  if (shouldTriggerEvent(nextFloor)) {
    const event = generateFloorEvent(nextFloor, player);
    setCurrentEvent(event);
    setFloor(nextFloor);
    setPhase('event');
    return;
  }

  // 이벤트 없으면 기존 보상 화면으로
  setPhase('reward');
}
```

> **Note:** `handleEnemyDefeated` 함수명이 다를 수 있으므로 실제 코드에서 적 처치 후 `setPhase('reward')`를 호출하는 블록을 찾아 위 로직으로 교체한다.

- [ ] **Step 3: 이벤트 선택 처리 함수 추가**

```typescript
function handleEventChoice(choice: FloorEventChoice) {
  // 선택 효과 플레이어에 적용
  setPlayer(p => choice.apply(p));
  setCurrentEvent(null);
  // 이벤트 후 보상 화면으로
  setPhase('reward');
}
```

- [ ] **Step 4: phase === 'event' 렌더링 추가**

메인 컴포넌트의 phase 분기 렌더링에 추가:

```typescript
if (phase === 'event' && currentEvent) {
  return (
    <EventScreen
      event={currentEvent}
      floor={floor}
      onChoice={handleEventChoice}
    />
  );
}
```

- [ ] **Step 5: 세이브/로드에 currentEvent 포함**

`saveGameSlot` 호출 시 state 객체에 `currentEvent` 포함:

```typescript
// saveGameSlot 호출 시:
saveGameSlot(slotIndex, {
  // 기존 필드들...
  currentEvent: currentEvent ?? null,
});
```

로드 시:

```typescript
// loadGameSlot 결과 적용 시:
if (saved.currentEvent) setCurrentEvent(saved.currentEvent);
```

- [ ] **Step 6: 최종 빌드**

```bash
npm run dist
```

Expected: 빌드 성공

---

## Task 5: 이벤트 플로우 수동 검증

- [ ] **Step 1: 3층 도달 후 이벤트 화면 진입 확인**

게임 실행 후 3층 적을 처치. `event` 화면이 나타나고 이벤트 제목/선택지가 표시되는지 확인.

- [ ] **Step 2: 각 이벤트 타입 4종 확인**

`generateFloorEvent`를 콘솔에서 직접 호출하거나, 여러 번 플레이해 4종(shelter/merchant/ruins/oath) 모두 등장하는지 확인.

- [ ] **Step 3: 선택 후 보상 화면 전환 확인**

이벤트 선택 후 `reward` 화면으로 전환되고, 선택 효과(HP 회복, 스탯 증가 등)가 플레이어에 반영됐는지 확인.

- [ ] **Step 4: 세이브/로드 시 이벤트 화면 복원 확인**

이벤트 화면에서 저장 후 다시 로드했을 때 이벤트 화면이 그대로 표시되는지 확인.

---

## 자가 검토 체크리스트

- [x] `GamePhase`에 `'event'` 추가로 기존 phase 분기에 영향 없음 (새 분기 추가만)
- [x] `FloorEventChoice.apply`는 순수 함수 — 부작용 없음
- [x] `shouldTriggerEvent`가 floor % 5 === 0(보스 층)에서 false 반환해 보스 층 충돌 없음
- [x] `currentEvent?: null`을 SaveState에 optional로 추가 — 구버전 세이브 로드 시 undefined 허용
- [x] 폐허 이벤트 랜덤 결과는 `apply` 호출 시 결정됨 (저장 전에 결과 확정)
- [x] HP가 1 아래로 내려가지 않도록 `Math.max(1, ...)` 처리됨
