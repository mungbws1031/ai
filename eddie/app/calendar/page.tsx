'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 달력이 이제 첫 화면(/)이라 이 경로는 예전 공유 링크(…/calendar/#sched=…) 호환용 리다이렉트만 한다.
// 해시(#sched=...)는 클라이언트에만 있으므로 그대로 들고 옮긴다.
export default function CalendarRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/' + window.location.hash);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-eddie-muted">
      <span className="animate-pulse">이동 중… 🐣</span>
    </div>
  );
}
