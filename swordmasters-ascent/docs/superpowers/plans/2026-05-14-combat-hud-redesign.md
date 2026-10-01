# Combat HUD Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the active battle screen into a clearer game-board plus tactical-console HUD where survival state, spatial state, enemy intent, and action choices each have stable homes.

**Architecture:** Keep the existing 1280x720 battle stage and combat state logic. Add focused internal React components inside `src/components/SwordmastersAscent.tsx`, then replace the large inline top and bottom HUD JSX with `BattleTopBar` and `BattleTacticalConsole` while leaving the central art, grid, VFX, and dice overlay behavior intact.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS utility classes, existing local game data helpers from `src/lib/gameData.ts`.

---

## File Structure

- Modify: `src/components/SwordmastersAscent.tsx`
  - Add small HUD helpers near the existing HUD constants: `pct`, `HUD_PANEL_STYLE`, `ResourceBar`, `StatusPill`, `BattleTopBar`, `BattleCommandPanel`, `BattleMiniMapPanel`, `BattleDetailPanel`, `BattleTacticalConsole`.
  - Replace the current top HUD block around the active battle render with `BattleTopBar`.
  - Replace the current bottom HUD block with `BattleTacticalConsole`.
  - Keep existing combat logic, save/load logic, dice overlay, character positioning, background art, and combat actions unchanged.
- No new files for production code in this pass.
- No changes to `src/lib/gameData.ts`.
- No changes to save data shape.

---

### Task 1: Add Shared HUD Helpers and Top Situation Bar

**Files:**
- Modify: `src/components/SwordmastersAscent.tsx`, near the existing `QUALITY_COLOR` and `QUALITY_LABEL` constants before `SubActionPanel`.

- [ ] **Step 1: Add the `ReactNode` type import**

Change the first import from React:

```tsx
import { useState, useEffect, useCallback, useRef } from 'react';
```

to:

```tsx
import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
```

- [ ] **Step 2: Add helper code for resources and status pills**

Add this code after `QUALITY_LABEL`:

