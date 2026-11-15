/* game.js — 렌더링 · 차량 물리 · 입력 · 진행(도착 → 정차 → 전화 → 정식 주차 → 결과) */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const PI = Math.PI;
  const { RULES, DRIVE_VIOLATIONS, REPORT_NOTE, TOW_NOTE, OVERTIME_NOTE } = window;
  const J = window.Judge;
  const CAR = J.CAR;
  const won = n => n.toLocaleString('ko-KR') + '원';
  const pct = p => Math.round(p * 100) + '%';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const tint = r => (r.park ? 'ok' : r.stop ? 'stop' : 'ban');
  const TINT = { ok: 'rgba(47,190,110,.30)', stop: 'rgba(255,194,14,.34)', ban: 'rgba(226,59,59,.26)' };
  const TINT_SOLID = { ok: '#3ccf7d', stop: '#ffc20e', ban: '#ff5a5a' };
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } },
  };

  // ═════════════════════════ 렌더러 (미리보기·게임 공용) ═════════════════════════
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
      if (b.dest) {
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
    // 주차구획
    (lv.slots || []).forEach(s => {
      if (s.disabled) { ctx.fillStyle = 'rgba(31,95,173,.75)'; ctx.fillRect(s.x, s.y, s.w, s.h); }
      else if (o.learn && !J.slotOccupied(s, o.state)) { ctx.fillStyle = TINT.ok; ctx.fillRect(s.x, s.y, s.w, s.h); }
      ctx.strokeStyle = s.disabled ? '#9cc1ff' : '#eceee8'; ctx.lineWidth = 0.12; ctx.strokeRect(s.x, s.y, s.w, s.h);
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
      (lv.slots || []).filter(s => s.disabled).forEach(s => text(s.x + s.w / 2, s.y + s.h / 2, '♿', 1.8 * ppm, '#fff', 'Noto Sans KR'));
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

  // ═════════════════════════ 말풍선 ═════════════════════════
  const bubble = $('#bubble');
  function showBubble(sx, sy, html, opts = {}) {
    bubble.innerHTML = `<button class="x" aria-label="닫기">×</button>${html}`;
    bubble.classList.remove('hidden', 'above', 'below');
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    const vw = innerWidth, vh = innerHeight;
    const above = sy > vh / 2 && sy - bh - 18 > 4;
    const left = clamp(sx - bw / 2, 8, vw - bw - 8);
    const top = clamp(above ? sy - bh - 14 : sy + 14, 6, Math.max(6, vh - bh - 6));
    bubble.style.left = left + 'px'; bubble.style.top = top + 'px';
    bubble.style.setProperty('--ax', clamp(sx - left, 16, bw - 16) + 'px');
    bubble.classList.add(above ? 'above' : 'below');
    bubble.querySelector('.x').onclick = () => { hideBubble(); opts.onClose && opts.onClose(); };
    bubble.dataset.modal = opts.modal ? '1' : '';
    return bubble;
  }
  function hideBubble() { bubble.classList.add('hidden'); bubble.dataset.modal = ''; }

  function ruleCard(key, extraTitle) {
    const r = RULES[key];
    return `<h4>${extraTitle ? extraTitle + ' · ' : ''}${r.name}</h4>
      <div class="badges">
        <span class="badge ${r.stop || r.park ? 'yes' : 'no'}">정차 ${r.stop || r.park ? '가능' : '금지'}</span>
        <span class="badge ${r.park ? 'yes' : 'no'}">주차 ${r.park ? '가능' : '금지'}</span>
        ${r.fine ? `<span class="badge info">과태료 ${won(r.fine)}</span>` : ''}
        ${r.report ? '<span class="badge no">주민신고 대상</span>' : ''}
      </div>
      <p>${r.desc}</p><div class="law">${r.law}</div>`;
  }
  function riskBlock(risk) {
    const row = (label, p) => `<span>${label}</span><span class="bar"><i style="width:${pct(p)}"></i></span><span>${pct(p)}</span>`;
    return `<div class="risk">${row('주민신고', risk.reportProb)}${row('CCTV', risk.cctvProb)}${row('순찰 단속', risk.patrolProb)}${row('과태료 부과', risk.fineProb)}${row('견인', risk.towProb)}</div>
      <p style="margin-top:6px">근처 신고 가능 시민 ${risk.reporters}명 · CCTV ${risk.cctv ? '있음' : '없음'} · 예상 과태료 <b>${won(risk.expectedFine)}</b></p>`;
  }

  // ═════════════════════════ 미리보기 화면 ═════════════════════════
  const mini = $('#mini');
  let selected = 0;
  function presentKeys(lv) {
    const keys = new Set(lv.zones.map(z => z.type));
    (lv.slots || []).forEach(s => keys.add(s.disabled ? 'disabled' : s.kind === 'street' ? 'street_slot' : 'slot'));
    ['lane', 'sidewalk', 'wrong_way'].forEach(k => keys.add(k));
    return [...keys].sort((a, b) => RULES[a].severity - RULES[b].severity);
  }
  function renderPreview() {
    const best = store.get('pg-stars', {});
    $('#levelList').innerHTML = LEVELS.map((lv, i) => `
      <button class="lvl" role="tab" aria-selected="${i === selected}" data-i="${i}">
        <small>레벨 ${lv.id}</small><b>${lv.title}</b><small>${lv.place}</small>
        <div class="stars">${'★'.repeat(best[lv.id] || 0)}${'☆'.repeat(3 - (best[lv.id] || 0))}</div>
      </button>`).join('');
    $('#levelList').querySelectorAll('.lvl').forEach(b => b.onclick = () => { selected = +b.dataset.i; renderPreview(); });
    const lv = LEVELS[selected];
    const keys = presentKeys(lv);
    const groups = { ok: [], stop: [], ban: [] };
    keys.forEach(k => groups[tint(RULES[k])].push(k));
    const chips = arr => arr.map(k => `<span class="chip" data-k="${k}"><i style="background:${TINT_SOLID[tint(RULES[k])]}"></i>${RULES[k].short}</span>`).join('');
    const results = lv.samples.map((s, i) => {
      const j = J.judgePose(lv, s, s.mode, { minutes: s.minutes, state: { afterCall: !!s.afterCall } });
      const ok = j.key === s.expect && j.legal === s.legal;
      return `<tr><td>${i + 1}</td><td>${s.name}<br><small style="color:var(--muted)">${s.mode === 'stop' ? '정차' : '주차'} ${s.minutes}분 → ${RULES[j.key].short} · ${j.legal ? '합법' : '불법'}</small></td>
        <td class="${ok ? 'pass' : 'fail'}">${ok ? '통과' : '실패'}</td><td><button class="btn small ghost" data-s="${i}">여기서</button></td></tr>`;
    });
    const passN = results.filter(r => r.includes('class="pass"')).length;
    $('#levelInfo').innerHTML = `
      <section><h3>목표</h3><p>${lv.goal}</p></section>
      <section><dl class="kv"><dt>제한시간</dt><dd>${Math.floor(lv.timeLimit / 60)}분 ${lv.timeLimit % 60 ? lv.timeLimit % 60 + '초' : ''}</dd>
        <dt>장소</dt><dd>${lv.place}</dd><dt>약속 상대</dt><dd>${lv.story.friend} · 머무는 시간 ${lv.story.meetingMinutes}분</dd></dl></section>
      <section><h3>주차 가능 구역</h3>${chips(groups.ok)}</section>
      <section><h3>정차만 가능</h3>${chips(groups.stop)}</section>
      <section><h3>정차·주차 금지</h3>${chips(groups.ban)}</section>
      <section class="basis"><h3>판정 근거</h3><ul>${keys.map(k => `<li><b>${RULES[k].short}</b> — ${RULES[k].law}</li>`).join('')}
        <li>${REPORT_NOTE}</li><li>${TOW_NOTE}</li><li>${OVERTIME_NOTE}</li></ul></section>
      <section><h3>샘플 판정 테스트 ${passN}/${results.length}</h3><table class="tests">${results.join('')}</table></section>
      <div class="actions"><button class="btn primary" id="btnStart">레벨 ${lv.id} 시작</button></div>
      <p style="font-size:12px;color:var(--muted)">게임용 단순화 모델입니다. 과태료는 승용차 기준 대표값이며 지자체·시간대·표지판에 따라 다릅니다. 실제 운전 시 현장 표지와 law.go.kr의 최신 법령을 확인하세요.</p>`;
    $('#levelInfo').querySelectorAll('.chip').forEach(c => c.onclick = e => showBubble(e.clientX, e.clientY, ruleCard(c.dataset.k)));
    $('#levelInfo').querySelectorAll('[data-s]').forEach(b => b.onclick = () => startLevel(selected, lv.samples[+b.dataset.s]));
    $('#btnStart').onclick = () => startLevel(selected);
    $('#miniLegend').innerHTML = [['ok', '주차 가능'], ['stop', '정차만'], ['ban', '금지']]
      .map(([k, l]) => `<span><i class="dot" style="width:10px;height:10px;border-radius:2px;background:${TINT_SOLID[k]}"></i>${l}</span>`).join('') +
      '<span>번호 = 오른쪽 샘플 테스트 위치</span>';
    drawMini();
  }
  function miniCam(lv, w, h) {
    const ppm = Math.min(w / lv.world.w, h / lv.world.h) * 0.97;
    return { cx: lv.world.w / 2, cy: lv.world.h / 2, ppm, w, h };
  }
  function drawMini() {
    if ($('#preview').classList.contains('hidden')) return;
    const lv = LEVELS[selected];
    const { w, h, dpr } = sizeCanvas(mini);
    const ctx = mini.getContext('2d');
    drawWorld(ctx, lv, miniCam(lv, w, h), { dpr, learn: true, state: {}, parked: parkedList(lv, {}), samples: lv.samples, showDest: true, t: 0,
      player: { ...lv.start, gear: 'D' } });
  }
  mini.addEventListener('click', e => {
    const lv = LEVELS[selected];
    const r = mini.getBoundingClientRect();
    const cam = miniCam(lv, r.width, r.height);
    const p = { x: (e.clientX - r.left - cam.w / 2) / cam.ppm + cam.cx, y: (e.clientY - r.top - cam.h / 2) / cam.ppm + cam.cy };
    infoAt(lv, p, e.clientX, e.clientY, {});
  });
  $('#btnData').onclick = () => showData();
  document.addEventListener('pointerdown', e => {
    if (!bubbleOpen() || bubble.dataset.modal || bubble.contains(e.target) || $('#preview').classList.contains('hidden')) return;
    if (e.target.closest('.chip') || e.target === mini) return;
    hideBubble();
  });

  function parkedList(lv, state) {
    const list = (lv.parked || []).filter(c => !(c.freesOnCall && state.afterCall)).map(c => ({ ...c }));
    (lv.slots || []).forEach(s => {
      if (!J.slotOccupied(s, state)) return;
      const vertical = s.h > s.w;
      list.push({ x: s.x + s.w / 2, y: s.y + s.h / 2, heading: vertical ? (s.id.charCodeAt(1) % 2 ? PI / 2 : -PI / 2) : (s.dir ?? 0), color: s.color, slot: s.id });
    });
    return list;
  }

  // ═════════════════════════ 게임 상태 ═════════════════════════
  const cv = $('#view');
  const ctx = cv.getContext('2d');
  let G = null;

  function startLevel(i, sample) {
    const lv = LEVELS[i];
    hideBubble(); $('#overlay').classList.add('hidden');
    G = {
      i, lv, t: 0,
      car: { x: lv.start.x, y: lv.start.y, heading: lv.start.heading, v: 0, gear: 'D', brakeOn: false },
      wheel: 0, wheelHeld: false, accel: false, brake: false, keys: {},
      phase: 'drive', timeLeft: lv.timeLimit, clock: hhmm(lv.clock),
      state: { afterCall: false }, events: [], parked: parkedList(lv, {}),
      learn: store.get('pg-learn', true), map: false, zoom: 1, paused: false,
      arrivedAt: null, declined: false, cooldown: {}, liveAt: 0, flash: null, lastPos: null,
    };
    if (sample) {
      Object.assign(G.car, { x: sample.x, y: sample.y, heading: sample.heading, gear: 'N' });
      if (sample.afterCall) { G.state.afterCall = true; G.parked = parkedList(lv, G.state); G.phase = 'park'; }
      else G.phase = 'findStop';
      G.arrivedAt = Infinity; // 샘플 시작에서는 자동 전화 안 옴
      toast(`샘플 위치 “${sample.name}” — 기어를 P로 두면 판정합니다.`);
    }
    $('#preview').classList.add('hidden'); $('#game').classList.remove('hidden');
    $('#hTitle').textContent = `레벨 ${lv.id} · ${lv.title}`;
    $('#btnLearn').setAttribute('aria-pressed', G.learn); $('#btnMap').setAttribute('aria-pressed', 'false');
    $('#live').classList.toggle('hidden', !G.learn);
    setGearUI(); updateGoal();
    tryLandscape();
  }
  function hhmm(s) { const [h, m] = s.split(':').map(Number); return h * 3600 + m * 60; }
  function fmtClock(sec) { const m = Math.floor(sec / 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
  function fmtLeft(s) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  function tryLandscape() {
    try { if (matchMedia('(pointer:coarse)').matches && !document.fullscreenElement) document.documentElement.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape')).catch(() => {}); } catch { /* 지원 안 함 */ }
  }
  function updateGoal() {
    const lv = G.lv;
    const text = {
      drive: `${lv.destination.label}로 가세요. 건물 주차장은 만차입니다.`,
      findStop: '도착! 잠깐 세울 곳을 골라 멈춘 뒤 기어를 P로 두세요.',
      park: `${lv.story.meetingMinutes}분 머물 곳에 정식 주차하고 P를 누르세요.`,
      call: '통화 중',
      done: '끝',
    }[G.phase];
    $('#hGoal').textContent = text;
  }

  const toastBox = $('#toast');
  function toast(msg, kind = '', ms = 3200) {
    const d = document.createElement('div'); d.textContent = msg; if (kind) d.className = kind;
    toastBox.appendChild(d);
    while (toastBox.children.length > 3) toastBox.firstChild.remove();
    setTimeout(() => d.remove(), ms);
  }

  // ═════════════════════════ 물리 · 충돌 ═════════════════════════
  const MAX_STEER = 35 * PI / 180, WHEEL_LOCK = 450;
  function polyOverlap(a, b) {
    for (const poly of [a, b]) {
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i], q = poly[(i + 1) % poly.length];
        const nx = q.y - p.y, ny = p.x - q.x;
        let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
        for (const v of a) { const d = v.x * nx + v.y * ny; amin = Math.min(amin, d); amax = Math.max(amax, d); }
        for (const v of b) { const d = v.x * nx + v.y * ny; bmin = Math.min(bmin, d); bmax = Math.max(bmax, d); }
        if (amax < bmin || bmax < amin) return false;
      }
    }
    return true;
  }
  const rectPoly = r => [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }];
  function collides(pose) {
    const poly = J.carCorners(pose);
    const lv = G.lv;
    if (poly.some(p => p.x < 0 || p.y < 0 || p.x > lv.world.w || p.y > lv.world.h)) return 'edge';
    for (const b of lv.buildings) if (polyOverlap(poly, rectPoly(b))) return 'building';
    for (const c of G.parked) if ((c.alpha ?? 1) > 0.5 && polyOverlap(poly, J.carCorners(c))) return 'car';
    return null;
  }
  function segX(p1, p2, q1, q2) {
    const d = (p2.x - p1.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q2.x - q1.x);
    if (Math.abs(d) < 1e-9) return false;
    const t = ((q1.x - p1.x) * (q2.y - q1.y) - (q1.y - p1.y) * (q2.x - q1.x)) / d;
    const u = ((q1.x - p1.x) * (p2.y - p1.y) - (q1.y - p1.y) * (p2.x - p1.x)) / d;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  function step(dt) {
    const c = G.car, k = G.keys;
    // 핸들
    if (k.left) G.wheel -= 420 * dt;
    if (k.right) G.wheel += 420 * dt;
    if (!G.wheelHeld && !k.left && !k.right && Math.abs(c.v) > 0.3) G.wheel *= Math.exp(-dt * Math.abs(c.v) * 0.3); // 주행 중 복원력
    G.wheel = clamp(G.wheel, -WHEEL_LOCK, WHEEL_LOCK);
    const steer = G.wheel / WHEEL_LOCK * MAX_STEER;
    // 페달
    const accel = G.accel || k.up, brake = G.brake || k.down || k.space;
    c.brakeOn = brake;
    const dir = c.gear === 'D' ? 1 : c.gear === 'R' ? -1 : 0;
    if (c.gear === 'P') c.v = 0;
    else {
      if (accel && dir) c.v += dir * (dir > 0 ? 3.2 : 2.0) * dt;
      else if (dir && !brake && c.v * dir < 1.2) c.v += dir * 1.0 * dt; // 자동변속기 크리핑
      if (brake) { const s = Math.sign(c.v); c.v -= s * 8 * dt; if (Math.sign(c.v) !== s) c.v = 0; }
      const drag = (0.25 + 0.012 * c.v * c.v) * dt;
      if (!accel) { const s = Math.sign(c.v); c.v -= s * drag; if (Math.sign(c.v) !== s) c.v = 0; }
      c.v = clamp(c.v, -3.5, 12.5);
    }
    if (!c.v) return;
    const next = {
      heading: c.heading + c.v / CAR.wheelbase * Math.tan(steer) * dt,
      x: c.x + Math.cos(c.heading) * c.v * dt,
      y: c.y + Math.sin(c.heading) * c.v * dt,
    };
    const hit = collides(next);
    if (hit) {
      if (Math.abs(c.v) > 0.7 && hit === 'car' && once('crash', 2)) {
        G.events.push({ kind: 'drive', key: 'crash', at: G.clock });
        toast('쿵! 주차된 차와 접촉했습니다. 연락처를 남겨야 합니다 (−100).', 'bad');
      } else if (Math.abs(c.v) > 0.7 && once('bump', 1.5)) toast(hit === 'building' ? '벽에 막혔습니다.' : '더 갈 수 없습니다.', 'bad', 1500);
      c.v = 0; return;
    }
    const prev = { x: c.x, y: c.y };
    Object.assign(c, next);
    checkDriving(prev);
  }
  function once(key, sec) { if ((G.cooldown[key] || -99) > G.t - sec) return false; G.cooldown[key] = G.t; return true; }
  function checkDriving(prev) {
    const c = G.car, lv = G.lv;
    // 중앙선(황색 복선) 침범
    for (const l of lv.lines || []) {
      if (l.type !== 'yellowDouble') continue;
      if (segX(prev, c, { x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }) && once('center', 4)) {
        addDrive('center_line');
      }
    }
    // 어린이보호구역 속도
    const kmh = Math.abs(c.v) * 3.6;
    const school = lv.zones.find(z => z.type === 'school_zone' && J.inRect(z, c));
    if (school && kmh > 30 && once('speed', 6)) addDrive('school_speed');
    // 보도 통행(차체 중심이 보도 위)
    if (lv.sidewalks.some(s => J.inRect(s, c)) && once('sidewalk', 6)) addDrive('sidewalk_drive');
    // 도착
    if (G.phase === 'drive' && dist(c, lv.destination) < lv.destination.radius) {
      G.phase = 'findStop'; G.arrivedAt = G.t; updateGoal();
      toast(`${lv.destination.label} 도착. 건물 주차장은 만차입니다 — 잠깐 세울 곳을 찾으세요.`, '', 4200);
    }
  }
  function addDrive(key) {
    const v = DRIVE_VIOLATIONS[key];
    G.events.push({ kind: 'drive', key, at: G.clock });
    toast(`${v.name} — 범칙금 ${won(v.fine)}, 벌점 ${v.points}점`, 'bad', 3800);
  }

  // ═════════════════════════ 루프 ═════════════════════════
  let last = performance.now(), acc = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dtReal = Math.min(0.1, (now - last) / 1000); last = now;
    if (!G || $('#game').classList.contains('hidden')) { return; }
    G.t += dtReal;
    if (!G.paused && G.phase !== 'done') {
      acc += dtReal;
      while (acc >= 1 / 60) { step(1 / 60); acc -= 1 / 60; }
      G.timeLeft -= dtReal; G.clock += dtReal;
      if (G.timeLeft <= 0) finish('timeout');
      if (G.phase === 'findStop' && G.arrivedAt != null && !G.declined && G.t - G.arrivedAt > 20 && !bubbleOpen()) ring(true);
      animateParked(dtReal);
    }
    render();
    hud();
  }
  const bubbleOpen = () => !bubble.classList.contains('hidden');
  function animateParked(dt) {
    G.parked.forEach(c => { if (c.leaving) { c.alpha = Math.max(0, (c.alpha ?? 1) - dt * 0.8); c.x += Math.cos(c.heading) * dt * 1.5; c.y += Math.sin(c.heading) * dt * 1.5; } });
    G.parked = G.parked.filter(c => !c.leaving || c.alpha > 0);
  }
  function camera() {
    const { w, h, dpr } = sizeCanvas(cv);
    const lv = G.lv, c = G.car;
    if (G.map) { const m = miniCam(lv, w, h); return { ...m, dpr }; }
    const ppm = Math.max(w / 56, h / 30) * G.zoom;
    const ahead = clamp(c.v, -3, 8) * 0.7;
    let cx = c.x + Math.cos(c.heading) * ahead, cy = c.y + Math.sin(c.heading) * ahead + h * 0.08 / ppm;
    const hw = w / 2 / ppm, hh = h / 2 / ppm;
    cx = lv.world.w < 2 * hw ? lv.world.w / 2 : clamp(cx, hw, lv.world.w - hw);
    cy = lv.world.h < 2 * hh ? lv.world.h / 2 : clamp(cy, hh, lv.world.h - hh);
    return { cx, cy, ppm, w, h, dpr };
  }
  let lastCam = null;
  function render() {
    const cam = camera(); lastCam = cam;
    drawWorld(ctx, G.lv, cam, { dpr: cam.dpr, learn: G.learn, state: G.state, parked: G.parked, player: G.car,
      showDest: G.phase === 'drive' || G.phase === 'findStop', t: G.t, flash: G.flash });
  }
  function hud() {
    $('#hTime').textContent = fmtLeft(G.timeLeft);
    $('#hTime').className = G.timeLeft < 30 ? 'warn' : '';
    $('#hClock').textContent = fmtClock(G.clock);
    $('#wheelRot').setAttribute('transform', `rotate(${G.wheel})`);
    $('#wheelDeg').textContent = `핸들 ${Math.round(G.wheel)}° · 바퀴 ${Math.round(G.wheel / WHEEL_LOCK * 35)}°`;
    const kmh = Math.abs(G.car.v) * 3.6;
    const spd = $('#spd');
    spd.firstChild.nodeValue = Math.round(kmh);
    const school = G.lv.zones.some(z => z.type === 'school_zone' && J.inRect(z, G.car));
    spd.classList.toggle('over', school && kmh > 30);
    $('#accel').classList.toggle('on', !!(G.accel || G.keys.up));
    $('#brake').classList.toggle('on', !!(G.brake || G.keys.down || G.keys.space));
    if (G.learn && G.t - G.liveAt > 0.15) {
      G.liveAt = G.t;
      const mode = G.phase === 'park' ? 'park' : 'stop';
      const j = J.judgePose(G.lv, G.car, mode, { minutes: mode === 'park' ? G.lv.story.meetingMinutes : 3, state: G.state });
      const r = j.rule;
      $('#liveDot').style.background = TINT_SOLID[tint(r)];
      $('#liveText').textContent = `여기: ${r.short} · 정차 ${r.stop || r.park ? '○' : '✕'} · 주차 ${r.park ? '○' : '✕'}${j.inSlot ? ` · 정렬 ${j.align.score}점` : ''}`;
    }
  }

  // ═════════════════════════ 판정 흐름 ═════════════════════════
  function carScreen() {
    if (!lastCam) return { x: innerWidth / 2, y: innerHeight / 2 };
    return { x: (G.car.x - lastCam.cx) * lastCam.ppm + lastCam.w / 2, y: (G.car.y - lastCam.cy) * lastCam.ppm + lastCam.h / 2 };
  }
  function verdictHtml(kindLabel, j, risk) {
    const r = j.rule;
    return `<h4>${kindLabel}: ${j.legal ? '합법' : '불법'} — ${r.name}</h4>
      <div class="badges"><span class="badge ${j.legal ? 'yes' : 'no'}">${j.effective} ${j.minutes}분 · ${j.legal ? '가능' : '위반'}</span>
        ${r.fine && !j.legal ? `<span class="badge info">과태료 ${won(risk.fine)}</span>` : ''}${r.report && !j.legal ? '<span class="badge no">주민신고 대상</span>' : ''}</div>
      <p>${r.desc}</p>${j.reasons.map(x => `<p>· ${x}</p>`).join('')}
      ${j.inSlot ? `<p>구획 정렬 ${j.align.score}점 (각도 ${j.align.deg}°, 중심에서 ${j.align.offset}m)</p>` : ''}
      <div class="law">${r.law}</div>${j.legal ? '' : riskBlock(risk)}`;
  }

  function onPark() {
    if (!G || G.phase === 'call' || G.phase === 'done') return;
    const lv = G.lv, pose = { x: G.car.x, y: G.car.y, heading: G.car.heading };
    const s = carScreen();
    if (G.phase === 'drive' || G.phase === 'findStop') {
      const minutes = lv.story.callMinutes;
      const j = J.judgePose(lv, pose, 'stop', { minutes, state: G.state });
      const risk = J.assessRisk(lv, pose, j, { minutes, driverPresent: true });
      const far = G.phase === 'drive' ? '<p><b>아직 약속장소에서 멉니다.</b></p>' : '';
      showBubble(s.x, s.y, verdictHtml(`정차 판정`, j, risk) + far +
        `<div class="row"><button class="btn dark" id="bAgain">다시 찾기</button><button class="btn primary" id="bGo">여기서 전화 받기</button></div>`, { modal: true, onClose: () => setGear('D', true) });
      $('#bAgain').onclick = () => { hideBubble(); setGear('D', true); };
      $('#bGo').onclick = () => { hideBubble(); G.pendingStop = { pose, j, risk, minutes }; ring(false); };
    } else if (G.phase === 'park') {
      const minutes = lv.story.meetingMinutes;
      const j = J.judgePose(lv, pose, 'park', { minutes, state: G.state });
      const risk = J.assessRisk(lv, pose, j, { minutes, driverPresent: false });
      showBubble(s.x, s.y, verdictHtml('주차 판정', j, risk) +
        `<div class="row"><button class="btn dark" id="bAgain">다시 이동</button><button class="btn primary" id="bGo">여기 두고 약속 가기</button></div>`, { modal: true, onClose: () => setGear('D', true) });
      $('#bAgain').onclick = () => { hideBubble(); setGear('D', true); };
      $('#bGo').onclick = () => {
        hideBubble();
        const out = J.rollOutcome(risk);
        G.events.push({ kind: 'park', pose, j, risk, outcome: out });
        finish(j.legal ? 'parked' : 'illegal');
      };
    }
  }

  // ─── 전화 ───
  const callEl = $('#call');
  function ring(whileDriving) {
    if (G.phase === 'call') return;
    const lv = G.lv;
    G.phase = 'call'; updateGoal();
    callEl.classList.remove('hidden'); callEl.classList.add('ringing');
    $('#callAv').textContent = lv.story.friend[0];
    $('#callName').textContent = lv.story.friend;
    $('#callSub').textContent = '전화가 왔습니다';
    $('#callLines').innerHTML = whileDriving ? '<p style="background:rgba(255,194,14,.15)">운전 중에는 손에 들고 통화하면 안 됩니다. 멈춘 뒤 받으세요.</p>' : '';
    $('#callRow').innerHTML = `${whileDriving ? '<button class="decline" id="cLater">정차 후 받기</button>' : ''}<button class="accept" id="cAccept">받기</button>`;
    $('#cAccept').onclick = () => {
      if (Math.abs(G.car.v) > 0.4 && G.car.gear !== 'P') addDrive('phone');
      talk();
    };
    if (whileDriving) $('#cLater').onclick = () => { callEl.classList.add('hidden'); G.declined = true; G.phase = 'findStop'; updateGoal(); toast('멈추고 P에 두면 다시 걸려옵니다.'); };
  }
  function talk() {
    const lv = G.lv;
    G.paused = true;
    callEl.classList.remove('ringing');
    $('#callSub').textContent = '통화 중';
    $('#callLines').innerHTML = '';
    $('#callRow').innerHTML = '';
    const lines = lv.story.ringLines;
    let i = 0;
    const next = () => {
      if (i < lines.length) {
        const p = document.createElement('p'); p.textContent = lines[i++]; $('#callLines').appendChild(p);
        G.callTimer = setTimeout(next, 1300);
      } else {
        $('#callRow').innerHTML = '<button class="decline" id="cEnd">통화 종료</button>';
        $('#cEnd').onclick = endCall;
      }
    };
    callEl.onclick = e => { if (e.target.tagName !== 'BUTTON' && i < lines.length) { clearTimeout(G.callTimer); next(); } };
    next();
  }
  function endCall() {
    const lv = G.lv;
    callEl.classList.add('hidden'); callEl.onclick = null;
    G.paused = false;
    G.clock += lv.story.callMinutes * 60;
    if (G.pendingStop) {
      const ps = G.pendingStop;
      const out = J.rollOutcome(ps.risk);
      G.events.push({ kind: 'stop', ...ps, outcome: out });
      if (!ps.j.legal) {
        if (out.reported) { G.flash = ps.pose; toast('주민이 휴대전화로 차를 찍었습니다 — 안전신문고 신고 접수.', 'bad', 4500); }
        if (out.cctv) toast('단속 CCTV에 촬영됐습니다.', 'bad', 4500);
        if (!out.fined) toast('이번엔 운 좋게 단속을 피했습니다. 그래도 위반입니다.', 'bad', 4000);
      } else toast(`${lv.story.callMinutes}분 정차 — 합법입니다.`, 'good');
      G.pendingStop = null;
    }
    // 통화 후 자리 비움
    G.state.afterCall = true;
    const freed = [];
    G.parked.forEach(c => {
      const slot = c.slot && lv.slots.find(s => s.id === c.slot);
      if ((slot && slot.freesOnCall) || c.freesOnCall) { c.leaving = true; freed.push(c.slot || '가장자리'); }
    });
    if (freed.length) toast(`자리가 났습니다: ${freed.join(', ')}`, 'good', 4500);
    G.phase = 'park'; updateGoal();
    toast('5분 넘게 머물면 주차입니다. 정식으로 주차할 곳으로 옮기세요.', '', 4500);
  }

  // ─── 결과 ───
  function finish(reason) {
    if (G.phase === 'done') return;
    G.phase = 'done'; G.paused = true; hideBubble(); callEl.classList.add('hidden');
    const lv = G.lv;
    let score = 1000;
    const lines = [];
    const add = (label, v) => { score += v; lines.push(`${label} ${v >= 0 ? '+' : ''}${Math.round(v)}`); };
    let success = false;
    G.events.forEach(e => {
      if (e.kind === 'stop') {
        if (e.j.legal) add('합법 정차', 100);
        else { add('불법 정차', -150); if (e.outcome.cost) add('정차 과태료', -e.outcome.cost / 200); }
      } else if (e.kind === 'park') {
        if (e.j.legal) { success = true; add('정식 주차', 200); add(e.j.inSlot ? '구획 정렬' : '가장자리 주차', e.j.inSlot ? e.j.align.score * 2 : 80); }
        else { add('불법 주차', -300); if (e.outcome.cost) add('주차 과태료·견인', -e.outcome.cost / 200); if (e.risk.penalty) add('통로 방해', -e.risk.penalty); }
      } else {
        add(DRIVE_VIOLATIONS[e.key].name, e.key === 'crash' ? -100 : -150);
      }
    });
    if (success) add('남은 시간', Math.max(0, G.timeLeft));
    score = Math.max(0, Math.round(score));
    const stars = !success ? 0 : score >= 1500 ? 3 : score >= 1200 ? 2 : 1;
    const best = store.get('pg-stars', {});
    if (stars > (best[lv.id] || 0)) { best[lv.id] = stars; store.set('pg-stars', best); }
    const head = reason === 'timeout' ? ['red', '약속 시간 초과', '제한시간 안에 정식 주차하지 못했습니다.']
      : success ? ['green', '주차 완료', '법을 지키면서 약속에 도착했습니다.']
      : ['red', '불법 주차로 마무리', '차를 두고 떠난 자리가 주차 금지 구역입니다.'];
    const cards = G.events.map(evCard).join('') || '<p>기록된 판정이 없습니다.</p>';
    const ov = $('#overlay');
    ov.innerHTML = `<div class="result">
      <div class="top"><div class="sign ${head[0]}"><div class="in"><h2>${head[1]}</h2><div>${head[2]}</div></div></div>
        <div class="score">${score}<small>점</small><div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div></div></div>
      <div class="events">${cards}</div>
      <div class="breakdown">${lines.map(l => `<span>${l}</span>`).join('')}</div>
      <div class="actions" style="margin-top:12px">
        <button class="btn" id="rAgain">다시 하기</button>
        ${G.i < LEVELS.length - 1 ? '<button class="btn primary" id="rNext">다음 레벨</button>' : ''}
        <button class="btn ghost" id="rMenu">레벨 선택</button></div></div>`;
    ov.classList.remove('hidden');
    $('#rAgain').onclick = () => startLevel(G.i);
    if ($('#rNext')) $('#rNext').onclick = () => startLevel(G.i + 1);
    $('#rMenu').onclick = exitToMenu;
  }
  function evCard(e) {
    if (e.kind === 'drive') {
      const v = DRIVE_VIOLATIONS[e.key];
      return `<div class="ev bad"><div class="kind">운전 중 위반 · ${fmtClock(e.at)}</div><h5>${v.name}</h5>
        <p>${v.desc}</p><div class="law" style="font-size:12px;color:#3c4a5a">${v.law}</div>
        ${v.fine ? `<div class="out">범칙금 ${won(v.fine)} · 벌점 ${v.points}점</div>` : ''}</div>`;
    }
    const r = e.j.rule, o = e.outcome, rk = e.risk;
    const outs = [];
    if (!e.j.legal) {
      if (o.reported) outs.push('주민신고 접수');
      if (o.cctv) outs.push('CCTV 촬영');
      if (o.patrol) outs.push('순찰 단속');
      outs.push(o.fined ? `과태료 ${won(rk.fine)}` : '단속 피함(운)');
      if (o.towed) outs.push('견인됨 · 견인료 약 4만원 + 보관료');
    }
    return `<div class="ev ${e.j.legal ? '' : 'bad'}"><div class="kind">${e.kind === 'stop' ? '정차 판정' : '주차 판정'} · ${e.j.effective} ${e.j.minutes}분</div>
      <h5>${e.j.legal ? '합법' : '불법'} — ${r.name}</h5>
      ${e.j.reasons.map(x => `<p style="margin:2px 0">· ${x}</p>`).join('')}
      <div style="font-size:12px;color:#3c4a5a;border-left:3px solid #0b5aa8;padding-left:6px;margin-top:4px">${r.law}</div>
      ${e.j.legal ? (e.j.inSlot ? `<div class="out">구획 정렬 ${e.j.align.score}점</div>` : '<div class="out">문제 없음</div>')
        : `<p style="margin:6px 0 0;font-size:12px">신고 ${pct(rk.reportProb)} · CCTV ${pct(rk.cctvProb)} · 순찰 ${pct(rk.patrolProb)} · 견인 ${pct(rk.towProb)}</p><div class="out">결과: ${outs.join(' → ')}</div>`}</div>`;
  }
  function exitToMenu() {
    if (G) { clearTimeout(G.callTimer); G.paused = true; }
    G = null;
    hideBubble(); callEl.classList.add('hidden');
    $('#overlay').classList.add('hidden'); $('#game').classList.add('hidden'); $('#preview').classList.remove('hidden');
    renderPreview();
  }

  // ═════════════════════════ 터치 → 말풍선 설명 ═════════════════════════
  function infoAt(lv, p, sx, sy, state, player) {
    if (player && J.carCorners(player).length && pointInPoly(p, J.carCorners(player))) {
      const mode = G.phase === 'park' ? 'park' : 'stop';
      const j = J.judgePose(lv, player, mode, { minutes: mode === 'park' ? lv.story.meetingMinutes : 3, state });
      return showBubble(sx, sy, `<h4>내 차 · 지금 위치</h4>${ruleCard(j.key).replace(/<h4>.*?<\/h4>/, '')}${j.reasons.map(x => `<p>· ${x}</p>`).join('')}`);
    }
    const prop = (lv.props || []).find(q => dist(q, p) < 1.8);
    if (prop) {
      if (prop.type === 'hydrant') return showBubble(sx, sy, ruleCard('hydrant', prop.label));
      if (prop.type === 'busstop') return showBubble(sx, sy, ruleCard('bus_stop', prop.label));
      if (prop.type === 'cctv') return showBubble(sx, sy, `<h4>${prop.label}</h4><div class="badges"><span class="badge info">감시 반경 ${prop.r}m</span></div>
        <p>6대 신고 구역(소화전·모퉁이·정류소·횡단보도·보호구역·인도)은 1분, 그 밖의 금지 구역은 5분 넘게 서 있으면 단속이 확정되는 것으로 계산합니다. 지자체에 따라 문자 알림 후 유예하기도 합니다.</p>`);
      if (prop.type === 'reporter') return showBubble(sx, sy, `<h4>${prop.label}</h4><div class="badges"><span class="badge no">신고 가능</span></div><p>반경 30m 안의 불법 주정차를 찍을 수 있습니다. 가까운 시민이 많을수록 신고 확률이 올라갑니다.</p><div class="law">${REPORT_NOTE}</div>`);
      if (prop.type === 'sign') return showBubble(sx, sy, `<h4>${prop.label}</h4><p>현장 안내판입니다.</p>`);
    }
    const pc = (G && G.lv === lv ? G.parked : parkedList(lv, state)).find(c => pointInPoly(p, J.carCorners(c)));
    if (pc) return showBubble(sx, sy, pc.note ? `<h4>${pc.label}</h4><p>${pc.note}</p>${ruleCard('school_zone').replace(/<h4>.*?<\/h4>/, '')}`
      : `<h4>주차된 차${pc.slot ? ` · 구획 ${pc.slot}` : ''}</h4><p>${pc.slot && lv.slots.find(s => s.id === pc.slot).freesOnCall ? '통화가 끝날 무렵 출차할 예정입니다.' : '자리를 비우지 않습니다. 긁지 않게 주의하세요.'}</p>`);
    const b = lv.buildings.find(q => J.inRect(q, p));
    if (b) return showBubble(sx, sy, `<h4>${b.label || '건물'}</h4><p>${b.dest ? `약속장소입니다. ${lv.goal}` : '들어갈 수 없는 건물입니다.'}</p>`);
    const hits = J.hitsAt(lv, p, state);
    const top = hits.reduce((a, c) => (RULES[c.key].severity > RULES[a.key].severity ? c : a));
    const extra = hits.length > 1 ? `<p style="font-size:12px;color:#556">이 지점에 겹친 구역: ${[...new Set(hits.map(h => RULES[h.key].short))].join(', ')} → 가장 엄격한 기준 적용</p>` : '';
    const label = top.slot ? `구획 ${top.slot.id}` : top.zone && top.zone.label;
    return showBubble(sx, sy, ruleCard(top.key, label) + extra);
  }
  function pointInPoly(p, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }
  let down = null;
  cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  cv.addEventListener('pointerup', e => {
    if (!down || !G || !lastCam) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 12) return;
    if (bubbleOpen()) { if (bubble.dataset.modal) return; hideBubble(); return; }
    const p = { x: (e.clientX - lastCam.w / 2) / lastCam.ppm + lastCam.cx, y: (e.clientY - lastCam.h / 2) / lastCam.ppm + lastCam.cy };
    infoAt(G.lv, p, e.clientX, e.clientY, G.state, G.car);
  });
  cv.addEventListener('wheel', e => { if (G) G.zoom = clamp(G.zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.5, 2.2); }, { passive: true });

  // ═════════════════════════ 조작 입력 ═════════════════════════
  // 핸들
  const wheelEl = $('#wheel');
  let wheelPtr = null, lastAng = 0;
  const angOf = e => { const r = wheelEl.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)); };
  wheelEl.addEventListener('pointerdown', e => { if (!G) return; wheelPtr = e.pointerId; wheelEl.setPointerCapture(e.pointerId); lastAng = angOf(e); G.wheelHeld = true; });
  wheelEl.addEventListener('pointermove', e => {
    if (e.pointerId !== wheelPtr || !G) return;
    const a = angOf(e); let d = a - lastAng; lastAng = a;
    if (d > PI) d -= 2 * PI; if (d < -PI) d += 2 * PI;
    G.wheel = clamp(G.wheel + d * 180 / PI, -WHEEL_LOCK, WHEEL_LOCK);
  });
  const wheelUp = e => { if (e.pointerId === wheelPtr) { wheelPtr = null; if (G) G.wheelHeld = false; } };
  wheelEl.addEventListener('pointerup', wheelUp); wheelEl.addEventListener('pointercancel', wheelUp);
  wheelEl.addEventListener('dblclick', () => { if (G) G.wheel = 0; });
  // 페달
  for (const [id, key] of [['#accel', 'accel'], ['#brake', 'brake']]) {
    const el = $(id);
    el.addEventListener('pointerdown', e => { if (!G) return; el.setPointerCapture(e.pointerId); G[key] = true; e.preventDefault(); });
    const off = () => { if (G) G[key] = false; };
    el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
    el.addEventListener('contextmenu', e => e.preventDefault());
  }
  // 기어
  function setGear(g, silent) {
    if (!G || G.phase === 'done') return;
    if (g === G.car.gear) return;
    if (Math.abs(G.car.v) > 0.4 && g !== 'N') { toast('완전히 멈춘 뒤 변속하세요 (브레이크).', 'bad', 1800); return; }
    if (G.paused && G.phase === 'call') return;
    G.car.gear = g; if (g !== 'N') G.car.v = g === 'P' ? 0 : G.car.v;
    setGearUI();
    if (g === 'P' && !silent) onPark();
    else if (bubbleOpen() && bubble.dataset.modal) hideBubble();
  }
  function setGearUI() { document.querySelectorAll('#gears button').forEach(b => b.setAttribute('aria-pressed', String(G && b.dataset.g === G.car.gear))); }
  document.querySelectorAll('#gears button').forEach(b => b.addEventListener('click', () => setGear(b.dataset.g)));
  // 키보드
  const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'space' };
  addEventListener('keydown', e => {
    if (!G || $('#game').classList.contains('hidden')) return;
    if (KEYMAP[e.code]) { G.keys[KEYMAP[e.code]] = true; e.preventDefault(); return; }
    const g = { KeyP: 'P', KeyR: 'R', KeyN: 'N', KeyF: 'D' }[e.code];
    if (g) setGear(g);
    if (e.code === 'KeyM') toggleMap();
    if (e.code === 'Equal') G.zoom = clamp(G.zoom * 1.1, 0.5, 2.2);
    if (e.code === 'Minus') G.zoom = clamp(G.zoom * 0.9, 0.5, 2.2);
    if (e.code === 'Escape') hideBubble();
  });
  addEventListener('keyup', e => { if (G && KEYMAP[e.code]) G.keys[KEYMAP[e.code]] = false; });
  addEventListener('blur', () => { if (G) { G.keys = {}; G.accel = G.brake = false; } });

  // 상단 버튼
  function toggleMap() { G.map = !G.map; $('#btnMap').setAttribute('aria-pressed', G.map); }
  $('#btnMap').onclick = () => G && toggleMap();
  $('#btnLearn').onclick = () => {
    if (!G) return;
    G.learn = !G.learn; store.set('pg-learn', G.learn);
    $('#btnLearn').setAttribute('aria-pressed', G.learn); $('#live').classList.toggle('hidden', !G.learn);
  };
  $('#btnExit').onclick = exitToMenu;
  $('#live').addEventListener('click', e => { if (G) infoAt(G.lv, G.car, e.clientX, e.clientY - 20, G.state, G.car); });

  // ═════════════════════════ 데이터 구조 모달 ═════════════════════════
  function showData() {
    const lv = LEVELS[selected];
    const ov = $('#overlay');
    const rows = Object.entries(RULES).map(([k, r]) => `<tr><td><code>${k}</code></td><td>${r.name}</td><td>${r.stop || r.park ? '○' : '✕'}</td><td>${r.park ? '○' : '✕'}</td><td>${r.fine ? won(r.fine) : '—'}</td><td>${r.report ? '○' : ''}</td><td>${r.severity}</td><td>${r.law}</td></tr>`).join('');
    ov.innerHTML = `<div class="modal">
      <h2>입력 데이터 구조</h2>
      <p>레벨은 <code>levels.js</code>, 구역 규칙은 <code>rules.js</code>, 판정 함수는 <code>judge.js</code>에 있습니다. 판정은 차체 9개 점(네 모서리·네 변 중점·중심)이 걸친 구역 중 <b>가장 엄격한(severity가 큰) 규칙</b>을 적용합니다. 정차 의도라도 5분을 넘기면 주차로 바뀝니다.</p>
      <h2>구역 규칙표 (rules.js)</h2>
      <table><tr><th>키</th><th>이름</th><th>정차</th><th>주차</th><th>과태료</th><th>신고</th><th>엄격도</th><th>근거</th></tr>${rows}</table>
      <h2 style="margin-top:12px">레벨 ${lv.id} 데이터 (levels.js)</h2>
      <pre>${JSON.stringify(lv, (k, v) => (typeof v === 'number' ? +v.toFixed(3) : v), 2).replace(/</g, '&lt;')}</pre>
      <div class="actions"><button class="btn" id="mClose">닫기</button></div></div>`;
    ov.classList.remove('hidden');
    $('#mClose').onclick = () => ov.classList.add('hidden');
  }

  addEventListener('resize', () => { if (!$('#preview').classList.contains('hidden')) drawMini(); });
  document.fonts?.ready.then(() => drawMini());
  renderPreview();
  requestAnimationFrame(loop);

  // 디버그·자동 테스트용
  window.__game = { get G() { return G; }, startLevel, setGear, onPark, endCall, exitToMenu };
})();
