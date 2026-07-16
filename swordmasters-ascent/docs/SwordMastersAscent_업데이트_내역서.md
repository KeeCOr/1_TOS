# SwordMastersAscent 업데이트 내역서

## 2026-06-30 문서 구조 정리
- 기획서와 업데이트 내역서를 분리했다.
- 기획서는 게임 소개, 핵심 루프, MVP 가설, KPI, UX 원칙 중심으로 재작성했다.
- 변경 이력, 구현 로그, 검증 기록은 이 문서에서 관리한다.

## 기존 문서에서 분리한 이력 후보
- .badge-updated { background: rgba(212,160,23,0.2); color: var(--accent); }
- 기획서 v1.5.68
- 최종 수정: 2026-06-30 &nbsp;|&nbsp; 버전: 1.5.68 &nbsp;|&nbsp; 실제 구현 코드 기준으로 동기화
- 플레이어 시작 위치: 1 &nbsp;|&nbsp; 적 시작 위치: 4 (거리 3). 행은 이동 서브액션으로만 변경. 공격은 같은 행에만 명중. 마법·아이템(투척)은 행 무관.
- 3.2 메인 액션 (5가지) v1.5.68 수치 갱신
- 3.3 서브액션 (22개) v1.5.68 갱신
- 방어 서브 (3개) 명칭 변경
- 3.5 주사위 체계 (3단계) v1.5.68 전면 개편
- 3.6 방어 시스템 세부 v1.5.68 3단계 분기
- 3.8 스테미너 시스템 v1.5.68 갱신
- 7.1 마법 시스템 v1.5.68 쿨다운 기준 변경
- 튜토리얼 완료swordmasters-ascent-tutorial-done완료 여부 (boolean)
- 스테미너 변화량 v1.5.68
- localStorage 기반 저장으로 서버 없이 3슬롯 세이브 구현 — 운영 비용 없음
- 웹 버전의 데모 역할스팀 출시 전 웹 버전으로 유저 풀 확보. 웹 버전이 사실상 무료 데모 역할을 겸함
- 이 기획서는 실제 구현 코드(src/lib/gameData.ts, src/components/SwordmastersAscent.tsx)를 기준으로 동기화됩니다. 버전: 1.5.68
- 자동 갱신: 2026-06-04. 공유 시 문서와 함께 아래 이미지 경로가 포함되어야 합니다.
- > 최종 수정: 2026-06-30 | 버전: 1.5.68

## 작성 규칙
- 기능 추가, 밸런스 변경, UI/UX 수정, 리소스 교체, 빌드/배포 변경은 날짜와 버전을 함께 기록한다.
- 기획서에는 최신 소개와 현재 설계 의도만 남기고, 과거 작업 로그는 이 문서로 이동한다.
- MD와 HTML은 항상 함께 갱신한다.

## v1.5.66 Combat Feedback Refresh (2026-06-29)

- Added distinct combat feedback cues for attack windup, hit result, dodge success, and player damage response.
- `src/lib/combatFeedback.cjs` now owns the cue labels/details so the same behavior is covered by Node tests and used by the battle result panel.
- `DicePanel` renders compact feedback chips above the dice contest rows without changing the core combat resolver.
- Validation: `npm test` passed 7 tests; `npm run build` passed; `npm run dist` produced `SwordMastersAscent_v1.5.66_portable.exe`.


---

## v1.5.68 검술 유파와 계승 강화

- 새 게임 시 이름을 정한 뒤 5개 검술 유파를 선택한다: 균형검, 암영검, 비전검, 주술검, 철벽검.
- 유파는 시작 능력치, 시작 마법, 투척 아이템, HP/MP 구성을 바꿔 첫 층 전투의 빌드 감각을 분기한다.
- 사망 시 레거시 캐릭터에 유파 이름이 남아, 다음 회차에 전인의 흔적을 만나는 계승 감각을 강화한다.
- 유파 정의는 `src/lib/swordSchools.json`에서 관리하며, Node 테스트로 선택지 수량과 문구 정합성을 검증한다.