```tsx
const HUD_PANEL_STYLE = {
  background: 'linear-gradient(135deg, rgba(8,12,22,0.88), rgba(3,5,10,0.74))',
  border: '1px solid rgba(148,163,184,0.16)',
  boxShadow: '0 12px 28px rgba(0,0,0,0.32)',
  backdropFilter: 'blur(6px)',
} as const;

const pct = (value: number, max: number) => `${Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0))}%`;

function ResourceBar({
  label, value, max, color, compact,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex justify-between text-[9px] leading-none mb-1">
        <span className="font-black" style={{ color }}>{label} {value}</span>
        <span className="text-gray-600 tabular-nums">{max}</span>
      </div>
      <div
        className={`${compact ? 'h-1.5' : 'h-2.5'} rounded-sm overflow-hidden`}
        style={{ background: 'rgba(0,0,0,0.62)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="h-full rounded-sm transition-all duration-700" style={{ width: pct(value, max), background: color }} />
      </div>
    </div>
  );
}

function StatusPill({
  children, tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'good' | 'bad' | 'warn' | 'magic';
}) {
  const toneClass = {
    neutral: 'border-gray-700/60 text-gray-400 bg-black/45',
    good: 'border-green-700/60 text-green-300 bg-green-950/45',
    bad: 'border-red-700/60 text-red-300 bg-red-950/45',
    warn: 'border-yellow-700/60 text-yellow-300 bg-yellow-950/45',
    magic: 'border-purple-700/60 text-purple-300 bg-purple-950/45',
  }[tone];
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[8px] font-black leading-none border ${toneClass}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 3: Run TypeScript build to verify helper imports**

Run:

```bash
npm run build
```

Expected: build still passes.

- [ ] **Step 4: Add `BattleTopBar`**

Add this code below `StatusPill`:

```tsx
function BattleTopBar({
  floor, player, enemy, playerStats, enemyStats, distance, rowSame, intentHint,
  magicCooldown, onSave,
}: {
  floor: number;
  player: Character;
  enemy: Character;
  playerStats: Character['stats'];
  enemyStats: Character['stats'];
  distance: number;
  rowSame: boolean;
  intentHint: string;
  magicCooldown: number;
  onSave: () => void;
}) {
  const distanceLabel = DISTANCE_LABELS[distance] ?? `거리 ${distance}`;
  const distanceColor = DISTANCE_COLORS[distance] ?? 'text-gray-300';

  return (
    <div
      className="absolute top-0 left-0 right-0 z-30 grid grid-cols-[300px_1fr_300px] gap-3 px-4 pt-3 pb-4 pointer-events-auto"
      style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.58) 66%, transparent 100%)' }}
    >
      <div className="rounded-lg p-2.5 min-w-0" style={HUD_PANEL_STYLE}>
        <div className="flex items-center gap-2 mb-2 min-w-0">
          <StatusPill tone="warn">{floor}F</StatusPill>
          <span className="text-[11px] text-gray-300 truncate">Lv.<b>{player.level}</b> {player.name}</span>
          {player.condition && <StatusPill>{CONDITION_LABELS[player.condition]}</StatusPill>}
        </div>
        <div className="space-y-1.5">
          <ResourceBar label="HP" value={player.hp} max={player.maxHp} color={player.hp / player.maxHp > 0.25 ? '#ef4444' : '#dc2626'} />
          <ResourceBar label="MP" value={player.mp} max={player.maxMp} color="#60a5fa" compact />
          <ResourceBar label="ST" value={player.stamina} max={player.maxStamina} color={player.stamina / player.maxStamina > 0.5 ? '#ca8a04' : '#ea580c'} compact />
        </div>
        <div className="flex gap-2 flex-wrap pt-1.5">
          <span className="text-[9px] text-gray-400">STR <b className="text-gray-200">{playerStats.strength}</b></span>
          <span className="text-[9px] text-gray-400">AGI <b className="text-gray-200">{playerStats.agility}</b></span>
          <span className="text-[9px] text-gray-400">ARM <b className="text-gray-200">{playerStats.armor}%</b></span>
          {magicCooldown > 0 && <StatusPill tone="magic">Magic {magicCooldown}T</StatusPill>}
        </div>
      </div>

      <div className="rounded-lg px-4 py-3 flex flex-col items-center justify-center min-w-0" style={HUD_PANEL_STYLE}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-lg font-black ${distanceColor}`}>{distanceLabel}</span>
          <StatusPill tone={rowSame ? 'warn' : 'neutral'}>{rowSame ? '행 일치' : '행 불일치'}</StatusPill>
        </div>
        <div className="text-[11px] text-gray-400 max-w-[520px] truncate">
          {intentHint}
        </div>
      </div>

      <div className="rounded-lg p-2.5 min-w-0" style={HUD_PANEL_STYLE}>
        <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] text-red-300 font-black truncate">{enemy.name}</span>
            {enemy.isBoss && <StatusPill tone="warn">BOSS</StatusPill>}
            {enemy.condition && <StatusPill>{CONDITION_LABELS[enemy.condition]}</StatusPill>}
          </div>
          <button
            onClick={onSave}
            className="text-[9px] px-2 py-1 rounded text-gray-500 hover:text-white border border-gray-800 hover:border-gray-600 bg-black/45 transition-all shrink-0"
          >
            저장
          </button>
        </div>
        <div className="space-y-1.5">
          <ResourceBar label="HP" value={enemy.hp} max={enemy.maxHp} color="#ef4444" />
          <ResourceBar label="MP" value={enemy.mp} max={enemy.maxMp} color="#a855f7" compact />
          <ResourceBar label="ST" value={enemy.stamina} max={enemy.maxStamina} color="#ea580c" compact />
        </div>
        <div className="flex gap-2 flex-wrap justify-end pt-1.5">
          <span className={`text-[9px] font-bold ${enemyStats.strength > playerStats.strength ? 'text-red-400' : 'text-green-400'}`}>STR {enemyStats.strength}</span>
          <span className={`text-[9px] font-bold ${enemyStats.agility > playerStats.agility ? 'text-red-400' : 'text-green-400'}`}>AGI {enemyStats.agility}</span>
          <span className="text-[9px] text-gray-400">ARM {enemyStats.armor}%</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: build passes, proving the new component types and existing constants resolve.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add src/components/SwordmastersAscent.tsx
git commit -m "feat: add battle hud top bar primitives"
```

