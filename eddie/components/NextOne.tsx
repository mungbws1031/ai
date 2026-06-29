'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store-context';
import FocusMode from './FocusMode';
import EddieFace from './EddieFace';

interface Suggestion {
  label: string;
  sub?: string;
  done: () => void;
}

/**
 * "지금 뭐 하지?" — 결정 마비를 줄이려 딱 하나만 추천한다.
 * 우선순위: 오늘 마감 → 시각 있는 오늘 일정 → 우선(★) 할 일 → 알림 걸린 할 일 → 그 외 할 일.
 */
export default function NextOne() {
  const { state, today, toggleDeadline, toggleEvent, toggleTodo } = useStore();
  const [focusing, setFocusing] = useState<Suggestion | null>(null);

  function pick(): Suggestion | null {
    const dl = state.deadlines
      .filter((d) => d.date === today && !d.done)
      .sort((a, b) => a.time.localeCompare(b.time))[0];
    if (dl) return { label: dl.text, sub: `${dl.time}까지`, done: () => toggleDeadline(dl.id) };

    const ev = state.schedule
      .filter((e) => e.date === today && !e.done && e.time)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))[0];
    if (ev) return { label: ev.title, sub: `${ev.time} 일정`, done: () => toggleEvent(ev.id) };

    const prio = state.todos.find((t) => !t.done && t.priority);
    if (prio) return { label: prio.text, sub: '오늘 꼭', done: () => toggleTodo(prio.id) };

    const remind = state.todos
      .filter((t) => !t.done && t.remindAt && t.remindDate === today)
      .sort((a, b) => (a.remindAt || '').localeCompare(b.remindAt || ''))[0];
    if (remind) return { label: remind.text, sub: `🔔 ${remind.remindAt}`, done: () => toggleTodo(remind.id) };

    const open = state.todos.find((t) => !t.done);
    if (open) return { label: open.text, done: () => toggleTodo(open.id) };

    return null;
  }

  const s = pick();

  return (
    <section className="card border-eddie-primary/30 bg-eddie-primary-soft/40">
      <div className="flex items-center gap-3">
        <EddieFace mood="cheer" size="sm" />
        <div className="flex-1">
          <p className="text-sm text-eddie-muted">지금 뭐 하지?</p>
          {s ? (
            <p className="font-semibold">
              {s.label}
              {s.sub && <span className="ml-1 text-sm font-normal text-eddie-muted">· {s.sub}</span>}
            </p>
          ) : (
            <p className="font-semibold">지금은 좀 쉬어도 괜찮아 🌿</p>
          )}
        </div>
      </div>
      {s && (
        <div className="mt-3 flex gap-2">
          <button onClick={() => setFocusing(s)} className="btn-primary flex-1 text-sm">
            🎯 이거 집중
          </button>
          <button onClick={s.done} className="btn-soft flex-1 text-sm">
            ✓ 끝냈어
          </button>
        </div>
      )}

      {focusing && (
        <FocusMode
          task={focusing.label}
          onClose={() => setFocusing(null)}
          onComplete={() => {
            focusing.done();
            setFocusing(null);
          }}
        />
      )}
    </section>
  );
}
