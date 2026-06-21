'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store-context';
import { eddieLine } from '@/lib/eddie';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';
import EddieBubble from '@/components/EddieBubble';

// FR-303 — 5분 마이크로 정리 타이머
export default function TidyPage() {
  const { pushToast } = useStore();
  const [minutes, setMinutes] = useState(5);
  const [remaining, setRemaining] = useState(5 * 60); // 초
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          setDone(true);
          try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('정리 끝! 🎉', { body: '딱 그만큼만 해도 충분해. 잘했어!' });
            } else {
              pushToast('정리 끝! 딱 그만큼만 해도 충분해. 잘했어! 🎉');
            }
          } catch {
            /* noop */
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, pushToast]);

  function start() {
    setDone(false);
    if (remaining === 0) setRemaining(minutes * 60);
    setRunning(true);
  }
  function reset() {
    setRunning(false);
    setDone(false);
    setRemaining(minutes * 60);
  }
  function setMin(m: number) {
    const mm = Math.max(1, Math.min(30, m));
    setMinutes(mm);
    if (!running) setRemaining(mm * 60);
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const pct = minutes > 0 ? (remaining / (minutes * 60)) * 100 : 0;

  return (
    <div className="px-4">
      <BackLink />
      <PageHeader title="5분 정리" subtitle="딱 이만큼만. 시작이 제일 어려워." />

      <section className="card flex flex-col items-center gap-4 py-8">
        <div className="text-6xl font-bold tabular-nums text-eddie-primary">
          {mm}:{ss}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-eddie-line dark:bg-neutral-700">
          <div className="h-full bg-eddie-primary transition-all" style={{ width: `${pct}%` }} />
        </div>

        {!running && !done && (
          <div className="flex items-center gap-2">
            <button onClick={() => setMin(minutes - 1)} className="btn-soft w-12 text-lg" aria-label="감소">
              −
            </button>
            <span className="w-20 text-center font-semibold">{minutes}분</span>
            <button onClick={() => setMin(minutes + 1)} className="btn-soft w-12 text-lg" aria-label="증가">
              +
            </button>
          </div>
        )}

        <div className="flex w-full gap-2">
          {running ? (
            <button onClick={() => setRunning(false)} className="btn-soft flex-1">
              잠깐 멈춤
            </button>
          ) : (
            <button onClick={start} className="btn-primary flex-1">
              {remaining === minutes * 60 ? '시작' : done ? '다시' : '계속'}
            </button>
          )}
          <button onClick={reset} className="btn-ghost flex-1">
            리셋
          </button>
        </div>
      </section>

      <div className="mt-4">
        {done ? (
          <EddieBubble line={eddieLine('happy')} />
        ) : running ? (
          <EddieBubble line={{ mood: 'cheer', text: '같이 있을게. 눈에 보이는 것부터 하나씩.' }} />
        ) : (
          <EddieBubble line={{ mood: 'calm', text: '완벽하게 안 해도 돼. 타이머 끝나면 멈춰도 좋아.' }} />
        )}
      </div>
    </div>
  );
}
