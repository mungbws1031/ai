import { describe, it, expect } from 'vitest';
import { computeDeparture, departureCountdown } from '../departure';
import { DeparturePlan } from '../types';

const plan: DeparturePlan = {
  enabled: true,
  arrival: '09:00',
  travelMin: 30,
  prepMin: 20,
  leadMin: 5,
};

// FR-102
describe('출발 역산', () => {
  it('출발 = 도착 - 이동 - 준비', () => {
    const base = new Date('2026-06-19T07:00:00');
    const { departAt, arriveAt } = computeDeparture(plan, base);
    expect(arriveAt.getHours()).toBe(9);
    // 09:00 - 50분 = 08:10
    expect(departAt.getHours()).toBe(8);
    expect(departAt.getMinutes()).toBe(10);
  });

  it('미리 알림 = 출발 - leadMin', () => {
    const base = new Date('2026-06-19T07:00:00');
    const { notifyAt } = computeDeparture(plan, base);
    // 08:10 - 5분 = 08:05
    expect(notifyAt.getHours()).toBe(8);
    expect(notifyAt.getMinutes()).toBe(5);
  });

  it('카운트다운은 에디 시계 기준이라 실제보다 적게 남는다', () => {
    const real = new Date('2026-06-19T07:50:00'); // 출발(08:10)까지 실제 20분
    const cd = departureCountdown(plan, real);
    // 에디 시계가 5~10분 빠르므로 남은 시간은 10~15분
    expect(cd.minutesLeft).toBeLessThan(20);
    expect(cd.minutesLeft).toBeGreaterThanOrEqual(10);
    expect(cd.label).toBe('08:10');
  });

  it('출발 시각이 지나면 past=true', () => {
    const real = new Date('2026-06-19T08:30:00');
    const cd = departureCountdown(plan, real);
    expect(cd.past).toBe(true);
  });
});
