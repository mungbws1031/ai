// node parking-game/test-day.js — '주차 한 판' 단속 시뮬레이션·자석 주차·장소 설정 테스트
const { LEVELS } = require('./levels.js');
const J = require('./judge.js');
const D = require('./day-sim.js');
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + info}`); };
const lvOf = k => LEVELS.find(l => l.key === k);
const PI = Math.PI;
const far = { patrol: [[0, 0], [1, 0]], loop: 30, guard: '단속 공무원' };
const run = (key, pose, stay, t0, place, watchers = []) => {
  const lv = lvOf(key);
  const judgement = J.judgePose(lv, pose, 'park', { minutes: stay, clockMin: t0 });
  return { judgement, ...D.simulateStay({ lv, place, phase: 0, watchers, pose, judgement, t0, stay }) };
};

// 1. 시간제 칸 12:10부터 30분 → 합법, 아무 일 없음
let r = run('market', { x: 41, y: 15.25, heading: PI }, 30, 730, { ...far, patrol: [[41, 15.25], [41, 15.25]] });
ok('시간제 12:10 30분 → 합법·사건 없음', !r.res.bad && r.ev.length === 0, JSON.stringify(r.res));
// 2. 시간제 칸 13:40부터 30분 → 14:00 이후만 위반
r = run('market', { x: 41, y: 15.25, heading: PI }, 30, 820, { ...far, patrol: [[41, 15.25], [41, 15.25]] });
ok('시간제 13:40 30분 → from 20, 딱지는 20분 이후', r.res.bad && r.res.from === 20 && r.res.ticket >= 20, JSON.stringify(r.res));
// 3. 합법 칸 → 사건 없음
r = run('market', { x: 39.75, y: 35.3, heading: PI / 2 }, 60, 730, { ...far, patrol: [[39.75, 35.3], [39.75, 35.3]] });
ok('합법 주차칸 → 사건 없음', !r.res.bad && r.ev.length === 0, JSON.stringify(r.res));
// 4. 황색 점선 40분, 단속원이 차 옆에 서 있음 → 5분부터 딱지
r = run('hospital', { x: 55, y: 16.25, heading: PI }, 40, 640, { ...far, patrol: [[55, 14], [55, 14]] });
ok('황색 점선 40분 → 5분째 딱지', r.res.ticket === 5 && r.res.fined, JSON.stringify(r.res));
// 5. 보호구역 40분, 주민이 바라봄 → 신고(1분 간격 두 번), 견인은 첫 단속 +10분
r = run('school', { x: 80, y: 16.4, heading: PI }, 40, 940, far, [{ x: 80, y: 22, base: -PI / 2, ph: 0, sp: 6 }]);
const first = Math.min(...[r.res.ticket, r.res.report, r.res.cctv].filter(x => x != null));
ok('보호구역 → 주민 신고 + 견인 = 첫 단속 +10분', r.res.report != null && r.res.tow === first + 10, JSON.stringify(r.res));
// 6. 정산: 과태료 줄의 금액
const lines = D.settleLines(r.res, r.judgement, { late: false, guard: '단속 공무원' });
ok('정산에 과태료 −120,000원', lines.some(([, n]) => n === -120000), JSON.stringify(lines));
ok('정산에 견인 −40,000원', lines.some(([, n]) => n === -D.MONEY.TOW), JSON.stringify(lines));
// 7. 자석 주차: 목표가 주차된 차와 겹치면 제외
const mk = lvOf('market');
const car = { x: 41, y: 17.4, heading: PI };
ok('자석: 빈 가장자리면 맞춰 줌', (D.snapTarget(mk, [], car) || {}).y === 15.25);
ok('자석: 그 자리에 차가 있으면 null', D.snapTarget(mk, [{ x: 41, y: 15.25, heading: PI }], car) === null);

// 8. 3일치 장소 설정
const { DAYS, preparePlace } = require('./day-places.js');
DAYS.forEach(day => day.places.forEach(pl => {
  const lv = lvOf(pl.key);
  ok(`${day.day}일차 ${pl.who}: 지도 있음`, !!lv);
  const inside = ([x, y]) => x >= 0 && y >= 0 && x <= lv.world.w && y <= lv.world.h;
  ok(`${day.day}일차 ${pl.who}: 순찰길·주민 자리가 지도 안`, pl.patrol.every(inside) && pl.watchers.every(inside) && pl.n <= pl.watchers.length);
  let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let allOk = true;
  for (let k = 0; k < 50; k++) {
    const P = preparePlace(LEVELS, pl, day.hard, rand);
    const spots = [
      ...P.lv.slots.filter(sl => !J.slotOccupied(sl, {})).map(sl => ({ x: sl.x + sl.w / 2, y: sl.y + sl.h / 2, heading: sl.h > sl.w ? PI / 2 : (sl.dir ?? 0) })),
      ...(P.lv.candidates || []),
    ];
    const legal = spots.some(sp => !D.hitTest(P.lv, P.parked, sp) && J.judgePose(P.lv, sp, 'park', { minutes: P.stay, clockMin: 600 }).legal);
    if (!legal) { allOk = false; break; }
  }
  ok(`${day.day}일차 ${pl.who}: 무작위 50판 모두 합법 자리 ≥1`, allOk);
}));
ok('3일차는 단속원 2명·시간 80%', DAYS[2].hard.guards === 2 && DAYS[2].hard.limitScale === 0.8);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
