// node parking-game/test-judge.js — levels.js의 samples를 판정 로직에 돌려 기대값과 비교합니다.
const { LEVELS } = require('./levels.js');
const J = require('./judge.js');
let pass = 0, fail = 0;
const { RULES } = require('./rules.js');
for (const lv of LEVELS) {
  (lv.candidates || []).forEach((c, i) => {
    const j = J.judgePose(lv, c, 'stop', { minutes: 3 });
    const ok = j.key === c.expect && RULES[j.key].answer === c.answer;
    ok ? pass++ : fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  L${lv.id} 후보 ${i + 1}: ${j.key} → ${RULES[j.key].answer}` +
      (ok ? '' : `  (기대: ${c.expect} ${c.answer}; 걸친 구역 ${j.hitKeys.join(',')})`));
  });
  for (const s of lv.samples) {
    const j = J.judgePose(lv, s, s.mode, { minutes: s.minutes, state: { afterCall: !!s.afterCall } });
    const ok = j.key === s.expect && j.legal === s.legal;
    ok ? pass++ : fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  L${lv.id} ${s.name}: ${j.key} ${j.legal ? '합법' : '불법'}` +
      (ok ? '' : `  (기대: ${s.expect} ${s.legal ? '합법' : '불법'}; 걸친 구역 ${j.hitKeys.join(',')})`));
  }
}
// 위험 계산 sanity
const lv = LEVELS.find(l => l.id === 5);
const hyd = J.judgePose(lv, { x: 37, y: 17.3, heading: Math.PI }, 'park', { minutes: 60 });
const risk = J.assessRisk(lv, { x: 37, y: 17.3 }, hyd, { minutes: 60, driverPresent: false });
console.log('소화전 60분 주차 위험:', JSON.stringify(risk));
if (!(risk.fine === 80000 && risk.towProb > 0.5)) { fail++; console.log('FAIL risk'); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
