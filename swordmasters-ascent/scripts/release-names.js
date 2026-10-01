const PROJECT_NAME = 'SwordMastersAscent';
const FOLDER_NUMBER = '01';

function getPortableExeName(version) {
  return `${PROJECT_NAME}_v${version}_portable.exe`;
}

function getDrivePortableExeName(version) {
  return `${FOLDER_NUMBER}_${getPortableExeName(version)}`;
}

function isManagedPortableArtifact(fileName) {
  return /^(?:TOS_v.*\.exe|SwordMastersAscent_v.*_portable\.exe|01_SwordMastersAscent_v.*_portable\.exe)$/i.test(fileName);
}

module.exports = {
  PROJECT_NAME,
  FOLDER_NUMBER,
  getPortableExeName,
  getDrivePortableExeName,
  isManagedPortableArtifact,
};
