"""The single-page web UI, embedded as a string so the server has zero assets
to ship. Plain HTML/CSS/JS, no build step, no external dependencies."""

INDEX_HTML = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>티켓팅 · 예약/발권 관리</title>
<style>
  :root { --bg:#0f1220; --card:#1a1f35; --line:#2b3252; --fg:#e8ebf5;
          --muted:#9aa3c4; --accent:#5b8cff; --good:#3ecf8e; --bad:#ff6b6b; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, "Segoe UI", "Apple SD Gothic Neo", sans-serif;
         background:var(--bg); color:var(--fg); }
  header { padding:20px 24px; border-bottom:1px solid var(--line); }
  header h1 { margin:0; font-size:20px; }
  header p { margin:4px 0 0; color:var(--muted); font-size:13px; }
  .wrap { display:grid; grid-template-columns: 1fr 1.3fr; gap:20px; padding:20px 24px;
          max-width:1100px; margin:0 auto; }
  @media (max-width: 820px){ .wrap{ grid-template-columns:1fr; } }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px;
          padding:16px; margin-bottom:16px; }
  .card h2 { margin:0 0 12px; font-size:15px; }
  label { display:block; font-size:12px; color:var(--muted); margin:8px 0 4px; }
  input, select { width:100%; padding:9px 10px; border-radius:8px; border:1px solid var(--line);
          background:#0c0f1c; color:var(--fg); font-size:14px; }
  button { cursor:pointer; border:none; border-radius:8px; padding:9px 12px; font-size:13px;
           background:var(--accent); color:white; }
  button.ghost { background:transparent; border:1px solid var(--line); color:var(--fg); }
  button.danger { background:var(--bad); }
  button.small { padding:5px 9px; font-size:12px; }
  .row { display:flex; gap:8px; }
  .row > * { flex:1; }
  .event { border:1px solid var(--line); border-radius:10px; padding:12px; margin-bottom:10px;
           cursor:pointer; }
  .event.active { border-color:var(--accent); box-shadow:0 0 0 1px var(--accent); }
  .event .title { font-weight:600; }
  .event .meta { color:var(--muted); font-size:12px; margin-top:4px; }
  .seats { font-size:12px; margin-top:6px; }
  .bar { height:6px; border-radius:4px; background:#0c0f1c; overflow:hidden; margin-top:4px; }
  .bar > i { display:block; height:100%; background:var(--good); }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th, td { text-align:left; padding:8px 6px; border-bottom:1px solid var(--line); }
  th { color:var(--muted); font-weight:500; font-size:12px; }
  .pill { font-size:11px; padding:2px 8px; border-radius:20px; }
  .pill.RESERVED { background:#37406e; }
  .pill.ISSUED { background:#1d5b44; color:var(--good); }
  .pill.CANCELLED { background:#5a2630; color:var(--bad); }
  .codes { font-family: ui-monospace, monospace; font-size:11px; color:var(--good); }
  .msg { font-size:13px; padding:8px 10px; border-radius:8px; margin-bottom:10px; display:none; }
  .msg.show { display:block; }
  .msg.err { background:#3a1d24; color:var(--bad); }
  .msg.ok { background:#15392c; color:var(--good); }
  .empty { color:var(--muted); font-size:13px; padding:10px 0; }
</style>
</head>
<body>
<header>
  <h1>🎫 티켓팅 · 예약/발권 관리</h1>
  <p>행사를 등록하고 좌석을 예약·발권·취소합니다. 초과예약은 서버에서 자동으로 막습니다.
     · <a href="/practice" style="color:#5b8cff">🎮 티켓팅 가상 연습</a></p>
</header>

<div class="wrap">
  <div>
    <div class="card">
      <h2>행사 등록</h2>
      <div id="eventMsg" class="msg"></div>
      <label>제목</label>
      <input id="ev_title" placeholder="예: 봄밤 콘서트" />
      <div class="row">
        <div><label>총 좌석</label><input id="ev_seats" type="number" min="1" value="50" /></div>
        <div><label>가격(원)</label><input id="ev_price" type="number" min="0" value="0" /></div>
      </div>
      <label>장소</label>
      <input id="ev_venue" placeholder="예: 시민회관 대극장" />
      <label>일시</label>
      <input id="ev_starts" placeholder="예: 2026-06-20 19:30" />
      <div style="margin-top:12px"><button onclick="createEvent()">행사 추가</button></div>
    </div>

    <div class="card">
      <h2>행사 목록</h2>
      <div id="events"></div>
    </div>
  </div>

  <div>
    <div class="card">
      <h2>예약 접수 <span id="selEvent" style="color:var(--muted);font-weight:400"></span></h2>
      <div id="resMsg" class="msg"></div>
      <div class="row">
        <div><label>예약자 이름</label><input id="r_name" placeholder="홍길동" /></div>
        <div><label>연락처</label><input id="r_phone" placeholder="010-0000-0000" /></div>
      </div>
      <label>매수</label>
      <input id="r_qty" type="number" min="1" value="1" />
      <div style="margin-top:12px"><button id="resBtn" onclick="createReservation()" disabled>예약하기</button></div>
    </div>

    <div class="card">
      <h2>예약 현황</h2>
      <table>
        <thead><tr><th>#</th><th>예약자</th><th>매수</th><th>상태</th><th>티켓</th><th></th></tr></thead>
        <tbody id="reservations"></tbody>
      </table>
      <div id="resEmpty" class="empty">행사를 선택하면 예약 현황이 표시됩니다.</div>
    </div>
  </div>
</div>

<script>
let selectedEvent = null;

async function api(method, url, body) {
  const opt = { method, headers: { "Content-Type": "application/json" } };
  if (body) opt.body = JSON.stringify(body);
  const res = await fetch(url, opt);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || ("요청 실패 (" + res.status + ")"));
  return data;
}

function flash(id, text, kind) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = "msg show " + kind;
  setTimeout(() => { el.className = "msg"; }, 3500);
}

function num(id) { return parseInt(document.getElementById(id).value || "0", 10); }
function val(id) { return document.getElementById(id).value.trim(); }

async function loadEvents() {
  const { events } = await api("GET", "/api/events");
  const box = document.getElementById("events");
  if (!events.length) { box.innerHTML = '<div class="empty">아직 등록된 행사가 없습니다.</div>'; return; }
  box.innerHTML = events.map(e => {
    const pct = e.total_seats ? Math.round(e.seats_taken / e.total_seats * 100) : 0;
    const active = selectedEvent && selectedEvent.id === e.id ? " active" : "";
    return `<div class="event${active}" onclick="selectEvent(${e.id})">
      <div class="title">${esc(e.title)}</div>
      <div class="meta">${esc(e.venue || "-")} · ${esc(e.starts_at || "일시 미정")} · ${e.price.toLocaleString()}원</div>
      <div class="seats">잔여 <b>${e.seats_remaining}</b> / ${e.total_seats}석</div>
      <div class="bar"><i style="width:${pct}%;background:${e.seats_remaining===0?'var(--bad)':'var(--good)'}"></i></div>
    </div>`;
  }).join("");
}

async function selectEvent(id) {
  const { events } = await api("GET", "/api/events");
  selectedEvent = events.find(e => e.id === id) || null;
  document.getElementById("selEvent").textContent = selectedEvent ? "· " + selectedEvent.title : "";
  document.getElementById("resBtn").disabled = !selectedEvent;
  await loadEvents();
  await loadReservations();
}

async function createEvent() {
  try {
    await api("POST", "/api/events", {
      title: val("ev_title"), total_seats: num("ev_seats"),
      price: num("ev_price"), venue: val("ev_venue"), starts_at: val("ev_starts"),
    });
    flash("eventMsg", "행사를 추가했습니다.", "ok");
    document.getElementById("ev_title").value = "";
    await loadEvents();
  } catch (e) { flash("eventMsg", e.message, "err"); }
}

async function createReservation() {
  if (!selectedEvent) return;
  try {
    await api("POST", "/api/reservations", {
      event_id: selectedEvent.id, customer_name: val("r_name"),
      quantity: num("r_qty"), customer_phone: val("r_phone"),
    });
    flash("resMsg", "예약이 접수되었습니다.", "ok");
    document.getElementById("r_name").value = "";
    document.getElementById("r_phone").value = "";
    document.getElementById("r_qty").value = "1";
    await selectEvent(selectedEvent.id);
  } catch (e) { flash("resMsg", e.message, "err"); }
}

async function issue(id) {
  try { await api("POST", `/api/reservations/${id}/issue`); await selectEvent(selectedEvent.id); }
  catch (e) { flash("resMsg", e.message, "err"); }
}
async function cancel(id) {
  if (!confirm("이 예약을 취소할까요?")) return;
  try { await api("POST", `/api/reservations/${id}/cancel`); await selectEvent(selectedEvent.id); }
  catch (e) { flash("resMsg", e.message, "err"); }
}

async function loadReservations() {
  const tbody = document.getElementById("reservations");
  const empty = document.getElementById("resEmpty");
  if (!selectedEvent) { tbody.innerHTML = ""; empty.style.display = "block"; return; }
  const { reservations } = await api("GET", "/api/reservations?event_id=" + selectedEvent.id);
  if (!reservations.length) { tbody.innerHTML = ""; empty.textContent = "예약이 없습니다."; empty.style.display = "block"; return; }
  empty.style.display = "none";
  tbody.innerHTML = reservations.map(r => {
    const codes = r.tickets.map(t => t.code).join(" ");
    let actions = "";
    if (r.status === "RESERVED")
      actions = `<button class="small" onclick="issue(${r.id})">발권</button>
                 <button class="small danger" onclick="cancel(${r.id})">취소</button>`;
    else if (r.status === "ISSUED")
      actions = `<button class="small danger" onclick="cancel(${r.id})">취소</button>`;
    return `<tr>
      <td>${r.id}</td><td>${esc(r.customer_name)}</td><td>${r.quantity}</td>
      <td><span class="pill ${r.status}">${r.status}</span></td>
      <td class="codes">${codes || "-"}</td>
      <td>${actions}</td></tr>`;
  }).join("");
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

loadEvents();
</script>
</body>
</html>
"""
