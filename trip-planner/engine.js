/* 챙겨줘 트립 — 플랜 엔진 (화면과 분리된 순수 함수들)
 * 입력: trip { courseId, start, nights, from, members[] }
 * 출력: 일정(days), D-day 할 일(tasks), 준비물(packing)
 */
window.TripEngine = (function () {
  const { COUNTRIES, COURSES, CLIMATE } = window.TRIP_DATA;

  /* ── 날짜 (현지 자정 기준, 'YYYY-MM-DD') ── */
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return fmt(d); };
  const today = () => fmt(new Date());
  const diff = (a, b) => Math.round((parse(b) - parse(a)) / 86400000); // b - a (일)
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const label = (s) => { const d = parse(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`; };

  const course = (id) => COURSES.find((c) => c.id === id);

  /* ── 구성원 성격 ── */
  function crew(members) {
    const has = (fn) => members.some(fn);
    return {
      infant: has((m) => m.type === 'infant'),
      child: has((m) => m.type === 'child'),
      kids: has((m) => m.type === 'infant' || m.type === 'child'),
      senior: has((m) => m.type === 'senior'),
      mobility: has((m) => (m.tags || []).includes('mobility') || m.type === 'senior'),
      meds: members.filter((m) => (m.tags || []).includes('meds')),
      allergy: members.filter((m) => (m.tags || []).includes('allergy')),
      veg: has((m) => (m.tags || []).includes('veg')),
      nospicy: has((m) => (m.tags || []).includes('nospicy') || m.type === 'child' || m.type === 'infant'),
      motion: has((m) => (m.tags || []).includes('motion'))
    };
  }

  /* ── 일정: 박 수에 맞춰 날 고르기 ──
   * 첫날·마지막 날은 고정. 가운데 날은 우선순위(p) 높은 것부터 채우고
   * 원래 순서는 유지. 모자라면 '자유 일정' 날을 넣는다. */
  function itinerary(trip) {
    const c = course(trip.courseId);
    const total = Math.max(2, trip.nights + 1);
    const first = c.days[0], last = c.days[c.days.length - 1];
    const middle = c.days.slice(1, -1).map((d, i) => ({ ...d, _i: i }));
    const need = total - 2;
    let picked = [...middle].sort((a, b) => (b.p || 0) - (a.p || 0) || a._i - b._i).slice(0, need).sort((a, b) => a._i - b._i);
    while (picked.length < need) picked.push({ t: '자유 일정 · 숙소 근처에서 쉬기', s: [], f: [], free: true });
    const cr = crew(trip.members);
    return [first, ...picked, last].map((d, i) => ({
      ...d,
      date: addDays(trip.start, i),
      no: i + 1,
      s: (d.s || []).map((sp) => ({ ...sp, warn: cr.mobility && sp.s ? (sp.alt || '계단·오르막이 많아요') : '' }))
    }));
  }

  /* ── D-day 할 일 ── */
  function tasks(trip) {
    const c = course(trip.courseId);
    const k = COUNTRIES[c.c];
    const cr = crew(trip.members);
    const end = addDays(trip.start, trip.nights);
    const sixMonth = (() => { const d = parse(end); d.setMonth(d.getMonth() + 6); return fmt(d); })();
    const list = [];
    const add = (id, off, t, o = {}) => list.push({ id, off, t, date: addDays(trip.start, off), red: !!o.red, why: o.why || '', link: o.link || '', cat: o.cat || '준비' });

    const sky = `https://www.skyscanner.co.kr/transport/flights/${trip.from.toLowerCase()}/${c.air.toLowerCase()}/${trip.start.slice(2).replace(/-/g, '')}/${end.slice(2).replace(/-/g, '')}/?adults=${trip.members.filter((m) => m.type === 'adult' || m.type === 'senior').length || 1}&children=${trip.members.filter((m) => m.type === 'child').length}&infants=${trip.members.filter((m) => m.type === 'infant').length}`;

    // 여권 — 사람마다
    trip.members.forEach((m) => {
      if (!m.passport) {
        add(`pp-${m.id}`, -90, `${m.name} 여권 만료일 확인하기`, { red: true, cat: '서류', link: 'https://www.passport.go.kr/', why: '만료일을 아직 안 넣었어요. 귀국일 기준 6개월 넘게 남아야 안전해요. 확인하면 가족 정보에 입력해 주세요.' });
      } else if (m.passport < sixMonth) {
        add(`pp-${m.id}`, -90, `${m.name} 여권 새로 발급받기`, { red: true, cat: '서류', link: 'https://www.passport.go.kr/', why: `만료일 ${m.passport} — 귀국일 기준 6개월 미만이라 입국을 거절당할 수 있어요. 발급까지 1~2주 걸려요.` });
      }
    });

    add('flight', -60, '항공권 예약하기', { cat: '예약', link: sky, why: cr.infant ? '아기는 좌석 없이 무릎에 앉아요(만 2세 미만). 예약할 때 배시넷 좌석을 같이 요청하세요.' : '아이 요금은 만 나이 기준이에요. 가족이 붙어 앉도록 좌석 지정까지 해두세요.' });
    add('hotel', -45, '숙소 예약하기', { cat: '예약', link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('family hotel near ' + c.base + ' ' + k.name)}`, why: `추천 위치: ${c.base}. ${c.tip} 패밀리룸·엘리베이터·아기 침대 가능 여부를 확인하세요.` });

    // 코스 속 예약 필요 장소
    itinerary(trip).forEach((d) => d.s.forEach((sp, j) => {
      if (sp.r) add(`r-${c.id}-${d.no}-${j}`, -sp.r[0], `${sp.r[1]} 예약`, { cat: '예약', link: `https://www.google.com/search?q=${encodeURIComponent(sp.n + ' 예약')}`, why: `${d.no}일차 (${label(d.date)}) 일정이에요. 아이 키 제한·나이별 요금도 함께 확인하세요.` });
    }));
    (c.extra || []).forEach((e, i) => add(`x-${c.id}-${i}`, e.off, e.t, { red: e.red, why: e.why, link: e.link, cat: '예약' }));

    // 입국·나라별
    add('safety', -30, '외교부 해외안전여행 — 여행경보·입국 규정 확인', { cat: '서류', link: 'https://www.0404.go.kr/', why: `${k.name}: ${k.visa}` });
    k.entry.forEach((e, i) => add(`en-${c.c}-${i}`, e.off, e.t, { red: e.red, why: e.why || '', link: e.link || '', cat: '서류' }));

    add('insurance', -21, '여행자 보험 가입 (가족 모두)', { cat: '준비', why: cr.kids ? '아이는 현지에서 열·장염으로 병원 갈 일이 잦아요. 해외 의료비 한도를 넉넉히.' : '해외 의료비·휴대품 보장을 확인하세요.' });
    if (cr.infant) add('bassinet', -14, '항공사에 배시넷·아기 기내식 요청', { cat: '예약', why: '배시넷은 선착순이라 일찍 요청할수록 좋아요. 유모차는 탑승구까지 가져갈 수 있는지 확인하세요.' });
    if (cr.kids) add('kidmeal', -14, '아이 기내식(차일드밀) 신청', { cat: '예약', why: '출발 24~48시간 전에 마감되는 항공사가 많아요.' });
    if (cr.mobility) add('assist', -14, '항공사·공항 휠체어 서비스 신청', { cat: '예약', why: '어르신·거동이 불편한 가족을 위해 미리 신청하면 공항 이동이 훨씬 편해요.' });
    cr.meds.forEach((m) => add(`meds-${m.id}`, -10, `${m.name} 복용약 + 영문 처방전 준비`, { cat: '준비', why: '여행 일수 + 3일치를 챙기고, 약은 기내 가방에 넣으세요.' }));
    cr.allergy.forEach((m) => add(`allergy-${m.id}`, -7, `${m.name} 알레르기 카드 만들기 (현지어)`, { cat: '준비', link: `https://translate.google.com/?sl=ko&tl=auto&text=${encodeURIComponent(`저는 ${m.allergy || '음식'} 알레르기가 있어요. ${m.allergy || '이 재료'}를 빼 주세요.`)}`, why: `식당에서 보여줄 문장을 번역해 휴대폰에 저장하세요. (${m.allergy || '알레르기 재료'})` }));
    add('esim', -7, 'eSIM·로밍 준비', { cat: '준비', why: '지도·번역·그랩이 데이터로 돌아가요. 아이와 떨어질 때를 대비해 어른 2명 모두 준비하세요.' });
    add('money', -7, `환전·트래블카드 — ${k.cur}`, { cat: '준비', why: '트래블카드(해외 수수료 없는 체크카드)를 기본으로, 비상용 현금을 조금 챙기세요.' });
    if (k.adapter) add('adapter', -5, '콘센트 어댑터 사기', { cat: '준비', why: k.plug });
    add('pack1', -3, '날씨 확인하고 짐 1차 싸기', { cat: '짐', why: '준비물 탭에서 70% 이상 체크해 두세요. 날씨에 따라 우산·겉옷을 더해요.' });
    add('route', -2, '공항 가는 방법 정하기', { cat: '짐', why: '아이와 짐을 생각해 출발 3시간 전 도착 기준으로. 공항 주차장은 미리 예약하면 싸요.' });
    add('checkin', -1, '온라인 체크인 + 짐 싸기 마감', { cat: '짐', why: '보조배터리는 꼭 기내 가방으로. 아이 간식·여벌옷·물티슈는 손에 드는 가방에.' });
    add('door', 0, '집 나서기 전 문 앞 체크 (여권·지갑·휴대폰·충전기·약)', { red: true, cat: '출발', why: '가족 여권은 한 사람이 모두 들고 다니세요.' });
    add('checkout', trip.nights, '체크아웃 전에 두고 온 것 확인 (충전기·아이 인형·옷장·금고)', { cat: '귀국' });
    add('customs', trip.nights, '면세 한도 확인 — 1인 800달러', { cat: '귀국', why: '아이도 1인 한도가 따로 있어요. 넘으면 자진 신고하면 세금 감면이 돼요.' });

    return list.sort((a, b) => a.off - b.off);
  }

  /* ── 준비물 ── */
  function packing(trip) {
    const c = course(trip.courseId);
    const k = COUNTRIES[c.c];
    const cr = crew(trip.members);
    const month = parse(trip.start).getMonth();
    const clim = CLIMATE[c.climate[month]];
    const days = trip.nights + 1;
    const groups = [];
    const g = (title, items) => { if (items.length) groups.push({ title, items: items.map((n) => ({ id: `${title}:${n}`, n })) }); };

    g('서류·돈', ['여권 (가족 모두)', '여권 사본·사진 (휴대폰에도)', '트래블카드·신용카드', `현지 현금 (${k.cur.split(' ')[0]})`, '예약 확인 화면 캡처']);
    g('전자기기', ['휴대폰 충전기', '보조배터리 (기내 가방)', ...(k.adapter ? [`콘센트 어댑터 — ${k.plug}`] : []), '멀티탭']);
    g('가족 공통', ['상비약 (해열제·소화제·지사제·밴드)', '세면도구', `속옷·양말 ${days}일치`, '잠옷', '물티슈·손소독제', '지퍼백 (젖은 옷)']);
    g(`날씨 — ${clim.name}`, [...clim.items, ...(['vn', 'th', 'ph', 'my', 'sg'].includes(c.c) ? ['모기 기피제 (아이용)', '수영복·래시가드', '물놀이 튜브·구명조끼'] : [])]);

    trip.members.forEach((m) => {
      const it = [];
      if (m.type === 'infant') it.push(`기저귀 ${days * 7}개`, '분유·젖병 / 이유식', '보온병', '휴대용 유모차', '아기띠', '아기 해열제(시럽)·체온계', '턱받이·손수건', '아기 여벌옷 넉넉히', '이륙·착륙 때 물릴 젖병·쪽쪽이');
      if (m.type === 'child') it.push('아이 여벌옷 (하루 2벌 기준)', '기내 놀잇감·색칠책', '태블릿 + 아이 헤드폰 (영상 미리 다운로드)', '좋아하는 간식', '아이 해열제·체온계', '보호자 연락처 팔찌·이름표');
      if (m.type === 'senior') it.push('편한 신발', '보온 겉옷', '돋보기');
      if ((m.tags || []).includes('meds')) it.push('복용약 (여행일수 + 3일치)', '영문 처방전');
      if ((m.tags || []).includes('allergy')) it.push(`알레르기 카드 (${m.allergy || '재료'})`, '항히스타민제 / 처방받은 응급약');
      if ((m.tags || []).includes('mobility')) it.push('무릎 보호대·지팡이');
      if ((m.tags || []).includes('motion')) it.push('멀미약');
      g(m.name, it);
    });

    if (c.days.some((d) => d.s.some((s) => s.c))) g('사원·성당 방문', ['긴 바지·긴 치마', '어깨 가리는 옷 (아이 것도)']);
    return groups;
  }

  /* 문 앞 체크 — 출발 당일 */
  const DOOR = ['가족 여권', '지갑·카드', '휴대폰', '충전기·보조배터리', '약'];

  return { course, crew, itinerary, tasks, packing, DOOR, parse, fmt, addDays, today, diff, label };
})();
