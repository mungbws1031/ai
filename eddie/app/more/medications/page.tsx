'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { Medication } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import MedDisclaimer from '@/components/MedDisclaimer';
import BackLink from '@/components/BackLink';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// FR-201 복약 알림 설정 (다중 약·다중 시간), FR-205 면책 고정 표시.
export default function MedicationsPage() {
  const { state, addMedication, updateMedication, removeMedication } = useStore();
  const [name, setName] = useState('');
  const [time, setTime] = useState('09:00');

  return (
    <div className="px-4">
      <BackLink />
      <PageHeader title="복약 관리" />
      <div className="mb-4">
        <MedDisclaimer />
      </div>

      <form
        className="card mb-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const v = name.trim();
          if (!v) return;
          addMedication({ name: v, times: [time], weekdays: [], remind: true });
          setName('');
        }}
      >
        <p className="font-semibold">약 추가</p>
        <input className="field" placeholder="약 이름" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <button type="submit" className="btn-primary">
          추가
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {state.medications.map((m) => (
          <MedRow key={m.id} med={m} onUpdate={updateMedication} onRemove={removeMedication} />
        ))}
      </div>

      {state.medications.length === 0 && (
        <p className="mt-6 text-center text-sm text-eddie-muted">아직 등록한 약이 없어.</p>
      )}
    </div>
  );
}

function MedRow({
  med,
  onUpdate,
  onRemove,
}: {
  med: Medication;
  onUpdate: (id: string, patch: Partial<Medication>) => void;
  onRemove: (id: string) => void;
}) {
  const [newTime, setNewTime] = useState('12:00');

  function toggleWeekday(d: number) {
    const has = med.weekdays.includes(d);
    onUpdate(med.id, { weekdays: has ? med.weekdays.filter((x) => x !== d) : [...med.weekdays, d].sort() });
  }

  return (
    <section className="card">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold">{med.name}</p>
        <button onClick={() => onRemove(med.id)} className="btn-ghost text-sm text-red-500">
          삭제
        </button>
      </div>

      <p className="mb-1 text-xs text-eddie-muted">시간</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {med.times.map((t) => (
          <span key={t} className="chip border-eddie-primary bg-eddie-primary-soft text-eddie-primary">
            {t}
            <button
              onClick={() => onUpdate(med.id, { times: med.times.filter((x) => x !== t) })}
              className="ml-2"
              aria-label={`${t} 삭제`}
            >
              ✕
            </button>
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <input
            className="field h-9 w-28 px-2"
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            aria-label="시간 추가"
          />
          <button
            onClick={() => {
              if (!med.times.includes(newTime)) onUpdate(med.id, { times: [...med.times, newTime].sort() });
            }}
            className="btn-soft h-9 px-3 text-sm"
          >
            +
          </button>
        </span>
      </div>

      <p className="mb-1 text-xs text-eddie-muted">요일 (안 고르면 매일)</p>
      <div className="mb-3 flex gap-1">
        {WEEKDAYS.map((w, i) => {
          const on = med.weekdays.includes(i);
          return (
            <button
              key={i}
              onClick={() => toggleWeekday(i)}
              aria-pressed={on}
              className={`min-h-tap flex-1 rounded-lg border text-sm ${
                on ? 'border-eddie-primary bg-eddie-primary-soft text-eddie-primary' : 'border-eddie-line text-eddie-muted'
              }`}
            >
              {w}
            </button>
          );
        })}
      </div>

      <label className="flex items-center justify-between text-sm">
        <span>놓치면 부드럽게 한 번 더 알림</span>
        <input
          type="checkbox"
          className="h-5 w-5 accent-eddie-primary"
          checked={med.remind}
          onChange={(e) => onUpdate(med.id, { remind: e.target.checked })}
        />
      </label>
    </section>
  );
}
