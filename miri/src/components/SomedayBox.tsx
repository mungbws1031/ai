import { useState } from 'react';
import { useStore } from '../store';
import { parseDate } from '../lib/dates';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Season, Vagueness } from '../types';

const SEASONS: { id: Season; label: string }[] = [
  { id: 'spring', label: '봄' },
  { id: 'summer', label: '여름' },
  { id: 'fall', label: '가을' },
  { id: 'winter', label: '겨울' },
];

export function SomedayBox() {
  const seeds = useStore((s) => s.seeds);
  const createSeed = useStore((s) => s.createSeed);

  const [text, setText] = useState('');
  const [season, setSeason] = useState<Season | undefined>();
  const [vagueness, setVagueness] = useState<Vagueness>('mid');

  const active = seeds.filter((s) => s.status === 'dormant' || s.status === 'prompted');
  const archived = seeds.filter((s) => s.status === 'converted' || s.status === 'dismissed');

  const submit = async () => {
    if (!text.trim()) return;
    await createSeed({ text, season, vagueness });
    setText('');
    setSeason(undefined);
    setVagueness('mid');
  };

  return (
    <div className="space-y-4">
      <header className="px-1">
        <h1 className="text-2xl font-bold text-ink">보관함</h1>
        <p className="text-sm text-muted">막연한 바람을 일단 던져두세요. 때가 되면 제가 꺼낼게요.</p>
      </header>

      <div className="rounded-card bg-white p-4 shadow-card">
        <label className="mb-1 block text-xs font-medium text-muted">＋ 막연한 생각 담기</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="예) 내년 여름 가족여행 가고싶다"
          rows={2}
          className="w-full resize-none rounded-xl border border-soft px-3 py-2 text-sm"
        />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">언제쯤?</span>
          {SEASONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSeason(season === s.id ? undefined : s.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                season === s.id ? 'bg-point text-white' : 'bg-soft text-muted'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="mt-3 w-full rounded-xl bg-point py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          담아두기
        </button>
        <p className="mt-1.5 text-center text-[11px] text-muted">
          시즌만 골라두면 되묻기 시점은 제가 알아서 잡아요 (여름 → 직전 봄)
        </p>
      </div>

      <section>
        <h2 className="mb-1.5 px-1 text-sm font-bold text-ink">담아둔 생각 ({active.length})</h2>
        {active.length === 0 && (
          <p className="rounded-card bg-white p-4 text-center text-sm text-muted shadow-card">
            아직 비어 있어요.
          </p>
        )}
        <div className="space-y-1.5">
          {active.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-card">
              <span aria-hidden>🫧</span>
              <span className="flex-1 truncate text-sm text-ink">{s.text}</span>
              <span className="whitespace-nowrap text-xs text-muted">
                {format(parseDate(s.revisitAt), 'M월', { locale: ko })}쯤 되묻기
              </span>
            </div>
          ))}
        </div>
      </section>

      {archived.length > 0 && (
        <section>
          <h2 className="mb-1.5 px-1 text-sm font-bold text-muted">지난 것 ({archived.length})</h2>
          <div className="space-y-1.5">
            {archived.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-xl bg-soft/50 px-3 py-2 text-sm text-muted">
                <span className="flex-1 truncate line-through">{s.text}</span>
                <span className="text-xs">{s.status === 'converted' ? '일정으로 ✓' : '접음'}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