Expected: one commit containing only helper and top bar component code.

---

### Task 2: Add Bottom Tactical Console Components

**Files:**
- Modify: `src/components/SwordmastersAscent.tsx`, below `BattleTopBar`.

- [ ] **Step 1: Add `BattleCommandPanel`**

Add this code below `BattleTopBar`:

```tsx
function BattleCommandPanel({
  combatStep, playerMain, player, floor, distance, magicCooldown, subOpts, subDisabled,
  perfectSub, likelySub, playerStats, enemyStats, onMainSelect, onSubSelect, onCancelSub,
}: {
  combatStep: CombatStep;
  playerMain: ActionType | null;
  player: Character;
  floor: number;
  distance: number;
  magicCooldown: number;
  subOpts: SubAction[];
  subDisabled: (sub: SubAction) => boolean;
  perfectSub: SubAction;
  likelySub: SubAction;
  playerStats: Character['stats'];
  enemyStats: Character['stats'];
  onMainSelect: (action: ActionType) => void;
  onSubSelect: (sub: SubAction) => void;
  onCancelSub: () => void;
}) {
  if (combatStep === 'select_main') {
    return (
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { action:'공격' as ActionType, bg:'rgba(120,20,20,0.78)', border:'rgba(200,50,50,0.62)', icon:'ATK' },
            { action:'이동' as ActionType, bg:'rgba(20,50,120,0.78)', border:'rgba(50,100,200,0.62)', icon:'MOV' },
            { action:'방어' as ActionType, bg:'rgba(20,80,30,0.78)', border:'rgba(50,150,70,0.62)', icon:'DEF' },
            { action:'마법 사용' as ActionType, bg:'rgba(70,20,120,0.78)', border:'rgba(130,60,200,0.62)', icon:'MAG' },
          ]).map(({ action, bg, border, icon }) => {
            const spellCost = getMagicCostByProgress(floor, player);
            const outOfRange = action === '공격' && distance > player.weaponRange;
            const disabled = action === '마법 사용' && (player.mp < spellCost || magicCooldown > 0 || player.magicSlots.length === 0);
            const bonus = distanceBonus(action, distance);
            const actionRange = getActionRange(action, player.weaponRange ?? 1);
            return (
              <button
                key={action}
                disabled={disabled}
                onClick={() => onMainSelect(action)}
                className="relative flex items-center gap-2.5 py-2.5 px-3 rounded-lg border transition-all active:scale-95 cursor-pointer hover:brightness-125 text-left"
                style={{
                  background: disabled ? 'rgba(20,20,30,0.72)' : outOfRange ? 'rgba(90,45,10,0.78)' : bg,
                  borderColor: disabled ? 'rgba(60,60,80,0.5)' : outOfRange ? 'rgba(160,80,20,0.7)' : border,
                }}
              >
                <span className="text-[10px] shrink-0 font-black text-gray-300 w-7">{icon}</span>
                <div className="min-w-0">
                  <div className={`text-sm font-black leading-tight ${disabled ? 'text-gray-600' : outOfRange ? 'text-orange-300' : 'text-white'}`}>{action}</div>
                  <div className={`text-[9px] leading-none ${disabled ? 'text-gray-700' : outOfRange ? 'text-orange-500' : 'text-gray-400'}`}>
                    {action === '공격' ? (outOfRange ? `사거리 ${actionRange} 밖` : `사거리 ${actionRange}`) :
                     action === '마법 사용' ? (disabled ? (magicCooldown > 0 ? `대기 ${magicCooldown}턴` : '사용 불가') : `사거리 ${actionRange}`) :
                     action === '방어' ? '피해 감소' : '위치 이동'}
                  </div>
                </div>
                {bonus !== 1.0 && !disabled && (
                  <span className={`absolute top-1 right-1 text-[8px] font-black px-1 rounded ${bonus > 1 ? 'text-green-300 bg-green-900/50' : 'text-red-300 bg-red-900/50'}`}>
                    {bonus > 1 ? `+${Math.round((bonus - 1) * 100)}%` : `${Math.round((bonus - 1) * 100)}%`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {player.inventory.length > 0 && (
          <button
            onClick={() => onMainSelect('아이템 사용' as ActionType)}
            className="w-full flex items-center gap-2 py-1.5 px-3 rounded-lg border border-yellow-800/50 hover:brightness-125 active:scale-95 cursor-pointer"
            style={{ background: 'rgba(60,40,5,0.78)' }}
          >
            <span className="text-[10px] font-black text-yellow-300">ITEM</span>
            <span className="text-xs font-bold text-yellow-300">아이템 사용</span>
            <span className="text-[9px] text-yellow-600 ml-auto truncate">{player.inventory.map(it => it.name).join(' · ')}</span>
          </button>
        )}
      </div>
    );
  }

  if (combatStep === 'select_sub' && playerMain) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] text-gray-400 font-bold">{playerMain}</span>
          <span className="text-gray-700 text-[10px]">/</span>
          <span className="text-[10px] text-gray-500">방식 선택</span>
          <button
            onClick={onCancelSub}
            className="ml-auto text-[9px] text-gray-600 hover:text-gray-300 border border-gray-800 rounded px-2 py-0.5 bg-black/50 transition-colors"
          >
            취소
          </button>
        </div>
        {subOpts.map(sub => {
          const disabled = subDisabled(sub);
          const isPerfect = sub === perfectSub;
          const isMiss = !isPerfect && PERFECT_COUNTER[sub] === likelySub;
          const baseStrDice = getDiceCount(playerStats.strength, enemyStats.strength);
          const strDicePreview = playerMain === '공격' || playerMain === '방어'
            ? Math.min(4, Math.max(1, baseStrDice + (isPerfect ? 1 : isMiss ? -1 : 0)))
            : null;
          return (
            <button
              key={sub}
              disabled={disabled}
              onClick={() => !disabled && onSubSelect(sub)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all active:scale-95 ${
                disabled ? 'opacity-40 cursor-not-allowed bg-black/40 border-gray-800 text-gray-600' :
                isPerfect ? 'bg-yellow-900/60 border-yellow-600/70 text-yellow-200 hover:brightness-125' :
                isMiss ? 'bg-red-950/50 border-red-800/50 text-red-300 hover:brightness-125' :
                'bg-black/60 border-gray-700/60 text-gray-200 hover:bg-black/80 hover:border-gray-500'
              }`}
            >
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-bold leading-tight truncate">
                  {isPerfect && <span className="text-yellow-400 mr-1">★</span>}
                  {isMiss && <span className="text-red-500 mr-1">×</span>}
                  {sub}
                </span>
                <span className={`text-[9px] leading-tight mt-0.5 truncate ${
                  isPerfect ? 'text-yellow-600' : isMiss ? 'text-red-700' : 'text-gray-600'
                }`}>
                  {isPerfect ? '카운터 예상 · 힘 판정 +1 주사위' :
                   isMiss ? '역카운터 위험 · 힘 판정 -1 주사위' :
                   SUB_ACTION_INFO[sub]?.desc ?? ''}
                </span>
              </div>
              {strDicePreview !== null && !disabled && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                  isPerfect ? 'bg-yellow-800/60 text-yellow-300' :
                  isMiss ? 'bg-red-900/60 text-red-400' :
                  'bg-gray-800 text-gray-400'
                }`}>
                  D{strDicePreview}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return <div className="text-center text-yellow-400 font-bold animate-pulse text-sm py-4">주사위 판정 중...</div>;
}
```

