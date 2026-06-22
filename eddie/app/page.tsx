'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store-context';
import { eddieLine } from '@/lib/eddie';
import EddieClock from '@/components/EddieClock';
import DepartureCard from '@/components/DepartureCard';
import MedicationToday from '@/components/MedicationToday';
import RoutineCheckList from '@/components/RoutineCheckList';
import EddieBubble from '@/components/EddieBubble';
import QuickTodos from '@/components/QuickTodos';

// 오늘 화면 (IA §7.2): 에디 시계, 출발 카운트다운, 약, 다음 할 일
export default function TodayPage() {
  const { state, today, toggleEvent } = useStore();
  const morning = state.routines.find((r) => r.kind === 'morning') ?? state.routines[0];
  const todayEvents = state.schedule
    .filter((e) => e.date === today)
    .sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));

  const now = new Date();
  const greetingHour = now.getHours();
  const greeting = greetingHour < 11 ? '좋은 아침이야' : greetingHour < 18 ? '오늘도 같이 가자' : '오늘 하루도 수고했어';
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 (${WD[now.getDay()]})`;

  return (
    <div className="flex flex-col gap-4 px-4">
      <header className="flex items-center justify-between px-1 pt-6">
        <EddieBubble line={{ mood: 'calm', text: greeting }} />
        <span className="shrink-0 text-sm font-medium text-eddie-muted tabular-nums">{dateLabel}</span>
      </header>

      <EddieClock />
      <QuickTodos />
      <DepartureCard />
      <MedicationToday />

      {todayEvents.length > 0 && (
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">오늘 일정</p>
            <Link href="/calendar" className="text-sm text-eddie-primary">
              달력 열기
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {todayEvents.map((e) => (
              <li key={e.id} className="flex items-center gap-3">
                <button
                  onClick={() => toggleEvent(e.id)}
                  aria-pressed={e.done}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    e.done ? 'border-eddie-primary bg-eddie-primary text-white' : 'border-eddie-line'
                  }`}
                  aria-label={`${e.title} 완료 토글`}
                >
                  {e.done ? '✓' : ''}
                </button>
                <span className={`flex-1 ${e.done ? 'text-eddie-muted line-through' : ''}`}>
                  {e.time && <span className="mr-1 font-mono text-xs text-eddie-primary">{e.time}</span>}
                  {e.title}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {morning ? (
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">{morning.title}</p>
            <Link href="/routines" className="text-sm text-eddie-primary">
              루틴 열기
            </Link>
          </div>
          <RoutineCheckList routine={morning} />
        </section>
      ) : (
        <Link href="/routines" className="card flex items-center justify-between">
          <div>
            <p className="font-semibold">다음 할 일</p>
            <p className="text-sm text-eddie-muted">작은 루틴 하나부터 시작해 볼까?</p>
          </div>
          <span className="btn-soft">루틴 만들기</span>
        </Link>
      )}
    </div>
  );
}
