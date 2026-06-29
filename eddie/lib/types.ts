// 데이터 모델 (PRD §8). MVP Alpha 범위에 필요한 엔티티만 정의한다.
// 모든 로그(복약·체크인)는 '놓침/실패'도 상태값으로 보존한다(삭제 아님).

export type DifficultyKey = 'late' | 'lost' | 'med' | 'sleep';

export type NotificationTone = 'soft' | 'firm';

/** 루틴 종류 */
export type RoutineKind = 'morning' | 'evening';

export interface RoutineItem {
  id: string;
  label: string;
}

export interface Routine {
  id: string;
  kind: RoutineKind;
  title: string;
  items: RoutineItem[];
}

/** 루틴 항목 체크인 상태. 'missed'도 보존되며 회복 가능하다. */
export type CheckInState = 'pending' | 'done' | 'missed';

/** 날짜별(YYYY-MM-DD) 루틴 항목 체크인 기록 */
export interface CheckInLog {
  date: string;
  // itemId -> 상태
  states: Record<string, CheckInState>;
}

/** 복약 설정 (FR-201) */
export interface Medication {
  id: string;
  name: string;
  // 'HH:mm' 24h, 다중 시간 가능
  times: string[];
  // 0(일)~6(토). 비어있으면 매일
  weekdays: number[];
  // 재알림 1회 여부 (FR-203)
  remind: boolean;
}

export type MedTakenState = 'taken' | 'missed' | 'recovered';

/** 복약 로그 (FR-202/203). 놓침도 회복 가능으로 보존. */
export interface MedicationLog {
  medId: string;
  date: string; // YYYY-MM-DD
  time: string; // 예정 시각 'HH:mm'
  state: MedTakenState;
  // 기록된 실제 시각 (ISO)
  recordedAt?: string;
}

/** 출발 역산 설정 (FR-102) */
export interface DeparturePlan {
  enabled: boolean;
  arrival: string; // 'HH:mm' 도착 목표 시각
  travelMin: number; // 예상 이동 시간(분)
  prepMin: number; // 준비 시간(분)
  leadMin: number; // 출발 N분 전 알림
}

/** 너그러운 스트릭 (FR-504) */
export interface Streak {
  // 누적 '잘 보낸 하루' 수 — 실패해도 0으로 리셋되지 않는다
  total: number;
  // 현재 이어가는 흐름(연속). 실패 시 멈출 뿐 누적은 보존
  momentum: number;
  // 마지막으로 '완수'로 집계된 날짜
  lastGoodDate?: string;
  // 마지막으로 집계 로직을 돌린 날짜 (중복 집계 방지)
  lastEvalDate?: string;
}

export interface Settings {
  tone: NotificationTone;
  // 1일 알림 총량 상한 (NFR-A-003)
  maxNotificationsPerDay: number;
  darkMode: boolean;
  // 알림 권한 상태 스냅샷
  notificationsAsked: boolean;
  // 정리 AI — 사용자 본인 Anthropic API 키(BYOK). 기기 로컬에만 저장.
  apiKey: string;
  // 사진을 외부(Anthropic)로 전송하는 것에 대한 명시 동의 (NFR-PR-001)
  aiConsent: boolean;
}

/** 제자리 물건 (FR-301) */
export interface PlaceItem {
  id: string;
  name: string;
  location: string; // 지정 위치(텍스트)
}

/** 취침 설정 (FR-401) */
export interface SleepSettings {
  enabled: boolean;
  targetBedtime: string; // 'HH:mm' 목표 취침시각
  windDownLeadMin: number; // 와인드다운 시작 N분 전
}

/** 취침 기록 (FR-403). 목표 대비 실제 비교용. */
export interface SleepLog {
  date: string; // YYYY-MM-DD (취침 체크인을 누른 '밤'의 날짜)
  bedtime: string; // 'HH:mm' 실제 체크인 시각
  recordedAt: string; // ISO
}

/** 마감 알림 — 복잡한 곳(공항·놀이동산 등)에서 '몇 시까지' 할 일에 분 단위 카운트다운 알림 */
export interface Deadline {
  id: string;
  date: string; // YYYY-MM-DD (보통 오늘)
  time: string; // 'HH:mm' 마감 시각
  text: string;
  leadMins: number[]; // 몇 분 전에 알릴지 (0=정시 포함)
  done: boolean;
  doneAt?: string;
}

/** 스케줄 달력의 일정 */
export interface ScheduleEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // 'HH:mm' (선택)
  title: string;
  done: boolean;
  leadDays?: number[]; // 며칠 전에 미리 알림 (예: [7,2,1])
}

/** 제자리 물건 (FR-301) */
export interface PlaceItem {
  id: string;
  name: string;
  location: string; // 지정 위치(텍스트)
}

/** 취침 설정 (FR-401) */
export interface SleepSettings {
  enabled: boolean;
  targetBedtime: string; // 'HH:mm' 목표 취침시각
  windDownLeadMin: number; // 와인드다운 시작 N분 전
}

/** 취침 기록 (FR-403). 목표 대비 실제 비교용. */
export interface SleepLog {
  date: string; // YYYY-MM-DD (취침 체크인을 누른 '밤'의 날짜)
  bedtime: string; // 'HH:mm' 실제 체크인 시각
  recordedAt: string; // ISO
}

/** 빠른 할 일 캡처(브레인 덤프). 날짜·시간에 매이지 않는 한 번성 할 일 인박스. */
export interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: string; // ISO
  doneAt?: string; // ISO
  remindAt?: string; // 'HH:mm' — 선택. 이 시각에 알림
  remindDate?: string; // 'YYYY-MM-DD' — 알림 대상 날짜(보통 담은 날)
  priority?: boolean; // 오늘 꼭 (우선순위)
}

/** 반복 알림 — 매일/매주 정해진 시각, 또는 N시간마다(물·움직임 넛지) */
export interface Recurring {
  id: string;
  text: string;
  mode: 'time' | 'interval';
  // time 모드
  time?: string; // 'HH:mm'
  weekdays?: number[]; // 0=일~6=토, 빈 배열=매일
  // interval 모드
  everyMin?: number; // N분마다
  fromHM?: string; // 활성 시작 'HH:mm'
  toHM?: string; // 활성 끝 'HH:mm'
  enabled: boolean;
}

/** 저녁 1탭 회고 */
export interface DailyReview {
  date: string; // YYYY-MM-DD
  did: string; // 오늘 한 것 하나
  tomorrow: string; // 내일의 한 가지
  savedAt: string; // ISO
}

export type Mood = 'good' | 'ok' | 'low';
/** 하루 기분 1탭 기록 */
export interface MoodLog {
  date: string; // YYYY-MM-DD
  mood: Mood;
}

export interface AppState {
  // 온보딩 완료 여부 + 선택한 어려움
  onboarded: boolean;
  difficulties: DifficultyKey[];

  routines: Routine[];
  checkIns: CheckInLog[];

  // 빠른 할 일 캡처
  todos: Todo[];

  // 마감 알림(카운트다운)
  deadlines: Deadline[];

  // 저녁 회고
  reviews: DailyReview[];

  // 반복 알림
  recurring: Recurring[];

  // 기분 기록
  moods: MoodLog[];

  medications: Medication[];
  medLogs: MedicationLog[];

  departure: DeparturePlan;

  // Beta 기능
  placeItems: PlaceItem[];
  sleep: SleepSettings;
  sleepLogs: SleepLog[];
  schedule: ScheduleEvent[];

  streak: Streak;
  settings: Settings;

  schemaVersion: number;
}