- [ ] **Step 2: Add `BattleMiniMapPanel`**

Add this code below `BattleCommandPanel`:

```tsx
function BattleMiniMapPanel({
  distance, playerPos, enemyPos, playerRow, enemyRow, logs,
}: {
  distance: number;
  playerPos: number;
  enemyPos: number;
  playerRow: number;
  enemyRow: number;
  logs: string[];
}) {
  const tileW = [56, 46, 36, 46, 56];
  const tileH = [20, 16, 12, 16, 20];
  const pMarkerH = Math.round(8 + (1 - (playerPos - 1) / 4) * 10);
  const eMarkerH = Math.round(8 + (1 - (5 - enemyPos) / 4) * 10);

  return (
    <div className="h-full flex flex-col items-center justify-end gap-2 min-w-0">
      <div className="flex items-center gap-2">
        <span className={`text-[11px] font-black tracking-wide ${DISTANCE_COLORS[distance] ?? 'text-gray-400'}`}>
          {DISTANCE_LABELS[distance] ?? `거리 ${distance}`}
        </span>
        <StatusPill tone={playerRow === enemyRow ? 'warn' : 'neutral'}>
          {playerRow === enemyRow ? '같은 행' : `내 행 ${playerRow} / 적 행 ${enemyRow}`}
        </StatusPill>
      </div>
      <div className="flex items-end gap-1">
        {[1,2,3,4,5].map((pos, i) => {
          const isP = pos === playerPos;
          const isE = pos === enemyPos;
          return (
            <div key={pos} className="flex flex-col items-center" style={{ gap: '2px' }}>
              <div style={{ height: Math.max(pMarkerH, eMarkerH) + 2, display: 'flex', alignItems: 'flex-end' }}>
                {isP && (
                  <div className="rounded-sm font-black text-blue-200 flex items-center justify-center"
                    style={{ width: pMarkerH, height: pMarkerH, fontSize: pMarkerH * 0.55, background: 'rgba(59,130,246,0.7)', border: '1px solid rgba(96,165,250,0.8)', boxShadow: '0 0 8px rgba(59,130,246,0.5)' }}>P</div>
                )}
                {isE && (
                  <div className="rounded-sm font-black text-red-200 flex items-center justify-center"
                    style={{ width: eMarkerH, height: eMarkerH, fontSize: eMarkerH * 0.55, background: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.8)', boxShadow: '0 0 8px rgba(239,68,68,0.5)' }}>E</div>
                )}
                {!isP && !isE && <div style={{ height: 1 }} />}
              </div>
              <div className="rounded-sm transition-all duration-300" style={{
                width: tileW[i],
                height: tileH[i],
                background: isP ? 'rgba(59,130,246,0.45)' : isE ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.05)',
                border: isP ? '1px solid rgba(96,165,250,0.65)' : isE ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.07)',
                boxShadow: isP ? '0 0 12px rgba(59,130,246,0.3)' : isE ? '0 0 12px rgba(239,68,68,0.3)' : undefined,
              }} />
              <div className="font-bold transition-colors duration-300" style={{ fontSize: 7, color: isP ? '#93c5fd' : isE ? '#fca5a5' : '#374151' }}>{pos}</div>
            </div>
          );
        })}
      </div>
      <div className="w-full max-w-[280px]">
        <BattleLog logs={logs} compact />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add `BattleDetailPanel` and `BattleTacticalConsole`**

Add this code below `BattleMiniMapPanel`:

```tsx
function BattleDetailPanel({
  player, enemy, enemyElementValues, enemyElementClasses, magicCooldown,
}: {
  player: Character;
  enemy: Character;
  enemyElementValues: number[];
  enemyElementClasses: string[];
  magicCooldown: number;
}) {
  return (
    <div className="space-y-2 min-w-0">
      <div>
        <div className="text-[9px] text-gray-500 font-black mb-1">적 특성</div>
        <div className="flex items-center gap-1 flex-wrap">
          {enemyElementValues.map((v, i) => v > 0 ? (
            <span key={i} className={`${enemyElementClasses[i]} rounded px-1.5 py-0.5 text-[8px] text-white font-bold`}>{v}</span>
          ) : null)}
          {enemy.abilities && enemy.abilities.length > 0 ? enemy.abilities.slice(0, 4).map(a => (
            <StatusPill key={a.name} tone="bad">{a.name}</StatusPill>
          )) : <span className="text-[9px] text-gray-700">특성 없음</span>}
        </div>
      </div>
      <div>
        <div className="text-[9px] text-gray-500 font-black mb-1">내 전술 상태</div>
        <div className="flex gap-1 flex-wrap">
          {(player.activeEffects ?? []).map((e, i) => (
            <StatusPill key={`${e.type}-${i}`} tone={e.type === 'extra_speed_die' ? 'good' : 'bad'}>
              {e.type} {e.duration}
            </StatusPill>
          ))}
          {(player.injuries ?? []).slice(0, 3).map(injury => (
            <StatusPill key={`${injury.type}-${injury.severity}`} tone={injury.severity === 'major' ? 'bad' : 'warn'}>
              {injury.type} {injury.severity}
            </StatusPill>
          ))}
          {player.titles.slice(0, 3).map(title => (
            <StatusPill key={title.id} tone="neutral">{title.name}</StatusPill>
          ))}
          {magicCooldown > 0 && <StatusPill tone="magic">마법 {magicCooldown}턴</StatusPill>}
          {(player.activeEffects ?? []).length === 0 && (player.injuries ?? []).length === 0 && player.titles.length === 0 && magicCooldown === 0 && (
            <span className="text-[9px] text-gray-700">추가 상태 없음</span>
          )}
        </div>
      </div>
    </div>
  );
}

