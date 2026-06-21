'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store-context';

/**
 * 할 일 빠른 담기(브레인 덤프).
 * ADHD에서 떠오른 일은 즉시 적지 않으면 사라진다 — 날짜·시간 고를 필요 없이 한 줄로 담는 인박스.
 */
export default function QuickTodos() {
  const { state, addTodo, toggleTodo, removeTodo, clearDoneTodos } = useStore();
  const [text, setText] = useState('');

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
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addTodo(text);
          setText('');
        }}
      >
        <input
          className="field flex-1"
          placeholder="떠오른 일 적어두기 (예: 택배 부치기)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="할 일 입력"
          enterKeyHint="done"
        />
        <button type="submit" className="btn-primary shrink-0 text-sm" disabled={!text.trim()}>
          담기
        </button>
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
    </section>
  );
}
