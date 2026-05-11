# VFX Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 화면 흔들림·부상 비네트·적 처치 플래시 3가지 VFX를 추가해 전투 타격감을 강화한다.

**Architecture:** `src/app/globals.css`에 @keyframes 3개를 추가하고, `SwordmastersAscent.tsx`에 boolean 상태 3개와 트리거 로직, JSX 오버레이를 추가한다. 외부 라이브러리 없이 순수 CSS + React state로 구현한다.

**Tech Stack:** TypeScript, React, CSS (@keyframes in globals.css)

---

## 파일 변경 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/app/globals.css` | `animate-screen-shake`, `animate-injury-vignette`, `animate-enemy-death-flash` 키프레임 + 클래스 추가 |
| `src/components/SwordmastersAscent.tsx` | `screenShake`, `injuryVignette`, `enemyDeathFlash` 상태 + 트리거 로직 + JSX 오버레이/클래스 |

---

## Task 1: CSS 키프레임 3개 추가 (globals.css)

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: 기존 구조 확인**

`src/app/globals.css`를 열어 파일 끝 부분을 확인한다. `.animate-loser-shake` 클래스가 마지막 줄 근처에 있어야 한다.

- [ ] **Step 2: 3개 키프레임 + 클래스 추가**

`.animate-loser-shake { ... }` 바로 뒤 (파일 끝)에 추가:

```css
/* ── VFX 강화 ──────────────────────────────────────── */

/* 큰 피해 시 화면 흔들림 */
@keyframes screen-shake {
  0%,100% { transform: translate(0, 0) rotate(0); }
  15%     { transform: translate(-5px, 2px) rotate(-0.3deg); }
  30%     { transform: translate(5px, -3px) rotate(0.3deg); }
  45%     { transform: translate(-4px, 3px) rotate(-0.2deg); }
  60%     { transform: translate(4px, -2px) rotate(0.2deg); }
  75%     { transform: translate(-2px, 1px); }
  90%     { transform: translate(2px, -1px); }
}
.animate-screen-shake {
  animation: screen-shake 0.35s ease-out;
}

/* 부상 발생 시 붉은 비네트 */
@keyframes injury-vignette {
  0%   { box-shadow: inset 0 0 0px rgba(220, 38, 38, 0); }
  20%  { box-shadow: inset 0 0 90px rgba(220, 38, 38, 0.75); }
  60%  { box-shadow: inset 0 0 70px rgba(220, 38, 38, 0.5); }
  100% { box-shadow: inset 0 0 0px rgba(220, 38, 38, 0); }
}
.animate-injury-vignette {
  animation: injury-vignette 1.1s ease-out forwards;
}

/* 적 처치 시 황금 플래시 */
@keyframes enemy-death-flash {
  0%   { opacity: 0; }
  10%  { opacity: 1; }
  40%  { opacity: 0.85; }
  100% { opacity: 0; }
}
.animate-enemy-death-flash {
  animation: enemy-death-flash 0.6s ease-out forwards;
}
```

- [ ] **Step 3: TypeScript 체크**

```bash
cd C:/Development/1_TOS/swordmasters-ascent && npx tsc --noEmit
```

Expected: 오류 없음 (CSS 파일 변경이므로 TypeScript 오류는 없어야 함)

---

## Task 2: 상태 변수 + 트리거 + JSX (SwordmastersAscent.tsx)

**Files:**
- Modify: `src/components/SwordmastersAscent.tsx`

### 배경 지식

- 기존 flash 상태: `hitFlash`, `resultFlash` — boolean/string + setTimeout 패턴 (line 1774–1779)
- 기존 히트 플래시 트리거: line 2184 근처, `setHitFlash(flash); setTimeout(...)` 블록
- 부상 적용 블록: `if (result.newPlayerInjury)` 블록 — `setInjuryVignette` 추가 위치
- 적 처치 감지: `} else if (mutableEnemy.hp <= 0) {` 블록 (line 2207 근처)
- 메인 컨테이너: `<div className="w-[1280px] h-[720px] relative overflow-hidden"` (line 2461 근처)

- [ ] **Step 1: 상태 변수 3개 추가**

`resultFlash` useState 선언 줄 (line 1779) 바로 뒤에 추가:

```typescript
  const [screenShake,     setScreenShake]     = useState(false);
  const [injuryVignette,  setInjuryVignette]  = useState(false);
  const [enemyDeathFlash, setEnemyDeathFlash] = useState(false);
```

- [ ] **Step 2: 화면 흔들림 트리거 추가**

`setHitFlash(flash); setTimeout(() => setHitFlash(null), 350);` 블록 바로 뒤에 추가:

```typescript
        // 화면 흔들림 — 최대체력의 20% 이상 피해 시
        if (result.damageTaken >= player.maxHp * 0.20) {
          setScreenShake(true);
          setTimeout(() => setScreenShake(false), 400);
        }
```

- [ ] **Step 3: 부상 비네트 트리거 추가**

`if (result.newPlayerInjury)` 블록 안, `addLog(...)` 호출 바로 뒤에 추가:

```typescript
          setInjuryVignette(true);
          setTimeout(() => setInjuryVignette(false), 1200);
```

- [ ] **Step 4: 적 처치 플래시 트리거 추가**

`} else if (mutableEnemy.hp <= 0) {` 줄 바로 뒤 첫 번째 줄에 추가:

```typescript
        setEnemyDeathFlash(true);
        setTimeout(() => setEnemyDeathFlash(false), 650);
```

주의: 검사 왕 2페이즈 부활 조건 `if (mutableEnemy.hp <= 0 && mutableEnemy.bossPattern === 'king' && !mutableEnemy.phase2Triggered)` 블록이 먼저 나온다. 그 뒤의 `else if (mutableEnemy.hp <= 0)` 블록에만 추가한다.

- [ ] **Step 5: 메인 컨테이너에 흔들림 클래스 적용**

메인 컨테이너 div를 찾는다:
```tsx
<div className="w-[1280px] h-[720px] relative overflow-hidden"
```

다음으로 변경:
```tsx
<div className={`w-[1280px] h-[720px] relative overflow-hidden${screenShake ? ' animate-screen-shake' : ''}`}
```

- [ ] **Step 6: 부상 비네트 오버레이 추가**

메인 컨테이너 안, 배경 이미지 `<img src="/bg/background.png" .../>` 바로 뒤에 추가:

```tsx
      {/* ── 부상 비네트 오버레이 ── */}
      {injuryVignette && (
        <div className="absolute inset-0 animate-injury-vignette pointer-events-none z-50" />
      )}
```

- [ ] **Step 7: 적 처치 플래시 오버레이 추가**

부상 비네트 오버레이 바로 뒤에 추가:

```tsx
      {/* ── 적 처치 황금 플래시 ── */}
      {enemyDeathFlash && (
        <div
          className="absolute inset-0 animate-enemy-death-flash pointer-events-none z-40"
          style={{ background: 'radial-gradient(ellipse at 72% 42%, rgba(255,230,100,0.9) 0%, rgba(255,180,40,0.5) 30%, transparent 62%)' }}
        />
      )}
```

- [ ] **Step 8: TypeScript 체크 + 빌드**

```bash
cd C:/Development/1_TOS/swordmasters-ascent && npx tsc --noEmit && npm run dist
```

Expected: 빌드 성공, 버전 번호 출력
