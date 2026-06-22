const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getPortableExeName,
  getDrivePortableExeName,
  isManagedPortableArtifact,
} = require('../scripts/release-names');

test('uses the mapped project name and portable suffix for local artifacts', () => {
  assert.equal(
    getPortableExeName('1.5.63'),
    'SwordMastersAscent_v1.5.63_portable.exe',
  );
});

test('prefixes the zero-padded folder number for Google Drive artifacts', () => {
  assert.equal(
    getDrivePortableExeName('1.5.63'),
    '01_SwordMastersAscent_v1.5.63_portable.exe',
  );
});

test('recognizes both old and current managed executable names for cleanup', () => {
  assert.equal(isManagedPortableArtifact('TOS_v1.5.62.exe'), true);
  assert.equal(isManagedPortableArtifact('SwordMastersAscent_v1.5.63_portable.exe'), true);
  assert.equal(isManagedPortableArtifact('01_SwordMastersAscent_v1.5.63_portable.exe'), true);
  assert.equal(isManagedPortableArtifact('unrelated.exe'), false);
});
