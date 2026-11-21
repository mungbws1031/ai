/* 시험판용: game.js의 렌더러(23~272행)를 그대로 복사. 원본이 바뀌면 다시 생성 */
(function(){ const PI=Math.PI, RULES=window.RULES, J=window.Judge, CAR=J.CAR;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const tint=r=>({park:'ok',stop:'stop',no:'ban',manner:'manner'}[r.answer]||'ban');
const TINT={ok:'rgba(47,190,110,.30)',stop:'rgba(255,194,14,.34)',ban:'rgba(226,59,59,.26)',manner:'rgba(180,140,255,.32)'}, TINT_SOLID={ok:'#3ccf7d',stop:'#ffc20e',ban:'#ff5a5a',manner:'#b48cff'};
  function drawWorld(ctx, lv, cam, o) {
    const { ppm } = cam;
    const dpr = o.dpr || 1;
    const W2S = (x, y) => ({ x: (x - cam.cx) * ppm + cam.w / 2, y: (y - cam.cy) * ppm + cam.h / 2 });
    const world = () => ctx.setTransform(dpr * ppm, 0, 0, dpr * ppm, dpr * (cam.w / 2 - cam.cx * ppm), dpr * (cam.h / 2 - cam.cy * ppm));
    const text = (x, y, str, px, color, font = 'Do Hyeon', align = 'center') => {
      const s = W2S(x, y);
      ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${px}px "${font}", "Noto Sans KR", sans-serif`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
      ctx.fillText(str, s.x, s.y); ctx.restore();
    };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#2b3036'; ctx.fillRect(0, 0, cam.w, cam.h);
    world();
    const rect = (r, c) => { ctx.fillStyle = c; ctx.fillRect(r.x, r.y, r.w, r.h); };

    // 노면
    lv.roads.forEach(r => rect(r, '#41464d'));
    (lv.lots || []).forEach(r => rect(r, '#4a5058'));
    lv.zones.filter(z => z.type === 'school_zone').forEach(z => rect(z, '#8f3a2c'));
    // 보도(보도블록)
    lv.sidewalks.forEach(s => {
      rect(s, '#b8b1a2');
      ctx.strokeStyle = 'rgba(80,70,55,.25)'; ctx.lineWidth = 0.05; ctx.beginPath();
      for (let x = Math.ceil(s.x); x < s.x + s.w; x += 1) { ctx.moveTo(x, s.y); ctx.lineTo(x, s.y + s.h); }
      for (let y = Math.ceil(s.y * 2) / 2; y < s.y + s.h; y += 0.5) { ctx.moveTo(s.x, y); ctx.lineTo(s.x + s.w, y); }
      ctx.stroke();
      ctx.fillStyle = '#d8d3c7';
      ctx.fillRect(s.x, s.y, s.w, 0.15); ctx.fillRect(s.x, s.y + s.h - 0.15, s.w, 0.15);
    });
    // 건물(옥상)
    lv.buildings.forEach(b => {
      if (b.water) {
        rect(b, '#2c5f86');
        ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 0.12; ctx.beginPath();
        for (let y = b.y + 1.5; y < b.y + b.h; y += 2.5) { ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y); }
        ctx.stroke();
      } else if (b.barrier) {
        rect(b, '#f08a24');
        ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.5; ctx.beginPath();
        for (let d = -b.h; d < b.w; d += 1.6) { ctx.moveTo(b.x + d, b.y + b.h); ctx.lineTo(b.x + d + b.h, b.y); }
        ctx.stroke(); ctx.restore();
      } else if (b.dest) {
        rect(b, '#0b5aa8');
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.35; ctx.strokeRect(b.x + 0.7, b.y + 0.7, b.w - 1.4, b.h - 1.4);
      } else {
        rect(b, '#6f7882');
        ctx.fillStyle = '#7b848e'; ctx.fillRect(b.x + 0.6, b.y + 0.6, b.w - 1.2, b.h - 1.2);
      }
    });
    // 학습 모드: 구역 색칠
    if (o.learn) {
      lv.zones.forEach(z => {
        if (z.type === 'school_zone') return;
        const r = RULES[z.type];
        ctx.fillStyle = TINT[tint(r)];
        if (z.r != null) { ctx.beginPath(); ctx.arc(z.cx, z.cy, z.r, 0, 2 * PI); ctx.fill(); }
        else ctx.fillRect(z.x, z.y, z.w, z.h);
      });
    }
    // 횡단보도
    (lv.crosswalks || []).forEach(c => {
      ctx.fillStyle = '#eceee8';
      for (let y = c.y + 0.25; y < c.y + c.h - 0.3; y += 1) ctx.fillRect(c.x, y, c.w, 0.5);
    });
    // 중앙선·차선
    (lv.lines || []).forEach(l => {
      const horiz = l.y1 === l.y2;
      ctx.lineCap = 'butt';
      if (l.type === 'yellowDouble') {
        ctx.strokeStyle = '#f5b800'; ctx.lineWidth = 0.15; ctx.setLineDash([]);
        for (const off of [-0.18, 0.18]) {
          ctx.beginPath();
          if (horiz) { ctx.moveTo(l.x1, l.y1 + off); ctx.lineTo(l.x2, l.y2 + off); }
          else { ctx.moveTo(l.x1 + off, l.y1); ctx.lineTo(l.x2 + off, l.y2); }
          ctx.stroke();
        }
      } else if (l.type === 'whiteSolid' || l.type === 'blueSolid') {
        ctx.strokeStyle = l.type === 'blueSolid' ? '#2f6fe0' : '#eceee8'; ctx.lineWidth = l.type === 'blueSolid' ? 0.3 : 0.15; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
      } else {
        ctx.strokeStyle = '#eceee8'; ctx.lineWidth = 0.15; ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke(); ctx.setLineDash([]);
      }
    });
    // 가장자리 구역선(연석 쪽)
    lv.zones.filter(z => z.curb).forEach(z => {
      const style = { yellow_dashed: ['#f5b800', [0.5, 0.5]], white_edge: ['#eceee8', []] }[z.type] || ['#f5b800', []];
      ctx.strokeStyle = style[0]; ctx.setLineDash(style[1]); ctx.lineWidth = 0.15;
      ctx.beginPath();
      if (z.curb === 'top') { ctx.moveTo(z.x, z.y + 0.2); ctx.lineTo(z.x + z.w, z.y + 0.2); }
      if (z.curb === 'bottom') { ctx.moveTo(z.x, z.y + z.h - 0.2); ctx.lineTo(z.x + z.w, z.y + z.h - 0.2); }
      if (z.curb === 'left') { ctx.moveTo(z.x + 0.2, z.y); ctx.lineTo(z.x + 0.2, z.y + z.h); }
      if (z.curb === 'right') { ctx.moveTo(z.x + z.w - 0.2, z.y); ctx.lineTo(z.x + z.w - 0.2, z.y + z.h); }
      ctx.stroke(); ctx.setLineDash([]);
    });
    // 소화전 적색 연석
    (lv.props || []).filter(p => p.type === 'hydrant').forEach(h => {
      const sw = lv.sidewalks.find(s => J.inRect(s, h));
      if (!sw) return;
      const y = Math.abs(h.y - sw.y) > Math.abs(sw.y + sw.h - h.y) ? sw.y + sw.h : sw.y;
      ctx.fillStyle = '#e0262b'; ctx.fillRect(h.x - 5, y - 0.18, 10, 0.36);
      if (o.learn) { ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 0.08; ctx.setLineDash([0.4, 0.3]); ctx.beginPath(); ctx.arc(h.x, h.y, 5, 0, 2 * PI); ctx.stroke(); ctx.setLineDash([]); }
    });
    // 노면 도색 구역(소방차 전용·구급차 전용·보행통로·이중주차 구간)
    const hatch = (z, color, gap) => {
      ctx.save(); ctx.beginPath(); ctx.rect(z.x, z.y, z.w, z.h); ctx.clip();
      ctx.strokeStyle = color; ctx.lineWidth = 0.18; ctx.beginPath();
      for (let d = -z.h; d < z.w; d += gap) { ctx.moveTo(z.x + d, z.y + z.h); ctx.lineTo(z.x + d + z.h, z.y); }
      ctx.stroke(); ctx.restore();
      ctx.strokeStyle = color; ctx.lineWidth = 0.2; ctx.strokeRect(z.x + 0.1, z.y + 0.1, z.w - 0.2, z.h - 0.2);
    };
    lv.zones.forEach(z => {
      if (z.type === 'fire_lane') { ctx.fillStyle = 'rgba(245,184,0,.18)'; ctx.fillRect(z.x, z.y, z.w, z.h); hatch(z, '#f5b800', 1.2); }
      if (z.type === 'ambulance') { ctx.fillStyle = 'rgba(224,38,43,.22)'; ctx.fillRect(z.x, z.y, z.w, z.h); hatch(z, '#e0262b', 1.2); }
      if (z.type === 'bus_lane') { ctx.fillStyle = 'rgba(47,111,224,.28)'; ctx.fillRect(z.x, z.y, z.w, z.h); }
      if (z.type === 'taxi_stand' || z.type === 'loading_zone') { hatch(z, z.type === 'taxi_stand' ? '#f5b800' : '#eceee8', 1.6); }
      if (z.type === 'dropoff') { ctx.strokeStyle = '#f5b800'; ctx.lineWidth = 0.15; ctx.setLineDash([0.6, 0.4]); ctx.strokeRect(z.x + 0.1, z.y + 0.1, z.w - 0.2, z.h - 0.2); ctx.setLineDash([]); }
      if (z.type === 'emergency_bay') { hatch({ x: z.x, y: z.y + 3.5, w: z.w, h: z.h - 3.5 }, 'rgba(236,238,232,.6)', 1.4); }
      if (z.type === 'fire_exit') { ctx.fillStyle = 'rgba(40,170,90,.2)'; ctx.fillRect(z.x, z.y, z.w, z.h); hatch(z, '#2fbf6a', 1.2); }
      if (z.type === 'ramp' || z.type === 'driveway') { ctx.fillStyle = 'rgba(236,238,232,.12)'; ctx.fillRect(z.x, z.y, z.w, z.h); hatch(z, 'rgba(236,238,232,.6)', 1.4); }
      if (z.type === 'entrance') { ctx.fillStyle = 'rgba(236,238,232,.16)'; ctx.fillRect(z.x, z.y, z.w, z.h); }
      if (z.type === 'double_park') { ctx.strokeStyle = 'rgba(236,238,232,.7)'; ctx.lineWidth = 0.1; ctx.setLineDash([0.8, 0.6]); ctx.strokeRect(z.x, z.y, z.w, z.h); ctx.setLineDash([]); }
    });
    // 주차구획
    const SLOT_FILL = { disabled: 'rgba(31,95,173,.75)', ev: 'rgba(36,140,88,.75)', pregnant: 'rgba(214,106,154,.6)', compact: 'rgba(80,130,200,.35)', women: 'rgba(232,140,60,.5)', resident: 'rgba(236,238,232,.12)' };
    (lv.slots || []).forEach(s => {
      const ty = s.disabled ? 'disabled' : s.type;
      if (SLOT_FILL[ty]) { ctx.fillStyle = SLOT_FILL[ty]; ctx.fillRect(s.x, s.y, s.w, s.h); }
      else if (o.learn && !J.slotOccupied(s, o.state)) { ctx.fillStyle = TINT.ok; ctx.fillRect(s.x, s.y, s.w, s.h); }
      ctx.strokeStyle = ty === 'disabled' ? '#9cc1ff' : '#eceee8'; ctx.lineWidth = 0.12; ctx.strokeRect(s.x, s.y, s.w, s.h);
    });
    // 보호구역·버스 노면 글씨
    if (cam.ppm > 4) {
      lv.zones.filter(z => z.type === 'school_zone').forEach(z => {
        for (let x = z.x + 12; x < z.x + z.w - 6; x += 30) {
          text(x, z.y + z.h * 0.68, '어린이 보호구역', 1.3 * ppm, '#f6efe0');
          text(x + 14, z.y + z.h * 0.32, '30', 1.8 * ppm, '#ffd23a');
        }
      });
      lv.zones.filter(z => z.type === 'bus_stop').forEach(z => text(z.x + z.w / 2, z.y + z.h / 2, '버스', 1.2 * ppm, '#f5b800'));
      const SLOT_TXT = { disabled: ['♿', 1.8], ev: ['⚡', 1.6], pregnant: ['임산부', 0.7], compact: ['경차', 0.8], women: ['여성', 0.7], resident: ['거주자', 0.8], paid: ['유료', 0.8] };
      (lv.slots || []).forEach(s => {
        const t = SLOT_TXT[s.disabled ? 'disabled' : s.type];
        if (t && !(o.parked || []).some(c => c.slot === s.id)) text(s.x + s.w / 2, s.y + s.h * 0.72, t[0], t[1] * ppm, '#fff', 'Noto Sans KR');
      });
      lv.zones.filter(z => z.paint).forEach(z => text(z.x + z.w / 2, z.y + z.h / 2, z.paint, clamp(0.9 * ppm, 10, 22), z.type === 'fire_lane' ? '#ffd23a' : '#f6efe0'));
    }
    // 주변 시설
    (lv.props || []).forEach(p => {
      world();
      if (p.type === 'hydrant') {
        ctx.fillStyle = '#e0262b'; ctx.beginPath(); ctx.arc(p.x, p.y, 0.35, 0, 2 * PI); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 0.12, 0, 2 * PI); ctx.fill();
      } else if (p.type === 'busstop') {
        ctx.fillStyle = '#1f5fad'; ctx.fillRect(p.x - 0.8, p.y - 0.25, 1.6, 0.5);
        ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 0.5, p.y - 0.08, 1.0, 0.16);
      } else if (p.type === 'cctv') {
        if (o.learn) { ctx.strokeStyle = 'rgba(160,200,255,.45)'; ctx.lineWidth = 0.1; ctx.setLineDash([0.6, 0.6]); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 2 * PI); ctx.stroke(); ctx.setLineDash([]); }
        ctx.fillStyle = '#1b1f24'; ctx.beginPath(); ctx.arc(p.x, p.y, 0.3, 0, 2 * PI); ctx.fill();
        ctx.fillStyle = '#e8eaed'; ctx.fillRect(p.x - 0.15, p.y - 0.55, 0.9, 0.4);
        ctx.fillStyle = '#e0262b'; ctx.beginPath(); ctx.arc(p.x + 0.6, p.y - 0.35, 0.09, 0, 2 * PI); ctx.fill();
      } else if (p.type === 'reporter') {
        ctx.fillStyle = '#d95d39'; ctx.beginPath(); ctx.arc(p.x, p.y, 0.42, 0, 2 * PI); ctx.fill();
        ctx.fillStyle = '#2b2118'; ctx.beginPath(); ctx.arc(p.x, p.y, 0.24, 0, 2 * PI); ctx.fill();
        ctx.fillStyle = '#9fd0ff'; ctx.fillRect(p.x + 0.3, p.y - 0.5, 0.22, 0.36);
        if (o.flash && dist(p, o.flash) < 30 && (o.t * 2 % 2) < 0.25) {
          ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(p.x + 0.4, p.y - 0.4, 0.7, 0, 2 * PI); ctx.fill();
        }
      } else if (p.type === 'sign' && cam.ppm > 4) {
        text(p.x, p.y, p.label, Math.max(10, 0.8 * ppm), '#ffffff', 'Noto Sans KR');
      }
    });
    // 주차된 차
    world();
    (o.parked || []).forEach(c => drawCar(ctx, c, c.color, { alpha: c.alpha ?? 1, illegal: !!c.note }));
    // 샘플 위치(미리보기)
    (o.samples || []).forEach((s, i) => {
      world();
      drawCar(ctx, s, s.legal ? '#3ccf7d' : '#ff5a5a', { ghost: true });
      text(s.x, s.y, String(i + 1), Math.max(11, 1.1 * ppm), '#fff', 'Do Hyeon');
    });
    // 목적지 표시(유일한 반복 애니메이션)
    if (o.showDest) {
      const d = lv.destination, k = (o.t % 1.6) / 1.6;
      world();
      ctx.strokeStyle = `rgba(255,194,14,${1 - k})`; ctx.lineWidth = 0.25;
      ctx.beginPath(); ctx.arc(d.x, d.y, 1 + k * 4, 0, 2 * PI); ctx.stroke();
      ctx.fillStyle = '#ffc20e'; ctx.beginPath(); ctx.arc(d.x, d.y, 0.8, 0, 2 * PI); ctx.fill();
    }
    // 건물 이름
    lv.buildings.forEach(b => { if (b.label && cam.ppm > 3) text(b.x + b.w / 2, b.y + b.h / 2, b.label, clamp(ppm * 0.9, 11, 18), b.dest ? '#fff' : '#e6e9ec', b.dest ? 'Do Hyeon' : 'Noto Sans KR'); });
    (lv.lots || []).forEach(l => { if (l.label && cam.ppm > 3) text(l.x + l.w / 2, l.y + l.h / 2 - (l.h > 14 ? 0 : 2.6), l.label, clamp(ppm * 0.8, 10, 15), '#cfd5db', 'Noto Sans KR'); });
    // 판단 모드 후보 자리 핀
    (o.candidates || []).forEach(c => {
      world();
      const r = Math.max(0.9, 11 / ppm);
      const pin = { x: c.x, y: c.y };
      if (!c.status && o.pulse) {
        const k = (o.t % 1.4) / 1.4;
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`; ctx.lineWidth = Math.max(0.12, 2 / ppm);
        ctx.beginPath(); ctx.arc(pin.x, pin.y, r * (1 + k * 0.9), 0, 2 * PI); ctx.stroke();
      }
      ctx.fillStyle = c.status ? TINT_SOLID[c.status] : '#0b5aa8';
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(0.12, 2.5 / ppm);
      ctx.beginPath(); ctx.arc(pin.x, pin.y, r, 0, 2 * PI); ctx.fill(); ctx.stroke();
      text(pin.x, pin.y, String(c.n), Math.max(13, r * ppm * 1.2), c.status ? '#17202a' : '#fff');
    });
    // 플레이어 차
    if (o.player) { world(); drawCar(ctx, o.player, '#0b5aa8', { player: true, brake: o.player.brakeOn, reverse: o.player.gear === 'R' }); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return W2S;
  }

  function drawCar(ctx, c, color, o = {}) {
    const L = CAR.length, Wd = CAR.width;
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.heading); ctx.globalAlpha = o.alpha ?? 1;
    if (o.ghost) {
      ctx.strokeStyle = color; ctx.lineWidth = 0.14; ctx.setLineDash([0.4, 0.25]);
      ctx.strokeRect(-L / 2, -Wd / 2, L, Wd); ctx.setLineDash([]);
      ctx.fillStyle = color + '33'; ctx.fillRect(-L / 2, -Wd / 2, L, Wd);
      ctx.restore(); return;
    }
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.roundRect(-L / 2 + 0.12, -Wd / 2 + 0.18, L, Wd, 0.45); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-L / 2, -Wd / 2, L, Wd, 0.45); ctx.fill();
    ctx.fillStyle = 'rgba(20,28,36,.78)';
    ctx.beginPath(); ctx.roundRect(0.35, -Wd / 2 + 0.22, 0.95, Wd - 0.44, 0.2); ctx.fill(); // 앞유리
    ctx.beginPath(); ctx.roundRect(-1.75, -Wd / 2 + 0.28, 0.6, Wd - 0.56, 0.18); ctx.fill(); // 뒷유리
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(-1.15, -Wd / 2 + 0.25, 1.5, Wd - 0.5); // 지붕
    if (o.player) {
      ctx.fillStyle = '#fff'; ctx.fillRect(-1.15, -0.12, 1.5, 0.24);
      ctx.fillStyle = '#fff6c8'; ctx.fillRect(L / 2 - 0.12, -Wd / 2 + 0.15, 0.12, 0.38); ctx.fillRect(L / 2 - 0.12, Wd / 2 - 0.53, 0.12, 0.38);
    }
    ctx.fillStyle = o.brake ? '#ff2b2b' : (o.reverse ? '#ffffff' : '#7a1a1a');
    ctx.fillRect(-L / 2, -Wd / 2 + 0.15, 0.12, 0.38); ctx.fillRect(-L / 2, Wd / 2 - 0.53, 0.12, 0.38);
    ctx.fillStyle = color; ctx.fillRect(0.7, -Wd / 2 - 0.16, 0.22, 0.16); ctx.fillRect(0.7, Wd / 2, 0.22, 0.16); // 사이드미러
    if (o.illegal) { ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 0.12; ctx.setLineDash([0.3, 0.2]); ctx.strokeRect(-L / 2 - 0.2, -Wd / 2 - 0.2, L + 0.4, Wd + 0.4); }
    ctx.restore();
  }

  function sizeCanvas(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const r = cv.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    return { w, h, dpr };
  }

window.PGRender={drawWorld,drawCar,sizeCanvas};})();
