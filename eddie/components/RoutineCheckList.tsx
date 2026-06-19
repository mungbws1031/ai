'use client';

import { Routine } from '@/lib/types';
import { useStore, useTodayCheckIns } from '@/lib/store-context';
import { eddieForProgress } from '@/lib/eddie';
import EddieBubble from './EddieBubble';

// FR-502 — 원탭 루틴 체크인 + 진행률. FR-503 — 진행에 따른 에디 반응.
export default function RoutineCheckList({ routine, showEddie = true }: { routine: Routine; showEddie?: boolean }) {
  const { setCheckIn } = useStore();
  const states = useTodayCheckIns();

  const done = routine.items.filter((it) => states[it.id] === 'done').length;
  const total = routine.items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-eddie-line dark:bg-neutral-700">
        <div className="h-full bg-eddie-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mb-3 text-xs text-eddie-muted">
        {done}/{total} 완료
      </p>
      <ul className="flex flex-col gap-2">
        {routine.items.map((it) => {
          const checked = states[it.id] === 'done';
          return (
            <li key={it.id}>
              <button
                onClick={() => setCheckIn(it.id, checked ? 'pending' : 'done')}
                aria-pressed={checked}
                className={`flex min-h-tap w-full items-center gap-3 rounded-xl border px-4 text-left transition-colors ${
                  checked
                    ? 'border-eddie-primary bg-eddie-primary-soft dark:bg-eddie-primary/20'
                    : 'border-eddie-line dark:border-neutral-700'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    checked ? 'border-eddie-primary bg-eddie-primary text-white' : 'border-eddie-line'
                  }`}
                  aria-hidden
                >
                  {checked ? '✓' : ''}
                </span>
                <span className={checked ? 'font-medium text-eddie-primary' : ''}>{it.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {showEddie && total > 0 && (
        <div className="mt-3">
          <EddieBubble line={eddieForProgress(done, total)} size="sm" />
        </div>
      )}
    </div>
  );
}
