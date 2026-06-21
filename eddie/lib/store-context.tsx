'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  CheckInState,
  DeparturePlan,
  DifficultyKey,
  Medication,
  Routine,
  RoutineItem,
  Settings,
  Streak,
} from './types';
import { defaultState, loadState, saveState, clearState } from './storage';
import { dateKey, formatRealClock } from './clock';
import { computeStreak } from './streak';
import { computeDeparture } from './departure';
import * as notif from './notifications';

function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export interface Toast {
  id: string;
  message: string;
}

interface StoreValue {
  state: AppState;
  hydrated: boolean;
  today: string;
  streak: Streak;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  pushToast: (msg: string) => void;

  // 온보딩 (FR-601/602)
  completeOnboarding: (difficulties: DifficultyKey[], seed: { routines: Routine[]; medications: Medication[] }) => void;

  // 루틴 (FR-501/502)
  addRoutine: (kind: Routine['kind'], title: string) => void;
  renameRoutine: (id: string, title: string) => void;
  removeRoutine: (id: string) => void;
  addRoutineItem: (routineId: string, label: string) => void;
  removeRoutineItem: (routineId: string, itemId: string) => void;
  reorderRoutineItem: (routineId: string, itemId: string, dir: -1 | 1) => void;
  setCheckIn: (itemId: string, next: CheckInState) => void;

  // 복약 (FR-201/202/203)
  addMedication: (med: Omit<Medication, 'id'>) => void;
  updateMedication: (id: string, patch: Partial<Medication>) => void;
  removeMedication: (id: string) => void;
  recordMed: (medId: string, time: string, taken: boolean) => void;

  // 출발 (FR-102)
  setDeparture: (patch: Partial<DeparturePlan>) => void;

  // 설정 (FR-205 화면 외 / NFR-A-003 / 톤)
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState<string>(dateKey());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  // 하이드레이션: 클라이언트에서만 localStorage 로드
  useEffect(() => {
    setState(loadState());
    setToday(dateKey());
    setHydrated(true);
  }, []);

