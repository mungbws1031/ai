'use client';

import { useStore } from '@/lib/store-context';
import { isGoodDay } from '@/lib/streak';
import { eddieLine } from '@/lib/eddie';
import PageHeader from '@/components/PageHeader';
import EddieBubble from '@/components/EddieBubble';
import EddieFace from '@/components/EddieFace';

// 에디 화면 (IA §7.2): 캐릭터, 보상(너그러운 스트릭), 하루 회고 진입
export default function EddiePage() {
  const { state, streak, today } = useStore();
  const goodToday = isGoodDay(state, today);

  return (
    <div className="px-4">
      <PageHeader title="에디" subtitle="실패해도 리셋되지 않아. 같이 이어가자." />

      <section className="card mb-4 flex flex-col items-center gap-3 text-center">
        <EddieFace mood={goodToday ? 'happy' : 'recover'} size="lg" />
        <EddieBubble line={goodToday ? eddieLine('happy') : eddieLine('recover')} />
      </section>

      {/* FR-504 너그러운 스트릭 — 압박형 연속일수 강조 금지 */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-sm text-eddie-muted">잘 보낸 하루</p>
          <p className="mt-1 text-4xl font-bold text-eddie-primary tabular-nums">{streak.total}</p>
          <p className="mt-1 text-xs text-eddie-muted">누적 (절대 사라지지 않아)</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-eddie-muted">요즘 흐름</p>
          <p className="mt-1 text-4xl font-bold text-eddie-calm tabular-nums">{streak.momentum}</p>
          <p className="mt-1 text-xs text-eddie-muted">하루 쉬어도 이어져</p>
        </div>
      </div>

      <section className="card">
        <p className="font-semibold">오늘</p>
        <p className="mt-1 text-sm text-eddie-muted">
          {goodToday
            ? '핵심 한 가지를 해냈어. 오늘은 이미 잘 보낸 하루야. 🎉'
            : '아직 시작 전이어도 괜찮아. 약 하나, 체크 하나면 오늘도 잘 보낸 하루가 돼.'}
        </p>
      </section>

      <p className="mt-6 px-2 text-center text-xs text-eddie-muted">
        에디는 너를 혼내지 않아. 늘 다시 시작할 수 있어.
      </p>
    </div>
  );
}
