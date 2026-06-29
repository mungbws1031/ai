// 공지 텍스트 → 할 일/일정 추출.
//
// 하이클래스 등 학교 공지 글을 붙여넣으면, 사용자 본인 Anthropic 키(BYOK)로
// 날짜·시각이 있는 '일정'과 준비물·제출 등 '할 일'을 구조화해 뽑는다.
// 정리 도우미와 동일하게 브라우저에서 직접 호출(서버 없음).

const MODEL = 'claude-opus-4-8';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';

export interface ExtractedEvent {
  date: string; // 'YYYY-MM-DD' (비면 날짜 미상)
  time: string; // 'HH:mm' (비면 종일)
  title: string;
}
export interface ExtractedTodo {
  text: string;
  remindAt: string; // 'HH:mm' (비면 알림 없음)
}
export interface NoticeExtract {
  summary: string;
  events: ExtractedEvent[];
  todos: ExtractedTodo[];
}

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          time: { type: 'string' },
          title: { type: 'string' },
        },
        required: ['date', 'time', 'title'],
        additionalProperties: false,
      },
    },
    todos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          remindAt: { type: 'string' },
        },
        required: ['text', 'remindAt'],
        additionalProperties: false,
      },
    },
  },
  required: ['summary', 'events', 'todos'],
  additionalProperties: false,
} as const;

const SYSTEM = `너는 한국 학교 공지(알림장)·노션 등에서 일정과 할 일을 뽑아내는 도우미야. 한국어로 답한다.
규칙:
- '일정(events)'은 날짜가 있는 행사·시험·현장학습·마감 등. date는 'YYYY-MM-DD'.
- '할 일(todos)'은 준비물 챙기기·서류 제출·동의서 작성처럼 사용자가 해야 하는 행동. 짧은 동사형으로("도시락 준비하기").
- 입력이 표/CSV/마크다운 형식(노션 데이터베이스를 내보낸 것일 수 있음)이면 각 행을 하나의 항목으로 보고, 헤더(예: 이름/제목, 날짜, 마감, 상태)를 참고해 매핑한다.
- 이미 완료로 표시된 항목('완료','Done','✓','체크')은 제외한다.
- 상대적 표현(내일, 이번 주 금요일, 다음 주)은 제공된 오늘 날짜 기준으로 실제 날짜로 환산한다. 연도가 없으면 가장 가까운 미래로.
- 날짜를 특정할 수 없으면 events에 넣지 말고 todos로 돌린다(date 불명확한 event 금지).
- 시각이 없으면 time/remindAt은 빈 문자열 ''.
- 입력에 실제로 있는 내용만. 추측해서 만들지 말 것. 없으면 빈 배열.
- summary는 한 문장 요약.`;

export async function extractNotice(opts: {
  apiKey: string;
  text: string;
  todayLabel: string; // 예: '2026-06-22 (일)'
}): Promise<NoticeExtract> {
  const { apiKey, text, todayLabel } = opts;

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
            content: `오늘은 ${todayLabel}이야. 아래 공지에서 일정과 할 일을 뽑아줘.\n\n"""\n${text}\n"""`,
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
    throw new Error(`분석 중 문제가 생겼어 (오류 ${res.status}). 잠시 후 다시 시도해줘.`);
  }

  const json = await res.json();
  const textOut: string =
    (json?.content ?? []).find((b: { type: string }) => b.type === 'text')?.text ?? '';
  try {
    const parsed = JSON.parse(textOut) as NoticeExtract;
    return {
      summary: parsed.summary ?? '',
      events: (parsed.events ?? []).filter((e) => e.title?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(e.date ?? '')),
      todos: (parsed.todos ?? []).filter((t) => t.text?.trim()),
    };
  } catch {
    throw new Error('결과를 읽지 못했어. 다시 한 번 시도해줄래?');
  }
}
