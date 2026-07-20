'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store-context';
import { ScheduleEvent } from '@/lib/types';
import { copyText, formatEvent, nativeShare } from '@/lib/share';
import { planEvent, PlanStyle, PlanTask } from '@/lib/plan-ai';
import { buildEventICS, downloadICS, googleCalUrl } from '@/lib/ics';
import { detectTemplate, genericBackPlan, filterByRoom } from '@/lib/prep-templates';
import { buildFlightPlan, isFlightEvent } from '@/lib/flight-plan';

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
function fmtDate(dt: Date): string {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function fmtTime(dt: Date): string {
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

export default function EventRow({ date, e }: { date: string; e: ScheduleEvent }) {
  const { state, toggleEvent, removeEvent, updateEvent, addTodo, addDeadline, pushToast } = useStore();
  const [open, setOpen] = useState(false);
  const [flightOpen, setFlightOpen] = useState(false);
  const [intl, setIntl] = useState(false);
  const [travel, setTravel] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState('');
  const [tasks, setTasks] = useState<(PlanTask & { pick: boolean })[] | null>(null);
  const [style, setStyle] = useState<PlanStyle | null>(null);

  const leads = e.leadDays ?? [];
  const hasKey = !!state.settings.apiKey;
  const [tplOpen, setTplOpen] = useState(false);
  const tpl = detectTemplate(e.title);

  // 역산 계획 대상 태스크: 유형 템플릿이 있으면 그걸, 없으면 남은 기간에 맞춘 일반 마일스톤.
  const [ey0, em0, ed0] = date.split('-').map((x) => parseInt(x, 10));
  const daysUntil = Math.round((new Date(ey0, em0 - 1, ed0).getTime() - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()) / 86400000);
  const backTasks = tpl ? filterByRoom(tpl.tasks, daysUntil) : genericBackPlan(daysUntil);
  const backLabel = tpl ? `📋 ${tpl.name} 준비 체크리스트` : '🗓️ 역산 계획 세우기';

  const isFlight = isFlightEvent(e.title);

  function addFlightPlan() {
    if (!e.time) return;
    const plan = buildFlightPlan(intl, travel);
    // 전날 준비물 → 할 일(전날 20시 알림)
    plan.dayBefore.forEach((text) => addTodo(text, '20:00', shiftDate(date, 1)));
    // 당일 타임라인 → 마감 알림(출발 기준 분 차감, 자정 넘어가면 전날로 자동 처리)
    const [y, m, d] = date.split('-').map((x) => parseInt(x, 10));
    const [hh, mm] = e.time.split(':').map((x) => parseInt(x, 10));
    const base = new Date(y, m - 1, d, hh, mm);
    plan.dayOf.forEach((step) => {
      const dt = new Date(base.getTime() - step.minutesBefore * 60000);
      addDeadline(step.text, fmtTime(dt), [10, 5], fmtDate(dt));
    });
    pushToast(`비행 워크플로우 ${plan.dayBefore.length + plan.dayOf.length}개를 담았어 ✈️`);
    setFlightOpen(false);
    setOpen(false);
  }

  function addTemplate() {
    if (backTasks.length === 0) return;
    backTasks.forEach((t) => {
      const label = tpl ? t.text : `${e.title} · ${t.text}`;
      addTodo(label, '09:00', shiftDate(date, t.daysBefore));
    });
    pushToast(`역산 계획 ${backTasks.length}개를 담았어 (각 날짜 알림) 🐣`);
    setTplOpen(false);
    setOpen(false);
  }

  function toggleLead(n: number) {
    const next = leads.includes(n) ? leads.filter((x) => x !== n) : [...leads, n].sort((a, b) => b - a);
    updateEvent(e.id, { leadDays: next });
  }

  function addToCalendar() {
    downloadICS(`${e.title || '일정'}.ics`, buildEventICS(e, new Date()));
    pushToast('캘린더 파일을 내려받았어 — 열어서 추가하면 앱이 꺼져도 알림이 와 📅');
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

          {/* 역산 계획 (유형 템플릿 있으면 그걸, 없으면 일반 마일스톤) — 키 불필요 */}
          {backTasks.length > 0 && (
            <div className="rounded-xl border border-eddie-line p-2 dark:border-neutral-700">
              <button
                onClick={() => setTplOpen((o) => !o)}
                className="flex w-full items-center justify-between text-sm font-semibold"
              >
                <span>{backLabel}</span>
                <span className="text-eddie-muted">{tplOpen ? '▾' : '›'}</span>
              </button>
              {tplOpen && (
                <div className="mt-2 flex flex-col gap-1">
                  <p className="text-xs text-eddie-muted">일정일에서 역산해 각 날짜에 알림으로 챙겨줄게.</p>
                  <ul className="flex flex-col gap-1 text-sm">
                    {backTasks.map((t, i) => (
                      <li key={i}>
                        <span className="font-mono text-xs text-eddie-primary">
                          {t.daysBefore > 0 ? `D-${t.daysBefore}` : 'D-day'}
                        </span>{' '}
                        · {tpl ? t.text : `${e.title} · ${t.text}`}
                      </li>
                    ))}
                  </ul>
                  <button onClick={addTemplate} className="btn-primary mt-1 text-sm">
                    {backTasks.length}개 할 일로 담기 (날짜별 알림)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 비행기 워크플로우 (출발 시각 기준 당일 타임라인) */}
          {isFlight && (
            <div className="rounded-xl border border-eddie-line p-2 dark:border-neutral-700">
              <button
                onClick={() => setFlightOpen((o) => !o)}
                className="flex w-full items-center justify-between text-sm font-semibold"
              >
                <span>✈️ 비행 워크플로우 짜기</span>
                <span className="text-eddie-muted">{flightOpen ? '▾' : '›'}</span>
              </button>
              {flightOpen &&
                (!e.time ? (
                  <p className="mt-2 text-sm text-eddie-muted">출발 시각을 정한 일정이어야 해. (일정에 시각 추가)</p>
                ) : (
                  <FlightPanel
                    intl={intl}
                    setIntl={setIntl}
                    travel={travel}
                    setTravel={setTravel}
                    date={date}
                    time={e.time}
                    onCreate={addFlightPlan}
                  />
                ))}
            </div>
          )}

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

          {/* OS 캘린더로 보내기 (앱이 꺼져도 알림) */}
          <div>
            <div className="flex gap-2">
              <button onClick={addToCalendar} className="btn-soft flex-1 text-sm">
                📅 캘린더에 추가
              </button>
              <a
                href={googleCalUrl(e)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-soft flex-1 text-center text-sm"
              >
                구글 캘린더
              </a>
            </div>
            <p className="mt-1 text-xs text-eddie-muted">
              캘린더에 넣으면 앱이 꺼져 있어도 알림이 와. 미리 알림(위 칩)도 함께 등록돼.
            </p>
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

function FlightPanel({
  intl,
  setIntl,
  travel,
  setTravel,
  date,
  time,
  onCreate,
}: {
  intl: boolean;
  setIntl: (v: boolean) => void;
  travel: number;
  setTravel: (v: number) => void;
  date: string;
  time: string;
  onCreate: () => void;
}) {
  const plan = buildFlightPlan(intl, travel);
  const [y, m, d] = date.split('-').map((x) => parseInt(x, 10));
  const [hh, mm] = time.split(':').map((x) => parseInt(x, 10));
  const base = new Date(y, m - 1, d, hh, mm);
  const steps = plan.dayOf.map((s) => ({ text: s.text, dt: new Date(base.getTime() - s.minutesBefore * 60000) }));

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          onClick={() => setIntl(false)}
          aria-pressed={!intl}
          className={`min-h-tap flex-1 rounded-xl border text-sm font-medium ${
            !intl ? 'border-eddie-primary bg-eddie-primary-soft text-eddie-primary' : 'border-eddie-line text-eddie-muted'
          }`}
        >
          국내선
        </button>
        <button
          onClick={() => setIntl(true)}
          aria-pressed={intl}
          className={`min-h-tap flex-1 rounded-xl border text-sm font-medium ${
            intl ? 'border-eddie-primary bg-eddie-primary-soft text-eddie-primary' : 'border-eddie-line text-eddie-muted'
          }`}
        >
          국제선
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-eddie-muted">
        집→공항 이동
        <input
          type="number"
          min={0}
          max={300}
          value={travel}
          onChange={(e) => setTravel(Math.max(0, parseInt(e.target.value || '0', 10)))}
          className="field !w-20 py-1 text-center text-sm"
          aria-label="집에서 공항까지 이동 시간(분)"
        />
        분
      </label>

      <div className="rounded-xl bg-eddie-primary-soft/50 p-2 text-sm">
        <p className="mb-1 font-semibold">✈️ {time} 출발 기준</p>
        <p className="text-eddie-muted">전날: {plan.dayBefore.join(' · ')}</p>
        <ul className="mt-1 flex flex-col gap-0.5">
          {steps.map((s, i) => (
            <li key={i}>
              <span className="font-mono text-eddie-primary">{fmtTime(s.dt)}</span> · {s.text}
            </li>
          ))}
        </ul>
      </div>

      <button onClick={onCreate} className="btn-primary text-sm">
        워크플로우 담기 (알림 포함)
      </button>
    </div>
  );
}
