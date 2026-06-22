// FR-102 — 출발 역산
// 출발 시각 = 도착 목표 - 이동시간 - 준비시간
// 알림: 출발 N분 전, 출발 시각.
import { DeparturePlan } from './types';
import { eddieNow } from './clock';

function parseHM(hm: string, base: Date): Date {
  const [h, m] = hm.split(':').map((x) => parseInt(x, 10));
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

export interface DepartureComputation {
  departAt: Date; // 나가야 하는 실제 시각
  notifyAt: Date; // 출발 N분 전 알림 시각
  arriveAt: Date;
}

/** 오늘 기준 출발 역산. 도착시각이 이미 지난 경우에도 오늘 날짜 기준으로 계산. */
export function computeDeparture(plan: DeparturePlan, base: Date = new Date()): DepartureComputation {
  const arriveAt = parseHM(plan.arrival, base);
  const departAt = new Date(arriveAt.getTime() - (plan.travelMin + plan.prepMin) * 60_000);
  const notifyAt = new Date(departAt.getTime() - plan.leadMin * 60_000);
  return { departAt, notifyAt, arriveAt };
}

export interface Countdown {
  // 에디 시계 기준 남은 분(올림). 음수면 이미 출발 시각 지남.
  minutesLeft: number;
  past: boolean;
  label: string; // 'HH:mm' 출발 시각 표시
}

/**
 * 출발까지 남은 시간. 앱 전체가 빠른 시계를 따르도록
 * 카운트다운도 에디 시계(eddieNow) 기준으로 계산한다.
 */
export function departureCountdown(plan: DeparturePlan, real: Date = new Date()): Countdown {
  const { departAt } = computeDeparture(plan, real);
  const now = eddieNow(real);
  const diffMs = departAt.getTime() - now.getTime();
  const minutesLeft = Math.ceil(diffMs / 60_000);
  const hh = String(departAt.getHours()).padStart(2, '0');
  const mm = String(departAt.getMinutes()).padStart(2, '0');
  return {
    minutesLeft,
    past: minutesLeft < 0,
    label: `${hh}:${mm}`,
  };
}
