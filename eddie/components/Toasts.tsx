'use client';

import { useStore } from '@/lib/store-context';

// 인앱 알림 대체 표시 (브라우저 알림 권한이 없을 때 fallback)
export default function Toasts() {
  const { toasts, dismissToast } = useStore();
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-30 mx-auto flex max-w-md flex-col gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className="pointer-events-auto rounded-xl2 border border-eddie-line bg-eddie-surface px-4 py-3 text-left text-sm shadow-md dark:border-neutral-700 dark:bg-neutral-800"
        >
          🐣 {t.message}
        </button>
      ))}
    </div>
  );
}
