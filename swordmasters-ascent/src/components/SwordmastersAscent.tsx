'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import {
  ActionType, SubAction, Character, FloatingText, GamePhase,
  Equipment, Item, Title, MagicSpell, CombatStep, MatchQuality, EnemyIntent, TurnResult, DiceContest, MagicDiceRoll,
  FloorGhosts, StatusEffect, AIContext,
  FloorEvent, FloorEventChoice, FloorEventType,
  SUB_ACTIONS, SUB_ACTION_INFO, SUB_ACTION_DICE_MODIFIERS, PERFECT_COUNTER, MAGIC_SPELL_POOL, getDiceCount,
  generateEnemyIntent, resolveTurn, generateEnemy, createPlayer,
  getRewardEquipment, ITEM_REWARD_POOL, generateCombatTitles,
  generateFloorEvent, shouldTriggerEvent,
  TITLES_DATA, DEFAULT_ACTION_WEIGHTS, DICE_FACE,
  DISTANCE_LABELS, DISTANCE_COLORS, distanceBonus, getEffectiveStats, getStaminaDelta,
  getEffectiveStatsWithSynergy, getActiveSynergies, SynergyDefinition,
  getMagicCostByProgress, getMagicCooldownByProgress, getMagicRegenByProgress,
  COMBAT_ROW_DEFAULT, COMBAT_ROW_MIN, COMBAT_ROW_MAX,
  CONDITION_LABELS, CONDITION_COLORS, rollCondition,
  getActionRange,
  UnlockKey,
  Injury, getBodyInjuryStaminaDrain,
} from '@/lib/gameData';

/** 활성 상태효과를 캐릭터에 틱 처리: stamina_drain 즉시 적용, duration 1 감소, duration=0 제거 */
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

// ── 저장 슬롯 (3개) ───────────────────────────────────────────
const SAVE_SLOT_KEYS = [
  'swordmasters-ascent-save-1',
  'swordmasters-ascent-save-2',
  'swordmasters-ascent-save-3',
] as const;
const FLOOR_GHOST_KEY = 'swordmasters-floor-ghosts';
const TUTORIAL_KEY    = 'swordmasters-ascent-tutorial-done';
const HIGH_SCORE_KEY  = 'swordmasters-ascent-highscore';
const BATTLE_CANVAS_WIDTH = 1280;
const BATTLE_CANVAS_HEIGHT = 720;

function loadHighScore(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? '0', 10) || 0;
}
function saveHighScore(score: number) {
  if (typeof window === 'undefined') return;
  const prev = loadHighScore();
  if (score > prev) localStorage.setItem(HIGH_SCORE_KEY, String(score));
}

function BattleViewport({ children }: { children: ReactNode }) {
  const [viewport, setViewport] = useState({
    width: BATTLE_CANVAS_WIDTH,
    height: BATTLE_CANVAS_HEIGHT,
  });

  useEffect(() => {
    const syncViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    return () => {
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
    };
  }, []);

  const scale = Math.min(
    viewport.width / BATTLE_CANVAS_WIDTH,
    viewport.height / BATTLE_CANVAS_HEIGHT,
  );
  const scaledWidth = Math.round(BATTLE_CANVAS_WIDTH * scale);
  const scaledHeight = Math.round(BATTLE_CANVAS_HEIGHT * scale);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden bg-gray-950"
      style={{ width: '100vw', height: '100vh' }}
    >
      <div className="relative overflow-hidden" style={{ width: scaledWidth, height: scaledHeight }}>
        <div
          style={{
            width: BATTLE_CANVAS_WIDTH,
            height: BATTLE_CANVAS_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

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

export interface SaveState {
  phase: GamePhase;
  floor: number;
  highScore: number;
  timestamp: number;
  playerPos: number;
  enemyPos:  number;
  playerRow?: number;
  enemyRow?:  number;
  distance?: number; // legacy field, ignored on load
  magicCooldown: number;
  combatStep: CombatStep;
  player: Character;
  enemy: Character;
  intent: EnemyIntent | null;
  stats: { floorsCleared:number; bossesKilled:number; perfectBlocks:number };
  logs: string[];
  legacy: Character[];
  // WARNING: FloorEvent.choices[].apply is not serializable — do NOT JSON.stringify this field directly. Regenerate event on load.
  currentEvent?: FloorEvent | null;
}

type SlotMeta = { floor: number; timestamp: number; playerName: string } | null;

function saveGameSlot(slotIndex: number, state: SaveState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SAVE_SLOT_KEYS[slotIndex], JSON.stringify(state));
}

function loadGameSlot(slotIndex: number): SaveState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SAVE_SLOT_KEYS[slotIndex]);
    if (!raw) return null;
    return JSON.parse(raw) as SaveState;
  } catch { return null; }
}

function clearGameSlot(slotIndex: number) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SAVE_SLOT_KEYS[slotIndex]);
}

function getAllSlotMetas(): SlotMeta[] {
  return [0, 1, 2].map(i => {
    const s = loadGameSlot(i);
    if (!s) return null;
    return { floor: s.floor, timestamp: s.timestamp ?? 0, playerName: s.player?.name ?? '검사' };
  });
}

// ── 층별 유령 ─────────────────────────────────────────────────
function loadFloorGhosts(): FloorGhosts {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(FLOOR_GHOST_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as FloorGhosts;
  } catch { return {}; }
}

function saveFloorGhosts(ghosts: FloorGhosts) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FLOOR_GHOST_KEY, JSON.stringify(ghosts));
}

function addFloorGhost(targetFloor: number, player: Character) {
  const ghosts = loadFloorGhosts();
  const ghostChar: Character = {
    ...player,
    id: `ghost_f${targetFloor}_${Date.now()}`,
    name: `${player.name}의 유령`,
    isLegacy: true,
    hp: player.maxHp,
    mp: player.maxMp,
    stamina: player.maxStamina,
    life: 3,
    maxLife: 3,
  };
  const existing = ghosts[targetFloor] ?? [];
  ghosts[targetFloor] = [...existing.slice(-4), ghostChar]; // 층당 최대 5개
  saveFloorGhosts(ghosts);
}


// ════════════════════════════════════════════════════════════
// Utility
// ════════════════════════════════════════════════════════════

// 캐릭터 이미지 경로 규칙:
//   플레이어  → /chars/player.png
//   적(일반)  → /chars/{enemy.id}.png   (예: /chars/goblin.png)
//   보스      → /chars/{enemy.id}.png   (예: /chars/samurai_boss.png)
//   유령      → /chars/ghost.png
//   이미지 없으면 자동으로 이모지 폴백
function CharImage({
  src, fallback, size, glow, flash,
}: {
  src: string; fallback: string; size: number;
  glow?: string; flash?: boolean;
}) {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [src]);
  if (err) return (
    <span className="leading-none select-none" style={{ fontSize: size * 0.72 }}>{fallback}</span>
  );
  return (
    <img
      src={src} alt="" onError={() => setErr(true)}
      width={size} height={size}
      className="object-contain select-none"
      style={{
        width: size, height: size,
        filter: flash
          ? `drop-shadow(0 0 18px ${glow ?? 'rgba(255,255,255,0.9)'}) drop-shadow(0 0 4px rgba(0,0,0,1))`
          : glow
          ? `drop-shadow(0 0 10px ${glow}) drop-shadow(0 0 3px rgba(0,0,0,0.9))`
          : 'drop-shadow(0 0 3px rgba(0,0,0,0.9))',
        imageRendering: 'crisp-edges',
      }}
    />
  );
}

const ENEMY_IMAGE_IDS = [
  'arcane_swordsman',
  'knight_swordsman',
  'swift_swordsman',
  'duelist_swordsman',
  'orc_warrior',
  'dark_mage',
  'executioner',
  'samurai_boss',
  'elder_boss',
  'judge_boss',
  'king_boss',
  'goblin',
] as const;

function getEnemyImageSrc(enemy: Character): string {
  if (enemy.isLegacy) return '/chars/ghost.png';

  const explicit = (enemy as Character & { imageId?: string }).imageId;
  const rawId = String(explicit ?? (enemy as Character & { id?: string }).id ?? '');
  if (rawId.startsWith('floor1_rival')) return '/chars/goblin.png';

  const imageId = ENEMY_IMAGE_IDS.find((candidate) =>
    rawId === candidate || rawId.startsWith(`${candidate}_`)
  );

  return imageId ? `/chars/${imageId}.png` : '/enemy/enemy.png';
}

function ActionGlyph({ icon }: { icon: string }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/15 bg-black/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
      <span className="text-lg leading-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">{icon}</span>
    </span>
  );
}


