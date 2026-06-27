import type { Subtask, Task } from '../types';
import { daysUntil, dDayLabel } from './dates';

export interface UpcomingItem {
  id: string;
  title: string;
  date: string; // yyyy-MM-dd
  dday: string; // 'D-7' 등
  kind: 'deadline' | 'step';
  taskTitle?: string; // step일 때 상위 일정명
}

/**
 * 홈 "곧 다가와요" 미리보기용. 아직 리마인더로 뜨지 않은 가까운 미래 항목을 보여줘
 * 선제성 빈 화면(등록했는데 한동안 홈이 비어 보임)을 해소한다.
 * - 분해된 일정: open 서브태스크(=실제 착수 단계)를 보여준다.
 * - 분해 안 된 일정: 일정 자체의 마감일을 보여준다.
 */
export function upcomingItems(
  tasks: Task[],
  subtasks: Subtask[],
  now: Date = new Date(),
  withinDays = 14,
  limit = 5,
): UpcomingItem[] {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const tasksWithSubs = new Set(subtasks.map((s) => s.taskId));
  const items: UpcomingItem[] = [];

  // 오늘(D-DAY) 항목은 이미 리마인더 카드로 떠 있으므로 내일(d>=1)부터만 미리 보여준다.
  for (const s of subtasks) {
    if (s.status !== 'open') continue;
    const d = daysUntil(s.scheduledDate, now);
    if (d < 1 || d > withinDays) continue;
    const t = taskById.get(s.taskId);
    if (t && t.status === 'done') continue;
    items.push({
      id: s.id,
      title: s.title,
      date: s.scheduledDate,
      dday: dDayLabel(s.scheduledDate, now),
      kind: 'step',
      taskTitle: t?.title,
    });
  }

  for (const t of tasks) {
    if (t.status !== 'open' || tasksWithSubs.has(t.id)) continue;
    const d = daysUntil(t.dueDate, now);
    if (d < 1 || d > withinDays) continue;
    items.push({ id: t.id, title: t.title, date: t.dueDate, dday: dDayLabel(t.dueDate, now), kind: 'deadline' });
  }

  items.sort((a, b) => a.date.localeCompare(b.date));
  return items.slice(0, limit);
}
