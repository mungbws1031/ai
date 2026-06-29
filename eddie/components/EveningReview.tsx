'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store-context';

/** 저녁 1탭 회고 — 오늘 한 것 하나 + 내일의 한 가지. 자책 없는 마무리. */
export default function EveningReview() {
  const { state, today, saveReview } = useStore();
  const existing = state.reviews.find((r) => r.date === today);
  const [editing, setEditing] = useState(!existing);
  const [did, setDid] = useState(existing?.did ?? '');
  const [tomorrow, setTomorrow] = useState(existing?.tomorrow ?? '');

  return (
    <section className="card">
      <p className="mb-1 font-semibold">🌙 하루 마무리</p>
      {existing && !editing ? (
        <div className="text-sm">
          <p>
            <span className="text-eddie-muted">오늘 한 것</span> · {existing.did || '—'}
          </p>
          <p className="mt-1">
            <span className="text-eddie-muted">내일 한 가지</span> · {existing.tomorrow || '—'}
          </p>
          <button onClick={() => setEditing(true)} className="mt-2 text-sm text-eddie-primary underline">
            고치기
          </button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveReview(did.trim(), tomorrow.trim());
            setEditing(false);
          }}
        >
          <p className="text-xs text-eddie-muted">잘한 것 딱 하나만. 완벽하지 않아도 괜찮아.</p>
          <input
            className="field"
            placeholder="오늘 한 것 하나 (예: 약 먹음)"
            value={did}
            onChange={(e) => setDid(e.target.value)}
            aria-label="오늘 한 것"
          />
          <input
            className="field"
            placeholder="내일의 한 가지 (예: 서류 제출)"
            value={tomorrow}
            onChange={(e) => setTomorrow(e.target.value)}
            aria-label="내일의 한 가지"
          />
          <button type="submit" className="btn-primary text-sm" disabled={!did.trim() && !tomorrow.trim()}>
            저장
          </button>
        </form>
      )}
    </section>
  );
}
