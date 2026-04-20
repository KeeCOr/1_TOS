// 빌드 전 release/ 폴더의 이전 .exe 파일을 삭제해 항상 최신 버전만 남깁니다.
const fs = require('fs');
const path = require('path');

const releaseDir = path.join(__dirname, '..', 'release');

if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
  console.log('[clean-release] release/ 폴더 생성');
} else {
  const files = fs.readdirSync(releaseDir);
  let removed = 0;
  for (const file of files) {
    if (file.endsWith('.exe') || file.endsWith('.yml') || file === 'win-unpacked') {
      const target = path.join(releaseDir, file);
      fs.rmSync(target, { recursive: true, force: true });
      removed++;
    }
  }
  if (removed > 0) {
    console.log(`[clean-release] 이전 빌드 ${removed}개 항목 삭제 완료`);
  }
}
console.log('[clean-release] 완료 — 새 빌드 시작');
