/*
 * levels.js — 테스트용 샘플 레벨 3개
 *
 * ── 입력 데이터 구조 (단위: m, 좌표: 왼쪽 위 원점, y는 아래로 증가) ──
 * Level {
 *   id, title, place, goal, timeLimit(초), clock('HH:MM' 게임 시작 시각),
 *   world: {w, h},
 *   start: {x, y, heading(rad: 0=동쪽, π/2=남쪽, π=서쪽)},
 *   destination: {x, y, label, radius(도착 판정 반경)},
 *   story: {friend, ringLines[], callMinutes, meetingMinutes}  // 전화 장면
 *   buildings[]: {x,y,w,h,label,dest?}   충돌 O
 *   roads[] / lots[] / sidewalks[]: {x,y,w,h}  노면 종류
 *   lines[]: {x1,y1,x2,y2,type:'yellowDouble'|'whiteDashed'|'uturn'}  노면표시(황색 복선은 넘으면 위반)
 *   crosswalks[]: {x,y,w,h}
 *   zones[]: {type: rules.js 키, x,y,w,h | cx,cy,r, curb?, dir?(통행 방향), label?}
 *   slots[]: {id,x,y,w,h, kind:'lot'|'street', occupied, freesOnCall?, disabled?, dir?}
 *   parked[]: {x,y,heading,color, label?, freesOnCall?}  가장자리에 서 있는 차(충돌 O)
 *   props[]: {type:'hydrant'|'busstop'|'cctv'|'reporter'|'sign', x,y, r?, label}
 *   samples[]: 판정 로직 회귀 테스트 + 미리보기 '이 위치로 이동'
 *       {name, x,y,heading, mode:'stop'|'park', minutes, afterCall?, expect: 규칙 키, legal}
 * }
 */
