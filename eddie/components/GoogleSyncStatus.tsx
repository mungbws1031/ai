'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store-context';

function fmtTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 달력 화면에서 구글 연동 상태를 한눈에 + 연동 화면으로 이동. */
export default function GoogleSyncStatus() {
  const { state } = useStore();
  const { connected, lastSyncAt } = state.googleSync;

  return (
    <Link href="/more/google-sync" className="card mb-3 flex items-center gap-3">
      <span className="text-2xl" aria-hidden>
        📆
      </span>
      <span className="flex-1">
        <span className="block font-semibold">
          {connected ? '구글 캘린더와 연결됨' : '구글 캘린더 자동 연동'}
        </span>
        <span className="block text-sm text-eddie-muted">
          {connected
            ? lastSyncAt
              ? `마지막 동기화 ${fmtTime(lastSyncAt)} · 양방향 자동`
              : '곧 동기화될 거야'
            : '일정이 양쪽에 자동으로 오가게 연결해봐'}
        </span>
      </span>
      <span aria-hidden className="text-eddie-muted">
        ›
      </span>
    </Link>
  );
}
