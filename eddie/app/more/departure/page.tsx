'use client';

import { useStore } from '@/lib/store-context';
import { computeDeparture } from '@/lib/departure';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';

// FR-102 출발 역산 설정. 도착시각·이동·준비·출발 N분 전.
export default function DeparturePage() {
  const { state, setDeparture } = useStore();
  const plan = state.departure;
  const { departAt, notifyAt } = computeDeparture(plan);
  const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="px-4">
      <BackLink />
      <PageHeader title="출발 알림" subtitle="도착시각만 정하면 언제 나갈지 알려줄게." />

      <section className="card flex flex-col gap-4">
        <label className="flex items-center justify-between">
          <span className="font-semibold">출발 알림 켜기</span>
          <input
            type="checkbox"
            className="h-6 w-6 accent-eddie-primary"
            checked={plan.enabled}
            onChange={(e) => setDeparture({ enabled: e.target.checked })}
          />
        </label>

        <div>
          <p className="mb-1 text-sm text-eddie-muted">도착 목표 시각</p>
          <input
            className="field"
            type="time"
            value={plan.arrival}
            onChange={(e) => setDeparture({ arrival: e.target.value })}
          />
        </div>

        <NumberField label="예상 이동 시간(분)" value={plan.travelMin} onChange={(v) => setDeparture({ travelMin: v })} />
        <NumberField label="준비 시간(분)" value={plan.prepMin} onChange={(v) => setDeparture({ prepMin: v })} />
        <NumberField label="출발 몇 분 전에 알릴까" value={plan.leadMin} onChange={(v) => setDeparture({ leadMin: v })} />
      </section>

      <section className="card mt-4">
        <p className="font-semibold">계산 결과</p>
        <p className="mt-2 text-sm">
          출발 <strong className="text-eddie-primary">{fmt(departAt)}</strong> · 미리 알림 {fmt(notifyAt)}
        </p>
        <p className="mt-1 text-xs text-eddie-muted">
          “지금 나가야 안 늦어요” 알림이 출발 시각에 울려. (탭이 열려 있을 때)
        </p>
      </section>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <p className="mb-1 text-sm text-eddie-muted">{label}</p>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(0, value - 5))} className="btn-soft w-12 text-lg" aria-label="감소">
          −
        </button>
        <input
          className="field text-center"
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value || '0', 10)))}
        />
        <button onClick={() => onChange(value + 5)} className="btn-soft w-12 text-lg" aria-label="증가">
          +
        </button>
      </div>
    </div>
  );
}
