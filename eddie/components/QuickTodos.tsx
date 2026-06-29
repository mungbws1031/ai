'use client';

import { useRef, useState } from 'react';
import { useStore } from '@/lib/store-context';
import { parseWhen } from '@/lib/parse-when';
import FocusMode from './FocusMode';
import { Todo } from '@/lib/types';

// '에디~ 메모해줘' 같은 호출/명령어를 떼어내고 내용만 남긴다.
function stripWakeWords(s: string): string {
  return s
    .replace(/에디\s*(야|아|~)?/g, ' ')
    .replace(/메모\s*(해줘|해|좀|할게)?/g, ' ')
    .replace(/(적어|담아|기록해)\s*(줘|놔|둬)?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 할 일 빠른 담기(브레인 덤프).
 * ADHD에서 떠오른 일은 즉시 적지 않으면 사라진다 — 날짜·시간 고를 필요 없이 한 줄로 담는 인박스.
 * '내일 3시 치과'처럼 날짜 표현이 있으면 달력 일정으로 넣는다.
 */
export default function QuickTodos() {
  const { state, today, addTodo, addEvent, pushToast, toggleTodo, removeTodo, clearDoneTodos, setTodoReminder } =
    useStore();
  const [text, setText] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [focus, setFocus] = useState<Todo | null>(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<unknown>(null);

  function submit(override?: string) {
    const v = (override ?? text).trim();
    if (!v) return;
    const parsed = parseWhen(v, new Date());
    if (parsed.date) {
      const title = parsed.cleanedText || v;
      addEvent(parsed.date, title, parsed.time || remindAt || undefined);
      const [, mo, d] = parsed.date.split('-');
      pushToast(`달력 ${parseInt(mo, 10)}월 ${parseInt(d, 10)}일에 넣었어 🗓️`);
    } else {
      addTodo(v, remindAt || undefined);
    }
    setText('');
    setRemindAt('');
  }

  function toggleVoice() {
    // 듣는 중이면 중지
    if (listening) {
      try {
        (recRef.current as { stop?: () => void } | null)?.stop?.();
      } catch {
        /* noop */
      }
      return;
    }
    const SR =
      (typeof window !== 'undefined' &&
        ((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition)) ||
      null;
    if (!SR) {
      pushToast('이 브라우저는 음성 입력을 지원하지 않아. 크롬에서 써줘 🙏');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new (SR as any)();
    recRef.current = rec;
    rec.lang = 'ko-KR';
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = '';
    rec.onresult = (e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => {
      let interim = '';
      finalText = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setText(stripWakeWords(finalText || interim));
    };
    rec.onerror = (e: { error?: string }) => {
      if (e.error === 'not-allowed') pushToast('마이크 권한이 필요해. 브라우저 설정에서 허용해줘.');
      else if (e.error === 'no-speech') pushToast('소리가 안 들렸어. 다시 한 번!');
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      const cleaned = stripWakeWords(finalText);
      if (cleaned) submit(cleaned);
    };
    try {
      rec.start();
      setListening(true);
      pushToast('듣고 있어… 말해줘 🎙️');
    } catch {
      setListening(false);
    }
  }

  const todos = state.todos;
  const openCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.length - openCount;

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold">할 일 빨리 담기</p>
        {openCount > 0 && <span className="text-sm text-eddie-muted">남은 {openCount}개</span>}
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex gap-2">
          <input
            className="field flex-1"
            placeholder="떠오른 일 적어두기 (예: 다음주 화요일 치과)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="할 일 입력"
            enterKeyHint="done"
          />
          <button
            type="button"
            onClick={toggleVoice}
            className={`min-h-tap shrink-0 rounded-xl2 px-3 text-lg ${
              listening ? 'animate-pulse bg-eddie-accent text-white' : 'bg-eddie-primary-soft text-eddie-primary'
            }`}
            aria-label={listening ? '음성 입력 중지' : '음성으로 담기'}
            title="음성으로 담기"
          >
            🎙️
          </button>
          <button type="submit" className="btn-primary shrink-0 text-sm" disabled={!text.trim()}>
            담기
          </button>
        </div>
        <p className="text-xs text-eddie-muted">
          🎙️ 누르고 “에디~ 메모해줘, 내일 3시 치과”처럼 말해도 돼. ‘내일’·‘다음주 화요일’ 같은 날짜는 달력에 들어가.
        </p>
        <label className="flex items-center gap-2 text-xs text-eddie-muted">
          🔔 알림 시각(선택)
          <input
            className="field !w-auto py-1 text-sm"
            type="time"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            aria-label="알림 시각(선택)"
          />
        </label>
      </form>

      {todos.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {todos.map((t) => (
            <li key={t.id} className="flex items-center gap-3">
              <button
                onClick={() => toggleTodo(t.id)}
                aria-pressed={t.done}
                aria-label={`${t.text} 완료 토글`}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  t.done ? 'border-eddie-primary bg-eddie-primary text-white' : 'border-eddie-line'
                }`}
              >
                {t.done ? '✓' : ''}
              </button>
              <span className={`flex-1 break-words ${t.done ? 'text-eddie-muted line-through' : ''}`}>{t.text}</span>
              {!t.done && (
                <button
                  onClick={() => setFocus(t)}
                  className="btn-ghost px-2 text-eddie-primary"
                  aria-label={`${t.text} 집중 모드`}
                  title="집중 모드"
                >
                  🎯
                </button>
              )}
              {t.remindAt && (
                <button
                  onClick={() => setTodoReminder(t.id, undefined)}
                  className={`chip shrink-0 border-0 text-xs ${
                    t.remindDate === today && !t.done
                      ? 'bg-eddie-primary-soft text-eddie-primary'
                      : 'bg-eddie-line text-eddie-muted'
                  }`}
                  aria-label={`알림 ${t.remindAt} 끄기`}
                  title="알림 끄기"
                >
                  🔔 {t.remindAt}
                </button>
              )}
              <button
                onClick={() => removeTodo(t.id)}
                className="btn-ghost px-2 text-red-500"
                aria-label="할 일 삭제"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-eddie-muted">머릿속에 맴도는 일, 여기 적어두면 잊지 않아. 🐣</p>
      )}

      {doneCount > 0 && (
        <button onClick={clearDoneTodos} className="mt-3 text-sm text-eddie-muted underline">
          끝낸 {doneCount}개 정리하기
        </button>
      )}

      {focus && (
        <FocusMode
          task={focus.text}
          onClose={() => setFocus(null)}
          onComplete={() => {
            toggleTodo(focus.id);
            setFocus(null);
          }}
        />
      )}
    </section>
  );
}
