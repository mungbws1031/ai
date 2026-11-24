/* day.js — '주차 한 판': 3일 진행 · 직접 운전 · 자석 주차 · 볼일 보는 동안 빨리 감기 · 지갑 정산 */
(() => {
  'use strict';
  const J = window.Judge, R = window.PGRender, D = window.DaySim, { DAYS, preparePlace } = window.DayPlaces;
  const PI = Math.PI, CAR = J.CAR, M = D.MONEY;
  const $ = s => document.querySelector(s);
  const won = n => (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('ko-KR') + '원';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장이 막힌 환경: 진행만 저장 안 됨 */ } },
  };
  const KEY = 'pg-day-progress';
  const progress = () => { const p = store.get(KEY, null); return { unlocked: clamp(p?.unlocked || 1, 1, DAYS.length), best: p?.best || {} }; };
  const buzz = ms => { try { navigator.vibrate?.(ms); } catch { /* 진동 없음 */ } };
  const hhmm = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fmt = min => { min = Math.round(min) % 1440; return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`; };

  const cv = $('#cv'), ctx = cv.getContext('2d');
  let S = null;

  // ─── 카드 ───
  function card(html, buttons) {
    $('#card').innerHTML = html + `<div class="btns">${buttons.map((b, i) => `<button class="go ${b.sub ? 'sub' : ''}" data-i="${i}">${b.label}</button>`).join('')}</div>`;
    $('#cardWrap').classList.remove('hidden');
    $('#card').querySelectorAll('.btns .go').forEach(el => el.onclick = () => { $('#cardWrap').classList.add('hidden'); buttons[+el.dataset.i].fn(); });
    $('#card').scrollTop = 0;
  }
  function title() {
    S = null;
    const pr = progress();
    $('#card').innerHTML = `<h2>주차 한 판</h2>
      <p>지갑에 <b>${won(M.START)}</b> 들고 하루를 돌아요. <b>노란 단속원</b>은 길을 오가고, <b>주민</b>은 주황색 시야로 두리번거려요.</p>
      <p class="why">왼쪽 동그라미를 가고 싶은 쪽으로 밀기 · 차 뒤로 당기면 후진. 칸 근처에서 멈추면 점선 차가 보이고 <b>P</b>로 맞춰 줘요. 자석 없이 반듯이 넣으면 +${won(M.SKILL)}.</p>
      <div class="days">${DAYS.map((d, i) => `<button class="daybtn" data-d="${i}" ${i + 1 > pr.unlocked ? 'disabled' : ''}>
        <span><b>${d.title}</b><small>${d.places.map(p => p.who).join(' · ')}${i + 1 > pr.unlocked ? ' — 전날을 버티면 열려요' : ''}</small></span>
        <span class="rec">${pr.best[d.day] != null ? '최고 ' + won(pr.best[d.day]) : ''}</span></button>`).join('')}</div>
      <a class="classic" href="classic.html">예전 연습 모드(판단 퀴즈·직접 운전) →</a>`;
    $('#cardWrap').classList.remove('hidden');
    $('#card').querySelectorAll('.daybtn').forEach(b => b.onclick = () => { $('#cardWrap').classList.add('hidden'); startDay(+b.dataset.d); });
    setMoney(0);
  }
  function startDay(di) { S = { di, day: DAYS[di], money: M.START, log: [] }; setMoney(0); place(0); }
  function place(i) {
    const day = S.day, P = preparePlace(window.LEVELS, day.places[i], day.hard), pl = P.place, lv = P.lv;
    Object.assign(S, { i, P, pl, lv, parked: P.parked, left: pl.limit, crash: 0, cool: 0, ff: null, done: false, running: false,
      snap: null, ghost: null, usedSnap: false, car: { x: lv.start.x, y: lv.start.y, heading: lv.start.heading, v: 0, steer: 0 }, clock: hhmm(lv.clock) });
    const guards = pl.guards > 1 ? `${pl.guard} ${pl.guards}명` : `${pl.guard} 1명`;
    $('#mission').innerHTML = `<b>${S.day.day}일차 ${i + 1}/${day.places.length} · ${pl.who}</b> — ${pl.task} ${P.stay}분<br><span style="color:#9aa3ad">${guards} · 지켜보는 주민 ${P.watchers.length}명</span>`;
    card(`<h2>${i + 1}. ${lv.title}</h2><p>${pl.task}, 오늘은 <b>${P.stay}분</b> 걸려요. <b>${pl.limit}초 안에</b> 세우면 약속 보너스 <b>+${won(M.ON_TIME)}</b>.</p>
      <p class="why">${pl.guard}은 ${pl.loop}분마다 한 바퀴 돌아요. 오래 머물수록 마주칠 확률이 커집니다.</p>
      <p>지갑: <b>${won(S.money)}</b></p>`, [{ label: '운전 시작', fn: () => { S.running = true; } }]);
  }

  // ─── 입력 ───
  const keys = {}, stick = { on: false, mag: 0, ang: 0, rev: false };
  const stEl = $('#stick'), knob = $('#knob');
  function stickMove(e) {
    const r = stEl.getBoundingClientRect(), R0 = r.width / 2;
    let dx = e.clientX - (r.left + R0), dy = e.clientY - (r.top + R0);
    const dd = Math.hypot(dx, dy), lim = R0 * 0.62;
    if (dd > lim) { dx *= lim / dd; dy *= lim / dd; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    stick.mag = Math.min(1, dd / lim); stick.ang = Math.atan2(dy, dx);
  }
  stEl.addEventListener('pointerdown', e => { e.preventDefault(); stEl.setPointerCapture(e.pointerId); stick.on = true; stickMove(e); });
  stEl.addEventListener('pointermove', e => { if (stick.on) stickMove(e); });
  const stickOff = () => { stick.on = false; stick.mag = 0; knob.style.transform = ''; };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => stEl.addEventListener(ev, stickOff));
  const KM = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'gas', ArrowDown: 'back' };
  addEventListener('keydown', e => { if (KM[e.key]) { keys[KM[e.key]] = true; e.preventDefault(); } if (e.key === ' ' || e.key === 'p') tryPark(); });
  addEventListener('keyup', e => { if (KM[e.key]) keys[KM[e.key]] = false; });
  addEventListener('blur', () => Object.keys(keys).forEach(k => keys[k] = false));
  $('#parkBtn').onclick = () => tryPark();
  $('#quit').onclick = () => title();

  // ─── 운전 ───
  function step(dt) {
    const c = S.car;
    let target = 0, vt = 0;
    if (stick.on && stick.mag > 0.15) {
      const df = wrap(stick.ang - c.heading), off = Math.abs(df);
      if (stick.rev ? off < 1.2 : off > 1.95) stick.rev = !stick.rev;
      if (!stick.rev) { target = clamp(df / 0.55, -1, 1); vt = stick.mag * 4; }
      else { target = -clamp(wrap(stick.ang - c.heading - PI) / 0.55, -1, 1); vt = -stick.mag * 2.5; }
    } else { target = keys.left ? -1 : keys.right ? 1 : 0; vt = keys.gas ? 5 : keys.back ? -2.5 : 0; }
    c.steer += clamp(target - c.steer, -dt * 4, dt * 4);
    const dv = vt - c.v, a = Math.sign(dv) === Math.sign(c.v) || !c.v ? 3.5 : 7;
    c.v += clamp(dv, -a * dt, a * dt);
    if (Math.abs(c.v) < 0.02 && !vt) c.v = 0;
    if (!c.v) return;
    const st = c.steer * 42 * PI / 180;
    const nx = { heading: c.heading + c.v / CAR.wheelbase * Math.tan(st) * dt, x: c.x + Math.cos(c.heading) * c.v * dt, y: c.y + Math.sin(c.heading) * c.v * dt };
    const h = D.hitTest(S.lv, S.parked, nx);
    if (h) {
      if (h === 'car' && Math.abs(c.v) > 1.6 && S.cool <= 0) { S.crash++; S.cool = 1.5; pay(-M.CRASH); buzz(60); flash('쿵! 수리비 ' + won(-M.CRASH), '#ff5a5a'); }
      c.v = 0; return;
    }
    Object.assign(c, nx);
  }
  function pay(n) { S.money += n; setMoney(n); }
  function setMoney(n) {
    $('#money').textContent = won(S ? S.money : M.START);
    if (n < 0) { const w = $('#wallet'); w.classList.remove('hit'); void w.offsetWidth; w.classList.add('hit'); }
  }
  let flashT = 0;
  function flash(text, color = '#fff') { const f = $('#flash'); f.textContent = text; f.style.color = color; f.classList.remove('hidden'); flashT = 1.6; }

  // ─── 세우기 ───
  function tryPark() {
    if (!S || !S.running || S.ff || S.snap || Math.abs(S.car.v) > 0.3) return;
    S.running = false;
    const t = D.snapTarget(S.lv, S.parked, S.car);
    if (t && (Math.hypot(t.x - S.car.x, t.y - S.car.y) > 0.05 || Math.abs(wrap(t.heading - S.car.heading)) > 0.01)) {
      S.usedSnap = true;
      S.snap = { from: { x: S.car.x, y: S.car.y, heading: S.car.heading }, to: t, k: 0 };
      return;
    }
    doPark();
  }
  function doPark() {
    S.snap = null;
    const { P, pl, lv } = S, pose = { x: S.car.x, y: S.car.y, heading: S.car.heading }, stay = P.stay, t0 = S.clock;
    const judgement = J.judgePose(lv, pose, 'park', { minutes: stay, clockMin: t0 });
    const sim = D.simulateStay({ lv, place: pl, phase: P.phase, watchers: P.watchers, pose, judgement, t0, stay });
    S.ff = { t: 0, dur: 2.5 + stay / 60 * 2.5, pose, judgement, t0, stay, ...sim };
  }
  function settle() {
    const { judgement: j, res, stay } = S.ff, pl = S.pl, r = j.rule;
    const skill = !S.usedSnap && j.legal && !!j.inSlot && j.align.score >= 80;
    const lines = D.settleLines(res, j, { late: S.left < 0, guard: pl.guard, skill });
    const sum = lines.reduce((a, l) => a + l[1], 0);
    S.money += sum; setMoney(sum);
    if (res.fined || res.tow != null) buzz([60, 80, 60]);
    const tone = res.bad ? '#c0262d' : res.manner ? '#6b3fb8' : '#1f7a48';
    const tag = res.bad ? '위반' : res.manner ? '비매너' : '합법';
    S.log.push({ who: pl.who, rule: r, tag, sum: sum - S.crash * M.CRASH, stay });
    const last = S.i === S.day.places.length - 1, broke = S.money < 0;
    card(`<h2>${pl.who} 정산</h2><p>세운 곳: <b style="color:${tone}">${r.name} (${tag})</b> · ${stay}분</p>
      <div class="lines">${S.crash ? `<div><span>운전 중 접촉 사고 ${S.crash}번 (이미 냄)</span><span class="minus">${won(-S.crash * M.CRASH)}</span></div>` : ''}${lines.map(([t, n]) => `<div><span>${t}</span><span class="${n < 0 ? 'minus' : n > 0 ? 'plus' : ''}">${n ? (n > 0 ? '+' : '') + won(n) : '—'}</span></div>`).join('')}</div>
      <p class="why">${r.easy || r.desc}</p>
      <p>지갑: <b class="big">${won(S.money)}</b></p>`,
      [{ label: broke ? '파산… 오늘의 기록' : last ? '하루 마감' : '다음 장소로', fn: () => (broke || last ? endDay(broke) : place(S.i + 1)) }]);
  }
  function endDay(broke) {
    const m = S.money, d = S.day, pr = progress();
    const isBest = !broke && (pr.best[d.day] == null || m > pr.best[d.day]);
    if (!broke) {
      if (isBest) pr.best[d.day] = m;
      pr.unlocked = Math.max(pr.unlocked, Math.min(DAYS.length, S.di + 2));
      store.set(KEY, pr);
    }
    const rank = broke ? '파산' : m >= 90000 ? '주차의 신' : m >= 70000 ? '주차 고수' : m >= 50000 ? '무난한 하루' : m >= 25000 ? '지갑이 얇아짐' : '거의 털림';
    const next = !broke && S.di + 1 < DAYS.length;
    const rows = S.log.map(l => `<div class="rec-row"><div class="top"><span><b>${l.who}</b> — ${l.rule.short} · ${l.tag} · ${l.stay}분</span><span class="${l.sum < 0 ? 'minus' : 'plus'}">${(l.sum > 0 ? '+' : '') + won(l.sum)}</span></div>
      <div class="easy">${l.rule.easy || l.rule.desc}</div><details><summary>근거 보기</summary>${l.rule.law}</details></div>`).join('');
    const btns = [];
    if (next) btns.push({ label: `${S.di + 2}일차로`, fn: () => startDay(S.di + 1) });
    btns.push({ label: broke ? '다시 도전' : '이 날 다시', fn: () => startDay(S.di), sub: next });
    btns.push({ label: '처음 화면', fn: title, sub: true });
    card(`<h2>${d.title.split(' · ')[0]} — ${rank}${isBest ? ' · 최고 기록!' : ''}</h2>
      <p>남은 돈 <b class="big">${won(m)}</b> <span class="why">(시작 ${won(M.START)})</span></p>
      <h3 style="margin:10px 0 0;font-size:15px">오늘의 기록</h3>${rows}
      ${broke ? '<p class="why">돈이 바닥나 하루를 못 버텼어요. 다음 날은 버텨야 열립니다.</p>' : ''}`, btns);
  }

  // ─── 그리기 ───
  function camera(w, h) {
    const ppm = Math.max(w / 44, h / 24), c = S.car, lv = S.lv;
    let cx = c.x + Math.cos(c.heading) * c.v * 0.6, cy = c.y + Math.sin(c.heading) * c.v * 0.6;
    const hw = w / 2 / ppm, hh = h / 2 / ppm;
    cx = lv.world.w < 2 * hw ? lv.world.w / 2 : clamp(cx, hw, lv.world.w - hw);
    cy = lv.world.h < 2 * hh ? lv.world.h / 2 : clamp(cy, hh, lv.world.h - hh);
    return { cx, cy, ppm, w, h };
  }
  function drawAgents(cam, dpr, t, showRoute) {
    const { pl, P } = S, k = cam.ppm;
    const W = (x, y) => [(x - cam.cx) * k + cam.w / 2, (y - cam.cy) * k + cam.h / 2];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (showRoute) {
      const [a, b] = pl.patrol.map(p => W(p[0], p[1]));
      ctx.strokeStyle = 'rgba(255,210,58,.25)'; ctx.lineWidth = 3; ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); ctx.setLineDash([]);
    }
    (S.lv.props || []).filter(p => p.type === 'cctv').forEach(p => { const [x, y] = W(p.x, p.y); ctx.strokeStyle = 'rgba(255,90,90,.35)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(x, y, p.r * k, 0, 2 * PI); ctx.stroke(); ctx.setLineDash([]); });
    P.watchers.forEach(w => {
      const [x, y] = W(w.x, w.y), a = D.watchAng(w, t);
      ctx.fillStyle = 'rgba(255,150,40,.20)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, D.SEE_R * k, a - D.SEE_HALF, a + D.SEE_HALF); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.arc(x, y, Math.max(6, 0.5 * k), 0, 2 * PI); ctx.fill();
      ctx.fillStyle = '#2b2118'; ctx.beginPath(); ctx.arc(x, y, Math.max(3, 0.25 * k), 0, 2 * PI); ctx.fill();
    });
    D.guardsAt(pl, P.phase, t).forEach(e => {
      const [ex, ey] = W(e.x, e.y);
      ctx.fillStyle = 'rgba(255,210,58,.15)'; ctx.beginPath(); ctx.arc(ex, ey, D.ENC_R * k, 0, 2 * PI); ctx.fill();
      ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(ex, ey, Math.max(7, 0.55 * k), 0, 2 * PI); ctx.fill();
      ctx.fillStyle = '#17202a'; ctx.font = `${Math.max(10, 0.5 * k)}px "Do Hyeon", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('단속', ex, ey);
      if (ex < 0 || ex > cam.w || ey < 0 || ey > cam.h) {
        const cx = clamp(ex, 70, cam.w - 70), cy = clamp(ey, 90, cam.h - 30);
        ctx.fillStyle = 'rgba(255,210,58,.9)'; ctx.font = '15px "Do Hyeon", sans-serif';
        ctx.fillText(`단속 ${ex < 0 ? '◀' : ex > cam.w ? '▶' : ey < 0 ? '▲' : '▼'} ${Math.round(Math.hypot(e.x - S.car.x, e.y - S.car.y))}m`, cx, cy);
      }
    });
    ctx.textBaseline = 'alphabetic';
  }
  function drawFF(cam, dpr, ff) {
    const k = ff.t / ff.dur, m = ff.stay * k;
    const W = (x, y) => [(x - cam.cx) * cam.ppm + cam.w / 2, (y - cam.cy) * cam.ppm + cam.h / 2];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '24px "Do Hyeon", sans-serif'; ctx.textAlign = 'center';
    const [px, py] = W(ff.pose.x, ff.pose.y);
    ff.ev.filter(e => m >= e.m && m < e.m + Math.max(3, ff.stay * 0.12)).forEach(e => {
      if (e.k === 'enc') { ctx.fillStyle = '#ffd23a'; ctx.fillText(`${S.pl.guard}: 어? 이 차…`, px, py - 34); }
      if (e.k === 'look') { const w = S.P.watchers[e.wi], [x, y] = W(w.x, w.y); ctx.fillStyle = '#ff9a2a'; ctx.fillText('👀', x, y - 18); }
      if (e.k === 'photo') { ctx.fillStyle = '#fff'; ctx.fillText('📸 찰칵 · 찰칵', px, py - 56); }
      if (e.k === 'cctv') { ctx.fillStyle = '#ff5a5a'; ctx.fillText('● CCTV 촬영', px, py + 44); }
      if (e.k === 'tow') { ctx.fillStyle = '#ffd23a'; ctx.fillText('🚚 견인차 도착', px, py - 78); }
    });
    if (ff.res.tow != null && m >= ff.res.tow) S.car.x = ff.pose.x - (m - ff.res.tow) * 3;
    ctx.font = '36px "Do Hyeon", sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(`${fmt(ff.t0 + m)}  볼일 보는 중… (${Math.round(m)}/${ff.stay}분)`, cam.w / 2, cam.h * 0.64);
  }

  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (flashT > 0) { flashT -= dt; if (flashT <= 0) $('#flash').classList.add('hidden'); }
    const { w, h, dpr } = R.sizeCanvas(cv);
    if (!S || !S.lv) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#2b3036'; ctx.fillRect(0, 0, w, h); return; }
    if (S.running) { for (let i = 0; i < 3; i++) step(dt / 3); S.cool -= dt; S.left -= dt; S.clock += dt * 0.5; }
    if (S.snap) {
      const sn = S.snap; sn.k = Math.min(1, sn.k + dt / 0.45);
      const e = 1 - (1 - sn.k) ** 3, dh = wrap(sn.to.heading - sn.from.heading);
      Object.assign(S.car, { x: sn.from.x + (sn.to.x - sn.from.x) * e, y: sn.from.y + (sn.to.y - sn.from.y) * e, heading: sn.from.heading + dh * e, v: 0 });
      if (sn.k >= 1) doPark();
    }
    S.ghost = S.running && Math.abs(S.car.v) < 1.2 ? D.snapTarget(S.lv, S.parked, S.car) : null;
    let t = S.clock;
    if (S.ff) {
      if (!S.done) { S.ff.t = Math.min(S.ff.dur, S.ff.t + dt); if (S.ff.t >= S.ff.dur) { S.done = true; setTimeout(settle, 400); } }
      t = S.ff.t0 + S.ff.stay * (S.ff.t / S.ff.dur);
    }
    const cam = camera(w, h);
    R.drawWorld(ctx, S.lv, cam, { dpr, learn: false, state: {}, parked: S.parked, player: { ...S.car, gear: S.car.v < -0.05 ? 'R' : 'D', brakeOn: false }, showDest: S.running, t: now / 1000 });
    drawAgents(cam, dpr, t, S.running);
    if (S.ghost) {
      ctx.setTransform(dpr * cam.ppm, 0, 0, dpr * cam.ppm, dpr * (cam.w / 2 - cam.cx * cam.ppm), dpr * (cam.h / 2 - cam.cy * cam.ppm));
      R.drawCar(ctx, S.ghost, '#ffffff', { ghost: true });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gx = (S.ghost.x - cam.cx) * cam.ppm + cam.w / 2, gy = (S.ghost.y - cam.cy) * cam.ppm + cam.h / 2;
      ctx.font = '15px "Do Hyeon", sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('멈추고 P → 여기에 맞춰요', gx, gy - 24);
    }
    if (S.running && stick.on && stick.mag > 0.15) {
      const sx = (S.car.x - cam.cx) * cam.ppm + cam.w / 2, sy = (S.car.y - cam.cy) * cam.ppm + cam.h / 2, L = 40 + 60 * stick.mag;
      ctx.strokeStyle = stick.rev ? 'rgba(255,90,90,.85)' : 'rgba(255,255,255,.8)'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(stick.ang) * L, sy + Math.sin(stick.ang) * L); ctx.stroke(); ctx.setLineDash([]);
      if (stick.rev) { ctx.font = '18px "Do Hyeon", sans-serif'; ctx.fillStyle = '#ff8080'; ctx.textAlign = 'center'; ctx.fillText('후진', sx, sy - 26); }
    }
    if (S.ff) drawFF(cam, dpr, S.ff);
    const tt = Math.ceil(Math.abs(S.left));
    $('#timer').textContent = (S.left < 0 ? '+' : '') + `${Math.floor(tt / 60)}:${String(tt % 60).padStart(2, '0')}`;
    $('#timer').classList.toggle('late', S.left < 0);
    $('#parkBtn').disabled = !S.running || Math.abs(S.car.v) > 0.3;
    $('#parkBtn').classList.toggle('glow', !!S.ghost && Math.abs(S.car.v) <= 0.3);
  }
  requestAnimationFrame(loop);
  title();
  window.__day = { get S() { return S; }, tryPark, startDay, place, title, keys, stick };
})();
