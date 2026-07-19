import { describe, it, expect } from 'vitest';
import { detectTemplate, genericBackPlan } from '../prep-templates';

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
