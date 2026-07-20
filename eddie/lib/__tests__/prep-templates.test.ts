import { describe, it, expect } from 'vitest';
import { detectTemplate, genericBackPlan, filterByRoom } from '../prep-templates';

describe('detectTemplate', () => {
  it('키워드로 유형을 찾는다', () => {
    expect(detectTemplate('부산 출장')?.name).toBe('출장');
    expect(detectTemplate('제주 여행')?.name).toBe('여행');
    expect(detectTemplate('그냥 약속')).toBeNull();
  });
});

describe('genericBackPlan', () => {
  const days = (n: number) => genericBackPlan(n).map((t) => t.daysBefore);

  it('남은 기간에 맞는 마일스톤만 고른다', () => {
    expect(days(20)).toEqual([14, 7, 3, 1, 0]);
    expect(days(10)).toEqual([7, 3, 1, 0]);
    expect(days(5)).toEqual([3, 1, 0]);
    expect(days(2)).toEqual([1, 0]);
  });

  it('임박/과거면 최소 당일 하나는 준다', () => {
    expect(days(0)).toEqual([0]);
    expect(days(-3)).toEqual([0]);
  });
});

describe('filterByRoom + 여행 템플릿', () => {
  const travel = () => detectTemplate('내년 여름 오사카 여행')!;

  it('멀리 남은 여행(내년)이면 항공권 예약 마일스톤이 포함된다', () => {
    const tasks = filterByRoom(travel().tasks, 300); // ~10개월 남음
    expect(tasks.map((t) => t.text)).toContain('항공권 예약하기 (일찍 할수록 저렴해)');
    expect(tasks.map((t) => t.daysBefore)).toEqual([60, 30, 14, 3, 1, 0]);
  });

  it('임박한 여행이면 이미 지났을 예약 단계는 빼고, 과거 날짜 항목을 만들지 않는다', () => {
    const tasks = filterByRoom(travel().tasks, 5);
    expect(tasks.every((t) => t.daysBefore <= 5)).toBe(true);
    expect(tasks.map((t) => t.text)).not.toContain('항공권 예약하기 (일찍 할수록 저렴해)');
    expect(tasks.map((t) => t.daysBefore)).toEqual([3, 1, 0]);
  });
});