function FloatingLayer({ texts, side }: { texts: FloatingText[]; side: 'player' | 'enemy' }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {texts.filter(t => t.side === side).map((ft, i) => (
        <div key={ft.id} style={{ top: `${20 + i * 22}px`, [side === 'enemy' ? 'right' : 'left']: '12px' }}
          className={`absolute animate-bounce-up select-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]
            ${ft.type === 'critical'
              ? 'text-yellow-300 text-3xl font-black tracking-tight'
              : ft.type === 'damage' && side === 'player'
              ? 'text-red-400 text-2xl font-bold'
              : ft.type === 'damage'
              ? 'text-orange-300 text-2xl font-bold'
              : ft.type === 'heal'
              ? 'text-green-400 text-xl font-bold'
              : ft.type === 'miss'
              ? 'text-gray-400 text-base font-semibold italic'
              : 'text-blue-300 text-sm font-medium'}`}>
          {ft.text}
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BattleGrid — 5×5 전투판 + 캐릭터 상태 + 적 능력치 통합
// ════════════════════════════════════════════════════════════

// 행 기본값은 gameData의 COMBAT_ROW_DEFAULT(2) 사용

function BattleGrid({
  playerPos, enemyPos, playerRow, enemyRow, playerMain, playerWeaponRange, enemy, player, floatingTexts, hitFlash,
}: {
  playerPos: number; enemyPos: number;
  playerRow: number; enemyRow: number;
  playerMain: ActionType | null;
  playerWeaponRange: number;
  enemy: Character;
  player: Character;
  floatingTexts: FloatingText[];
  hitFlash?: 'player' | 'enemy' | 'both' | null;
}) {
  const distance    = enemyPos - playerPos;
  const label       = DISTANCE_LABELS[distance] ?? `거리 ${distance}`;
  const distCol     = DISTANCE_COLORS[distance]  ?? 'text-gray-400';
  const inRange     = distance <= playerWeaponRange;
  const pBonus      = playerMain ? distanceBonus(playerMain, distance) : null;
  const playerStats = getEffectiveStats(player);
  const enemyStats  = getEffectiveStats(enemy);

  const pFlash = hitFlash === 'player' || hitFlash === 'both';
  const eFlash = hitFlash === 'enemy'  || hitFlash === 'both';
  const rowSame = playerRow === enemyRow;
  const rowLabel = (r: number) => r === 1 ? '상' : r === 2 ? '중' : '하';

  return (
    <div className="relative overflow-hidden border-b border-gray-800/60"
      style={{ background: 'linear-gradient(180deg,#09070f 0%,#0e0a08 65%,#07080e 100%)' }}>

      {/* 배경 캐릭터 광원 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-0 top-0 w-2/5 h-full"
          style={{ background: 'radial-gradient(ellipse at 10% 40%, rgba(59,130,246,0.12) 0%, transparent 70%)' }} />
        <div className="absolute right-0 top-0 w-2/5 h-full"
          style={{ background: 'radial-gradient(ellipse at 90% 40%, rgba(239,68,68,0.12) 0%, transparent 70%)' }} />
      </div>

      <div className="relative px-3 pt-3 pb-2">

        {/* ── 캐릭터 카드 행 ── */}
        <div className="flex items-stretch gap-2 mb-2">

          {/* 플레이어 카드 */}
          <div className={`flex-1 rounded-2xl p-2.5 border transition-all duration-200 ${
            pFlash
              ? 'border-red-400 animate-card-hit'
              : 'border-blue-800/50'
          }`}
            style={{ background: pFlash
              ? 'linear-gradient(135deg,#2d0a0a,#1a0505)'
              : 'linear-gradient(135deg,#0a1628 0%,#050d1a 100%)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="shrink-0 w-9 h-9 flex items-center justify-center">
                <CharImage src="/chars/player.png" fallback="🛡️" size={36}
                  glow={pFlash ? 'rgba(239,68,68,0.9)' : 'rgba(96,165,250,0.65)'} flash={pFlash} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-blue-300 truncate">{player.name}</div>
                <div className="text-[8px] text-gray-600">Lv.{player.level}</div>
              </div>
            </div>
            {/* HP */}
            <div className="mb-1.5">
              <div className="flex justify-between text-[8px] mb-0.5">
                <span className="text-red-400 font-bold">HP</span>
                <span className="text-gray-500 tabular-nums">{player.hp}<span className="text-gray-700">/{player.maxHp}</span></span>
              </div>
              <div className="h-2.5 bg-black/50 rounded-full overflow-hidden border border-gray-700/40">
                <div className={`h-full rounded-full transition-all duration-700 ${
                  player.hp/player.maxHp > 0.5 ? 'bg-gradient-to-r from-green-700 to-green-500'
                  : player.hp/player.maxHp > 0.25 ? 'bg-gradient-to-r from-yellow-700 to-yellow-500'
                  : 'bg-gradient-to-r from-red-800 to-red-500'
                }`} style={{ width:`${Math.max(0,(player.hp/player.maxHp)*100)}%` }} />
              </div>
            </div>
            {/* MP */}
            <div className="h-1.5 bg-black/50 rounded-full overflow-hidden border border-gray-700/30 mb-1">
              <div className="h-full bg-gradient-to-r from-blue-800 to-blue-500 rounded-full transition-all duration-700"
                style={{ width:`${Math.max(0,(player.mp/player.maxMp)*100)}%` }} />
            </div>
            {/* 스테미너 */}
            <div className="mb-1.5">
              <PlayerElementBadges elements={playerStats.elements} compact />
            </div>
            {(() => {
              const stamPct = player.stamina / player.maxStamina;
              const stamLow = stamPct < 0.3;
              const stamCrit = stamPct < 0.15;
              return (
                <>
                  <div className={`h-1.5 bg-black/50 rounded-full overflow-hidden border mb-1.5 ${
                    stamCrit ? 'border-red-500/70 ring-1 ring-red-500/50 animate-pulse' :
                    stamLow  ? 'border-red-700/50 ring-1 ring-red-700/40' : 'border-gray-700/30'
                  }`}>
                    <div className={`h-full rounded-full transition-all duration-700 ${
                      stamPct > 0.55 ? 'bg-gradient-to-r from-yellow-700 to-yellow-400'
                      : stamPct > 0.25 ? 'bg-gradient-to-r from-orange-700 to-orange-500'
                      : 'bg-gradient-to-r from-red-800 to-red-600'
                    }`} style={{ width:`${Math.max(0, stamPct*100)}%` }} />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {/* 능력치: 스테미나로 감소된 경우 원래값도 표시 */}
                    {(() => {
                      const baseStr = player.stats.strength;
                      const baseAgi = player.stats.agility;
                      const effStr  = playerStats.strength;
                      const effAgi  = playerStats.agility;
                      const strPenalty = baseStr - effStr;
                      const agiPenalty = baseAgi - effAgi;
                      return (
                        <>
                          <span className="text-[9px] text-gray-400">
                            💪<b className={strPenalty > 0 ? 'text-red-400' : 'text-gray-200'}>{effStr}</b>
                            {strPenalty > 0 && <span className="text-red-700 ml-0.5">▼{strPenalty}</span>}
                          </span>
                          <span className="text-[9px] text-gray-400">
                            👣<b className={agiPenalty > 0 ? 'text-red-400' : 'text-gray-200'}>{effAgi}</b>
                            {agiPenalty > 0 && <span className="text-red-700 ml-0.5">▼{agiPenalty}</span>}
                          </span>
                        </>
                      );
                    })()}
                    {stamCrit && <span className="text-[8px] text-red-400 font-black animate-pulse">⚡위험!</span>}
                    {stamLow && !stamCrit && <span className="text-[8px] text-orange-500 font-bold">⚡부족</span>}
                  </div>
                </>
              );
            })()}
            <div className="flex gap-1.5 flex-wrap">
              {player.condition && (
                <span className={`text-[8px] font-bold px-1 rounded-full ${CONDITION_COLORS[player.condition]}`}
                  style={{ background:'rgba(0,0,0,0.45)' }}>
                  {CONDITION_LABELS[player.condition]}
                </span>
              )}
            </div>
          </div>

          {/* 중앙 정보 */}
          <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 min-w-[58px]">
            <span className={`text-sm font-black ${distCol}`}
              style={{ textShadow:`0 0 10px ${distance<=2?'rgba(239,68,68,0.5)':'rgba(156,163,175,0.2)'}` }}>
              {label}
            </span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
              inRange ? 'bg-green-900/40 text-green-400 border-green-700/50'
                      : 'bg-red-900/40 text-red-400 border-red-700/50'
            }`}>{inRange ? '✓ 범위' : '× 초과'}</span>
            {pBonus !== null && pBonus !== 1.0 && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${pBonus>1?'text-green-400':'text-orange-400'}`}
                style={{ background:'rgba(0,0,0,0.5)' }}>
                {pBonus>1?`+${Math.round((pBonus-1)*100)}%`:`${Math.round((pBonus-1)*100)}%`}
              </span>
            )}
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
              rowSame ? 'bg-yellow-900/40 text-yellow-300 border-yellow-700/40'
                      : 'bg-gray-800/60 text-gray-500 border-gray-700/30'
            }`}>{rowSame ? '⚔ 같은행' : '↕ 분리'}</span>
          </div>

          {/* 적 카드 */}
          <div className={`flex-1 rounded-2xl p-2.5 border transition-all duration-200 ${
            eFlash ? 'border-yellow-400 animate-card-hit' : 'border-red-800/50'
          }`}
            style={{ background: eFlash
              ? 'linear-gradient(135deg,#2d2000,#1a1000)'
              : 'linear-gradient(135deg,#1a0808 0%,#0f0404 100%)' }}>
            <div className="flex items-center gap-2 mb-2 flex-row-reverse">
              <div className="shrink-0 w-9 h-9 flex items-center justify-center">
                <CharImage
                  src={getEnemyImageSrc(enemy)}
                  fallback={enemy.isLegacy ? '👻' : enemy.isBoss ? '💀' : '⚔️'}
                  size={36}
                  glow={eFlash ? 'rgba(234,179,8,0.9)' : 'rgba(239,68,68,0.65)'} flash={eFlash} />
              </div>
              <div className="min-w-0 text-right">
                <div className="text-[10px] font-bold text-red-300 truncate">{enemy.name}</div>
                <div className="text-[8px] text-gray-600">{enemy.isBoss ? '⚠ 보스' : '적군'}</div>
              </div>
            </div>
            {/* HP */}
            <div className="mb-1.5">
              <div className="flex justify-between text-[8px] mb-0.5">
                <span className="text-red-400 font-bold">HP</span>
                <span className="text-gray-500 tabular-nums">{enemy.hp}<span className="text-gray-700">/{enemy.maxHp}</span></span>
              </div>
              <div className="h-2.5 bg-black/50 rounded-full overflow-hidden border border-gray-700/40">
                <div className={`h-full rounded-full transition-all duration-700 ${
                  enemy.hp/enemy.maxHp > 0.5 ? 'bg-gradient-to-r from-red-800 to-red-500'
                  : enemy.hp/enemy.maxHp > 0.25 ? 'bg-gradient-to-r from-orange-800 to-orange-500'
                  : 'bg-gradient-to-r from-red-950 to-red-700'
                }`} style={{ width:`${Math.max(0,(enemy.hp/enemy.maxHp)*100)}%` }} />
              </div>
            </div>
            {/* MP */}
            <div className="h-1.5 bg-black/50 rounded-full overflow-hidden border border-gray-700/30 mb-1">
              <div className="h-full bg-gradient-to-r from-purple-800 to-purple-600 rounded-full transition-all duration-700"
                style={{ width:`${Math.max(0,(enemy.mp/enemy.maxMp)*100)}%` }} />
            </div>
            {/* 스테미너 */}
            <div className="h-1.5 bg-black/50 rounded-full overflow-hidden border border-gray-700/30 mb-1.5">
              <div className="h-full bg-gradient-to-r from-orange-900 to-orange-700 rounded-full transition-all duration-700"
                style={{ width:`${Math.max(0,(enemy.stamina/enemy.maxStamina)*100)}%` }} />
            </div>
            <div className="flex gap-1.5 flex-wrap justify-end">
              <span className={`text-[9px] ${enemyStats.strength>playerStats.strength?'text-red-400':'text-green-400'}`}>
                💪<b>{enemyStats.strength}</b>
              </span>
              <span className={`text-[9px] ${enemyStats.agility>playerStats.agility?'text-red-400':'text-green-400'}`}>
                👣<b>{enemyStats.agility}</b>
              </span>
              {enemy.condition && (
                <span className={`text-[8px] font-bold px-1 rounded-full ${CONDITION_COLORS[enemy.condition]}`}
                  style={{ background:'rgba(0,0,0,0.45)' }}>
                  {CONDITION_LABELS[enemy.condition]}
                </span>
              )}
            </div>
            {enemy.abilities && enemy.abilities.length > 0 && (
              <div className="text-[7px] text-orange-600/70 mt-0.5 text-right truncate">
                {enemy.abilities.map(a=>`• ${a.name}`).join(' ')}
              </div>
            )}
          </div>
        </div>

        {/* ── 행 상태 배너 ── */}
        <div className={`text-center text-[10px] font-bold py-1 rounded-xl mb-2 border transition-all duration-300 ${
          rowSame
            ? 'bg-yellow-950/40 border-yellow-800/40 text-yellow-300'
            : 'bg-gray-900/40 border-gray-700/30 text-gray-500'
        }`}>
          {rowSame
            ? `⚔ ${rowLabel(playerRow)}열 정면 대치 — 물리 공격 명중`
            : `↕ 내 ${rowLabel(playerRow)}열 / 적 ${rowLabel(enemyRow)}열 — 물리 공격 불가`}
        </div>

        {/* ── 3×5 전술 그리드 ── */}
        <div className="relative flex flex-col gap-0.5">
          {[1,2,3].map(rowIdx => {
            const rl = rowLabel(rowIdx);
            const isPlayerRow = rowIdx === playerRow;
            const isEnemyRow  = rowIdx === enemyRow;
            const rowMismatch = !rowSame;
            return (
              <div key={rowIdx} className="flex gap-0.5 items-center">
                <div className={`w-5 text-center text-[8px] font-bold shrink-0 ${
                  isPlayerRow && isEnemyRow ? 'text-yellow-400'
                  : isPlayerRow ? 'text-blue-400'
                  : isEnemyRow  ? 'text-red-400'
                  : 'text-gray-700'
                }`}>{rl}</div>
                {[1,2,3,4,5].map(pos => {
                  const isPlayer = isPlayerRow && pos === playerPos;
                  const isEnemy  = isEnemyRow  && pos === enemyPos;
                  const isInRange = isEnemyRow && !isPlayer && !isEnemy
                                    && pos > playerPos && pos <= playerPos + playerWeaponRange
                                    && !rowMismatch;
                  return (
                    <div key={pos} className={`
                      flex-1 flex items-center justify-center rounded-lg border
                      transition-all duration-300 select-none h-10
                      ${isPlayer
                        ? `border-blue-400/80 shadow-[0_0_12px_rgba(59,130,246,0.45)] ${pFlash?'bg-red-900/70 border-red-400/80 animate-pulse':'bg-blue-900/65'}`
                        : isEnemy
                        ? `border-red-400/80 shadow-[0_0_12px_rgba(239,68,68,0.45)] ${eFlash?'bg-yellow-900/70 border-yellow-400/80 animate-pulse':'bg-red-900/65'}`
                        : isInRange
                        ? 'bg-green-950/35 border-green-700/35'
                        : isPlayerRow ? 'bg-blue-950/20 border-blue-900/25'
                        : isEnemyRow  ? 'bg-red-950/20  border-red-900/25'
                        : 'bg-white/[0.02] border-white/[0.04]'
                      }`}>
                      {isPlayer
                        ? <CharImage src="/chars/player.png" fallback="🛡️" size={28} glow={pFlash?'rgba(239,68,68,0.9)':'rgba(96,165,250,0.7)'} flash={pFlash} />
                        : isEnemy
                        ? <CharImage src={getEnemyImageSrc(enemy)} fallback={enemy.isLegacy?'👻':enemy.isBoss?'💀':'⚔️'} size={28} glow={eFlash?'rgba(234,179,8,0.9)':'rgba(239,68,68,0.7)'} flash={eFlash} />
                        : (isPlayerRow||isEnemyRow) ? <span className="text-[8px] text-gray-700 font-bold">{pos}</span>
                        : <span className="text-[6px] text-gray-800">·</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* 플로팅 데미지 */}
          <FloatingLayer texts={floatingTexts} side="player" />
          <FloatingLayer texts={floatingTexts} side="enemy" />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Animated Dice — requirement #2
// ════════════════════════════════════════════════════════════

function AnimatedDie({
  finalValue, rolling, delay = 0, isKept, isSumMode,
}: {
  finalValue: number; rolling: boolean; delay?: number;
  isKept: boolean; isSumMode: boolean;
}) {
  const [display, setDisplay] = useState(finalValue);
  const [justSettled, setJustSettled] = useState(false);
  const prevRolling = useRef(rolling);

  useEffect(() => {
    if (!rolling) {
      setDisplay(finalValue);
      if (prevRolling.current) {
        setJustSettled(true);
        setTimeout(() => setJustSettled(false), 500);
      }
      prevRolling.current = false;
      return;
    }
    prevRolling.current = true;
    let elapsed = 0;
    const iv = setInterval(() => {
      setDisplay(Math.floor(Math.random() * 6) + 1);
      elapsed += 80;
      if (elapsed >= 1200 + delay) {
        clearInterval(iv);
        setDisplay(finalValue);
      }
    }, 80);
    return () => clearInterval(iv);
  }, [rolling, finalValue, delay]);

  const isHigh = finalValue >= 5;
  const isMid  = finalValue >= 3 && finalValue < 5;
  const glowClass = isSumMode && finalValue >= 4
    ? 'text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.95)]'
    : isKept && !isSumMode
    ? isHigh ? 'text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.85)]'
    : isMid  ? 'text-orange-300 drop-shadow-[0_0_6px_rgba(251,146,60,0.6)]'
    :          'text-red-400 drop-shadow-[0_0_4px_rgba(248,113,113,0.5)]'
    : 'text-gray-600 opacity-50';

  return (
    <span className={`text-6xl inline-block ${glowClass} ${justSettled ? 'animate-dice-settle' : 'transition-all duration-200'}`}
      style={justSettled ? { animationDelay: `${delay * 0.1}ms` } : undefined}>
      {DICE_FACE[display] ?? '⚀'}
    </span>
  );
}

// 대결 주사위 한 줄 (양측 나란히 표시)
function ContestRow({
  contest, rolling, playerLabel, enemyLabel, title, delay,
}: {
  contest: DiceContest; rolling: boolean;
  playerLabel: string; enemyLabel: string;
  title: string; delay: number;
}) {
  const { winner, playerRolls, enemyRolls, playerTotal, enemyTotal } = contest;
  const pWin = winner === 'player';
  const eWin = winner === 'enemy';
  return (
    <div className={`rounded-xl p-3 border ${pWin ? 'border-blue-700/60 bg-blue-950/30' : eWin ? 'border-red-700/60 bg-red-950/30' : 'border-gray-700/40 bg-gray-950/60'}`}>
      <div className="text-center text-xs text-gray-400 font-bold mb-2">{title}</div>
      <div className="flex items-center justify-between gap-3">
        {/* 플레이어 주사위 */}
        <div className="flex-1 text-center">
          <div className={`text-[11px] mb-1.5 font-bold ${pWin ? 'text-blue-300' : 'text-gray-500'}`}>{playerLabel}</div>
          <div className="flex gap-1.5 flex-wrap justify-center">
            {playerRolls.map((v: number, i: number) => (
              <AnimatedDie key={i} finalValue={v} rolling={rolling} delay={delay + i * 100}
                isKept={v === Math.max(...playerRolls)} isSumMode={false} />
            ))}
          </div>
          <div className={`text-lg mt-1 font-black ${pWin ? 'text-blue-200' : 'text-gray-500'}`}>{playerTotal}</div>
        </div>
        {/* VS */}
        <div className="text-center shrink-0">
          {rolling
            ? <span className="text-gray-600 text-xl font-black">VS</span>
            : <span className={`text-xl font-black ${pWin ? 'text-blue-300' : eWin ? 'text-red-400' : 'text-gray-500'}`}>
                {pWin ? '◀ 승' : eWin ? '승 ▶' : '동점'}
              </span>
          }
        </div>
        {/* 적 주사위 */}
        <div className="flex-1 text-center">
          <div className={`text-[11px] mb-1.5 font-bold ${eWin ? 'text-red-300' : 'text-gray-500'}`}>{enemyLabel}</div>
          <div className="flex gap-1.5 flex-wrap justify-center">
            {enemyRolls.map((v: number, i: number) => (
              <AnimatedDie key={i} finalValue={v} rolling={rolling} delay={delay + i * 100 + 50}
                isKept={v === Math.max(...enemyRolls)} isSumMode={false} />
            ))}
          </div>
          <div className={`text-lg mt-1 font-black ${eWin ? 'text-red-200' : 'text-gray-500'}`}>{enemyTotal}</div>
        </div>
      </div>
    </div>
  );
}

function MagicRollRow({ magicRoll, rolling }: { magicRoll: MagicDiceRoll; rolling: boolean }) {
  const { rolls, total, threshold, success } = magicRoll;
  return (
    <div className={`bg-gray-950 rounded-lg p-2 border ${success ? 'border-purple-700/60' : 'border-gray-800'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-gray-400 font-bold">마법 성공 주사위</span>
        <span className={`text-[11px] font-bold ${success ? (total >= 10 ? 'text-yellow-300' : 'text-purple-300') : 'text-red-400'}`}>
          {success ? (total >= 10 ? '강화 성공!' : '성공') : `실패 (필요: ${threshold}+)`}
        </span>
      </div>
      <div className="flex gap-3 justify-center">
        {rolls.map((v: number, i: number) => (
          <AnimatedDie key={i} finalValue={v} rolling={rolling} delay={i * 120}
            isKept={success} isSumMode={success && total >= 10} />
        ))}
      </div>
      <div className="text-center text-sm mt-2">
        <span className="text-yellow-400 font-black text-lg">{total}</span>
        <span className="text-gray-500 ml-1 text-xs">({threshold}+ 성공)</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Stat Roll Screen — requirement #3
// ════════════════════════════════════════════════════════════

const STAT_KEYS = ['strength', 'agility', 'armor', 'critChance'] as const;
const STAT_LABELS: Record<string, string> = {
  strength: '💪 힘', agility: '👣 민첩', armor: '🛡️ 방어율', critChance: '🗡️ 치명타',
};

function StatRollScreen({ onComplete, highScore, playerName }: {
  onComplete: (p: Character) => void; highScore: number; playerName: string;
}) {
  const playerRef = useRef(createPlayer(highScore, playerName));
  const finalRef  = useRef(playerRef.current.stats);

  const [display, setDisplay] = useState({
    strength: 0,
    agility: 0,
    armor: 0,
    critChance: 0,
    elements: { fire: 0, water: 0, wind: 0, earth: 0, dark: 0 },
  });
  const [done, setDone]       = useState(false);

  useEffect(() => {
    let frame = 0;
    const FRAMES = 25;
    const iv = setInterval(() => {
      frame++;
      if (frame < FRAMES) {
        setDisplay({
          strength:  Math.floor(Math.random() * 50) + 5,
          agility:   Math.floor(Math.random() * 40) + 5,
          armor:     Math.floor(Math.random() * 40),
          critChance: Math.floor(Math.random() * 30),
          elements: {
            fire: Math.floor(Math.random() * 30) + 1,
            water: Math.floor(Math.random() * 30) + 1,
            wind: Math.floor(Math.random() * 30) + 1,
            earth: Math.floor(Math.random() * 30) + 1,
            dark: Math.floor(Math.random() * 30) + 1,
          },
        });
      } else {
        clearInterval(iv);
        setDisplay({
          strength:   finalRef.current.strength,
          agility:    finalRef.current.agility,
          armor:      finalRef.current.armor,
          critChance: finalRef.current.critChance,
          elements: finalRef.current.elements,
        });
        setDone(true);
        setTimeout(() => onComplete(playerRef.current), 1200);
      }
    }, 70);
    return () => clearInterval(iv);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-gray-950 text-white rounded-lg min-h-[400px] justify-center">
      <div className="text-5xl">{done ? '⚔️' : '🎲'}</div>
      <h2 className="text-2xl font-bold text-yellow-400">능력치 분배</h2>
      <p className="text-gray-500 text-sm">
        {done ? '✓ 확정! 전투 시작...' : '랜덤 분배 중...'}
      </p>
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
        {STAT_KEYS.map(k => {
          const v = display[k as keyof typeof display];
          const final = finalRef.current[k as keyof typeof finalRef.current];
          const isSettled = done;
          return (
            <div key={k} className={`bg-gray-800 rounded-lg p-3 border transition-all duration-300 ${
              isSettled ? 'border-yellow-600' : 'border-gray-700'
            }`}>
              <div className="text-[11px] text-gray-400">{STAT_LABELS[k]}</div>
              <div className={`text-2xl font-bold transition-all duration-200 tabular-nums ${
                isSettled ? 'text-yellow-300' : 'text-white'
              }`}>
                {typeof v === 'number' ? v : (final as number)}
                {isSettled && <span className="text-xs text-green-400 ml-1">✓</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="w-full max-w-xs rounded-lg border border-gray-700 bg-gray-900/70 p-3">
        <div className="mb-2 text-[11px] font-black text-gray-400">속성 능력치</div>
        <PlayerElementBadges elements={display.elements} />
      </div>
      {highScore > 0 && (
        <p className="text-gray-600 text-xs">최고 기록 보너스 +{Math.floor(highScore * 0.1)} 적용됨</p>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Enemy Intent Panel
// ════════════════════════════════════════════════════════════

const ACTION_ICONS: Record<ActionType, string> = {
  '공격': '⚔️', '방어': '🛡️', '이동': '👣', '마법 사용': '✨', '아이템 사용': '🎒',
};
const QUALITY_COLOR: Record<MatchQuality, string> = {
  perfect: 'text-yellow-300', partial: 'text-blue-300', miss: 'text-red-400',
};
const QUALITY_LABEL: Record<MatchQuality, string> = {
  perfect: '완벽 대응!', partial: '부분 대응', miss: '실패',
};

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

const ELEMENT_META = [
  { key: 'fire', label: '화', short: 'F', className: 'border-red-700/60 bg-red-950/50 text-red-200' },
  { key: 'water', label: '수', short: 'W', className: 'border-blue-700/60 bg-blue-950/50 text-blue-200' },
  { key: 'wind', label: '풍', short: 'A', className: 'border-emerald-700/60 bg-emerald-950/50 text-emerald-200' },
  { key: 'earth', label: '지', short: 'E', className: 'border-yellow-700/60 bg-yellow-950/50 text-yellow-200' },
  { key: 'dark', label: '암', short: 'D', className: 'border-purple-700/60 bg-purple-950/50 text-purple-200' },
] as const;

function PlayerElementBadges({
  elements,
  compact = false,
}: {
  elements: Character['stats']['elements'];
  compact?: boolean;
}) {
  return (
    <div className={`flex min-w-0 flex-wrap ${compact ? 'gap-1' : 'gap-1.5'}`}>
      {ELEMENT_META.map(({ key, label, short, className }) => (
        <span
          key={key}
          className={`inline-flex items-center gap-0.5 rounded border font-black leading-none ${className} ${
            compact ? 'px-1 py-0.5 text-[7px]' : 'px-1.5 py-0.5 text-[8px]'
          }`}
          title={`${label} 속성`}
        >
          <span>{compact ? short : label}</span>
          <b className="tabular-nums text-white">{elements[key]}</b>
        </span>
      ))}
    </div>
  );
}

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
          <PlayerElementBadges elements={playerStats.elements} compact />
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
          <StatusPill tone={rowSame ? 'warn' : 'neutral'}>{rowSame ? '⚔ 같은행' : '↕ 분리'}</StatusPill>
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
      <div className="space-y-1.5 min-w-0">
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { action:'공격'    as ActionType, bg:'rgba(120,20,20,0.75)',  border:'rgba(200,50,50,0.6)',  icon:'⚔️' },
            { action:'이동'    as ActionType, bg:'rgba(20,50,120,0.75)',  border:'rgba(50,100,200,0.6)', icon:'👣' },
            { action:'방어'    as ActionType, bg:'rgba(20,80,30,0.75)',   border:'rgba(50,150,70,0.6)',  icon:'🛡️' },
            { action:'마법 사용' as ActionType, bg:'rgba(70,20,120,0.75)', border:'rgba(130,60,200,0.6)', icon:'✨' },
          ]).map(({ action, bg, border, icon }) => {
            const spellCost  = getMagicCostByProgress(floor, player);
            const outOfRange = action === '공격' && distance > player.weaponRange;
            const disabled   = action === '마법 사용' && (player.mp < spellCost || magicCooldown > 0 || player.magicSlots.length === 0);
            const bonus      = distanceBonus(action, distance);
            const aRange     = getActionRange(action, player.weaponRange ?? 1);
            return (
              <button key={action} disabled={disabled} onClick={() => onMainSelect(action)}
                className={`relative flex min-w-0 items-center gap-2.5 py-2.5 px-3 rounded-lg border transition-all active:scale-95 ${
                  disabled || outOfRange ? 'cursor-pointer hover:brightness-125' : 'cursor-pointer hover:brightness-125'
                }`}
                style={{ background: disabled ? 'rgba(20,20,30,0.7)' : outOfRange ? 'rgba(90,45,10,0.75)' : bg,
                  borderColor: disabled ? 'rgba(60,60,80,0.5)' : outOfRange ? 'rgba(160,80,20,0.7)' : border }}>
                <ActionGlyph icon={icon} />
                <div className="min-w-0">
                  <div className={`truncate text-sm font-black leading-tight ${disabled ? 'text-gray-600' : outOfRange ? 'text-orange-300' : 'text-white'}`}>{action}</div>
                  <div className={`truncate text-[9px] leading-none ${disabled ? 'text-gray-700' : outOfRange ? 'text-orange-500' : 'text-gray-400'}`}>
                    {action === '공격' ? (outOfRange ? `⚠ 사거리 ${aRange}` : `사거리 ${aRange}`) :
                     action === '마법 사용' ? (disabled ? (magicCooldown > 0 ? `대기 ${magicCooldown}턴` : '사용 불가') : `사거리 ${aRange}`) :
                     action === '방어' ? '피해 감소' : '위치 이동'}
                  </div>
                </div>
                {bonus !== 1.0 && !disabled && (
                  <span className={`absolute top-1 right-1 text-[8px] font-black px-1 rounded ${bonus > 1 ? 'text-green-300 bg-green-900/50' : 'text-red-300 bg-red-900/50'}`}>
                    {bonus > 1 ? `+${Math.round((bonus-1)*100)}%` : `${Math.round((bonus-1)*100)}%`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {player.inventory.length > 0 && (
          <button onClick={() => onMainSelect('아이템 사용')}
            className="w-full flex min-w-0 items-center gap-2 py-1.5 px-3 rounded-lg border border-yellow-800/50 hover:brightness-125 active:scale-95 cursor-pointer"
            style={{ background: 'rgba(60,40,5,0.75)' }}>
            <span className="text-lg">🎒</span>
            <span className="text-xs font-bold text-yellow-300">아이템 사용</span>
            <span className="text-[9px] text-yellow-600 ml-auto truncate">{player.inventory.map(it=>it.name).join(' · ')}</span>
          </button>
        )}
      </div>
    );
  }

  if (combatStep === 'select_sub' && playerMain) {
    return (
      <div className="flex max-h-[170px] min-h-0 min-w-0 flex-col">
        <div className="mb-1.5 flex shrink-0 items-center gap-2">
          <span className="truncate text-[11px] text-gray-400 font-bold">{playerMain}</span>
          <span className="text-gray-700 text-[10px]">›</span>
          <span className="text-[10px] text-gray-500">방식 선택</span>
          <button onClick={onCancelSub}
            className="ml-auto shrink-0 text-[9px] text-gray-600 hover:text-gray-300 border border-gray-800 rounded px-2 py-0.5 bg-black/50 transition-colors">
            ← 취소
          </button>
        </div>
        <div className="min-h-0 space-y-1 overflow-y-auto overscroll-contain pr-1">
        {subOpts.map(sub => {
          const disabled  = subDisabled(sub);
          const isPerfect = sub === perfectSub;
          const isMiss    = !isPerfect && PERFECT_COUNTER[sub] === likelySub;
          const diceMods = SUB_ACTION_DICE_MODIFIERS[sub] ?? {};
          const hasDiceMods = diceMods.speed !== undefined || diceMods.strength !== undefined;
          const baseStrDice = getDiceCount(playerStats.strength, enemyStats.strength);
          const strDicePreview = playerMain === '공격' || playerMain === '방어'
            ? Math.min(4, Math.max(1, baseStrDice + (diceMods.strength ?? 0) + (isPerfect ? 1 : isMiss ? -1 : 0)))
            : null;
          return (
            <button key={sub} disabled={disabled} onClick={() => !disabled && onSubSelect(sub)}
              className={`w-full flex min-w-0 items-center justify-between gap-2 px-3 py-2.5 rounded-lg border transition-all active:scale-95 ${
                disabled  ? 'opacity-40 cursor-not-allowed bg-black/40 border-gray-800 text-gray-600' :
                isPerfect ? 'bg-yellow-900/60 border-yellow-600/70 text-yellow-200 hover:brightness-125' :
                isMiss    ? 'bg-red-950/50 border-red-800/50 text-red-300 hover:brightness-125' :
                            'bg-black/60 border-gray-700/60 text-gray-200 hover:bg-black/80 hover:border-gray-500'
              }`}>
              <div className="flex min-w-0 flex-col items-start text-left">
                <span className="max-w-full truncate text-sm font-bold leading-tight">
                  {isPerfect && <span className="text-yellow-400 mr-1">★</span>}
                  {isMiss    && <span className="text-red-500 mr-1">✗</span>}
                  {sub}
                </span>
                <span className={`max-w-full truncate text-[9px] leading-tight mt-0.5 ${
                  isPerfect ? 'text-yellow-600' : isMiss ? 'text-red-700' : 'text-gray-600'
                }`}>
                  {isPerfect ? `카운터 — 힘싸움 +1주사위` :
                   isMiss    ? `역카운터 — 힘싸움 -1주사위` :
                               SUB_ACTION_INFO[sub]?.desc ?? ''}
                </span>
                {hasDiceMods && (
                  <span className="mt-1 flex max-w-full flex-wrap gap-1">
                    {diceMods.speed !== undefined && (
                      <span className="rounded border border-blue-700/50 bg-blue-950/45 px-1.5 py-0.5 text-[8px] font-black leading-none text-blue-300">
                        속도 보정 {diceMods.speed > 0 ? '+' : ''}{diceMods.speed}
                      </span>
                    )}
                    {diceMods.strength !== undefined && (
                      <span className="rounded border border-red-700/50 bg-red-950/45 px-1.5 py-0.5 text-[8px] font-black leading-none text-red-300">
                        힘 보정 {diceMods.strength > 0 ? '+' : ''}{diceMods.strength}
                      </span>
                    )}
                  </span>
                )}
              </div>
              {strDicePreview !== null && !disabled && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                  isPerfect ? 'bg-yellow-800/60 text-yellow-300' :
                  isMiss    ? 'bg-red-900/60 text-red-400' :
                              'bg-gray-800 text-gray-400'
                }`}>
                  🎲{strDicePreview}
                </span>
              )}
            </button>
          );
        })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[170px] overflow-hidden py-4 text-center">
      <span className="text-yellow-400 font-bold animate-pulse text-sm">
        {combatStep === 'rolling' ? '🎲 주사위 굴리는 중...' : '명령 결과 확인 중...'}
      </span>
    </div>
  );
}

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
  const rowSame = playerRow === enemyRow;

  return (
    <div className="flex flex-col items-center justify-end gap-2 min-w-0">
      <div className="flex items-center gap-2">
        <span className={`text-[11px] font-bold tracking-wide ${DISTANCE_COLORS[distance] ?? 'text-gray-400'}`}>
          {DISTANCE_LABELS[distance] ?? `거리 ${distance}`}
        </span>
        <StatusPill tone={rowSame ? 'warn' : 'neutral'}>{rowSame ? '같은 행' : '행 분리'}</StatusPill>
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
                    style={{ width: pMarkerH, height: pMarkerH, fontSize: pMarkerH * 0.55,
                      background: 'rgba(59,130,246,0.7)', border: '1px solid rgba(96,165,250,0.8)',
                      boxShadow: '0 0 8px rgba(59,130,246,0.5)' }}>P</div>
                )}
                {isE && (
                  <div className="rounded-sm font-black text-red-200 flex items-center justify-center"
                    style={{ width: eMarkerH, height: eMarkerH, fontSize: eMarkerH * 0.55,
                      background: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.8)',
                      boxShadow: '0 0 8px rgba(239,68,68,0.5)' }}>E</div>
                )}
                {!isP && !isE && <div style={{ height: 1 }} />}
              </div>
              <div className="rounded-sm transition-all duration-300" style={{
                width: tileW[i], height: tileH[i],
                background: isP ? 'rgba(59,130,246,0.45)' : isE ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.05)',
                border: isP ? '1px solid rgba(96,165,250,0.65)' : isE ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.07)',
                boxShadow: isP ? '0 0 12px rgba(59,130,246,0.3)' : isE ? '0 0 12px rgba(239,68,68,0.3)' : undefined,
              }} />
              <div className="font-bold transition-colors duration-300"
                style={{ fontSize: 7, color: isP ? '#93c5fd' : isE ? '#fca5a5' : '#374151' }}>
                {pos}
              </div>
            </div>
          );
        })}
      </div>
      <div className="w-full max-w-[260px]">
        <BattleLog logs={logs} compact />
      </div>
    </div>
  );
}

function BattleDetailPanel({
  player, enemy, magicCooldown,
}: {
  player: Character;
  enemy: Character;
  magicCooldown: number;
}) {
  const enemyAbilities = enemy.abilities ?? [];
  const enemyActiveEffects = enemy.activeEffects ?? [];
  const activeEffects = player.activeEffects ?? [];
  const activeSynergies = getActiveSynergies(player);
  const injuries = player.injuries ?? [];
  const titles = player.titles.slice(0, 3);
  const hasPlayerTactics = activeEffects.length > 0 || activeSynergies.length > 0 || injuries.length > 0 || titles.length > 0 || magicCooldown > 0;
  const hasEnemyTactics = enemyAbilities.length > 0 || enemyActiveEffects.length > 0;

  return (
    <div className="flex max-h-[170px] min-h-0 min-w-0 flex-col gap-2 overflow-hidden">
      <div className="min-h-0 max-h-[86px] space-y-1 overflow-y-auto overscroll-contain pr-1">
        <div className="text-[9px] uppercase tracking-wide text-gray-500 font-black">Enemy Intel</div>
        {enemyAbilities.length > 0 && (
          <div className="space-y-0.5 max-h-16 overflow-y-auto overscroll-contain pr-1">
            {enemyAbilities.map(a => (
              <div key={a.id} className="min-w-0 text-[8px] text-orange-500/80 leading-tight whitespace-normal break-words" title={a.description}>{a.name}</div>
            ))}
          </div>
        )}
        {enemyActiveEffects.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {enemyActiveEffects.map((e, i) => (
              <StatusPill key={`${e.type}-${i}`} tone={e.type === 'extra_speed_die' ? 'warn' : 'bad'}>
                {e.type === 'stamina_drain' ? 'ST Drain'
                  : e.type === 'movement_lock' ? 'Lock'
                  : e.type === 'agility_debuff' ? 'AGI Down'
                  : e.type === 'extra_speed_die' ? 'Speed+'
                  : e.type} {e.duration}T
              </StatusPill>
            ))}
          </div>
        )}
        {!hasEnemyTactics && <div className="text-[9px] text-gray-600">특이 정보 없음</div>}
      </div>

      <div className="min-h-0 max-h-[72px] space-y-1 overflow-y-auto overscroll-contain pr-1">
        <div className="text-[9px] uppercase tracking-wide text-gray-500 font-black">Player Tactics</div>
        {activeEffects.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {activeEffects.map((e, i) => (
              <span key={i} className="text-[8px] px-1 rounded bg-blue-900/60 text-blue-300 border border-blue-700/40">
                {e.type === 'extra_speed_die' ? '⚡+속도' : e.type}({e.duration})
              </span>
            ))}
          </div>
        )}
        {injuries.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {injuries.map(inj => (
              <span key={inj.type} className={`text-[8px] px-1 rounded font-bold border ${
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
        {titles.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {titles.map(t => (
              <span key={t.id} className="text-[8px] px-1 rounded border border-gray-700/50 text-gray-400 bg-black/45">
                {t.name}
              </span>
            ))}
          </div>
        )}
        {activeSynergies.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {activeSynergies.map(syn => (
              <StatusPill key={syn.id} tone="magic">{syn.name}</StatusPill>
            ))}
          </div>
        )}
        {magicCooldown > 0 && <StatusPill tone="magic">Magic {magicCooldown}T</StatusPill>}
        {!hasPlayerTactics && <div className="text-[9px] text-gray-600">전술 보정 없음</div>}
      </div>
    </div>
  );
}

function BattleTacticalConsole({
  combatStep, playerMain, player, enemy, floor, distance, magicCooldown, subOpts,
  subDisabled, perfectSub, likelySub, enemyMainAction, playerStats, enemyStats, playerPos, enemyPos,
  playerRow, enemyRow, logs,
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
  enemyMainAction: ActionType;
  playerStats: Character['stats'];
  enemyStats: Character['stats'];
  playerPos: number;
  enemyPos: number;
  playerRow: number;
  enemyRow: number;
  logs: string[];
  onMainSelect: (action: ActionType) => void;
  onSubSelect: (sub: SubAction) => void;
  onCancelSub: () => void;
}) {
  const likelyInfo = SUB_ACTION_INFO[likelySub];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 grid grid-cols-[320px_1fr_240px] gap-3 px-4 pb-4 pointer-events-auto"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.48) 72%, transparent 100%)' }}>
      <div className="rounded-lg p-2.5 min-w-0 max-h-[190px] overflow-hidden" style={HUD_PANEL_STYLE}>
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
      <div className="rounded-lg p-2.5 min-w-0" style={HUD_PANEL_STYLE}>
        <div className="flex h-full min-w-0 flex-col justify-end gap-2">
          <div className="min-w-0 rounded border border-red-900/45 bg-red-950/30 px-2.5 py-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-base leading-none">{ACTION_ICONS[enemyMainAction] ?? '⚔️'}</span>
              <div className="min-w-0">
                <div className="truncate text-[9px] font-black uppercase tracking-wide text-red-500">
                  상대 예상 행동
                </div>
                <div className="truncate text-[11px] font-black text-red-100">
                  {enemyMainAction} / {likelySub}
                </div>
                <div className="truncate text-[9px] text-red-400/80">
                  힌트: {likelyInfo?.hint ?? likelyInfo?.desc ?? '상대의 움직임을 읽는 중'}
                </div>
              </div>
            </div>
          </div>
          <BattleLog logs={logs} compact />
        </div>
      </div>
      <div className="rounded-lg p-2.5 min-w-0 max-h-[190px] overflow-hidden" style={HUD_PANEL_STYLE}>
        <BattleDetailPanel
          player={player}
          enemy={enemy}
          magicCooldown={magicCooldown}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Sub-action Panel
// ════════════════════════════════════════════════════════════

// 이동 방향 아이콘 (그리드 이동 시각화)
const MOVE_DIR_ICON: Partial<Record<SubAction, string>> = {
  '전진 압박': '▶',
  '후퇴':       '◀',
  '위로 이동':  '▲',
  '아래로 이동':'▼',
};

function SubActionPanel({ playerMain, intent, onSelect, playerMagicSlots, playerInventory, playerPos, playerRow, enemyPos, enemyRow, distance }: {
  playerMain: ActionType; intent: EnemyIntent; onSelect: (s: SubAction) => void;
  playerMagicSlots?: MagicSpell[];
  playerInventory?: Item[];
  playerPos?: number;
  playerRow?: number;
  enemyPos?: number;
  enemyRow?: number;
  distance?: number;
}) {
  const allOptions: SubAction[] =
    playerMain === '마법 사용' && playerMagicSlots && playerMagicSlots.length > 0
      ? playerMagicSlots
      : playerMain === '아이템 사용' && playerInventory
      ? playerInventory.map(it => it.name as SubAction)
      : (SUB_ACTIONS[playerMain] ?? []) as SubAction[];

  // 이동 시 공간 없으면 해당 방향 비활성화
  const isPlayerDisabled = (sub: SubAction): boolean => {
    if (playerMain !== '이동') return false;
    if (sub === '후퇴'        && (playerPos ?? 2) <= 1) return true;
    if (sub === '전진 압박'   && (distance ?? 3) <= 1) return true;
    if (sub === '위로 이동'   && (playerRow ?? 2) <= COMBAT_ROW_MIN) return true;
    if (sub === '아래로 이동' && (playerRow ?? 2) >= COMBAT_ROW_MAX) return true;
    return false;
  };

  // 적의 이동 가능 여부 (위치 경계 기반)
  const isEnemySubImpossible = (sub: SubAction): boolean => {
    if (intent.mainAction !== '이동') return false;
    const ep = enemyPos ?? 4;
    const er = enemyRow ?? COMBAT_ROW_DEFAULT;
    if (sub === '전진 압박'   && ep <= 1) return true;
    if (sub === '후퇴'        && ep >= 5) return true;
    if (sub === '위로 이동'   && er <= COMBAT_ROW_MIN) return true;
    if (sub === '아래로 이동' && er >= COMBAT_ROW_MAX) return true;
    return false;
  };

  // 이동 옵션은 비활성화해도 표시 (이유 안내), 나머지는 필터
  const myOptions = playerMain === '이동'
    ? allOptions  // 이동은 모두 표시, 버튼 내부에서 disabled 처리
    : allOptions.filter(sub => !isPlayerDisabled(sub));

  // 불가능한 적 서브 제외 후 확률 재정규화
  const allEnemySubs = (SUB_ACTIONS[intent.mainAction] as SubAction[]).filter(s => !isEnemySubImpossible(s));
  const likelyEnemySub = allEnemySubs.length > 0
    ? allEnemySubs.reduce((a, b) => (intent.subProbs[b] ?? 0) > (intent.subProbs[a] ?? 0) ? b : a)
    : (SUB_ACTIONS[intent.mainAction] as SubAction[])[0];
  const perfectVsLikely = PERFECT_COUNTER[likelyEnemySub];

  const likelyHint = SUB_ACTION_INFO[likelyEnemySub]?.hint ?? '';

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <span className="text-base leading-none">{ACTION_ICONS[playerMain]}</span>
        <span className="text-sm font-black text-white">{playerMain}</span>
        <span className="text-[10px] text-gray-600 font-medium">— 세부 기술 선택</span>
      </div>

      {/* 적 행동 힌트 */}
      <div className="flex items-start gap-2.5 rounded-xl px-3 py-2 border border-orange-900/40"
        style={{ background: 'linear-gradient(135deg,#1f0e06,#120804)' }}>
        <span className="text-xl leading-none shrink-0 mt-0.5">🔍</span>
        <div>
          <div className="text-[10px] text-orange-700 font-bold mb-0.5 uppercase tracking-wide">적 행동 예측</div>
          <p className="text-[11px] text-orange-300 leading-snug">{likelyHint}... 이런 행동을 할 것 같습니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {myOptions.map(sub => {
          const info = SUB_ACTION_INFO[sub];
          const isPerfect = sub === perfectVsLikely;
          const dirIcon = MOVE_DIR_ICON[sub];
          const disabled = isPlayerDisabled(sub);
          const disabledReason =
            sub === '전진 압박' ? '이미 인접' :
            sub === '후퇴' ? '벽 막힘' :
            sub === '위로 이동' ? '최상행' :
            sub === '아래로 이동' ? '최하행' : '';
          const dirColor = dirIcon === '▶' ? '#4ade80' : dirIcon === '◀' ? '#fb923c' : '#60a5fa';
          return (
            <button key={sub}
              onClick={() => !disabled && onSelect(sub)}
              disabled={disabled}
              style={!disabled ? {
                background: isPerfect
                  ? 'linear-gradient(135deg,#2d2206,#1a1504)'
                  : 'linear-gradient(135deg,#141420,#0c0c18)',
                borderColor: isPerfect ? '#a16207' : '#2d2d40',
              } : { background: 'linear-gradient(135deg,#0e0e14,#090910)', borderColor: '#1a1a24' }}
              className={`relative flex flex-col items-center pt-4 pb-2 px-1.5 rounded-xl border-2 text-center transition-all
                ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-[0.94]'}`}>
              {!disabled && isPerfect && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-full font-black tracking-wide">권장</span>
              )}
              {disabled && disabledReason && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] bg-gray-800 text-gray-600 px-1.5 py-0.5 rounded-full">{disabledReason}</span>
              )}
              {dirIcon ? (
                <span className="text-xl leading-none mb-1" style={{ color: disabled ? '#374151' : dirColor }}>{dirIcon}</span>
              ) : (
                <span className="text-lg leading-none mb-1">{ACTION_ICONS[playerMain as ActionType] ?? '⚡'}</span>
              )}
              <div className={`text-[11px] font-black leading-tight mb-0.5 ${disabled ? 'text-gray-600' : isPerfect ? 'text-yellow-300' : 'text-gray-200'}`}>{sub}</div>
              <div className={`text-[9px] leading-tight ${disabled ? 'text-gray-700' : 'text-gray-600'}`}>{info.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Dice Panel (with rolling state) — requirement #2
// ════════════════════════════════════════════════════════════

function DicePanel({ result, rolling, playerName, enemyName }: {
  result: TurnResult; rolling: boolean;
  playerName: string; enemyName: string;
}) {
  const qualityColor = QUALITY_COLOR[result.quality];
  const qualityLabel = QUALITY_LABEL[result.quality];
  const isPerfect  = result.quality === 'perfect';
  const isMiss     = result.quality === 'miss';
  const isCrit     = result.isCritical;

  return (
    <div className="space-y-2">
      {rolling && (
        <div className="text-center text-yellow-400 font-bold animate-pulse py-1">🎲 주사위 굴리는 중...</div>
      )}
      {!rolling && (
        <div className={`text-center font-black text-xl py-1.5 rounded-lg
          ${isPerfect ? 'animate-quality-perfect bg-yellow-950/60 border border-yellow-600/50 text-yellow-300' :
            isMiss    ? 'animate-quality-miss bg-red-950/60 border border-red-700/50 text-red-400' :
            isCrit    ? 'animate-quality-perfect bg-orange-950/60 border border-orange-600/50 text-orange-300' :
                        `${qualityColor} bg-gray-900/60`}`}>
          {isPerfect ? '🌟 ' : isCrit ? '🔥 ' : result.quality === 'partial' ? '✅ ' : '❌ '}
          {qualityLabel}
          {isCrit && <span className="ml-1 text-sm">크리티컬!</span>}
        </div>
      )}
      {/* 속도 결정 */}
      <ContestRow contest={result.speedContest} rolling={rolling}
        playerLabel={playerName} enemyLabel={enemyName}
        title="⚡ 속도 결정" delay={0} />
      {/* 힘싸움 (공격·방어 시) */}
      {result.strengthContest && (
        <ContestRow contest={result.strengthContest} rolling={rolling}
          playerLabel={playerName} enemyLabel={enemyName}
          title="⚔ 힘싸움" delay={200} />
      )}
      {/* 마법 성공 판정 */}
      {result.magicRoll && (
        <MagicRollRow magicRoll={result.magicRoll} rolling={rolling} />
      )}
      {!rolling && (
        <div className="flex justify-center gap-6 text-sm pb-1">
          {result.damageDealt > 0 && (
            <span>
              <span className="text-gray-400">적 피해: </span>
              <span className={`font-bold ${isCrit ? 'text-yellow-300' : 'text-red-400'}`}>{result.damageDealt}</span>
            </span>
          )}
          {result.damageTaken > 0 && (
            <span>
              <span className="text-gray-400">내 피해: </span>
              <span className="font-bold text-orange-400">{result.damageTaken}</span>
            </span>
          )}
          {result.damageDealt === 0 && result.damageTaken === 0 && (
            <span className="text-gray-500">피해 없음</span>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Other screens
// ════════════════════════════════════════════════════════════

function RewardScreen({ floor, enemy, onLoot, onLootItem, onLootTitle, onSkip }: {
  floor: number; enemy: Character;
  onLoot: (eq: Equipment) => void;
  onLootItem: (it: Item) => void;
  onLootTitle: (t: Title) => void;
  onSkip: () => void;
}) {
  const [equipment] = useState(() => getRewardEquipment(floor));
  const [item] = useState(() => ITEM_REWARD_POOL[Math.floor(Math.random() * ITEM_REWARD_POOL.length)]);
  const [titles] = useState(() => generateCombatTitles(enemy));
  const [view, setView] = useState<'main' | 'titles'>('main');

  const bonusStr = (bonus: Partial<Character['stats']>) =>
    Object.entries(bonus)
      .filter(([, v]) => v && typeof v === 'number' && (v as number) > 0)
      .map(([k, v]) => `${k === 'strength' ? '힘' : k === 'agility' ? '민첩' : k === 'armor' ? '방어' : k === 'critChance' ? '크리' : k}+${v}`)
      .join(' ');

  if (view === 'titles') return (
    <div className="flex flex-col items-center gap-4 p-6 bg-gray-900 rounded-lg min-h-[300px] text-white">
      <h2 className="text-xl font-bold text-purple-300">{floor}층 — 칭호 선택</h2>
      <p className="text-xs text-gray-500">{enemy.name}을 꺾고 얻은 명성</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {titles.map(t => (
          <button key={t.id} onClick={() => onLootTitle(t)}
            className="bg-purple-900 hover:bg-purple-700 text-left rounded-lg px-4 py-3 border border-purple-600 transition-colors">
            <div className="font-bold text-purple-200">{t.name}</div>
            <div className="text-xs text-purple-400 mt-0.5">{t.condition}</div>
            <div className="text-xs text-yellow-300 mt-1">{bonusStr(t.bonus)}</div>
          </button>
        ))}
        <button onClick={() => setView('main')} className="text-gray-500 text-sm py-2">← 뒤로</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-gray-900 rounded-lg min-h-[300px] text-white">
      <h2 className="text-xl font-bold text-yellow-400">{floor}층 클리어</h2>
      <p className="text-xs text-gray-500">{enemy.name} 처치</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={() => onLoot(equipment)}
          className="bg-yellow-800 hover:bg-yellow-700 text-left rounded-lg px-4 py-3 border border-yellow-600 transition-colors">
          <div className="font-bold text-yellow-200">장비 — {equipment.name}</div>
          <div className="text-xs text-yellow-400 mt-0.5">{equipment.description}</div>
          <div className="text-xs text-gray-400 mt-1">{bonusStr(equipment.stats)}</div>
        </button>
        <button onClick={() => onLootItem(item)}
          className="bg-teal-900 hover:bg-teal-800 text-left rounded-lg px-4 py-3 border border-teal-600 transition-colors">
          <div className="font-bold text-teal-200">아이템 — {item.name}</div>
          <div className="text-xs text-teal-400 mt-0.5">{item.description}</div>
        </button>
        <button onClick={() => setView('titles')}
          className="bg-purple-900 hover:bg-purple-800 text-left rounded-lg px-4 py-3 border border-purple-600 transition-colors">
          <div className="font-bold text-purple-200">칭호 획득</div>
          <div className="text-xs text-purple-400 mt-0.5">적 능력치 기반 칭호 3종 중 선택</div>
        </button>
        <button onClick={onSkip} className="bg-gray-800 hover:bg-gray-700 text-gray-400 py-2 px-4 rounded-lg text-sm transition-colors">
          다음 층으로 →
        </button>
      </div>
    </div>
  );
}

function GameOverScreen({ floor, onRetry, onWatchAd }: {
  floor: number; onRetry: () => void; onWatchAd: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 p-8 bg-gray-950 text-white rounded-lg min-h-[300px]">
      <div className="text-5xl">💀</div>
      <h2 className="text-2xl font-bold text-red-500">패배</h2>
      <p className="text-gray-400">{floor}층에서 쓰러졌습니다.</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={onWatchAd} className="bg-green-700 hover:bg-green-600 font-bold py-3 px-4 rounded-lg transition-colors">
          📺 광고 시청 후 재도전
        </button>
        <button onClick={onRetry} className="bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 px-4 rounded-lg transition-colors">
          처음부터 시작
        </button>
      </div>
    </div>
  );
}

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

// ════════════════════════════════════════════════════════════
// Tutorial Screen
// ════════════════════════════════════════════════════════════

type TutorialStep = {
  title: string;
  subtitle?: string;
  body: string[];
  note?: string;
  /** 'intro' = atmospheric world/goal opening; 'system' = game mechanic (default) */
  variant?: 'intro' | 'system';
  icon?: string;
};

const TUTORIAL_STEPS: TutorialStep[] = [
  // ── 0. 세계관 ─────────────────────────────────────────────
  {
    variant: 'intro',
    icon: '🗼',
    title: '검의 탑',
    subtitle: '모든 것이 칼로 결정되는 세계',
    body: [
      '저 멀리, 구름을 뚫고 솟은 탑이 있다.',
      '탑 안에 사는 자는 모두 검사다 — 연습생부터 원로까지.',
      '이 탑에서 힘이란 곧 칼이며, 칼이 곧 지위다.',
      '탑을 오를수록 더 강한 검사가 기다린다.',
    ],
  },
  // ── 1. 목표 ───────────────────────────────────────────────
  {
    variant: 'intro',
    icon: '⚔️',
    title: '당신의 목표',
    subtitle: '탑의 꼭대기에 이름을 새겨라',
    body: [
      '층을 올라가며 마주치는 검사를 쓰러뜨리세요.',
      '한 번 쓰러지면 끝입니다 — 목숨은 단 하나.',
      '더 높은 층에 오를수록 이름이 기록에 남습니다.',
      '쓰러진 검사는 유령이 되어 아래 층에 다시 나타납니다.',
    ],
    note: '당신이 쓰러지면 당신의 캐릭터가 다음 플레이의 적으로 등장합니다.',
  },
  // ── 2. 전투 흐름 ──────────────────────────────────────────
  {
    variant: 'system',
    icon: '🎯',
    title: '전투의 흐름',
    subtitle: '매 턴은 두 번의 선택',
    body: [
      '① 행동 선택 — 공격 / 방어 / 이동 / 마법 / 아이템',
      '② 세부 기술 선택 — 각 행동마다 2~4가지 기술',
      '선택이 끝나면 주사위를 굴려 결과가 결정됩니다.',
      '적도 동시에 행동을 선택하고, 결과는 한꺼번에 비교됩니다.',
    ],
  },
  // ── 3. 행동 상성 ──────────────────────────────────────────
  {
    variant: 'system',
    icon: '♟',
    title: '행동의 상성',
    subtitle: '무엇이 무엇을 이기는가',
    body: [
      '공격은 이동 중인 적을 잡고, 방어는 공격을 막습니다.',
      '마법은 이동으로 피할 수 있고, 방어는 마법에 뚫립니다.',
      '행동 선택 화면에서 적의 예상 행동을 표시합니다.',
      '예상을 읽고 유리한 행동을 고르는 것이 핵심입니다.',
    ],
    note: '상성이 맞으면 더 큰 피해를 주거나, 피해를 완전히 막을 수 있습니다.',
  },
  // ── 4. 세부 기술 & 카운터 ─────────────────────────────────
  {
    variant: 'system',
    icon: '🔍',
    title: '세부 기술과 카운터',
    subtitle: '적의 자세를 읽어라',
    body: [
      '행동을 고른 뒤 세부 기술을 선택합니다.',
      '화면에서 적이 어떤 자세를 취하는지 힌트가 표시됩니다.',
      '힌트를 보고 적의 기술을 예측해 카운터를 고르세요.',
      '완벽히 맞추면 피해가 크게 늘거나 피해를 완전히 무효화합니다.',
    ],
    note: '처음엔 모릅니다. 여러 번 싸우며 패턴을 익히세요.',
  },
  // ── 5. 거리와 행 ──────────────────────────────────────────
  {
    variant: 'system',
    icon: '📐',
    title: '거리와 행(行)',
    subtitle: '전장의 공간을 지배하라',
    body: [
      '거리 1~5: 무기 사정거리 안에서만 공격이 맞습니다.',
      '가까울수록 공격이 강하고, 멀수록 마법이 강합니다.',
      '행(상/중/하): 물리 공격은 같은 행의 적만 맞힙니다.',
      '행을 바꾸면 물리 공격을 피하고 틈을 만들 수 있습니다.',
    ],
    note: '마법과 아이템은 행에 상관없이 항상 맞습니다.',
  },
  // ── 6. 주사위 & 크리티컬 ─────────────────────────────────
  {
    variant: 'system',
    icon: '🎲',
    title: '주사위와 크리티컬',
    subtitle: '힘의 차이가 주사위를 바꾼다',
    body: [
      '피해량은 주사위로 결정됩니다.',
      '내 힘이 강할수록 더 많은 주사위를 굴립니다.',
      '굴린 주사위가 모두 4 이상이면 크리티컬 — 최대 2.8배 피해.',
      '맞붙었을 때는 민첩 또는 주사위로 선제권을 겨룹니다.',
    ],
  },
  // ── 7. 스테미너 & 컨디션 ─────────────────────────────────
  {
    variant: 'system',
    icon: '⚡',
    title: '스테미너와 컨디션',
    subtitle: '몸 상태가 전투를 바꾼다',
    body: [
      '스테미너가 부족하면 힘과 민첩이 떨어집니다.',
      '이동 행동은 스테미너를 소모하지 않는 유일한 회복 수단입니다.',
      '층을 이동할 때마다 컨디션이 새로 정해집니다.',
      '최상(+10%) ~ 최악(-30%)까지 모든 능력치에 영향을 줍니다.',
    ],
    note: '컨디션이 나빠도 포기하지 마세요. 전략으로 극복할 수 있습니다.',
  },
  // ── 8. 보상과 성장 ────────────────────────────────────────
  {
    variant: 'system',
    icon: '🏆',
    title: '보상과 성장',
    subtitle: '적을 쓰러뜨리면 선택이 기다린다',
    body: [
      '적을 처치하면 보상 화면에서 하나를 선택합니다.',
      '장비(T1~T3): 힘·민첩·방어 등 능력치가 영구 상승.',
      '아이템: 전투 중 사용 가능한 소모품을 획득.',
      '칭호: 적 능력치 기반으로 생성된 3개 중 하나를 선택해 능력치 보너스를 얻습니다.',
    ],
    note: '층이 높을수록 더 강한 티어의 장비가 등장합니다.',
  },
];

function TutorialScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const isLast  = step === TUTORIAL_STEPS.length - 1;
  const isIntro = current.variant === 'intro';

  const systemTotal = TUTORIAL_STEPS.length - 2;

  return (
    <div className={`flex flex-col min-h-[520px] text-white rounded-xl overflow-hidden border ${
      isIntro ? 'border-yellow-900/60' : 'border-gray-800'
    }`}
      style={isIntro
        ? { background: 'linear-gradient(180deg, #09060f 0%, #130a08 60%, #08080d 100%)' }
        : { background: '#080c10' }
      }>

      {/* ── 진행 표시줄 ── */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        {/* 세계관 2칸 */}
        {[0,1].map(i => (
          <div key={`l${i}`} className={`h-1 rounded-full transition-all duration-300 ${
            i < step ? 'bg-yellow-500' : i === step ? 'bg-yellow-400 flex-[2]' : 'bg-gray-700'
          }`} style={{ flex: i === step ? 2 : 1 }} />
        ))}
        <div className="w-px h-3 bg-gray-700 mx-0.5 shrink-0" />
        {/* 시스템 칸들 */}
        {Array.from({ length: systemTotal }).map((_, i) => {
          const si = i + 2;
          return (
            <div key={`s${i}`} className={`h-1 rounded-full transition-all duration-300`}
              style={{ flex: si === step ? 2 : 1,
                background: si < step ? '#3b82f6' : si === step ? '#60a5fa' : '#1f2937' }} />
          );
        })}
      </div>

      {/* ── 상단 태그 ── */}
      <div className="px-4 pb-1">
        <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${
          isIntro ? 'bg-yellow-900/50 text-yellow-500' : 'bg-blue-900/40 text-blue-400'
        }`}>
          {isIntro ? '세계관' : '시스템 가이드'} &nbsp;{step + 1}/{TUTORIAL_STEPS.length}
        </span>
      </div>

      {/* ── 컨텐츠 ── */}
      <div className="flex-1 flex flex-col justify-center gap-4 px-6 py-4 overflow-y-auto">

        {/* 아이콘 + 제목 */}
        <div className={`flex items-start gap-3 ${isIntro ? 'mb-2' : ''}`}>
          {current.icon && (
            <span className={`shrink-0 leading-none ${isIntro ? 'text-5xl' : 'text-3xl'}`}
              style={isIntro ? { filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.7))' } : {}}>
              {current.icon}
            </span>
          )}
          <div>
            <h2 className={`font-black leading-tight ${
              isIntro ? 'text-2xl text-yellow-300' : 'text-lg text-blue-300'
            }`} style={isIntro ? { textShadow: '0 0 16px rgba(251,191,36,0.4)' } : {}}>
              {current.title}
            </h2>
            {current.subtitle && (
              <p className={`text-xs mt-0.5 ${isIntro ? 'text-yellow-700' : 'text-gray-500'}`}>
                {current.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* 구분선 (intro만) */}
        {isIntro && (
          <div className="flex items-center gap-2 -mt-2 -mb-1">
            <div className="h-px flex-1 bg-yellow-900/40" />
            <span className="text-yellow-900 text-xs">✦</span>
            <div className="h-px flex-1 bg-yellow-900/40" />
          </div>
        )}

        {/* 본문 */}
        <ul className="space-y-2.5">
          {current.body.map((line, i) => (
            <li key={i} className={`flex items-start gap-2 leading-relaxed ${
              isIntro ? 'text-sm text-gray-300' : 'text-sm text-gray-300'
            }`}>
              <span className={`mt-0.5 shrink-0 text-xs ${isIntro ? 'text-yellow-700' : 'text-blue-600'}`}>▸</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        {/* 노트 */}
        {current.note && (
          <p className={`text-xs leading-relaxed border-l-2 pl-3 mt-1 ${
            isIntro
              ? 'text-yellow-700/80 border-yellow-900'
              : 'text-gray-500 border-gray-700'
          }`}>
            {current.note}
          </p>
        )}
      </div>

      {/* ── 내비게이션 ── */}
      <div className={`flex items-center justify-between px-4 py-3 gap-3 border-t ${
        isIntro ? 'bg-black/30 border-yellow-900/30' : 'bg-gray-900/60 border-gray-800'
      }`}>
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-4 py-2 rounded-lg text-sm text-gray-400 border border-gray-700 disabled:opacity-20 hover:bg-gray-800 transition-colors">
          이전
        </button>

        {/* 페이지 점들 */}
        <div className="flex gap-1">
          {TUTORIAL_STEPS.map((_, i) => (
            <div key={i} onClick={() => setStep(i)}
              className={`rounded-full cursor-pointer transition-all duration-200 ${
                i === step
                  ? `w-4 h-2 ${isIntro ? 'bg-yellow-400' : 'bg-blue-400'}`
                  : i < step
                  ? 'w-2 h-2 bg-gray-500'
                  : 'w-2 h-2 bg-gray-700'
              }`} />
          ))}
        </div>

        {isLast ? (
          <button onClick={onComplete}
            className="px-5 py-2 rounded-lg text-sm font-bold bg-yellow-600 hover:bg-yellow-500 text-black transition-all hover:scale-105 active:scale-95">
            시작 ⚔
          </button>
        ) : (
          <button onClick={() => setStep(s => s + 1)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95 ${
              isIntro
                ? 'bg-yellow-800 hover:bg-yellow-700 text-yellow-100'
                : 'bg-blue-800 hover:bg-blue-700 text-blue-100'
            }`}>
            다음 →
          </button>
        )}
      </div>
    </div>
  );
}

function StartScreen({ highScore, onSelectSlot, onNewGame, onTutorial }: {
  highScore: number;
  onSelectSlot: (slotIndex: number) => void;
  onNewGame: (slotIndex: number) => void;
  onTutorial: () => void;
}) {
  const [metas, setMetas] = useState<ReturnType<typeof getAllSlotMetas>>([null, null, null]);
  const [confirm, setConfirm] = useState<{ slot: number; mode: 'delete' | 'new' } | null>(null);

  useEffect(() => { setMetas(getAllSlotMetas()); }, []);

  const fmt = (ts: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const handleDelete = (i: number) => {
    clearGameSlot(i);
    setMetas(prev => { const next = [...prev]; next[i] = null; return next; });
    setConfirm(null);
  };

  const handleNewGame = (i: number) => {
    clearGameSlot(i);
    setMetas(prev => { const next = [...prev]; next[i] = null; return next; });
    setConfirm(null);
    onNewGame(i);
  };

  return (
    <div className="flex flex-col items-center min-h-screen text-white"
      style={{ background: 'linear-gradient(180deg, #08080f 0%, #0f0a18 50%, #100808 100%)' }}>

      {/* 타이틀 섹션 */}
      <div className="flex flex-col items-center pt-16 pb-8">
        <div className="text-7xl mb-4" style={{ filter: 'drop-shadow(0 0 16px rgba(251,191,36,0.8))' }}>⚔️</div>
        <p className="text-yellow-400 text-xs tracking-[0.4em] uppercase mb-2">Tower of Swords</p>
        <h1 className="text-4xl font-black text-yellow-300 tracking-wider" style={{ textShadow: '0 0 24px rgba(251,191,36,0.5)' }}>
          T of Sword
        </h1>
        <div className="flex items-center gap-3 mt-5">
          <div className="h-px w-20 bg-yellow-900" />
          <span className="text-yellow-600 text-sm">✦</span>
          <div className="h-px w-20 bg-yellow-900" />
        </div>
      </div>

      {/* 설명 & 최고기록 */}
      <div className="flex flex-col items-center gap-2 mb-8 px-8">
        <p className="text-gray-300 text-sm text-center leading-relaxed">탑을 올라 전설의 검사가 되어라</p>
        <p className="text-gray-500 text-xs text-center">거리를 좁히고 · 적의 의도를 꿰뚫어라</p>
        {highScore > 0 && (
          <div className="flex items-center gap-2 mt-2 bg-yellow-950 border border-yellow-800 px-4 py-1.5 rounded-full">
            <span className="text-yellow-400 text-xs">🏆 최고 기록</span>
            <span className="text-yellow-300 text-sm font-bold">{highScore}층</span>
          </div>
        )}
      </div>

      {/* 슬롯 선택 */}
      <div className="w-full max-w-xs px-5 flex flex-col gap-3">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-px flex-1 bg-gray-700" />
          <span className="text-gray-400 text-xs tracking-widest uppercase">저장 슬롯</span>
          <div className="h-px flex-1 bg-gray-700" />
        </div>

        {[0, 1, 2].map(i => {
          const meta = metas[i];
          const isConfirming = confirm?.slot === i;

          return (
            <div key={i} className="flex flex-col gap-1">
              {/* 메인 슬롯 버튼 */}
              <button onClick={() => { setConfirm(null); onSelectSlot(i); }}
                className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-150 active:scale-95 hover:brightness-125"
                style={meta ? {
                  background: 'rgba(30,58,138,0.4)', borderColor: '#3b82f6',
                } : {
                  background: 'rgba(31,41,55,0.6)', borderColor: '#374151',
                }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{meta ? '💾' : '📂'}</span>
                  <div className="text-left">
                    <div className="text-sm font-bold text-white">
                      슬롯 {i+1}
                      {meta
                        ? <span className="ml-2 text-blue-300">{meta.floor}층</span>
                        : <span className="ml-2 text-gray-400 font-normal">— 비어있음</span>}
                    </div>
                    <div className="text-xs mt-0.5">
                      {meta
                        ? <span className="text-gray-400">{meta.playerName} · {fmt(meta.timestamp)}</span>
                        : <span className="text-gray-500">새 게임 시작</span>}
                    </div>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${meta ? 'text-blue-300' : 'text-gray-400'}`}>
                  {meta ? '계속 ›' : '시작 ›'}
                </span>
              </button>

              {/* 저장 슬롯인 경우: 삭제 / 새로하기 버튼 분리 */}
              {meta && !isConfirming && (
                <div className="flex justify-end gap-3 pr-1">
                  <button onClick={() => setConfirm({ slot: i, mode: 'delete' })}
                    className="text-[11px] text-gray-600 hover:text-red-400 transition-colors py-0.5">
                    🗑 삭제
                  </button>
                  <button onClick={() => setConfirm({ slot: i, mode: 'new' })}
                    className="text-[11px] text-gray-500 hover:text-yellow-400 transition-colors py-0.5">
                    ↺ 새로하기
                  </button>
                </div>
              )}

              {/* 확인 다이얼로그 */}
              {isConfirming && confirm && (
                <div className="flex items-center justify-between bg-red-950/60 border border-red-800 rounded-lg px-3 py-2">
                  <span className="text-xs text-red-300">
                    {confirm.mode === 'delete' ? '저장 데이터를 삭제할까요?' : '새 게임을 시작할까요? (저장 삭제)'}
                  </span>
                  <div className="flex gap-2 ml-2 shrink-0">
                    <button
                      onClick={() => confirm.mode === 'delete' ? handleDelete(i) : handleNewGame(i)}
                      className="text-[11px] bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors font-bold">
                      {confirm.mode === 'delete' ? '삭제' : '시작'}
                    </button>
                    <button onClick={() => setConfirm(null)}
                      className="text-[11px] text-gray-400 hover:text-white px-2 py-1 rounded transition-colors">
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 튜토리얼 버튼 */}
      <div className="mt-6 px-5 w-full max-w-xs">
        <button onClick={onTutorial}
          className="w-full py-2 rounded-xl border border-gray-700 text-gray-500 text-xs hover:text-gray-300 hover:border-gray-500 transition-colors">
          📖 게임 가이드 보기
        </button>
      </div>

      {/* 하단 버전 */}
      <div className="mt-auto pb-6 pt-4">
        <p className="text-gray-700 text-xs text-center tracking-wider">v1.6.0 · T of Sword</p>
      </div>
    </div>
  );
}

function BattleLog({ logs, compact }: { logs: string[]; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  if (compact) {
    const recent = logs.slice(-3);
    return (
      <div ref={ref} className="overflow-hidden rounded p-1 space-y-0.5" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {recent.map((l, i) => (
          <p key={i} className={`text-[10px] leading-tight ${i === recent.length - 1 ? 'text-gray-200' : 'text-gray-600'}`}>{l}</p>
        ))}
      </div>
    );
  }
  return (
    <div ref={ref} className="h-20 overflow-y-auto bg-gray-950 border border-gray-800 rounded p-2 text-xs space-y-0.5">
      {logs.map((l, i) => (
        <p key={i} className={i === logs.length - 1 ? 'text-white' : 'text-gray-500'}>{l}</p>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Magic Absorb Panel — 마법 슬롯 교체 UI
// ════════════════════════════════════════════════════════════

function MagicAbsorbPanel({ newSpell, currentSlots, onSwap, onSkip }: {
  newSpell: MagicSpell;
  currentSlots: MagicSpell[];
  onSwap: (index: number) => void;
  onSkip: () => void;
}) {
  const spellEmoji: Record<MagicSpell, string> = {
    '화염 쇄도': '🔥', '암흑 속박': '🌑', '회복술': '💚', '빙결 창': '❄️',
    '번개 일격': '⚡', '바람 쇄도': '🌀',
  };
  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-gray-900 rounded-lg text-white">
      <div className="text-4xl">{spellEmoji[newSpell] ?? '✨'}</div>
      <h2 className="text-xl font-bold text-purple-400">✨ 새 마법 흡수 가능!</h2>
      <div className="w-full max-w-xs bg-purple-900/30 border border-purple-600 rounded-lg p-3 text-center">
        <div className="text-purple-300 font-bold text-lg">{newSpell}</div>
        <div className="text-gray-400 text-xs mt-1">{SUB_ACTION_INFO[newSpell]?.desc}</div>
      </div>
      <div className="text-yellow-400 text-sm font-bold">슬롯 가득 참 (3/3) — 교체할 슬롯을 선택하세요</div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {currentSlots.map((spell, i) => (
          <button key={i} onClick={() => onSwap(i)}
            className="bg-gray-800 hover:bg-purple-900/50 border border-gray-600 hover:border-purple-500 rounded-lg p-3 text-left transition-all active:scale-95">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">{spellEmoji[spell] ?? '✨'} 슬롯 {i + 1}: {spell}</span>
              <span className="text-purple-400 text-xs">교체 →</span>
            </div>
            <div className="text-gray-500 text-xs mt-0.5">{SUB_ACTION_INFO[spell]?.desc}</div>
            <div className="text-purple-300 text-xs mt-1">→ {newSpell}으로 교체</div>
          </button>
        ))}
        <button onClick={onSkip}
          className="bg-gray-700 hover:bg-gray-600 text-gray-400 py-2 px-4 rounded-lg transition-colors text-sm">
          흡수 건너뛰기
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Name Input Screen
// ════════════════════════════════════════════════════════════

const PRESET_NAMES = ['검사', '기사', '방랑자', '검성', '암살자', '수호자', '전사', '검귀'];

function NameInputScreen({ onComplete }: { onComplete: (name: string) => void }) {
  const [name, setName] = useState('');
  const handleConfirm = () => {
    const trimmed = name.trim();
    onComplete(trimmed || '검사');
  };
  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-gray-950 text-white rounded-lg min-h-[380px] justify-center">
      <div className="text-5xl">⚔️</div>
      <h2 className="text-2xl font-bold text-yellow-400">검사의 이름</h2>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value.slice(0, 10))}
        onKeyDown={e => e.key === 'Enter' && handleConfirm()}
        placeholder="검사"
        maxLength={10}
        autoFocus
        className="w-full max-w-xs text-center text-xl font-bold bg-gray-800 border-2 border-yellow-700 focus:border-yellow-400 rounded-lg px-4 py-3 text-white outline-none transition-colors placeholder:text-gray-600"
      />
      <button onClick={handleConfirm}
        className="w-full max-w-xs bg-yellow-700 hover:bg-yellow-600 active:scale-95 font-bold py-3 px-6 rounded-lg text-white text-lg transition-all">
        {name.trim() ? `${name.trim()} 으로 시작` : '검사로 시작'} →
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ROOT
// ════════════════════════════════════════════════════════════

export default function SwordmastersAscent() {
  const [phase, setPhase]       = useState<GamePhase>('start');
  const [pendingPlayerName, setPendingPlayerName] = useState('검사');
  const [floor, setFloor]       = useState(1);
  const [highScore, setHighScore] = useState(() => loadHighScore());
  const [player, setPlayer]     = useState<Character | null>(null);
  const [enemy, setEnemy]       = useState<Character | null>(null);
  const [legacy, setLegacy]     = useState<Character[]>([]);
  const [logs, setLogs]         = useState<string[]>(['게임을 시작하세요.']);
  const [floating, setFloating] = useState<FloatingText[]>([]);
  // 5칸 그리드 위치: 플레이어 1번 칸, 적 4번 칸 → 거리 3
  const [playerPos, setPlayerPos] = useState(1);
  const [enemyPos,  setEnemyPos]  = useState(4);
  // 행(Y축) 위치: 1-3, 기본 2 (중앙)
  const [playerRow, setPlayerRow] = useState(COMBAT_ROW_DEFAULT);
  const [enemyRow,  setEnemyRow]  = useState(COMBAT_ROW_DEFAULT);
  const distance = enemyPos - playerPos;  // 파생값
  const [magicCooldown, setMagicCooldown] = useState(0);
  const [activeSaveSlot, setActiveSaveSlot] = useState(-1);

  // combat state
  const [combatStep, setCombatStep] = useState<CombatStep>('select_main');
  const [intent, setIntent]         = useState<EnemyIntent | null>(null);
  const [playerMain, setPlayerMain] = useState<ActionType | null>(null);
  const [lastPlayerMain, setLastPlayerMain] = useState<ActionType | null>(null);
  const [lastPlayerSub,  setLastPlayerSub]  = useState<SubAction | null>(null);
  const [turnResult, setTurnResult] = useState<TurnResult | null>(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [hitFlash, setHitFlash] = useState<'player' | 'enemy' | 'both' | null>(null);
  const [diceWinnerFlash, setDiceWinnerFlash] = useState<'player' | 'enemy' | null>(null);

  const [stats, setStats] = useState({ floorsCleared:0, bossesKilled:0, perfectBlocks:0 });
  const [pendingMagicAbsorb, setPendingMagicAbsorb] = useState<MagicSpell | null>(null);
  const [resultFlash, setResultFlash] = useState<'perfect' | 'critical' | 'miss' | null>(null);
  const [screenShake,     setScreenShake]     = useState(false);
  const [injuryVignette,  setInjuryVignette]  = useState(false);
  const [enemyDeathFlash, setEnemyDeathFlash] = useState(false);
  const [playerMoveDir, setPlayerMoveDir] = useState<'forward' | 'back' | null>(null);
  const [enemyMoveDir,  setEnemyMoveDir]  = useState<'forward' | 'back' | null>(null);
  const [currentEvent, setCurrentEvent]   = useState<FloorEvent | null>(null);
  const [unlockedKeys, setUnlockedKeys] = useState<Set<UnlockKey>>(() => loadUnlocks());
  const prevPlayerPos = useRef(playerPos);
  const prevEnemyPos  = useRef(enemyPos);
  useEffect(() => {
    if (prevPlayerPos.current !== playerPos) {
      const dir = playerPos > prevPlayerPos.current ? 'forward' : 'back';
      setPlayerMoveDir(dir);
      setTimeout(() => setPlayerMoveDir(null), 500);
      prevPlayerPos.current = playerPos;
    }
  }, [playerPos]);
  useEffect(() => {
    if (prevEnemyPos.current !== enemyPos) {
      const dir = enemyPos < prevEnemyPos.current ? 'forward' : 'back';
      setEnemyMoveDir(dir);
      setTimeout(() => setEnemyMoveDir(null), 500);
      prevEnemyPos.current = enemyPos;
    }
  }, [enemyPos]);
  const addLog = useCallback((msg: string) => setLogs(p => [...p.slice(-60), msg]), []);

  const checkAndUnlock = useCallback((floor: number, bossKilled: boolean) => {
    const bossCount = loadBossCount() + (bossKilled ? 1 : 0);
    if (bossKilled) saveBossCount(bossCount);
    setUnlockedKeys(prev => {
      const updated = new Set(prev);
      if (floor >= 5)  updated.add('unlock_assassin');
      if (floor >= 10) updated.add('unlock_arcane');
      if (floor >= 20) updated.add('unlock_tank');
      if (bossKilled && bossCount >= 1) updated.add('unlock_magic_start');
      if (bossCount >= 5) updated.add('unlock_hard_mode');
      if (updated.size !== prev.size) saveUnlocks(updated);
      return updated.size !== prev.size ? updated : prev;
    });
  }, []);

  const showFloat = useCallback((text: string, type: FloatingText['type'], side: FloatingText['side']) => {
    const id = `${Date.now()}-${Math.random()}`;
    setFloating(p => [...p, { id, text, type, side }]);
    setTimeout(() => setFloating(p => p.filter(f => f.id !== id)), 1800);
  }, []);

  // 저장 데이터를 state에 적용 (슬롯 인덱스를 먼저 set한 뒤 호출)
  const applyLoadedSave = useCallback((saved: SaveState) => {
    const safeCombatStep: CombatStep =
      saved.combatStep === 'rolling' || saved.combatStep === 'result'
        ? 'select_main' : saved.combatStep;
    const normalizedPlayer = {
      ...saved.player,
      stamina: saved.player.stamina ?? saved.player.maxStamina ?? 40,
      maxStamina: saved.player.maxStamina ?? 40,
      magicSlots: Array.isArray(saved.player.magicSlots) && saved.player.magicSlots.length > 0
        ? saved.player.magicSlots
        : [MAGIC_SPELL_POOL[Math.floor(Math.random() * MAGIC_SPELL_POOL.length)]],
    };
    const normalizedEnemy = {
      ...saved.enemy,
      stamina: saved.enemy.stamina ?? saved.enemy.maxStamina ?? 30,
      maxStamina: saved.enemy.maxStamina ?? 30,
      magicSlots: Array.isArray(saved.enemy.magicSlots) ? saved.enemy.magicSlots : [],
    };
    const loadedHighScore = Math.max(loadHighScore(), saved.highScore ?? 0);
    saveHighScore(loadedHighScore);
    setHighScore(loadedHighScore);
    setPhase(saved.phase === 'gameover' || saved.phase === 'start' ? 'stat_roll' : saved.phase);
    setFloor(saved.floor);
    // 신규 저장: playerPos/enemyPos 직접 사용. 구 저장: distance로 복원
    setPlayerPos(saved.playerPos ?? 1);
    setEnemyPos(saved.enemyPos ?? (1 + (saved.distance ?? 3)));
    setPlayerRow(saved.playerRow ?? COMBAT_ROW_DEFAULT);
    setEnemyRow(saved.enemyRow  ?? COMBAT_ROW_DEFAULT);
    setMagicCooldown(saved.magicCooldown);
    setCombatStep(safeCombatStep);
    setPlayer(normalizedPlayer);
    setEnemy(normalizedEnemy);
    setIntent(safeCombatStep === 'select_main' && saved.intent ? saved.intent : null);
    setTurnResult(null);
    setStats(saved.stats);
    setLogs(saved.logs.length ? [...saved.logs, '📂 저장된 게임을 불러왔습니다.'] : ['📂 저장된 게임을 불러왔습니다.']);
    setLegacy(saved.legacy ?? []);
  }, []);

  // 슬롯 선택: 데이터 있으면 로드, 없으면 이름 입력 → 새 게임
  const handleSlotSelect = useCallback((slotIndex: number) => {
    setActiveSaveSlot(slotIndex);
    const saved = loadGameSlot(slotIndex);
    if (saved) {
      applyLoadedSave(saved);
      return;
    }
    setPhase('naming');
    setFloor(1); setPlayerPos(1); setEnemyPos(4); setMagicCooldown(0); setPlayerRow(COMBAT_ROW_DEFAULT); setEnemyRow(COMBAT_ROW_DEFAULT);
  }, [applyLoadedSave]);

  // 슬롯 새로하기: 저장 삭제 후 튜토리얼(첫 플레이) 또는 이름 입력
  const handleNewGame = useCallback((slotIndex: number) => {
    setActiveSaveSlot(slotIndex);
    setPlayer(null); setEnemy(null);
    setFloor(1); setPlayerPos(1); setEnemyPos(4); setMagicCooldown(0); setPlayerRow(COMBAT_ROW_DEFAULT); setEnemyRow(COMBAT_ROW_DEFAULT);
    const tutorialDone = typeof window !== 'undefined' && localStorage.getItem(TUTORIAL_KEY) === 'true';
    setPhase(tutorialDone ? 'naming' : 'tutorial');
  }, []);

  const updateHighScore = useCallback((newFloor: number) => {
    setHighScore(prev => {
      const next = Math.max(prev, newFloor);
      saveHighScore(next);
      return next;
    });
  }, []);

  const saveCurrentGame = useCallback(() => {
    if (!player || !enemy || phase === 'gameover' || activeSaveSlot < 0) return;
    const safeCombatStep: CombatStep =
      combatStep === 'rolling' || combatStep === 'result' ? 'select_main' : combatStep;
    const state: SaveState = {
      phase, floor, highScore, timestamp: Date.now(),
      playerPos, enemyPos, playerRow, enemyRow, magicCooldown,
      combatStep: safeCombatStep, player, enemy, intent,
      stats, logs, legacy,
      currentEvent: null, // FloorEvent.apply는 직렬화 불가 — 저장 안 함
    };
    saveGameSlot(activeSaveSlot, state);
    addLog('💾 게임 저장됨');
  }, [phase, floor, highScore, playerPos, enemyPos, playerRow, enemyRow, magicCooldown, combatStep, player, enemy, intent, stats, logs, legacy, activeSaveSlot, addLog]);

  // 자동 저장 비활성화 — 수동 저장 버튼으로만 저장됨

  // 게임오버 시 저장 슬롯 삭제
  useEffect(() => {
    if (phase === 'gameover' && activeSaveSlot >= 0) {
      clearGameSlot(activeSaveSlot);
    }
  }, [phase, activeSaveSlot]);

  const spawnIntent = useCallback((eng: Character, pRow?: number, eRow?: number, pPos?: number, ePos?: number, pHp?: number, pMaxHp?: number) => {
    const w = eng.actionWeights ?? DEFAULT_ACTION_WEIGHTS;
    const ctx = {
      enemyHp: eng.hp, enemyMaxHp: eng.maxHp,
      playerHp: pHp ?? 90, playerMaxHp: pMaxHp ?? 90,
      distance: (ePos ?? 4) - (pPos ?? 1),
      enemyWeaponRange: eng.weaponRange ?? 1,
      playerRow: pRow ?? COMBAT_ROW_DEFAULT,
      enemyRow:  eRow  ?? COMBAT_ROW_DEFAULT,
      enemyPos:  ePos  ?? 4,
      bossPattern: eng.bossPattern as AIContext['bossPattern'],
      playerLastMain: lastPlayerMain ?? undefined,
      playerLastSub:  lastPlayerSub  ?? undefined,
    };
    setIntent(generateEnemyIntent(w, ctx));
    setCombatStep('select_main');
    setPlayerMain(null);
    setTurnResult(null);
    setDiceRolling(false);
  }, [lastPlayerMain, lastPlayerSub]);

  // ── Auto-advance: result → next turn (req #4) ─────────────
  useEffect(() => {
    if (combatStep !== 'result' || !turnResult || !enemy || !player) return;
    if (enemy.hp <= 0 || player.hp <= 0) return; // handled elsewhere
    const t = setTimeout(() => {
      if (enemy.hp > 0 && player && player.hp > 0)
        spawnIntent(enemy, playerRow, enemyRow, playerPos, enemyPos, player.hp, player.maxHp);
    }, 2000);
    return () => clearTimeout(t);
  }, [combatStep, turnResult, enemy, player, playerRow, enemyRow, playerPos, enemyPos, spawnIntent]);

  // 광고 재도전: 같은 슬롯으로 새 게임 시작
  const startGame = useCallback(() => {
    setPhase('stat_roll');
    setFloor(1); setPlayerPos(1); setEnemyPos(4); setMagicCooldown(0); setPlayerRow(COMBAT_ROW_DEFAULT); setEnemyRow(COMBAT_ROW_DEFAULT);
    setLogs(['능력치를 분배하는 중...']);
  }, []);

  const completeTutorial = useCallback(() => {
    if (typeof window !== 'undefined') localStorage.setItem(TUTORIAL_KEY, 'true');
    setPhase('stat_roll');
    setFloor(1); setPlayerPos(1); setEnemyPos(4); setMagicCooldown(0); setPlayerRow(COMBAT_ROW_DEFAULT); setEnemyRow(COMBAT_ROW_DEFAULT);
    setLogs(['능력치를 분배하는 중...']);
  }, []);

  const onStatRollComplete = useCallback((p: Character) => {
    const ghosts = loadFloorGhosts();
    const e = generateEnemy(1, legacy, ghosts, p);
    setPlayer(p); setEnemy(e); setFloor(1);
    setPlayerPos(1); setEnemyPos(4); setMagicCooldown(0); setPlayerRow(COMBAT_ROW_DEFAULT); setEnemyRow(COMBAT_ROW_DEFAULT);
    setLogs([`전투 시작! 적: ${e.name}${e.isLegacy ? ' 👻' : ''}`]);
    setPhase('battle');
    spawnIntent(e, COMBAT_ROW_DEFAULT, COMBAT_ROW_DEFAULT, 1, 4, p.hp, p.maxHp);
    setStats({ floorsCleared:0, bossesKilled:0, perfectBlocks:0 });
  }, [legacy, spawnIntent]);

  const nextFloor = useCallback((p: Character, currentFloor: number) => {
    // 클리어한 층에 현재 캐릭터를 유령으로 등록 (다음 플레이에서 만날 수 있음)
    addFloorGhost(currentFloor, p);
    const nf = currentFloor + 1;
    // ── 이벤트 분기 ──────────────────────────────────────────
    if (shouldTriggerEvent(nf)) {
      const event = generateFloorEvent(nf, p);
      setCurrentEvent(event);
      setFloor(nf);
      setPlayer(p); // 아직 컨디션 리롤 안 함 — 이벤트 후 전투 진입 시 적용
      setPhase('event');
      return;
    }
    const ghosts = loadFloorGhosts();
    const e = generateEnemy(nf, legacy, ghosts);
    const newCond = rollCondition();
    const pWithCond = { ...p, condition: newCond, hp: p.maxHp };
    setFloor(nf); setEnemy(e); setPlayer(pWithCond); setPhase('battle');
    setPlayerPos(1); setEnemyPos(4); setPlayerRow(COMBAT_ROW_DEFAULT); setEnemyRow(COMBAT_ROW_DEFAULT);
    const condMsg = newCond !== 'normal' ? ` (컨디션: ${CONDITION_LABELS[newCond]})` : '';
    addLog(`=== ${nf}층 ===  적: ${e.name}${e.isLegacy ? ' (유령)' : ''}${condMsg}`);
    spawnIntent(e, COMBAT_ROW_DEFAULT, COMBAT_ROW_DEFAULT, 1, 4, pWithCond.hp, pWithCond.maxHp);
  }, [legacy, addLog, spawnIntent]);

  const handleEventChoice = useCallback((choice: FloorEventChoice) => {
    if (!player) return;
    // 선택 효과 적용
    const updatedPlayer = choice.apply(player);
    setCurrentEvent(null);

    // 이벤트 후 전투 진입: 컨디션 리롤 + 적 생성
    const ghosts = loadFloorGhosts();
    const e = generateEnemy(floor, legacy, ghosts);
    const newCond = rollCondition();
    const pWithCond = { ...updatedPlayer, condition: newCond, hp: updatedPlayer.hp }; // HP는 이벤트 효과 반영
    setEnemy(e); setPlayer(pWithCond); setPhase('battle');
    setPlayerPos(1); setEnemyPos(4); setPlayerRow(COMBAT_ROW_DEFAULT); setEnemyRow(COMBAT_ROW_DEFAULT);
    const condMsg = newCond !== 'normal' ? ` (컨디션: ${CONDITION_LABELS[newCond]})` : '';
    addLog(`=== ${floor}층 ===  적: ${e.name}${e.isLegacy ? ' (유령)' : ''}${condMsg}`);
    spawnIntent(e, COMBAT_ROW_DEFAULT, COMBAT_ROW_DEFAULT, 1, 4, pWithCond.hp, pWithCond.maxHp);
  }, [player, floor, legacy, addLog, spawnIntent]);

  // ── Step 1: pick main ────────────────────────────────────
  const handleMainSelect = useCallback((action: ActionType) => {
    setPlayerMain(action);
    setCombatStep('select_sub');
  }, []);

  // ── Step 2: pick sub → rolling → result ──────────────────
  const handleSubSelect = useCallback((sub: SubAction) => {
    if (!player || !enemy || !intent || !playerMain) return;

    const { magicDamageBonus, rangedDamageBonus } = getEffectiveStatsWithSynergy(player);
    const result = resolveTurn(playerMain, sub, enemy, intent, player, playerPos, enemyPos, playerRow, enemyRow, magicDamageBonus, rangedDamageBonus);

    // Show rolling animation first (req #2)
    setTurnResult(result);
    setCombatStep('rolling');
    setDiceRolling(true);

    setTimeout(() => {
      // ── Phase 1 (t=1900ms): 주사위 완전 종료 + 상태 전체 업데이트 ──
      setDiceRolling(false);
      setCombatStep('result');
      setLastPlayerMain(playerMain);
      setLastPlayerSub(sub);

      // 위치 업데이트
      setPlayerPos(result.newPlayerPos);
      setEnemyPos(result.newEnemyPos);
      setPlayerRow(result.newPlayerRow);
      setEnemyRow(result.newEnemyRow);
      if (result.newDistance !== distance) {
        const moved = result.newDistance < distance ? '거리가 좁혀졌다.' : '거리가 벌어졌다.';
        addLog(`  ${moved}`);
      }
      if (result.newPlayerRow !== playerRow) addLog(`  발을 옆으로 옮겨 행을 바꿨다.`);
      if (result.newEnemyRow  !== enemyRow)  addLog(`  적이 옆으로 이동했다.`);

      // 서술형 메인 로그
      addLog(`  ${result.message}`);

      // 주사위 결과 (간략)
      const spd = result.speedContest;
      addLog(`  속도 [${spd.playerRolls.join(' ')}]=${spd.playerTotal} vs [${spd.enemyRolls.join(' ')}]=${spd.enemyTotal} → ${spd.winner === 'player' ? '선제' : spd.winner === 'enemy' ? '후공' : '동점'}`);
      if (result.strengthContest) {
        const str = result.strengthContest;
        addLog(`  힘싸움 [${str.playerRolls.join(' ')}]=${str.playerTotal} vs [${str.enemyRolls.join(' ')}]=${str.enemyTotal} → ${str.winner === 'player' ? '승' : str.winner === 'enemy' ? '패' : '팽팽'}`);
      }
      if (result.magicRoll) {
        const mg = result.magicRoll;
        addLog(`  마법 주사위 [${mg.rolls.join(' ')}]=${mg.total} → ${mg.success ? '성공' : '실패'}`);
      }

      // 속도 승자 플래시 (캐릭터 근처, 즉시)
      if (spd.winner !== 'tie') {
        setDiceWinnerFlash(spd.winner);
        setTimeout(() => setDiceWinnerFlash(null), 1400);
      }

      // Apply damage + healing
      let newPlayerHp = Math.min(player.maxHp, player.hp - result.damageTaken + (result.healAmount ?? 0));
      let newEnemyHp  = enemy.hp  - result.damageDealt;
      const playerMpRegen = getMagicRegenByProgress(floor, player);
      const playerSpellCost = getMagicCostByProgress(floor, player);
      let newPlayerMp = Math.min(player.maxMp, Math.max(0, player.mp + playerMpRegen - (playerMain === '마법 사용' ? playerSpellCost : 0)));
      const extraEnemyMp = enemy.abilities?.reduce((sum, a) => sum + (a.mpRegen ?? 0), 0) ?? 0;
      const newEnemyMp = Math.min(enemy.maxMp, enemy.mp + 5 + extraEnemyMp);
      let nextCooldown = magicCooldown;
      if (playerMain === '마법 사용') {
        nextCooldown = getMagicCooldownByProgress(floor, player) + 1;
      } else if (nextCooldown > 0) {
        nextCooldown = Math.max(0, nextCooldown - 1);
      }
      setMagicCooldown(nextCooldown);

      // 스태미나 계산
      const playerAttackDoubleLoss =
        playerMain === '공격' &&
        result.speedContest?.winner === 'enemy' &&
        result.strengthContest?.winner === 'enemy';
      const enemyAttackDoubleLoss =
        intent.mainAction === '공격' &&
        result.speedContest?.winner === 'player' &&
        result.strengthContest?.winner === 'player';
      const playerStamDelta = playerMain === '방어' && !result.strengthContest
        ? getStaminaDelta('이동')
        : getStaminaDelta(playerMain) - (playerAttackDoubleLoss ? 15 : 0);
      const enemyStamDelta = getStaminaDelta(intent.mainAction) - (enemyAttackDoubleLoss ? 15 : 0);

      let newStats = { ...stats };
      if (result.quality === 'perfect' && playerMain === '방어') newStats.perfectBlocks++;

      const updatedEnemy  = {
        ...enemy,
        hp: Math.max(0, newEnemyHp),
        mp: newEnemyMp,
        stamina: Math.max(0, Math.min(enemy.maxStamina, enemy.stamina + enemyStamDelta)),
      };
      let   updatedPlayer = {
        ...player,
        hp: Math.max(0, newPlayerHp),
        mp: Math.max(0, newPlayerMp),
        stamina: Math.max(0, Math.min(player.maxStamina, player.stamina + playerStamDelta + (result.bonusStamina ?? 0))),
      };
      // StatusEffect 틱 처리 (기존 효과 만료) + 새 효과 추가
      updatedPlayer = tickStatusEffects(updatedPlayer);
      updatedPlayer = addStatusEffects(updatedPlayer, result.newPlayerEffects);

      // 몸 부상 스테미너 틱 (이번 턴 새로 생긴 부상은 다음 턴부터 적용)
      const bodyDrain = getBodyInjuryStaminaDrain(updatedPlayer.injuries ?? []);
      if (bodyDrain > 0) {
        updatedPlayer = { ...updatedPlayer, stamina: Math.max(0, updatedPlayer.stamina - bodyDrain) };
      }

      // 새 부상 추가
      if (result.newPlayerInjury) {
        const injury = result.newPlayerInjury;
        const existingInjuries = updatedPlayer.injuries ?? [];
        const existing = existingInjuries.find(i => i.type === injury.type);
        // 기존 부상이 이미 major면 덮어쓰지 않음 (rollInjury에서 막아야 하지만 방어)
        if (!existing || existing.severity !== 'major' || injury.severity === 'major') {
          const filtered = existingInjuries.filter(i => i.type !== injury.type);
          updatedPlayer = { ...updatedPlayer, injuries: [...filtered, injury] };
          const typeName = injury.type === 'arm' ? '팔' : injury.type === 'leg' ? '다리' : '몸';
          const sevName = injury.severity === 'minor' ? '경상' : '중상';
          const isUpgrade = existing && existing.severity === 'minor' && injury.severity === 'major';
          addLog(`  ${isUpgrade ? '부상 악화' : '부상 발생'}: ${typeName} 부상 (${sevName})`);
          setInjuryVignette(true);
          setTimeout(() => setInjuryVignette(false), 1200);
        }
      }

      // updatedEnemy is const — reassign:
      let mutableEnemy = tickStatusEffects(updatedEnemy);
      mutableEnemy = addStatusEffects(mutableEnemy, result.newEnemyEffects);
      // 아이템 소모 (모든 아이템은 사용 후 1개 제거)
      if (playerMain === '아이템 사용') {
        const usedIdx = updatedPlayer.inventory.findIndex(it => it.name === sub);
        if (usedIdx >= 0) {
          const newInv = [...updatedPlayer.inventory];
          newInv.splice(usedIdx, 1);
          updatedPlayer = { ...updatedPlayer, inventory: newInv };
          const remaining = newInv.filter(it => it.name === sub).length;
          addLog(`  ${sub}을 사용했다. (남은 ${remaining}개)`)
        }
      }

      // ── Phase 2 내부 함수: 데미지 연출 (t=2400ms) ──────────────
      const showDamageEffects = () => {
        // 화면 플래시
        const flashType = result.quality === 'perfect' ? 'perfect'
          : result.isCritical ? 'critical'
          : result.quality === 'miss' ? 'miss' : null;
        if (flashType) {
          setResultFlash(flashType);
          setTimeout(() => setResultFlash(null), 900);
        }
        // 행 미스 플로팅
        if (result.playerRowMiss) { showFloat('빗나감!', 'miss', 'enemy'); addLog(`  행 이동으로 공격이 허공을 갈랐다.`); }
        if (result.enemyRowMiss)  { showFloat('회피!',   'miss', 'player'); addLog(`  행 이동으로 적의 공격을 피했다.`); }
        // 스태미나 플로팅
        if (playerStamDelta > 0) showFloat(`⚡+${playerStamDelta}`, 'info', 'player');
        // 데미지 플로팅 (캐릭터 근처)
        if (result.damageDealt > 0) showFloat(
          result.isCritical ? `CRIT! ${result.damageDealt}` : `${result.damageDealt}`,
          result.isCritical ? 'critical' : 'damage', 'enemy');
        if (result.damageTaken > 0) showFloat(`-${result.damageTaken}`, 'damage', 'player');
        // 피격 플래시
        const flash = result.damageDealt > 0 && result.damageTaken > 0 ? 'both'
          : result.damageDealt > 0 ? 'enemy'
          : result.damageTaken > 0 ? 'player' : null;
        if (flash) { setHitFlash(flash); setTimeout(() => setHitFlash(null), 350); }
        // 화면 흔들림 — 최대체력의 20% 이상 피해 시
        if (result.damageTaken >= player.maxHp * 0.20) {
          setScreenShake(true);
          setTimeout(() => setScreenShake(false), 400);
        }
        if (result.healAmount && result.healAmount > 0) {
          showFloat(`+${result.healAmount}`, 'heal', 'player');
          addLog(`  체력이 회복되었다.`);
        }
        if (result.damageTaken === 0 && result.damageDealt === 0 && result.quality === 'perfect') {
          showFloat('완벽 차단!', 'info', 'player');
        }
      };

      // ── 검사 왕 2페이즈 부활 ──────────────────────────────
      if (mutableEnemy.hp <= 0 && mutableEnemy.bossPattern === 'king' && !mutableEnemy.phase2Triggered) {
        const reviveHp = Math.floor(mutableEnemy.maxHp * 0.5);
        mutableEnemy = {
          ...mutableEnemy,
          hp: reviveHp,
          phase2Triggered: true,
          name: '검사 왕 (2페이즈)',
          actionWeights: { '공격': 50, '이동': 10, '방어': 15, '마법 사용': 25, '아이템 사용': 0 },
        };
        addLog('검사 왕이 쓰러지지 않는다! 더 강한 힘으로 부활했다!');
      } else if (mutableEnemy.hp <= 0) {
        setEnemyDeathFlash(true);
        setTimeout(() => setEnemyDeathFlash(false), 650);
      // Enemy defeated
        const isBoss = enemy.isBoss ?? false;
        newStats = { ...newStats, floorsCleared: newStats.floorsCleared + 1,
          bossesKilled: isBoss ? newStats.bossesKilled + 1 : newStats.bossesKilled };
        if (newStats.perfectBlocks >= 10 && !updatedPlayer.titles.find(t => t.id === 'weapon_breaker')) {
          updatedPlayer = { ...updatedPlayer, titles: [...updatedPlayer.titles, { ...(TITLES_DATA.find(t=>t.id==='weapon_breaker') ?? TITLES_DATA[0]), equipped:false }] };
          addLog('완벽한 방어로 무기 파괴자 칭호를 얻었다.');
        }
        if (newStats.floorsCleared >= 5 && !updatedPlayer.titles.find(t => t.id === 'tower_climber')) {
          updatedPlayer = { ...updatedPlayer, titles: [...updatedPlayer.titles, { ...(TITLES_DATA.find(t=>t.id==='tower_climber') ?? TITLES_DATA[0]), equipped:false }] };
          addLog('5층을 넘어서며 탑 등반가 칭호를 얻었다.');
        }
        if (newStats.floorsCleared >= 10 && !updatedPlayer.titles.find(t => t.id === 'magic_adept')) {
          updatedPlayer = { ...updatedPlayer, titles: [...updatedPlayer.titles, { ...(TITLES_DATA.find(t=>t.id==='magic_adept') ?? TITLES_DATA[0]), equipped:false }] };
          addLog('10층을 돌파하며 비전 연구자 칭호를 얻었다.');
        }
        if (isBoss && !updatedPlayer.titles.find(t => t.id === 'boss_slayer')) {
          updatedPlayer = { ...updatedPlayer, titles: [...updatedPlayer.titles, { ...(TITLES_DATA.find(t=>t.id==='boss_slayer') ?? TITLES_DATA[0]), equipped:false }] };
          addLog('강적을 쓰러뜨리며 보스 사냥꾼 칭호를 얻었다.');
        }
        if (updatedPlayer.hp <= player.maxHp * 0.25 && !updatedPlayer.titles.find(t => t.id === 'survivor')) {
          updatedPlayer = { ...updatedPlayer, titles: [...updatedPlayer.titles, { ...(TITLES_DATA.find(t=>t.id==='survivor') ?? TITLES_DATA[0]), equipped:false }] };
          addLog('가까스로 살아남아 생존자 칭호를 얻었다.');
        }
        setStats(newStats);
        updateHighScore(floor);
        addLog(`${enemy.name}이 쓰러졌다.`);

        // 마법 흡수
        const enemySpell = mutableEnemy.magicSlots.length > 0 ? mutableEnemy.magicSlots[0] : null;
        if (enemySpell) {
          if (updatedPlayer.magicSlots.length < 3) {
            const newSlots = [...updatedPlayer.magicSlots, enemySpell] as MagicSpell[];
            updatedPlayer = { ...updatedPlayer, magicSlots: newSlots };
            addLog(`적의 ${enemySpell} 기운이 몸에 스몄다.`);
          } else {
            setPendingMagicAbsorb(enemySpell);
            addLog(`적의 ${enemySpell} 기운이 남아있다.`);
          }
        }

        checkAndUnlock(floor, enemy.isBoss ?? false);
        setPlayer(updatedPlayer); setEnemy(mutableEnemy);
        setTimeout(showDamageEffects, 500);
        setTimeout(() => setPhase('reward'), 1200);
        return;
      }

      // Player defeated — 생명력 개념 없음, 즉시 게임오버
      if (updatedPlayer.hp <= 0) {
        // 2층 이상에서 사망 시 아래 층에 이름을 가진 몬스터로 저장
        if (floor >= 2) {
          addFloorGhost(floor - 1, updatedPlayer);
          addLog(`${updatedPlayer.name} — ${floor - 1}층에 유령으로 출몰`);
        }
        setLegacy(p => [...p.slice(-4), {
          ...updatedPlayer,
          id: `legacy_${Date.now()}`,
          name: `${updatedPlayer.name}의 영혼`,
          isLegacy: true,
          hp: updatedPlayer.maxHp, mp: updatedPlayer.maxMp,
        }]);
        updateHighScore(floor);
        addLog('패배');
        setPlayer({ ...updatedPlayer, hp: 0 });
        setEnemy(mutableEnemy);
        setTimeout(showDamageEffects, 500);
        setTimeout(() => setPhase('gameover'), 1200);
        return;
      }

      setStats(newStats);
      setPlayer(updatedPlayer);
      setEnemy(mutableEnemy);
      // ── Phase 2 (t=2400ms): 데미지 연출 — 주사위 결과 확인 후 등장 ──
      setTimeout(showDamageEffects, 500);
    }, 1900); // 주사위 전체 완전 종료 대기 (최대 delay=550ms → 1200+550+여유=1900ms)
  }, [player, enemy, intent, playerMain, playerPos, enemyPos, playerRow, enemyRow, distance, stats, floor, magicCooldown, updateHighScore, addLog, showFloat, checkAndUnlock]);

  // ════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════

  if (phase === 'start') return (
    <div className="min-h-screen"><StartScreen highScore={highScore} onSelectSlot={handleSlotSelect} onNewGame={handleNewGame} onTutorial={() => setPhase('tutorial')} /></div>
  );

  if (phase === 'tutorial') return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <TutorialScreen onComplete={completeTutorial} />
      </div>
    </div>
  );

  if (phase === 'naming') return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <NameInputScreen onComplete={(name) => {
          setPendingPlayerName(name);
          setPhase('stat_roll');
          setLogs([`${name} — 능력치를 분배하는 중...`]);
        }} />
      </div>
    </div>
  );

  if (phase === 'stat_roll') return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <StatRollScreen highScore={highScore} onComplete={onStatRollComplete} playerName={pendingPlayerName} />
      </div>
    </div>
  );

  if (phase === 'gameover') return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md"><GameOverScreen floor={floor} onRetry={() => { setPhase('start'); setPlayer(null); setEnemy(null); setActiveSaveSlot(-1); }} onWatchAd={startGame} /></div>
    </div>
  );

  if (phase === 'reward' && player && enemy) {
    // 마법 슬롯 교체가 필요한 경우 먼저 보여줌
    if (pendingMagicAbsorb) return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <MagicAbsorbPanel
            newSpell={pendingMagicAbsorb}
            currentSlots={player.magicSlots}
            onSwap={(i) => {
              const newSlots = [...player.magicSlots] as MagicSpell[];
              newSlots[i] = pendingMagicAbsorb;
              setPlayer({ ...player, magicSlots: newSlots });
              addLog(`✨ 슬롯 ${i + 1}: ${pendingMagicAbsorb} 흡수 완료`);
              setPendingMagicAbsorb(null);
            }}
            onSkip={() => { setPendingMagicAbsorb(null); addLog('마법 흡수 건너뜀'); }}
          />
        </div>
      </div>
    );
    return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <RewardScreen floor={floor} enemy={enemy}
          onLoot={eq => {
            let p = { ...player, equipment: [...player.equipment, eq] };
            if (eq.stats.strength) p = { ...p, stats: { ...p.stats, strength: p.stats.strength + (eq.stats.strength??0) }};
            if (eq.stats.agility)  p = { ...p, stats: { ...p.stats, agility:  p.stats.agility  + (eq.stats.agility ??0) }};
            if (eq.stats.armor)    p = { ...p, stats: { ...p.stats, armor: Math.min(80, p.stats.armor+(eq.stats.armor??0)) }};
            if (eq.range && eq.range > p.weaponRange) p = { ...p, weaponRange: eq.range };
            addLog(`${eq.name}을 손에 쥐었다.`); nextFloor(p, floor);
          }}
          onLootItem={it => {
            const p = { ...player, inventory: [...player.inventory, it] };
            addLog(`${it.name}을 챙겼다.`); nextFloor(p, floor);
          }}
          onLootTitle={t => {
            const bonus = t.bonus as Partial<Character['stats']>;
            let p = { ...player, titles: [...player.titles, t] };
            if (bonus.strength)  p = { ...p, stats: { ...p.stats, strength:  p.stats.strength  + (bonus.strength  ?? 0) }};
            if (bonus.agility)   p = { ...p, stats: { ...p.stats, agility:   p.stats.agility   + (bonus.agility   ?? 0) }};
            if (bonus.armor)     p = { ...p, stats: { ...p.stats, armor:     Math.min(80, p.stats.armor + (bonus.armor ?? 0)) }};
            if (bonus.critChance)p = { ...p, stats: { ...p.stats, critChance: p.stats.critChance + (bonus.critChance ?? 0) }};
            addLog(`칭호를 얻었다 — ${t.name}.`); nextFloor(p, floor);
          }}
          onSkip={() => nextFloor(player, floor)}
        />
      </div>
    </div>
    );
  }

  if (phase === 'event' && currentEvent) {
    return (
      <EventScreen
        event={currentEvent}
        floor={floor}
        onChoice={handleEventChoice}
      />
    );
  }

  if (!player || !enemy || !intent) return null;

  const eStats  = getEffectiveStats(enemy);
  const pStats  = getEffectiveStats(player);
  const pFlash  = hitFlash === 'player' || hitFlash === 'both';
  const eFlash  = hitFlash === 'enemy'  || hitFlash === 'both';

  // 서브 액션 옵션 계산
  const subOpts: SubAction[] = playerMain
    ? (playerMain === '마법 사용' && player.magicSlots.length > 0
        ? (player.magicSlots as SubAction[])
        : playerMain === '아이템 사용' && player.inventory.length > 0
        ? player.inventory.map(it => it.name as SubAction)
        : playerMain === '공격'
        ? [...(SUB_ACTIONS[playerMain] ?? []), ...(distance === 0 ? ['뒤로 베기' as SubAction] : [])]
        : (SUB_ACTIONS[playerMain] ?? []) as SubAction[])
    : [];
  const subDisabled = (sub: SubAction): boolean => {
    if (sub === '후퇴'        && playerMain === '이동' && playerPos <= 1) return true;
    if (sub === '전진 압박'   && playerMain === '이동' && distance <= 0)  return true;
    if (sub === '위로 이동'   && playerMain === '이동' && playerRow <= COMBAT_ROW_MIN) return true;
    if (sub === '아래로 이동' && playerMain === '이동' && playerRow >= COMBAT_ROW_MAX) return true;
    // 뒤로 베기는 밀착(distance=0)일 때만 유효
    if (sub === '뒤로 베기' && distance > 0) return true;
    return false;
  };
  const likelySub = (() => {
    const all = SUB_ACTIONS[intent.mainAction] as SubAction[];
    const valid = all.filter(s => {
      if (s === '전진 압박' && enemyPos <= 1) return false;
      if (s === '후퇴'      && enemyPos >= 5) return false;
      if (s === '위로 이동' && enemyRow <= COMBAT_ROW_MIN) return false;
      if (s === '아래로 이동' && enemyRow >= COMBAT_ROW_MAX) return false;
      return true;
    });
    return valid.length > 0
      ? valid.reduce((a, b) => (intent.subProbs[b] ?? 0) > (intent.subProbs[a] ?? 0) ? b : a)
      : all[0];
  })();
  const perfectSub = PERFECT_COUNTER[likelySub];
  const rowSame = playerRow === enemyRow;
  const intentHint = `${ACTION_ICONS[intent.mainAction]} ${SUB_ACTION_INFO[likelySub]?.hint ?? '...'}`;

  // ── 바닥 원근 그리드 좌표계 ──────────────────────────────────
  // pos1=앞(카메라 가까움·화면 아래), pos5=뒤(원경·화면 위)
  // row1=왼쪽, row2=중앙, row3=오른쪽
  const G_NY = 610, G_FY = 430;        // floor perspective Y
  const G_NL = 205, G_NR = 1175;       // near edge X
  const G_FL = 610, G_FR = 1010;       // far edge X
  const gPt = (td: number, tl: number) => {
    const nx = G_NL + tl * (G_NR - G_NL);
    const fx = G_FL + tl * (G_FR - G_FL);
    return { x: nx + td * (fx - nx), y: G_NY + td * (G_FY - G_NY) };
  };
  const pTD = (2 * playerPos - 1) / 10;  // pos1=0.1 … pos5=0.9
  const sameCell = playerPos === enemyPos && playerRow === enemyRow;
  const laneCenter = (row: number) => (row - 0.5) / 3;
  const pTL = Math.max(0, Math.min(1, laneCenter(playerRow) + (sameCell ? -0.055 : 0)));
  const eTD = (2 * enemyPos  - 1) / 10;
  const eTL = Math.max(0, Math.min(1, laneCenter(enemyRow) + (sameCell ? 0.055 : 0)));
  const pC  = gPt(pTD, pTL);
  const eC  = gPt(eTD, eTL);
  const perspectiveSize = (depth: number) => {
    const near = 318;
    const far = 168;
    const t = Math.max(0, Math.min(1, (depth - 0.1) / 0.8));
    return Math.round(near - (near - far) * Math.pow(t, 0.72));
  };
  const playerSize   = perspectiveSize(pTD);
  const enemySize    = perspectiveSize(eTD);
  const playerVisualCenterOffset = -131 / 2048 * playerSize;
  const enemyVisualCenterOffset = 29 / 1024 * enemySize;
  const playerBottomPad = 89 / 2048 * playerSize;
  const enemyBottomPad = 16 / 1024 * enemySize;
  const playerLeft   = Math.round(pC.x - playerSize / 2 - playerVisualCenterOffset);
  const playerBottom = Math.round(BATTLE_CANVAS_HEIGHT - pC.y - playerBottomPad);
  const enemyLeft    = Math.round(eC.x - enemySize / 2 - enemyVisualCenterOffset);
  const enemyBottom  = Math.round(BATTLE_CANVAS_HEIGHT - eC.y - enemyBottomPad);

  return (
    <BattleViewport>
    <div className={`relative overflow-hidden${screenShake ? ' animate-screen-shake' : ''}`}
      style={{ width: BATTLE_CANVAS_WIDTH, height: BATTLE_CANVAS_HEIGHT, background: '#050508' }}>

      {/* ══════ 배경 이미지 ══════ */}
      <img src="/bg/background.png" alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" />

      {/* ── 부상 비네트 오버레이 ── */}
      {injuryVignette && (
        <div className="absolute inset-0 animate-injury-vignette pointer-events-none z-50" />
      )}

      {/* ── 적 처치 황금 플래시 ── */}
      {enemyDeathFlash && (
        <div
          className="absolute inset-0 animate-enemy-death-flash pointer-events-none z-40"
          style={{ background: 'radial-gradient(ellipse at 72% 42%, rgba(255,230,100,0.9) 0%, rgba(255,180,40,0.5) 30%, transparent 62%)' }}
        />
      )}

      {/* ══════ 바닥 원근 그리드 ══════ */}
      {(() => {
        const sameCell = playerPos === enemyPos && playerRow === enemyRow;
        // 셀 하이라이트용 사각형 꼭짓점
        const cellPts = (p: number, r: number) => {
          const td0 = (p-1)/5, td1 = p/5;
          const tl0 = (r-1)/3, tl1 = r/3;
          const a = gPt(td0,tl0), b = gPt(td0,tl1);
          const c = gPt(td1,tl1), d = gPt(td1,tl0);
          return `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`;
        };
        return (
          <svg className="absolute pointer-events-none select-none"
            style={{ left:0, top:0, width:'100%', height:'100%', zIndex:3 }}
            viewBox="0 0 1280 720">

            {/* 바닥 면 */}
            <polygon
              points={`${G_NL},${G_NY} ${G_NR},${G_NY} ${G_FR},${G_FY} ${G_FL},${G_FY}`}
              fill="rgba(30,50,75,0.10)" />

            {/* 셀 하이라이트 */}
            <polygon points={cellPts(playerPos, playerRow)}
              fill={sameCell ? 'rgba(220,150,50,0.15)' : 'rgba(59,130,246,0.12)'} />
            {!sameCell && (
              <polygon points={cellPts(enemyPos, enemyRow)}
                fill="rgba(239,68,68,0.12)" />
            )}

            {/* 깊이 선 — pos 경계 (앞→뒤 6줄) */}
            {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((td, i) => {
              const l = gPt(td, 0), r = gPt(td, 1);
              const isEdge = i === 0 || i === 5;
              return <line key={i}
                x1={l.x} y1={l.y} x2={r.x} y2={r.y}
                stroke={`rgba(100,160,220,${isEdge ? 0.35 : 0.22})`}
                strokeWidth={isEdge ? 1.5 : 1} />;
            })}

            {/* 레인 선 — row 경계 (좌→우 4줄) */}
            {[0, 1/3, 2/3, 1].map((tl, i) => {
              const n = gPt(0, tl), f = gPt(1, tl);
              return <line key={i}
                x1={n.x} y1={n.y} x2={f.x} y2={f.y}
                stroke="rgba(100,160,220,0.25)" strokeWidth={1.5} />;
            })}

            {/* 포지션 번호 — 근경 왼쪽 */}
            {[1,2,3,4,5].map(pos => {
              const pt = gPt((2*pos-1)/10, 0);
              const isP = pos === playerPos, isE = pos === enemyPos;
              return <text key={pos} x={pt.x - 18} y={pt.y + 1}
                fontSize="9" fontWeight="bold"
                fill={isP && isE ? 'rgba(251,191,36,0.9)'
                    : isP ? 'rgba(96,165,250,0.85)'
                    : isE ? 'rgba(248,113,113,0.85)'
                    : 'rgba(255,255,255,0.25)'}>{pos}</text>;
            })}

            {/* 행 레이블 — 근경 가장자리 */}
            {(['상','중','하'] as const).map((lbl, i) => {
              const pt = gPt(0, (i + 0.5) / 3);
              return <text key={i} x={pt.x + 4} y={pt.y - 5}
                fontSize="9" fontWeight="bold"
                fill="rgba(255,255,255,0.22)">{lbl}</text>;
            })}

            {/* 밀착 경고 */}
            {sameCell && (
              <text x={pC.x} y={pC.y - 16}
                textAnchor="middle" fontSize="11" fontWeight="bold"
                fill="rgba(251,191,36,0.9)">⚔ 밀착</text>
            )}
          </svg>
        );
      })()}

      {/* ══════ 캐릭터 — pos에 따라 깊이(y)·크기 변화 ══════ */}
      {/* 플레이어: pos1=아래/크게, pos5=위/작게 */}
      <div className="absolute pointer-events-none flex items-end"
        style={{
          left: `${playerLeft}px`,
          bottom: `${playerBottom}px`,
          zIndex: 10 - playerPos,
          transition: 'left 0.4s cubic-bezier(0.34,1.2,0.64,1), bottom 0.4s cubic-bezier(0.34,1.2,0.64,1)',
          filter: playerMoveDir === 'forward' ? 'brightness(1.4)' : playerMoveDir === 'back' ? 'brightness(0.8)' : undefined,
        }}>
        <CharImage src="/chars/player.png" fallback="🛡️" size={playerSize}
          glow={pFlash ? 'rgba(239,68,68,0.6)' : 'rgba(96,165,250,0.2)'} flash={pFlash} />
      </div>
      {/* 적 */}
      <div className="absolute pointer-events-none flex items-end"
        style={{
          left: `${enemyLeft}px`,
          bottom: `${enemyBottom}px`,
          zIndex: 10 - enemyPos,
          transition: 'left 0.4s cubic-bezier(0.34,1.2,0.64,1), bottom 0.4s cubic-bezier(0.34,1.2,0.64,1)',
          filter: enemyMoveDir === 'forward' ? 'brightness(1.4)' : enemyMoveDir === 'back' ? 'brightness(0.8)' : undefined,
        }}>
        <CharImage src={getEnemyImageSrc(enemy)} fallback={enemy.isBoss ? '💀' : '⚔️'} size={enemySize}
          glow={eFlash ? 'rgba(234,179,8,0.7)' : 'rgba(239,68,68,0.2)'} flash={eFlash} />
      </div>

      {/* ══════ 그라디언트 오버레이 ══════ */}
      {/* 좌우 캐릭터 뒤 어두운 무대 — 흰 배경 이미지를 자연스럽게 흡수 */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 22%, transparent 38%, transparent 62%, rgba(0,0,0,0.45) 78%, rgba(0,0,0,0.82) 100%)' }} />
      {/* 상하 UI 영역 어둡게 */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, transparent 20%, transparent 52%, rgba(0,0,0,0.94) 100%)' }} />

      {/* ══════ 주사위 패널 — 캐릭터 사이 중앙 오버레이 ══════ */}
      {(combatStep === 'rolling' || combatStep === 'result') && turnResult && (
        <div className="absolute pointer-events-none z-[70]"
          style={{
            left: '50%',
            top: `${Math.round((pC.y + eC.y) / 2 - 20)}px`,
            transform: 'translateX(-50%)',
            width: '480px',
          }}>
          <div className="rounded-xl p-3 animate-slide-up"
            style={{ background: 'rgba(5,5,15,0.88)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)' }}>
            <DicePanel result={turnResult} rolling={diceRolling} playerName={player.name} enemyName={enemy.name} />
            {combatStep === 'result' && enemy.hp > 0 && player.hp > 0 && (
              <div className="text-center text-gray-600 text-[10px] pb-1 animate-pulse">다음 턴 대기 중...</div>
            )}
          </div>
        </div>
      )}

      {/* ══════ 결과 화면 플래시 ══════ */}
      {resultFlash && (
        <div className={`absolute inset-0 pointer-events-none z-40 ${
          resultFlash === 'perfect'  ? 'animate-screen-flash-gold' :
          resultFlash === 'critical' ? 'animate-screen-flash-gold' :
                                       'animate-screen-flash-red'
        }`} style={{
          background: resultFlash === 'miss'
            ? 'radial-gradient(ellipse at center, rgba(220,38,38,0.35) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(250,204,21,0.4) 0%, transparent 70%)',
        }} />
      )}

      {/* ══════ 주사위 속도 승자 배지 — 캐릭터 중앙 ══════ */}
      {diceWinnerFlash === 'player' && (
        <div className="absolute pointer-events-none z-25 animate-winner-pop"
          style={{ left: `${pC.x}px`, top: `${pC.y - playerSize * 0.6}px`, transform: 'translateX(-50%)' }}>
          <span className="text-2xl font-black drop-shadow-[0_2px_12px_rgba(0,0,0,1)] text-yellow-300 whitespace-nowrap">⚡ 선제!</span>
        </div>
      )}
      {diceWinnerFlash === 'enemy' && (
        <div className="absolute pointer-events-none z-25 animate-winner-pop"
          style={{ left: `${eC.x}px`, top: `${eC.y - enemySize * 0.6}px`, transform: 'translateX(-50%)' }}>
          <span className="text-2xl font-black drop-shadow-[0_2px_12px_rgba(0,0,0,1)] text-red-300 whitespace-nowrap">⚡ 선제!</span>
        </div>
      )}

      {/* ══════ 플로팅 데미지 — 캐릭터 위치 기준 ══════ */}
      {/* 플레이어 피격 — 캐릭터 상단 */}
      <div className="absolute pointer-events-none z-20"
        style={{ left: `${Math.max(10, playerLeft + playerSize * 0.1)}px`, top: `${Math.max(60, pC.y - playerSize)}px` }}>
        {floating.filter(f => f.side === 'player').map((ft, i) => (
          <div key={ft.id} className={`absolute animate-bounce-up font-black drop-shadow-[0_2px_8px_rgba(0,0,0,1)] ${
            ft.type === 'critical' ? 'text-yellow-300 text-5xl' :
            ft.type === 'damage'   ? 'text-red-400 text-4xl' :
            ft.type === 'heal'     ? 'text-green-400 text-2xl' :
            ft.type === 'miss'     ? 'text-gray-400 text-xl italic' :
            'text-blue-300 text-sm'
          }`} style={{ top: `${i * 54}px` }}>{ft.text}</div>
        ))}
      </div>
      {/* 적 피격 — 캐릭터 상단 */}
      <div className="absolute pointer-events-none z-20"
        style={{ left: `${Math.max(10, enemyLeft + enemySize * 0.1)}px`, top: `${Math.max(60, eC.y - enemySize)}px` }}>
        {floating.filter(f => f.side === 'enemy').map((ft, i) => (
          <div key={ft.id} className={`absolute animate-bounce-up font-black drop-shadow-[0_2px_8px_rgba(0,0,0,1)] text-right right-0 ${
            ft.type === 'critical' ? 'text-yellow-300 text-5xl' :
            ft.type === 'damage'   ? 'text-orange-300 text-4xl' :
            ft.type === 'miss'     ? 'text-gray-400 text-xl italic' :
            'text-blue-300 text-sm'
          }`} style={{ top: `${i * 54}px` }}>{ft.text}</div>
        ))}
      </div>

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
        enemyMainAction={intent.mainAction}
        playerStats={pStats}
        enemyStats={eStats}
        playerPos={playerPos}
        enemyPos={enemyPos}
        playerRow={playerRow}
        enemyRow={enemyRow}
        logs={logs}
        onMainSelect={handleMainSelect}
        onSubSelect={handleSubSelect}
        onCancelSub={() => { setPlayerMain(null); setCombatStep('select_main'); }}
      />
    </div>
    </BattleViewport>
  );
}
