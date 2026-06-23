import { addDays, startOfDay } from 'date-fns';
import type { Reminder, Subtask, Task } from '../types';
import { parseDate, toDateStr } from './dates';
import { stageFor } from './tone';
import { uid } from './id';

// 오늘 자정에 잡힌 리마인더도 "오늘 떠야 할 것"으로 보고 생성한다.
// (생성 시각이 오후여도 그날 0시 fireAt을 과거로 버리지 않도록 day 경계로 비교)
function notYetPast(fireAt: Date, now: Date): boolean {
  return fireAt.getTime() >= startOfDay(now).getTime();
}

/**
 * FR-A01 / §8.1: 일정의 reminderConfig에 따라 Reminder 레코드를 생성한다.
 * fireAt이 과거인 단계는 생성하지 않는다 (이미 지난 알림).
 */
export function buildRemindersForTask(task: Task, now: Date = new Date()): Reminder[] {
  const due = parseDate(task.dueDate);
  const out: Reminder[] = [];
  for (const d of task.reminderConfig) {
    const fireAt = addDays(due, -d);
    if (notYetPast(fireAt, now)) {
      out.push({
        id: uid(),
        taskId: task.id,
        title: task.title,
        fireAt: fireAt.toISOString(),
        stage: stageFor(d),
        status: 'pending',
      });
    }
  }
  return out;
}

/**
 * FR-B04: 서브태스크에도 3-Step 리마인더를 자동 연결한다.
 * 서브태스크는 scheduledDate 자체가 "그 날 해야 할 일"이므로 D-1/D-0를 단 단계로 띄운다.
 */
export function buildRemindersForSubtask(
  sub: Subtask,
  config: number[] = [1, 0],
  now: Date = new Date(),
): Reminder[] {
  const day = parseDate(sub.scheduledDate);
  const out: Reminder[] = [];
  for (const d of config) {
    const fireAt = addDays(day, -d);
    if (notYetPast(fireAt, now)) {
      out.push({
        id: uid(),
        subtaskId: sub.id,
        title: sub.title,
        fireAt: fireAt.toISOString(),
        stage: stageFor(d),
        status: 'pending',
      });
    }
  }
  return out;
}

/**
 * FR-A03 / §8.2: 지금 떠야 할(=홈에 노출할) 리마인더를 고른다.
 * - pending/shown 이고 fireAt<=now 인 것 (shown은 도달 추적용으로 승격됐을 뿐 계속 노출)
 * - snoozed 인데 snoozedUntil<=now 인 것
 * done 은 제외.
 */
export function dueReminders(reminders: Reminder[], now: Date = new Date()): Reminder[] {
  const t = now.getTime();
  return reminders
    .filter((r) => {
      if (r.status === 'pending' || r.status === 'shown')
        return new Date(r.fireAt).getTime() <= t;
      if (r.status === 'snoozed' && r.snoozedUntil)
        return new Date(r.snoozedUntil).getTime() <= t;
      return false;
    })
    .sort((a, b) => new Date(a.fireAt).getTime() - new Date(b.fireAt).getTime());
}

/** 스누즈: 다음 날 같은 시각으로 재노출 (FR-A06) */
export function snoozeToTomorrow(now: Date = new Date()): string {
  const tomorrow = addDays(now, 1);
  return `${toDateStr(tomorrow)}T08:00:00`;
}
