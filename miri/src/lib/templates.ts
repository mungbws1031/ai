import type { TaskType } from '../types';

// 역산 분해 스텝: title + offset(마감 기준 며칠 전).
export interface TemplateStep {
  title: string;
  offset: number; // dueDate - offset days
}

// FR-B01/02: 내장 템플릿 규칙. offset이 큰 것이 먼저(이른 날짜) 온다.
export const RULE_TEMPLATE: Record<TaskType, TemplateStep[]> = {
  // S2 예시: 분기 보고서 (마감 기준 자료수집→초안→검토→제출)
  deadline: [
    { title: '자료 수집', offset: 8 },
    { title: '초안 작성', offset: 5 },
    { title: '검토·보완', offset: 2 },
    { title: '최종 제출', offset: 0 },
  ],
  // 약속/상담 등: 사전 준비 위주
  appointment: [
    { title: '필요한 것 메모', offset: 3 },
    { title: '준비물·서류 챙기기', offset: 1 },
    { title: '당일 참석', offset: 0 },
  ],
  // 반복 일정: 가볍게
  recurring: [
    { title: '준비', offset: 1 },
    { title: '실행', offset: 0 },
  ],
  // FR-B06: 여행 전용 템플릿 (D-150/120/90/30)
  travel: [
    { title: '항공권 알아보기 (항공권 타임)', offset: 150 },
    { title: '연차 신청', offset: 120 },
    { title: '숙소 예약', offset: 90 },
    { title: '준비물·짐 챙기기', offset: 30 },
    { title: '출발', offset: 0 },
  ],
};

export function templateFor(type: TaskType): TemplateStep[] {
  return RULE_TEMPLATE[type] ?? RULE_TEMPLATE.deadline;
}
