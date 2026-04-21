@AGENTS.md

# 프로젝트 규칙

## 작업 완료 후 빌드

게임 코드(`src/lib/gameData.ts` 또는 `src/components/SwordmastersAscent.tsx`)를 수정하는 작업이 끝나면 반드시 다음을 순서대로 실행한다:

1. `npm run dist` — 버전 자동 증가 + 빌드 + exe 생성
2. 빌드 성공 시 새 버전 번호를 사용자에게 알린다

### 규칙
- `npm run dist`는 패치 버전을 자동으로 올린다 (예: 1.5.1 → 1.5.2)
- 빌드 전에 TypeScript 오류가 없는지 확인한다
- 빌드 실패 시 오류를 수정한 뒤 다시 빌드한다
- 게임 외 파일만 수정한 경우(문서, 설정 등)는 빌드하지 않는다
