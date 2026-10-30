import { describe, it, expect } from 'vitest';
import { addDays, format } from 'date-fns';
import {
  choreNotifyAt,
  choreStatus,
  dueChores,
  intervalLabel,
  markDone,
  sortChores,
  undoDone,
} from './chores';
import type { Chore } from '../types';

const NOW = new Date('2026-06-23T09:00:00');
const dstr = (offset: number) => format(addDays(NOW, offset), 'yyyy-MM-dd');

function makeChore(over: Partial<Chore> = {}): Chore {
  return {
    id: 'c1',
    title: '이불 빨래',
    intervalDays: 14,
    history: [],
    createdAt: NOW.toISOString(),
    ...over,
  };
}

describe('D. 집안일 상태 계산', () => {
  it('기록 없으면 never', () => {
    expect(choreStatus(makeChore(), NOW).state).toBe('never');
  });

  it('주기 지나면 overdue, 딱 차례면 due, 직전이면 soon, 넉넉하면 ok', () => {
    expect(choreStatus(makeChore({ lastDoneAt: dstr(-16) }), NOW)).toMatchObject({ state: 'overdue', daysLeft: -2, daysSince: 16 });
    expect(choreStatus(makeChore({ lastDoneAt: dstr(-14) }), NOW).state).toBe('due');
    expect(choreStatus(makeChore({ lastDoneAt: dstr(-12) }), NOW).state).toBe('soon');
    expect(choreStatus(makeChore({ lastDoneAt: dstr(-2) }), NOW).state).toBe('ok');
  });

  it('주기 대비 많이 밀린 순으로 정렬 (기록 없음이 맨 위)', () => {
    const a = makeChore({ id: 'a', intervalDays: 14, lastDoneAt: dstr(-14) }); // 1.0
    const b = makeChore({ id: 'b', intervalDays: 3, lastDoneAt: dstr(-6) }); // 2.0
    const c = makeChore({ id: 'c' }); // never
    expect(sortChores([a, b, c], NOW).map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });

  it('홈 노출: due/overdue/never만, 스누즈 중이면 제외', () => {
    const due = makeChore({ id: 'due', lastDoneAt: dstr(-14) });
    const ok = makeChore({ id: 'ok', lastDoneAt: dstr(-1) });
    const snoozed = makeChore({ id: 's', lastDoneAt: dstr(-20), snoozedUntil: dstr(1) });
    const never = makeChore({ id: 'n' });
    expect(dueChores([due, ok, snoozed, never], NOW).map((x) => x.id).sort()).toEqual(['due', 'n']);
  });

  it('스누즈 기한이 오늘이면 다시 뜬다', () => {
    const c = makeChore({ lastDoneAt: dstr(-20), snoozedUntil: dstr(0) });
    expect(dueChores([c], NOW)).toHaveLength(1);
  });
});

describe('D. 했어요 / 되돌리기', () => {
  it('markDone은 날짜 기록 + 스누즈 해제, 같은 날 중복 없음', () => {
    let c = makeChore({ snoozedUntil: dstr(1) });
    c = markDone(c, dstr(0));
    c = markDone(c, dstr(0));
    expect(c.history).toEqual([dstr(0)]);
    expect(c.lastDoneAt).toBe(dstr(0));
    expect(c.snoozedUntil).toBeUndefined();
  });

  it('과거 날짜로 기록해도 최신 날짜가 lastDoneAt', () => {
    let c = markDone(makeChore(), dstr(0));
    c = markDone(c, dstr(-5));
    expect(c.lastDoneAt).toBe(dstr(0));
  });

  it('undoDone은 직전 기록으로 돌아간다', () => {
    let c = markDone(makeChore(), dstr(-14));
    c = markDone(c, dstr(0));
    c = undoDone(c);
    expect(c.lastDoneAt).toBe(dstr(-14));
    expect(undoDone(c).lastDoneAt).toBeUndefined();
  });

  it('history는 최근 10개까지만', () => {
    let c = makeChore();
    for (let i = 20; i >= 0; i--) c = markDone(c, dstr(-i));
    expect(c.history).toHaveLength(10);
    expect(c.lastDoneAt).toBe(dstr(0));
  });
});

describe('D. 알림 시각 / 라벨', () => {
  it('다음 차례일 오전 9시, 이미 지났으면 null', () => {
    const at = choreNotifyAt(makeChore({ intervalDays: 7, lastDoneAt: dstr(-2) }), NOW);
    expect(at).toBe(new Date(`${dstr(5)}T09:00:00`).getTime());
    expect(choreNotifyAt(makeChore({ lastDoneAt: dstr(-20) }), NOW)).toBeNull();
    expect(choreNotifyAt(makeChore(), NOW)).toBeNull();
  });

  it('스누즈 중이면 스누즈 해제일 오전 9시', () => {
    const at = choreNotifyAt(makeChore({ lastDoneAt: dstr(-20), snoozedUntil: dstr(1) }), NOW);
    expect(at).toBe(new Date(`${dstr(1)}T09:00:00`).getTime());
  });

  it('주기 라벨', () => {
    expect(intervalLabel(1)).toBe('매일');
    expect(intervalLabel(7)).toBe('매주');
    expect(intervalLabel(14)).toBe('2주마다');
    expect(intervalLabel(30)).toBe('1달마다');
    expect(intervalLabel(3)).toBe('3일마다');
  });
});
