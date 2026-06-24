import { addDays } from 'date-fns';
import type { Subtask, Task } from '../types';
import { parseDate, previousAvailableDay, toDateStr } from './dates';
import { templateFor, type TemplateStep } from './templates';
import { uid } from './id';

export interface DecomposeOptions {
  busy?: Set<string>; // 기존 일정 날짜들 (FR-B03 충돌 회피)
  steps?: TemplateStep[]; // LLM 분해 등 외부 주입 (FR-B02 두 번째 경로)
}

/**
 * FR-B01/B02/B03 · §8.3: 마감일+유형 기준으로 서브태스크를 역방향 배치한다.
 * - 기본은 내장 RULE_TEMPLATE, opts.steps로 LLM 분해 결과를 주입할 수 있다.
 * - 주말/공휴일/기존 일정과 겹치면 가용일로 앞당긴다.
 * - 같은 날 중복 배치를 피하기 위해 직전 배치일도 busy에 누적한다.
 */
export function decomposeDeadline(task: Task, opts: DecomposeOptions = {}): Subtask[] {
  const steps = opts.steps ?? templateFor(task.type);
  const busy = new Set(opts.busy ?? []);
  const due = parseDate(task.dueDate);

  // offset이 큰(이른) 순으로 처리하면 cursor가 자연스럽게 과거로 흐른다.
  const ordered = [...steps].sort((a, b) => b.offset - a.offset);

  const subs: Subtask[] = [];
  for (const step of ordered) {
    const target = addDays(due, -step.offset);
    const placed = previousAvailableDay(target, busy);
    const dateStr = toDateStr(placed);
    busy.add(dateStr); // 다음 스텝이 같은 날에 겹치지 않도록
    subs.push({
      id: uid(),
      taskId: task.id,
      title: step.title,
      scheduledDate: dateStr,
      status: 'open',
    });
  }
  // 화면 표시는 이른 날짜부터
  return subs.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}
