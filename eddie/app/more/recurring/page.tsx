'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store-context';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';
import { Recurring } from '@/lib/types';

const WD = ['일', '월', '화', '수', '목', '금', '토'];

const PRESETS: Omit<Recurring, 'id'>[] = [
  { text: '물 한 잔 마시기 💧', mode: 'interval', everyMin: 120, fromHM: '09:00', toHM: '21:00', enabled: true },
  { text: '잠깐 일어나 스트레칭 🤸', mode: 'interval', everyMin: 60, fromHM: '10:00', toHM: '19:00', enabled: true },
  { text: '비타민 챙기기', mode: 'time', time: '09:00', weekdays: [], enabled: true },
];

function describe(r: Recurring): string {
  if (r.mode === 'interval') {
    const h = Math.floor((r.everyMin ?? 0) / 60);
    const m = (r.everyMin ?? 0) % 60;
    const iv = h ? `${h}시간${m ? ` ${m}분` : ''}` : `${m}분`;
    return `${r.fromHM}~${r.toHM} · ${iv}마다`;
  }
  const days = !r.weekdays || r.weekdays.length === 0 ? '매일' : r.weekdays.map((d) => WD[d]).join('·');
  return `${days} ${r.time}`;
}

export default function RecurringPage() {
  const { state, addRecurring, updateRecurring, removeRecurring } = useStore();
  const [mode, setMode] = useState<'time' | 'interval'>('time');
  const [text, setText] = useState('');
  const [time, setTime] = useState('09:00');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [everyMin, setEveryMin] = useState(120);
  const [fromHM, setFromHM] = useState('09:00');
  const [toHM, setToHM] = useState('21:00');

  function toggleWd(d: number) {
    setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  }
  function add() {
    const t = text.trim();
    if (!t) return;
    if (mode === 'time') addRecurring({ text: t, mode, time, weekdays, enabled: true });
    else addRecurring({ text: t, mode, everyMin, fromHM, toHM, enabled: true });
    setText('');
  }

  return (
    <div className="px-4">
      <BackLink />
      <PageHeader title="반복 알림" subtitle="매일·매주 챙길 일, 또는 물·스트레칭 넛지." />

      {/* 빠른 추가(프리셋) */}
      <section className="card mb-4">
        <p className="mb-2 font-semibold">빠른 추가</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => addRecurring(p)} className="btn-soft text-sm">
              + {p.text}
            </button>
          ))}
        </div>
      </section>

      {/* 목록 */}
      <ul className="mb-4 flex flex-col gap-2">
        {state.recurring.map((r) => (
          <li key={r.id} className="card flex items-center gap-3">
            <button
              onClick={() => updateRecurring(r.id, { enabled: !r.enabled })}
              aria-pressed={r.enabled}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                r.enabled ? 'border-eddie-primary bg-eddie-primary text-white' : 'border-eddie-line'
              }`}
              aria-label="알림 켜기/끄기"
            >
              {r.enabled ? '✓' : ''}
            </button>
            <div className={`flex-1 ${r.enabled ? '' : 'text-eddie-muted'}`}>
              <p className="font-medium">{r.text}</p>
              <p className="text-xs text-eddie-muted">{describe(r)}</p>
            </div>
            <button onClick={() => removeRecurring(r.id)} className="btn-ghost px-2 text-red-500" aria-label="삭제">
              ✕
            </button>
          </li>
        ))}
        {state.recurring.length === 0 && <li className="px-1 text-sm text-eddie-muted">아직 반복 알림이 없어.</li>}
      </ul>

      {/* 직접 추가 */}
      <section className="card flex flex-col gap-3">
        <p className="font-semibold">직접 추가</p>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('time')}
            aria-pressed={mode === 'time'}
            className={`min-h-tap flex-1 rounded-xl border text-sm font-medium ${
              mode === 'time' ? 'border-eddie-primary bg-eddie-primary-soft text-eddie-primary' : 'border-eddie-line text-eddie-muted'
            }`}
          >
            정해진 시각
          </button>
          <button
            onClick={() => setMode('interval')}
            aria-pressed={mode === 'interval'}
            className={`min-h-tap flex-1 rounded-xl border text-sm font-medium ${
              mode === 'interval' ? 'border-eddie-primary bg-eddie-primary-soft text-eddie-primary' : 'border-eddie-line text-eddie-muted'
            }`}
          >
            N시간마다
          </button>
        </div>

        <input className="field" placeholder="알림 내용 (예: 약 먹기 / 물 마시기)" value={text} onChange={(e) => setText(e.target.value)} />

        {mode === 'time' ? (
          <>
            <input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="시각" />
            <div className="flex flex-wrap gap-1">
              {WD.map((w, d) => (
                <button
                  key={d}
                  onClick={() => toggleWd(d)}
                  aria-pressed={weekdays.includes(d)}
                  className={`min-h-tap w-10 rounded-xl border text-sm ${
                    weekdays.includes(d) ? 'border-eddie-primary bg-eddie-primary-soft text-eddie-primary' : 'border-eddie-line text-eddie-muted'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
            <p className="text-xs text-eddie-muted">요일을 안 고르면 매일 알려줘.</p>
          </>
        ) : (
          <>
            <label className="flex items-center gap-2 text-sm text-eddie-muted">
              <input
                type="number"
                min={10}
                max={480}
                step={10}
                value={everyMin}
                onChange={(e) => setEveryMin(Math.max(10, parseInt(e.target.value || '10', 10)))}
                className="field !w-24 py-1 text-center text-sm"
                aria-label="간격(분)"
              />
              분마다
            </label>
            <div className="flex items-center gap-2 text-sm text-eddie-muted">
              <input className="field flex-1 py-1 text-sm" type="time" value={fromHM} onChange={(e) => setFromHM(e.target.value)} aria-label="시작 시각" />
              ~
              <input className="field flex-1 py-1 text-sm" type="time" value={toHM} onChange={(e) => setToHM(e.target.value)} aria-label="끝 시각" />
            </div>
          </>
        )}

        <button onClick={add} disabled={!text.trim()} className="btn-primary disabled:opacity-40">
          추가
        </button>
        <p className="text-xs text-eddie-muted">알림은 앱이 열려 있을 때 동작해. 하루 알림 총량 상한도 함께 적용돼.</p>
      </section>
    </div>
  );
}
