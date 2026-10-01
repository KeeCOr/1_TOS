# SwordMastersAscent 기획서

문제 정의: 짧은 전투 안에서도 성장 선택의 손맛을 원하는 플레이어가 반복 플레이의 긴장과 보상을 동시에 얻기 어렵다.

## 게임 소개
주사위 선택과 층별 성장으로 던전을 오르는 로그라이트 전술 RPG.

SwordMastersAscent의 핵심 매력은 한 번의 선택이 다음 장면의 위험도, 보상, 성장 방향으로 이어지는 구조다. 이 문서는 처음 보는 사람에게 게임의 재미와 현재 방향을 빠르게 소개하기 위한 단일 기획서이며, 세부 변경 이력은 별도 업데이트 내역서에서 관리한다.

## 한 줄 소개
주사위 선택과 층별 성장으로 던전을 오르는 로그라이트 전술 RPG.

## 핵심 루프
유저가 현재 전장의 정보를 읽고 선택을 하면 전투/운영 결과가 갱신되고, 그 보상과 손실 때문에 다시 다음 선택을 준비한다.

## 게임 플레이 예시
- 1단계: 플레이어가 SwordMastersAscent의 현재 목표, 보유 자원, 즉시 대응해야 할 위험을 확인한다.
- 2단계: 카드, 유닛, 배치, 명령, 이동 중 현재 상황에 맞는 핵심 행동을 선택한다.
- 3단계: 선택 결과가 전투, 운영, 보상, 손실로 즉시 갱신되고 다음 판단의 근거가 된다.
- 4단계: 획득한 보상이나 변화한 상태를 바탕으로 다음 선택을 준비하며 핵심 루프를 반복한다.
- 플레이 감각: 짧은 세션 안에서 상황 파악, 의미 있는 선택, 즉각적인 피드백, 다음 목표 제시가 끊기지 않는 흐름을 지향한다.

## 핵심 재미
- 읽기 쉬운 상황 판단: 지금 위험한 요소와 얻을 수 있는 보상이 한눈에 들어온다.
- 직접적인 선택 피드백: 선택 직후 전투, 점수, 자원, 성장 상태가 변해 손맛을 만든다.
- 누적되는 성장감: 반복 플레이가 단순 재시작이 아니라 다음 전략의 재료로 이어진다.

## 주요 시스템
- 핵심 선택 시스템: 현재 국면에서 가능한 행동을 5개 이하의 명확한 선택지로 제시한다.
- 위험/보상 피드백: 행동 전후의 이득, 손실, 위협 변화를 빠르게 보여준다.
- 성장과 해금: 세션 결과가 능력, 카드, 유닛, 건물, 장비, 스테이지 등 다음 플레이의 선택지를 넓힌다.
- 상태별 UX: 로딩, 빈 상태, 오류, 많은 데이터, 긴 텍스트 상황에서도 레이아웃이 무너지지 않도록 관리한다.
- 실행 안정성: 테스트와 빌드 산출물을 기준으로 현재 플레이 가능한 범위를 계속 확인한다.

## 게임 구성과 규칙 (GDD 통합)
- 통합 기준 문서: `superpowers/specs/2026-05-13-combat-hud-redesign-design.md`
- 작성 기준: 16_PokerStrike_GDD처럼 화면 구조, 핵심 시스템, 진행/승패 규칙, UI/HUD, 미결 항목을 한 문서에서 바로 읽을 수 있게 정리한다.

### 화면/플레이 구조
- **Goal** (superpowers/specs/2026-05-13-combat-hud-redesign-design.md)
  - Redesign the battle screen HUD so combat state is easier to read at a glance. The first improvement target is the current feeling that HP/MP/ST, distance, row position, enemy intent, logs, and detailed modifiers are scattered across the 1280x720 battle view.
  - The redesign should keep the existing combat rules and game feel intact. This is a layout and information-architecture pass, not a balance or mechanics change.
