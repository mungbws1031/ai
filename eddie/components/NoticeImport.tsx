'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store-context';
import { extractNotice, ExtractedEvent, ExtractedTodo } from '@/lib/notice-ai';

const WD = ['일', '월', '화', '수', '목', '금', '토'];

function todayLabel(): string {
  const n = new Date();
  const iso = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  return `${iso} (${WD[n.getDay()]})`;
}

function dateLabel(d: string): string {
  const [, m, day] = d.split('-');
  return `${parseInt(m, 10)}월 ${parseInt(day, 10)}일`;
}

/** 하이클래스 등 공지 글을 붙여넣어 일정·할 일을 뽑아 선택 등록. */
export default function NoticeImport() {
  const { state, addEvent, addTodo, pushToast } = useStore();
  const hasKey = !!state.settings.apiKey;

  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<(ExtractedEvent & { pick: boolean })[]>([]);
  const [todos, setTodos] = useState<(ExtractedTodo & { pick: boolean })[]>([]);
  const [analyzed, setAnalyzed] = useState(false);

  async function analyze() {
    setLoading(true);
    setError(null);
    setAnalyzed(false);
    try {
      const r = await extractNotice({ apiKey: state.settings.apiKey, text, todayLabel: todayLabel() });
      setEvents(r.events.map((e) => ({ ...e, pick: true })));
      setTodos(r.todos.map((t) => ({ ...t, pick: true })));
      setAnalyzed(true);
      if (r.events.length === 0 && r.todos.length === 0) {
        setError('이 글에선 등록할 일정·할 일을 못 찾았어. 다른 부분을 붙여넣어 볼까?');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석에 실패했어.');
    } finally {
      setLoading(false);
    }
  }

  function register() {
    const ev = events.filter((e) => e.pick);
    const td = todos.filter((t) => t.pick);
    ev.forEach((e) => addEvent(e.date, e.title, e.time || undefined));
    td.forEach((t) => addTodo(t.text, t.remindAt || undefined));
    pushToast(`일정 ${ev.length}개 · 할 일 ${td.length}개 담았어 🐣`);
    // 초기화 후 닫기
    setText('');
    setEvents([]);
    setTodos([]);
    setAnalyzed(false);
    setOpen(false);
  }

  const pickedCount = events.filter((e) => e.pick).length + todos.filter((t) => t.pick).length;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="card mb-3 flex w-full items-center gap-3 text-left">
        <span className="text-2xl" aria-hidden>
          📋
        </span>
        <span className="flex-1">
          <span className="block font-semibold">공지·노션에서 일정 가져오기</span>
          <span className="block text-sm text-eddie-muted">하이클래스·노션 등 내용을 붙여넣으면 자동 정리</span>
        </span>
        <span aria-hidden className="text-eddie-muted">
          ›
        </span>
      </button>
    );
  }

  return (
    <section className="card mb-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold">공지·노션에서 일정 가져오기</p>
        <button onClick={() => setOpen(false)} className="text-sm text-eddie-muted" aria-label="닫기">
          닫기
        </button>
      </div>

      {!hasKey ? (
        <p className="text-sm text-eddie-muted">
          이 기능은 본인 Anthropic 키가 필요해.{' '}
          <Link href="/clean" className="text-eddie-primary underline">
            정리 도우미
          </Link>
          에서 먼저 키를 등록해줘.
        </p>
      ) : (
        <>
          <textarea
            className="field min-h-tap w-full resize-y py-3"
            rows={5}
            placeholder="하이클래스 공지나 노션 내용을 복사해서 붙여넣어줘 (예: 6/27(금) 현장학습, 도시락·물 준비, 동의서 25일까지 제출). 노션 표·목록도 OK."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="text-xs text-eddie-muted">
            노션: 페이지 내용을 복사하거나, 데이터베이스를 ⋯ → 내보내기(Markdown·CSV) 후 붙여넣으면 돼.
          </p>
          <button onClick={analyze} disabled={!text.trim() || loading} className="btn-primary disabled:opacity-40">
            {loading ? '에디가 읽는 중… 👀' : '일정·할 일 뽑기'}
          </button>

          {error && <p className="text-sm text-eddie-accent">{error}</p>}

          {analyzed && (events.length > 0 || todos.length > 0) && (
            <div className="flex flex-col gap-3">
              {events.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-semibold">일정 (달력에 추가)</p>
                  <ul className="flex flex-col gap-1">
                    {events.map((e, i) => (
                      <li key={`e${i}`}>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-eddie-primary"
                            checked={e.pick}
                            onChange={(ev) =>
                              setEvents((arr) => arr.map((x, j) => (j === i ? { ...x, pick: ev.target.checked } : x)))
                            }
                          />
                          <span>
                            <span className="font-medium text-eddie-primary">{dateLabel(e.date)}</span>
                            {e.time && <span className="text-eddie-muted"> {e.time}</span>} · {e.title}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {todos.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-semibold">할 일 (담기)</p>
                  <ul className="flex flex-col gap-1">
                    {todos.map((t, i) => (
                      <li key={`t${i}`}>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-eddie-primary"
                            checked={t.pick}
                            onChange={(ev) =>
                              setTodos((arr) => arr.map((x, j) => (j === i ? { ...x, pick: ev.target.checked } : x)))
                            }
                          />
                          <span>
                            {t.text}
                            {t.remindAt && <span className="text-eddie-muted"> · 🔔 {t.remindAt}</span>}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={register} disabled={pickedCount === 0} className="btn-primary disabled:opacity-40">
                선택한 {pickedCount}개 담기
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
