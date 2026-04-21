/**
 * build-singlefile.js
 * Next.js 정적 빌드 결과물의 CSS/JS 에셋을 단일 HTML 파일로 인라인
 */

const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const OUTPUT  = path.join(ROOT, 'TOS.html');

function readAsset(href) {
  const rel  = href.startsWith('/') ? href.slice(1) : href;
  const full = path.join(OUT_DIR, rel);
  try { return fs.readFileSync(full, 'utf-8'); } catch { return null; }
}

let html = fs.readFileSync(path.join(OUT_DIR, 'index.html'), 'utf-8');

html = html.replace(/<link[^>]+rel="preload"[^>]*\/?>/g, '');

html = html.replace(
  /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*\/?>/g,
  (match, href) => {
    const css = readAsset(href);
    if (!css) { console.warn('CSS not found:', href); return match; }
    console.log('  ✓ CSS inlined:', href.split('/').pop());
    return `<style>${css}</style>`;
  }
);

html = html.replace(
  /<script([^>]*?)src="([^"]+)"([^>]*?)><\/script>/g,
  (match, pre, src, post) => {
    if (src.startsWith('http')) return match;
    const js = readAsset(src);
    if (!js) { console.warn('JS not found:', src); return match; }
    const attrs = (pre + post)
      .replace(/\s*async="?[^"]*"?/g, '')
      .replace(/\s*defer="?[^"]*"?/g, '')
      .replace(/\s*id="[^"]*"/g, '')
      .trim();
    console.log('  ✓ JS inlined:', src.split('/').pop().slice(0, 40));
    return `<script${attrs ? ' ' + attrs : ''}>${js}</script>`;
  }
);

fs.writeFileSync(OUTPUT, html, 'utf-8');
const size = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(2);
console.log(`\n✅ 완료! → TOS.html (${size} MB)\n   경로: ${OUTPUT}`);