- **Current Context** (superpowers/specs/2026-05-13-combat-hud-redesign-design.md)
  - The active battle screen in `src/components/SwordmastersAscent.tsx` already uses a fixed 1280x720 stage with:
  - Full-screen background art and character sprites.
  - A perspective floor grid for distance and row position.
  - Top-left and top-right character status blocks.
  - A bottom command area with main actions, sub-actions, mini distance display, logs, and enemy details.
  - Temporary overlays for dice rolls, result flashes, floating damage text, and initiative text.
  - The visual foundation is strong, but the player must scan too many places to answer one turn-level question: "What is my state, what is the enemy likely to do, and what should I press?"
- **2. Central Game Board** (superpowers/specs/2026-05-13-combat-hud-redesign-design.md)
  - The central board should preserve the strongest existing visual elements:
  - Background image.
  - Character sprites.
  - Perspective grid.
  - Position highlights.
  - Floating damage and heal text.
  - Screen flashes and movement feedback.

### 핵심 시스템
- **3. Bottom Tactical Console** (superpowers/specs/2026-05-13-combat-hud-redesign-design.md)
  - The bottom console becomes the decision area.
  - Main action buttons during `select_main`.
  - Sub-action list during `select_sub`.
  - Disabled, recommended, and countered states remain visible.
  - Center panel:
  - Compact distance and row mini-map.
  - Recent battle log.
  - Turn result summary during rolling/result states.
  - Enemy abilities and elemental stats.
  - Player tactical modifiers that matter this turn: active buffs/debuffs, injuries, titles, synergies, magic cooldown.
- **Information Priority** (superpowers/specs/2026-05-13-combat-hud-redesign-design.md)
  - The battle screen should prioritize information in this order:
  1. Survival state: HP, stamina, MP, dangerous injuries or low resources.
  2. Spatial state: distance, row alignment, range.
  3. Enemy intent: action telegraph and likely sub-action hint.
  4. Player decision: main action and sub-action choices.
  5. Secondary detail: logs, titles, abilities, elemental values, synergies.
  - When space is tight, lower-priority details should compress or move behind compact summaries before higher-priority information is reduced.
- **Testing and Verification** (superpowers/specs/2026-05-13-combat-hud-redesign-design.md)
  - Minimum verification:
  - Run `npm run build`.
  - Manually inspect the battle screen in browser or Electron-sized viewport.
  - Confirm `select_main`, `select_sub`, `rolling`, and `result` states remain readable.
  - Confirm reward, event, tutorial, naming, stat roll, and gameover phases still render.
  - Visual acceptance criteria:
  - A player can find HP/MP/ST for both sides from the top bar without scanning the bottom.
  - Distance and row alignment are visible in the top center and reinforced by the bottom mini-map.
  - Main and sub-action controls stay in a stable bottom-left decision area.
  - The central stage remains mostly clear for characters and combat effects.

### 진행/승패 규칙
- **진행 규칙** (기획서)
  - 한 세션은 상황 확인, 선택, 결과 피드백, 보상 또는 손실 반영, 다음 선택 준비의 흐름으로 닫힌다.
  - 승패나 종료 조건은 실제 구현 상태가 확인될 때 세부 수치와 함께 보강한다.

### UI/HUD/피드백
- **Combat HUD Redesign Design** (superpowers/specs/2026-05-13-combat-hud-redesign-design.md)
  - Date: 2026-05-13
  - Project: Swordmasters Ascent
  - Status: Approved for implementation planning

### 구현 메모/미결
- **보강 필요** (기획서)
  - 별도 GDD 또는 디자인 스펙이 없으므로, 다음 문서 갱신 시 세부 규칙과 수치표를 추가해야 한다.

## MVP 가설
| 기능 | 검증할 가설 | 검증 방법 |
|------|-------------|-----------|
| 핵심 전투/운영 루프 | 플레이어는 한 판 안에서 선택 결과를 이해하면 다음 판을 자발적으로 시작한다. | 1회 플레이 후 재시작률 60% 이상 |
| 위험/보상 표시 | 위험과 보상이 동시에 보이면 선택 시간이 줄고 납득도가 오른다. | 주요 선택 평균 8초 이내, 결과 불만 피드백 20% 이하 |
| 성장 보상 | 보상이 다음 전략을 바꾸면 반복 플레이 피로가 낮아진다. | 3판 내 서로 다른 빌드 선택률 50% 이상 |

