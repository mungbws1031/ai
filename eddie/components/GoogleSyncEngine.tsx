'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store-context';
import { syncGoogleCalendar } from '@/lib/google-calendar';
import { dateKey } from '@/lib/clock';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5분마다 조용히 동기화

/**
 * 구글 캘린더 백그라운드 동기화 엔진 — 화면에 아무것도 그리지 않는다.
 * 연결돼 있으면 앱이 열려 있는 동안 주기적으로(+탭 복귀 시) 자동으로 당겨오고 올린다.
 */
export default function GoogleSyncEngine() {
  const { state, upsertGoogleEvents, updateEvent, setGoogleSync } = useStore();
  const { clientId, connected } = state.googleSync;
  const scheduleRef = useRef(state.schedule);
  scheduleRef.current = state.schedule;
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!clientId || !connected) return;

    async function run() {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        const today = dateKey(new Date());
        const toPush = scheduleRef.current
          .filter((e) => !e.googleEventId && e.date >= today)
          .map((e) => ({ id: e.id, title: e.title, date: e.date, time: e.time }));
        const { remote, pushed } = await syncGoogleCalendar({ clientId, interactive: false, toPush });
        upsertGoogleEvents(remote);
        pushed.forEach((p) => updateEvent(p.id, { googleEventId: p.googleEventId }));
        setGoogleSync({ connected: true, lastSyncAt: new Date().toISOString() });
      } catch {
        // 배경 동기화의 일시적 실패(네트워크 순간 끊김 등)로 '연결 해제'를 만들지 않는다.
        // 진짜 세션 만료라면 다음 수동 동기화/재접속 때 인터랙티브 로그인으로 자연스럽게 복구된다.
      } finally {
        syncingRef.current = false;
      }
    }

    run();
    const iv = setInterval(run, SYNC_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, connected]);

  return null;
}
