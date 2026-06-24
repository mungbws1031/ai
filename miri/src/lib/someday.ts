import { setMonth, startOfDay } from 'date-fns';
import type { Season, SomedaySeed } from '../types';
import { toDateStr } from './dates';

// FR-C02: revisitAt 미설정 시 시즌 기반 기본 추정.
// "여름=직전 봄" 규칙 — 해당 시즌을 준비하기 좋은 직전 시즌의 시작 무렵으로 잡는다.
// 각 시즌의 "되묻기 월"(0-indexed): 직전 시즌 시작 월.
const SEASON_REVISIT_MONTH: Record<Season, number> = {
  summer: 2, // 여름(6~8) → 봄 시작(3월=index 2)
  fall: 5, // 가을(9~11) → 여름 시작(6월=index 5)
  winter: 8, // 겨울(12~2) → 가을 시작(9월=index 8)
  spring: 11, // 봄(3~5) → 겨울 시작(12월=index 11, 전년도)
};

/** 시즌으로부터 되묻기 시점(ISO)을 추정한다. */
export function estimateRevisitAt(season: Season | undefined, now: Date = new Date()): string {
  if (!season) {
    // 시즌 없으면 3개월 뒤 기본
    const d = new Date(now);
    d.setMonth(d.getMonth() + 3);
    return startOfDay(d).toISOString();
  }
  const month = SEASON_REVISIT_MONTH[season];
  let candidate = startOfDay(setMonth(new Date(now.getFullYear(), 0, 1), month));
  // 이미 지난 시점이면 내년으로
  if (candidate.getTime() <= startOfDay(now).getTime()) {
    candidate = startOfDay(setMonth(new Date(now.getFullYear() + 1, 0, 1), month));
  }
  return candidate.toISOString();
}

/** FR-C03 / §8.4: 되묻기 도달한 seed들 (dormant=신규 도달, prompted=노출 중) */
export function dueSeeds(seeds: SomedaySeed[], now: Date = new Date()): SomedaySeed[] {
  const t = now.getTime();
  return seeds
    .filter(
      (s) =>
        (s.status === 'dormant' || s.status === 'prompted') &&
        new Date(s.revisitAt).getTime() <= t,
    )
    .sort((a, b) => new Date(a.revisitAt).getTime() - new Date(b.revisitAt).getTime());
}

export { toDateStr };
