/* 챙겨줘 트립 — 화면 · 저장 · 알림 */
(function () {
  const { COUNTRIES, COURSES, AIRPORTS } = window.TRIP_DATA;
  const E = window.TripEngine;
  const $ = (s) => document.querySelector(s);
  const app = $('#app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const maps = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const dir = (a, b) => `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(a)}&destination=${encodeURIComponent(b)}&travelmode=transit`;

  /* ── 저장 (기기 안에만) ── */
  const KEY = 'chaenggyeo-trip-v1';
  let S = { trips: [], family: [], settings: { intensity: 'normal' } };
  try { const raw = localStorage.getItem(KEY); if (raw) S = { ...S, ...JSON.parse(raw) }; } catch (e) { /* 비공개 모드 등 */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('이 브라우저에선 저장이 안 돼요. 일반 창에서 열어 주세요.'); } };

  const TYPES = { adult: '어른', child: '아이 (2~12세)', infant: '아기 (0~1세)', senior: '어르신' };
  const TAGS = { allergy: '음식 알레르기', meds: '매일 먹는 약', mobility: '오래 걷기 힘듦', nospicy: '매운 음식 못 먹음', veg: '채식', motion: '멀미' };
  const INTENSITY = { gentle: ['순하게', '하루 한 번', 24], normal: ['보통', '반나절마다', 12], persistent: ['끈질기게', '3시간마다', 3] };

  function toast(msg) {
    document.querySelectorAll('.toast').forEach((x) => x.remove());
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }

  /* ── 여행 상태 계산 ── */
  const tripOf = (id) => S.trips.find((t) => t.id === id);
  function phase(trip) {
    const t = E.today(), d = E.diff(t, trip.start), end = E.addDays(trip.start, trip.nights);
    if (d > 0) return { kind: 'before', d, text: `D-${d}` };
    if (d === 0) return { kind: 'day', d, text: 'D-DAY' };
    if (E.diff(t, end) >= 0) return { kind: 'during', d, text: `${1 - d}일차` };
    return { kind: 'after', d, text: '다녀옴' };
  }
  function taskList(trip) {
    const st = trip.state || {};
    return E.tasks(trip).map((x) => ({ ...x, ...(st[x.id] || {}), done: !!(st[x.id] && st[x.id].done) }));
  }
  function dueTasks() {
    const t = E.today(), out = [];
    S.trips.forEach((trip) => {
      if (phase(trip).kind === 'after') return;
      taskList(trip).forEach((x) => { if (!x.done && x.date <= t) out.push({ ...x, trip }); });
    });
    return out.sort((a, b) => (b.red - a.red) || a.date.localeCompare(b.date));
  }
  function nextTrip() {
    return S.trips.filter((t) => phase(t).kind !== 'after').sort((a, b) => a.start.localeCompare(b.start))[0];
  }

  /* ── 공통 조각 ── */
  function board(trip, big) {
    const c = E.course(trip.courseId), ph = phase(trip);
    const cells = ph.text.split('').map((ch, i) => `<span class="flap" style="--i:${i}">${esc(ch)}</span>`).join('');
    return `<section class="board${big ? ' big' : ''}${flipOnce ? ' flip' : ''}" aria-label="${esc(c.name)} ${esc(ph.text)}">
      <div class="flaps" aria-hidden="true">${cells}</div>
      <div class="board-meta">
        <strong>${esc(trip.title || c.name)}</strong>
        <span class="route"><b>${esc(trip.from)}</b> ✈ <b>${esc(c.air)}</b></span>
        <span>${esc(E.label(trip.start))} 출발 · ${trip.nights}박 ${trip.nights + 1}일 · ${trip.members.length}명</span>
      </div></section>`;
  }
  function taskRow(x, opts = {}) {
    const t = E.today(), late = E.diff(x.date, t);
    const when = x.done ? '완료' : late > 0 ? `${late}일 지남` : late === 0 ? '오늘' : `${E.label(x.date)} · D${x.off >= 0 ? '+' : ''}${x.off}`;
    const trip = opts.trip;
    const owner = trip && x.owner ? (trip.members.find((m) => m.id === x.owner) || {}).name : '';
    return `<li class="task${x.red ? ' red' : ''}${x.done ? ' done' : ''}${!x.done && late > 0 ? ' late' : ''}">
      <label class="check"><input type="checkbox" data-act="toggle" data-trip="${trip.id}" data-task="${x.id}" ${x.done ? 'checked' : ''}>
        <span class="box" aria-hidden="true"></span>
        <span class="t-body"><span class="t-title">${esc(x.t)}</span>
          <span class="t-when">${esc(when)}${owner ? ` · 담당 ${esc(owner)}` : ''}${opts.showTrip ? ` · ${esc(E.course(trip.courseId).name)}` : ''}</span></span></label>
      ${opts.expand ? `<details class="t-more"><summary>자세히</summary>
        ${x.why ? `<p>${esc(x.why)}</p>` : ''}
        <div class="t-actions">
          ${x.link ? `<a class="btn small" href="${esc(x.link)}" target="_blank" rel="noopener">바로 하러 가기</a>` : ''}
          ${!x.done && late >= 0 && (x.snooze || 0) < 3 ? `<button class="btn small ghost" data-act="snooze" data-trip="${trip.id}" data-task="${x.id}">이따 다시 알려줘 (${3 - (x.snooze || 0)}번 남음)</button>` : ''}
          <label class="owner">담당 <select data-act="owner" data-trip="${trip.id}" data-task="${x.id}"><option value="">정하지 않음</option>${trip.members.filter((m) => m.type === 'adult' || m.type === 'senior').map((m) => `<option value="${m.id}" ${x.owner === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label>
        </div></details>` : ''}
    </li>`;
  }

  /* ── 홈 ── */
  function viewHome() {
    const nt = nextTrip(), due = dueTasks(), past = S.trips.filter((t) => phase(t).kind === 'after');
    if (!S.trips.length) {
      return `<header class="top"><h1>챙겨줘 트립</h1><a class="icon-link" href="#/settings" aria-label="설정">⚙</a></header>
      <section class="empty">
        <div class="board big demo" aria-hidden="true"><div class="flaps">${'D-60'.split('').map((c, i) => `<span class="flap" style="--i:${i}">${c}</span>`).join('')}</div></div>
        <h2>어디로, 누구랑 가요?</h2>
        <p>나라와 코스, 함께 갈 가족만 고르면 준비물·일정·맛집·D-day 할 일을 한 번에 짜드려요. 할 일은 끝낼 때까지 계속 알려드려요.</p>
        <a class="btn primary wide" href="#/new">여행 만들기</a>
      </section>`;
    }
    return `<header class="top"><h1>챙겨줘 트립</h1><a class="icon-link" href="#/settings" aria-label="설정">⚙</a></header>
      ${nt ? `<a class="board-link" href="#/trip/${nt.id}/tasks">${board(nt, true)}</a>` : ''}
      <section class="today">
        <h2>오늘 할 일 <span class="count">${due.length}</span></h2>
        ${due.length ? `<ul class="tasks">${due.slice(0, 3).map((x) => taskRow(x, { trip: x.trip, showTrip: S.trips.length > 1 })).join('')}</ul>
          ${due.length > 3 ? `<p class="more">나머지 ${due.length - 3}개는 여행 화면에 있어요. 하나씩 끝내면 다음 걸 보여드릴게요.</p>` : ''}`
        : `<p class="calm">오늘은 할 일이 없어요. 다음 할 일 날짜가 되면 알려드릴게요.</p>`}
      </section>
      <section class="trips">
        <h2>내 여행</h2>
        <ul class="trip-list">${S.trips.filter((t) => phase(t).kind !== 'after').sort((a, b) => a.start.localeCompare(b.start)).map((t) => tripLine(t)).join('')}</ul>
        ${past.length ? `<details class="past"><summary>다녀온 여행 ${past.length}개</summary><ul class="trip-list">${past.map((t) => tripLine(t)).join('')}</ul></details>` : ''}
        <a class="btn wide" href="#/new">새 여행 만들기</a>
      </section>`;
  }
  function tripLine(t) {
    const c = E.course(t.courseId), ph = phase(t), tl = taskList(t), done = tl.filter((x) => x.done).length;
    return `<li><a href="#/trip/${t.id}/tasks"><span class="tl-d">${esc(ph.text)}</span>
      <span class="tl-main"><strong>${esc(c.name)}</strong><span>${esc(COUNTRIES[c.c].name)} · ${esc(E.label(t.start))} · 할 일 ${done}/${tl.length}</span></span></a></li>`;
  }

  /* ── 새 여행 (5단계) ── */
  let W = null;
  const newW = () => ({ step: 1, region: '일본', c: '', courseId: '', start: E.addDays(E.today(), 60), nights: 0, from: 'ICN', members: [] });
  function viewNew() {
    if (!W) W = newW();
    const steps = ['나라', '코스', '날짜', '가족', '확인'];
    const head = `<header class="top sub"><a class="icon-link" href="#/" aria-label="닫기">✕</a><h1>여행 만들기</h1></header>
      <ol class="steps" aria-label="진행 단계">${steps.map((s, i) => `<li class="${i + 1 === W.step ? 'on' : i + 1 < W.step ? 'past' : ''}" ${i + 1 === W.step ? 'aria-current="step"' : ''}>${s}</li>`).join('')}</ol>`;
    let body = '';
    if (W.step === 1) {
      const regions = [...new Set(Object.values(COUNTRIES).map((k) => k.region))];
      body = `<h2 class="q">어느 나라로 가요?</h2>
        ${regions.map((r) => `<h3 class="region">${esc(r)}</h3><div class="chips">${Object.entries(COUNTRIES).filter(([, k]) => k.region === r).map(([id, k]) => {
          const n = COURSES.filter((c) => c.c === id).length;
          return `<button class="chip${W.c === id ? ' on' : ''}" data-act="pick-country" data-id="${id}">${esc(k.name)}<small>코스 ${n}</small></button>`;
        }).join('')}</div>`).join('')}`;
    }
    if (W.step === 2) {
      body = `<h2 class="q">${esc(COUNTRIES[W.c].name)} — 어떤 코스로 갈까요?</h2>
        <ul class="courses">${COURSES.filter((c) => c.c === W.c).map((c) => `<li><button class="course${W.courseId === c.id ? ' on' : ''}" data-act="pick-course" data-id="${c.id}">
          <strong>${esc(c.name)}</strong><span class="c-meta">${c.nights}박 ${c.nights + 1}일 · ${esc(c.airName)} · 숙소 ${esc(c.base)}</span>
          <span class="c-days">${c.days.map((d) => esc(d.t)).join(' → ')}</span>
          <span class="c-tip">${esc(c.tip)}</span></button></li>`).join('')}</ul>`;
    }
    if (W.step === 3) {
      const c = E.course(W.courseId);
      body = `<h2 class="q">언제 떠나요?</h2>
        <div class="form">
          <label>출발일<input type="date" id="w-start" value="${W.start}" min="${E.today()}"></label>
          <label>며칠 묵어요? <span class="hint">추천 ${c.nights}박 — 줄이면 덜 중요한 날부터 빠지고, 늘리면 쉬는 날이 들어가요.</span>
            <div class="stepper"><button class="btn ghost" data-act="nights" data-d="-1" aria-label="하루 줄이기">−</button><output id="w-nights">${W.nights}박 ${W.nights + 1}일</output><button class="btn ghost" data-act="nights" data-d="1" aria-label="하루 늘리기">+</button></div></label>
          <label>출발 공항<select id="w-from">${AIRPORTS.map(([code, n]) => `<option value="${code}" ${W.from === code ? 'selected' : ''}>${n} (${code})</option>`).join('')}</select></label>
        </div>`;
    }
    if (W.step === 4) {
      const saved = S.family.filter((f) => !W.members.some((m) => m.id === f.id));
      body = `<h2 class="q">누구랑 가요?</h2>
        <p class="lead">아이 나이·여권 만료일·알레르기를 넣으면 준비물과 할 일이 사람에 맞게 바뀌어요.</p>
        ${W.members.length ? `<ul class="members">${W.members.map((m) => memberLine(m, 'w-remove')).join('')}</ul>` : ''}
        ${saved.length ? `<h3 class="region">저장된 가족</h3><div class="chips">${saved.map((f) => `<button class="chip" data-act="w-add-saved" data-id="${f.id}">+ ${esc(f.name)}<small>${esc(TYPES[f.type].split(' ')[0])}</small></button>`).join('')}</div>` : ''}
        ${memberForm()}`;
    }
    if (W.step === 5) {
      const trip = { ...W, id: 'preview' };
      const cr = E.crew(W.members), tk = E.tasks(trip), late = tk.filter((x) => x.date < E.today());
      body = `<h2 class="q">이렇게 짜드릴게요</h2>
        ${board(trip, false)}
        <ul class="summary">
          <li><b>${E.itinerary(trip).length}일</b> 일정, 장소 ${E.itinerary(trip).reduce((n, d) => n + d.s.length, 0)}곳</li>
          <li><b>${tk.length}개</b> 할 일 — 출발일에서 거꾸로 날짜를 잡았어요</li>
          <li><b>${E.packing(trip).reduce((n, g) => n + g.items.length, 0)}개</b> 준비물${cr.infant ? ' (아기 용품 포함)' : cr.child ? ' (아이 용품 포함)' : ''}</li>
          ${late.length ? `<li class="warn"><b>${late.length}개</b>는 이미 날짜가 지났어요. 맨 위에 "지금 처리할 것"으로 모아 드릴게요.</li>` : ''}
        </ul>`;
    }
    const can = (W.step === 1 && W.c) || (W.step === 2 && W.courseId) || W.step === 3 || (W.step === 4 && W.members.length) || W.step === 5;
    const foot = `<footer class="wiz-foot">
      ${W.step > 1 ? '<button class="btn ghost" data-act="w-back">이전</button>' : '<span></span>'}
      ${W.step < 5 ? `<button class="btn primary" data-act="w-next" ${can ? '' : 'disabled'}>${W.step === 4 && !W.members.length ? '가족을 1명 이상 넣어 주세요' : '다음'}</button>`
        : '<button class="btn primary" data-act="w-create">여행 만들기</button>'}</footer>`;
    return head + `<main class="wiz">${body}</main>` + foot;
  }
  function memberLine(m, act) {
    const bits = [TYPES[m.type].split(' ')[0], m.age ? `${m.age}세` : '', m.passport ? `여권 ~${m.passport}` : '여권 만료일 없음', ...(m.tags || []).map((t) => TAGS[t])].filter(Boolean);
    return `<li><span><strong>${esc(m.name)}</strong><small>${esc(bits.join(' · '))}</small></span><button class="btn small ghost" data-act="${act}" data-id="${m.id}" aria-label="${esc(m.name)} 빼기">빼기</button></li>`;
  }
  function memberForm() {
    return `<form class="form member-form" data-act="w-add">
      <fieldset><legend>가족 추가</legend>
      <label>이름<input name="name" required placeholder="예: 엄마, 하준" maxlength="12"></label>
      <div class="row">
        <label>구분<select name="type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
        <label>나이<input name="age" type="number" min="0" max="110" inputmode="numeric" placeholder="선택"></label>
      </div>
      <label>여권 만료일 <span class="hint">모르면 비워 두세요 — 확인하라고 알려드려요</span><input name="passport" type="date"></label>
      <div class="tags" role="group" aria-label="챙길 점">${Object.entries(TAGS).map(([k, v]) => `<label class="tag"><input type="checkbox" name="tag" value="${k}"><span>${v}</span></label>`).join('')}</div>
      <label>알레르기 재료 <span class="hint">알레르기가 있을 때만</span><input name="allergy" placeholder="예: 땅콩, 새우" maxlength="30"></label>
      <label class="tag inline"><input type="checkbox" name="keep" checked><span>다음 여행에도 쓰게 가족 정보 저장</span></label>
      <button class="btn wide" type="submit">이 사람 추가</button></fieldset></form>`;
  }

  /* ── 여행 화면 ── */
  const TABS = [['tasks', '할 일'], ['plan', '일정'], ['pack', '준비물'], ['memo', '메모']];
  function viewTrip(id, tab) {
    const trip = tripOf(id);
    if (!trip) return `<section class="empty"><h2>여행을 찾을 수 없어요</h2><p>지워졌거나 다른 기기에서 만든 여행이에요.</p><a class="btn primary" href="#/">홈으로</a></section>`;
    const c = E.course(trip.courseId);
    let body = '';
    if (tab === 'tasks') body = viewTasks(trip);
    if (tab === 'plan') body = viewPlan(trip);
    if (tab === 'pack') body = viewPack(trip);
    if (tab === 'memo') body = viewMemo(trip);
    return `<header class="top sub"><a class="icon-link" href="#/" aria-label="홈으로">←</a><h1>${esc(c.name)}</h1></header>
      ${board(trip, false)}
      <nav class="tabs" aria-label="여행 메뉴">${TABS.map(([k, v]) => `<a href="#/trip/${id}/${k}" ${k === tab ? 'aria-current="page"' : ''}>${v}</a>`).join('')}</nav>
      <main class="trip-body">${body}</main>`;
  }

  function viewTasks(trip) {
    const all = taskList(trip), t = E.today();
    const late = all.filter((x) => !x.done && x.date < t), now = all.filter((x) => !x.done && x.date === t);
    const soon = all.filter((x) => !x.done && x.date > t), done = all.filter((x) => x.done);
    const pct = Math.round((done.length / all.length) * 100);
    const k = COUNTRIES[E.course(trip.courseId).c];
    const sec = (title, list, note) => list.length ? `<section class="t-sec"><h2>${title}<span class="count">${list.length}</span></h2>${note ? `<p class="note">${note}</p>` : ''}<ul class="tasks">${list.map((x) => taskRow(x, { trip, expand: true })).join('')}</ul></section>` : '';
    const notifOn = 'Notification' in window && Notification.permission === 'granted';
    return `<div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="할 일 진행률"><span style="width:${pct}%"></span><em>${done.length}/${all.length} 끝냄</em></div>
      ${!notifOn ? `<div class="banner"><p>알림을 켜면 할 일을 끝낼 때까지 ${INTENSITY[S.settings.intensity][1]} 알려드려요.</p><button class="btn small primary" data-act="notif">알림 켜기</button></div>` : ''}
      ${sec('지금 처리할 것', late, '날짜가 지났어요. 빨간 줄은 놓치면 되돌릴 수 없는 일이에요.')}
      ${sec('오늘', now)}
      ${sec('다가오는 할 일', soon)}
      ${done.length ? `<details class="t-sec"><summary>끝낸 일 ${done.length}개</summary><ul class="tasks">${done.map((x) => taskRow(x, { trip, expand: true })).join('')}</ul></details>` : ''}
      <section class="info">
        <h2>${esc(k.name)} 입국·생활 정보</h2>
        <dl><dt>비자</dt><dd>${esc(k.visa)}</dd><dt>돈</dt><dd>${esc(k.cur)}</dd><dt>전기</dt><dd>${esc(k.plug)}</dd></dl>
        <p class="note">입국 규정은 자주 바뀌어요. 출발 전 <a href="https://www.0404.go.kr/" target="_blank" rel="noopener">외교부 해외안전여행</a>에서 한 번 더 확인하세요.</p>
      </section>
      <section class="tools">
        <button class="btn wide" data-act="ics" data-trip="${trip.id}">휴대폰 캘린더에 할 일 넣기</button>
        <p class="note">앱을 닫아도 캘린더가 날짜마다 알려줘요. 아이폰·갤럭시 기본 캘린더에서 열 수 있어요.</p>
      </section>`;
  }

  function viewPlan(trip) {
    const days = E.itinerary(trip), c = E.course(trip.courseId), cr = E.crew(trip.members);
    const f = trip.filters || { k: cr.kids, v: cr.veg, nh: cr.nospicy };
    const wx = trip.weather || {};
    const foodOk = (tags) => (!f.k || tags.includes('k')) && (!f.v || tags.includes('v')) && (!f.nh || !tags.includes('h'));
    return `<div class="filter" role="group" aria-label="맛집 필터">
        <span>맛집</span>
        ${[['k', '아이 동반'], ['v', '채식'], ['nh', '안 매운 것']].map(([key, n]) => `<label class="tag"><input type="checkbox" data-act="filter" data-trip="${trip.id}" data-key="${key}" ${f[key] ? 'checked' : ''}><span>${n}</span></label>`).join('')}
      </div>
      ${cr.mobility ? '<p class="note">어르신·걷기 힘든 가족이 있어 계단·오르막 많은 곳에 쉬운 길을 함께 적었어요.</p>' : ''}
      <ol class="days">${days.map((d) => {
        const w = wx[d.date];
        const foods = (d.f || []).filter((x) => foodOk(x[2]));
        let prev = d.no === 1 ? c.airName : null;
        return `<li class="day"><header><span class="d-no">${d.no}일차</span><h2>${esc(d.t)}</h2><span class="d-date">${esc(E.label(d.date))}${w ? ` · ${w.min}~${w.max}°${w.rain >= 50 ? ` · 비 ${w.rain}%` : ''}` : ''}</span></header>
          ${d.free ? '<p class="note">아이 컨디션에 맞춰 숙소 수영장이나 근처 공원에서 쉬어 가는 날이에요.</p>' : ''}
          <ol class="spots">${d.s.map((sp) => {
            const from = prev; prev = sp.q;
            return `<li class="spot">
              <div class="leg">${esc(sp.t || '')}${from ? ` <a href="${dir(from, sp.q)}" target="_blank" rel="noopener">길찾기</a>` : ''}</div>
              <div class="sp-main"><a class="sp-name" href="${maps(sp.q)}" target="_blank" rel="noopener">${esc(sp.n)}</a>
                ${sp.k ? '<span class="badge kid">아이들이 좋아해요</span>' : ''}${sp.c ? '<span class="badge">복장 규정</span>' : ''}${sp.r ? '<span class="badge book">미리 예약</span>' : ''}</div>
              ${sp.warn ? `<p class="warn">${esc(sp.warn)}</p>` : ''}
            </li>`;
          }).join('')}</ol>
          ${d.s.length ? `<div class="food"><h3>근처 맛집</h3>
            ${foods.length ? `<ul>${foods.map(([n, q, tags]) => `<li><a href="${maps(q)}" target="_blank" rel="noopener">${esc(n)}</a>${tags.includes('h') ? ' <small>매움</small>' : ''}</li>`).join('')}</ul>`
              : '<p class="note">필터에 맞는 추천이 없어요. 아래 지도에서 찾아보세요.</p>'}
            <a class="more-link" href="${maps(`${(d.s[d.s.length - 1] || d.s[0]).q} 맛집`)}" target="_blank" rel="noopener">이 근처 맛집 지도에서 더 보기</a></div>` : ''}
        </li>`;
      }).join('')}</ol>`;
  }

  function viewPack(trip) {
    const groups = E.packing(trip), p = trip.packed || {};
    const total = groups.reduce((n, g) => n + g.items.length, 0), got = groups.reduce((n, g) => n + g.items.filter((i) => p[i.id]).length, 0);
    const doorDone = trip.door || {};
    return `<section class="door"><h2>집 나서기 전 문 앞 체크</h2>
        <div class="door-row">${E.DOOR.map((n) => `<label class="door-item${doorDone[n] ? ' on' : ''}"><input type="checkbox" data-act="door" data-trip="${trip.id}" data-name="${esc(n)}" ${doorDone[n] ? 'checked' : ''}><span>${esc(n)}</span></label>`).join('')}</div></section>
      <div class="progress" role="progressbar" aria-valuenow="${got}" aria-valuemin="0" aria-valuemax="${total}" aria-label="짐 싸기 진행률"><span style="width:${Math.round(got / total * 100)}%"></span><em>${got}/${total} 챙김</em></div>
      ${groups.map((g) => `<section class="pack"><h2>${esc(g.title)}</h2><ul>${g.items.map((i) => `<li><label class="check"><input type="checkbox" data-act="pack" data-trip="${trip.id}" data-item="${esc(i.id)}" ${p[i.id] ? 'checked' : ''}><span class="box" aria-hidden="true"></span><span class="t-title">${esc(i.n)}</span></label></li>`).join('')}</ul></section>`).join('')}`;
  }

  function viewMemo(trip) {
    const m = trip.memo || {};
    const field = (k, label, ph, area) => `<label>${label}${area ? `<textarea data-act="memo" data-trip="${trip.id}" data-key="${k}" rows="3" placeholder="${ph}">${esc(m[k] || '')}</textarea>` : `<input data-act="memo" data-trip="${trip.id}" data-key="${k}" value="${esc(m[k] || '')}" placeholder="${ph}">`}</label>`;
    return `<p class="lead">예약한 내용을 적어두면 비행기 모드에서도 볼 수 있어요.</p>
      <form class="form" onsubmit="return false">
        ${field('flightOut', '가는 비행기', '예: 7C1302 · 09:10 출발 · 예약번호 ABC123')}
        ${field('flightIn', '오는 비행기', '예: 7C1301 · 13:40 출발')}
        ${field('hotel', '숙소 이름', '예: 호텔 이름')}
        ${field('hotelAddr', '숙소 주소 (현지어)', '택시 기사에게 보여줄 주소를 붙여 넣으세요', true)}
        ${field('emergency', '비상 연락처', '영사콜센터 +82-2-3210-0404 · 보험사 긴급번호', true)}
        ${field('note', '기타 메모', '', true)}
      </form>
      <section class="danger"><h2>가족 · 여행 정보</h2>
        <ul class="members">${trip.members.map((x) => memberLine(x, 'trip-remove-member').replace(/data-act="trip-remove-member"/, `data-act="trip-remove-member" data-trip="${trip.id}"`)).join('')}</ul>
        <button class="btn ghost wide" data-act="delete-trip" data-trip="${trip.id}">이 여행 지우기</button></section>`;
  }

  /* ── 가족 / 설정 ── */
  function viewSettings() {
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    return `<header class="top sub"><a class="icon-link" href="#/" aria-label="홈으로">←</a><h1>설정</h1></header>
      <main class="settings">
        <section><h2>알림 강도</h2><p class="lead">할 일을 끝낼 때까지 다시 알려주는 간격이에요. 출발 7일 전부터는 두 배로 자주 알려요.</p>
          <div class="seg" role="radiogroup">${Object.entries(INTENSITY).map(([k, [n, d]]) => `<label class="tag"><input type="radio" name="int" data-act="intensity" value="${k}" ${S.settings.intensity === k ? 'checked' : ''}><span>${n}<small>${d}</small></span></label>`).join('')}</div>
          ${perm === 'granted' ? '<p class="note">알림이 켜져 있어요.</p>' : perm === 'denied' ? '<p class="note">브라우저 설정에서 알림이 막혀 있어요. 사이트 설정에서 알림을 허용해 주세요.</p>' : perm === 'unsupported' ? '<p class="note">이 브라우저는 알림을 지원하지 않아요. 여행 화면의 "캘린더에 할 일 넣기"를 써 주세요.</p>' : '<button class="btn primary" data-act="notif">알림 켜기</button>'}
          <p class="note">아이폰은 Safari에서 "홈 화면에 추가"한 뒤에 알림을 켤 수 있어요.</p></section>
        <section><h2>저장된 가족</h2>
          ${S.family.length ? `<ul class="members">${S.family.map((m) => memberLine(m, 'fam-remove')).join('')}</ul>` : '<p class="note">여행을 만들 때 추가한 가족이 여기에 저장돼요.</p>'}</section>
        <section><h2>데이터</h2><p class="note">모든 정보는 이 기기 안에만 저장돼요. 서버로 보내지 않아요.</p>
          <button class="btn ghost" data-act="reset">모든 데이터 지우기</button></section>
      </main>`;
  }

  /* ── 라우팅 ── */
  let flipOnce = true; // 보드 플립은 화면이 바뀔 때 한 번만
  function render() {
    const h = location.hash.replace(/^#\/?/, '').split('/');
    let html = '';
    if (h[0] === 'new') html = viewNew();
    else if (h[0] === 'trip') html = viewTrip(h[1], h[2] || 'tasks');
    else if (h[0] === 'settings') html = viewSettings();
    else html = viewHome();
    app.innerHTML = html;
    flipOnce = false;
    if (h[0] === 'trip') maybeWeather(tripOf(h[1]));
  }
  window.addEventListener('hashchange', () => { flipOnce = true; render(); window.scrollTo(0, 0); });

  /* ── 동작 ── */
  function setTask(tripId, taskId, patch) {
    const trip = tripOf(tripId); if (!trip) return;
    trip.state = trip.state || {};
    trip.state[taskId] = { ...(trip.state[taskId] || {}), ...patch };
    save();
  }

  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'INPUT' || b.tagName === 'SELECT' || b.tagName === 'FORM' || b.tagName === 'TEXTAREA') return;
    const a = b.dataset.act;
    if (a === 'pick-country') { W.c = b.dataset.id; W.courseId = ''; W.step = 2; render(); }
    if (a === 'pick-course') { W.courseId = b.dataset.id; W.nights = E.course(W.courseId).nights; W.step = 3; render(); }
    if (a === 'nights') { W.nights = Math.min(14, Math.max(1, W.nights + Number(b.dataset.d))); render(); }
    if (a === 'w-back') { W.step--; render(); }
    if (a === 'w-next') {
      if (W.step === 3) { const s = $('#w-start').value; if (!s) { toast('출발일을 골라 주세요.'); return; } W.start = s; W.from = $('#w-from').value; }
      W.step++; render(); window.scrollTo(0, 0);
    }
    if (a === 'w-add-saved') { const f = S.family.find((x) => x.id === b.dataset.id); if (f) W.members.push({ ...f }); render(); }
    if (a === 'w-remove') { W.members = W.members.filter((m) => m.id !== b.dataset.id); render(); }
    if (a === 'w-create') {
      const trip = { id: uid(), courseId: W.courseId, start: W.start, nights: W.nights, from: W.from, members: W.members, state: {}, packed: {}, memo: {}, created: Date.now() };
      S.trips.push(trip); save(); W = null;
      location.hash = `#/trip/${trip.id}/tasks`;
      toast('여행을 만들었어요. 오늘 할 일부터 보여드릴게요.');
    }
    if (a === 'snooze') {
      const trip = tripOf(b.dataset.trip), st = (trip.state || {})[b.dataset.task] || {};
      setTask(b.dataset.trip, b.dataset.task, { snooze: (st.snooze || 0) + 1, last: Date.now() });
      toast(`${INTENSITY[S.settings.intensity][1]} 다시 알려드릴게요.`); render();
    }
    if (a === 'notif') askNotif();
    if (a === 'ics') downloadICS(tripOf(b.dataset.trip));
    if (a === 'delete-trip') { if (confirm('이 여행과 체크한 내용이 모두 지워져요. 지울까요?')) { S.trips = S.trips.filter((t) => t.id !== b.dataset.trip); save(); location.hash = '#/'; toast('여행을 지웠어요.'); } }
    if (a === 'trip-remove-member') {
      const trip = tripOf(b.dataset.trip);
      if (trip.members.length <= 1) { toast('가족이 최소 1명은 있어야 해요.'); return; }
      trip.members = trip.members.filter((m) => m.id !== b.dataset.id); save(); render(); toast('빼고 할 일·준비물을 다시 짰어요.');
    }
    if (a === 'fam-remove') { S.family = S.family.filter((m) => m.id !== b.dataset.id); save(); render(); }
    if (a === 'reset') { if (confirm('모든 여행과 가족 정보가 지워져요. 지울까요?')) { S = { trips: [], family: [], settings: { intensity: 'normal' } }; save(); location.hash = '#/'; render(); } }
  });

  app.addEventListener('change', (e) => {
    const el = e.target, a = el.dataset.act; if (!a) return;
    if (a === 'toggle') {
      setTask(el.dataset.trip, el.dataset.task, { done: el.checked, doneAt: el.checked ? Date.now() : null });
      if (el.checked) toast('끝냈어요.');
      setTimeout(render, el.checked ? 250 : 0);
    }
    if (a === 'owner') setTask(el.dataset.trip, el.dataset.task, { owner: el.value });
    if (a === 'pack') { const t = tripOf(el.dataset.trip); t.packed = t.packed || {}; t.packed[el.dataset.item] = el.checked; save(); render(); }
    if (a === 'door') { const t = tripOf(el.dataset.trip); t.door = t.door || {}; t.door[el.dataset.name] = el.checked; save(); render(); if (E.DOOR.every((n) => t.door[n])) toast('다 챙겼어요. 좋은 여행 되세요!'); }
    if (a === 'filter') { const t = tripOf(el.dataset.trip), cr = E.crew(t.members); t.filters = t.filters || { k: cr.kids, v: cr.veg, nh: cr.nospicy }; t.filters[el.dataset.key] = el.checked; save(); render(); }
    if (a === 'memo') { const t = tripOf(el.dataset.trip); t.memo = t.memo || {}; t.memo[el.dataset.key] = el.value; save(); toast('저장했어요.'); }
    if (a === 'intensity') { S.settings.intensity = el.value; save(); toast(`알림을 ${INTENSITY[el.value][1]} 보내요.`); }
  });

  app.addEventListener('submit', (e) => {
    const f = e.target; if (f.dataset.act !== 'w-add') return;
    e.preventDefault();
    const fd = new FormData(f);
    const m = { id: uid(), name: fd.get('name').trim(), type: fd.get('type'), age: fd.get('age') ? Number(fd.get('age')) : null, passport: fd.get('passport') || '', tags: fd.getAll('tag'), allergy: (fd.get('allergy') || '').trim() };
    if (!m.name) { toast('이름을 넣어 주세요.'); return; }
    if (m.allergy && !m.tags.includes('allergy')) m.tags.push('allergy');
    W.members.push(m);
    if (fd.get('keep')) { S.family = S.family.filter((x) => x.id !== m.id); S.family.push(m); save(); }
    render();
    toast(`${m.name}을(를) 추가했어요.`);
  });

  /* ── 날씨 (출발 14일 이내, Open-Meteo 무료 예보) ── */
  const wxBusy = {};
  async function maybeWeather(trip) {
    if (!trip || wxBusy[trip.id]) return;
    const d = E.diff(E.today(), trip.start), end = E.addDays(trip.start, trip.nights);
    if (d > 14 || E.diff(E.today(), end) < 0) return;
    if (trip.weatherAt && Date.now() - trip.weatherAt < 6 * 3600e3) return;
    wxBusy[trip.id] = true;
    try {
      const c = E.course(trip.courseId);
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16`);
      const j = await r.json();
      trip.weather = {};
      j.daily.time.forEach((t, i) => { trip.weather[t] = { max: Math.round(j.daily.temperature_2m_max[i]), min: Math.round(j.daily.temperature_2m_min[i]), rain: j.daily.precipitation_probability_max[i] ?? 0 }; });
      trip.weatherAt = Date.now(); save();
      if (location.hash.includes(trip.id)) render();
    } catch (e) { /* 오프라인이면 조용히 건너뜀 */ }
    wxBusy[trip.id] = false;
  }

  /* ── 알림: 끝낼 때까지 다시 ── */
  async function askNotif() {
    if (!('Notification' in window)) { toast('이 브라우저는 알림을 지원하지 않아요. 캘린더에 넣기를 써 주세요.'); return; }
    const p = await Notification.requestPermission();
    if (p === 'granted') { toast('알림을 켰어요.'); nag(true); } else toast('알림이 꺼져 있어요. 브라우저 설정에서 허용할 수 있어요.');
    render();
  }
  async function notify(title, body, url) {
    try {
      const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
      if (reg) return reg.showNotification(title, { body, tag: url, data: { url }, icon: 'icon.svg', badge: 'icon.svg' });
      const n = new Notification(title, { body, tag: url }); n.onclick = () => { window.focus(); location.hash = url; };
    } catch (e) { /* 무시 */ }
  }
  function nag(force) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const base = INTENSITY[S.settings.intensity][2] * 3600e3, now = Date.now();
    let changed = false;
    dueTasks().slice(0, 3).forEach((x) => {
      const close = E.diff(E.today(), x.trip.start) <= 7;
      const gap = close ? base / 2 : base;
      if (!force && x.last && now - x.last < gap) return;
      const ph = phase(x.trip);
      notify(`${ph.text} · ${x.t}`, x.why || '체크하면 더 이상 알리지 않아요.', `#/trip/${x.trip.id}/tasks`);
      x.trip.state = x.trip.state || {};
      x.trip.state[x.id] = { ...(x.trip.state[x.id] || {}), last: now };
      changed = true;
    });
    if (changed) save();
  }

  /* ── 캘린더 파일 (.ics) — 앱을 닫아도 알림 ── */
  function downloadICS(trip) {
    const c = E.course(trip.courseId);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const fold = (s) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const ev = taskList(trip).filter((x) => !x.done).map((x) => {
      const d = (x.date < E.today() ? E.today() : x.date).replace(/-/g, '');
      return ['BEGIN:VEVENT', `UID:${trip.id}-${x.id}@chaenggyeo`, `DTSTAMP:${stamp}`, `DTSTART:${d}T090000`, 'DURATION:PT15M',
        `SUMMARY:${fold(`[${c.name}] ${x.t}`)}`, `DESCRIPTION:${fold(x.why + (x.link ? `\n${x.link}` : ''))}`,
        'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${fold(x.t)}`, 'TRIGGER:PT0M', 'END:VALARM',
        ...(x.red ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${fold('내일까지: ' + x.t)}`, 'TRIGGER:-P1D', 'END:VALARM'] : []),
        'END:VEVENT'].join('\r\n');
    });
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//chaenggyeo-trip//KO', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = `${c.name}-할일.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    toast(`할 일 ${ev.length}개를 캘린더 파일로 만들었어요. 열어서 추가해 주세요.`);
  }

  /* ── 시작 ── */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  render();
  nag(false);
  setInterval(() => nag(false), 5 * 60e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { nag(false); render(); } });
})();
