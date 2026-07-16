'use client';

import { useEffect, useState } from 'react';
import { formatEddieClock } from '@/lib/clock';

// FR-101 — 에디 시계. 실제보다 빠른 시각을 표시한다.
// 오프셋 값은 어디에도 노출하지 않는다(UO-3).
export default function EddieClock() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => setTime(formatEddieClock());
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-xl2 bg-gradient-to-br from-[#54ada7] to-[#2c7876] px-5 py-6 text-white shadow-[0_12px_32px_-16px_rgba(47,125,125,0.7)]">
      {/* 은은한 광택 */}
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <span className="text-xs font-medium uppercase tracking-widest opacity-80">에디 시계</span>
      <span className="font-mono text-6xl font-bold tabular-nums tracking-tight drop-shadow-sm" suppressHydrationWarning>
        {time || '--:--'}
      </span>
      <span className="mt-1.5 text-sm opacity-90">조금 서두르면 딱 좋아 🐣</span>
    </div>
  );
}
