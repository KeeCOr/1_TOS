function getTacticalRisk({ mainAction, subAction, rowSame, distance, weaponRange }) {
  if (mainAction === '방어') {
    return { level: '낮음', detail: '적은 방어 태세입니다. 다음 반격 가능성을 함께 보세요.', tone: 'text-emerald-300' };
  }

  if (mainAction === '이동') {
    if (subAction === '전진 압박') {
      return { level: '보통', detail: '적이 거리를 좁히려 합니다. 다음 턴 사거리를 예상하세요.', tone: 'text-yellow-300' };
    }
    return { level: '낮음', detail: '적의 이동 방향을 보고 유리한 거리와 행을 잡으세요.', tone: 'text-emerald-300' };
  }

  if (mainAction === '마법 사용' || mainAction === '아이템 사용') {
    return { level: '높음', detail: '거리와 행을 넘는 원거리 수단일 수 있습니다. 의도 단서를 확인하세요.', tone: 'text-orange-300' };
  }

  if (mainAction !== '공격') {
    return { level: '보통', detail: '적 의도 단서를 확인한 뒤 행동을 고르세요.', tone: 'text-yellow-300' };
  }

  if (!rowSame) {
    return { level: '낮음', detail: '행이 달라 직접 공격은 빗나갑니다. 행 이동은 주의하세요.', tone: 'text-emerald-300' };
  }
  if (distance <= 1) {
    return { level: '매우 높음', detail: '근접 공격 의도입니다. 방어·회피를 우선 검토하세요.', tone: 'text-red-300' };
  }
  if (distance <= weaponRange) {
    return { level: '높음', detail: '적 공격 사거리 안입니다. 베기 방향에 맞춰 대응하세요.', tone: 'text-orange-300' };
  }
  return { level: '낮음', detail: '현재 공격은 사거리 밖입니다. 거리 변화 여부를 확인하세요.', tone: 'text-emerald-300' };
}

module.exports = { getTacticalRisk };