(function (root) {
  const PI = Math.PI;
  const COLORS = ['#e9e9e4', '#b8bcc2', '#2b2f36', '#6d7782', '#8c2f2f', '#2f4a6b', '#d6d0c0', '#4e5a4a'];
  const pick = i => COLORS[(i * 5 + 3) % COLORS.length];

  // 같은 크기 구획을 한 줄로 만드는 도우미
  function slotRow(prefix, x0, y, count, w, h, kind, opts = {}) {
    return Array.from({ length: count }, (_, i) => ({
      id: `${prefix}${i + 1}`, x: +(x0 + i * w).toFixed(2), y, w, h, kind,
      occupied: !(opts.empty || []).includes(i),
      freesOnCall: (opts.frees || []).includes(i),
      color: pick(i + (opts.seed || 0)),
      dir: opts.dir,
    }));
  }
  const car = (x, y, heading, i, extra = {}) => ({ x, y, heading, color: pick(i), ...extra });

  // ───────────────────────── 레벨 1 ─────────────────────────
  const L1 = {
    id: 1, title: '카페 앞 약속', place: '왕복 4차로 상가 거리',
    goal: '카페 근처에 잠시 정차해 전화를 받고, 서쪽 유턴 구역에서 돌아 공영주차장에 정식 주차하세요.',
    timeLimit: 240, clock: '14:52',
    world: { w: 140, h: 62 },
    start: { x: 134, y: 20.4, heading: PI },
    destination: { x: 53, y: 13.5, label: '카페', radius: 22 },
    story: {
      friend: '지민', callMinutes: 3, meetingMinutes: 90,
      ringLines: ['어디야? 나 아직 지하철이야.', '20분쯤 늦을 것 같아. 미안!', '길가에 세워두지 말고 공영주차장에 대. 방금 두 자리 났대.'],
    },
    buildings: [
      { x: 0, y: 0, w: 44, h: 12, label: '편의점 · 약국' },
      { x: 44, y: 0, w: 18, h: 12, label: '카페 (약속장소)', dest: true },
      { x: 62, y: 0, w: 78, h: 12, label: '오피스텔 · 기계식 주차 만차' },
      { x: 0, y: 40, w: 62, h: 22, label: '아파트 단지 상가' },
      { x: 76, y: 40, w: 10, h: 22, label: '' },
      { x: 86, y: 58, w: 54, h: 4, label: '' },
    ],
    roads: [{ x: 0, y: 16, w: 140, h: 20 }, { x: 62, y: 36, w: 14, h: 26 }, { x: 92, y: 36, w: 8, h: 4 }],
    lots: [{ x: 86, y: 40, w: 54, h: 18, label: '공영주차장' }],
    sidewalks: [{ x: 0, y: 12, w: 140, h: 4 }, { x: 0, y: 36, w: 62, h: 4 }, { x: 76, y: 36, w: 16, h: 4 }, { x: 100, y: 36, w: 40, h: 4 }],
    lines: [
      { x1: 0, y1: 26, x2: 20, y2: 26, type: 'yellowDouble' },
      { x1: 20, y1: 26, x2: 28, y2: 26, type: 'uturn' },
      { x1: 28, y1: 26, x2: 62, y2: 26, type: 'yellowDouble' },
      { x1: 76, y1: 26, x2: 80, y2: 26, type: 'yellowDouble' },
      { x1: 86, y1: 26, x2: 140, y2: 26, type: 'yellowDouble' },
      { x1: 0, y1: 22.25, x2: 62, y2: 22.25, type: 'whiteDashed' },
      { x1: 86, y1: 22.25, x2: 140, y2: 22.25, type: 'whiteDashed' },
      { x1: 0, y1: 29.75, x2: 62, y2: 29.75, type: 'whiteDashed' },
      { x1: 86, y1: 29.75, x2: 140, y2: 29.75, type: 'whiteDashed' },
      { x1: 69, y1: 41, x2: 69, y2: 62, type: 'yellowDouble' },
    ],
    crosswalks: [{ x: 80, y: 16, w: 6, h: 20 }],
    zones: [
      // 북쪽 가장자리(서행 방향 dir=π)
      { type: 'yellow_solid', x: 0, y: 16, w: 41, h: 2.5, curb: 'top', dir: PI },
      { type: 'hydrant', cx: 36, cy: 14.6, r: 5 },
      { type: 'yellow_dashed', x: 41, y: 16, w: 16, h: 2.5, curb: 'top', dir: PI, label: '카페 앞 조업·승하차' },
      { type: 'yellow_solid', x: 57, y: 16, w: 23, h: 2.5, curb: 'top', dir: PI },
      { type: 'crosswalk_near', x: 70, y: 16, w: 10, h: 2.5 },
      { type: 'crosswalk', x: 80, y: 16, w: 6, h: 20 },
      { type: 'crosswalk_near', x: 86, y: 16, w: 10, h: 2.5 },
      { type: 'white_edge', x: 96, y: 16, w: 44, h: 2.5, curb: 'top', dir: PI },
      // 교차로(남쪽 골목과 T자)
      { type: 'intersection', x: 62, y: 18.5, w: 14, h: 17.5 },
      // 남쪽 가장자리(동행 방향 dir=0)
      { type: 'white_edge', x: 0, y: 33.5, w: 30, h: 2.5, curb: 'bottom', dir: 0 },
      { type: 'bus_stop', x: 30, y: 33.5, w: 21, h: 2.5, curb: 'bottom', dir: 0 },
      { type: 'white_edge', x: 51, y: 33.5, w: 6, h: 2.5, curb: 'bottom', dir: 0, label: '6m 남은 가장자리' },
      { type: 'corner', x: 57, y: 33.5, w: 5, h: 2.5, curb: 'bottom', dir: 0 },
      { type: 'corner', x: 76, y: 33.5, w: 5, h: 2.5, curb: 'bottom', dir: 0 },
      { type: 'crosswalk_near', x: 86, y: 33.5, w: 10, h: 2.5 },
      { type: 'yellow_solid', x: 96, y: 33.5, w: 44, h: 2.5, curb: 'bottom', dir: 0 },
      // 남쪽 골목
      { type: 'corner', x: 62, y: 36, w: 2.5, h: 5, curb: 'left', dir: PI / 2 },
      { type: 'corner', x: 73.5, y: 36, w: 2.5, h: 5, curb: 'right', dir: -PI / 2 },
      { type: 'yellow_solid', x: 62, y: 41, w: 2.5, h: 21, curb: 'left', dir: PI / 2 },
      { type: 'white_edge', x: 73.5, y: 41, w: 2.5, h: 21, curb: 'right', dir: -PI / 2 },
      // 주차장 통로
      { type: 'lot_aisle', x: 86, y: 40, w: 16, h: 5.5 },
      { type: 'lot_aisle', x: 86, y: 45.5, w: 54, h: 7 },
    ],
    slots: [
      ...slotRow('A', 102, 40.5, 14, 2.6, 5, 'lot', { seed: 1 }),
      { id: 'B0', x: 88, y: 52.5, w: 3.3, h: 5, kind: 'lot', disabled: true, occupied: false },
      ...slotRow('B', 91.3, 52.5, 18, 2.6, 5, 'lot', { frees: [9, 10], seed: 4 }),
    ],
    parked: [
      // 북쪽 백색 가장자리: 5.4m 틈은 평행주차하기에 너무 좁음(함정)
      ...[98.75, 108.85, 114.05, 119.25, 124.45, 129.65, 134.85].map((x, i) => car(x, 17.2, PI, i)),
      // 남쪽 백색 가장자리
      ...[2.85, 8.05, 13.25, 18.45, 23.65].map((x, i) => car(x, 34.8, 0, i + 3)),
      // 골목 동쪽 가장자리
      ...[44.35, 49.55, 54.75].map((y, i) => car(74.8, y, -PI / 2, i + 6)),
    ],
    props: [
      { type: 'hydrant', x: 36, y: 14.6, label: '지상식 소화전' },
      { type: 'busstop', x: 40.5, y: 37.2, label: '시내버스 정류장' },
      { type: 'cctv', x: 58, y: 13.4, r: 28, label: '주정차 단속 CCTV' },
      { type: 'reporter', x: 34, y: 38.4, label: '버스 기다리는 시민', phone: true },
      { type: 'reporter', x: 89, y: 13.8, label: '횡단보도 앞 주민', phone: true },
      { type: 'sign', x: 96, y: 38.2, label: 'P 공영주차장 · 만차' },
      { type: 'sign', x: 24, y: 38.2, label: '유턴 허용' },
    ],
    samples: [
      { name: '카페 앞 황색 점선 3분 정차', x: 50, y: 17.3, heading: PI, mode: 'stop', minutes: 3, expect: 'yellow_dashed', legal: true },
      { name: '같은 자리에 40분 주차', x: 50, y: 17.3, heading: PI, mode: 'park', minutes: 40, expect: 'yellow_dashed', legal: false },
      { name: '같은 자리 정차지만 8분 경과', x: 50, y: 17.3, heading: PI, mode: 'stop', minutes: 8, expect: 'yellow_dashed', legal: false },
      { name: '소화전 앞 정차', x: 37, y: 17.3, heading: PI, mode: 'stop', minutes: 2, expect: 'hydrant', legal: false },
      { name: '버스정류소 정차', x: 40, y: 34.7, heading: 0, mode: 'stop', minutes: 2, expect: 'bus_stop', legal: false },
      { name: '횡단보도 위 정차', x: 83, y: 22, heading: PI, mode: 'stop', minutes: 1, expect: 'crosswalk', legal: false },
      { name: '6m 백색 가장자리 정방향 주차', x: 54, y: 34.8, heading: 0, mode: 'park', minutes: 90, expect: 'white_edge', legal: true },
      { name: '같은 칸 역방향 주차', x: 54, y: 34.8, heading: PI, mode: 'park', minutes: 90, expect: 'wrong_way', legal: false },
      { name: '공영주차장 B10(통화 후)', x: 116, y: 55, heading: -PI / 2, mode: 'park', minutes: 90, afterCall: true, expect: 'slot', legal: true },
      { name: '빈 장애인전용 구획', x: 89.65, y: 55, heading: PI / 2, mode: 'park', minutes: 90, expect: 'disabled', legal: false },
      { name: '차로 한가운데 비상등 정차', x: 120, y: 24, heading: PI, mode: 'stop', minutes: 2, expect: 'lane', legal: false },
      { name: '주차장 통로에 세워둠', x: 120, y: 49, heading: 0, mode: 'park', minutes: 90, expect: 'lot_aisle', legal: false },
    ],
  };

  // ───────────────────────── 레벨 2 ─────────────────────────
  const L2 = {
    id: 2, title: '학원 앞 픽업', place: '초등학교 앞 왕복 2차로 · 어린이보호구역',
    goal: '보호구역 밖에서 정차해 전화를 받고, 뒤쪽에서 빠지는 노상 구획 S3에 후진 평행주차하세요.',
    timeLimit: 200, clock: '15:40',
    world: { w: 150, h: 58 },
    start: { x: 146, y: 19.7, heading: PI },
    destination: { x: 83, y: 13.2, label: '학원', radius: 24 },
    story: {
      friend: '학원 상담실장', callMinutes: 3, meetingMinutes: 60,
      ringLines: ['어머님, 상담 앞 순서가 길어져서요.', '30분 정도 기다리셔야 할 것 같아요.', '학원 오른쪽 노상주차장 세 번째 칸이 방금 비었어요.'],
    },
    buildings: [
      { x: 0, y: 0, w: 70, h: 12, label: '문구점 · 분식집' },
      { x: 70, y: 0, w: 26, h: 12, label: '학원 (약속장소)', dest: true },
      { x: 96, y: 0, w: 54, h: 12, label: '빌라' },
      { x: 0, y: 32, w: 80, h: 26, label: '○○초등학교' },
      { x: 80, y: 32, w: 70, h: 26, label: '아파트' },
    ],
    roads: [{ x: 0, y: 15, w: 150, h: 14 }],
    lots: [],
    sidewalks: [{ x: 0, y: 12, w: 150, h: 3 }, { x: 0, y: 29, w: 150, h: 3 }],
    lines: [
      { x1: 0, y1: 22, x2: 30, y2: 22, type: 'yellowDouble' },
      { x1: 36, y1: 22, x2: 150, y2: 22, type: 'yellowDouble' },
    ],
    crosswalks: [{ x: 30, y: 15, w: 6, h: 14 }],
    zones: [
      { type: 'school_zone', x: 0, y: 15, w: 92, h: 14, label: '어린이보호구역(적색 포장)' },
      { type: 'yellow_solid', x: 0, y: 15, w: 92, h: 2.5, curb: 'top', dir: PI },
      { type: 'bus_stop', x: 50, y: 15, w: 20, h: 2.5, curb: 'top', dir: PI },
      { type: 'crosswalk', x: 30, y: 15, w: 6, h: 14 },
      { type: 'yellow_dashed', x: 92, y: 15, w: 10, h: 2.5, curb: 'top', dir: PI, label: '보호구역 끝 승하차 구간' },
      { type: 'yellow_solid', x: 0, y: 26.5, w: 150, h: 2.5, curb: 'bottom', dir: 0 },
      { type: 'hydrant', cx: 120, cy: 30.2, r: 5 },
    ],
    slots: slotRow('S', 102, 15.3, 8, 6, 2.0, 'street', { frees: [2], seed: 2, dir: PI }),
    parked: [
      car(62, 27.6, 0, 4, { label: '어린이보호구역 불법주차 차량', note: '지금 학부모가 안전신문고로 찍고 있습니다. 1분 뒤 두 번째 사진이 찍히면 과태료 12만원입니다.' }),
    ],
    props: [
      { type: 'busstop', x: 60, y: 13.4, label: '학교 앞 정류장' },
      { type: 'hydrant', x: 120, y: 30.2, label: '지상식 소화전' },
      { type: 'cctv', x: 70, y: 30.6, r: 30, label: '어린이보호구역 단속 CCTV' },
      { type: 'reporter', x: 34, y: 30.6, label: '하교 마중 학부모', phone: true },
      { type: 'reporter', x: 64, y: 30.6, label: '불법주차 촬영 중인 학부모', phone: true },
      { type: 'reporter', x: 78, y: 13.4, label: '학원 앞 학부모', phone: true },
      { type: 'sign', x: 88, y: 13.2, label: '어린이보호구역 끝' },
    ],
    samples: [
      { name: '학원 바로 앞 정차', x: 80, y: 16.4, heading: PI, mode: 'stop', minutes: 2, expect: 'school_zone', legal: false },
      { name: '보호구역 끝 황색 점선 정차', x: 97, y: 16.4, heading: PI, mode: 'stop', minutes: 3, expect: 'yellow_dashed', legal: true },
      { name: '학교 앞 정류장 정차', x: 60, y: 16.4, heading: PI, mode: 'stop', minutes: 1, expect: 'school_zone', legal: false },
      { name: '노상 구획 S3(통화 후)', x: 117, y: 16.3, heading: PI, mode: 'park', minutes: 60, afterCall: true, expect: 'street_slot', legal: true },
      { name: '맞은편 황색 실선', x: 110, y: 27.6, heading: 0, mode: 'stop', minutes: 2, expect: 'yellow_solid', legal: false },
    ],
  };

  // ───────────────────────── 레벨 3 ─────────────────────────
  const L3 = {
    id: 3, title: '골목 맛집', place: '중앙선 없는 이면도로 · 폭 10m',
    goal: '맛집 앞에 잠깐 정차한 뒤, 6.2m 틈에 평행주차하세요. 5m 틈은 들어가지 않습니다.',
    timeLimit: 180, clock: '18:25',
    world: { w: 130, h: 50 },
    start: { x: 126, y: 17.6, heading: PI },
    destination: { x: 55, y: 12.8, label: '맛집', radius: 22 },
    story: {
      friend: '회사 동기', callMinutes: 2, meetingMinutes: 120,
      ringLines: ['웨이팅 걸어놨어. 앞에 다섯 팀.', '40분은 걸리겠다. 차 제대로 대고 와.', '세탁소 앞에 한 자리 비어 있더라.'],
    },
    buildings: [
      { x: 0, y: 0, w: 46, h: 12, label: '세탁소 · 미용실' },
      { x: 46, y: 0, w: 18, h: 12, label: '골목 맛집 (약속장소)', dest: true },
      { x: 64, y: 0, w: 66, h: 12, label: '다세대주택' },
      { x: 0, y: 26, w: 38, h: 24, label: '주택' },
      { x: 38, y: 38, w: 27, h: 12, label: '' },
      { x: 73, y: 26, w: 57, h: 24, label: '빌라' },
    ],
    roads: [{ x: 0, y: 14, w: 130, h: 10 }, { x: 65, y: 24, w: 8, h: 26 }, { x: 40, y: 24, w: 8, h: 2 }],
    lots: [{ x: 38, y: 26, w: 27, h: 12, label: '식당 손님 주차장(만차)' }],
    sidewalks: [{ x: 0, y: 12, w: 130, h: 2 }, { x: 0, y: 24, w: 40, h: 2 }, { x: 48, y: 24, w: 17, h: 2 }, { x: 73, y: 24, w: 57, h: 2 }],
    lines: [],
    crosswalks: [],
    zones: [
      { type: 'yellow_solid', x: 0, y: 14, w: 14, h: 2.2, curb: 'top', dir: PI },
      { type: 'white_edge', x: 14, y: 14, w: 27, h: 2.2, curb: 'top', dir: PI, label: '세탁소 앞 가장자리' },
      { type: 'yellow_solid', x: 41, y: 14, w: 8, h: 2.2, curb: 'top', dir: PI },
      { type: 'hydrant', cx: 44, cy: 12.6, r: 5 },
      { type: 'yellow_dashed', x: 49, y: 14, w: 11, h: 2.2, curb: 'top', dir: PI, label: '맛집 앞 승하차' },
      { type: 'yellow_solid', x: 60, y: 14, w: 18, h: 2.2, curb: 'top', dir: PI },
      { type: 'white_edge', x: 78, y: 14, w: 52, h: 2.2, curb: 'top', dir: PI },
      { type: 'intersection', x: 65, y: 16.2, w: 8, h: 7.8 },
      { type: 'yellow_solid', x: 0, y: 21.8, w: 60, h: 2.2, curb: 'bottom', dir: 0 },
      { type: 'corner', x: 60, y: 21.8, w: 5, h: 2.2, curb: 'bottom', dir: 0 },
      { type: 'corner', x: 73, y: 21.8, w: 5, h: 2.2, curb: 'bottom', dir: 0 },
      { type: 'yellow_solid', x: 78, y: 21.8, w: 52, h: 2.2, curb: 'bottom', dir: 0 },
      { type: 'corner', x: 65, y: 24, w: 1.8, h: 5 },
      { type: 'corner', x: 71.2, y: 24, w: 1.8, h: 5 },
      { type: 'lot_aisle', x: 38, y: 26, w: 27, h: 6.5 },
    ],
    slots: [
      { id: 'D1', x: 39, y: 32.5, w: 3.3, h: 5, kind: 'lot', disabled: true, occupied: false },
      ...slotRow('P', 42.3, 32.5, 8, 2.5, 5, 'lot', { seed: 5 }),
    ],
    parked: [
      ...[16.75, 21.95, 32.85, 37.95].map((x, i) => car(x, 15.1, PI, i + 1)),
      ...[80.75, 85.85, 95.55, 100.65, 105.75, 110.85, 115.95, 121.05, 126.15].map((x, i) => car(x, 15.1, PI, i + 2)),
    ],
    props: [
      { type: 'hydrant', x: 44, y: 12.6, label: '지상식 소화전' },
      { type: 'reporter', x: 30, y: 13, label: '세탁소 사장님', phone: true },
      { type: 'reporter', x: 69, y: 30, label: '골목 입구 주민', phone: true },
      { type: 'sign', x: 90.7, y: 12.9, label: '틈 5.0m' },
      { type: 'sign', x: 27.4, y: 12.9, label: '틈 6.2m' },
    ],
    samples: [
      { name: '맛집 앞 황색 점선 정차', x: 54.5, y: 15.1, heading: PI, mode: 'stop', minutes: 2, expect: 'yellow_dashed', legal: true },
      { name: '세탁소 앞 6.2m 틈 평행주차', x: 27.4, y: 15.1, heading: PI, mode: 'park', minutes: 120, expect: 'white_edge', legal: true },
      { name: '빈 장애인전용 구획', x: 40.65, y: 35, heading: -PI / 2, mode: 'park', minutes: 120, expect: 'disabled', legal: false },
      { name: '골목 모퉁이 정차', x: 62.5, y: 22.9, heading: 0, mode: 'stop', minutes: 2, expect: 'corner', legal: false },
      { name: '소화전 앞 잠깐', x: 44, y: 15.1, heading: PI, mode: 'stop', minutes: 1, expect: 'hydrant', legal: false },
    ],
  };

  // ═══════════════════ 2단계: 초보운전자 판단 연습 레벨 ═══════════════════
  // situation: {title, text, stay(머무는 분), who, event[](머무는 시간이 늘어나는 사건 대사), extra(늘어난 뒤 총 머무는 분)}
  // candidates[]: 판단 모드에서 고르는 후보 자리 {x,y,heading, expect(규칙 키), answer(park|stop|no|manner)}
  //   — 정답은 judge.js가 그 위치를 판정해 규칙표의 answer에서 읽습니다. expect/answer는 테스트용 기대값입니다.
  const storyFrom = sit => ({ friend: sit.who, callMinutes: 3, meetingMinutes: sit.extra, ringLines: sit.event });

  // ── 1. 마트 주차장 ── (차가 다니지 않는 사유지 주차장)
  const martSit = {
    title: '주말 장보기', text: '마트에 도착했어요. 장보는 데 30분쯤 걸릴 것 같아요. 어디에 세울까요?',
    who: '마트 안내 방송', stay: 30, extra: 60,
    event: ['오늘은 계산대 줄이 아주 깁니다.', '계산까지 1시간 가까이 걸릴 수 있어요.'],
  };
  const M1 = {
    id: 1, key: 'mart', title: '마트 주차장', place: '대형마트 지상 주차장 · 사유지',
    goal: '후보 자리마다 "여기 세워도 될까?"를 판단해 보고, 실제로 1시간 둘 자리를 고르세요.',
    timeLimit: 240, clock: '11:20', situation: martSit, story: storyFrom(martSit),
    world: { w: 72, h: 30 },
    start: { x: 68, y: 20.8, heading: PI },
    destination: { x: 36, y: 9.5, label: '마트 입구', radius: 18 },
    buildings: [{ x: 0, y: 0, w: 72, h: 9, label: '○○마트 (입구는 가운데)', dest: true }],
    roads: [], sidewalks: [], lines: [], crosswalks: [],
    lots: [{ x: 0, y: 12, w: 72, h: 18 }],
    zones: [
      { type: 'entrance', x: 0, y: 9, w: 72, h: 3, label: '매장 앞 보행통로', paint: '보행통로 · 카트' },
    ],
    slots: [
      { id: 'D1', x: 2, y: 12.3, w: 3.3, h: 5, kind: 'lot', type: 'disabled', disabled: true, occupied: false },
      { id: 'D2', x: 5.3, y: 12.3, w: 3.3, h: 5, kind: 'lot', type: 'disabled', disabled: true, occupied: true, color: '#e9e9e4' },
      { id: 'M1', x: 8.6, y: 12.3, w: 2.6, h: 5, kind: 'lot', type: 'pregnant', occupied: false },
      { id: 'E1', x: 11.2, y: 12.3, w: 2.6, h: 5, kind: 'lot', type: 'ev', occupied: false },
      { id: 'E2', x: 13.8, y: 12.3, w: 2.6, h: 5, kind: 'lot', type: 'ev', occupied: true, color: '#2f4a6b' },
      { id: 'K1', x: 16.4, y: 12.3, w: 2.6, h: 5, kind: 'lot', type: 'compact', occupied: true, color: '#d6d0c0' },
      ...slotRow('A', 19, 12.3, 21, 2.5, 5, 'lot', { seed: 2 }),
      ...slotRow('B', 2, 24.3, 27, 2.5, 5, 'lot', { seed: 6, empty: [12, 13] }),
    ],
    parked: [],
    props: [
      { type: 'reporter', x: 30, y: 10.4, label: '카트 끌고 나오는 손님', phone: true },
      { type: 'sign', x: 12.5, y: 18.6, label: '⚡ 충전구역' },
      { type: 'sign', x: 66, y: 23, label: '출구 →' },
    ],
    candidates: [
      { x: 3.65, y: 14.8, heading: -PI / 2, expect: 'disabled', answer: 'no' },
      { x: 12.5, y: 14.8, heading: -PI / 2, expect: 'ev_charge', answer: 'no' },
      { x: 9.9, y: 14.8, heading: -PI / 2, expect: 'pregnant_slot', answer: 'manner' },
      { x: 36, y: 10.5, heading: 0, expect: 'entrance', answer: 'no' },
      { x: 50, y: 20.8, heading: PI, expect: 'lot_aisle', answer: 'stop' },
      { x: 33.25, y: 26.8, heading: PI / 2, expect: 'slot', answer: 'park' },
    ],
    samples: [
      { name: '빈 칸 두 개에 걸쳐 세움', x: 34.5, y: 26.8, heading: PI / 2, mode: 'park', minutes: 30, expect: 'straddle', legal: true },
    ],
  };

  // ── 2. 아파트 단지 ──
  const aptSit = {
    title: '밤 9시 친구 집', text: '친구가 사는 101동에 왔어요. 주차장이 꽉 찼어요. 30분만 있다 갈 거예요.',
    who: '친구', stay: 30, extra: 150,
    event: ['야식 시켰어! 먹고 가.', '두 시간은 더 있다 가야겠다.'],
  };
  const M2 = {
    id: 2, key: 'apt', title: '아파트 단지', place: '아파트 단지 안 · 사유지',
    goal: '빈칸이 거의 없는 밤 아파트에서 세워도 되는 곳과 안 되는 곳을 가려내세요.',
    timeLimit: 240, clock: '21:05', situation: aptSit, story: storyFrom(aptSit),
    world: { w: 80, h: 36 },
    start: { x: 76, y: 17, heading: PI },
    destination: { x: 18, y: 10, label: '101동 출입구', radius: 20 },
    buildings: [
      { x: 0, y: 0, w: 36, h: 10, label: '101동 (친구 집)', dest: true },
      { x: 44, y: 0, w: 36, h: 10, label: '102동' },
      { x: 0, y: 32, w: 80, h: 4, label: '' },
    ],
    roads: [], sidewalks: [], lines: [], crosswalks: [],
    lots: [{ x: 0, y: 10, w: 80, h: 22 }],
    zones: [
      { type: 'entrance', x: 14, y: 10, w: 8, h: 4, label: '101동 출입구 앞', paint: '출입구' },
      { type: 'entrance', x: 58, y: 10, w: 8, h: 4, label: '102동 출입구 앞', paint: '출입구' },
      { type: 'fire_lane', x: 24, y: 12, w: 12, h: 6, label: '소방차 전용구역', paint: '소방차 전용' },
      { type: 'hydrant_private', cx: 50, cy: 11, r: 3 },
      { type: 'double_park', x: 0, y: 23.2, w: 80, h: 2.8, label: '이중주차 허용 구간(기어 N)' },
    ],
    slots: slotRow('S', 0, 27, 32, 2.5, 5, 'lot', { seed: 3, empty: [29] }),
    parked: [
      car(8, 24.6, 0, 1, { label: '이중주차된 차', note: '기어를 N에 두고 연락처를 남겨 둔 차입니다. 밀어서 옮길 수 있어요.' }),
      car(14, 24.6, 0, 5, { label: '이중주차된 차', note: '기어를 N에 두고 연락처를 남겨 둔 차입니다. 밀어서 옮길 수 있어요.' }),
    ],
    props: [
      { type: 'hydrant', x: 50, y: 11, label: '단지 옥외소화전' },
      { type: 'reporter', x: 40, y: 11, label: '산책하는 주민', phone: true },
    ],
    candidates: [
      { x: 30, y: 15, heading: PI, expect: 'fire_lane', answer: 'no' },
      { x: 18, y: 12.2, heading: 0, expect: 'entrance', answer: 'no' },
      { x: 50, y: 13.2, heading: PI, expect: 'hydrant_private', answer: 'no' },
      { x: 50, y: 24.5, heading: 0, expect: 'double_park', answer: 'manner' },
      { x: 73.75, y: 29.5, heading: -PI / 2, expect: 'slot', answer: 'park' },
    ],
    samples: [],
  };

  // ── 3. 병원 앞 ── (여기서부터 실제 도로)
  const hospSit = {
    title: '엄마 병원 모시기', text: '엄마를 모시고 병원 앞에 왔어요. 병원 주차장은 만차래요. 진료는 20분이면 끝난대요.',
    who: '엄마', stay: 20, extra: 60,
    event: ['접수했는데 앞에 대기가 많네.', '한 시간은 걸리겠다. 차 제대로 대고 와.'],
  };
  const M3 = {
    id: 3, key: 'hospital', title: '병원 앞', place: '왕복 2차로 · 병원 · 버스정류장',
    goal: '모시고 내리는 자리와 오래 세울 자리를 구분하세요. 여기서부터는 도로교통법이 적용되는 도로입니다.',
    timeLimit: 220, clock: '10:40', situation: hospSit, story: storyFrom(hospSit),
    world: { w: 110, h: 45 },
    start: { x: 106, y: 19.7, heading: PI },
    destination: { x: 55, y: 13, label: '병원 정문', radius: 24 },
    buildings: [
      { x: 0, y: 0, w: 40, h: 12, label: '약국 · 편의점' },
      { x: 40, y: 0, w: 40, h: 12, label: '○○병원 (주차장 만차)', dest: true },
      { x: 80, y: 0, w: 30, h: 12, label: '상가' },
      { x: 0, y: 32, w: 110, h: 13, label: '주택가' },
    ],
    roads: [{ x: 0, y: 15, w: 110, h: 14 }, { x: 60, y: 12, w: 8, h: 3 }],
    lots: [],
    sidewalks: [{ x: 0, y: 12, w: 60, h: 3 }, { x: 68, y: 12, w: 42, h: 3 }, { x: 0, y: 29, w: 110, h: 3 }],
    lines: [
      { x1: 0, y1: 22, x2: 20, y2: 22, type: 'yellowDouble' },
      { x1: 26, y1: 22, x2: 110, y2: 22, type: 'yellowDouble' },
    ],
    crosswalks: [{ x: 20, y: 15, w: 6, h: 14 }],
    zones: [
      { type: 'yellow_solid', x: 0, y: 15, w: 30, h: 2.5, curb: 'top', dir: PI },
      { type: 'crosswalk_near', x: 10, y: 15, w: 10, h: 2.5 },
      { type: 'crosswalk', x: 20, y: 15, w: 6, h: 14 },
      { type: 'crosswalk_near', x: 26, y: 15, w: 10, h: 2.5 },
      { type: 'bus_stop', x: 30, y: 15, w: 20, h: 2.5, curb: 'top', dir: PI },
      { type: 'yellow_dashed', x: 50, y: 15, w: 10, h: 2.5, curb: 'top', dir: PI, label: '병원 앞 승하차 구간' },
      { type: 'ambulance', x: 60, y: 12, w: 8, h: 5.5, label: '응급실 구급차 진입로', paint: '구급차 전용' },
      { type: 'yellow_solid', x: 68, y: 15, w: 12, h: 2.5, curb: 'top', dir: PI },
      { type: 'white_edge', x: 80, y: 15, w: 30, h: 2.5, curb: 'top', dir: PI },
      { type: 'yellow_solid', x: 0, y: 26.5, w: 110, h: 2.5, curb: 'bottom', dir: 0 },
      { type: 'crosswalk_near', x: 10, y: 26.5, w: 10, h: 2.5 },
      { type: 'crosswalk_near', x: 26, y: 26.5, w: 10, h: 2.5 },
    ],
    slots: [],
    parked: [82.75, 87.85, 99.55, 104.65].map((x, i) => car(x, 16.25, PI, i + 2)),
    props: [
      { type: 'busstop', x: 40, y: 13.5, label: '병원 앞 정류장' },
      { type: 'cctv', x: 56, y: 13.4, r: 25, label: '병원 앞 단속 CCTV' },
      { type: 'reporter', x: 44, y: 13.6, label: '버스 기다리는 시민', phone: true },
      { type: 'reporter', x: 70, y: 13.6, label: '병원 경비원', phone: true },
      { type: 'sign', x: 93.7, y: 13.4, label: '빈 가장자리 7m' },
    ],
    candidates: [
      { x: 40, y: 16.25, heading: PI, expect: 'bus_stop', answer: 'no' },
      { x: 55, y: 16.25, heading: PI, expect: 'yellow_dashed', answer: 'stop' },
      { x: 64, y: 16.25, heading: PI, expect: 'ambulance', answer: 'no' },
      { x: 55, y: 27.75, heading: 0, expect: 'yellow_solid', answer: 'no' },
      { x: 93.7, y: 16.25, heading: PI, expect: 'white_edge', answer: 'park' },
    ],
    samples: [],
  };

  // ── 4. 학교 앞 ── (1단계 레벨 2를 복사해 다듬음)
  const schoolSit = {
    title: '학원 상담', text: '아이 학원 상담에 왔어요. 학원 앞이 초등학교 앞 어린이보호구역이에요. 상담은 20분이래요.',
    who: '학원 상담실장', stay: 20, extra: 50,
    event: ['어머님, 앞 상담이 길어져서요.', '30분 정도 더 기다리셔야 할 것 같아요.'],
  };
  const M4 = {
    ...L2, id: 4, key: 'school', title: '학교 앞', place: '초등학교 앞 · 어린이보호구역',
    goal: '어린이보호구역 안과 밖을 구분하세요. 보호구역은 잠깐 정차도 안 됩니다.',
    clock: '15:40', situation: schoolSit, story: storyFrom(schoolSit),
    slots: slotRow('S', 102, 15.3, 8, 6, 2.0, 'street', { empty: [2], seed: 2, dir: PI }),
    candidates: [
      { x: 80, y: 16.4, heading: PI, expect: 'school_zone', answer: 'no' },
      { x: 60, y: 16.4, heading: PI, expect: 'school_zone', answer: 'no' },
      { x: 97, y: 16.4, heading: PI, expect: 'yellow_dashed', answer: 'stop' },
      { x: 110, y: 27.6, heading: 0, expect: 'yellow_solid', answer: 'no' },
      { x: 117, y: 16.3, heading: PI, expect: 'street_slot', answer: 'park' },
    ],
    samples: [],
  };

  // ── 쇼핑몰 지하주차장 ── (사유지, 기둥·경사로·비상구)
  const mallSit = {
    title: '쇼핑몰 지하 2층', text: '친구와 영화 보러 쇼핑몰에 왔어요. 지하 2층으로 내려왔는데 자리가 거의 없어요. 영화는 2시간이에요.',
    who: '친구', stay: 120, extra: 180,
    event: ['영화 끝나고 저녁까지 먹고 가자!', '한 시간은 더 있어야겠다.'],
  };
  const M5 = {
    id: 3, key: 'mall', title: '쇼핑몰 지하주차장', place: '쇼핑몰 지하 2층 · 사유지',
    goal: '비상구·경사로처럼 "통로"인 곳과 진짜 주차 칸을 구분하세요.',
    timeLimit: 240, clock: '13:10', situation: mallSit, story: storyFrom(mallSit),
    world: { w: 72, h: 24 },
    start: { x: 68, y: 15, heading: PI },
    destination: { x: 31, y: 6, label: '매장 연결 출입구', radius: 18 },
    buildings: [{ x: 0, y: 0, w: 72, h: 6, label: '엘리베이터 · 매장 연결 통로', dest: true }],
    roads: [], sidewalks: [], lines: [], crosswalks: [],
    lots: [{ x: 0, y: 6, w: 72, h: 18 }],
    zones: [
      { type: 'fire_exit', x: 28, y: 6, w: 6, h: 5.5, label: '비상구 앞', paint: '비상구' },
      { type: 'ramp', x: 62, y: 11.5, w: 10, h: 7, label: '지하 1층 경사로', paint: '경사로 ↑' },
    ],
    slots: [
      { id: 'W1', x: 2, y: 6.5, w: 2.5, h: 5, kind: 'lot', type: 'women', occupied: false },
      { id: 'W2', x: 4.5, y: 6.5, w: 2.5, h: 5, kind: 'lot', type: 'women', occupied: true, color: '#d6d0c0' },
      ...slotRow('A', 7, 6.5, 8, 2.5, 5, 'lot', { seed: 1 }),
      { id: 'E1', x: 34, y: 6.5, w: 2.5, h: 5, kind: 'lot', type: 'ev', occupied: false },
      { id: 'E2', x: 36.5, y: 6.5, w: 2.5, h: 5, kind: 'lot', type: 'ev', occupied: true, color: '#2f4a6b' },
      ...slotRow('C', 39, 6.5, 9, 2.5, 5, 'lot', { seed: 4 }),
      ...slotRow('B', 2, 18.5, 24, 2.5, 5, 'lot', { seed: 7, empty: [10] }),
    ],
    parked: [],
    props: [{ type: 'sign', x: 31, y: 12.6, label: '비상구 앞 주차 금지' }],
    candidates: [
      { x: 3.25, y: 9, heading: -PI / 2, expect: 'women_slot', answer: 'manner' },
      { x: 31, y: 9, heading: -PI / 2, expect: 'fire_exit', answer: 'no' },
      { x: 35.25, y: 9, heading: -PI / 2, expect: 'ev_charge', answer: 'no' },
      { x: 66, y: 15, heading: PI, expect: 'ramp', answer: 'no' },
      { x: 45, y: 15, heading: PI, expect: 'lot_aisle', answer: 'stop' },
      { x: 28.25, y: 21, heading: PI / 2, expect: 'slot', answer: 'park' },
    ],
    samples: [],
  };

  // ── 주택가 골목 ── (인도 없는 이면도로, 거주자우선주차)
  const houseSit = {
    title: '친구 집들이', text: '친구 집들이에 왔어요. 인도도 없는 좁은 골목이에요. 선물만 잠깐 내려줄 생각이에요.',
    who: '친구', stay: 10, extra: 180,
    event: ['왔으면 밥 먹고 가!', '세 시간은 놀다 가야지.'],
  };
  const M6 = {
    id: 4, key: 'house', title: '주택가 골목', place: '인도 없는 이면도로 · 거주자우선주차',
    goal: '흰 칸이라고 다 내 자리가 아니에요. 골목에서 세울 수 있는 곳을 찾으세요.',
    timeLimit: 220, clock: '17:50', situation: houseSit, story: storyFrom(houseSit),
    world: { w: 100, h: 40 },
    start: { x: 96, y: 15.6, heading: PI },
    destination: { x: 56, y: 11, label: '친구 집', radius: 22 },
    buildings: [
      { x: 0, y: 0, w: 42, h: 12, label: '다가구 주택' },
      { x: 42, y: 0, w: 10, h: 12, label: '이웃집 차고' },
      { x: 52, y: 0, w: 14, h: 12, label: '친구 집', dest: true },
      { x: 66, y: 0, w: 34, h: 12, label: '빌라' },
      { x: 0, y: 20, w: 60, h: 20, label: '주택' },
      { x: 66, y: 20, w: 34, h: 20, label: '주택' },
    ],
    roads: [{ x: 0, y: 12, w: 100, h: 8 }, { x: 60, y: 20, w: 6, h: 20 }],
    lots: [], sidewalks: [], lines: [], crosswalks: [],
    zones: [
      { type: 'white_edge', x: 0, y: 12, w: 44, h: 2.2, curb: 'top', dir: PI },
      { type: 'driveway', x: 44, y: 12, w: 6, h: 2.2, curb: 'top', dir: PI, label: '이웃집 차고 앞', paint: '차고' },
      { type: 'yellow_dashed', x: 50, y: 12, w: 10, h: 2.2, curb: 'top', dir: PI, label: '친구 집 앞' },
      { type: 'yellow_solid', x: 60, y: 12, w: 10, h: 2.2, curb: 'top', dir: PI },
      { type: 'white_edge', x: 70, y: 12, w: 30, h: 2.2, curb: 'top', dir: PI },
      { type: 'yellow_solid', x: 0, y: 17.8, w: 55, h: 2.2, curb: 'bottom', dir: 0 },
      { type: 'corner', x: 55, y: 17.8, w: 5, h: 2.2, curb: 'bottom', dir: 0 },
      { type: 'intersection', x: 60, y: 14.2, w: 6, h: 5.8 },
      { type: 'corner', x: 66, y: 17.8, w: 5, h: 2.2, curb: 'bottom', dir: 0 },
      { type: 'yellow_solid', x: 71, y: 17.8, w: 29, h: 2.2, curb: 'bottom', dir: 0 },
      { type: 'corner', x: 60, y: 20, w: 1.8, h: 5 },
      { type: 'corner', x: 64.2, y: 20, w: 1.8, h: 5 },
    ],
    slots: slotRow('R', 4, 12.1, 6, 6, 2.0, 'street', { seed: 3, empty: [2], dir: PI }).map(s => ({ ...s, type: 'resident' })),
    parked: [72.85, 77.95, 90.55, 95.65].map((x, i) => car(x, 13.1, PI, i + 3)),
    props: [
      { type: 'sign', x: 22, y: 11.2, label: '거주자우선주차 · 배정 차량만' },
      { type: 'sign', x: 84.25, y: 11.2, label: '빈 가장자리 7.9m' },
      { type: 'reporter', x: 47, y: 11.3, label: '차고 앞 이웃 주민', phone: true },
    ],
    candidates: [
      { x: 19, y: 13.1, heading: PI, expect: 'resident_slot', answer: 'no' },
      { x: 47, y: 13.1, heading: PI, expect: 'driveway', answer: 'manner' },
      { x: 55, y: 13.1, heading: PI, expect: 'yellow_dashed', answer: 'stop' },
      { x: 57.5, y: 18.9, heading: 0, expect: 'corner', answer: 'no' },
      { x: 84.25, y: 13.1, heading: PI, expect: 'white_edge', answer: 'park' },
    ],
    samples: [],
  };

  // ── 강 건너 휴게소 길 ── (교외 도로, 다리·공사구역)
  const bridgeSit = {
    title: '강 건너 휴게소', text: '교외 드라이브 중 강 건너 휴게소 식당에서 친구를 만나요. 식당 앞 주차장은 공사 중이래요.',
    who: '친구', stay: 10, extra: 90,
    event: ['웨이팅이 길어.', '한 시간 반은 걸릴 것 같아. 차 제대로 대고 와.'],
  };
  const M7 = {
    id: 6, key: 'bridge', title: '강 건너 휴게소 길', place: '왕복 2차로 교외 도로 · 다리 · 공사 구간',
    goal: '"잠깐은 되지만 세워 두면 안 되는" 다리 위·공사 구간을 가려내세요.',
    timeLimit: 240, clock: '12:20', situation: bridgeSit, story: storyFrom(bridgeSit),
    world: { w: 120, h: 40 },
    start: { x: 116, y: 17.6, heading: PI },
    destination: { x: 20, y: 12, label: '휴게소 식당', radius: 24 },
    buildings: [
      { x: 0, y: 0, w: 40, h: 12, label: '휴게소 식당 (약속장소)', dest: true },
      { x: 40, y: 0, w: 40, h: 14, label: '강', water: true },
      { x: 40, y: 26, w: 40, h: 14, label: '', water: true },
      { x: 80, y: 0, w: 40, h: 12, label: '농가' },
      { x: 92, y: 12, w: 12, h: 4.5, label: '공사 중', barrier: true },
      { x: 0, y: 28, w: 4, h: 12, label: '' },
      { x: 34, y: 28, w: 6, h: 12, label: '' },
      { x: 4, y: 38, w: 30, h: 2, label: '' },
      { x: 80, y: 28, w: 40, h: 12, label: '밭' },
    ],
    roads: [{ x: 0, y: 14, w: 120, h: 12 }, { x: 28, y: 26, w: 4, h: 2 }],
    lots: [{ x: 4, y: 28, w: 30, h: 10, label: '휴게소 공영주차장' }],
    sidewalks: [{ x: 0, y: 12, w: 40, h: 2 }, { x: 80, y: 12, w: 12, h: 2 }, { x: 104, y: 12, w: 16, h: 2 },
      { x: 0, y: 26, w: 28, h: 2 }, { x: 32, y: 26, w: 8, h: 2 }, { x: 80, y: 26, w: 40, h: 2 }],
    lines: [{ x1: 0, y1: 20, x2: 120, y2: 20, type: 'yellowDouble' }],
    crosswalks: [],
    zones: [
      { type: 'white_edge', x: 0, y: 14, w: 40, h: 2.5, curb: 'top', dir: PI },
      { type: 'bridge', x: 40, y: 14, w: 40, h: 2.5, curb: 'top', dir: PI, label: '다리 위 가장자리' },
      { type: 'white_edge', x: 80, y: 14, w: 7, h: 2.5, curb: 'top', dir: PI },
      { type: 'construction', x: 87, y: 14, w: 5, h: 2.5, curb: 'top', dir: PI, label: '공사구역 앞 5m' },
      { type: 'construction', x: 104, y: 14, w: 5, h: 2.5, curb: 'top', dir: PI, label: '공사구역 뒤 5m' },
      { type: 'white_edge', x: 109, y: 14, w: 11, h: 2.5, curb: 'top', dir: PI },
      { type: 'white_edge', x: 0, y: 23.5, w: 40, h: 2.5, curb: 'bottom', dir: 0 },
      { type: 'bridge', x: 40, y: 23.5, w: 40, h: 2.5, curb: 'bottom', dir: 0, label: '다리 위 가장자리' },
      { type: 'yellow_solid', x: 80, y: 23.5, w: 40, h: 2.5, curb: 'bottom', dir: 0 },
    ],
    slots: slotRow('P', 5, 32.8, 9, 2.5, 5, 'lot', { seed: 2, empty: [4] }),
    parked: [2.85, 8.05, 13.25, 18.45, 23.65, 28.85, 34.05].map((x, i) => car(x, 15.25, PI, i + 1)),
    props: [{ type: 'sign', x: 30, y: 29.2, label: 'P 공영주차장 →' }],
    candidates: [
      { x: 60, y: 15.25, heading: PI, expect: 'bridge', answer: 'stop' },
      { x: 89.5, y: 15.25, heading: PI, expect: 'construction', answer: 'stop' },
      { x: 83.5, y: 15.25, heading: PI, expect: 'white_edge', answer: 'park' },
      { x: 20, y: 24.75, heading: PI, expect: 'wrong_way', answer: 'no' },
      { x: 16.25, y: 35.3, heading: PI / 2, expect: 'slot', answer: 'park' },
    ],
    samples: [],
  };

  // ── 전통시장 앞 ── (시간제 주정차 허용 구간, 하역구역)
  const marketSit = {
    title: '점심 장보기', text: '낮 12시 10분, 엄마와 전통시장에 왔어요. 시장 앞 노란 실선에 "11:00~14:00 주정차 허용" 표지판이 있어요. 30분이면 될 것 같아요.',
    who: '엄마', stay: 30, extra: 150,
    event: ['어머, 저기 떡집도 들르자.', '구경하다 보면 두 시간 반은 걸리겠다.'],
  };
  const M8 = {
    id: 6, key: 'market', title: '전통시장 앞', place: '왕복 2차로 · 시간제 주정차 허용 구간',
    goal: '같은 자리라도 시간이 지나면 위반이 됩니다. 머무는 시간까지 생각해서 고르세요.',
    timeLimit: 220, clock: '12:10', situation: marketSit, story: storyFrom(marketSit),
    world: { w: 110, h: 40 },
    start: { x: 106, y: 18.25, heading: PI },
    destination: { x: 55, y: 12, label: '시장 정문', radius: 24 },
    buildings: [
      { x: 0, y: 0, w: 40, h: 12, label: '상가' },
      { x: 40, y: 0, w: 30, h: 12, label: '○○전통시장 정문', dest: true },
      { x: 70, y: 0, w: 40, h: 12, label: '상가' },
      { x: 0, y: 28, w: 20, h: 12, label: '주택' },
      { x: 60, y: 28, w: 50, h: 12, label: '주택' },
      { x: 20, y: 38, w: 40, h: 2, label: '' },
    ],
    roads: [{ x: 0, y: 14, w: 110, h: 12 }, { x: 55, y: 26, w: 5, h: 2 }],
    lots: [{ x: 20, y: 28, w: 40, h: 10, label: '시장 공영주차장(유료)' }],
    sidewalks: [{ x: 0, y: 12, w: 110, h: 2 }, { x: 0, y: 26, w: 55, h: 2 }, { x: 60, y: 26, w: 50, h: 2 }],
    lines: [
      { x1: 0, y1: 20, x2: 88, y2: 20, type: 'yellowDouble' },
      { x1: 94, y1: 20, x2: 110, y2: 20, type: 'yellowDouble' },
    ],
    crosswalks: [{ x: 88, y: 14, w: 6, h: 12 }],
    zones: [
      { type: 'yellow_solid', x: 0, y: 14, w: 20, h: 2.5, curb: 'top', dir: PI },
      { type: 'flex_zone', x: 20, y: 14, w: 45, h: 2.5, curb: 'top', dir: PI, hours: [660, 840], label: '11:00~14:00 주정차 허용' },
      { type: 'loading_zone', x: 65, y: 14, w: 13, h: 2.5, curb: 'top', dir: PI, label: '화물차 하역구역', paint: '하역' },
      { type: 'yellow_solid', x: 78, y: 14, w: 10, h: 2.5, curb: 'top', dir: PI },
      { type: 'hydrant', cx: 80, cy: 12.8, r: 5 },
      { type: 'crosswalk_near', x: 78, y: 14, w: 10, h: 2.5 },
      { type: 'crosswalk', x: 88, y: 14, w: 6, h: 12 },
      { type: 'crosswalk_near', x: 94, y: 14, w: 10, h: 2.5 },
      { type: 'yellow_solid', x: 104, y: 14, w: 6, h: 2.5, curb: 'top', dir: PI },
      { type: 'yellow_solid', x: 0, y: 23.5, w: 110, h: 2.5, curb: 'bottom', dir: 0 },
      { type: 'crosswalk_near', x: 78, y: 23.5, w: 10, h: 2.5 },
      { type: 'crosswalk_near', x: 94, y: 23.5, w: 10, h: 2.5 },
    ],
    slots: slotRow('P', 21, 32.8, 15, 2.5, 5, 'lot', { seed: 4, empty: [7] }),
    parked: [24, 29.5, 52, 57.5].map((x, i) => car(x, 15.25, PI, i + 2)),
    props: [
      { type: 'sign', x: 42, y: 12.9, label: '보조표지: 11:00~14:00 주정차 허용' },
      { type: 'hydrant', x: 80, y: 12.8, label: '지상식 소화전' },
      { type: 'reporter', x: 71, y: 12.9, label: '하역 기다리는 화물차 기사님', phone: true },
      { type: 'cctv', x: 60, y: 12.9, r: 28, label: '시장 앞 단속 CCTV' },
    ],
    candidates: [
      { x: 41, y: 15.25, heading: PI, expect: 'flex_zone', answer: 'park' },
      { x: 71.5, y: 15.25, heading: PI, expect: 'loading_zone', answer: 'no' },
      { x: 81, y: 15.25, heading: PI, expect: 'hydrant', answer: 'no' },
      { x: 99, y: 15.25, heading: PI, expect: 'crosswalk_near', answer: 'no' },
      { x: 39.75, y: 35.3, heading: PI / 2, expect: 'slot', answer: 'park' },
    ],
    samples: [
      { name: '허용 구간에 12:10부터 30분', x: 41, y: 15.25, heading: PI, mode: 'park', minutes: 30, clockMin: 730, expect: 'flex_zone', legal: true },
      { name: '허용 구간에 12:10부터 150분(14:40까지)', x: 41, y: 15.25, heading: PI, mode: 'park', minutes: 150, clockMin: 730, expect: 'flex_zone', legal: false },
    ],
  };

  // ── 지하철역 앞 ── (버스전용차로·택시 승차대·승하차 구역)
  const stationSit = {
    title: '퇴근길 마중', text: '저녁 6시 30분, 지하철역 2번 출구에서 가족을 태우기로 했어요. 10분 일찍 도착했어요.',
    who: '가족', stay: 10, extra: 40,
    event: ['지하철이 고장으로 멈췄대.', '30분은 더 걸릴 것 같아. 어디 세워 두고 기다려.'],
  };
  const M9 = {
    id: 7, key: 'station', title: '지하철역 앞', place: '도심 왕복 4차로 · 버스전용차로',
    goal: '사람을 태우는 곳이 많아 보여도 다 같은 자리가 아니에요. 승하차 구역과 나머지를 구분하세요.',
    timeLimit: 220, clock: '18:30', situation: stationSit, story: storyFrom(stationSit),
    world: { w: 120, h: 44 },
    start: { x: 116, y: 18.9, heading: PI },
    destination: { x: 60, y: 12, label: '역 2번 출구', radius: 26 },
    buildings: [
      { x: 0, y: 0, w: 48, h: 12, label: '오피스' },
      { x: 48, y: 0, w: 24, h: 12, label: '○○역 2번 출구', dest: true },
      { x: 72, y: 0, w: 48, h: 12, label: '상가' },
      { x: 0, y: 32, w: 120, h: 12, label: '빌딩' },
    ],
    roads: [{ x: 0, y: 14, w: 120, h: 16 }],
    lots: [],
    sidewalks: [{ x: 0, y: 12, w: 120, h: 2 }, { x: 0, y: 30, w: 120, h: 2 }],
    lines: [
      { x1: 0, y1: 21.25, x2: 120, y2: 21.25, type: 'yellowDouble' },
      { x1: 0, y1: 26, x2: 120, y2: 26, type: 'blueSolid' },
    ],
    crosswalks: [],
    zones: [
      { type: 'yellow_solid', x: 0, y: 14, w: 30, h: 2.5, curb: 'top', dir: PI },
      { type: 'taxi_stand', x: 30, y: 14, w: 18, h: 2.5, curb: 'top', dir: PI, label: '택시 승차대', paint: '택시' },
      { type: 'dropoff', x: 48, y: 14, w: 16, h: 2.5, curb: 'top', dir: PI, label: '역 앞 승하차 구역', paint: '승하차' },
      { type: 'bus_stop', x: 64, y: 14, w: 20, h: 2.5, curb: 'top', dir: PI },
      { type: 'yellow_solid', x: 84, y: 14, w: 6, h: 2.5, curb: 'top', dir: PI },
      { type: 'bus_lane', x: 0, y: 26, w: 120, h: 4, dir: 0, label: '가로변 버스전용차로', paint: '버스전용' },
    ],
    slots: slotRow('S', 90, 14.1, 5, 6, 2.0, 'street', { seed: 6, empty: [2], dir: PI }).map(s => ({ ...s, type: 'paid' })),
    parked: [],
    props: [
      { type: 'busstop', x: 74, y: 13.1, label: '역 앞 정류장' },
      { type: 'reporter', x: 39, y: 13, label: '줄 서 있는 택시 기사님', phone: true },
      { type: 'cctv', x: 60, y: 31, r: 30, label: '버스전용차로 단속 카메라' },
      { type: 'sign', x: 105, y: 12.9, label: '노상 공영주차장(유료)' },
    ],
    candidates: [
      { x: 39, y: 15.25, heading: PI, expect: 'taxi_stand', answer: 'no' },
      { x: 56, y: 15.25, heading: PI, expect: 'dropoff', answer: 'stop' },
      { x: 74, y: 15.25, heading: PI, expect: 'bus_stop', answer: 'no' },
      { x: 60, y: 28, heading: 0, expect: 'bus_lane', answer: 'no' },
      { x: 105, y: 15.1, heading: PI, expect: 'street_slot', answer: 'park' },
    ],
    samples: [],
  };

  // ── 고속도로 졸음쉼터 ── (갓길·비상주차대)
  const hwySit = {
    title: '고속도로에서 졸릴 때', text: '고속도로를 달리는데 너무 졸려요. 20분만 눈을 붙이고 싶어요. 바로 앞에 갓길, 비상주차대, 졸음쉼터가 있어요.',
    who: '가족', stay: 20, extra: 60,
    event: ['졸리면 무리하지 마.', '한 시간은 푹 쉬고 출발해.'],
  };
  const M10 = {
    id: 9, key: 'highway', title: '고속도로 졸음쉼터', place: '편도 2차로 고속도로 · 갓길 · 졸음쉼터',
    goal: '고속도로에서는 정해진 곳 말고는 서면 안 됩니다. 쉬어도 되는 곳을 찾으세요.',
    timeLimit: 200, clock: '15:05', situation: hwySit, story: storyFrom(hwySit),
    world: { w: 130, h: 38 },
    start: { x: 4, y: 15.6, heading: 0 },
    destination: { x: 78, y: 33, label: '졸음쉼터', radius: 32 },
    buildings: [
      { x: 0, y: 0, w: 130, h: 10, label: '중앙분리대 너머 반대 방향 차로' },
      { x: 0, y: 24, w: 20, h: 14, label: '산' },
      { x: 20, y: 24, w: 15, h: 14, label: '' },
      { x: 35, y: 21, w: 15, h: 17, label: '산' },
      { x: 105, y: 21, w: 25, h: 17, label: '산' },
      { x: 50, y: 33, w: 55, h: 5, label: '졸음쉼터 화장실 · 그늘막', dest: true },
    ],
    roads: [{ x: 0, y: 10, w: 130, h: 11 }, { x: 20, y: 21, w: 15, h: 3 }],
    lots: [{ x: 50, y: 21, w: 55, h: 12, label: '' }],
    sidewalks: [],
    lines: [
      { x1: 0, y1: 13.75, x2: 130, y2: 13.75, type: 'whiteDashed' },
      { x1: 0, y1: 17.5, x2: 50, y2: 17.5, type: 'whiteSolid' },
      { x1: 105, y1: 17.5, x2: 130, y2: 17.5, type: 'whiteSolid' },
    ],
    crosswalks: [],
    zones: [
      { type: 'shoulder', x: 0, y: 17.5, w: 20, h: 3.5, label: '갓길' },
      { type: 'emergency_bay', x: 20, y: 17.5, w: 15, h: 6.5, label: '비상주차대', paint: '비상주차대' },
      { type: 'shoulder', x: 35, y: 17.5, w: 15, h: 3.5, label: '갓길' },
      { type: 'shoulder', x: 105, y: 17.5, w: 25, h: 3.5, label: '갓길' },
    ],
    slots: slotRow('Z', 52, 27.5, 20, 2.5, 5, 'lot', { seed: 5, empty: [3, 12] }),
    parked: [],
    props: [
      { type: 'sign', x: 42, y: 22.5, label: '졸음쉼터 →' },
      { type: 'cctv', x: 12, y: 22.5, r: 25, label: '고속도로 갓길 단속 카메라' },
    ],
    candidates: [
      { x: 10, y: 19.25, heading: 0, expect: 'shoulder', answer: 'no' },
      { x: 27.5, y: 22, heading: 0, expect: 'emergency_bay', answer: 'no' },
      { x: 75, y: 24, heading: 0, expect: 'lot_aisle', answer: 'stop' },
      { x: 60.75, y: 30, heading: PI / 2, expect: 'slot', answer: 'park' },
    ],
    samples: [],
  };

  // 레벨 번호: 쉬운 곳 → 어려운 곳
  M3.id = 5; M7.id = 8; M4.id = 10;

  // 1단계 레벨은 보너스(직접 운전 전용)로 유지
  Object.assign(L1, { id: 11, key: 'cafe', bonus: true });
  Object.assign(L2, { id: 12, key: 'academy', bonus: true });
  Object.assign(L3, { id: 13, key: 'alley', bonus: true });

  const LEVELS = [M1, M2, M5, M6, M3, M8, M9, M7, M10, M4, L1, L2, L3];
  if (typeof module !== 'undefined' && module.exports) module.exports = { LEVELS };
  else root.LEVELS = LEVELS;
})(typeof window !== 'undefined' ? window : globalThis);
