'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store-context';
import { eddieLine } from '@/lib/eddie';
import EddieBubble from './EddieBubble';

interface Dose {
  medId: string;
  name: string;
  time: string;
}

// FR-202/203 — 오늘 복약. 원탭 기록 + 놓침 시 비난 없는 회복.
export default function MedicationToday() {
  const { state, today, recordMed } = useStore();
  const now = new Date();
  const weekday = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const doses: Dose[] = [];
  state.medications.forEach((m) => {
    const onDay = m.weekdays.length === 0 || m.weekdays.includes(weekday);
    if (!onDay) return;
    m.times.forEach((t) => doses.push({ medId: m.id, name: m.name, time: t }));
  });
  doses.sort((a, b) => a.time.localeCompare(b.time));

  if (state.medications.length === 0) {
    return (
      <Link href="/more/medications" className="card flex items-center justify-between">
        <div>
          <p className="font-semibold">약</p>
          <p className="text-sm text-eddie-muted">복약 알림을 추가해 볼까?</p>
        </div>
        <span className="btn-soft">추가</span>
      </Link>
    );
  }

  function statusOf(d: Dose) {
    const log = state.medLogs.find((l) => l.medId === d.medId && l.date === today && l.time === d.time);
    return log?.state;
  }

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold">오늘 약</p>
        <Link href="/more/medications" className="text-sm text-eddie-primary">
          관리
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {doses.map((d) => {
          const st = statusOf(d);
          const [h, m] = d.time.split(':').map((x) => parseInt(x, 10));
          const past = nowMin > h * 60 + m + 1;
          const done = st === 'taken' || st === 'recovered';
          return (
            <li
              key={`${d.medId}-${d.time}`}
              className="flex items-center justify-between rounded-xl border border-eddie-line p-3 dark:border-neutral-700"
            >
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="text-xs text-eddie-muted">
                  {d.time}
                  {st === 'recovered' && ' · 회복 기록 🤗'}
                  {st === 'taken' && ' · 복용함 ✅'}
                  {!done && past && ' · 아직 안 먹었어'}
                </p>
              </div>
              {done ? (
                <button
                  onClick={() => recordMed(d.medId, d.time, false)}
                  className="btn-ghost text-sm"
                  aria-label={`${d.name} ${d.time} 복용 취소`}
                >
                  되돌리기
                </button>
              ) : (
                <button
                  onClick={() => recordMed(d.medId, d.time, true)}
                  className="btn-primary text-sm"
                  aria-label={`${d.name} ${d.time} 복용 기록`}
                >
                  복용함
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {doses.some((d) => {
        const st = statusOf(d);
        const [h, m] = d.time.split(':').map((x) => parseInt(x, 10));
        return nowMin > h * 60 + m + 1 && st !== 'taken' && st !== 'recovered';
      }) && (
        <div className="mt-3">
          <EddieBubble line={eddieLine('recover')} size="sm" />
        </div>
      )}
    </section>
  );
}
