import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import type { Chore, ChoreState } from '../types';
import { parseDate, toDateStr } from './dates';

// D. 집안일 주기 엔진 — 순수 함수만 둔다 (store/UI는 이걸 호출).
// 핵심: "해야 할 일"을 쌓지 않고 "마지막으로 한 날 + 주기"로 상태를 계산한다.

/** '곧' 으로 볼 남은 일수: 주기의 20% (최소 1일, 최대 3일) */
function soonWindow(intervalDays: number): number {
  return Math.min(3, Math.max(1, Math.round(intervalDays * 0.2)));
}

export interface ChoreStatus {
  state: ChoreState;
  daysSince: number | null; // 마지막으로 한 지 며칠 (기록 없으면 null)
  daysLeft: number | null; // 다음 차례까지 남은 일수 (음수 = 지남)
  nextDue: string | null; // yyyy-MM-dd
}

export function choreStatus(chore: Chore, now: Date = new Date()): ChoreStatus {
  if (!chore.lastDoneAt) return { state: 'never', daysSince: null, daysLeft: null, nextDue: null };
  const today = startOfDay(now);
  const last = parseDate(chore.lastDoneAt);
  const next = addDays(last, chore.intervalDays);
  const daysSince = differenceInCalendarDays(today, last);
  const daysLeft = differenceInCalendarDays(next, today);
  let state: ChoreState = 'ok';
  if (daysLeft < 0) state = 'overdue';
  else if (daysLeft === 0) state = 'due';
  else if (daysLeft <= soonWindow(chore.intervalDays)) state = 'soon';
  return { state, daysSince, daysLeft, nextDue: toDateStr(next) };
}

/**
 * 주기 대비 얼마나 지났는지 (1.0 = 딱 차례). 정렬용.
 * 기록 없는 집안일은 맨 위로 올려 '언제 했는지' 한 번 찍게 유도한다.
 */
export function choreUrgency(chore: Chore, now: Date = new Date()): number {
  const st = choreStatus(chore, now);
  if (st.daysSince === null) return Number.POSITIVE_INFINITY;
  return st.daysSince / Math.max(1, chore.intervalDays);
}

export function sortChores(chores: Chore[], now: Date = new Date()): Chore[] {
  return [...chores].sort((a, b) => choreUrgency(b, now) - choreUrgency(a, now));
}

function isSnoozed(chore: Chore, now: Date): boolean {
  return !!chore.snoozedUntil && parseDate(chore.snoozedUntil).getTime() > startOfDay(now).getTime();
}

/**
 * 홈에 꺼낼 집안일: 차례가 됐거나 지난 것 + 기록이 아직 없는 것(한 번 찍게 유도).
 * 스누즈 중 제외, 급한 순.
 */
export function dueChores(chores: Chore[], now: Date = new Date()): Chore[] {
  return sortChores(chores, now).filter((c) => {
    const { state } = choreStatus(c, now);
    return (state === 'due' || state === 'overdue' || state === 'never') && !isSnoozed(c, now);
  });
}

/**
 * 네이티브 알림용: 다음에 홈에 뜰 날(차례일 또는 스누즈 해제일) 오전 9시.
 * 이미 지난 시각이면 null (앱을 열면 홈 카드로 보인다).
 */
export function choreNotifyAt(chore: Chore, now: Date = new Date()): number | null {
  const st = choreStatus(chore, now);
  const candidates = [st.nextDue, chore.snoozedUntil].filter((d): d is string => !!d);
  if (!candidates.length) return null;
  const day = candidates.sort()[candidates.length - 1];
  const at = parseDate(day);
  at.setHours(9, 0, 0, 0);
  return at.getTime() > now.getTime() ? at.getTime() : null;
}

