import type Anthropic from '@anthropic-ai/sdk';
import type { Task } from '../types';
import type { TemplateStep } from './templates';

// FR-B02 두 번째 경로 + §8.3: 선택적 LLM 역산 분해 (Claude API).
// 규칙 템플릿이 항상 fallback이므로 LLM은 "있으면 더 똑똑하게" 정도의 옵션.
// PRD §10: claude-sonnet 사용. 키는 기기 로컬(localStorage)에만 저장 (local-first).

const KEY_STORAGE = 'miri.anthropic.apiKey';
const ENABLED_STORAGE = 'miri.llm.enabled';
const DECOMPOSE_MODEL = 'claude-sonnet-4-6';

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function setApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* noop */
  }
}

export function isLLMEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_STORAGE) === '1' && getApiKey().length > 0;
  } catch {
    return false;
  }
}

export function setLLMEnabled(on: boolean): void {
  try {
    localStorage.setItem(ENABLED_STORAGE, on ? '1' : '0');
  } catch {
    /* noop */
  }
}

// 구조화 출력 스키마 — title + offset(마감 며칠 전) 배열
const STEP_SCHEMA = {
  type: 'object',
  properties: {
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          offset: { type: 'integer' },
        },
        required: ['title', 'offset'],
        additionalProperties: false,
      },
    },
  },
  required: ['steps'],
  additionalProperties: false,
} as const;

function buildPrompt(task: Task): string {
  return [
    '당신은 ADHD 사용자를 돕는 역산 스케줄러입니다.',
    '다음 마감 작업을, 착수 가능한 구체적 서브태스크 3~6개로 나누세요.',
    '각 서브태스크는 (1) 짧은 한국어 제목, (2) "마감 며칠 전"을 뜻하는 정수 offset(일 단위)을 가집니다.',
    'offset이 큰 단계가 먼저 수행됩니다. 마지막(제출/완료) 단계의 offset은 반드시 0(마감 당일)입니다.',
    '단계는 시간 순으로 합리적으로 벌어지게 배치하세요.',
    '',
    `작업: "${task.title}"`,
    `유형: ${task.type}`,
    `마감일: ${task.dueDate}`,
  ].join('\n');
}

/**
 * Claude로 마감을 서브태스크로 분해한다. 실패하면 null을 반환해
 * 호출 측이 규칙 템플릿으로 자연스럽게 fallback하도록 한다.
 */
export async function llmDecompose(task: Task): Promise<TemplateStep[] | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    // SDK는 사용 시점에만 동적 로드 (초기 번들 경량 유지)
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    const res = await client.messages.create({
      model: DECOMPOSE_MODEL,
      max_tokens: 1024,
      // 저비용·결정적: 얕은 사고 + 구조화 출력
      output_config: { effort: 'low', format: { type: 'json_schema', schema: STEP_SCHEMA } },
      messages: [{ role: 'user', content: buildPrompt(task) }],
    } as Anthropic.MessageCreateParamsNonStreaming);

    const text = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text;
    if (!text) return null;
    const parsed = JSON.parse(text) as { steps?: TemplateStep[] };
    const steps = (parsed.steps ?? []).filter(
      (s) => typeof s.title === 'string' && typeof s.offset === 'number',
    );
    if (steps.length < 2) return null;
    // 마감 당일(0) 단계 보장
    if (!steps.some((s) => s.offset === 0)) steps.push({ title: '최종 제출', offset: 0 });
    return steps;
  } catch (e) {
    // 키 오류·네트워크·CORS 등 → 규칙 템플릿 fallback
    console.warn('[miri] LLM 분해 실패, 규칙 템플릿으로 대체:', (e as Error).message);
    return null;
  }
}
