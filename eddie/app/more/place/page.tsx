'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store-context';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';
import { eddieLine } from '@/lib/eddie';
import EddieBubble from '@/components/EddieBubble';

// FR-301 제자리 맵 + FR-302 외출/귀가 제자리 체크
export default function PlacePage() {
  const { state, addPlaceItem, updatePlaceItem, removePlaceItem } = useStore();
  const [name, setName] = useState('');
  const [loc, setLoc] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const items = state.placeItems;
  const allChecked = items.length > 0 && items.every((it) => checked[it.id]);

  return (
    <div className="px-4">
      <BackLink />
      <PageHeader title="제자리" subtitle="자주 잃는 물건의 자리를 정해두자." />

      {/* 외출/귀가 체크 (FR-302) */}
      {items.length > 0 && (
        <section className="card mb-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">제자리 체크</p>
            <button onClick={() => setChecked({})} className="btn-ghost text-sm">
              초기화
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {items.map((it) => {
              const on = !!checked[it.id];
              return (
                <li key={it.id}>
                  <button
                    onClick={() => setChecked((c) => ({ ...c, [it.id]: !c[it.id] }))}
                    aria-pressed={on}
                    className={`flex min-h-tap w-full items-center gap-3 rounded-xl border px-4 text-left ${
                      on ? 'border-eddie-primary bg-eddie-primary-soft' : 'border-eddie-line dark:border-neutral-700'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                        on ? 'border-eddie-primary bg-eddie-primary text-white' : 'border-eddie-line'
                      }`}
                    >
                      {on ? '✓' : ''}
                    </span>
                    <span className="flex-1">
                      <span className={on ? 'font-medium text-eddie-primary' : 'font-medium'}>{it.name}</span>
                      <span className="block text-xs text-eddie-muted">📍 {it.location}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3">
            {allChecked ? (
              <EddieBubble line={eddieLine('happy')} size="sm" />
            ) : (
              <EddieBubble line={{ mood: 'calm', text: '하나씩 자리에서 확인하고 체크해줘.' }} size="sm" />
            )}
          </div>
        </section>
      )}

      {/* 제자리 등록 (FR-301) */}
      <form
        className="card mb-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const n = name.trim();
          const l = loc.trim();
          if (!n || !l) return;
          addPlaceItem(n, l);
          setName('');
          setLoc('');
        }}
      >
        <p className="font-semibold">물건 자리 등록</p>
        <input className="field" placeholder="물건 (예: 열쇠)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field" placeholder="지정 위치 (예: 현관 그릇)" value={loc} onChange={(e) => setLoc(e.target.value)} />
        <button type="submit" className="btn-primary">
          등록
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {items.map((it) => (
          <Row key={it.id} id={it.id} name={it.name} location={it.location} onUpdate={updatePlaceItem} onRemove={removePlaceItem} />
        ))}
      </div>
      {items.length === 0 && <p className="mt-6 text-center text-sm text-eddie-muted">아직 등록한 물건이 없어.</p>}
    </div>
  );
}

function Row({
  id,
  name,
  location,
  onUpdate,
  onRemove,
}: {
  id: string;
  name: string;
  location: string;
  onUpdate: (id: string, patch: { name?: string; location?: string }) => void;
  onRemove: (id: string) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [n, setN] = useState(name);
  const [l, setL] = useState(location);

  if (edit) {
    return (
      <section className="card flex flex-col gap-2">
        <input className="field" value={n} onChange={(e) => setN(e.target.value)} />
        <input className="field" value={l} onChange={(e) => setL(e.target.value)} />
        <div className="flex gap-2">
          <button
            onClick={() => {
              onUpdate(id, { name: n.trim() || name, location: l.trim() || location });
              setEdit(false);
            }}
            className="btn-primary flex-1 text-sm"
          >
            저장
          </button>
          <button onClick={() => setEdit(false)} className="btn-ghost flex-1 text-sm">
            취소
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card flex items-center justify-between">
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-sm text-eddie-muted">📍 {location}</p>
      </div>
      <div className="flex gap-1">
        <button onClick={() => setEdit(true)} className="btn-ghost text-sm">
          수정
        </button>
        <button onClick={() => onRemove(id)} className="btn-ghost text-sm text-red-500">
          삭제
        </button>
      </div>
    </section>
  );
}
