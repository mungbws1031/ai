// 비행기 타는 날 워크플로우 — 출발 시각 기준 당일 타임라인 + 전날 준비물.
//
// 국내/국제에 따라 공항 도착 여유가 다르다. 각 단계는 출발(departure) 기준 '몇 분 전'.
// 컴포넌트에서 일정의 날짜+시각으로 실제 시각을 계산해 마감 알림(Deadline)으로 등록한다.

export interface FlightStep {
  text: string;
  minutesBefore: number; // 출발 기준 몇 분 전
}

export interface FlightPlan {
  dayBefore: string[]; // 전날 준비 할 일
  dayOf: FlightStep[]; // 당일 타임라인(출발 기준)
}

/** travelMin: 집→공항 이동 시간(분). international: 국제선 여부. */
export function buildFlightPlan(international: boolean, travelMin: number): FlightPlan {
  // 공항에 '도착해 있어야 하는' 여유 (체크인 마감 등 고려)
  const airportBuffer = international ? 180 : 90;
  const leaveHome = airportBuffer + Math.max(0, travelMin);

  const dayBefore = international
    ? ['짐 싸기 (수하물 규정 확인)', '여권·항공권(이티켓) 확인하기', '온라인 체크인 하기', '환전·로밍/유심 확인하기']
    : ['짐 싸기', '항공권(이티켓)·신분증 확인하기', '온라인 체크인 하기'];

  const dayOf: FlightStep[] = international
    ? [
        { text: '집에서 출발하기 🚗', minutesBefore: leaveHome },
        { text: '공항 도착·체크인 카운터', minutesBefore: airportBuffer },
        { text: '수하물 위탁·보안검색', minutesBefore: 120 },
        { text: '출국심사·탑승구로 이동', minutesBefore: 75 },
        { text: '탑승구 도착·대기', minutesBefore: 40 },
        { text: '탑승 시작 🛫', minutesBefore: 30 },
      ]
    : [
        { text: '집에서 출발하기 🚗', minutesBefore: leaveHome },
        { text: '공항 도착·체크인 카운터', minutesBefore: airportBuffer },
        { text: '보안검색', minutesBefore: 60 },
        { text: '탑승구 도착·대기', minutesBefore: 30 },
        { text: '탑승 시작 🛫', minutesBefore: 20 },
      ];

  return { dayBefore, dayOf };
}

const FLIGHT_KEYWORDS = ['비행기', '항공', '공항', '출국', '탑승', 'flight'];

export function isFlightEvent(title: string): boolean {
  const t = (title || '').toLowerCase();
  return FLIGHT_KEYWORDS.some((k) => t.includes(k.toLowerCase()));
}
