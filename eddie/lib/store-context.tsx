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
  PlaceItem,
  Routine,
  RoutineItem,
  ScheduleEvent,
  Settings,
  SleepSettings,
  Streak,
  Todo,
  Deadline,
  DailyReview,
  Recurring,
  Mood,
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

  // 제자리 (FR-301)
  addPlaceItem: (name: string, location: string) => void;
  updatePlaceItem: (id: string, patch: Partial<Omit<PlaceItem, 'id'>>) => void;
  removePlaceItem: (id: string) => void;

  // 취침 (FR-401/403)
  setSleep: (patch: Partial<SleepSettings>) => void;
  recordBedtime: () => void;

  // 빠른 할 일 캡처(브레인 덤프)
  addTodo: (text: string, remindAt?: string, remindDate?: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  clearDoneTodos: () => void;
  setTodoReminder: (id: string, remindAt?: string) => void;
  toggleTodoPriority: (id: string) => void;

  // 저녁 회고 + 기분
  saveReview: (did: string, tomorrow: string) => void;
  setMood: (mood: Mood) => void;

  // 반복 알림
  addRecurring: (r: Omit<Recurring, 'id'>) => void;
  updateRecurring: (id: string, patch: Partial<Omit<Recurring, 'id'>>) => void;
  removeRecurring: (id: string) => void;

  // 마감 알림(카운트다운)
  addDeadline: (text: string, time: string, leadMins?: number[], date?: string) => void;
  toggleDeadline: (id: string) => void;
  removeDeadline: (id: string) => void;

  // 스케줄 달력
  addEvent: (date: string, title: string, time?: string, leadDays?: number[]) => void;
  updateEvent: (id: string, patch: Partial<Omit<ScheduleEvent, 'id'>>) => void;
  removeEvent: (id: string) => void;
  toggleEvent: (id: string) => void;

  // 설정 (FR-205 화면 외 / NFR-A-003 / 톤)
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
  importState: (raw: string) => boolean;
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

      // 와인드다운 알림 (FR-401) + 화면 줄이기 넛지 (FR-402)
      if (s.sleep.enabled) {
        const [bh, bm] = s.sleep.targetBedtime.split(':').map((x) => parseInt(x, 10));
        const windDown = new Date(now);
        windDown.setHours(bh, bm - s.sleep.windDownLeadMin, 0, 0);
        const fmt = (x: Date) => `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
        if (nowHM === fmt(windDown)) {
          notif.fire({
            title: '슬슬 잘 준비할까',
            body: notif.tonePhrase(tone, '화면을 조금 줄이고 천천히 내려놓자. 🌙', '이제 화면 그만! 잘 준비 시작하자. 🌙'),
            tone,
            key: `sleep:winddown`,
            date: d,
            cap,
            fallback: pushToast,
          });
        }
        if (nowHM === s.sleep.targetBedtime) {
          notif.fire({
            title: '목표 취침시각이야',
            body: '오늘 수고했어. 누우면 취침 체크인 한 번만! 😴',
            tone,
            key: `sleep:bedtime`,
            date: d,
            cap,
            fallback: pushToast,
          });
        }
      }

      // 마감 알림(카운트다운) — 오늘 마감, 10분·5분 전·정시 등
      s.deadlines.forEach((dl) => {
        if (dl.done || dl.date !== d) return;
        const [hh, mm] = dl.time.split(':').map((x) => parseInt(x, 10));
        dl.leadMins.forEach((lead) => {
          const t = new Date(now);
          t.setHours(hh, mm - lead, 0, 0);
          if (formatRealClock(t) !== nowHM) return;
          notif.fire({
            title: lead > 0 ? `${lead}분 뒤 마감` : '지금 마감이야',
            body: `${dl.time}까지 · ${dl.text}`,
            tone,
            key: `deadline:${dl.id}:${lead}`,
            date: d,
            cap,
            fallback: pushToast,
          });
        });
      });

      // 반복 알림 (매일/매주 시각, 또는 N분 간격)
      s.recurring.forEach((r) => {
        if (!r.enabled) return;
        if (r.mode === 'time') {
          const onDay = !r.weekdays || r.weekdays.length === 0 || r.weekdays.includes(now.getDay());
          if (onDay && r.time && nowHM === r.time) {
            notif.fire({ title: '반복 알림', body: r.text, tone, key: `rec:${r.id}`, date: d, cap, fallback: pushToast });
          }
        } else if (r.mode === 'interval' && r.everyMin && r.everyMin > 0) {
          const toMin = (hm: string) => {
            const [h, m] = hm.split(':').map((x) => parseInt(x, 10));
            return h * 60 + m;
          };
          const cur = now.getHours() * 60 + now.getMinutes();
          const from = toMin(r.fromHM || '09:00');
          const to = toMin(r.toHM || '21:00');
          if (cur >= from && cur <= to && (cur - from) % r.everyMin === 0 && cur !== from) {
            notif.fire({ title: '잠깐!', body: r.text, tone, key: `rec:${r.id}:${nowHM}`, date: d, cap, fallback: pushToast });
          }
        }
      });

      // 할 일 알림 (시각 지정된 할 일)
      s.todos.forEach((t) => {
        if (!t.done && t.remindAt && t.remindDate === d && nowHM === t.remindAt) {
          notif.fire({
            title: '할 일 알림',
            body: t.text,
            tone,
            key: `todo:${t.id}`,
            date: d,
            cap,
            fallback: pushToast,
          });
        }
      });

      // 스케줄 일정 알림 (시각 지정된 오늘 일정)
      s.schedule.forEach((ev) => {
        if (ev.date === d && ev.time && !ev.done && nowHM === ev.time) {
          notif.fire({
            title: '일정 알림',
            body: ev.title,
            tone,
            key: `event:${ev.id}`,
            date: d,
            cap,
            fallback: pushToast,
          });
        }
      });

      // 일정 미리 알림 (D-7, D-2 ... 며칠 전) — 해당 일정의 시각(없으면 09:00)에 발송
      s.schedule.forEach((ev) => {
        if (ev.done || !ev.leadDays || ev.leadDays.length === 0) return;
        const fireTime = ev.time || '09:00';
        if (nowHM !== fireTime) return;
        const [ey, em, ed] = ev.date.split('-').map((x) => parseInt(x, 10));
        ev.leadDays.forEach((n) => {
          if (n <= 0) return;
          const remindDay = new Date(ey, em - 1, ed - n);
          if (dateKey(remindDay) !== d) return;
          notif.fire({
            title: `다가오는 일정 · D-${n}`,
            body: `${em}월 ${ed}일 · ${ev.title}`,
            tone,
            key: `event:${ev.id}:lead:${n}`,
            date: d,
            cap,
            fallback: pushToast,
          });
        });
      });
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

  // ── 제자리 (FR-301) ──
  const addPlaceItem = useCallback<StoreValue['addPlaceItem']>((name, location) => {
    setState((s) => ({ ...s, placeItems: [...s.placeItems, { id: uid('pl'), name, location }] }));
  }, []);
  const updatePlaceItem = useCallback<StoreValue['updatePlaceItem']>((id, patch) => {
    setState((s) => ({ ...s, placeItems: s.placeItems.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }, []);
  const removePlaceItem = useCallback<StoreValue['removePlaceItem']>((id) => {
    setState((s) => ({ ...s, placeItems: s.placeItems.filter((p) => p.id !== id) }));
  }, []);

  // ── 취침 (FR-401/403) ──
  const setSleep = useCallback<StoreValue['setSleep']>((patch) => {
    setState((s) => ({ ...s, sleep: { ...s.sleep, ...patch } }));
  }, []);
  const recordBedtime = useCallback<StoreValue['recordBedtime']>(() => {
    const now = new Date();
    // 자정~새벽(05시 이전)이면 '전날 밤'으로 귀속해 하루 기록이 자연스럽게 이어지게 한다.
    const night = new Date(now);
    if (now.getHours() < 5) night.setDate(night.getDate() - 1);
    const d = dateKey(night);
    const bedtime = formatRealClock(now);
    setState((s) => {
      const others = s.sleepLogs.filter((l) => l.date !== d);
      return { ...s, sleepLogs: [...others, { date: d, bedtime, recordedAt: now.toISOString() }] };
    });
  }, []);

  // ── 빠른 할 일 캡처 ──
  const addTodo = useCallback<StoreValue['addTodo']>((text, remindAt, remindDate) => {
    const t = text.trim();
    if (!t) return;
    const day = remindDate || dateKey(new Date());
    setState((s) => ({
      ...s,
      todos: [
        {
          id: uid('todo'),
          text: t,
          done: false,
          createdAt: new Date().toISOString(),
          ...(remindAt ? { remindAt, remindDate: day } : {}),
        },
        ...s.todos,
      ],
    }));
  }, []);
  const setTodoReminder = useCallback<StoreValue['setTodoReminder']>((id, remindAt) => {
    const day = dateKey(new Date());
    setState((s) => ({
      ...s,
      todos: s.todos.map((t) =>
        t.id === id
          ? { ...t, remindAt: remindAt || undefined, remindDate: remindAt ? day : undefined }
          : t,
      ),
    }));
  }, []);
  const toggleTodo = useCallback<StoreValue['toggleTodo']>((id) => {
    setState((s) => ({
      ...s,
      todos: s.todos.map((t) =>
        t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : undefined } : t,
      ),
    }));
  }, []);
  const removeTodo = useCallback<StoreValue['removeTodo']>((id) => {
    setState((s) => ({ ...s, todos: s.todos.filter((t) => t.id !== id) }));
  }, []);
  const toggleTodoPriority = useCallback<StoreValue['toggleTodoPriority']>((id) => {
    setState((s) => ({
      ...s,
      todos: s.todos.map((t) => (t.id === id ? { ...t, priority: !t.priority } : t)),
    }));
  }, []);
  const addRecurring = useCallback<StoreValue['addRecurring']>((r) => {
    setState((s) => ({ ...s, recurring: [...s.recurring, { ...r, id: uid('rec') }] }));
  }, []);
  const updateRecurring = useCallback<StoreValue['updateRecurring']>((id, patch) => {
    setState((s) => ({ ...s, recurring: s.recurring.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  }, []);
  const removeRecurring = useCallback<StoreValue['removeRecurring']>((id) => {
    setState((s) => ({ ...s, recurring: s.recurring.filter((r) => r.id !== id) }));
  }, []);
  const saveReview = useCallback<StoreValue['saveReview']>((did, tomorrow) => {
    const date = dateKey(new Date());
    setState((s) => {
      const others = s.reviews.filter((r) => r.date !== date);
      return { ...s, reviews: [...others, { date, did, tomorrow, savedAt: new Date().toISOString() }] };
    });
  }, []);
  const setMood = useCallback<StoreValue['setMood']>((mood) => {
    const date = dateKey(new Date());
    setState((s) => ({ ...s, moods: [...s.moods.filter((m) => m.date !== date), { date, mood }] }));
  }, []);
  const clearDoneTodos = useCallback<StoreValue['clearDoneTodos']>(() => {
    setState((s) => ({ ...s, todos: s.todos.filter((t) => !t.done) }));
  }, []);

  // ── 마감 알림(카운트다운) ──
  const addDeadline = useCallback<StoreValue['addDeadline']>((text, time, leadMins, date) => {
    const t = text.trim();
    if (!t || !time) return;
    const day = date || dateKey(new Date());
    const leads = Array.from(new Set([...(leadMins ?? [10, 5]), 0])).sort((a, b) => b - a);
    setState((s) => ({
      ...s,
      deadlines: [{ id: uid('dl'), date: day, time, text: t, leadMins: leads, done: false }, ...s.deadlines],
    }));
  }, []);
  const toggleDeadline = useCallback<StoreValue['toggleDeadline']>((id) => {
    setState((s) => ({
      ...s,
      deadlines: s.deadlines.map((dl) =>
        dl.id === id ? { ...dl, done: !dl.done, doneAt: !dl.done ? new Date().toISOString() : undefined } : dl,
      ),
    }));
  }, []);
  const removeDeadline = useCallback<StoreValue['removeDeadline']>((id) => {
    setState((s) => ({ ...s, deadlines: s.deadlines.filter((dl) => dl.id !== id) }));
  }, []);

  // ── 스케줄 달력 ──
  const addEvent = useCallback<StoreValue['addEvent']>((date, title, time, leadDays) => {
    setState((s) => ({
      ...s,
      schedule: [
        ...s.schedule,
        { id: uid('ev'), date, title, time, done: false, ...(leadDays && leadDays.length ? { leadDays } : {}) },
      ],
    }));
  }, []);
  const updateEvent = useCallback<StoreValue['updateEvent']>((id, patch) => {
    setState((s) => ({ ...s, schedule: s.schedule.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }, []);
  const removeEvent = useCallback<StoreValue['removeEvent']>((id) => {
    setState((s) => ({ ...s, schedule: s.schedule.filter((e) => e.id !== id) }));
  }, []);
  const toggleEvent = useCallback<StoreValue['toggleEvent']>((id) => {
    setState((s) => ({ ...s, schedule: s.schedule.map((e) => (e.id === id ? { ...e, done: !e.done } : e)) }));
  }, []);

  const updateSettings = useCallback<StoreValue['updateSettings']>((patch) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const resetAll = useCallback(() => {
    clearState();
    setState(defaultState());
  }, []);

  const importState = useCallback<StoreValue['importState']>((raw) => {
    let parsed: Partial<AppState>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return false;
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as AppState).routines)) return false;
    const base = defaultState();
    setState((s) => ({
      ...base,
      ...parsed,
      // 중첩 객체는 기본값으로 보강, API 키는 현재 기기 값 유지
      settings: { ...base.settings, ...(parsed.settings ?? {}), apiKey: parsed.settings?.apiKey || s.settings.apiKey },
      departure: { ...base.departure, ...(parsed.departure ?? {}) },
      sleep: { ...base.sleep, ...(parsed.sleep ?? {}) },
      streak: { ...base.streak, ...(parsed.streak ?? {}) },
      schemaVersion: base.schemaVersion,
    }));
    return true;
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
    addPlaceItem,
    updatePlaceItem,
    removePlaceItem,
    setSleep,
    recordBedtime,
    addTodo,
    toggleTodo,
    removeTodo,
    clearDoneTodos,
    setTodoReminder,
    toggleTodoPriority,
    saveReview,
    setMood,
    addRecurring,
    updateRecurring,
    removeRecurring,
    addDeadline,
    toggleDeadline,
    removeDeadline,
    addEvent,
    updateEvent,
    removeEvent,
    toggleEvent,
    updateSettings,
    resetAll,
    importState,
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
