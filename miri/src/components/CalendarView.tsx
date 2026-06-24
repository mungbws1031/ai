import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { dDayLabel, parseDate } from '../lib/dates';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Subtask, Task } from '../types';

type Row =
  | { date: string; kind: 'due'; task: Task }
  | { date: string; kind: 'sub'; sub: Subtask; task?: Task };

export function CalendarView() {
  const tasks = useStore((s) => s.tasks);
  const subtasks = useStore((s) => s.subtasks);

  const grouped = useMemo(() => {
    const rows: Row[] = [];
    for (const t of tasks) {
      if (t.status === 'done') continue;
      rows.push({ date: t.dueDate, kind: 'due', task: t });
    }
    for (const s of subtasks) {
      const task = tasks.find((t) => t.id === s.taskId);
      rows.push({ date: s.scheduledDate, kind: 'sub', sub: s, task });
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date)!.push(r);
    }
    return [...map.entries()];
  }, [tasks, subtasks]);

  return (
    <div className="space-y-4">
      <header className="px-1">
        <h1 className="text-2xl font-bold text-ink">캘린더</h1>
        <p className="text-sm text-muted">역산으로 깔아둔 단계들이에요. 날짜는 눌러서 바꿔도 돼요.</p>
      </header>

      {grouped.length === 0 && (
        <p className="rounded-card bg-white p-6 text-center text-sm text-muted shadow-card">
          아직 잡힌 일정이 없어요. <br />
          <span className="text-ink">＋</span>로 마감만 던지면 제가 단계를 깔아둘게요.
        </p>
      )}

      {grouped.map(([date, rows]) => (
        <section key={date}>
          <div className="mb-1.5 flex items-baseline gap-2 px-1">
            <h2 className="text-sm font-bold text-ink">
              {format(parseDate(date), 'M월 d일 (EEE)', { locale: ko })}
            </h2>
            <span className="text-xs font-medium text-point">{dDayLabel(date)}</span>
          </div>
          <div className="space-y-1.5">
            {rows.map((r) =>
              r.kind === 'due' ? (
                <DueRow key={`due-${r.task.id}`} task={r.task} />
              ) : (
                <SubRow key={`sub-${r.sub.id}`} sub={r.sub} taskTitle={r.task?.title} />
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function DueRow({ task }: { task: Task }) {
  const del = useStore((s) => s.deleteTask);
  return (
    <div className="flex items-center gap-2 rounded-xl bg-point-soft/60 px-3 py-2.5">
      <span aria-hidden>🎯</span>
      <span className="flex-1 truncate text-sm font-semibold text-ink">{task.title}</span>
      <span className="text-xs text-point">마감</span>
      <button
        onClick={() => del(task.id)}
        aria-label="일정 삭제"
        className="px-1 text-muted hover:text-point"
      >
        ✕
      </button>
    </div>
  );
}

function SubRow({ sub, taskTitle }: { sub: Subtask; taskTitle?: string }) {
  const complete = useStore((s) => s.completeSubtask);
  const reschedule = useStore((s) => s.rescheduleSubtask);
  const [editing, setEditing] = useState(false);
  const done = sub.status === 'done';

  return (
    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-card">
      <input
        type="checkbox"
        checked={done}
        onChange={(e) => complete(sub.id, e.target.checked)}
        aria-label={`${sub.title} 완료`}
        className="h-5 w-5 accent-sage"
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${done ? 'text-muted line-through' : 'text-ink'}`}>
          {sub.title}
        </p>
        {taskTitle && <p className="truncate text-xs text-muted">{taskTitle}</p>}
      </div>
      {editing ? (
        <input
          type="date"
          value={sub.scheduledDate}
          onChange={(e) => {
            reschedule(sub.id, e.target.value);
            setEditing(false);
          }}
          className="rounded-lg border border-soft px-2 py-1 text-xs"
        />
      ) : (
        <button onClick={() => setEditing(true)} className="text-xs text-muted" aria-label="날짜 변경">
          옮기기
        </button>
      )}
    </div>
  );
}
