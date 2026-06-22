'use client';

import { useStore } from '@/lib/store-context';
import { dateKey } from '@/lib/clock';
import { eddieLine } from '@/lib/eddie';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';
import EddieBubble from '@/components/EddieBubble';

// FR-401 와인드다운 설정 + FR-403 취침 목표 vs 실제 기록
export default function SleepPage() {
  const { state, setSleep, recordBedtime } = useStore();
  const s = state.sleep;

  // 오늘 밤 기록 여부 (자정~새벽이면 전날 귀속)
  const now = new Date();
  const nightDate = (() => {
    const d = new Date(now);
    if (now.getHours() < 5) d.setDate(d.getDate() - 1);
    return dateKey(d);
  })();
  const tonight = state.sleepLogs.find((l) => l.date === nightDate);

  // 목표 대비 차이 계산
  function diffText(bedtime: string): string {
    const [th, tm] = s.targetBedtime.split(':').map((x) => parseInt(x, 10));
    const [bh, bm] = bedtime.split(':').map((x) => parseInt(x, 10));
    let target = th * 60 + tm;
    let actual = bh * 60 + bm;
    // 취침이 자정을 넘기면(예: 01:30) 목표(23:30)보다 늦은 것으로 보정
    if (actual < 5 * 60) actual += 24 * 60;
    if (target < 5 * 60) target += 24 * 60;
    const d = actual - target;
    if (Math.abs(d) <= 10) return '목표와 거의 딱! 🎉';
    if (d > 0) return `목표보다 ${d}분 늦게`;
    return `목표보다 ${-d}분 일찍 👏`;
  }

  const recent = [...state.sleepLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

  return (
    <div className="px-4">
      <BackLink />
      <PageHeader title="취침" subtitle="혼내지 않아. 어제보다 조금이면 충분해." />

      {/* 오늘 밤 체크인 */}
      <section className="card mb-4 flex flex-col items-center gap-3 text-center">
        <div className="text-5xl">🌙</div>
        {tonight ? (
          <>
            <p className="text-lg font-semibold text-eddie-primary">취침 체크인 {tonight.bedtime}</p>
            <p className="text-sm text-eddie-muted">{diffText(tonight.bedtime)}</p>
            <EddieBubble line={eddieLine('sleepy')} size="sm" />
          </>
        ) : (
          <>
            <p className="text-sm text-eddie-muted">누웠으면 한 번만 눌러줘.</p>
            <button onClick={recordBedtime} className="btn-primary">
              지금 취침 체크인
            </button>
          </>
        )}
      </section>

      {/* 설정 */}
      <section className="card mb-4 flex flex-col gap-4">
        <label className="flex items-center justify-between">
          <span className="font-semibold">와인드다운 알림 켜기</span>
          <input
            type="checkbox"
            className="h-6 w-6 accent-eddie-primary"
            checked={s.enabled}
            onChange={(e) => setSleep({ enabled: e.target.checked })}
          />
        </label>
        <div>
          <p className="mb-1 text-sm text-eddie-muted">목표 취침시각</p>
          <input className="field" type="time" value={s.targetBedtime} onChange={(e) => setSleep({ targetBedtime: e.target.value })} />
        </div>
        <div>
          <p className="mb-1 text-sm text-eddie-muted">몇 분 전에 와인드다운을 시작할까</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setSleep({ windDownLeadMin: Math.max(0, s.windDownLeadMin - 5) })} className="btn-soft w-12 text-lg">
              −
            </button>
            <span className="flex-1 text-center font-semibold">{s.windDownLeadMin}분 전</span>
            <button onClick={() => setSleep({ windDownLeadMin: s.windDownLeadMin + 5 })} className="btn-soft w-12 text-lg">
              +
            </button>
          </div>
        </div>
      </section>

      {/* 최근 기록 (FR-403) */}
      <section className="card">
        <p className="mb-3 font-semibold">최근 취침 기록</p>
        {recent.length === 0 ? (
          <p className="text-sm text-eddie-muted">아직 기록이 없어.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.map((l) => {
              const [mm, dd] = l.date.split('-').slice(1);
              return (
                <li key={l.date} className="flex items-center justify-between text-sm">
                  <span className="text-eddie-muted">
                    {parseInt(mm, 10)}/{parseInt(dd, 10)}
                  </span>
                  <span className="font-medium">{l.bedtime}</span>
                  <span className="text-xs text-eddie-muted">{diffText(l.bedtime)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
