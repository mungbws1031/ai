'use client';

import { useEffect, useRef, useState } from 'react';
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
  const { state, today, addTodo, addEvent, pushToast, toggleTodo, removeTodo, clearDoneTodos, setTodoReminder, toggleTodoPriority } =
    useStore();
  const [text, setText] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [focus, setFocus] = useState<Todo | null>(null);
  const [showTime, setShowTime] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<unknown>(null);
  // 핸즈프리("에디야" 호출)
  const [handsFree, setHandsFree] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const handsFreeRef = useRef(false);
  const armedRef = useRef(false);
  const mountedRef = useRef(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getSR(): any {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }
  function stopRec() {
    try {
      (recRef.current as { stop?: () => void } | null)?.stop?.();
    } catch {
      /* noop */
    }
  }

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

  // 마이크 권한/하드웨어 문제 등 회복 불가 오류 → 핸즈프리 중단
  const FATAL = new Set(['not-allowed', 'service-not-allowed', 'audio-capture']);

  function toggleVoice() {
    if (listening) {
      stopRec();
      return;
    }
    if (handsFreeRef.current) stopHandsFree();
    const SR = getSR();
    if (!SR) {
      pushToast('이 브라우저는 음성 입력을 지원하지 않아. 크롬에서 써줘 🙏');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    recRef.current = rec;
    rec.lang = 'ko-KR';
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = '';
    rec.onresult = (e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => {
      if (recRef.current !== rec) return; // 다른 인식 인스턴스로 교체됨
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
      if (recRef.current === rec) recRef.current = null;
      setListening(false);
      if (!mountedRef.current) return;
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

  function stopHandsFree() {
    handsFreeRef.current = false;
    armedRef.current = false;
    setHandsFree(false);
    setVoiceStatus('');
    stopRec();
  }

  function startHandsFree() {
    if (listening) stopRec();
    const SR = getSR();
    if (!SR) {
      pushToast('이 브라우저는 음성 입력을 지원하지 않아. 크롬에서 써줘 🙏');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    recRef.current = rec;
    rec.lang = 'ko-KR';
    rec.interimResults = true;
    rec.continuous = true;
    let restarts = 0; // 결과 없이 즉시 재시작 반복(폭주) 방지
    rec.onresult = (e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> & { length: number } }) => {
      if (recRef.current !== rec) return;
      const last = e.results[e.results.length - 1];
      if (!last || !last.isFinal) return;
      restarts = 0;
      const raw = last[0].transcript.trim();
      if (armedRef.current) {
        const memo = stripWakeWords(raw);
        if (memo) submit(memo);
        armedRef.current = false;
        setVoiceStatus(memo ? '담았어! 또 “에디야” 하고 불러줘' : '‘에디야’ 하고 불러줘');
        return;
      }
      if (/에디/.test(raw)) {
        const after = stripWakeWords(raw);
        if (after) {
          submit(after);
          setVoiceStatus('담았어! 또 “에디야” 하고 불러줘');
        } else {
          armedRef.current = true;
          setVoiceStatus('응, 말해! 🎙️');
          try {
            navigator.vibrate?.(80);
          } catch {
            /* noop */
          }
        }
      }
    };
    rec.onerror = (e: { error?: string }) => {
      if (e.error && FATAL.has(e.error)) {
        if (e.error === 'not-allowed') pushToast('마이크 권한이 필요해. 브라우저 설정에서 허용해줘.');
        else pushToast('마이크를 쓸 수 없어. 핸즈프리를 껐어.');
        stopHandsFree();
      }
    };
    rec.onend = () => {
      // 마운트 중 + 핸즈프리 유지 + 여전히 이 인스턴스일 때만 자동 재시작
      if (mountedRef.current && handsFreeRef.current && recRef.current === rec && restarts < 8) {
        restarts += 1;
        try {
          rec.start();
        } catch {
          /* 곧 다시 onend → 재시도 */
        }
      } else {
        if (recRef.current === rec) recRef.current = null;
        if (restarts >= 8 && handsFreeRef.current) stopHandsFree();
      }
    };
    try {
      rec.start();
      handsFreeRef.current = true;
      setHandsFree(true);
      setVoiceStatus('‘에디야’ 하고 불러줘');
      pushToast('이제 “에디야” 하고 부르면 메모할게 🎧');
    } catch {
      stopHandsFree();
    }
  }

  // 언마운트 시 인식 완전 정리(자동 재시작 방지)
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      handsFreeRef.current = false;
      armedRef.current = false;
      stopRec();
    };
  }, []);

  // 마지막 남은 할 일을 끝내면 축하 한마디
  function complete(t: Todo) {
    const openBefore = state.todos.filter((x) => !x.done).length;
    toggleTodo(t.id);
    if (!t.done && openBefore === 1) pushToast('오늘 할 일 다 했어! 대단해 🎉');
  }

  // 정렬: 미완료(우선★ 먼저) → 완료. 같은 묶음 안에선 기존 순서(최신순) 유지.
  const rank = (t: Todo) => (t.done ? 2 : t.priority ? 0 : 1);
  const todos = [...state.todos].sort((a, b) => rank(a) - rank(b));
  const openCount = state.todos.filter((t) => !t.done).length;
  const doneCount = state.todos.length - openCount;

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
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <input
              className="field w-full pr-11"
              placeholder="떠오른 일 적어두기 (예: 다음주 화요일 치과)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="할 일 입력"
              enterKeyHint="done"
            />
            <button
              type="button"
              onClick={toggleVoice}
              className={`absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg ${
                listening ? 'animate-pulse bg-eddie-accent text-white' : 'text-eddie-primary'
              }`}
              aria-label={listening ? '음성 입력 중지' : '음성으로 담기'}
              title="음성으로 담기"
            >
              🎙️
            </button>
          </div>
          <button type="submit" className="btn-primary shrink-0 px-5 text-sm" disabled={!text.trim()}>
            담기
          </button>
        </div>

        {/* 보조 옵션 (진행 표시 최소화) */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setShowTime((v) => !v)}
            aria-pressed={showTime}
            className={`rounded-full border px-3 py-1 text-xs ${
              showTime || remindAt ? 'border-eddie-primary bg-eddie-primary-soft text-eddie-primary' : 'border-eddie-line text-eddie-muted'
            }`}
          >
            🔔 알림 시각{remindAt ? ` ${remindAt}` : ''}
          </button>
          <button
            type="button"
            onClick={() => (handsFree ? stopHandsFree() : startHandsFree())}
            aria-pressed={handsFree}
            className={`rounded-full border px-3 py-1 text-xs ${
              handsFree ? 'border-eddie-accent bg-eddie-accent/10 text-eddie-accent' : 'border-eddie-line text-eddie-muted'
            }`}
          >
            🎧 {handsFree ? '듣는 중' : '‘에디야’ 핸즈프리'}
          </button>
          {handsFree && <span className="animate-pulse text-xs text-eddie-accent">{voiceStatus}</span>}
        </div>
        {showTime && (
          <input
            className="field py-2 text-sm"
            type="time"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            aria-label="알림 시각"
          />
        )}
      </form>

      {todos.length > 0 ? (
        <ul className="mt-4 flex flex-col divide-y divide-eddie-line/60 dark:divide-neutral-700">
          {todos.map((t) => (
            <li key={t.id} className="flex items-center gap-2.5 py-2">
              <button
                onClick={() => complete(t)}
                aria-pressed={t.done}
                aria-label={`${t.text} 완료 토글`}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  t.done ? 'border-eddie-primary bg-eddie-primary text-white' : 'border-eddie-line hover:border-eddie-primary'
                }`}
              >
                {t.done ? '✓' : ''}
              </button>
              <div className={`min-w-0 flex-1 ${t.done ? 'text-eddie-muted line-through' : ''}`}>
                <span className="flex items-center gap-1.5">
                  {t.priority && !t.done && <span className="text-eddie-accent">★</span>}
                  <span className="truncate">{t.text}</span>
                </span>
                {t.remindAt && !t.done && (
                  <button
                    onClick={() => setTodoReminder(t.id, undefined)}
                    className="mt-0.5 inline-flex items-center gap-0.5 rounded-full bg-eddie-primary-soft px-1.5 text-[11px] text-eddie-primary"
                    aria-label={`알림 ${t.remindAt} 끄기`}
                    title="알림 끄기"
                  >
                    🔔 {t.remindAt}
                  </button>
                )}
              </div>
              {!t.done && (
                <>
                  <button
                    onClick={() => toggleTodoPriority(t.id)}
                    className={`icon-btn ${t.priority ? 'text-eddie-accent' : ''}`}
                    aria-label={t.priority ? '우선순위 해제' : '오늘 꼭 (우선순위)'}
                    title="오늘 꼭"
                  >
                    {t.priority ? '★' : '☆'}
                  </button>
                  <button onClick={() => setFocus(t)} className="icon-btn text-eddie-primary" aria-label="집중 모드" title="집중 모드">
                    🎯
                  </button>
                </>
              )}
              <button onClick={() => removeTodo(t.id)} className="icon-btn hover:text-red-500" aria-label="할 일 삭제">
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