  // 영속
  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  // 다크모드 클래스 토글 (NFR-A-002)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', state.settings.darkMode);
  }, [state.settings.darkMode]);

  const pushToast = useCallback((message: string) => {
    const id = uid('toast');
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // ── 알림 스케줄러 (탭이 열려 있는 동안 동작) ──────────────────────
  useEffect(() => {
    if (!hydrated) return;

    function tick() {
      const s = stateRef.current;
      const now = new Date();
      const d = dateKey(now);

      // 날짜 변경 감지
      if (d !== today) setToday(d);

      const cap = s.settings.maxNotificationsPerDay;
      const tone = s.settings.tone;
      const nowHM = formatRealClock(now); // 알림 시각 비교는 실제 시각 기준(FR-104)

      // 복약 알림 (FR-201) + 재알림 (FR-203)
      s.medications.forEach((m) => {
        const onDay = m.weekdays.length === 0 || m.weekdays.includes(now.getDay());
        if (!onDay) return;
        m.times.forEach((t) => {
          const taken = s.medLogs.some(
            (l) => l.medId === m.id && l.date === d && l.time === t && (l.state === 'taken' || l.state === 'recovered'),
          );
          if (taken) return;
          // 정시 알림
          if (nowHM === t) {
            notif.fire({
              title: `약 먹을 시간 — ${m.name}`,
              body: notif.tonePhrase(tone, '준비됐을 때 원탭으로 기록해줘.', '지금 약 챙기자. 원탭으로 기록!'),
              tone,
              key: `med:${m.id}:${t}:due`,
              date: d,
              cap,
              fallback: pushToast,
            });
          }
          // 부드러운 재알림 (10분 뒤, 1회)
          if (m.remind) {
            const [hh, mm] = t.split(':').map((x) => parseInt(x, 10));
            // Date로 계산해 시(時) 넘어가는 경우(xx:50~xx:59)도 올바르게 처리
            const remindDate = new Date(now);
            remindDate.setHours(hh, mm + 10, 0, 0);
            const remindHM = `${String(remindDate.getHours()).padStart(2, '0')}:${String(remindDate.getMinutes()).padStart(2, '0')}`;
            if (nowHM === remindHM) {
              notif.fire({
                title: `${m.name} — 아직 안 먹었어`,
                body: '괜찮아, 지금 먹자. 🤗',
                tone,
                key: `med:${m.id}:${t}:remind`,
                date: d,
                cap,
                fallback: pushToast,
              });
            }
          }
        });
      });

      // 출발 역산 알림 (FR-102)
      if (s.departure.enabled) {
        const { departAt, notifyAt } = computeDeparture(s.departure, now);
        const fmt = (x: Date) => `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
        if (nowHM === fmt(notifyAt)) {
          notif.fire({
            title: '곧 나갈 시간',
            body: notif.tonePhrase(tone, `${s.departure.leadMin}분 뒤 출발하면 딱 맞아.`, `${s.departure.leadMin}분 뒤 출발! 지금 마무리하자.`),
            tone,
            key: `dep:notify`,
            date: d,
            cap,
            fallback: pushToast,
          });
        }
        if (nowHM === fmt(departAt)) {
          notif.fire({
            title: '지금 나가야 안 늦어요',
            body: notif.tonePhrase(tone, '문 앞에서 제자리 물건만 확인하고 출발!', '지금 출발! 늦지 않게 바로 나가자.'),
            tone,
            key: `dep:depart`,
            date: d,
            cap,
            fallback: pushToast,
          });
        }
      }
    }

    tick();
    const iv = setInterval(tick, 20_000);
    return () => clearInterval(iv);
  }, [hydrated, today, pushToast]);

  // ── 액션들 ───────────────────────────────────────────────────────
  const completeOnboarding = useCallback<StoreValue['completeOnboarding']>((difficulties, seed) => {
    setState((s) => ({
      ...s,
      onboarded: true,
      difficulties,
      routines: seed.routines.length ? seed.routines : s.routines,
      medications: seed.medications.length ? seed.medications : s.medications,
    }));
  }, []);

  const addRoutine = useCallback<StoreValue['addRoutine']>((kind, title) => {
    setState((s) => ({
      ...s,
      routines: [...s.routines, { id: uid('rt'), kind, title, items: [] }],
    }));
  }, []);

  const renameRoutine = useCallback<StoreValue['renameRoutine']>((id, title) => {
    setState((s) => ({ ...s, routines: s.routines.map((r) => (r.id === id ? { ...r, title } : r)) }));
  }, []);

  const removeRoutine = useCallback<StoreValue['removeRoutine']>((id) => {
    setState((s) => ({ ...s, routines: s.routines.filter((r) => r.id !== id) }));
  }, []);

  const addRoutineItem = useCallback<StoreValue['addRoutineItem']>((routineId, label) => {
    setState((s) => ({
      ...s,
      routines: s.routines.map((r) =>
        r.id === routineId ? { ...r, items: [...r.items, { id: uid('it'), label }] } : r,
      ),
    }));
  }, []);

  const removeRoutineItem = useCallback<StoreValue['removeRoutineItem']>((routineId, itemId) => {
    setState((s) => ({
      ...s,
      routines: s.routines.map((r) =>
        r.id === routineId ? { ...r, items: r.items.filter((it) => it.id !== itemId) } : r,
      ),
    }));
  }, []);

  const reorderRoutineItem = useCallback<StoreValue['reorderRoutineItem']>((routineId, itemId, dir) => {
    setState((s) => ({
      ...s,
      routines: s.routines.map((r) => {
        if (r.id !== routineId) return r;
        const idx = r.items.findIndex((it) => it.id === itemId);
        const swap = idx + dir;
        if (idx < 0 || swap < 0 || swap >= r.items.length) return r;
        const items = [...r.items];
        [items[idx], items[swap]] = [items[swap], items[idx]];
        return { ...r, items };
      }),
    }));
  }, []);

  const setCheckIn = useCallback<StoreValue['setCheckIn']>((itemId, next) => {
    const d = dateKey();
    setState((s) => {
      const existing = s.checkIns.find((c) => c.date === d);
      let checkIns;
      if (existing) {
        checkIns = s.checkIns.map((c) =>
          c.date === d ? { ...c, states: { ...c.states, [itemId]: next } } : c,
        );
      } else {
        checkIns = [...s.checkIns, { date: d, states: { [itemId]: next } }];
      }
      return { ...s, checkIns };
    });
  }, []);

  const addMedication = useCallback<StoreValue['addMedication']>((med) => {
    setState((s) => ({ ...s, medications: [...s.medications, { ...med, id: uid('md') }] }));
  }, []);

  const updateMedication = useCallback<StoreValue['updateMedication']>((id, patch) => {
    setState((s) => ({ ...s, medications: s.medications.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  }, []);

  const removeMedication = useCallback<StoreValue['removeMedication']>((id) => {
    setState((s) => ({ ...s, medications: s.medications.filter((m) => m.id !== id) }));
  }, []);

  const recordMed = useCallback<StoreValue['recordMed']>((medId, time, taken) => {
    const d = dateKey();
    const now = new Date();
    // 예정 시각이 이미 지났는데 지금 먹으면 '회복(recovered)'으로 기록 (FR-203)
    const isLate = (() => {
      const [h, m] = time.split(':').map((x) => parseInt(x, 10));
      return now.getHours() * 60 + now.getMinutes() > h * 60 + m + 1;
    })();
    setState((s) => {
      const others = s.medLogs.filter((l) => !(l.medId === medId && l.date === d && l.time === time));
      const state = taken ? (isLate ? 'recovered' : 'taken') : 'missed';
      return {
        ...s,
        medLogs: [...others, { medId, date: d, time, state, recordedAt: now.toISOString() }],
      };
    });
  }, []);

  const setDeparture = useCallback<StoreValue['setDeparture']>((patch) => {
    setState((s) => ({ ...s, departure: { ...s.departure, ...patch } }));
  }, []);

  const updateSettings = useCallback<StoreValue['updateSettings']>((patch) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const resetAll = useCallback(() => {
    clearState();
    setState(defaultState());
  }, []);

  const streak = useMemo(() => computeStreak(state, today), [state, today]);

  const value: StoreValue = {
    state,
    hydrated,
    today,
    streak,
    toasts,
    dismissToast,
    pushToast,
    completeOnboarding,
    addRoutine,
    renameRoutine,
    removeRoutine,
    addRoutineItem,
    removeRoutineItem,
    reorderRoutineItem,
    setCheckIn,
    addMedication,
    updateMedication,
    removeMedication,
    recordMed,
    setDeparture,
    updateSettings,
    resetAll,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

/** 오늘 체크인 상태 맵 헬퍼 */
export function useTodayCheckIns(): Record<string, CheckInState> {
  const { state, today } = useStore();
  return useMemo(() => state.checkIns.find((c) => c.date === today)?.states ?? {}, [state.checkIns, today]);
}

export type { RoutineItem };
