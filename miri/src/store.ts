import { create } from 'zustand';
import { db } from './db';
import type {
  HomeCard,
  Reminder,
  Season,
  SomedaySeed,
  Subtask,
  Task,
  TaskType,
  Vagueness,
} from './types';
import { buildRemindersForSubtask, buildRemindersForTask, dueReminders, snoozeToTomorrow } from './lib/reminders';
import { decomposeDeadline } from './lib/scheduler';
import { isLLMEnabled, llmDecompose } from './lib/llm';
import { dueSeeds, estimateRevisitAt } from './lib/someday';
import { seedPromptCopy, toneByStage } from './lib/tone';
import { uid } from './lib/id';

// FR-A02: 일정 유형별 기본 리마인더 프리셋
export const DEFAULT_REMINDER_CONFIG: Record<TaskType, number[]> = {
  deadline: [7, 3, 1],
  appointment: [7, 3, 1],
  recurring: [1],
  travel: [30, 14, 3],
};

export interface NewTaskInput {
  title: string;
  type: TaskType;
  dueDate: string; // yyyy-MM-dd
  reminderConfig?: number[];
  decompose?: boolean; // B 엔진으로 서브태스크 자동 생성할지
  sourceSeedId?: string;
}

interface MiriState {
  tasks: Task[];
  subtasks: Subtask[];
  reminders: Reminder[];
  seeds: SomedaySeed[];
  loaded: boolean;

  load: () => Promise<void>;

