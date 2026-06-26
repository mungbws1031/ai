'use client';

import { useStore } from '@/lib/store-context';
import { buildCalendarICS, downloadICS } from '@/lib/ics';

/** 다가오는 일정 전체를 .ics로 내보내 OS 캘린더에 한 번에 추가(백그라운드 알림 위임). */
export default function CalendarExport() {
  const { state, today, pushToast } = useStore();
  const upcoming = state.schedule.filter((e) => e.date >= today && !e.done);
  if (upcoming.length === 0) return null;

  function exportAll() {
    downloadICS('eddie-일정.ics', buildCalendarICS(upcoming, new Date()));
    pushToast(`일정 ${upcoming.length}개를 캘린더 파일로 내려받았어 📅`);
  }

  return (
    <button onClick={exportAll} className="card mb-3 flex w-full items-center gap-3 text-left">
      <span className="text-2xl" aria-hidden>
        📅
      </span>
      <span className="flex-1">
        <span className="block font-semibold">캘린더로 내보내기 (.ics)</span>
        <span className="block text-sm text-eddie-muted">
          다가오는 {upcoming.length}개를 OS 캘린더에 추가 — 앱이 꺼져도 알림이 와
        </span>
      </span>
      <span aria-hidden className="text-eddie-muted">
        ↓
      </span>
    </button>
  );
}
