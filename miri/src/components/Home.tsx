import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { HomeCard, ReminderStage } from '../types';
import { addDays, format } from 'date-fns';
import { upcomingItems } from '../lib/upcoming';

const STAGE_BADGE: Record<ReminderStage, { label: string; cls: string }> = {
  1: { label: '미리', cls: 'bg-soft text-muted' },
  2: { label: '슬슬', cls: 'bg-amber/15 text-amber' },
  3: { label: '코앞', cls: 'bg-point-soft text-point' },
};

export function Home({ onSeeCalendar }: { onSeeCalendar?: () => void } = {}) {
  const cards = useStore((s) => s.buildHomeCards());
  // buildHomeCards는 store 상태에서 파생 — 상태 변경 시 자동 리렌더
  const reminders = useStore((s) => s.reminders);
  const seeds = useStore((s) => s.seeds);
  const tasks = useStore((s) => s.tasks);
  const subtasks = useStore((s) => s.subtasks);
  const list = useMemo(() => cards, [reminders, seeds]); // eslint-disable-line react-hooks/exhaustive-deps
  // 곧 다가올 항목(아직 리마인더로 안 뜬 가까운 미래) — 선제성 빈 화면 해소
  const upcoming = useMemo(
    () => upcomingItems(tasks, subtasks),
    [tasks, subtasks],
  );

  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? list : list.slice(0, 3); // NFR-UX-01: 동시 노출 ≤ 3
  const hidden = list.length - 3;

  return (
    <div className="space-y-3">
      <header className="px-1 pb-1">
        <h1 className="text-2xl font-bold text-ink">오늘 미리</h1>
        <p className="text-sm text-muted">
          {list.length === 0 ? '지금은 떠올릴 게 없어요. 편히 쉬어요 🌿' : '제가 먼저 꺼내둘게요.'}
        </p>
      </header>

      {visible.map((card) => (
        <CardView key={cardKey(card)} card={card} />
      ))}

      {!expanded && hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full rounded-card border border-dashed border-soft py-3 text-sm font-medium text-muted"
        >
          더 있어요 ({hidden})
        </button>
      )}
      {expanded && list.length > 3 && (
        <button onClick={() => setExpanded(false)} className="w-full py-2 text-sm text-muted">
          접기
        </button>
      )}

      {upcoming.length > 0 && (
        <section className="pt-2">
          <div className="mb-1.5 flex items-baseline justify-between px-1">
            <h2 className="text-sm font-bold text-muted">곧 다가와요</h2>
            {onSeeCalendar && (
              <button onClick={onSeeCalendar} className="text-xs text-point">
                캘린더에서 보기
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {upcoming.map((u) => (
              <button
                key={`${u.kind}-${u.id}`}
                onClick={onSeeCalendar}
                className="flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-left shadow-card"
              >
                <span aria-hidden>{u.kind === 'deadline' ? '🎯' : '◻️'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{u.title}</p>
                  {u.taskTitle && <p className="truncate text-xs text-muted">{u.taskTitle}</p>}
                </div>
                <span className="whitespace-nowrap text-xs font-medium text-point">{u.dday}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function cardKey(card: HomeCard): string {
  return card.kind === 'reminder' ? `r-${card.reminder.id}` : `s-${card.seed.id}`;
}

function CardView({ card }: { card: HomeCard }) {
  if (card.kind === 'reminder') return <ReminderCard card={card} />;
  return <SeedCard card={card} />;
}

function ReminderCard({ card }: { card: Extract<HomeCard, { kind: 'reminder' }> }) {
  const complete = useStore((s) => s.completeReminder);
  const snooze = useStore((s) => s.snoozeReminder);
  const badge = STAGE_BADGE[card.reminder.stage];
  return (
    <article className="rounded-card bg-white p-4 shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
        <span className="truncate text-sm font-semibold text-ink">{card.taskTitle}</span>
      </div>
      <p className="mb-3 text-[15px] leading-relaxed text-ink">{card.copy}</p>
      <div className="flex gap-2">
        <button
          onClick={() => complete(card.reminder.id)}
          className="flex-1 rounded-xl bg-sage py-2.5 text-sm font-semibold text-white"
        >
          ✓ 했어요
        </button>
        <button
          onClick={() => snooze(card.reminder.id)}
          className="rounded-xl border border-soft px-4 py-2.5 text-sm font-medium text-muted"
        >
          오늘은 패스
        </button>
      </div>
    </article>
  );
}

function SeedCard({ card }: { card: Extract<HomeCard, { kind: 'seed' }> }) {
  const convert = useStore((s) => s.convertSeed);
  const snooze = useStore((s) => s.snoozeSeed);
  const dismiss = useStore((s) => s.dismissSeed);
  const [picking, setPicking] = useState(false);
  const [due, setDue] = useState(format(addDays(new Date(), 60), 'yyyy-MM-dd'));

  return (
    <article className="rounded-card bg-white p-4 shadow-card ring-1 ring-point-soft">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-point-soft px-2 py-0.5 text-xs font-semibold text-point">
          보관함
        </span>
        <span className="truncate text-sm font-semibold text-ink">{card.seed.text}</span>
      </div>
      <p className="mb-3 text-[15px] leading-relaxed text-ink">{card.copy}</p>

      {!picking ? (
        <div className="flex gap-2">
          <button
            onClick={() => setPicking(true)}
            className="flex-1 rounded-xl bg-point py-2.5 text-sm font-semibold text-white"
          >
            네, 시작할래요
          </button>
          <button
            onClick={() => snooze(card.seed.id)}
            className="rounded-xl border border-soft px-3 py-2.5 text-sm font-medium text-muted"
          >
            다음에
          </button>
          <button
            onClick={() => dismiss(card.seed.id)}
            className="rounded-xl border border-soft px-3 py-2.5 text-sm font-medium text-muted"
          >
            접기
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-muted">언제로 잡아둘까요? (목표일)</label>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-full rounded-xl border border-soft px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => due && convert(card.seed.id, due, 'travel')}
              disabled={!due}
              className="flex-1 rounded-xl bg-point py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              역산 일정으로 만들기
            </button>
            <button
              onClick={() => setPicking(false)}
              className="rounded-xl border border-soft px-4 py-2.5 text-sm text-muted"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