function BattleTacticalConsole({
  combatStep, playerMain, player, enemy, floor, distance, magicCooldown,
  subOpts, subDisabled, perfectSub, likelySub, playerStats, enemyStats,
  playerPos, enemyPos, playerRow, enemyRow, logs, enemyElementValues, enemyElementClasses,
  onMainSelect, onSubSelect, onCancelSub,
}: {
  combatStep: CombatStep;
  playerMain: ActionType | null;
  player: Character;
  enemy: Character;
  floor: number;
  distance: number;
  magicCooldown: number;
  subOpts: SubAction[];
  subDisabled: (sub: SubAction) => boolean;
  perfectSub: SubAction;
  likelySub: SubAction;
  playerStats: Character['stats'];
  enemyStats: Character['stats'];
  playerPos: number;
  enemyPos: number;
  playerRow: number;
  enemyRow: number;
  logs: string[];
  enemyElementValues: number[];
  enemyElementClasses: string[];
  onMainSelect: (action: ActionType) => void;
  onSubSelect: (sub: SubAction) => void;
  onCancelSub: () => void;
}) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 px-5 pt-5 pb-4 pointer-events-auto"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.68) 72%, transparent 100%)' }}
    >
      <div className="grid grid-cols-[340px_1fr_280px] gap-4 items-end">
        <div className="rounded-lg p-3 min-h-[150px]" style={HUD_PANEL_STYLE}>
          <BattleCommandPanel
            combatStep={combatStep}
            playerMain={playerMain}
            player={player}
            floor={floor}
            distance={distance}
            magicCooldown={magicCooldown}
            subOpts={subOpts}
            subDisabled={subDisabled}
            perfectSub={perfectSub}
            likelySub={likelySub}
            playerStats={playerStats}
            enemyStats={enemyStats}
            onMainSelect={onMainSelect}
            onSubSelect={onSubSelect}
            onCancelSub={onCancelSub}
          />
        </div>
        <div className="rounded-lg p-3 min-h-[150px]" style={HUD_PANEL_STYLE}>
          <BattleMiniMapPanel
            distance={distance}
            playerPos={playerPos}
            enemyPos={enemyPos}
            playerRow={playerRow}
            enemyRow={enemyRow}
            logs={logs}
          />
        </div>
        <div className="rounded-lg p-3 min-h-[150px]" style={HUD_PANEL_STYLE}>
          <BattleDetailPanel
            player={player}
            enemy={enemy}
            enemyElementValues={enemyElementValues}
            enemyElementClasses={enemyElementClasses}
            magicCooldown={magicCooldown}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: build passes. If garbled action labels in the local source differ from readable labels in this plan, use the exact local string literals already present in `ActionType`, `SUB_ACTIONS`, and the current battle JSX.

