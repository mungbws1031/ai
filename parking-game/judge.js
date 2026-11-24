/*
 * judge.js — 차량 위치 → 정차·주차 합법/불법 판정 + 단속 위험 계산
 * 브라우저(window)와 Node(require) 양쪽에서 동작합니다. 화면 코드에 의존하지 않습니다.
 */
(function (root) {
  const R = (typeof module !== 'undefined' && module.exports) ? require('./rules.js') : root;
  const { RULES, STOP_LIMIT_MIN } = R;

  const CAR = { length: 4.7, width: 1.85, wheelbase: 2.8 }; // 중형 세단 기준(m)
  const SLOT_TOL = 0.35; // 구획선 판정 여유(m) — 바퀴가 선을 살짝 밟는 정도는 허용

  // ---------- 기하 ----------
  function inRect(r, p, tol = 0) {
    return p.x >= r.x - tol && p.x <= r.x + r.w + tol && p.y >= r.y - tol && p.y <= r.y + r.h + tol;
  }
  function inZone(z, p) {
    if (z.r != null) return (p.x - z.cx) ** 2 + (p.y - z.cy) ** 2 <= z.r * z.r;
    return inRect(z, p);
  }
  function angDiff(a, b) {
    let d = Math.abs(a - b) % (2 * Math.PI);
    return d > Math.PI ? 2 * Math.PI - d : d;
  }
  function carCorners(pose, dims = CAR) {
    const fx = Math.cos(pose.heading), fy = Math.sin(pose.heading);
    const rx = -fy, ry = fx; // 화면 좌표(y 아래)에서 진행 방향의 오른쪽
    const hl = dims.length / 2, hw = dims.width / 2;
    return [
      { x: pose.x + fx * hl + rx * hw, y: pose.y + fy * hl + ry * hw }, // 앞-오른쪽
      { x: pose.x + fx * hl - rx * hw, y: pose.y + fy * hl - ry * hw }, // 앞-왼쪽
      { x: pose.x - fx * hl - rx * hw, y: pose.y - fy * hl - ry * hw }, // 뒤-왼쪽
      { x: pose.x - fx * hl + rx * hw, y: pose.y - fy * hl + ry * hw }, // 뒤-오른쪽
    ];
  }
  // 네 모서리 + 네 변의 중점 + 중심 = 9점으로 차체가 걸친 구역을 찾습니다.
  function samplePoints(pose, dims = CAR) {
    const c = carCorners(pose, dims);
    const mids = c.map((p, i) => { const q = c[(i + 1) % 4]; return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }; });
    return [...c, ...mids, { x: pose.x, y: pose.y }];
  }

  // ---------- 레벨 상태 ----------
  function slotOccupied(slot, state = {}) {
    if (!slot.occupied) return false;
    return !(slot.freesOnCall && state.afterCall);
  }
  function slotRuleKey(slot) {
    if (slot.disabled || slot.type === 'disabled') return 'disabled';
    if (slot.type === 'ev') return 'ev_charge';
    if (slot.type === 'compact') return 'compact_slot';
    if (slot.type === 'pregnant') return 'pregnant_slot';
    if (slot.type === 'women') return 'women_slot';
    if (slot.type === 'resident') return 'resident_slot';
    return slot.kind === 'street' ? 'street_slot' : 'slot';
  }

  // 한 점에 걸친 모든 규칙 후보
  function hitsAt(level, p, state = {}) {
    const hits = [];
    for (const z of level.zones) if (inZone(z, p)) hits.push({ key: z.type, zone: z });
    for (const s of level.slots || []) {
      if (!slotOccupied(s, state) && inRect(s, p, SLOT_TOL)) hits.push({ key: slotRuleKey(s), slot: s, zone: s });
    }
    for (const sw of level.sidewalks) if (inRect(sw, p)) hits.push({ key: 'sidewalk', zone: sw });
    if (!hits.length) {
      if ((level.lots || []).some(l => inRect(l, p))) hits.push({ key: 'lot_aisle' });
      else hits.push({ key: 'lane' });
    }
    return hits;
  }
  function worst(hits) {
    return hits.reduce((a, b) => (RULES[b.key].severity > RULES[a.key].severity ? b : a));
  }

  /**
   * 위치 판정
   * @param level   레벨 데이터
   * @param pose    {x, y, heading(rad)}
   * @param mode    'stop'(정차 의도) | 'park'(주차 의도: 운전자가 차를 떠남)
   * @param opts    {minutes: 정지 시간(게임 분), state: {afterCall}}
   */
  function judgePose(level, pose, mode, opts = {}) {
    const minutes = opts.minutes ?? (mode === 'stop' ? 3 : 60);
    const state = opts.state || {};
    const pts = samplePoints(pose);
    const perPoint = pts.map(p => hitsAt(level, p, state));
    let top = worst(perPoint.map(worst));
    let key = top.key;
    const reasons = [];
    const hitKeys = [...new Set(perPoint.flat().map(h => h.key))]
      .sort((a, b) => RULES[b].severity - RULES[a].severity);

    // 구획 안에 완전히 들어갔는지
    let inSlot = null, align = null;
    if (RULES[key].severity <= 2 && perPoint.every(hs => hs.some(h => h.slot))) {
      const slot = perPoint[8].find(h => h.slot)?.slot;
      if (!slot || !perPoint.every(hs => hs.some(h => h.slot === slot))) {
        key = 'straddle';
        reasons.push('구획선을 밟고 두 칸에 걸쳤습니다.');
      } else {
        inSlot = slot;
        const along = slot.w > slot.h ? 0 : Math.PI / 2;
        const deg = Math.min(angDiff(pose.heading, along), angDiff(pose.heading, along + Math.PI)) * 180 / Math.PI;
        const off = Math.hypot(pose.x - (slot.x + slot.w / 2), pose.y - (slot.y + slot.h / 2));
        align = { deg: +deg.toFixed(1), offset: +off.toFixed(2), score: Math.max(0, Math.round(100 - deg * 4 - off * 40)) };
        if (deg > 15) reasons.push(`구획 안이지만 ${deg.toFixed(0)}° 비뚤어졌습니다.`);
      }
    }

    // 진행 방향 반대(역방향) 정차 검사 — 가장자리 구역에는 dir(통행 방향)이 있습니다.
    const dirZone = perPoint[8].map(h => h.zone).find(z => z && z.dir != null);
    const wrongWay = !!dirZone && angDiff(pose.heading, dirZone.dir) > Math.PI / 2;
    if (wrongWay) {
      const r = RULES[key];
      if (r.stop || r.park) key = 'wrong_way';
      reasons.push('진행 방향 반대쪽 가장자리에 거꾸로 서 있습니다.');
    }

    const rule = RULES[key];
    let effective = mode === 'stop' ? '정차' : '주차';
    if (mode === 'stop' && minutes > STOP_LIMIT_MIN) {
      effective = '주차';
      reasons.push(`${STOP_LIMIT_MIN}분을 넘겨 법적으로는 '주차'가 됩니다(제2조 제24·25호).`);
    }
    const legal = effective === '정차' ? (rule.stop || rule.park) : rule.park;
    if (!legal && effective === '주차' && rule.stop) reasons.push(`${rule.short}: 정차는 되지만 주차는 안 됩니다.`);
    if (hitKeys.length > 1 && RULES[hitKeys[0]].severity > 0) {
      reasons.push(`차체가 걸친 구역: ${hitKeys.map(k => RULES[k].short).join(', ')} → 가장 엄격한 '${RULES[key].short}' 기준 적용`);
    }
    return { key, rule, answer: rule.answer, legal, mode, effective, minutes, inSlot, align, wrongWay, hitKeys, reasons };
  }

  // ---------- 단속 위험 ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function assessRisk(level, pose, j, ctx = {}) {
    const minutes = ctx.minutes ?? j.minutes;
    const driverPresent = ctx.driverPresent ?? (j.mode === 'stop');
    const props = level.props || [];
    const reporters = props.filter(p => p.type === 'reporter' && dist(p, pose) <= 30);
    const cctv = props.find(p => p.type === 'cctv' && dist(p, pose) <= p.r);
    const r = j.rule;
    if (j.legal) {
      return { minutes, reporters: reporters.length, cctv: !!cctv, reportProb: 0, cctvProb: 0, patrolProb: 0,
        fineProb: 0, fine: 0, expectedFine: 0, towProb: 0, penalty: 0 };
    }
    const reportProb = r.report
      ? (minutes >= 1 ? clamp(0.2 + 0.25 * reporters.length + Math.min(minutes, 60) / 60 * 0.35, 0, 0.95)
                      : 0.03 + 0.05 * reporters.length)
      : 0;
    const cctvProb = cctv ? (minutes >= r.cctvGrace ? 0.9 : 0.1) : 0;
    const patrolProb = r.fine > 0 ? clamp(minutes / 120 * 0.5, 0, 0.5) : 0;
    const fineProb = 1 - (1 - reportProb) * (1 - cctvProb) * (1 - patrolProb);
    const fine = r.fine + (minutes > 120 && r.fine === 40000 ? 10000 : 0);
    const towProb = driverPresent ? 0
      : clamp(r.tow * Math.min(1, minutes / 60) * (cctv || reporters.length ? 1 : 0.7), 0, 0.95);
    return {
      minutes, reporters: reporters.length, cctv: !!cctv,
      reportProb, cctvProb, patrolProb, fineProb, fine,
      expectedFine: Math.round(fine * fineProb), towProb, penalty: r.penalty || 0,
    };
  }

  // 확률을 실제 결과로 굴립니다(rng 주입 가능 → 테스트에서 고정).
  function rollOutcome(risk, rng = Math.random) {
    const reported = rng() < risk.reportProb;
    const cctv = rng() < risk.cctvProb;
    const patrol = rng() < risk.patrolProb;
    const fined = reported || cctv || patrol;
    const towed = rng() < risk.towProb;
    return { reported, cctv, patrol, fined, towed,
      cost: (fined ? risk.fine : 0) + (towed ? 40000 : 0) };
  }

  const api = { CAR, SLOT_TOL, carCorners, samplePoints, hitsAt, judgePose, assessRisk, rollOutcome,
    slotOccupied, slotRuleKey, inRect, inZone, angDiff };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Judge = api;
})(typeof window !== 'undefined' ? window : globalThis);
