// 로컬 우선 저장 (NFR-PR-001). localStorage 기반 영속.
import { AppState } from './types';

const KEY = 'eddie.appState.v1';
const SCHEMA_VERSION = 1;

export function defaultState(): AppState {
  return {
    onboarded: false,
    difficulties: [],
    routines: [],
    checkIns: [],
    todos: [],
    deadlines: [],
    reviews: [],
    recurring: [],
    medications: [],
    medLogs: [],
    departure: {
      enabled: false,
      arrival: '09:00',
      travelMin: 30,
      prepMin: 20,
      leadMin: 5,
    },
    placeItems: [],
    sleep: { enabled: false, targetBedtime: '23:30', windDownLeadMin: 30 },
    sleepLogs: [],
    schedule: [],
    streak: { total: 0, momentum: 0 },
    settings: {
      tone: 'soft',
      maxNotificationsPerDay: 6,
      darkMode: false,
      notificationsAsked: false,
      apiKey: '',
      aiConsent: false,
    },
    schemaVersion: SCHEMA_VERSION,
  };
}

export function loadState(): AppState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = defaultState();
    // 얕은 병합 + 중첩 객체는 기본값으로 누락 필드 보강(스키마 추가 필드 마이그레이션).
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      departure: { ...base.departure, ...(parsed.departure ?? {}) },
      sleep: { ...base.sleep, ...(parsed.sleep ?? {}) },
      streak: { ...base.streak, ...(parsed.streak ?? {}) },
      schemaVersion: SCHEMA_VERSION,
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 저장 실패는 조용히 무시(용량 등). */
  }
}

export function clearState(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}

/** 데이터 내보내기 (NFR-PR-002). API 키 등 비밀값은 제외한다. */
export function exportState(state: AppState): string {
  const { settings, ...rest } = state;
  const { apiKey: _omit, ...safeSettings } = settings;
  return JSON.stringify({ ...rest, settings: safeSettings }, null, 2);
}
