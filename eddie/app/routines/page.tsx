'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { Routine } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import RoutineCheckList from '@/components/RoutineCheckList';

// FR-501 루틴 빌더 + FR-502 체크인. 한 화면 한 가지 원칙에 맞춰 편집/체크인 분리.
export default function RoutinesPage() {
  const { state } = useStore();
  const [editing, setEditing] = useState(false);

  return (
    <div className="px-4">
      <PageHeader title="루틴" subtitle="하나씩, 너의 페이스대로." />

      <div className="mb-4 flex justify-end px-1">
        <button onClick={() => setEditing((e) => !e)} className="btn-ghost text-sm">
          {editing ? '완료' : '편집'}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {state.routines.map((r) => (
          <RoutineBlock key={r.id} routine={r} editing={editing} />
        ))}
      </div>

      {editing && (
        <div className="mt-4 flex gap-2">
          <AddRoutineButton kind="morning" />
          <AddRoutineButton kind="evening" />
        </div>
      )}

      {state.routines.length === 0 && !editing && (
        <p className="mt-8 text-center text-sm text-eddie-muted">
          아직 루틴이 없어. <button onClick={() => setEditing(true)} className="text-eddie-primary underline">편집</button>에서 하나 만들어 볼까?
        </p>
      )}
    </div>
  );
}

function AddRoutineButton({ kind }: { kind: Routine['kind'] }) {
  const { addRoutine } = useStore();
  const label = kind === 'morning' ? '아침 루틴 추가' : '저녁 루틴 추가';
  return (
    <button
      onClick={() => addRoutine(kind, kind === 'morning' ? '아침 루틴' : '저녁 루틴')}
      className="btn-soft flex-1 text-sm"
    >
      + {label}
    </button>
  );
}

function RoutineBlock({ routine, editing }: { routine: Routine; editing: boolean }) {
  const { addRoutineItem, removeRoutineItem, reorderRoutineItem, renameRoutine, removeRoutine } = useStore();
  const [newItem, setNewItem] = useState('');

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        {editing ? (
          <input
            className="field"
            value={routine.title}
            onChange={(e) => renameRoutine(routine.id, e.target.value)}
            aria-label="루틴 이름"
          />
        ) : (
          <p className="font-semibold">{routine.title}</p>
        )}
        {editing && (
          <button onClick={() => removeRoutine(routine.id)} className="btn-ghost text-sm text-red-500">
            삭제
          </button>
        )}
      </div>

      {editing ? (
        <>
          <ul className="flex flex-col gap-2">
            {routine.items.map((it, idx) => (
              <li key={it.id} className="flex items-center gap-2 rounded-xl border border-eddie-line p-2 dark:border-neutral-700">
                <span className="flex-1 px-2">{it.label}</span>
                <button
                  onClick={() => reorderRoutineItem(routine.id, it.id, -1)}
                  disabled={idx === 0}
                  className="btn-ghost px-2 disabled:opacity-30"
                  aria-label="위로"
                >
                  ↑
                </button>
                <button
                  onClick={() => reorderRoutineItem(routine.id, it.id, 1)}
                  disabled={idx === routine.items.length - 1}
                  className="btn-ghost px-2 disabled:opacity-30"
                  aria-label="아래로"
                >
                  ↓
                </button>
                <button
                  onClick={() => removeRoutineItem(routine.id, it.id)}
                  className="btn-ghost px-2 text-red-500"
                  aria-label="항목 삭제"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = newItem.trim();
              if (!v) return;
              addRoutineItem(routine.id, v);
              setNewItem('');
            }}
          >
            <input
              className="field"
              placeholder="새 항목 (예: 물 한 잔)"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
            />
            <button type="submit" className="btn-primary text-sm">
              추가
            </button>
          </form>
        </>
      ) : routine.items.length === 0 ? (
        <p className="text-sm text-eddie-muted">편집에서 항목을 추가해 줘.</p>
      ) : (
        <RoutineCheckList routine={routine} />
      )}
    </section>
  );
}
