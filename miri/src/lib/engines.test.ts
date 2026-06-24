import { describe, it, expect } from 'vitest';
import { addDays, format } from 'date-fns';
import { buildRemindersForTask, dueReminders } from './reminders';
import { decomposeDeadline } from './scheduler';
import { estimateRevisitAt, dueSeeds } from './someday';
import { previousAvailableDay, parseDate, isAvailable } from './dates';
import { toneByStage, stageFor } from './tone';
import { selectNotifications } from './native';
import type { Reminder, SomedaySeed, Task } from '../types';

const NOW = new Date('2026-06-23T09:00:00');
const dstr = (offset: number) => format(addDays(NOW, offset), 'yyyy-MM-dd');

function makeTask(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: '분기 보고서',
    type: 'deadline',
    dueDate: dstr(22),
    subtasks: [],
    reminderConfig: [7, 3, 1],
    status: 'open',
    createdAt: NOW.toISOString(),
    ...over,
  };
}

describe('FR-A01 리마인더 생성', () => {
  it('일정 1건 → reminderConfig 길이만큼 Reminder 생성', () => {
    const rs = buildRemindersForTask(makeTask(), NOW);
    expect(rs).toHaveLength(3); // D-7/D-3/D-1 모두 미래
    expect(rs.every((r) => r.taskId === 't1')).toBe(true);
  });

  it('이미 지난 단계는 생성하지 않는다', () => {
    // 마감이 내일 → D-7/D-3는 과거, D-1만 미래
    const rs = buildRemindersForTask(makeTask({ dueDate: dstr(1) }), NOW);
    expect(rs).toHaveLength(1);
    expect(rs[0].stage).toBe(3);
  });
});

describe('FR-A03/A05 홈 큐 + 톤 에스컬레이션', () => {
  it('fireAt<=now 인 pending만 노출', () => {
    const task = makeTask({ dueDate: dstr(1) }); // D-1 fireAt = today
    const rs = buildRemindersForTask(task, NOW);
    const due = dueReminders(rs, NOW);
    expect(due).toHaveLength(1);
  });

  it('stage별 카피 3종이 서로 다르다', () => {
    const c1 = toneByStage(1, 'x');
    const c2 = toneByStage(2, 'x');
    const c3 = toneByStage(3, 'x');
    expect(new Set([c1, c2, c3]).size).toBe(3);
  });

  it('stageFor: 멀수록 1, 가까울수록 3', () => {
    expect(stageFor(7)).toBe(1);
    expect(stageFor(3)).toBe(2);
    expect(stageFor(1)).toBe(3);
  });
});

describe('FR-B01/B03 역산 분해 + 충돌 회피', () => {
  it('마감 1건 → 서브태스크 N건, 마지막은 마감일', () => {
    const subs = decomposeDeadline(makeTask({ dueDate: '2026-07-15' }));
    expect(subs.length).toBeGreaterThanOrEqual(3); // G2: 평균 3개 이상
    const last = subs[subs.length - 1];
    expect(last.title).toContain('제출');
  });

  it('배치된 모든 날짜는 가용일(주말·공휴일 아님)', () => {
    const subs = decomposeDeadline(makeTask({ dueDate: '2026-07-15' }));
    for (const s of subs) {
      expect(isAvailable(parseDate(s.scheduledDate))).toBe(true);
    }
  });

  it('서브태스크 날짜는 서로 겹치지 않는다', () => {
    const subs = decomposeDeadline(makeTask({ dueDate: '2026-07-15' }));
    const dates = subs.map((s) => s.scheduledDate);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('여행 유형은 전용 템플릿(항공권/연차/숙소/준비물)', () => {
    const subs = decomposeDeadline(makeTask({ type: 'travel', dueDate: '2026-12-25' }));
    const titles = subs.map((s) => s.title).join(' ');
    expect(titles).toContain('항공권');
    expect(titles).toContain('연차');
    expect(titles).toContain('숙소');
    // 확장된 실사용 단계
    expect(titles).toContain('짐');
    expect(subs.length).toBeGreaterThanOrEqual(6);
  });
});

describe('previousAvailableDay', () => {
  it('주말이면 금요일로 당긴다', () => {
    // 2026-06-21은 일요일 → 금요일 2026-06-19
    const placed = previousAvailableDay(parseDate('2026-06-21'));
    expect(format(placed, 'yyyy-MM-dd')).toBe('2026-06-19');
  });

  it('busy 날짜를 피한다', () => {
    const placed = previousAvailableDay(parseDate('2026-06-19'), new Set(['2026-06-19']));
    expect(format(placed, 'yyyy-MM-dd')).toBe('2026-06-18');
  });
});

describe('네이티브 알림 선택: 캡 적용 전 정렬', () => {
  const r = (id: string, days: number): Reminder => ({
    id,
    title: id,
    fireAt: new Date(NOW.getTime() + days * 86400000).toISOString(),
    stage: 1,
    status: 'pending',
  });

  it('가까운 알림이 먼 알림보다 먼저 선택된다 (캡으로 누락 안 됨)', () => {
    // DB 순서는 무작위(먼 것이 앞)일 수 있음 — 캡=2면 가까운 2개가 남아야 함
    const reminders = [r('far', 100), r('soon', 1), r('mid', 30)];
    const picked = selectNotifications(reminders, NOW.getTime(), 2).map((x) => x.r.id);
    expect(picked).toEqual(['soon', 'mid']);
  });

  it('과거/도달한 리마인더는 제외된다', () => {
    const picked = selectNotifications([r('past', -5), r('future', 5)], NOW.getTime());
    expect(picked.map((x) => x.r.id)).toEqual(['future']);
  });
});

describe('FR-C02/C03 Someday 되묻기', () => {
  it('여름 → 직전 봄(3월)으로 되묻기 추정', () => {
    const iso = estimateRevisitAt('summer', NOW);
    expect(new Date(iso).getMonth()).toBe(2); // 3월
  });

  it('revisitAt 도달한 dormant seed만 노출', () => {
    const seeds: SomedaySeed[] = [
      { id: 's1', text: 'a', revisitAt: addDays(NOW, -1).toISOString(), status: 'dormant', createdAt: '' },
      { id: 's2', text: 'b', revisitAt: addDays(NOW, 30).toISOString(), status: 'dormant', createdAt: '' },
      { id: 's3', text: 'c', revisitAt: addDays(NOW, -1).toISOString(), status: 'converted', createdAt: '' },
    ];
    const due = dueSeeds(seeds, NOW);
    expect(due.map((s) => s.id)).toEqual(['s1']);
  });
});
