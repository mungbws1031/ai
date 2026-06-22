'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store-context';
import { decodeScheduleEvents, SharedSchedEvent } from '@/lib/share';

function dateLabel(d: string): string {
  const [, m, day] = d.split('-');
  return `${parseInt(m, 10)}월 ${parseInt(day, 10)}일`;
}

/** 친구가 보낸 #sched= 링크로 들어왔을 때 일정을 미리보고 가져오기. */
export default function ScheduleImport() {
  const { state, addEvent, pushToast } = useStore();
  const [incoming, setIncoming] = useState<SharedSchedEvent[] | null>(null);

  useEffect(() => {
    const h = window.location.hash;
    const m = h.match(/sched=([^&]+)/);
    if (!m) return;
    const decoded = decodeScheduleEvents(m[1]);
    if (decoded && decoded.length > 0) setIncoming(decoded);
    // 해시는 한 번 읽고 정리(새로고침 시 재등장 방지)
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  if (!incoming) return null;

  // 이미 있는 일정은 중복 제외
  const exists = (e: SharedSchedEvent) =>
    state.schedule.some((s) => s.date === e.date && (s.time || '') === (e.time || '') && s.title === e.title);
  const fresh = incoming.filter((e) => !exists(e));

  function importAll() {
    fresh.forEach((e) => addEvent(e.date, e.title, e.time || undefined));
    pushToast(`친구 일정 ${fresh.length}개를 달력에 담았어 🐣`);
    setIncoming(null);
  }

  return (
    <section className="card mb-3 flex flex-col gap-3 border-eddie-primary/30 bg-eddie-primary-soft">
      <p className="font-semibold">🐣 친구가 일정을 보냈어</p>
      <ul className="flex flex-col gap-1 text-sm">
        {incoming.map((e, i) => (
          <li key={i} className={exists(e) ? 'text-eddie-muted' : ''}>
            <span className="font-medium text-eddie-primary">{dateLabel(e.date)}</span>
            {e.time && <span className="text-eddie-muted"> {e.time}</span>} · {e.title}
            {exists(e) && <span className="text-eddie-muted"> (이미 있음)</span>}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button onClick={() => setIncoming(null)} className="btn-soft flex-1 text-sm">
          닫기
        </button>
        <button onClick={importAll} disabled={fresh.length === 0} className="btn-primary flex-1 text-sm disabled:opacity-40">
          {fresh.length > 0 ? `${fresh.length}개 가져오기` : '모두 이미 있음'}
        </button>
      </div>
    </section>
  );
}
