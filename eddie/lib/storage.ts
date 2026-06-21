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
    medications: [],
    medLogs: [],
    departure: {
      enabled: false,
      arrival: '09:00',
      travelMin: 30,
      prepMin: 20,
      leadMin: 5,
    },
    streak: { total: 0, momentum: 0 },
    settings: {
      tone: 'soft',
      maxNotificationsPerDay: 6,
      darkMode: false,
      notificationsAsked: false,
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
    // 얕은 병합 + 누락 필드 보강
    return { ...defaultState(), ...parsed, schemaVersion: SCHEMA_VERSION };
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

/** 데이터 내보내기 (NFR-PR-002) */
export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}