/** '했어요' — 수행일 기록. 같은 날 두 번 눌러도 history는 한 번만. */
export function markDone(chore: Chore, date: string): Chore {
  const history = chore.history.filter((d) => d !== date);
  history.push(date);
  history.sort();
  const recent = history.slice(-10);
  return { ...chore, history: recent, lastDoneAt: recent[recent.length - 1], snoozedUntil: undefined };
}

/** 방금 누른 '했어요' 되돌리기 — 가장 최근 기록 하나를 지운다. */
export function undoDone(chore: Chore): Chore {
  const history = chore.history.slice(0, -1);
  return { ...chore, history, lastDoneAt: history[history.length - 1] };
}

/** 사람이 읽는 상태 문구 (색상 단독 정보 금지 → 텍스트 배지와 함께 쓴다) */
export function choreStateLabel(st: ChoreStatus): string {
  switch (st.state) {
    case 'never':
      return '첫 기록 전';
    case 'overdue':
      return `${Math.abs(st.daysLeft ?? 0)}일 지났어요`;
    case 'due':
      return '오늘 차례';
    case 'soon':
      return `${st.daysLeft}일 남음`;
    case 'ok':
      return `${st.daysLeft}일 여유`;
  }
}

export function daysSinceLabel(st: ChoreStatus): string {
  if (st.daysSince === null) return '기록 없음';
  if (st.daysSince === 0) return '오늘 했어요';
  return `${st.daysSince}일 전`;
}

export function intervalLabel(days: number): string {
  if (days % 30 === 0) return `${days / 30}달마다`;
  if (days % 7 === 0) return days === 7 ? '매주' : `${days / 7}주마다`;
  if (days === 1) return '매일';
  return `${days}일마다`;
}

// 무죄책 톤: 밀린 걸 탓하지 않고 '작은 첫 동작'만 권한다.
export function choreCopy(chore: Chore, now: Date = new Date()): string {
  const st = choreStatus(chore, now);
  const first = chore.hint ? ` ${chore.hint}부터 해볼까요?` : ' 딱 5분만 해볼까요?';
  if (st.state === 'never')
    return `'${chore.title}', 언제 했는지 몰라도 괜찮아요. 오늘 하면 여기서부터 셀게요.${first}`;
  if (st.state === 'overdue') return `'${chore.title}' 할 때가 조금 지났어요. 괜찮아요.${first}`;
  return `오늘은 '${chore.title}' 차례예요.${first}`;
}

// 처음 쓸 때 고르는 기본 집안일. 다 넣지 말고 5개 정도만 고르는 걸 권한다.
export interface ChorePreset {
  title: string;
  emoji: string;
  intervalDays: number;
  hint: string;
}

export const CHORE_PRESETS: ChorePreset[] = [
  { title: '이불·베개커버 빨래', emoji: '🛏️', intervalDays: 14, hint: '이불 커버만 벗겨서 세탁기에 넣기' },
  { title: '냉장고 유통기한 점검', emoji: '🧊', intervalDays: 7, hint: '"먼저 먹기" 칸만 열어보기' },
  { title: '화장실 청소', emoji: '🚽', intervalDays: 7, hint: '변기만 솔로 30초' },
  { title: '수건 교체', emoji: '🧺', intervalDays: 3, hint: '걸린 수건만 빨래통에' },
  { title: '청소기 돌리기', emoji: '🧹', intervalDays: 3, hint: '거실만 한 바퀴' },
  { title: '분리수거', emoji: '♻️', intervalDays: 7, hint: '현관에 봉투 내놓기' },
  { title: '세탁기 통세척', emoji: '🫧', intervalDays: 30, hint: '세제 넣고 통세척 버튼' },
  { title: '에어컨·청소기 필터', emoji: '🌀', intervalDays: 90, hint: '필터 하나만 빼서 털기' },
  { title: '칫솔 교체', emoji: '🪥', intervalDays: 90, hint: '새 칫솔 꺼내두기' },
  { title: '침대 매트리스 뒤집기', emoji: '🔄', intervalDays: 90, hint: '머리·발 방향만 바꾸기' },
];
