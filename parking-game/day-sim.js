/*
 * day-sim.js — '주차 한 판'의 화면과 무관한 계산
 *   · 단속원 순찰 위치, 주민 시야
 *   · 볼일 보는 동안(1분 단위) 누가 언제 봤는지 시뮬레이션 → 단속·신고·CCTV·견인 결정
 *   · 정산 줄, 자석 주차 목표, 충돌 판정
 * 브라우저(window.DaySim)와 Node(require) 공용.
 */
(function (root) {
  const J = (typeof module !== 'undefined' && module.exports) ? require('./judge.js') : root.Judge;
  const PI = Math.PI, CAR = J.CAR;
  const MONEY = { START: 50000, ON_TIME: 10000, LATE: 5000, CRASH: 10000, STICKER: 5000, NOTICE: 15000, TOW: 40000, SKILL: 3000 };
  const SEE_R = 16, SEE_HALF = 35 * PI / 180, ENC_R = 7, SNAP_R = 3.5, SNAP_ANG = 1.05;

  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // 단속원: 순찰길 두 점 사이를 loop분마다 한 번 왕복
  function encAt(place, phase, t) {
    const [a, b] = place.patrol, u = (((t + phase) / place.loop) % 1 + 1) % 1, f = u < 0.5 ? u * 2 : 2 - u * 2;
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f };
  }
  // 단속원 여러 명(3일차): 같은 길을 위상을 나눠 순찰
  function guardsAt(place, phase, t) {
    const n = place.guards || 1;
    return Array.from({ length: n }, (_, g) => encAt(place, phase + g * place.loop / n, t));
  }
  const watchAng = (w, t) => w.base + 0.95 * Math.sin(2 * PI * t / w.sp + w.ph);
  const sees = (w, t, p) => dist(w, p) <= SEE_R && Math.abs(wrap(Math.atan2(p.y - w.y, p.x - w.x) - watchAng(w, t))) <= SEE_HALF;

  // 언제부터 위반인가(분): 시간제 칸은 허용 시간이 끝난 뒤, 정차만 되는 곳은 5분 뒤, 나머지는 바로
  function illegalFrom(lv, pose, j, t0) {
    if (j.legal) return 0;
    const flex = j.key === 'flex_zone' && lv.zones.find(z => z.hours && J.inZone(z, pose));
    if (flex) return Math.max(0, flex.hours[1] - t0);
    return j.rule.stop ? 5 : 0;
  }

  function simulateStay({ lv, place, phase, watchers, pose, judgement: j, t0, stay }) {
    const r = j.rule, bad = !j.legal, manner = j.legal && j.answer === 'manner';
    const from = illegalFrom(lv, pose, j, t0);
    const cams = (lv.props || []).filter(p => p.type === 'cctv' && dist(p, pose) <= p.r);
    const ev = [], seen = [];
    let ticket = null, report = null, cctv = null, spotted = null;
    for (let m = 0; m < stay; m += 0.5) {
      const t = t0 + m, now = bad && m >= from;
      if ((now || manner) && ticket == null && guardsAt(place, phase, t).some(e => dist(e, pose) <= ENC_R)) { ticket = m; ev.push({ m, k: 'enc' }); }
      watchers.forEach((w, wi) => {
        if (!sees(w, t, pose)) return;
        if (seen[seen.length - 1] !== m) seen.push(m);
        if (spotted == null && (manner || now)) { spotted = m; ev.push({ m, k: 'look', wi }); }
      });
      const firstSeen = seen.find(x => x >= from);
      if (now && r.report && report == null && firstSeen != null && m - firstSeen >= 1 && seen[seen.length - 1] === m) { report = m; ev.push({ m, k: 'photo' }); }
      if (now && r.fine && cams.length && cctv == null && m - from >= r.cctvGrace) { cctv = m; ev.push({ m, k: 'cctv' }); }
    }
    const caught = bad && (ticket != null || report != null || cctv != null);
    const fined = caught && r.fine > 0;
    const notice = bad && !r.fine && (ticket != null || spotted != null);
    const firstCatch = Math.min(...[ticket, report, cctv].filter(x => x != null), Infinity);
    const tow = caught && r.tow >= 0.5 && stay >= 30 && firstCatch + 10 <= stay ? firstCatch + 10 : null;
    if (tow != null) ev.push({ m: tow, k: 'tow' });
    const sticker = manner && (ticket != null || spotted != null);
    ev.sort((a, b) => a.m - b.m);
    return { ev, res: { bad, manner, ticket, report, cctv, fined, notice, tow, sticker, spotted, from } };
  }

  // 정산 줄: [설명, 금액(원)]
  function settleLines(res, j, { late, guard, skill }) {
    const r = j.rule, L = [];
    L.push(late ? ['약속에 늦음 (커피 사기)', -MONEY.LATE] : ['약속 시간 지킴 보너스', MONEY.ON_TIME]);
    if (skill) L.push(['자석 없이 반듯하게 넣음 — 실력 보너스', MONEY.SKILL]);
    if (res.fined) L.push([`과태료 — ${res.report != null ? '주민이 1분 간격으로 두 번 찍어 신고' : res.cctv != null ? 'CCTV에 찍힘' : guard + '이 딱지'}`, -r.fine]);
    if (res.notice) L.push([res.ticket != null ? `${guard} 경고 스티커 + 이동 호출` : '주민이 관리실에 연락', -MONEY.NOTICE]);
    if (res.tow != null) L.push(['견인료 + 보관료', -MONEY.TOW]);
    if (res.sticker) L.push(['앞유리에 항의 쪽지 (세차)', -MONEY.STICKER]);
    if (res.bad && res.from > 0) L.push([`${Math.round(res.from)}분까지는 괜찮았지만 그 뒤로는 위반`, 0]);
    if (res.bad && !res.fined && !res.notice) L.push(['아무도 못 봤어요 — 운이 좋았네요', 0]);
    if (res.manner && !res.sticker) L.push(['눈총은 받았지만 무사', 0]);
    return L;
  }

  // ─── 충돌 ───
  function overlap(a, b) {
    for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], nx = q.y - p.y, ny = p.x - q.x;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const v of a) { const k = v.x * nx + v.y * ny; a0 = Math.min(a0, k); a1 = Math.max(a1, k); }
      for (const v of b) { const k = v.x * nx + v.y * ny; b0 = Math.min(b0, k); b1 = Math.max(b1, k); }
      if (a1 < b0 || b1 < a0) return false;
    }
    return true;
  }
  const rectPoly = r => [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }];
  function hitTest(lv, parked, pose) {
    const poly = J.carCorners(pose);
    if (poly.some(p => p.x < 0 || p.y < 0 || p.x > lv.world.w || p.y > lv.world.h)) return 'edge';
    for (const b of lv.buildings) if (overlap(poly, rectPoly(b))) return 'wall';
    for (const c of parked) if (overlap(poly, J.carCorners(c))) return 'car';
    return null;
  }

  // ─── 자석 주차: 근처 빈칸·후보 자리·가장자리에 맞춤 ───
  const angGap = (a, b) => Math.abs(wrap(a - b));
  const nearHeading = (h, a) => (angGap(h, a) <= angGap(h, a + PI) ? a : a + PI);
  function snapTarget(lv, parked, car) {
    const out = [];
    (lv.slots || []).forEach(s => {
      if (J.slotOccupied(s, {})) return;
      out.push({ x: s.x + s.w / 2, y: s.y + s.h / 2, heading: nearHeading(car.heading, s.h > s.w ? PI / 2 : (s.dir ?? 0)) });
    });
    (lv.candidates || []).forEach(k => out.push({ x: k.x, y: k.y, heading: nearHeading(car.heading, k.heading) }));
    lv.zones.filter(z => z.curb).forEach(z => {
      const horiz = z.curb === 'top' || z.curb === 'bottom', half = CAR.length / 2 + 0.2;
      if (horiz && z.w > CAR.length + 0.4) out.push({ x: clamp(car.x, z.x + half, z.x + z.w - half), y: z.y + z.h / 2, heading: nearHeading(car.heading, 0) });
      if (!horiz && z.h > CAR.length + 0.4) out.push({ x: z.x + z.w / 2, y: clamp(car.y, z.y + half, z.y + z.h - half), heading: nearHeading(car.heading, PI / 2) });
    });
    let best = null, bd = SNAP_R;
    out.forEach(t => {
      const d = Math.hypot(t.x - car.x, t.y - car.y);
      if (d < bd && angGap(t.heading, car.heading) <= SNAP_ANG && !hitTest(lv, parked, t)) { best = t; bd = d; }
    });
    return best;
  }

  const api = { MONEY, SEE_R, SEE_HALF, ENC_R, encAt, guardsAt, watchAng, sees, illegalFrom, simulateStay, settleLines, overlap, hitTest, snapTarget };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DaySim = api;
})(typeof window !== 'undefined' ? window : globalThis);
