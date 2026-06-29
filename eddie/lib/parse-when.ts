// 한국어 날짜/시각 표현 파서 (오프라인, 규칙 기반).
// 할 일 텍스트에 '내일', '다음주 화요일', '6/27', '3시' 같은 표현이 있으면
// 실제 날짜/시각으로 바꿔 캘린더 일정으로 만든다.

export interface ParsedWhen {
  date?: string; // 'YYYY-MM-DD'
  time?: string; // 'HH:mm'
  cleanedText: string; // 날짜/시각 표현을 뺀 제목
}

const WD: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(base: Date, n: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
}
/** 유효한 달력 날짜만 만든다(2월 30일 등 오버플로는 null). monthIdx는 0~11. */
function makeDate(y: number, monthIdx: number, day: number): Date | null {
  if (monthIdx < 0 || monthIdx > 11 || day < 1 || day > 31) return null;
  const d = new Date(y, monthIdx, day);
  return d.getMonth() === monthIdx && d.getDate() === day ? d : null;
}

/** 텍스트에서 날짜/시각을 추출. 날짜를 못 찾으면 date 없음. */
export function parseWhen(text: string, now: Date): ParsedWhen {
  let rest = ` ${text} `;
  let date: string | undefined;
  let time: string | undefined;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 정규식이 매칭된 '그 위치'만 잘라낸다(같은 토큰이 앞에 또 있어도 안전).
  const cut = (m: RegExpMatchArray) => {
    if (m.index === undefined) return;
    rest = rest.slice(0, m.index) + ' ' + rest.slice(m.index + m[0].length);
  };
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => boolean) => {
    if (date) return;
    const m = rest.match(re);
    if (m && fn(m)) cut(m);
  };

  // 1) (이번주|다음주|다다음주) + 요일  / 요일 단독
  take(/(이번주|다음주|다다음주)?\s*([월화수목금토일])요일/, (m) => {
    const prefix = m[1];
    const targetDow = WD[m[2]];
    if (prefix) {
      const mondayOffset = (today.getDay() + 6) % 7; // 이번주 월요일까지
      const monday = addDays(today, -mondayOffset);
      const weekAdd = prefix === '다음주' ? 7 : prefix === '다다음주' ? 14 : 0;
      const targetMonBased = (targetDow + 6) % 7; // 월=0..일=6
      date = fmt(addDays(monday, weekAdd + targetMonBased));
    } else {
      // 요일 단독 → 다가오는 그 요일(오늘이 그 요일이면 다음 주 같은 요일)
      const diff = ((targetDow - today.getDay() + 6) % 7) + 1;
      date = fmt(addDays(today, diff));
    }
    return true;
  });

  // 2) 오늘/내일/모레/글피
  take(/(오늘|내일|모레|글피)/, (m) => {
    const map: Record<string, number> = { 오늘: 0, 내일: 1, 모레: 2, 글피: 3 };
    date = fmt(addDays(today, map[m[1]]));
    return true;
  });

  // 3) M월 D일  (잘못된 날짜여도 토큰은 소비해 아래 규칙이 다시 잡지 않게 한다)
  take(/(\d{1,2})월\s*(\d{1,2})일/, (m) => {
    const mo = parseInt(m[1], 10) - 1;
    const d = parseInt(m[2], 10);
    let cand = makeDate(today.getFullYear(), mo, d);
    if (cand) {
      if (cand < today) cand = makeDate(today.getFullYear() + 1, mo, d) ?? cand;
      date = fmt(cand);
    }
    return true;
  });

  // 4) (이번달|다음달) D일
  take(/(이번달|다음달)\s*(\d{1,2})일/, (m) => {
    const d = parseInt(m[2], 10);
    const monthAdd = m[1] === '다음달' ? 1 : 0;
    const target = new Date(today.getFullYear(), today.getMonth() + monthAdd, 1);
    const cand = makeDate(target.getFullYear(), target.getMonth(), d);
    if (cand) date = fmt(cand);
    return true;
  });

  // 5) M/D
  take(/(?:^|\s)(\d{1,2})\/(\d{1,2})(?=\s)/, (m) => {
    const mo = parseInt(m[1], 10) - 1;
    const d = parseInt(m[2], 10);
    let cand = makeDate(today.getFullYear(), mo, d);
    if (cand) {
      if (cand < today) cand = makeDate(today.getFullYear() + 1, mo, d) ?? cand;
      date = fmt(cand);
    }
    return true;
  });

  // 6) D일 (위에서 안 잡힌 경우) → 이번달 D일(지났으면 다음달)
  take(/(\d{1,2})일/, (m) => {
    const d = parseInt(m[1], 10);
    let cand = makeDate(today.getFullYear(), today.getMonth(), d);
    if (cand) {
      if (cand < today) cand = makeDate(today.getFullYear(), today.getMonth() + 1, d) ?? cand;
      date = fmt(cand);
    }
    return true;
  });

  // 시각: HH:mm 또는 (오전/오후) N시(반)  ('시간'은 제외)
  const tColon = rest.match(/(\d{1,2}):(\d{2})/);
  if (tColon) {
    const h = Math.min(23, parseInt(tColon[1], 10));
    const mm = Math.min(59, parseInt(tColon[2], 10));
    time = `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    cut(tColon);
  } else {
    const tK = rest.match(/(오전|오후)?\s*(\d{1,2})\s*시(?!간)\s*(반)?/);
    if (tK) {
      let h = parseInt(tK[2], 10);
      if (tK[1] === '오후' && h < 12) h += 12;
      if (tK[1] === '오전' && h === 12) h = 0;
      h = Math.min(23, h);
      const mm = tK[3] ? 30 : 0;
      time = `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      cut(tK);
    }
  }

  const cleanedText = rest.replace(/\s+/g, ' ').trim();
  return { date, time, cleanedText };
}