- [ ] **Step 5: Commit Task 2**

Run:

```bash
git add src/components/SwordmastersAscent.tsx
git commit -m "feat: add battle tactical console components"
```

Expected: one commit containing component definitions only, without replacing the active battle render yet.

---

### Task 3: Wire the New HUD Into the Active Battle Render

**Files:**
- Modify: `src/components/SwordmastersAscent.tsx`, active battle render around the current top HUD and bottom HUD blocks.

- [ ] **Step 1: Add top-level derived values before `return`**

In the active battle branch, after `const perfectSub = PERFECT_COUNTER[likelySub];`, add:

```tsx
  const rowSame = playerRow === enemyRow;
  const intentHint = `${ACTION_ICONS[intent.mainAction]} ${SUB_ACTION_INFO[likelySub]?.hint ?? '적의 자세를 읽는 중...'}`;
```

- [ ] **Step 2: Replace the top HUD JSX**

Replace the current top HUD block that starts with:

```tsx
      <div className="absolute top-0 left-0 right-0 flex items-start px-4 pt-2 pb-2 gap-3"
```

and ends immediately before the bottom HUD comment with:

```tsx
      <BattleTopBar
        floor={floor}
        player={player}
        enemy={enemy}
        playerStats={pStats}
        enemyStats={eStats}
        distance={distance}
        rowSame={rowSame}
        intentHint={intentHint}
        magicCooldown={magicCooldown}
        onSave={saveCurrentGame}
      />
```

