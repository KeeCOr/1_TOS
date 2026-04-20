/**
 * build-html.js
 * Next.js static export의 모든 CSS/JS 에셋을 단일 HTML 파일로 인라인
 */

const fs   = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '../out');
const OUTPUT  = path.join(__dirname, '../검사의승천.html');

// ── 파일 읽기 헬퍼 ──────────────────────────────────────────
function readAsset(href) {
  // /_next/... → out/_next/...  |  /foo → out/foo
  const rel  = href.startsWith('/') ? href.slice(1) : href;
  const full = path.join(OUT_DIR, rel);
  try {
    return fs.readFileSync(full, 'utf-8');
  } catch {
    return null;
  }
}

// ── HTML 읽기 ────────────────────────────────────────────────
let html = fs.readFileSync(path.join(OUT_DIR, 'index.html'), 'utf-8');

// ── 1. preload 링크 제거 (단일 파일에서 불필요) ───────────────
html = html.replace(/<link[^>]+rel="preload"[^>]*\/?>/g, '');

// ── 2. CSS 링크 → <style> 인라인 ────────────────────────────
html = html.replace(
  /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*\/?>/g,
  (match, href) => {
    const css = readAsset(href);
    if (!css) { console.warn('CSS not found:', href); return match; }
    // CSS 안의 url(/_next/...) 경로는 단일 파일에서 사용 불가 → data: 변환은 생략
    // (폰트 등 외부 리소스는 인터넷 필요)
    console.log('  ✓ CSS inlined:', href.split('/').pop());
    return `<style>${css}</style>`;
  }
);

// ── 3. async/defer script src → <script> 인라인 ─────────────
// async 스크립트 (게임 로직 포함)
html = html.replace(
  /<script([^>]*?)src="([^"]+)"([^>]*?)><\/script>/g,
  (match, pre, src, post) => {
    // data-attribute 스크립트 등 외부 URL은 건드리지 않음
    if (src.startsWith('http')) return match;
    const js = readAsset(src);
    if (!js) { console.warn('JS not found:', src); return match; }
    // async/defer 속성 제거 (인라인이므로 불필요)
    const attrs = (pre + post)
      .replace(/\s*async="?[^"]*"?/g, '')
      .replace(/\s*defer="?[^"]*"?/g, '')
      .replace(/\s*id="[^"]*"/g, '')
      .trim();
    console.log('  ✓ JS inlined:', src.split('/').pop().slice(0, 40));
    return `<script${attrs ? ' ' + attrs : ''}>${js}</script>`;
  }
);

// ── 4. 파일 저장 ─────────────────────────────────────────────
fs.writeFileSync(OUTPUT, html, 'utf-8');
const size = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(2);
console.log(`\n✅ 완료! → 검사의승천.html (${size} MB)\n경로: ${OUTPUT}`);
