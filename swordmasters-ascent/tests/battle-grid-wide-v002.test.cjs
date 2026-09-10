const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(buffer.subarray(0, 8).equals(pngSignature), `${filePath} is not a valid PNG file`);
  // IHDR chunk: 4 bytes length, 4 bytes type "IHDR", then 4 bytes width, 4 bytes height (big-endian).
  const ihdrType = buffer.subarray(12, 16).toString('ascii');
  assert.equal(ihdrType, 'IHDR', `${filePath} is missing an IHDR chunk where expected`);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

test('battle-grid-wide-v002.png IHDR reports 1940x360 and matches the runtime grid rectangle aspect', () => {
  const imagePath = path.join(projectRoot, 'public', 'bg', 'battle-grid-wide-v002.png');
  const { width, height } = readPngDimensions(imagePath);

  assert.equal(width, 1940, 'battle-grid-wide-v002.png width should be 1940px');
  assert.equal(height, 360, 'battle-grid-wide-v002.png height should be 360px');

  const runtimeGridWidth = 970;
  const runtimeGridHeight = 180;
  const imageAspect = width / height;
  const runtimeAspect = runtimeGridWidth / runtimeGridHeight;
  assert.ok(
    Math.abs(imageAspect - runtimeAspect) < 1e-9,
    `image aspect ${imageAspect} should equal runtime grid rectangle aspect ${runtimeAspect}`,
  );
});

test('SwordmastersAscent.tsx wires battle-grid-wide-v002.png into the base grid renderer with a non-distorting fit', () => {
  const sourcePath = path.join(projectRoot, 'src', 'components', 'SwordmastersAscent.tsx');
  const source = fs.readFileSync(sourcePath, 'utf8');

  // Isolate the base grid <img> tag rendered against gridBox so unrelated
  // "/bg/*" strings elsewhere in the file cannot make this assertion pass vacuously.
  const gridImgMatch = source.match(
    /<img src="([^"]+)" alt="" draggable=\{false\}\s*\n\s*className="absolute pointer-events-none select-none"\s*\n\s*style=\{\{ \.\.\.boxStyle\(gridBox\), objectFit: '([^']+)' \}\} \/>/,
  );

  assert.ok(gridImgMatch, 'expected to find the base grid <img> wired against gridBox');
  const [, srcAttr, objectFit] = gridImgMatch;

  assert.equal(srcAttr, '/bg/battle-grid-wide-v002.png');
  assert.notEqual(srcAttr, '/bg/battle-grid-base.png');
  assert.equal(objectFit, 'contain', 'grid image must use a non-distorting fit');

  assert.ok(
    !source.includes('"/bg/battle-grid-base.png"'),
    'battle-grid-base.png should no longer be referenced anywhere in SwordmastersAscent.tsx',
  );
});

test('globals.css body font stack includes Korean-capable local fallbacks ahead of generic sans-serif', () => {
  const cssPath = path.join(projectRoot, 'src', 'app', 'globals.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  const bodyBlockMatch = css.match(/\bbody\s*\{([^}]*)\}/);
  assert.ok(bodyBlockMatch, 'expected to find a body { ... } rule in globals.css');

  const fontFamilyMatch = bodyBlockMatch[1].match(/font-family:\s*([^;]+);/);
  assert.ok(fontFamilyMatch, 'expected body rule to declare font-family');

  const stack = fontFamilyMatch[1];
  const notoIndex = stack.indexOf('Noto Sans KR');
  const malgunIndex = stack.indexOf('Malgun Gothic');
  const sansSerifIndex = stack.indexOf('sans-serif');

  assert.notEqual(notoIndex, -1, 'body font-family should include "Noto Sans KR"');
  assert.notEqual(malgunIndex, -1, 'body font-family should include "Malgun Gothic"');
  assert.notEqual(sansSerifIndex, -1, 'body font-family should include a generic sans-serif fallback');
  assert.ok(notoIndex < sansSerifIndex, '"Noto Sans KR" should come before the generic sans-serif fallback');
  assert.ok(malgunIndex < sansSerifIndex, '"Malgun Gothic" should come before the generic sans-serif fallback');
});

test('upload-release-to-drive.js targets the real central directory and not the obsolete one', () => {
  const scriptPath = path.join(projectRoot, 'scripts', 'upload-release-to-drive.js');
  const source = fs.readFileSync(scriptPath, 'utf8');

  const driveDirMatch = source.match(/driveDir\s*=\s*'((?:[^'\\]|\\.)*)'/);
  assert.ok(driveDirMatch, 'expected to find a driveDir string literal assignment');

  // Decode the JS string literal escaping (e.g. "\\" -> "\") to recover the real Windows path.
  const decodedDriveDir = JSON.parse(`"${driveDirMatch[1].replace(/\\'/g, "'")}"`);

  const obsoleteDir = 'G:\\내 드라이브\\실행파일';
  const hangulSyllable = '[\\u3131-\\u318E\\uAC00-\\uD7A3]';
  // The real central directory is a numbered "02_" subfolder of the same Drive root,
  // shaped as 02_<2 Hangul chars>_<4 Hangul chars> (e.g. 02_실행_파일함).
  const centralDirectoryPattern = new RegExp(
    `^G:\\\\내 드라이브\\\\02_${hangulSyllable}{2}_${hangulSyllable}{4}$`,
  );

  assert.notEqual(decodedDriveDir, obsoleteDir, 'driveDir should no longer target the obsolete directory');
  assert.ok(
    centralDirectoryPattern.test(decodedDriveDir),
    `driveDir "${decodedDriveDir}" should target the numbered central directory (G:\\내 드라이브\\02_XX_XXXX)`,
  );
  assert.ok(
    decodedDriveDir.includes('\\'),
    'driveDir should remain a properly escaped Windows path with backslash separators',
  );
});
