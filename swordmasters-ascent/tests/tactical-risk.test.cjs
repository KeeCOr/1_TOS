const assert = require('node:assert/strict');
const test = require('node:test');
const { getTacticalRisk } = require('../src/lib/tacticalRisk.cjs');

test('방어 의도는 가까워도 공격 위험으로 과장하지 않는다', () => {
  const risk = getTacticalRisk({ mainAction: '방어', subAction: '세로 막기', rowSame: true, distance: 1, weaponRange: 2 });
  assert.equal(risk.level, '낮음');
  assert.match(risk.detail, /방어 태세/);
});

test('같은 행의 근접 공격 의도는 매우 높은 위험이다', () => {
  const risk = getTacticalRisk({ mainAction: '공격', subAction: '세로 베기', rowSame: true, distance: 1, weaponRange: 2 });
  assert.equal(risk.level, '매우 높음');
});

test('다른 행의 직접 공격은 낮은 위험과 행 이동 주의를 함께 알린다', () => {
  const risk = getTacticalRisk({ mainAction: '공격', subAction: '가로 베기', rowSame: false, distance: 1, weaponRange: 2 });
  assert.equal(risk.level, '낮음');
  assert.match(risk.detail, /행 이동/);
});

test('전진 압박은 다음 턴 사거리 변화로 설명한다', () => {
  const risk = getTacticalRisk({ mainAction: '이동', subAction: '전진 압박', rowSame: true, distance: 4, weaponRange: 2 });
  assert.equal(risk.level, '보통');
  assert.match(risk.detail, /다음 턴/);
});

test('마법과 아이템은 거리만으로 안전 판정하지 않는다', () => {
  for (const mainAction of ['마법 사용', '아이템 사용']) {
    const risk = getTacticalRisk({ mainAction, subAction: '화염구', rowSame: false, distance: 5, weaponRange: 1 });
    assert.equal(risk.level, '높음');
  }
});
