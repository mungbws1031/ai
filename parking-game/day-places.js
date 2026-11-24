/*
 * day-places.js — '주차 한 판' 3일치 일정과 장소별 단속원 순찰길·주민 자리
 *   patrol: 단속원이 왕복하는 두 점 [x, y]   loop: 한 번 왕복하는 데 걸리는 게임 분
 *   watchers: 주민이 설 수 있는 자리 [x, y, 바라보는 방향(rad)] — 매 판 n명을 무작위로 고름
 *   stays: 머무는 시간(분) 후보 — 매 판 하나를 무작위로 고름
 */
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const J = isNode ? require('./judge.js') : root.Judge;
  const PI = Math.PI, D = PI / 2, U = -PI / 2;

  const P = {
    mart: { key: 'mart', who: '마트', task: '장보기', limit: 45, stays: [20, 40, 60], loop: 30, guard: '주차 관리 요원',
      patrol: [[4, 20.8], [68, 20.8]], watchers: [[30, 10.4, D], [50, 10.4, D], [14, 21.5, 0], [60, 22, PI]], n: 2 },
    apt: { key: 'apt', who: '아파트', task: '친구 집 방문', limit: 45, stays: [30, 60, 120], loop: 35, guard: '경비 아저씨',
      patrol: [[4, 19], [76, 19]], watchers: [[40, 11, D], [70, 11, D], [20, 22, U], [60, 22, U]], n: 2 },
    mall: { key: 'mall', who: '쇼핑몰', task: '영화 보기', limit: 45, stays: [60, 120, 180], loop: 30, guard: '주차 관리 요원',
      patrol: [[4, 15], [60, 15]], watchers: [[20, 12.5, D], [45, 12.5, D], [10, 17.5, 0], [55, 17.5, PI]], n: 2 },
    house: { key: 'house', who: '주택가', task: '집들이', limit: 50, stays: [10, 30, 60, 120], loop: 35, guard: '단속 공무원',
      patrol: [[4, 16], [96, 16]], watchers: [[47, 11.3, D], [22, 11.2, D], [80, 21, U], [63, 30, U]], n: 2 },
    hospital: { key: 'hospital', who: '병원', task: '엄마 진료', limit: 50, stays: [20, 40, 60], loop: 40, guard: '단속 공무원',
      patrol: [[4, 13.6], [106, 13.6]], watchers: [[44, 13.6, D], [70, 13.6, D], [20, 30.5, U], [90, 30.5, U]], n: 2,
      maybeCar: { x: 93.7, y: 16.25, heading: PI, freeX: 104.65, spot: { x: 106, y: 16.25, heading: PI } } },
    market: { key: 'market', who: '전통시장', task: '장보기', limit: 50, stays: [30, 60, 120], loop: 35, guard: '단속 공무원',
      patrol: [[4, 13], [106, 13]], watchers: [[71, 12.9, D], [35, 27, U], [90, 27, U], [50, 13, D]], n: 2 },
    station: { key: 'station', who: '지하철역', task: '가족 마중', limit: 55, stays: [10, 20, 40], loop: 30, guard: '단속 공무원',
      patrol: [[4, 13], [116, 13]], watchers: [[39, 13, D], [56, 13, D], [100, 31, U], [30, 31, U]], n: 2 },
    bridge: { key: 'bridge', who: '강 건너 휴게소', task: '친구와 점심', limit: 55, stays: [30, 60, 90], loop: 40, guard: '순찰차',
      patrol: [[4, 20], [116, 20]], watchers: [[20, 13, D], [100, 13, D], [30, 27, U]], n: 2 },
    highway: { key: 'highway', who: '고속도로', task: '졸음 쉬기', limit: 50, stays: [20, 40, 60], loop: 30, guard: '고속도로 순찰차',
      patrol: [[4, 19.5], [126, 19.5]], watchers: [[75, 33, U], [60, 33, U]], n: 1 },
    school: { key: 'school', who: '학교 앞', task: '학원 상담', limit: 60, stays: [20, 40, 60], loop: 25, guard: '단속 공무원',
      patrol: [[4, 13.5], [146, 13.5]], watchers: [[34, 30.6, U], [64, 30.6, U], [78, 13.4, D], [110, 30.6, U]], n: 3 },
  };

  const DAYS = [
    { day: 1, title: '1일차 · 동네 한 바퀴', places: [P.mart, P.apt, P.mall, P.house, P.hospital] },
    { day: 2, title: '2일차 · 시내와 교외', places: [P.market, P.station, P.bridge, P.highway] },
    { day: 3, title: '3일차 · 단속 강화 주간', hard: { guards: 2, limitScale: 0.8 }, places: [P.hospital, P.market, P.station, P.house, P.school] },
  ];

  const SPECIAL = ['ev', 'pregnant', 'compact', 'women', 'resident'];
  const COLORS = ['#e9e9e4', '#b8bcc2', '#2b2f36', '#6d7782', '#8c2f2f', '#2f4a6b'];

  /**
   * 장소 한 판 준비 — 빈칸·주민·머무는 시간·순찰 위상을 무작위로 정함
   * @returns {lv, parked, watchers, phase, stay, place}
   */
  function preparePlace(levels, base, hard, rand = Math.random) {
    const pick = arr => arr[Math.floor(rand() * arr.length)];
    const place = { ...base, guards: hard ? hard.guards : 1, limit: Math.round(base.limit * (hard ? hard.limitScale : 1)) };
    const lv = JSON.parse(JSON.stringify(levels.find(l => l.key === base.key)));
    lv.props = (lv.props || []).filter(p => p.type !== 'reporter');
    const normal = lv.slots.filter(s => !s.disabled && !SPECIAL.includes(s.type));
    normal.forEach(s => { s.occupied = rand() < 0.85; s.freesOnCall = false; s.color = s.color || pick(COLORS); });
    if (normal.length && !normal.some(s => !s.occupied)) pick(normal).occupied = false;
    const parked = (lv.parked || []).map(c => ({ ...c }));
    if (base.maybeCar && rand() < 0.4) {
      // 빈 가장자리를 막는 대신 같은 줄의 다른 차 한 대를 빼서 합법 자리는 늘 하나 남김
      const { x, y, heading, freeX, spot } = base.maybeCar;
      const i = parked.findIndex(c => Math.abs(c.x - freeX) < 0.1);
      if (i >= 0) parked.splice(i, 1);
      parked.push({ x, y, heading, color: '#8c2f2f' });
      lv.candidates = [...(lv.candidates || []), spot];
    }
    lv.slots.forEach(s => {
      if (J.slotOccupied(s, {})) parked.push({ x: s.x + s.w / 2, y: s.y + s.h / 2, heading: s.h > s.w ? (rand() < 0.5 ? D : U) : (s.dir ?? 0), color: s.color, slot: s.id });
    });
    const shuffled = base.watchers.map(w => [rand(), w]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const watchers = shuffled.slice(0, base.n).map(([x, y, a]) => ({ x, y, base: a, ph: rand() * 6.28, sp: 5 + rand() * 4 }));
    return { lv, parked, watchers, phase: rand() * base.loop, stay: pick(base.stays), place };
  }

  const api = { PLACES: P, DAYS, preparePlace };
  if (isNode) module.exports = api;
  else Object.assign(root, { DayPlaces: api });
})(typeof window !== 'undefined' ? window : globalThis);
