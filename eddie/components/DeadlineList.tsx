'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store-context';

const LEADS = [30, 10, 5];

function remainLabel(mins: number): string {
  if (mins < 0) return '마감 지남';
  if (mins === 0) return '지금';
  if (mins < 60) return `${mins}분 남음`;
  return `${Math.floor(mins / 60)}시간 ${mins % 60}분 남음`;
}

/**
 * 마감 알림 — 공항·놀이동산처럼 정신없는 곳에서 '몇 시까지' 할 일을 넣어두면
 * 10분·5분 전·정시에 알림 + 남은 시간 카운트다운.
 */
export default function DeadlineList() {
  const { state, today, addDeadline, toggleDeadline, removeDeadline } = useStore();
  const [text, setText] = useState('');
  const [time, setTime] = useState('');
  const [leads, setLeads] = useState<number[]>([10, 5]);
  const [now, setNow] = useState(() => Date.now());

  // 카운트다운 갱신
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(iv);
  }, []);

  const items = state.deadlines
    .filter((d) => d.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  function toggleLead(n: number) {
    setLeads((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n].sort((a, b) => b - a)));
  }

  function minutesLeft(time: string): number {
    const [hh, mm] = time.split(':').map((x) => parseInt(x, 10));
    const dl = new Date();
    dl.setHours(hh, mm, 0, 0);
    return Math.round((dl.getTime() - now) / 60000);
  }

  return (
    <section className="card">
      <div className="mb-1 flex items-center justify-between">
        <p className="font-semibold">⏰ 마감 알림</p>
      </div>
      <p className="mb-3 text-xs text-eddie-muted">공항·놀이동산처럼 복잡한 곳에서, 몇 시까지 할 일을 넣어두면 미리 알려줄게.</p>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addDeadline(text, time, leads);
          setText('');
          setTime('');
          setLeads([10, 5]);
        }}
      >
        <input
          className="field"
          placeholder="몇 시까지 할 일 (예: 탑승수속, 픽업 장소 가기)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="마감 할 일"
        />
        <div className="flex gap-2">
          <input
            className="field flex-1"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="마감 시각"
          />
          <button type="submit" className="btn-primary shrink-0 text-sm" disabled={!text.trim() || !time}>
            추가
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-eddie-muted">미리 알림</span>
          {LEADS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => toggleLead(n)}
              aria-pressed={leads.includes(n)}
              className={`min-h-tap flex-1 rounded-xl border text-sm font-medium ${
                leads.includes(n)
                  ? 'border-eddie-primary bg-eddie-primary-soft text-eddie-primary'
                  : 'border-eddie-line text-eddie-muted'
              }`}
            >
              {n}분 전
            </button>
          ))}
        </div>
        <p className="text-xs text-eddie-muted">정시 알림은 항상 포함돼.</p>
      </form>

      {items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((d) => {
            const left = minutesLeft(d.time);
            const urgent = !d.done && left >= 0 && left <= 10;
            return (
              <li
                key={d.id}
                className={`flex items-center gap-3 rounded-xl border p-2 ${
                  urgent ? 'border-eddie-accent bg-eddie-accent/10' : 'border-eddie-line dark:border-neutral-700'
                }`}
              >
                <button
                  onClick={() => toggleDeadline(d.id)}
                  aria-pressed={d.done}
                  aria-label={`${d.text} 완료`}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    d.done ? 'border-eddie-primary bg-eddie-primary text-white' : 'border-eddie-line'
                  }`}
                >
                  {d.done ? '✓' : ''}
                </button>
                <div className={`flex-1 ${d.done ? 'text-eddie-muted line-through' : ''}`}>
                  <p className="font-medium">{d.text}</p>
                  <p className="text-xs text-eddie-muted">
                    <span className="font-mono text-eddie-primary">{d.time}</span>까지
                    {!d.done && <span className={urgent ? 'text-eddie-accent' : ''}> · {remainLabel(left)}</span>}
                  </p>
                </div>
                <button onClick={() => removeDeadline(d.id)} className="btn-ghost px-2 text-red-500" aria-label="삭제">
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
