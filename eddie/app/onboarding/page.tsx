'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import { DifficultyKey, Medication, Routine } from '@/lib/types';
import * as notif from '@/lib/notifications';
import EddieBubble from '@/components/EddieBubble';
import EddieFace from '@/components/EddieFace';

const DIFFICULTIES: { key: DifficultyKey; label: string; emoji: string }[] = [
  { key: 'late', label: '지각', emoji: '⏰' },
  { key: 'lost', label: '물건 분실', emoji: '🔑' },
  { key: 'med', label: '약 깜빡', emoji: '💊' },
  { key: 'sleep', label: '늦게 잠', emoji: '🌙' },
];

// 어려움별 추천 첫 루틴 항목 (FR-501: 1~2개로 시작 강제)
const SUGGESTED: Record<DifficultyKey, string[]> = {
  late: ['물 한 잔 마시기', '옷 입기'],
  lost: ['지갑·열쇠 챙기기', '가방 확인'],
  med: ['약 챙기기'],
  sleep: ['세수하기', '내일 옷 꺼내두기'],
};

const MAX_DIFFICULTIES = 2; // 한 번에 1~2개만 (FR-601)

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding, setDeparture, updateSettings } = useStore();

  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<DifficultyKey[]>([]);

  // 약 빠른 설정
  const [medName, setMedName] = useState('');
  const [medTime, setMedTime] = useState('09:00');
  // 출발(지각) 빠른 설정
  const [arrival, setArrival] = useState('09:00');
  // 첫 루틴 항목
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  const needMed = picked.includes('med');
  const needLate = picked.includes('late');

  // 추천 항목 (선택한 어려움 기반)
  const suggestions = useMemo(() => {
    const set = new Set<string>();
    picked.forEach((k) => SUGGESTED[k].forEach((s) => set.add(s)));
    if (set.size === 0) ['물 한 잔 마시기', '옷 입기'].forEach((s) => set.add(s));
    return Array.from(set);
  }, [picked]);

  // 동적 스텝 구성
  const steps = useMemo(() => {
    const s: string[] = ['intro', 'difficulty'];
    if (needMed) s.push('med');
    if (needLate) s.push('late');
    s.push('routine', 'permission', 'done');
    return s;
  }, [needMed, needLate]);

  const current = steps[Math.min(step, steps.length - 1)];

  function next() {
    setStep((x) => Math.min(x + 1, steps.length - 1));
  }
  function back() {
    setStep((x) => Math.max(x - 1, 0));
  }

  function togglePick(k: DifficultyKey) {
    setPicked((p) => {
      if (p.includes(k)) return p.filter((x) => x !== k);
      if (p.length >= MAX_DIFFICULTIES) return p; // 1~2개 제한
      return [...p, k];
    });
  }

  function toggleItem(label: string) {
    setItems((it) => (it.includes(label) ? it.filter((x) => x !== label) : [...it, label]));
  }

  async function askPermission() {
    await notif.requestPermission();
    updateSettings({ notificationsAsked: true });
    next();
  }

  function finish() {
    const routines: Routine[] = [];
    if (items.length > 0) {
      routines.push({
        id: `rt_${Math.random().toString(36).slice(2, 9)}`,
        kind: 'morning',
        title: '아침 루틴',
        items: items.map((label, i) => ({ id: `it_${i}_${Math.random().toString(36).slice(2, 7)}`, label })),
      });
    }
    const medications: Medication[] = [];
    if (needMed && medName.trim()) {
      medications.push({
        id: `md_${Math.random().toString(36).slice(2, 9)}`,
        name: medName.trim(),
        times: [medTime],
        weekdays: [],
        remind: true,
      });
    }
    if (needLate) {
      setDeparture({ enabled: true, arrival });
    }
    completeOnboarding(picked, { routines, medications });
    router.replace('/');
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-8 pt-10">
      {/* 진행 점 */}
      <div className="mb-6 flex gap-1.5">
        {steps.slice(0, -1).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-eddie-primary' : 'bg-eddie-line'}`}
          />
        ))}
      </div>

      <div className="flex-1">
        {current === 'intro' && (
          <div className="flex flex-col gap-6">
            <EddieFace mood="cheer" size="lg" />
            <h1 className="text-3xl font-bold leading-snug">
              안녕, 나는 에디야.
              <br />
              너의 하루를 같이 보낼게.
            </h1>
            <EddieBubble line={{ mood: 'calm', text: '완벽하지 않아도 괜찮아. 같이 한 걸음씩 가자.' }} />
          </div>
        )}

        {current === 'difficulty' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">요즘 뭐가 제일 힘들어?</h2>
            <p className="text-sm text-eddie-muted">하나만 골라도 돼. 최대 {MAX_DIFFICULTIES}개까지.</p>
            <div className="grid grid-cols-2 gap-3">
              {DIFFICULTIES.map((d) => {
                const on = picked.includes(d.key);
                return (
                  <button
                    key={d.key}
                    onClick={() => togglePick(d.key)}
                    aria-pressed={on}
                    className={`card flex min-h-[96px] flex-col items-center justify-center gap-2 ${
                      on ? 'border-eddie-primary bg-eddie-primary-soft' : ''
                    }`}
                  >
                    <span className="text-3xl">{d.emoji}</span>
                    <span className={on ? 'font-semibold text-eddie-primary' : 'font-medium'}>{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {current === 'med' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">어떤 약을 챙길까?</h2>
            <input className="field" placeholder="약 이름 (예: 아침약)" value={medName} onChange={(e) => setMedName(e.target.value)} />
            <div>
              <p className="mb-1 text-sm text-eddie-muted">알림 시각</p>
              <input className="field" type="time" value={medTime} onChange={(e) => setMedTime(e.target.value)} />
            </div>
            <p className="text-xs text-eddie-muted">⚠️ 본 앱은 의료기기가 아니며 처방을 대체하지 않습니다.</p>
          </div>
        )}

        {current === 'late' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">보통 몇 시까지 가야 해?</h2>
            <p className="text-sm text-eddie-muted">도착 시각만 알려주면 언제 나갈지 계산해 줄게.</p>
            <input className="field" type="time" value={arrival} onChange={(e) => setArrival(e.target.value)} />
          </div>
        )}

        {current === 'routine' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">아침에 챙길 것 1~2개만 골라줘</h2>
            <p className="text-sm text-eddie-muted">작게 시작하는 게 핵심이야. 나중에 더 추가할 수 있어.</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => {
                const on = items.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleItem(s)}
                    aria-pressed={on}
                    className={`chip ${on ? 'border-eddie-primary bg-eddie-primary-soft text-eddie-primary' : 'border-eddie-line text-eddie-muted'}`}
                  >
                    {on ? '✓ ' : '+ '}
                    {s}
                  </button>
                );
              })}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const v = draft.trim();
                if (v && !items.includes(v)) toggleItem(v);
                setDraft('');
              }}
            >
              <input className="field" placeholder="직접 추가" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <button type="submit" className="btn-soft text-sm">
                추가
              </button>
            </form>
            {items.length > 0 && <p className="text-xs text-eddie-primary">{items.length}개 선택됨 — 좋아!</p>}
          </div>
        )}

        {current === 'permission' && (
          <div className="flex flex-col gap-4">
            <div className="text-6xl">🔔</div>
            <h2 className="text-2xl font-bold">제때 알려줘도 될까?</h2>
            <p className="text-sm text-eddie-muted">
              복약·출발 같은 핵심 순간에만 조용히 알릴게. 권한을 거부해도 앱은 쓸 수 있지만, 핵심 알림이 안 올 수 있어.
            </p>
            <button onClick={askPermission} className="btn-primary">
              알림 허용하기
            </button>
            <button onClick={next} className="btn-ghost text-sm">
              나중에 할게
            </button>
          </div>
        )}

        {current === 'done' && (
          <div className="flex flex-col gap-6">
            <div className="text-7xl">🎉</div>
            <h2 className="text-2xl font-bold">준비 끝! 같이 시작하자.</h2>
            <EddieBubble line={{ mood: 'happy', text: '딱 필요한 것만 골랐어. 오늘 하나만 해내도 충분해.' }} />
          </div>
        )}
      </div>

      {/* 하단 액션 — 화면당 주요 액션 1개 (하나씩) */}
      <div className="mt-6 flex items-center gap-2">
        {step > 0 && current !== 'done' && (
          <button onClick={back} className="btn-ghost text-sm">
            이전
          </button>
        )}
        <div className="flex-1" />
        {current === 'intro' && (
          <button onClick={next} className="btn-primary">
            시작하기
          </button>
        )}
        {current === 'difficulty' && (
          <button onClick={next} disabled={picked.length === 0} className="btn-primary disabled:opacity-40">
            다음
          </button>
        )}
        {current === 'med' && (
          <button onClick={next} className="btn-primary">
            다음
          </button>
        )}
        {current === 'late' && (
          <button onClick={next} className="btn-primary">
            다음
          </button>
        )}
        {current === 'routine' && (
          <button onClick={next} disabled={items.length === 0} className="btn-primary disabled:opacity-40">
            다음
          </button>
        )}
        {current === 'done' && (
          <button onClick={finish} className="btn-primary w-full">
            에디와 시작하기
          </button>
        )}
      </div>
    </div>
  );
}
