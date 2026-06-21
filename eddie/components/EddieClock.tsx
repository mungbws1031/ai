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
    <div className="card flex flex-col items-center bg-eddie-primary text-white dark:bg-eddie-primary">
      <span className="text-xs font-medium opacity-80">에디 시계</span>
      <span className="font-mono text-5xl font-bold tabular-nums" suppressHydrationWarning>
        {time || '--:--'}
      </span>
      <span className="mt-1 text-xs opacity-80">조금 서두르면 딱 좋아 🐣</span>
    </div>
  );
}
