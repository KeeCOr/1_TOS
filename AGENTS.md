# Codex Project Rules

## 2026-09-21 빌드 진입점 정정

루트에는 `package.json`이 없다. 실제 소스는 `swordmasters-ascent/`(Next.js) 서브폴더이며, Electron 데스크톱 패키징은 그 안의 `npm run dist`(`scripts/bump-version.js` → `next build` → `electron-builder --win portable --x64` → 루트로 결과물 복사)로 이뤄진다. 루트의 `SwordMastersAscent_v{버전}_portable.exe`는 이 빌드의 산출물이 자동 복사된 것이다.

```bash
cd C:/Development/1_TOS/swordmasters-ascent
npm run build   # Next.js 빌드만
npm run dist    # 버전 증가 + Electron 포터블 패키징 + 루트 복사까지
```

## Release Executables

When a Codex-managed project builds a portable Windows executable, place or copy the final `.exe` in the outermost project folder whenever the build system allows it.

For nested app folders, keep any internal build folders needed by the toolchain, but make the user-facing executable available at the workspace root.
