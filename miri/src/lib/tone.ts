import type { ReminderStage } from '../types';

// FR-A05 / NFR-UX-02: 무죄책 톤. 단계가 올라갈수록 환기하되 절대 혼내지 않는다.
// 1: 순함 · 2: 환기 · 3: 다정한 재촉

export function stageFor(daysBefore: number): ReminderStage {
  // D-7 이상 → 1(순함), D-3 ~ D-2 → 2(환기), D-1 이하 → 3(다정한 재촉)
  if (daysBefore >= 4) return 1;
  if (daysBefore >= 2) return 2;
  return 3;
}

const STAGE_COPY: Record<ReminderStage, (title: string) => string> = {
  1: (t) => `곧 '${t}' 있어요. 머릿속에 살짝 얹어둘게요 🌿`,
  2: (t) => `'${t}', 이제 슬슬 챙겨볼까요? 같이 봐요 ☕`,
  3: (t) => `'${t}' 코앞이에요. 지금 한 발만 떼면 충분해요 💛`,
};

export function toneByStage(stage: ReminderStage, title: string): string {
  return STAGE_COPY[stage](title);
}

// 스누즈 시 (FR-A06) — 죄책감 카피 금지, 가볍게.
export function snoozeCopy(title: string): string {
  return `'${title}'는 내일 다시 살짝 꺼낼게요. 오늘은 괜찮아요 🍃`;
}

// Someday 되묻기 (FR-C03)
export function seedPromptCopy(text: string): string {
  return `지난번에 생각한 '${text}', 지금 슬슬 시작해볼까요?`;
}
