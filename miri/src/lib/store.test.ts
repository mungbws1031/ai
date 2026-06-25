import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { addDays, format } from 'date-fns';
import { db } from '../db';
import { useStore } from '../store';

const due = (offset: number) => format(addDays(new Date(), offset), 'yyyy-MM-dd');

async function reset() {
  await Promise.all([db.tasks.clear(), db.subtasks.clear(), db.reminders.clear(), db.seeds.clear()]);
  await useStore.getState().load();
}

beforeEach(reset);

describe('빈 입력 방어', () => {
  it('날짜가 비면 createTask가 거부한다', async () => {
    const { createTask } = useStore.getState();
    await expect(createTask({ title: '제목', type: 'appointment', dueDate: '' })).rejects.toThrow();
    expect(useStore.getState().tasks).toHaveLength(0);
  });

  it('제목이 비면 createTask가 거부한다', async () => {
    const { createTask } = useStore.getState();
    await expect(createTask({ title: '  ', type: 'appointment', dueDate: '2026-07-01' })).rejects.toThrow();
    expect(useStore.getState().tasks).toHaveLength(0);
  });
});

describe('FR-B03 충돌 회피: 기존 서브태스크 날짜도 busy에 포함', () => {
  it('두 번째 역산 계획이 첫 계획의 서브태스크 날짜와 겹치지 않는다', async () => {
    const { createTask } = useStore.getState();
    await createTask({ title: '보고서 A', type: 'deadline', dueDate: due(20), decompose: true });
    await createTask({ title: '보고서 B', type: 'deadline', dueDate: due(20), decompose: true });

    const subs = useStore.getState().subtasks;
    const a = subs.filter((s) => s.title && subs.length).map((s) => s.scheduledDate);
    // 모든 서브태스크 날짜가 유니크 (두 계획 사이에도 충돌 없음)
    expect(new Set(a).size).toBe(a.length);
  });
});

describe('서브태스크 이동 시 리마인더 재동기화', () => {
  it('rescheduleSubtask가 옮긴 날짜 기준으로 fireAt을 다시 만든다', async () => {
    const { createTask, rescheduleSubtask } = useStore.getState();
    await createTask({ title: '보고서', type: 'deadline', dueDate: due(30), decompose: true });

    const sub = useStore.getState().subtasks[0];
    const newDate = due(25);
    await rescheduleSubtask(sub.id, newDate);

    const rs = useStore.getState().reminders.filter((r) => r.subtaskId === sub.id);
    expect(rs.length).toBeGreaterThan(0);
    // D-0 리마인더의 날짜가 새 날짜와 같아야 한다
    const d0 = rs.find((r) => r.fireAt.startsWith(newDate));
    expect(d0).toBeDefined();
    // 옛 날짜로 남은 리마인더가 없어야 한다
    expect(rs.every((r) => !r.fireAt.startsWith(sub.scheduledDate) || sub.scheduledDate === newDate)).toBe(true);
  });
});

describe('서브태스크 완료 시 리마인더 동기화', () => {
  it('완료하면 해당 서브태스크 리마인더가 done 처리된다', async () => {
    const { createTask, completeSubtask } = useStore.getState();
    await createTask({ title: '보고서', type: 'deadline', dueDate: due(30), decompose: true });

    const sub = useStore.getState().subtasks[0];
    await completeSubtask(sub.id, true);

    const rs = useStore.getState().reminders.filter((r) => r.subtaskId === sub.id);
    expect(rs.length).toBeGreaterThan(0);
    expect(rs.every((r) => r.status === 'done')).toBe(true);
  });

  it('완료 취소하면 리마인더가 다시 pending이 된다', async () => {
    const { createTask, completeSubtask } = useStore.getState();
    await createTask({ title: '보고서', type: 'deadline', dueDate: due(30), decompose: true });

    const sub = useStore.getState().subtasks[0];
    await completeSubtask(sub.id, true);
    await completeSubtask(sub.id, false);

    const rs = useStore.getState().reminders.filter((r) => r.subtaskId === sub.id);
    expect(rs.every((r) => r.status === 'pending')).toBe(true);
  });
});
