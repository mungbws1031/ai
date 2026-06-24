// PRD §7 데이터 모델 (TypeScript 인터페이스 수준)

export type TaskType = 'deadline' | 'appointment' | 'recurring' | 'travel';
export type ReminderStage = 1 | 2 | 3;
export type SeedStatus = 'dormant' | 'prompted' | 'converted' | 'dismissed';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type Vagueness = 'low' | 'mid' | 'high';

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  dueDate: string; // ISO (날짜 기준 yyyy-MM-dd)
  subtasks: Subtask[]; // B 엔진 산출 (참조용 캐시; 정본은 subtasks 테이블)
  reminderConfig: number[]; // 예: [7,3,1] = D-7/D-3/D-1
  status: 'open' | 'done';
  sourceSeedId?: string; // C에서 전환된 경우
  createdAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  scheduledDate: string; // 역산 배치 결과 (yyyy-MM-dd)
  status: 'open' | 'done';
}

export interface Reminder {
  id: string;
  taskId?: string;
  subtaskId?: string;
  title: string; // 카드 표시용 (무엇에 대한 리마인더인지)
  fireAt: string; // ISO
  stage: ReminderStage; // 톤 에스컬레이션용
  status: 'pending' | 'shown' | 'done' | 'snoozed';
  snoozedUntil?: string; // ISO, status='snoozed'일 때
}

export interface SomedaySeed {
  id: string;
  text: string;
  season?: Season;
  target?: string; // "가족" 등
  vagueness?: Vagueness;
  revisitAt: string; // 되묻기 시점 ISO
  status: SeedStatus;
  convertedTaskId?: string;
  createdAt: string;
}

// 홈 큐 카드 (리마인더 + Someday 프롬프트 통합)
export type HomeCard =
  | { kind: 'reminder'; reminder: Reminder; copy: string; taskTitle: string }
  | { kind: 'seed'; seed: SomedaySeed; copy: string };