## 레퍼런스 분석
- 장르 기준 레퍼런스는 한 판 시작까지 3단계 이내, 첫 의미 있는 선택까지 30초 이내가 목표다.
- 적용 교훈: 규칙 설명보다 먼저 선택 가능한 상황을 보여주고, 결과 화면에서 다음 판의 개선 포인트를 바로 제안한다.

## 현재 개발 상태 예상 수치
- 완성 목표 대비 구현 체감도: 약 80%
- 첫 세션에서 핵심 루프가 전달될 가능성: 약 86%
- UI/리소스 일관성 체감: 약 76%
- 콘텐츠와 반복 플레이 분량 충족도: 약 76%
- 빌드/실행 안정성 기대치: 약 70%
- 해석 기준: 현재 문서, 최근 산출물 기록, 연결된 예시 이미지 유무를 기준으로 한 사전 추정치이며 실제 플레이 테스트 후 ±15%p 정도 보정이 필요하다.

- 첫 세션 평균 플레이 시간 8분 이상
- 첫 세션 내 2회차 진입률 55% 이상
- 핵심 선택 화면에서 무응답/이탈률 15% 이하

## 현재 구현 상태
- 이 문서는 2026-06-24 기준으로 현재 플레이 방향과 구현 체감 상태를 요약한다.
- 핵심 루프, 조작 원칙, 리소스 적용 현황, 빌드 기준은 프로젝트별 실제 구현과 산출물 기록을 기준으로 계속 보정한다.
- 세부 변경 이력은 별도 업데이트 내역서에서 관리하고, 본 기획서는 처음 보는 사람이 현재 방향을 빠르게 이해하는 공유 문서로 유지한다.
- 새 기능, 밸런스 변경, 리소스 교체, UX 개선이 들어가면 본문과 HTML 문서를 함께 갱신한다.

## 조작과 UX 원칙
- 주요 버튼은 44px 이상으로 유지하고, 화면당 CTA 강조색은 하나만 사용한다.
- 버튼/선택지는 한 번에 5개 이하로 노출해 판단 부담을 줄인다.
- 로딩, 빈 상태, 에러, 많은 데이터, 긴 텍스트 상태를 각각 별도 화면/컴포넌트로 확인한다.
- HUD 동일 레이어 요소는 겹치지 않게 배치하고, 겹침이 필요한 효과는 별도 depth/z-order를 쓴다.

## 적용 리소스
- 런타임에 쓰이는 대표 이미지와 UI 리소스는 프로젝트별 asset/public/Resources 경로를 기준으로 관리한다.
- 새 이미지가 필요할 때는 프로젝트 접두어를 포함한 lowercase kebab-case 파일명을 사용한다.
- 최종 런타임 비주얼은 PNG/WebP 등 비트맵 자산을 우선 사용하고, SVG 또는 코드 드로잉은 문서/임시 참조로만 남긴다.

## 공유용 이미지 미리보기
![SwordMastersAscent 공유용 예시 1](../../docs/SwordMastersAscent_01_플레이예시.png)

- public/chars/dark_mage.png
- public/chars/duelist_swordsman.png
- public/chars/elder_boss.png

## 빌드, 테스트, 릴리스
- npm test
- npm run build
- npm run dist
- 현재 문서 기준 버전: 1.5.65

## 남은 리스크와 다음 우선순위
- 첫 화면에서 게임의 목표와 다음 행동이 5초 안에 보이는지 확인한다.
- 주요 선택의 결과 예측과 실제 결과가 어긋나는 지점을 플레이 테스트로 수집한다.
- 기획서에 남아 있던 변경 이력성 내용은 업데이트 내역서로 계속 이동해 소개 문서의 밀도를 유지한다.
