import { describe, it, expect } from 'vitest';
import { eddieNow, formatEddieClock, formatRealClock, dateKey } from '../clock';
import * as clockModule from '../clock';

// FR-101 / FR-104 / UO-3
describe('에디 시계 (빠른 시계)', () => {
  it('에디 시계는 실제보다 5~10분 빠르다', () => {
    const real = new Date('2026-06-19T08:00:00');
    const fast = eddieNow(real);
    const diffMin = (fast.getTime() - real.getTime()) / 60_000;
    expect(diffMin).toBeGreaterThanOrEqual(5);
    expect(diffMin).toBeLessThanOrEqual(10);
    expect(Number.isInteger(diffMin)).toBe(true);
  });

  it('오프셋은 같은 날 동안 안정적이다', () => {
    const a = eddieNow(new Date('2026-06-19T08:00:00'));
    const b = eddieNow(new Date('2026-06-19T20:30:00'));
    const offA = (a.getTime() - new Date('2026-06-19T08:00:00').getTime()) / 60_000;
    const offB = (b.getTime() - new Date('2026-06-19T20:30:00').getTime()) / 60_000;
    expect(offA).toBe(offB);
  });

  it('날짜가 바뀌면 오프셋이 다시 결정된다(일별 1회)', () => {
    // 여러 날에 걸쳐 5~10 범위를 항상 유지하는지 + 분포가 한 값에 고정되지 않는지
    const offsets = new Set<number>();
    for (let d = 1; d <= 60; d++) {
      const day = `2026-06-${String(d <= 30 ? d : d - 30).padStart(2, '0')}`;
      const real = new Date(`${day}T08:00:00`);
      const off = (eddieNow(real).getTime() - real.getTime()) / 60_000;
      expect(off).toBeGreaterThanOrEqual(5);
      expect(off).toBeLessThanOrEqual(10);
      offsets.add(off);
    }
    expect(offsets.size).toBeGreaterThan(1); // 매일 같은 값이 아니다
  });

  it('오프셋 raw 값을 노출하는 export가 없다 (UO-3 비노출)', () => {
    const exported = Object.keys(clockModule);
    // 'offset'이라는 이름을 가진 어떤 export도 없어야 한다
    expect(exported.some((k) => /offset/i.test(k))).toBe(false);
    expect(exported.sort()).toEqual(
      ['dateKey', 'eddieNow', 'formatEddieClock', 'formatRealClock'].sort(),
    );
  });

  it('표시 시계는 실제 시계와 다르다(빨라서 분 추정이 자명하지 않음)', () => {
    const real = new Date('2026-06-19T08:00:00');
    expect(formatEddieClock(real)).not.toBe(formatRealClock(real));
  });

  it('dateKey는 YYYY-MM-DD 형식', () => {
    expect(dateKey(new Date('2026-06-09T00:00:00'))).toBe('2026-06-09');
  });
});
