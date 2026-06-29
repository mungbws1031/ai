'use client';

import { useEffect, useRef, useState } from 'react';
import EddieFace from './EddieFace';

const PRESETS = [5, 15, 25];

function mmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * 집중 모드 — '지금 한 가지'만 크게 띄우고 타이머로 실행을 돕는다(ADHD: 시작 장벽·시간 감각·멀티태스킹).
 * 키·서버 불필요. 끝나면 진동 + 부드러운 응원.
 */
export default function FocusMode({
  task,
  onClose,
  onComplete,
}: {
  task: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [mins, setMins] = useState(15);
  const [left, setLeft] = useState(15 * 60);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const endRef = useRef(0); // 목표 종료 시각(ms) — 백그라운드 스로틀에도 정확

  // 벽시계 기준으로 남은 시간 계산(setInterval 드리프트/스로틀 방지)
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const remain = Math.round((endRef.current - Date.now()) / 1000);
      if (remain <= 0) {
        setLeft(0);
        setRunning(false);
        setDone(true);
        try {
          navigator.vibrate?.([200, 100, 200]);
        } catch {
          /* noop */
        }
      } else {
        setLeft(remain);
      }
    };
    const iv = setInterval(tick, 500);
    const onVis = () => tick();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [running]);

  function start() {
    endRef.current = Date.now() + left * 1000;
    setStarted(true);
    setRunning(true);
  }
  function pause() {
    setRunning(false);
  }
  function addFive() {
    setLeft((v) => v + 300);
    if (running) endRef.current += 300 * 1000;
  }
  function setPreset(m: number) {
    setMins(m);
    setLeft(m * 60);
    setRunning(false);
    setStarted(false);
    setDone(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-eddie-bg px-6 dark:bg-neutral-900">
      <button onClick={onClose} className="absolute right-4 top-4 btn-ghost px-3 text-eddie-muted" aria-label="집중 모드 닫기">
        닫기 ✕
      </button>

      <EddieFace mood={done ? 'happy' : 'cheer'} size="lg" />
      <p className="text-center text-sm text-eddie-muted">딱 이거 하나만. 타이머 도는 동안 다른 건 잊어도 돼.</p>
      <p className="max-w-xs text-center text-2xl font-bold leading-snug">{task}</p>

      <p className="font-mono text-6xl font-bold tabular-nums text-eddie-primary">{mmss(left)}</p>

      {done ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-lg font-semibold">수고했어! 한 칸 해냈다 🎉</p>
          <div className="flex gap-2">
            <button onClick={() => setPreset(mins)} className="btn-soft">
              한 번 더
            </button>
            <button onClick={onComplete} className="btn-primary">
              완료로 표시
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            {PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => setPreset(m)}
                aria-pressed={mins === m}
                className={`min-h-tap w-16 rounded-xl border text-sm font-semibold ${
                  mins === m
                    ? 'border-eddie-primary bg-eddie-primary-soft text-eddie-primary'
                    : 'border-eddie-line text-eddie-muted'
                }`}
              >
                {m}분
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => (running ? pause() : start())} className="btn-primary px-8">
              {running ? '일시정지' : started ? '계속' : '시작'}
            </button>
            <button onClick={() => setPreset(mins)} className="btn-soft" aria-label="리셋">
              리셋
            </button>
            <button onClick={addFive} className="btn-soft" aria-label="5분 추가">
              +5분
            </button>
          </div>
          <button onClick={onComplete} className="text-sm text-eddie-muted underline">
            지금 끝냈어 (완료)
          </button>
        </>
      )}
    </div>
  );
}
