// 일정 → 준비 계획 추출.
//
// 달력 일정(예: '6/27 친구 만나기 @홍대')을 주면, 본인 Anthropic 키로
// ADHD 친화적인 준비 할 일을 'D-며칠' 단위로 제안한다. (브라우저 직접 호출)

const MODEL = 'claude-opus-4-8';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';

export interface PlanTask {
  text: string; // 준비 할 일 (짧은 동사형)
  daysBefore: number; // 며칠 전에 (0=당일)
  time: string; // 'HH:mm' (없으면 '')
}
export interface PlanStyle {
  makeup: string; // 화장 추천 (장소·상황에 맞게)
  clothes: string; // 옷 추천
  shoes: string; // 신발 추천
}
export interface EventPlan {
  summary: string;
  tasks: PlanTask[];
  style: PlanStyle;
}

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          daysBefore: { type: 'integer' },
          time: { type: 'string' },
        },
        required: ['text', 'daysBefore', 'time'],
        additionalProperties: false,
      },
    },
    style: {
      type: 'object',
      properties: {
        makeup: { type: 'string' },
        clothes: { type: 'string' },
        shoes: { type: 'string' },
      },
      required: ['makeup', 'clothes', 'shoes'],
      additionalProperties: false,
    },
  },
  required: ['summary', 'tasks', 'style'],
  additionalProperties: false,
} as const;

const SYSTEM = `너는 ADHD 사용자의 일정 준비를 돕는 따뜻한 플래너 '에디'야. 한국어로 답한다.
규칙:
- 주어진 일정 하나를 잘 치르기 위한 준비 할 일(tasks)을 시간 순서대로 제안한다.
- 누구를 만나는 약속이면: 약속 시간·장소 확인, 가는 길/교통 미리 확인, 가져갈 것(선물·서류 등), 옷 준비 같은 현실적 준비를 포함.
- 각 할 일은 아주 작고 구체적이며 바로 할 수 있게("약속 장소·시간 한 번 더 확인하기").
- daysBefore: 그 할 일을 며칠 전에 하면 좋은지(예: 7,3,2,1,0). 멀수록 큰 준비, 가까울수록 당일 챙기기.
- 보통 3~6개. 너무 많게 만들지 말 것. 비난·압박 없는 톤.
- time은 보통 비워('') 두고, 꼭 필요할 때만 'HH:mm'.
- style: 가는 '장소·상황'과 '계절(일정 날짜 기준)'에 맞춰 화장·옷·신발을 구체적으로 추천한다.
  예) 면접→단정한 화장·셔츠/슬랙스·구두, 등산→자외선차단 위주·기능성 옷·등산화, 결혼식→하객룩, 데이트/카페→캐주얼.
  장소가 불명확하면 일반적인 무난한 추천 + 한 줄 가정만 적는다. 각 항목은 1~2문장으로 짧고 실용적으로.`;

export async function planEvent(opts: {
  apiKey: string;
  title: string;
  date: string; // 'YYYY-MM-DD'
  time?: string;
  place?: string;
  todayLabel: string;
}): Promise<EventPlan> {
  const { apiKey, title, date, time, place, todayLabel } = opts;
  const when = `${date}${time ? ' ' + time : ''}`;
  const placeLine = place && place.trim() ? `\n장소/상황: ${place.trim()}` : '';

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
        max_tokens: 1200,
        system: SYSTEM,
        output_config: { format: { type: 'json_schema', schema: SCHEMA } },
        messages: [
          {
            role: 'user',
            content: `오늘은 ${todayLabel}. 다음 일정을 잘 준비하도록 할 일 체크리스트와 화장·옷·신발 추천을 짜줘.\n일정: "${title}" (${when})${placeLine}`,
          },
        ],
      }),
    });
  } catch {
    throw new Error('네트워크 연결을 확인해줘.');
  }

  if (!res.ok) {
    if (res.status === 401) throw new Error('API 키가 올바르지 않은 것 같아. 정리 도우미에서 키를 확인해줘.');
    if (res.status === 429) throw new Error('요청이 잠시 많았어. 조금 뒤에 다시 해보자.');
    throw new Error(`계획 짜기에 실패했어 (오류 ${res.status}).`);
  }

  const json = await res.json();
  const textOut: string =
    (json?.content ?? []).find((b: { type: string }) => b.type === 'text')?.text ?? '';
  try {
    const parsed = JSON.parse(textOut) as EventPlan;
    return {
      summary: parsed.summary ?? '',
      tasks: (parsed.tasks ?? [])
        .filter((t) => t.text?.trim())
        .map((t) => ({ text: t.text, daysBefore: Math.max(0, t.daysBefore | 0), time: t.time || '' })),
      style: {
        makeup: parsed.style?.makeup ?? '',
        clothes: parsed.style?.clothes ?? '',
        shoes: parsed.style?.shoes ?? '',
      },
    };
  } catch {
    throw new Error('결과를 읽지 못했어. 다시 한 번 시도해줄래?');
  }
}
