// 정리 AI — 방 사진을 분석해 "주어진 시간 동안 어디를 치우면 가장 깨끗해 보일지" 계획을 받는다.
//
// 아키텍처: 본 앱은 정적 사이트(서버 없음)라 사용자 본인 Anthropic API 키(BYOK)로
// 브라우저에서 직접 Claude를 호출한다(`anthropic-dangerous-direct-browser-access`).
// - 키는 기기 localStorage에만 저장된다.
// - 사진은 분석 목적으로 Anthropic API에만 전송되며 앱에 저장하지 않는다(NFR-PR-001, 사용자 동의 필요).
// - 모델: claude-opus-4-8 (vision). 응답은 구조화 출력(output_config.format)으로 받는다.

import { NotificationTone } from './types';

const MODEL = 'claude-opus-4-8';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';

export type Impact = 'high' | 'medium' | 'low';

export interface CleanTask {
  order: number;
  area: string; // 어디 (예: "침대 위", "책상")
  action: string; // 무엇을 (예: "옷 바구니에 넣기")
  minutes: number; // 예상 소요(분)
  impact: Impact; // 깨끗해 보이는 정도 기여
}

export interface CleanPlan {
  overall: string; // 전반 인상 — 비난 없는 톤
  tasks: CleanTask[]; // 우선순위(impact/분) 순으로 정렬된 계획
  totalMinutes: number;
  eddie: string; // 에디의 응원 한마디
}

const SCHEMA = {
  type: 'object',
  properties: {
    overall: { type: 'string' },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          order: { type: 'integer' },
          area: { type: 'string' },
          action: { type: 'string' },
          minutes: { type: 'integer' },
          impact: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['order', 'area', 'action', 'minutes', 'impact'],
        additionalProperties: false,
      },
    },
    totalMinutes: { type: 'integer' },
    eddie: { type: 'string' },
  },
  required: ['overall', 'tasks', 'totalMinutes', 'eddie'],
  additionalProperties: false,
} as const;

const SYSTEM = `너는 ADHD 사용자를 돕는 따뜻한 정리 코치 '에디'야. 한국어로 답한다.
원칙:
- 절대 혼내거나 부끄럽게 하지 않는다. 방이 어질러져 있어도 비난·평가하는 말을 쓰지 않는다.
- 주어진 시간 예산 안에서 "겉보기 청결도(눈에 보이는 깔끔함)를 가장 크게 올리는" 순서로 할 일을 고른다.
  큰 면적을 차지하거나 시선을 끄는 잡동사니(바닥·침대·책상 위 더미 등)를 먼저, 디테일은 시간이 남을 때.
- 각 할 일은 ADHD 친화적으로 아주 작고 구체적이며 바로 시작 가능해야 한다("바닥의 옷을 전부 빨래바구니에" 처럼).
- 모든 task의 minutes 합이 시간 예산에 최대한 가깝되 넘지 않게 한다. 무리하게 많이 넣지 말 것.
- 사진에서 실제로 보이는 것에만 근거한다. 보이지 않으면 추측하지 않는다.
- 사진이 방/공간이 아니면 tasks를 빈 배열로 두고 overall에 부드럽게 안내한다.`;

/** 파일을 긴 변 기준 maxEdge로 축소한 JPEG base64로 변환(토큰·비용 절감, 프라이버시상 원본 미전송). */
export async function fileToResizedBase64(
  file: File,
  maxEdge = 1568,
): Promise<{ data: string; mediaType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('파일을 읽지 못했어.'));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('이미지를 불러오지 못했어.'));
    i.src = dataUrl;
  });
  let { width, height } = img;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이미지를 처리하지 못했어.');
  ctx.drawImage(img, 0, 0, width, height);
  const out = canvas.toDataURL('image/jpeg', 0.85);
  return { data: out.split(',')[1] ?? '', mediaType: 'image/jpeg' };
}

export interface AnalyzeOpts {
  apiKey: string;
  imageData: string;
  mediaType: string;
  minutes: number;
  tone: NotificationTone;
}

export async function analyzeRoom(opts: AnalyzeOpts): Promise<CleanPlan> {
  const { apiKey, imageData, mediaType, minutes, tone } = opts;
  const toneHint =
    tone === 'firm'
      ? '말투는 간결하고 단호하게, 그래도 비난은 금지.'
      : '말투는 부드럽고 다정하게.';

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM,
        output_config: { format: { type: 'json_schema', schema: SCHEMA } },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
              {
                type: 'text',
                text: `이 방 사진을 보고, 딱 ${minutes}분 동안 청소한다면 어디부터 어떤 순서로 치우는 게 가장 깨끗해 보일지 계획을 세워줘. ${toneHint} task는 ${minutes}분에 맞춰 우선순위 높은 것부터.`,
              },
            ],
          },
        ],
      }),
    });
  } catch {
    throw new Error('네트워크 연결을 확인해줘. (인터넷이 끊겼을 수 있어)');
  }

  if (!res.ok) {
    if (res.status === 401) throw new Error('API 키가 올바르지 않은 것 같아. 설정에서 다시 확인해줘.');
    if (res.status === 429) throw new Error('요청이 잠시 많았어. 조금 뒤에 다시 해보자.');
    if (res.status === 400) throw new Error('요청을 처리하지 못했어. 다른 사진으로 시도해볼까?');
    throw new Error(`분석 중 문제가 생겼어 (오류 ${res.status}). 잠시 후 다시 시도해줘.`);
  }

  const json = await res.json();
  if (json?.stop_reason === 'refusal') {
    throw new Error('이 사진은 분석하기 어려워. 방 전체가 잘 보이는 사진으로 다시 시도해줄래?');
  }
  const text: string =
    (json?.content ?? []).find((b: { type: string }) => b.type === 'text')?.text ?? '';
  try {
    const parsed = JSON.parse(text) as CleanPlan;
    parsed.tasks = (parsed.tasks ?? []).slice().sort((a, b) => a.order - b.order);
    return parsed;
  } catch {
    throw new Error('결과를 읽지 못했어. 다시 한 번 시도해줄래?');
  }
}
