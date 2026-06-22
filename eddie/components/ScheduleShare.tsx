'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store-context';
import { canNativeShare, copyText, scheduleShareLink, shareUrl, smsHref, SharedSchedEvent } from '@/lib/share';

/** 다가오는 내 일정을 '가져오기 링크'로 친구에게 보내기 (서버 없이). */
export default function ScheduleShare() {
  const { state, today, pushToast } = useStore();
  const [open, setOpen] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => setCanShare(canNativeShare()), []);

  const upcoming: SharedSchedEvent[] = state.schedule
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')))
    .map((e) => ({ date: e.date, time: e.time, title: e.title }));

  if (upcoming.length === 0) return null;

  const link = () => scheduleShareLink(upcoming);
  const title = `에디의 하루 — 일정 ${upcoming.length}개`;

  async function share() {
    const r = await shareUrl(link(), title);
    if (r === 'unsupported') {
      const ok = await copyText(link());
      pushToast(ok ? '링크를 복사했어 — 친구에게 붙여넣어 보내줘.' : '복사하지 못했어.');
    }
    setOpen(false);
  }
  async function copy() {
    const ok = await copyText(link());
    pushToast(ok ? '링크를 복사했어 — 친구에게 붙여넣어 보내줘.' : '복사하지 못했어.');
    setOpen(false);
  }

  return (
    <div className="mb-3">
      <button onClick={() => setOpen((o) => !o)} className="card flex w-full items-center gap-3 text-left">
        <span className="text-2xl" aria-hidden>
          🔗
        </span>
        <span className="flex-1">
          <span className="block font-semibold">친구에게 일정 공유</span>
          <span className="block text-sm text-eddie-muted">다가오는 일정 {upcoming.length}개를 링크로 보내기</span>
        </span>
        <span aria-hidden className="text-eddie-muted">
          {open ? '▾' : '›'}
        </span>
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-2">
          {canShare && (
            <button onClick={share} className="btn-soft flex-1 text-sm">
              💬 카톡 등으로 공유
            </button>
          )}
          <a
            href={smsHref(`${title}\n${link()}`)}
            onClick={() => setOpen(false)}
            className="btn-soft flex-1 text-center text-sm"
          >
            ✉️ 문자로 보내기
          </a>
          <button onClick={copy} className="btn-soft flex-1 text-sm">
            📋 링크 복사
          </button>
        </div>
      )}
      <p className="mt-2 px-1 text-xs text-eddie-muted">
        친구도 에디를 설치하고 링크를 열면 일정을 가져올 수 있어. 보낸 시점 기준이라, 바뀌면 다시 보내줘.
      </p>
    </div>
  );
}
