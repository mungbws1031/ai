'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store-context';
import { departureCountdown } from '@/lib/departure';

// FR-102 — 출발 카운트다운 (오늘 화면). 카운트다운은 에디 시계 기준.
export default function DepartureCard() {
  const { state } = useStore();
  const plan = state.departure;
  const [, setTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  if (!plan.enabled) {
    return (
      <Link href="/more/departure" className="card flex items-center justify-between">
        <div>
          <p className="font-semibold">출발 알림</p>
          <p className="text-sm text-eddie-muted">도착시각만 정하면 언제 나갈지 알려줄게.</p>
        </div>
        <span className="btn-soft">설정</span>
      </Link>
    );
  }

  const cd = departureCountdown(plan);
  const min = Math.abs(cd.minutesLeft);
  const h = Math.floor(min / 60);
  const m = min % 60;
  const human = h > 0 ? `${h}시간 ${m}분` : `${m}분`;

  return (
    <Link href="/more/departure" className="card block">
      <div className="flex items-center justify-between">
        <p className="font-semibold">출발까지</p>
        <span className="text-sm text-eddie-muted">출발 {cd.label}</span>
      </div>
      {cd.past ? (
        <p className="mt-2 text-lg font-bold text-eddie-accent">지금 나가야 안 늦어요 🏃</p>
      ) : (
        <p className="mt-2 text-3xl font-bold tabular-nums text-eddie-primary">{human} 남음</p>
      )}
      <p className="mt-1 text-xs text-eddie-muted">도착 {plan.arrival} · 이동 {plan.travelMin}분 · 준비 {plan.prepMin}분</p>
    </Link>
  );
}
