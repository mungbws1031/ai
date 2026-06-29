'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store-context';
import { breakdownTask } from '@/lib/breakdown-ai';

/** 큰 일 잘게 쪼개기 — 막막한 할 일을 AI가 작은 단계로 나눠 할 일로 담는다(BYOK). */
export default function BreakdownCard() {
  const { state, addTodo, pushToast } = useStore();
  const hasKey = !!state.settings.apiKey;
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<{ text: string; pick: boolean }[] | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setSteps(null);
    try {
      const r = await breakdownTask({ apiKey: state.settings.apiKey, task: task.trim() });
      setSteps(r.map((text) => ({ text, pick: true })));
      if (r.length === 0) setError('단계를 못 만들었어. 다시 시도해볼까?');
    } catch (e) {
      setError(e instanceof Error ? e.message : '쪼개기에 실패했어.');
    } finally {
      setLoading(false);
    }
  }
  function addPicked() {
    const picked = (steps ?? []).filter((s) => s.pick);
    picked.forEach((s) => addTodo(s.text));
    pushToast(`작은 단계 ${picked.length}개를 담았어 🐣`);
    setTask('');
    setSteps(null);
    setOpen(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="card flex w-full items-center gap-3 text-left">
        <span className="text-2xl" aria-hidden>
          🔪
        </span>
        <span className="flex-1">
          <span className="block font-semibold">큰 일 잘게 쪼개기</span>
          <span className="block text-sm text-eddie-muted">막막한 일을 5분 단위 첫 단계로</span>
        </span>
        <span aria-hidden className="text-eddie-muted">
          ›
        </span>
      </button>
    );
  }

  return (
    <section className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold">큰 일 잘게 쪼개기</p>
        <button onClick={() => setOpen(false)} className="text-sm text-eddie-muted">
          닫기
        </button>
      </div>
      {!hasKey ? (
        <p className="text-sm text-eddie-muted">
          이 기능은 본인 Anthropic 키가 필요해.{' '}
          <Link href="/clean" className="text-eddie-primary underline">
            정리 도우미
          </Link>
          에서 먼저 등록해줘.
        </p>
      ) : (
        <>
          <input
            className="field"
            placeholder="막막한 일 (예: 보고서 쓰기, 방 정리)"
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />
          <button onClick={run} disabled={!task.trim() || loading} className="btn-primary disabled:opacity-40">
            {loading ? '쪼개는 중…' : '작은 단계로 쪼개기'}
          </button>
          {error && <p className="text-sm text-eddie-accent">{error}</p>}
          {steps && steps.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl bg-eddie-primary-soft/50 p-2">
              <p className="text-sm font-semibold">이렇게 시작해보자</p>
              <ul className="flex flex-col gap-1">
                {steps.map((s, i) => (
                  <li key={i}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-eddie-primary"
                        checked={s.pick}
                        onChange={(e) => setSteps((arr) => (arr ?? []).map((x, j) => (j === i ? { ...x, pick: e.target.checked } : x)))}
                      />
                      <span>{s.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <button onClick={addPicked} className="btn-primary text-sm">
                할 일로 담기
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
