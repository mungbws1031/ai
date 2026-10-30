import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { Chore, ChoreState } from '../types';
import {
  CHORE_PRESETS,
  choreStateLabel,
  choreStatus,
  daysSinceLabel,
  intervalLabel,
  sortChores,
} from '../lib/chores';
import { todayStr } from '../lib/dates';

// 색상 단독 정보 금지 → 항상 텍스트 배지와 함께
const STATE_BADGE: Record<ChoreState, string> = {
  never: 'bg-soft text-muted',
  overdue: 'bg-point-soft text-point',
  due: 'bg-amber/15 text-amber',
  soon: 'bg-amber/10 text-amber',
  ok: 'bg-sage/15 text-sage',
};

const INTERVAL_CHIPS = [
  { days: 3, label: '3일' },
  { days: 7, label: '매주' },
  { days: 14, label: '2주' },
  { days: 30, label: '한 달' },
  { days: 90, label: '3달' },
];

const SUGGESTED_MAX = 5;

export function ChoreBoard() {
  const chores = useStore((s) => s.chores);
  const sorted = useMemo(() => sortChores(chores), [chores]);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <header className="px-1">
        <h1 className="text-2xl font-bold text-ink">집안일</h1>
        <p className="text-sm text-muted">마지막으로 한 날만 기억해둘게요. 차례가 되면 홈에 꺼내요.</p>
      </header>

      {chores.length === 0 ? (
        <PresetPicker />
      ) : (
        <>
          <div className="space-y-2">
            {sorted.map((c) => (
              <ChoreRow key={c.id} chore={c} />
            ))}
          </div>
          {adding ? (
            <AddChore onDone={() => setAdding(false)} />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full rounded-card border border-dashed border-soft py-3 text-sm font-medium text-muted"
            >
              ＋ 집안일 추가
            </button>
          )}
        </>
      )}
    </div>
  );
}