- [ ] **Step 3: Replace the bottom HUD JSX**

Replace the current bottom HUD block that starts with:

```tsx
      <div className="absolute bottom-0 left-0 right-0">
```

and ends before the closing `</div>` of the 1280x720 battle stage with:

```tsx
      <BattleTacticalConsole
        combatStep={combatStep}
        playerMain={playerMain}
        player={player}
        enemy={enemy}
        floor={floor}
        distance={distance}
        magicCooldown={magicCooldown}
        subOpts={subOpts}
        subDisabled={subDisabled}
        perfectSub={perfectSub}
        likelySub={likelySub}
        playerStats={pStats}
        enemyStats={eStats}
        playerPos={playerPos}
        enemyPos={enemyPos}
        playerRow={playerRow}
        enemyRow={enemyRow}
        logs={logs}
        enemyElementValues={eElVals}
        enemyElementClasses={eEls}
        onMainSelect={handleMainSelect}
        onSubSelect={handleSubSelect}
        onCancelSub={() => { setPlayerMain(null); setCombatStep('select_main'); }}
      />
```

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: build passes. If it fails because readable Korean literals do not match the current garbled local `ActionType` values, replace the readable literals with the exact values used in the existing JSX at the same call sites.

- [ ] **Step 5: Commit Task 3**

