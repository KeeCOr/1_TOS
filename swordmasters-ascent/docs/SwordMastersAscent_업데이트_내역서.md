# SwordMastersAscent 업데이트 내역서

## 2026-10-06 타이틀 로고 적용

- 표기명을 `T of Sword`로 확정하고, 시작 화면의 코드 텍스트 타이틀을 이미지 로고 `public/brand/title-logo.png`로 교체했다.
- 로고가 로드되지 않는 예외 상황에서만 기존 텍스트를 폴백으로 표시한다.
- 생성 원본의 알파 채널을 확인해 1,172,233개 완전 투명 픽셀과 네 모서리 알파 값 0을 검증했다.

## 2026-09-28 v1.6.2 전투 선택 구조와 우세 보상 개선

- 행동 패널을 위쪽까지 확장하고 `Hit / Evade / Grow` 임시 카드와 비어 있는 상세 영역을 제거해 전술 선택과 적 의도·전투 기록에 공간을 집중했다.
- 이동은 턴당 한 번 무료로 처리하며, 이동 후에도 공격·방어·마법·아이템 행동을 선택할 수 있게 했다. 추가 행동 중에는 연속 이동할 수 없다.
- 방어는 `세로 막기`, `가로 막기` 두 종류만 유지하고, 어느 쪽이든 들어오는 공격 피해의 50%를 차단한다.
- 적 이름과 HP·MP·능력치의 구체 수치를 숨기고, 상단의 불명확한 `중거리`와 `뷰 기준` 표현을 `현재 공격 가능`, `공격 사거리 밖`, `다른 행 — 공격 불가`처럼 실제 판단 정보로 교체했다.
- 유리한 행동(`perfect`)으로 주사위 합계 차이 4 이상을 만들면 다음 턴에 `주사위 +1` 또는 `추가 행동 1회` 중 하나를 무작위로 얻는다. 추가 행동 동안 적은 행동하지 않으며 연쇄 보상은 발생하지 않는다.
- 근거 파일: `src/components/SwordmastersAscent.tsx`, `src/lib/gameData.ts`, `src/lib/defenseRules.cjs`, `src/lib/momentumRules.cjs`, `tests/defense-rules.test.cjs`, `tests/momentum-rules.test.cjs`.
- 검증: 2026-09-28 `npm test` 28/28 통과, `npm run build` 통과. `npm run lint`는 기존 CommonJS 및 React effect 규칙 위반을 포함해 52개 오류로 실패했으며 이번 변경에서 새로 발생한 `prefer-const` 오류 2개는 수정했다.
- UI 정적 검사: 기능 변경 영역의 레이아웃 오류는 보고되지 않았고, 기존 보라색 계열·bounce 모션·Arial 사용에 대한 디자인 경고가 남아 있다.
- 미검증: 실제 실행 화면에서 1280×720 이하 배율의 겹침, 주사위 보너스·추가 행동의 체감 빈도, 포터블 패키징. 외부 업로드와 배포는 실행하지 않았다.

## 2026-09-23 적 의도 기반 전투 위험도

- 기존 HUD가 적이 방어 중이어도 거리가 가깝다는 이유만으로 높은 위험을 표시하던 문제를 수정했다.
- `src/lib/tacticalRisk.cjs`에서 행동 의도·세부 행동·행·거리·사거리를 함께 계산한다.
- 방어, 이동/전진 압박, 공격, 마법·아이템의 위험 원인 문구를 분리했다.
- `tests/tactical-risk.test.cjs`에 방어 과장 방지, 근접 공격, 다른 행, 전진 압박, 원거리 수단 5개 사례를 추가했다.
- 검증: `npm test` 24/24 통과, `npm run build` 통과.
- 알려진 문제: Next.js가 `C:\Development\package-lock.json`을 workspace root 기준으로 추정하는 경고가 남아 있다. 실제 전투 화면 수동 확인과 포터블 패키징은 수행하지 않았다.
- 새 이미지와 Drive 배포는 수행하지 않았다.

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
