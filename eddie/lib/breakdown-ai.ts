// 큰 일 잘게 쪼개기 — 막막한 할 일을 ADHD 친화적으로 아주 작은 첫 스텝들로 분해.
// 사용자 본인 Anthropic 키로 브라우저에서 직접 호출(BYOK).

const MODEL = 'claude-opus-4-8';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';

const SCHEMA = {
  type: 'object',
  properties: {
    steps: { type: 'array', items: { type: 'string' } },
  },
  required: ['steps'],
  additionalProperties: false,
} as const;

const SYSTEM = `너는 ADHD 사용자를 돕는 따뜻한 코치 '에디'야. 한국어로 답한다.
막막한 할 일 하나를 '바로 시작할 수 있는 아주 작은 단계'로 쪼갠다.
규칙:
- 3~6개. 각 단계는 5분 안에 할 수 있을 만큼 작고 구체적으로.
- 첫 단계는 몸이 바로 움직이는 행동으로("노트북 열기", "파일 새로 만들기"처럼).
- 동사형 짧은 문장. 부담·비난 표현 금지.`;

export async function breakdownTask(opts: { apiKey: string; task: string }): Promise<string[]> {
  const { apiKey, task } = opts;
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
        max_tokens: 700,
        system: SYSTEM,
        output_config: { format: { type: 'json_schema', schema: SCHEMA } },
        messages: [{ role: 'user', content: `이 할 일을 작은 단계로 쪼개줘: "${task}"` }],
      }),
    });
  } catch {
    throw new Error('네트워크 연결을 확인해줘.');
  }
  if (!res.ok) {
    if (res.status === 401) throw new Error('API 키가 올바르지 않은 것 같아. 정리 도우미에서 키를 확인해줘.');
    if (res.status === 429) throw new Error('요청이 잠시 많았어. 조금 뒤에 다시 해보자.');
    throw new Error(`쪼개기에 실패했어 (오류 ${res.status}).`);
  }
  const json = await res.json();
  const text: string = (json?.content ?? []).find((b: { type: string }) => b.type === 'text')?.text ?? '';
  try {
    const parsed = JSON.parse(text) as { steps?: string[] };
    return (parsed.steps ?? []).map((s) => String(s).trim()).filter(Boolean);
  } catch {
    throw new Error('결과를 읽지 못했어. 다시 시도해줄래?');
  }
}
