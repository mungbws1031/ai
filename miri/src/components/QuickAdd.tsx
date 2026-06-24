import { useState } from 'react';
import { useStore, DEFAULT_REMINDER_CONFIG } from '../store';
import { format } from 'date-fns';
import type { TaskType } from '../types';

const TYPES: { id: TaskType; label: string; hint: string }[] = [
  { id: 'deadline', label: '마감', hint: '쪼개서 역산 배치' },
  { id: 'appointment', label: '약속·상담', hint: '미리 알림만' },
  { id: 'recurring', label: '반복', hint: '가볍게' },
  { id: 'travel', label: '여행', hint: 'D-150부터' },
];

export function QuickAdd({ onClose }: { onClose: () => void }) {
  const createTask = useStore((s) => s.createTask);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState<TaskType>('appointment');
  const [showMore, setShowMore] = useState(false);
  const [decompose, setDecompose] = useState<boolean | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const willDecompose = decompose ?? (type === 'deadline' || type === 'travel');

  const submit = async () => {
    if (!title.trim() || !dueDate || saving) return;
    setSaving(true);
    try {
      await createTask({ title, dueDate, type, decompose });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-cream p-5 shadow-card sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">빠른 추가</h2>
          <button onClick={onClose} aria-label="닫기" className="text-muted">
            닫기
          </button>
        </div>

        {/* 최소 필드: 제목 + 날짜 (NFR-UX-03) */}
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="무엇을 미리 챙길까요?"
          className="mb-2 w-full rounded-xl border border-soft bg-white px-3 py-3 text-base"
        />
        <div className="mb-3 flex items-center gap-2">
          <label className="text-sm text-muted">{type === 'deadline' ? '마감일' : '날짜'}</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="flex-1 rounded-xl border border-soft bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="mb-3 grid grid-cols-4 gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`rounded-xl py-2 text-xs font-semibold ${
                type === t.id ? 'bg-point text-white' : 'bg-soft text-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {!showMore ? (
          <button onClick={() => setShowMore(true)} className="mb-3 text-xs text-muted underline">
            세부 설정 (선택)
          </button>
        ) : (
          <div className="mb-3 space-y-2 rounded-xl bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink">리마인더</span>
              <span className="text-muted">
                D-{DEFAULT_REMINDER_CONFIG[type].join(' / D-')}
              </span>
            </div>
            <label className="flex items-center justify-between">
              <span className="text-ink">단계로 쪼개서 역산 배치</span>
              <input
                type="checkbox"
                checked={willDecompose}
                onChange={(e) => setDecompose(e.target.checked)}
                className="h-5 w-5 accent-point"
              />
            </label>
          </div>
        )}

        <button
          onClick={submit}
          disabled={!title.trim() || !dueDate || saving}
          className="w-full rounded-xl bg-point py-3 text-base font-semibold text-white disabled:opacity-40"
        >
          {willDecompose ? '등록하고 단계 깔기' : '등록'}
        </button>
      </div>
    </div>
  );
}
