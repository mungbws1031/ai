'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store-context';
import { ScheduleEvent } from '@/lib/types';
import { copyText, formatEvent, nativeShare } from '@/lib/share';
import { planEvent, PlanStyle, PlanTask } from '@/lib/plan-ai';

const LEADS = [7, 2, 1];
const WD = ['일', '월', '화', '수', '목', '금', '토'];

function shiftDate(date: string, minusDays: number): string {
  const [y, m, d] = date.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d - minusDays);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function todayLabel(): string {
  const n = new Date();
  const iso = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  return `${iso} (${WD[n.getDay()]})`;
}

export default function EventRow({ date, e }: { date: string; e: ScheduleEvent }) {
  const { state, toggleEvent, removeEvent, updateEvent, addTodo, pushToast } = useStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState('');
  const [tasks, setTasks] = useState<(PlanTask & { pick: boolean })[] | null>(null);
  const [style, setStyle] = useState<PlanStyle | null>(null);

  const leads = e.leadDays ?? [];
  const hasKey = !!state.settings.apiKey;

  function toggleLead(n: number) {
    const next = leads.includes(n) ? leads.filter((x) => x !== n) : [...leads, n].sort((a, b) => b - a);
    updateEvent(e.id, { leadDays: next });
  }

  async function share() {
    const r = await nativeShare(formatEvent(date, e));
    if (r === 'unsupported') {
      const ok = await copyText(formatEvent(date, e));
      pushToast(ok ? '복사했어 — 붙여넣어 보내줘.' : '복사하지 못했어.');
    }
  }

  async function makePlan() {
    setLoading(true);
    setError(null);
    setTasks(null);
    setStyle(null);
    try {
      const r = await planEvent({
        apiKey: state.settings.apiKey,
        title: e.title,
        date,
        time: e.time,
        place: place.trim() || undefined,
        todayLabel: todayLabel(),
      });
      setTasks(r.tasks.map((t) => ({ ...t, pick: true })));
      setStyle(r.style);
      if (r.tasks.length === 0) setError('준비할 일을 못 찾았어.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '계획 짜기에 실패했어.');
    } finally {
      setLoading(false);
    }
  }

  function addPlan() {
    const picked = (tasks ?? []).filter((t) => t.pick);
    picked.forEach((t) => addTodo(t.text, t.time || '09:00', shiftDate(date, t.daysBefore)));
    pushToast(`준비 할 일 ${picked.length}개를 담았어 🐣`);
    setTasks(null);
    setStyle(null);
    setOpen(false);
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-eddie-line p-2 dark:border-neutral-700">
      <div className="flex items-center gap-2">
        <button
          onClick={() => toggleEvent(e.id)}
          aria-pressed={e.done}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
            e.done ? 'border-eddie-primary bg-eddie-primary text-white' : 'border-eddie-line'
          }`}
        >
          {e.done ? '✓' : ''}
        </button>
        <span className={`flex-1 ${e.done ? 'text-eddie-muted line-through' : ''}`}>
          {e.time && <span className="mr-1 font-mono text-xs text-eddie-primary">{e.time}</span>}
          {e.title}
          {leads.length > 0 && (
            <span className="ml-1 text-xs text-eddie-muted">· 🔔 {leads.map((n) => `${n}일 전`).join('·')}</span>
          )}
        </span>
        <button onClick={() => setOpen((o) => !o)} className="btn-ghost px-2 text-sm" aria-label="일정 옵션">
          {open ? '▾' : '⋯'}
        </button>
        <button onClick={() => removeEvent(e.id)} className="btn-ghost px-2 text-red-500" aria-label="일정 삭제">
          ✕
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-3 border-t border-eddie-line pt-2 dark:border-neutral-700">
          {/* 미리 알림 */}
          <div>
            <p className="mb-1 text-xs text-eddie-muted">미리 알림 (며칠 전)</p>
            <div className="flex gap-2">
              {LEADS.map((n) => (
                <button
                  key={n}
                  onClick={() => toggleLead(n)}
                  aria-pressed={leads.includes(n)}
                  className={`min-h-tap flex-1 rounded-xl border text-sm font-medium ${
                    leads.includes(n)
                      ? 'border-eddie-primary bg-eddie-primary-soft text-eddie-primary'
                      : 'border-eddie-line text-eddie-muted'
                  }`}
                >
                  {n}일 전
                </button>
              ))}
            </div>
          </div>

          {/* 준비 계획: 장소/자리 입력(선택) */}
          {hasKey && (
            <input
              className="field text-sm"
              placeholder="어디서·어떤 자리야? (선택, 예: 홍대 카페 / 면접 / 결혼식)"
              value={place}
              onChange={(ev) => setPlace(ev.target.value)}
              aria-label="장소/자리 (선택)"
            />
          )}

          {/* 액션 */}
          <div className="flex gap-2">
            <button onClick={share} className="btn-soft flex-1 text-sm">
              📤 보내기
            </button>
            {hasKey ? (
              <button onClick={makePlan} disabled={loading} className="btn-soft flex-1 text-sm disabled:opacity-40">
                {loading ? '계획 짜는 중…' : '🤖 준비 계획'}
              </button>
            ) : (
              <Link href="/clean" className="btn-soft flex-1 text-center text-sm">
                🤖 준비 계획 (키 등록)
              </Link>
            )}
          </div>

          {error && <p className="text-sm text-eddie-accent">{error}</p>}

          {/* 장소 맞춤 화장·옷·신발 추천 */}
          {style && (style.makeup || style.clothes || style.shoes) && (
            <div className="flex flex-col gap-1 rounded-xl border border-eddie-line p-2 text-sm dark:border-neutral-700">
              <p className="font-semibold">이 자리엔 이렇게 🎀</p>
              {style.makeup && (
                <p>
                  <span className="text-eddie-muted">💄 화장</span> · {style.makeup}
                </p>
              )}
              {style.clothes && (
                <p>
                  <span className="text-eddie-muted">👕 옷</span> · {style.clothes}
                </p>
              )}
              {style.shoes && (
                <p>
                  <span className="text-eddie-muted">👟 신발</span> · {style.shoes}
                </p>
              )}
            </div>
          )}

          {/* AI 준비 계획 결과 */}
          {tasks && tasks.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl bg-eddie-primary-soft/50 p-2">
              <p className="text-sm font-semibold">이렇게 준비해보자</p>
              <ul className="flex flex-col gap-1">
                {tasks.map((t, i) => (
                  <li key={i}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-eddie-primary"
                        checked={t.pick}
                        onChange={(ev) => setTasks((arr) => (arr ?? []).map((x, j) => (j === i ? { ...x, pick: ev.target.checked } : x)))}
                      />
                      <span>
                        {t.text}{' '}
                        <span className="text-eddie-muted">· {t.daysBefore > 0 ? `${t.daysBefore}일 전` : '당일'}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <button onClick={addPlan} className="btn-primary text-sm">
                할 일로 담기
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