function PresetPicker() {
  const createChore = useStore((s) => s.createChore);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const toggle = (title: string) => {
    const next = new Set(picked);
    if (next.has(title)) next.delete(title);
    else next.add(title);
    setPicked(next);
  };

  const submit = async () => {
    for (const p of CHORE_PRESETS.filter((p) => picked.has(p.title))) {
      await createChore(p);
    }
  };

  return (
    <div className="rounded-card bg-white p-4 shadow-card">
      <p className="mb-1 text-sm font-semibold text-ink">제일 자주 까먹는 것만 골라요</p>
      <p className="mb-3 text-xs text-muted">
        처음엔 {SUGGESTED_MAX}개 이하가 좋아요. 나중에 언제든 더 넣을 수 있어요.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {CHORE_PRESETS.map((p) => {
          const on = picked.has(p.title);
          return (
            <button
              key={p.title}
              onClick={() => toggle(p.title)}
              aria-pressed={on}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                on ? 'bg-point text-white' : 'bg-soft text-ink'
              }`}
            >
              {p.emoji} {p.title} · {intervalLabel(p.intervalDays)}
            </button>
          );
        })}
      </div>
      {picked.size > SUGGESTED_MAX && (
        <p className="mt-2 text-xs text-amber">조금 많아요. 그래도 괜찮지만, 줄이면 더 오래 가요 🌿</p>
      )}
      <button
        onClick={submit}
        disabled={picked.size === 0}
        className="mt-3 w-full rounded-xl bg-point py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {picked.size ? `${picked.size}개 담기` : '골라주세요'}
      </button>
    </div>
  );
}

function ChoreRow({ chore }: { chore: Chore }) {
  const complete = useStore((s) => s.completeChore);
  const undo = useStore((s) => s.undoChore);
  const [open, setOpen] = useState(false);
  const st = choreStatus(chore);
  const doneToday = chore.lastDoneAt === todayStr();

  return (
    <article className="rounded-card bg-white p-3.5 shadow-card">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <span className="text-xl" aria-hidden>
            {chore.emoji ?? '🏠'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{chore.title}</p>
            <p className="text-xs text-muted">
              {daysSinceLabel(st)} · {intervalLabel(chore.intervalDays)}
            </p>
          </div>
          <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATE_BADGE[st.state]}`}>
            {choreStateLabel(st)}
          </span>
        </button>
        {!doneToday && (
          <button
            onClick={() => complete(chore.id)}
            className="whitespace-nowrap rounded-xl bg-sage px-3 py-2 text-xs font-semibold text-white"
          >
            ✓ 했어요
          </button>
        )}
      </div>

      {doneToday && (
        <p className="mt-2 flex items-center justify-between rounded-xl bg-sage/10 px-3 py-1.5 text-xs text-sage">
          <span>오늘 기록했어요. 다음은 {st.nextDue?.slice(5).replace('-', '/')}쯤 꺼낼게요.</span>
          <button onClick={() => undo(chore.id)} className="font-semibold underline">
            되돌리기
          </button>
        </p>
      )}

      {open && <ChoreDetail chore={chore} />}
    </article>
  );
}

function ChoreDetail({ chore }: { chore: Chore }) {
  const update = useStore((s) => s.updateChore);
  const complete = useStore((s) => s.completeChore);
  const remove = useStore((s) => s.deleteChore);
  const [pastDate, setPastDate] = useState(chore.lastDoneAt ?? todayStr());
  const [interval, setIntervalText] = useState(String(chore.intervalDays));
  const [hint, setHint] = useState(chore.hint ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const intervalNum = Number(interval);
  const intervalValid = Number.isFinite(intervalNum) && intervalNum >= 1;
  const dirty = (intervalValid && intervalNum !== chore.intervalDays) || hint.trim() !== (chore.hint ?? '');

  return (
    <div className="mt-3 space-y-3 border-t border-soft pt-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">사실 다른 날 했어요</label>
        <div className="flex gap-2">
          <input
            type="date"
            value={pastDate}
            max={todayStr()}
            onChange={(e) => setPastDate(e.target.value)}
            className="flex-1 rounded-xl border border-soft px-3 py-2 text-sm"
          />
          <button
            onClick={() => pastDate && complete(chore.id, pastDate)}
            disabled={!pastDate || pastDate > todayStr()}
            className="rounded-xl border border-sage px-3 py-2 text-xs font-semibold text-sage disabled:opacity-40"
          >
            이 날로 기록
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted">주기 (일)</label>
        <div className="flex flex-wrap items-center gap-1.5">
          {INTERVAL_CHIPS.map((c) => (
            <button
              key={c.days}
              onClick={() => setIntervalText(String(c.days))}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                intervalNum === c.days ? 'bg-point text-white' : 'bg-soft text-muted'
              }`}
            >
              {c.label}
            </button>
          ))}
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={interval}
            onChange={(e) => setIntervalText(e.target.value)}
            aria-label="주기 일수"
            className="w-16 rounded-xl border border-soft px-2 py-1 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted">아주 작은 첫 동작</label>
        <input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="예) 변기만 솔로 30초"
          className="w-full rounded-xl border border-soft px-3 py-2 text-sm"
        />
      </div>

      {chore.history.length > 0 && (
        <p className="text-xs text-muted">
          최근 기록: {[...chore.history].reverse().slice(0, 5).map((d) => d.slice(5).replace('-', '/')).join(' · ')}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => update(chore.id, { intervalDays: intervalNum, hint })}
          disabled={!dirty || !intervalValid}
          className="flex-1 rounded-xl bg-point py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          저장
        </button>
        {confirmDelete ? (
          <button
            onClick={() => remove(chore.id)}
            className="rounded-xl bg-point-soft px-3 py-2 text-xs font-semibold text-point"
          >
            정말 지울게요
          </button>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-xl border border-soft px-3 py-2 text-xs text-muted"
          >
            지우기
          </button>
        )}
      </div>
    </div>
  );
}

function AddChore({ onDone }: { onDone: () => void }) {
  const chores = useStore((s) => s.chores);
  const createChore = useStore((s) => s.createChore);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState<string | undefined>();
  const [hint, setHint] = useState('');
  const [interval, setIntervalText] = useState('7');
  const [lastDoneAt, setLastDoneAt] = useState('');

  const existing = new Set(chores.map((c) => c.title));
  const presets = CHORE_PRESETS.filter((p) => !existing.has(p.title));
  const intervalNum = Number(interval);
  const valid = title.trim() && Number.isFinite(intervalNum) && intervalNum >= 1;

  const submit = async () => {
    if (!valid) return;
    await createChore({ title, emoji, hint, intervalDays: intervalNum, lastDoneAt: lastDoneAt || undefined });
    onDone();
  };

  return (
    <div className="space-y-3 rounded-card bg-white p-4 shadow-card">
      {presets.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted">자주 쓰는 것</p>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.title}
                onClick={() => {
                  setTitle(p.title);
                  setEmoji(p.emoji);
                  setHint(p.hint);
                  setIntervalText(String(p.intervalDays));
                }}
                className="rounded-full bg-soft px-2.5 py-1 text-xs text-ink"
              >
                {p.emoji} {p.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setEmoji(undefined);
        }}
        placeholder="예) 베란다 물청소"
        aria-label="집안일 이름"
        className="w-full rounded-xl border border-soft px-3 py-2 text-sm"
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted">얼마마다?</span>
        {INTERVAL_CHIPS.map((c) => (
          <button
            key={c.days}
            onClick={() => setIntervalText(String(c.days))}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              intervalNum === c.days ? 'bg-point text-white' : 'bg-soft text-muted'
            }`}
          >
            {c.label}
          </button>
        ))}
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={interval}
          onChange={(e) => setIntervalText(e.target.value)}
          aria-label="주기 일수"
          className="w-16 rounded-xl border border-soft px-2 py-1 text-sm"
        />
        <span className="text-xs text-muted">일</span>
      </div>

      <input
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        placeholder="아주 작은 첫 동작 (선택)"
        className="w-full rounded-xl border border-soft px-3 py-2 text-sm"
      />

      <div>
        <label className="mb-1 block text-xs font-medium text-muted">마지막으로 한 날 (모르면 비워두세요)</label>
        <input
          type="date"
          value={lastDoneAt}
          max={todayStr()}
          onChange={(e) => setLastDoneAt(e.target.value)}
          className="w-full rounded-xl border border-soft px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!valid}
          className="flex-1 rounded-xl bg-point py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          담기
        </button>
        <button onClick={onDone} className="rounded-xl border border-soft px-4 py-2.5 text-sm text-muted">
          취소
        </button>
      </div>
    </div>
  );
}
