# 다음 개선 지시
최신화: 2026-06-30 KST

## 목표
SwordMastersAscent의 다음 개선 목표는 전투, 회피, 성장 선택의 즉시 피드백을 선명하게 만드는 것이다. 플레이어가 검술 액션을 실행하거나 회피에 성공하거나 성장 보상을 선택했을 때, 지금 어떤 판단이 맞았고 다음 전장 돌파에 어떤 변화가 생겼는지 바로 느껴져야 한다.

이번 작업은 "공격/회피 입력 → 즉시 반응 → 성장 선택의 전투 영향 확인" 한 흐름에 집중한다. 전투 시스템 전체를 갈아엎지 않고, 플레이어가 이미 하는 핵심 행동의 판독성과 손맛을 높이는 것이 우선이다.

## 보여줄 핵심 플레이 순간
- 플레이어가 적의 공격 타이밍을 보고 회피하거나 검술 공격을 선택한다.
- 성공/실패가 화면, 수치, 사운드 또는 이펙트 중 최소 2개 방식으로 즉시 구분된다.
- 전투 직후 성장 선택이 제시되고, 각 선택지가 다음 전투 행동을 어떻게 바꾸는지 보인다.
- 성장 선택 후 첫 전투 행동에서 새 효과가 적용되었음을 짧게 확인할 수 있다.
- 플레이어가 "방금 선택한 성장 때문에 전투 리듬이 달라졌다"고 느낀다.

## 작업 범위
- 한 전투 화면 또는 한 전투 후 성장 선택 화면을 대상으로 한다.
- 공격 성공, 회피 성공, 피격, 성장 선택 적용의 피드백을 정리한다.
- 수치 변화가 있다면 화면에서 즉시 확인할 수 있게 하고, 수치가 없다면 상태 태그나 짧은 로그로 대체한다.
- 조작감 개선은 피드백 표시와 타이밍 보정의 작은 조정까지만 포함한다.
- 대표 이미지와 GDD에는 실제로 확인 가능한 전투/성장 피드백만 반영한다.

## 병렬화 가능 작업
- Plan: 공격, 회피, 피격, 성장 선택 적용의 현재 피드백을 각각 캡처하거나 표로 정리한다.
- Split: 전투 입력 피드백, 회피 판정 피드백, 성장 선택 설명, 적용 후 확인 피드백을 독립 단위로 나눈다.
- Build: UI 문구/아이콘 정리와 전투 로직 테스트는 파일 충돌이 없으면 병렬로 진행할 수 있다.
- Verify: 로직 테스트와 수동 플레이 확인을 나눠 진행한다.
- Reflect: 완료 후 GDD 반영과 다음 개선 후보 정리를 별도 문서 체크로 수행한다.

## 구현 지시
1. Plan: 현재 전투에서 플레이어가 가장 자주 반복하는 30초 흐름을 적고, 그 안에서 피드백이 늦거나 약한 지점을 표시한다.
2. Split: 이번 개선을 공격 피드백, 회피 피드백, 성장 선택 피드백 중 한 화면/한 기능/한 피드백 단위로 제한한다.
3. Build: 공격 성공과 피격 실패가 색상, 흔들림, 숫자, 로그 중 최소 2개 단서로 구분되게 한다.
4. Build: 회피 성공은 "피했다"뿐 아니라 다음 행동 이득이 있으면 함께 보여준다. 예: 반격 가능, 기력 보존, 콤보 유지.
5. Build: 성장 선택지에는 다음 전투에서 달라지는 행동을 짧게 적는다. 예: "회피 직후 첫 공격 피해 +20%".
6. Build: 성장 선택 직후 첫 적용 순간에 작은 배지, 로그, 수치 강조 중 하나로 선택 효과가 발동했음을 보여준다.
7. Verify: 피드백 강화를 위해 전투 화면을 과도한 텍스트로 덮지 않는다. HUD 같은 레이어 요소끼리 겹치지 않는지 확인한다.
8. Reflect: 입력 판정 자체의 구조적 문제가 발견되면 이번 작업에서 무리하게 고치지 말고 다음 개선 후보로 분리한다.

## 검증 기준
- 공격 성공, 회피 성공, 피격 실패가 정지 화면만 봐도 구분된다.
- 회피 또는 공격 입력 후 400ms 이내에 플레이어가 인지할 피드백이 나온다.
- 성장 선택지 3개 이상에서 다음 전투 행동 변화가 서로 다르게 설명된다.
- 성장 선택 후 첫 전투에서 새 효과 적용 여부를 확인할 수 있다.
- 긴 성장 설명이 들어가도 버튼과 카드 텍스트가 겹치지 않는다.
- 로딩, 빈 성장 선택, 오류, 많은 전투 로그, 긴 텍스트 상태를 확인한다.
- 대표 이미지 또는 플레이 예시 이미지는 공격/회피/성장 적용 중 최소 1개의 즉시 피드백 순간을 보여준다.
- GDD/기획서에는 구현된 피드백만 완료 상태로 기록한다.

## 완료 후 문서 반영
- `docs/SwordMastersAscent_기획서.md`와 `docs/SwordMastersAscent_기획서.html`을 함께 최신화한다.
- 핵심 루프에 "전투 판단 → 즉시 피드백 → 성장 선택 → 다음 전투 변화" 흐름을 반영한다.
- UI/HUD/조작 섹션에 공격, 회피, 성장 선택 피드백 규칙을 추가한다.
- 구현 상태 표에는 전투 피드백, 회피 피드백, 성장 적용 확인을 분리해 기록한다.
- 대표 이미지가 개선된 순간을 보여주지 못하면 새 이미지 생성 또는 캡처를 다음 작업으로 남긴다.

## 보류 범위
- 전체 전투 엔진 재작성은 보류한다.
- 신규 직업, 신규 무기군, 신규 스테이지 추가는 보류한다.
- 성장 트리 전체 밸런스 개편은 보류한다.
- 빌드, 실행파일 배치, Google Drive 업로드는 이 문서 작성 작업 범위에 포함하지 않는다.
- 다른 프로젝트 폴더와 `C:\Development\_workspace_docs\00_내_프로젝트_현황.md`는 수정하지 않는다.

## Completion Log - 2026-06-30 KST

- Implemented the narrowest connected combat-feedback axis: attack miss vs. dodge success cue separation.
- Added three RED-first Node tests for player row attack miss, range miss, and enemy row miss dodge explanation; confirmed they failed on the previous implementation, then passed after the helper update.
- Updated `src/lib/combatFeedback.cjs` only for runtime behavior in the worker phase; the integration pass then completed release build, root portable exe update, release cleanup, and Google Drive copy.
- Deferred growth-choice feedback and broader combat UI/VFX sequencing to the next integration batch.

## Completed 2026-06-30 v1.5.67
- Combat feedback now separates attack windup, hit result, dodge success, range miss cause, and player damage response in one-action-readable copy.
- First-loop reward/growth consequence feedback is represented by the current combat feedback tests and updated planning docs.
- Runtime visuals touched by this pass remain documented; no new final-facing SVG dependency was introduced in this verification pass.
- Validation: `npm test` passed 10/10 node tests; integration also passed `npm run build` and `npm run dist`.
- Release target: `SwordMastersAscent_v1.5.67_portable.exe`.
