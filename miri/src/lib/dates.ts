import {
  addDays,
  format,
  isWeekend,
  parseISO,
  startOfDay,
  differenceInCalendarDays,
} from 'date-fns';

export const ISO_DATE = 'yyyy-MM-dd';

export function toDateStr(d: Date): string {
  return format(d, ISO_DATE);
}

export function parseDate(s: string): Date {
  // 'yyyy-MM-dd' 또는 풀 ISO 모두 허용
  return startOfDay(parseISO(s));
}

export function todayStr(now: Date = new Date()): string {
  return toDateStr(now);
}

// MVP용 한국 고정일 공휴일 (음력 명절은 제외 — Phase 2에서 보강).
// 'MM-dd' 형태.
const FIXED_HOLIDAYS = new Set([
  '01-01', // 신정
  '03-01', // 삼일절
  '05-05', // 어린이날
  '06-06', // 현충일
  '08-15', // 광복절
  '10-03', // 개천절
  '10-09', // 한글날
  '12-25', // 성탄절
]);

export function isHoliday(d: Date): boolean {
  return FIXED_HOLIDAYS.has(format(d, 'MM-dd'));
}

export function isAvailable(d: Date, busy: Set<string> = new Set()): boolean {
  if (isWeekend(d)) return false;
  if (isHoliday(d)) return false;
  if (busy.has(toDateStr(d))) return false;
  return true;
}

/**
 * 주어진 날짜에서 역방향(과거 방향)으로 가용한 가장 가까운 평일을 찾는다.
 * 주말·공휴일·기존 일정(busy)과 겹치면 자동으로 앞당긴다. (FR-B03)
 */
export function previousAvailableDay(d: Date, busy: Set<string> = new Set()): Date {
  let cur = startOfDay(d);
  let guard = 0;
  while (!isAvailable(cur, busy) && guard < 365) {
    cur = addDays(cur, -1);
    guard += 1;
  }
  return cur;
}

export function daysUntil(dateStr: string, now: Date = new Date()): number {
  return differenceInCalendarDays(parseDate(dateStr), startOfDay(now));
}

// "D-3", "D-DAY", "D+2" 같은 라벨
export function dDayLabel(dateStr: string, now: Date = new Date()): string {
  const diff = daysUntil(dateStr, now);
  if (diff === 0) return 'D-DAY';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}
