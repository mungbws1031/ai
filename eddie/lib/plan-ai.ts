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
export interface EventPlan {
  summary: string;
  tasks: PlanTask[];
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
  },
  required: ['summary', 'tasks'],
  additionalProperties: false,
} as const;

const SYSTEM = `너는 ADHD 사용자의 일정 준비를 돕는 따뜻한 플래너 '에디'야. 한국어로 답한다.
규칙:
- 주어진 일정 하나를 잘 치르기 위한 준비 할 일을 시간 순서대로 제안한다.
- 누구를 만나는 약속이면: 약속 시간·장소 확인, 가는 길/교통 미리 확인, 가져갈 것(선물·서류 등), 옷 준비 같은 현실적 준비를 포함.
- 각 할 일은 아주 작고 구체적이며 바로 할 수 있게("약속 장소·시간 한 번 더 확인하기").
- daysBefore: 그 할 일을 며칠 전에 하면 좋은지(예: 7,3,2,1,0). 멀수록 큰 준비, 가까울수록 당일 챙기기.
- 보통 3~6개. 너무 많게 만들지 말 것. 비난·압박 없는 톤.
- time은 보통 비워('') 두고, 꼭 필요할 때만 'HH:mm'.`;

export async function planEvent(opts: {
  apiKey: string;
  title: string;
  date: string; // 'YYYY-MM-DD'
  time?: string;
  todayLabel: string;
}): Promise<EventPlan> {
  const { apiKey, title, date, time, todayLabel } = opts;
  const when = `${date}${time ? ' ' + time : ''}`;

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
            content: `오늘은 ${todayLabel}. 다음 일정을 잘 준비하도록 할 일을 짜줘.\n일정: "${title}" (${when})`,
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
    };
  } catch {
    throw new Error('결과를 읽지 못했어. 다시 한 번 시도해줄래?');
  }
}
