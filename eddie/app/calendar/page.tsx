'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/store-context';
import { dateKey } from '@/lib/clock';
import { isGoodDay } from '@/lib/streak';
import {
  canNativeShare,
  copyText,
  formatDay,
  formatEvent,
  nativeShare,
  smsHref,
} from '@/lib/share';
import PageHeader from '@/components/PageHeader';
import NoticeImport from '@/components/NoticeImport';

const WD = ['일', '월', '화', '수', '목', '금', '토'];

function ymd(d: Date) {
  return dateKey(d);
}

export default function CalendarPage() {
  const { state, today } = useStore();
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string>(today);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  // 달력 셀 (앞쪽 빈칸 포함)
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (string | null)[] = [];
    for (let i = 0; i < startPad; i++) arr.push(null);
    for (let day = 1; day <= daysInMonth; day++) arr.push(ymd(new Date(year, month, day)));
    return arr;
  }, [year, month]);

  // 날짜별 마커
  function markersFor(date: string) {
    const good = isGoodDay(state, date);
    const events = state.schedule.filter((e) => e.date === date);
    const slept = state.sleepLogs.some((l) => l.date === date);
    return { good, eventCount: events.length, slept };
  }

  const selEvents = state.schedule
    .filter((e) => e.date === selected)
    .sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  const selCheck = state.checkIns.find((c) => c.date === selected);
  const selRoutineDone = selCheck ? Object.values(selCheck.states).filter((s) => s === 'done').length : 0;
  const selMeds = state.medLogs.filter((l) => l.date === selected && (l.state === 'taken' || l.state === 'recovered')).length;
  const selSleep = state.sleepLogs.find((l) => l.date === selected);

  return (
    <div className="px-4">
      <PageHeader title="달력" subtitle="하루하루의 흐름을 한눈에." />

      <NoticeImport />

      {/* 월 이동 */}
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="btn-ghost px-3" aria-label="이전 달">
          ‹
        </button>
        <p className="font-semibold">
          {year}년 {month + 1}월
        </p>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="btn-ghost px-3" aria-label="다음 달">
          ›
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center text-xs text-eddie-muted">
        {WD.map((w, i) => (
          <div key={w} className={`py-1 ${i === 0 ? 'text-red-400' : ''}`}>
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} />;
          const day = parseInt(date.split('-')[2], 10);
          const m = markersFor(date);
          const isToday = date === today;
          const isSel = date === selected;
          return (
            <button
              key={date}
              onClick={() => setSelected(date)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm ${
                isSel ? 'bg-eddie-primary text-white' : isToday ? 'bg-eddie-primary-soft text-eddie-primary' : ''
              }`}
            >
              <span>{day}</span>
              <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                {m.good && <span className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white' : 'bg-eddie-primary'}`} />}
                {m.eventCount > 0 && <span className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white' : 'bg-eddie-accent'}`} />}
                {m.slept && <span className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white' : 'bg-eddie-calm'}`} />}
              </span>
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-2 flex justify-center gap-3 text-[11px] text-eddie-muted">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-eddie-primary" />잘 보낸 하루</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-eddie-accent" />일정</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-eddie-calm" />취침</span>
      </div>

      {/* 선택일 상세 */}
      <DayDetail
        date={selected}
        routineDone={selRoutineDone}
        meds={selMeds}
        sleep={selSleep?.bedtime}
        events={selEvents}
      />
    </div>
  );
}

function DayDetail({
  date,
  routineDone,
  meds,
  sleep,
  events,
}: {
  date: string;
  routineDone: number;
  meds: number;
  sleep?: string;
  events: { id: string; title: string; time?: string; done: boolean }[];
}) {
  const { addEvent, toggleEvent, removeEvent, pushToast } = useStore();
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [m, dd] = date.split('-').slice(1);

  // 빠른 공유: 공유 시트(카톡·문자 등) → 미지원이면 복사로 대체.
  async function quickShare(text: string) {
    const r = await nativeShare(text);
    if (r === 'unsupported') {
      const ok = await copyText(text);
      pushToast(ok ? '복사했어 — 붙여넣어 보내줘.' : '복사하지 못했어.');
    }
  }

  return (
    <section className="card mt-4">
      <p className="font-semibold">
        {parseInt(m, 10)}월 {parseInt(dd, 10)}일
      </p>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-eddie-muted">
        <span className="chip border-eddie-line">루틴 {routineDone}개</span>
        <span className="chip border-eddie-line">복약 {meds}건</span>
        <span className="chip border-eddie-line">{sleep ? `취침 ${sleep}` : '취침 기록 없음'}</span>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {events.map((e) => (
          <li key={e.id} className="flex items-center gap-2 rounded-xl border border-eddie-line p-2 dark:border-neutral-700">
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
            </span>
            <button
              onClick={() => quickShare(formatEvent(date, e))}
              className="btn-ghost px-2"
              aria-label="이 일정 친구에게 보내기"
            >
              📤
            </button>
            <button onClick={() => removeEvent(e.id)} className="btn-ghost px-2 text-red-500" aria-label="일정 삭제">
              ✕
            </button>
          </li>
        ))}
        {events.length === 0 && <li className="text-sm text-eddie-muted">이 날 일정이 없어.</li>}
      </ul>

      {events.length > 0 && <ShareMenu text={formatDay(date, events)} />}

      <form
        className="mt-3 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = title.trim();
          if (!v) return;
          addEvent(date, v, time || undefined);
          setTitle('');
          setTime('');
        }}
      >
        <input className="field" placeholder="일정 추가 (예: 병원 예약)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex gap-2">
          <input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="시각(선택)" />
          <button type="submit" className="btn-primary text-sm">
            추가
          </button>
        </div>
        <p className="text-xs text-eddie-muted">시각을 정하면 그 시간에 알림을 보내줄게(앱이 열려 있을 때).</p>
      </form>
    </section>
  );
}

/** 하루 일정을 친구에게 보내기 — 카톡 등 공유 시트 · 문자 · 복사. */
function ShareMenu({ text }: { text: string }) {
  const { pushToast } = useStore();
  const [open, setOpen] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(canNativeShare());
  }, []);

  async function share() {
    const r = await nativeShare(text);
    if (r === 'unsupported') {
      const ok = await copyText(text);
      pushToast(ok ? '복사했어 — 붙여넣어 보내줘.' : '복사하지 못했어.');
    }
    setOpen(false);
  }

  async function copy() {
    const ok = await copyText(text);
    pushToast(ok ? '복사했어 — 붙여넣어 보내줘.' : '복사하지 못했어.');
    setOpen(false);
  }

  return (
    <div className="mt-3 border-t border-eddie-line pt-3 dark:border-neutral-700">
      <button onClick={() => setOpen((o) => !o)} className="btn-soft w-full text-sm">
        📤 이 날 일정 친구에게 보내기
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-2">
          {canShare && (
            <button onClick={share} className="btn-soft flex-1 text-sm">
              💬 카톡 등으로 공유
            </button>
          )}
          <a
            href={smsHref(text)}
            onClick={() => setOpen(false)}
            className="btn-soft flex-1 text-center text-sm"
          >
            ✉️ 문자로 보내기
          </a>
          <button onClick={copy} className="btn-soft flex-1 text-sm">
            📋 복사
          </button>
        </div>
      )}
    </div>
  );
}
