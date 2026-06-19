// FR-504 — 너그러운 스트릭
//
// 원칙(§5.5, R-04):
// - 하루 실패해도 누적이 0으로 리셋되지 않는다.
// - '회복' 개념으로 다음 날 이어간다. 압박형 연속일수 강조 금지.
//
// 설계:
// - '잘 보낸 하루' = 핵심 루틴 1개 이상 완수 또는 복약 1건 이상 기록(taken/recovered) (KPI §11).
// - total: 누적 '잘 보낸 하루' 수. 단조 증가, 절대 리셋되지 않는다.
// - momentum: 현재 이어가는 '흐름'. 하루 놓침은 흐름을 끊지 않고 다리를 놓아 이어준다
//   (연속 2일 이상 비활동일 때만 흐름이 잠시 쉬어가며, 0으로 떨어지지 않는다).
import { AppState, Streak } from './types';
import { dateKey } from './clock';

/** 해당 날짜가 '잘 보낸 하루'인지 판정 */
export function isGoodDay(state: AppState, date: string): boolean {
  const ci = state.checkIns.find((c) => c.date === date);
  const routineDone = ci ? Object.values(ci.states).some((s) => s === 'done') : false;
  const medDone = state.medLogs.some(
    (l) => l.date === date && (l.state === 'taken' || l.state === 'recovered'),
  );
  return routineDone || medDone;
}

function shiftDate(date: string, deltaDays: number): string {
  const [y, m, d] = date.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return dateKey(dt);
}

/** 로그로부터 너그러운 스트릭을 계산한다(저장값에 의존하지 않는 진실의 원천). */
export function computeStreak(state: AppState, today: string = dateKey()): Streak {
  // total: 활동 기록이 있는 모든 날짜 중 good day 수
  const dates = new Set<string>();
  state.checkIns.forEach((c) => dates.add(c.date));
  state.medLogs.forEach((l) => dates.add(l.date));

  let total = 0;
  let lastGoodDate: string | undefined;
  Array.from(dates)
    .sort()
    .forEach((d) => {
      if (isGoodDay(state, d)) {
        total += 1;
        lastGoodDate = d;
      }
    });

  // momentum: 오늘(또는 마지막 활동일)부터 거슬러 올라가며 흐름을 잰다.
  // 하루 빈칸(놓침)은 다리를 놓아 이어주고, 연속 2일 빈칸이면 흐름을 쉬어간다.
  let momentum = 0;
  let cursor = today;
  let consecutiveMiss = 0;
  // 과도한 루프 방지: 최대 365일 거슬러 올라간다.
  for (let i = 0; i < 365; i++) {
    if (isGoodDay(state, cursor)) {
      momentum += 1;
      consecutiveMiss = 0;
    } else {
      consecutiveMiss += 1;
      // 첫 빈칸은 너그럽게 다리를 놓는다(흐름 유지). 두 번째 연속 빈칸에서 멈춘다.
      if (consecutiveMiss >= 2) break;
    }
    cursor = shiftDate(cursor, -1);
  }

  return { total, momentum, lastGoodDate };
}
