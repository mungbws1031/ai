import { describe, it, expect } from 'vitest';
import { computeStreak, isGoodDay } from '../streak';
import { defaultState } from '../storage';
import { AppState } from '../types';

function withCheckIn(state: AppState, date: string, itemId: string, done: boolean): AppState {
  return {
    ...state,
    checkIns: [...state.checkIns, { date, states: { [itemId]: done ? 'done' : 'missed' } }],
  };
}

// FR-504 — 너그러운 스트릭
describe('너그러운 스트릭', () => {
  it('핵심 1개 완수면 잘 보낸 하루', () => {
    let s = defaultState();
    s = withCheckIn(s, '2026-06-19', 'a', true);
    expect(isGoodDay(s, '2026-06-19')).toBe(true);
  });

  it('복약 기록(taken/recovered)도 잘 보낸 하루로 인정', () => {
    let s = defaultState();
    s = { ...s, medLogs: [{ medId: 'm', date: '2026-06-19', time: '09:00', state: 'recovered' }] };
    expect(isGoodDay(s, '2026-06-19')).toBe(true);
  });

  it('아무것도 안 한 날은 잘 보낸 하루가 아니다', () => {
    let s = defaultState();
    s = withCheckIn(s, '2026-06-19', 'a', false); // missed
    expect(isGoodDay(s, '2026-06-19')).toBe(false);
  });

  it('하루 실패해도 total은 0으로 리셋되지 않는다', () => {
    let s = defaultState();
    s = withCheckIn(s, '2026-06-17', 'a', true);
    s = withCheckIn(s, '2026-06-18', 'a', true);
    // 6/19은 실패(기록 없음)
    const streak = computeStreak(s, '2026-06-19');
    expect(streak.total).toBe(2); // 누적 보존
  });

  it('하루 빈칸은 흐름(momentum)을 끊지 않고 이어준다', () => {
    let s = defaultState();
    s = withCheckIn(s, '2026-06-17', 'a', true);
    // 6/18 빈칸(놓침)
    s = withCheckIn(s, '2026-06-19', 'a', true);
    const streak = computeStreak(s, '2026-06-19');
    // 6/19 good(+1) → 6/18 빈칸(다리) → 6/17 good(+1) = 2, 0으로 떨어지지 않음
    expect(streak.momentum).toBe(2);
    expect(streak.momentum).toBeGreaterThan(0);
  });

  it('연속 2일 빈칸이면 흐름이 쉬어가되 음수가 되지 않는다', () => {
    let s = defaultState();
    s = withCheckIn(s, '2026-06-15', 'a', true);
    // 6/16, 6/17 연속 빈칸, 오늘 6/17 기준
    const streak = computeStreak(s, '2026-06-17');
    expect(streak.momentum).toBeGreaterThanOrEqual(0);
    expect(streak.total).toBe(1);
  });
});