Run:

```bash
git add src/components/SwordmastersAscent.tsx
git commit -m "feat: wire redesigned battle hud"
```

Expected: one commit replacing the active render blocks with the new components.

---

### Task 4: Visual Polish and Overflow Hardening

**Files:**
- Modify: `src/components/SwordmastersAscent.tsx`.

- [ ] **Step 1: Inspect the 1280x720 battle screen**

Run:

```bash
npm run dev
```

Open the local app, start a battle, and inspect:

- `select_main`: action panel visible and stable.
- `select_sub`: sub-action list fits within the bottom-left panel.
- `rolling`: bottom console does not fight the dice overlay.
- `result`: result summary and logs remain readable.

- [ ] **Step 2: Apply bounded overflow classes where needed**

If a panel expands beyond its intended height, add these class changes:

```tsx
// On the BattleCommandPanel wrapper inside BattleTacticalConsole:
<div className="rounded-lg p-3 min-h-[150px] max-h-[190px] overflow-hidden" style={HUD_PANEL_STYLE}>

// On the BattleDetailPanel wrapper inside BattleTacticalConsole:
<div className="rounded-lg p-3 min-h-[150px] max-h-[190px] overflow-hidden" style={HUD_PANEL_STYLE}>

// On long button labels inside BattleCommandPanel:
<div className="text-sm font-black leading-tight truncate">
```

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: build passes without TypeScript or Next.js errors.

- [ ] **Step 4: Commit Task 4**

Run:

```bash
git add src/components/SwordmastersAscent.tsx
git commit -m "fix: harden battle hud overflow"
```

Expected: one commit containing only visual fit and overflow fixes.

---

### Task 5: Final Verification and Release Build Decision

**Files:**
- Modify only if verification finds a layout or build issue.

- [ ] **Step 1: Run final production build**

Run:

```bash
npm run build
```

Expected: build passes.

- [ ] **Step 2: Check non-battle phases**

Run the app and confirm these still render:

- Start screen.
- Tutorial screen.
- Naming screen.
- Stat roll screen.
- Reward screen after a battle.
- Event screen if triggered.
- Game over screen.

- [ ] **Step 3: Decide whether to create a distributable build**

Because `CLAUDE.md` says game code changes should be followed by `npm run dist`, ask the project owner before running the release build if the current task is only an implementation branch. If approved, run:

```bash
npm run dist
```

Expected: version bumps automatically, Next build passes, and a Windows portable executable is produced in the configured release output.

- [ ] **Step 4: Commit final verification fixes if any**

If Task 5 changed files:

```bash
git add src/components/SwordmastersAscent.tsx package.json package-lock.json
git commit -m "chore: verify combat hud release build"
```

If Task 5 made no changes, do not create an empty commit.

---

## Self-Review

Spec coverage:

- Top situation bar: Task 1 creates `BattleTopBar`; Task 3 wires it into the active render.
- Central game board preservation: Task 3 replaces only top and bottom HUD blocks, leaving background, grid, characters, VFX, floating text, and dice overlay intact.
- Bottom tactical console: Task 2 creates command, mini-map, and detail panels; Task 3 wires them.
- Information priority: Task 1 moves survival and spatial state to top; Task 2 keeps action choices and secondary details in the bottom console.
- Edge cases: Task 2 handles empty abilities and empty tactical states; Task 4 hardens overflow.
- Verification: Tasks 4 and 5 require build plus visual checks.

Placeholder scan:

- No `TODO`, `TBD`, or unspecified implementation steps remain.
- Each code-changing step includes concrete code or exact replacement instructions.

Type consistency:

- Component props use existing `Character`, `ActionType`, `SubAction`, and `CombatStep` types.
- The plan intentionally calls out that local garbled string literals may need to be preserved exactly because the current source includes mojibake in type values.
