/**
 * build-singlefile.js
 * esbuild로 React 앱을 번들링 → CSS 인라인 → 단일 HTML 파일 생성
 */

const esbuild = require('esbuild');
const fs      = require('fs');
const path    = require('path');

const ROOT   = path.join(__dirname, '..');
const OUT    = path.join(ROOT, '검사의승천.html');

async function build() {
  console.log('⚙️  JS 번들링 중...');

  // ── 1. esbuild: TypeScript + JSX → single IIFE ─────────────
  const result = await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/entry.tsx')],
    bundle:   true,
    format:   'iife',
    jsx:      'automatic',
    platform: 'browser',
    target:   ['chrome90', 'firefox90', 'safari15'],
    minify:   true,
    alias:    { '@': path.join(ROOT, 'src') },
    write:    false,
    define:   { 'process.env.NODE_ENV': '"production"' },
    // Strip 'use client' directive (harmless string expr — esbuild handles it)
  });

  if (result.errors.length) {
    console.error('빌드 오류:', result.errors);
    process.exit(1);
  }

  const js = result.outputFiles[0].text;
  console.log(`  ✓ JS: ${(js.length / 1024).toFixed(0)} KB`);

  // ── 2. Tailwind CSS from Next.js static build ──────────────
  // CSS 파일을 out/ 전체에서 재귀 탐색
  function findCssFiles(dir) {
    const files = [];
    if (!fs.existsSync(dir)) return files;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...findCssFiles(full));
      else if (entry.name.endsWith('.css')) files.push(full);
    }
    return files;
  }

  const cssFiles = findCssFiles(path.join(ROOT, 'out/_next/static'));
  let css = '';
  if (cssFiles.length) {
    css = cssFiles.map(f => fs.readFileSync(f, 'utf-8')).join('\n');
    console.log(`  ✓ CSS: ${(css.length / 1024).toFixed(0)} KB (${cssFiles.length}개 파일)`);
  } else {
    console.warn('  ⚠ CSS 없음 — next build 먼저 실행하세요');
  }

  // ── 3. Custom animation (globals.css 내용) ─────────────────
  const extraCss = `
@keyframes bounce-up {
  0%   { opacity:1; transform:translateY(0); }
  80%  { opacity:1; transform:translateY(-40px); }
  100% { opacity:0; transform:translateY(-56px); }
}
.animate-bounce-up { animation: bounce-up 1.8s ease-out forwards; }
`;

  // ── 4. 최종 HTML 조립 ──────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="ko" class="h-full antialiased">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>검사의 승천 — Swordmaster's Ascent</title>
<style>${css}${extraCss}</style>
</head>
<body class="min-h-full flex flex-col">
<div id="root"></div>
<script>${js}</script>
</body>
</html>`;

  fs.writeFileSync(OUT, html, 'utf-8');
  const size = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`\n✅ 완료! → 검사의승천.html (${size} KB)`);
  console.log(`   경로: ${OUT}`);
}

build().catch(e => { console.error(e); process.exit(1); });