  // A + B
  createTask: (input: NewTaskInput) => Promise<Task>;
  completeReminder: (id: string) => Promise<void>;
  snoozeReminder: (id: string) => Promise<void>;
  completeSubtask: (id: string, done: boolean) => Promise<void>;
  rescheduleSubtask: (id: string, scheduledDate: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // C
  createSeed: (input: { text: string; season?: Season; target?: string; vagueness?: Vagueness; revisitAt?: string }) => Promise<void>;
  convertSeed: (seedId: string, dueDate: string, type?: TaskType) => Promise<void>;
  snoozeSeed: (seedId: string) => Promise<void>;
  dismissSeed: (seedId: string) => Promise<void>;

  // 홈 큐
  buildHomeCards: (now?: Date) => HomeCard[];
}

export const useStore = create<MiriState>((set, get) => ({
  tasks: [],
  subtasks: [],
  reminders: [],
  seeds: [],
  loaded: false,

  load: async () => {
    const [tasks, subtasks, reminders, seeds] = await Promise.all([
      db.tasks.toArray(),
      db.subtasks.toArray(),
      db.reminders.toArray(),
      db.seeds.toArray(),
    ]);
    set({ tasks, subtasks, reminders, seeds, loaded: true });
  },

  createTask: async (input) => {
    const now = new Date();
    const title = input.title.trim();
    // 빈 제목/날짜 방어: parseDate('')가 reminder·scheduler·calendar 전반에서 터지는 것 방지
    if (!title) throw new Error('제목이 필요해요');
    if (!input.dueDate) throw new Error('날짜가 필요해요');
    const task: Task = {
      id: uid(),
      title,
      type: input.type,
      dueDate: input.dueDate,
      subtasks: [],
      reminderConfig: input.reminderConfig ?? DEFAULT_REMINDER_CONFIG[input.type],
      status: 'open',
      sourceSeedId: input.sourceSeedId,
      createdAt: now.toISOString(),
    };

    const reminders = buildRemindersForTask(task, now); // FR-A01

    let subtasks: Subtask[] = [];
    const subReminders: Reminder[] = [];
    // 마감/여행은 기본으로 역산 분해 (FR-B01). 그 외 유형은 옵션.
    const shouldDecompose = input.decompose ?? (input.type === 'deadline' || input.type === 'travel');
    if (shouldDecompose) {
      // FR-B03: 기존 일정의 마감일 + 이미 배치된 서브태스크 날짜 모두를 충돌 회피 대상으로.
      const busy = new Set<string>([
        ...get().tasks.map((t) => t.dueDate),
        ...get().subtasks.map((s) => s.scheduledDate),
      ]);
      // FR-B02: LLM 분해가 켜져 있으면 우선 시도, 실패 시 규칙 템플릿으로 fallback.
      const llmSteps = isLLMEnabled() ? await llmDecompose(task) : null;
      subtasks = decomposeDeadline(task, { busy, steps: llmSteps ?? undefined });
      for (const s of subtasks) {
        subReminders.push(...buildRemindersForSubtask(s, undefined, now)); // FR-B04
      }
      task.subtasks = subtasks;
    }

    await db.transaction('rw', db.tasks, db.subtasks, db.reminders, async () => {
      await db.tasks.put(task);
      if (subtasks.length) await db.subtasks.bulkPut(subtasks);
      const allReminders = [...reminders, ...subReminders];
      if (allReminders.length) await db.reminders.bulkPut(allReminders);
    });

    await get().load();
    return task;
  },

  completeReminder: async (id) => {
    // FR-A04: 해당 리마인더 done, 동일 일정의 후속 stage는 유지
    await db.reminders.update(id, { status: 'done' });
    await get().load();
  },

  snoozeReminder: async (id) => {
    // FR-A06: 다음 날 재노출, 죄책감 없음
    await db.reminders.update(id, { status: 'snoozed', snoozedUntil: snoozeToTomorrow() });
    await get().load();
  },

  completeSubtask: async (id, done) => {
    // 서브태스크 완료 상태를 그 서브태스크의 리마인더와 함께 동기화한다.
    // (완료된 단계의 D-0 리마인더가 나중에 다시 홈에 뜨는 것 방지)
    await db.transaction('rw', db.subtasks, db.reminders, async () => {
      await db.subtasks.update(id, { status: done ? 'done' : 'open' });
      const rs = await db.reminders.where('subtaskId').equals(id).toArray();
      if (done) {
        const active = rs.filter((r) => r.status !== 'done');
        if (active.length) await db.reminders.bulkPut(active.map((r) => ({ ...r, status: 'done' as const })));
      } else {
        // 완료 취소 시: 닫아뒀던 리마인더를 다시 pending으로 되살린다.
        const closed = rs.filter((r) => r.status === 'done');
        if (closed.length)
          await db.reminders.bulkPut(closed.map((r) => ({ ...r, status: 'pending' as const, snoozedUntil: undefined })));
      }
    });
    await get().load();
  },

  rescheduleSubtask: async (id, scheduledDate) => {
    // FR-B05: 드래그/편집으로 조정. 옮긴 날짜에 맞춰 리마인더 fireAt도 다시 만든다.
    const sub = get().subtasks.find((s) => s.id === id);
    await db.transaction('rw', db.subtasks, db.reminders, async () => {
      await db.subtasks.update(id, { scheduledDate });
      await db.reminders.where('subtaskId').equals(id).delete();
      // 아직 완료 전인 서브태스크만 리마인더를 재생성한다.
      if (sub && sub.status !== 'done') {
        const fresh = buildRemindersForSubtask({ ...sub, scheduledDate });
        if (fresh.length) await db.reminders.bulkPut(fresh);
      }
    });
    await get().load();
  },

  deleteTask: async (id) => {
    const subs = await db.subtasks.where('taskId').equals(id).toArray();
    const subIds = new Set(subs.map((s) => s.id));
    await db.transaction('rw', db.tasks, db.subtasks, db.reminders, async () => {
      await db.tasks.delete(id);
      await db.subtasks.where('taskId').equals(id).delete();
      await db.reminders.where('taskId').equals(id).delete();
      const subReminders = await db.reminders.toArray();
      const toDelete = subReminders.filter((r) => r.subtaskId && subIds.has(r.subtaskId)).map((r) => r.id);
      if (toDelete.length) await db.reminders.bulkDelete(toDelete);
    });
    await get().load();
  },

  createSeed: async (input) => {
    const now = new Date();
    const seed: SomedaySeed = {
      id: uid(),
      text: input.text.trim(),
      season: input.season,
      target: input.target,
      vagueness: input.vagueness,
      revisitAt: input.revisitAt ?? estimateRevisitAt(input.season, now), // FR-C02
      status: 'dormant',
      createdAt: now.toISOString(),
    };
    await db.seeds.put(seed);
    await get().load();
  },

  convertSeed: async (seedId, dueDate, type = 'travel') => {
    // FR-C04: Yes → 역산 스케줄러(B)로 전달
    const task = await get().createTask({
      title: get().seeds.find((s) => s.id === seedId)?.text ?? '여행',
      type,
      dueDate,
      decompose: true,
      sourceSeedId: seedId,
    });
    await db.seeds.update(seedId, { status: 'converted', convertedTaskId: task.id });
    await get().load();
  },

  snoozeSeed: async (seedId) => {
    // No → dormant 재보관 (다음 분기에 다시 묻기)
    const next = new Date();
    next.setMonth(next.getMonth() + 3);
    await db.seeds.update(seedId, { status: 'dormant', revisitAt: next.toISOString() });
    await get().load();
  },

  dismissSeed: async (seedId) => {
    await db.seeds.update(seedId, { status: 'dismissed' });
    await get().load();
  },

  buildHomeCards: (now = new Date()) => {
    const { reminders, seeds, tasks } = get();
    const cards: HomeCard[] = [];

    for (const r of dueReminders(reminders, now)) {
      const taskTitle =
        r.taskId != null ? tasks.find((t) => t.id === r.taskId)?.title ?? r.title : r.title;
      cards.push({ kind: 'reminder', reminder: r, copy: toneByStage(r.stage, r.title), taskTitle });
    }

    for (const s of dueSeeds(seeds, now)) {
      cards.push({ kind: 'seed', seed: s, copy: seedPromptCopy(s.text) });
    }

    return cards;
  },
}));

// 앱이 떠 있는 동안에도 리마인더가 '도달'하도록 표시 상태로 승격 (§8.2)
export async function promoteShown(now: Date = new Date()): Promise<void> {
  const due = await db.reminders.where('status').equals('pending').toArray();
  const t = now.getTime();
  const toShow = due.filter((r) => new Date(r.fireAt).getTime() <= t);
  if (toShow.length) {
    await db.reminders.bulkPut(toShow.map((r) => ({ ...r, status: 'shown' as const })));
  }
}

// §8.4: appOpen 시 되묻기 도달한 dormant seed를 prompted로 승격 (전환 KPI 베이스라인)
export async function promotePromptedSeeds(now: Date = new Date()): Promise<void> {
  const dormant = await db.seeds.where('status').equals('dormant').toArray();
  const t = now.getTime();
  const toPrompt = dormant.filter((s) => new Date(s.revisitAt).getTime() <= t);
  if (toPrompt.length) {
    await db.seeds.bulkPut(toPrompt.map((s) => ({ ...s, status: 'prompted' as const })));
  }
}
