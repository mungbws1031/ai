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

/** 텍스트에서 날짜/시각을 추출. 날짜를 못 찾으면 date 없음. */
export function parseWhen(text: string, now: Date): ParsedWhen {
  let rest = ` ${text} `;
  let date: string | undefined;
  let time: string | undefined;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void) => {
    if (date) return;
    const m = rest.match(re);
    if (m) {
      fn(m);
      if (date) rest = rest.replace(m[0], ' ');
    }
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
      // 요일 단독 → 오늘 포함 가장 가까운 그 요일
      let diff = (targetDow - today.getDay() + 7) % 7;
      date = fmt(addDays(today, diff));
    }
  });

  // 2) 오늘/내일/모레/글피
  take(/(오늘|내일|모레|글피)/, (m) => {
    const map: Record<string, number> = { 오늘: 0, 내일: 1, 모레: 2, 글피: 3 };
    date = fmt(addDays(today, map[m[1]]));
  });

  // 3) M월 D일
  take(/(\d{1,2})월\s*(\d{1,2})일/, (m) => {
    const mo = parseInt(m[1], 10) - 1;
    const d = parseInt(m[2], 10);
    let y = today.getFullYear();
    let cand = new Date(y, mo, d);
    if (cand < today) cand = new Date(y + 1, mo, d);
    date = fmt(cand);
  });

  // 4) (이번달|다음달) D일
  take(/(이번달|다음달)\s*(\d{1,2})일/, (m) => {
    const d = parseInt(m[2], 10);
    const monthAdd = m[1] === '다음달' ? 1 : 0;
    date = fmt(new Date(today.getFullYear(), today.getMonth() + monthAdd, d));
  });

  // 5) M/D
  take(/(?:^|\s)(\d{1,2})\/(\d{1,2})(?=\s)/, (m) => {
    const mo = parseInt(m[1], 10) - 1;
    const d = parseInt(m[2], 10);
    let cand = new Date(today.getFullYear(), mo, d);
    if (cand < today) cand = new Date(today.getFullYear() + 1, mo, d);
    date = fmt(cand);
  });

  // 6) D일 (위에서 안 잡힌 경우) → 이번달 D일(지났으면 다음달)
  take(/(\d{1,2})일/, (m) => {
    const d = parseInt(m[1], 10);
    let cand = new Date(today.getFullYear(), today.getMonth(), d);
    if (cand < today) cand = new Date(today.getFullYear(), today.getMonth() + 1, d);
    date = fmt(cand);
  });

  // 시각: HH:mm 또는 (오전/오후) N시(반)
  const tColon = rest.match(/(\d{1,2}):(\d{2})/);
  if (tColon) {
    const h = Math.min(23, parseInt(tColon[1], 10));
    const mm = Math.min(59, parseInt(tColon[2], 10));
    time = `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    rest = rest.replace(tColon[0], ' ');
  } else {
    const tK = rest.match(/(오전|오후)?\s*(\d{1,2})\s*시\s*(반)?/);
    if (tK) {
      let h = parseInt(tK[2], 10);
      if (tK[1] === '오후' && h < 12) h += 12;
      if (tK[1] === '오전' && h === 12) h = 0;
      const mm = tK[3] ? 30 : 0;
      time = `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      rest = rest.replace(tK[0], ' ');
    }
  }

  const cleanedText = rest.replace(/\s+/g, ' ').trim();
  return { date, time, cleanedText };
}
