'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// 하단 탭 4개 (IA §7.2): 오늘 · 루틴 · 에디 · 더보기
const tabs = [
  { href: '/', label: '오늘', icon: '🌤️' },
  { href: '/routines', label: '루틴', icon: '✅' },
  { href: '/eddie', label: '에디', icon: '🐣' },
  { href: '/more', label: '더보기', icon: '⋯' },
];

export default function BottomTabs() {
  const path = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md justify-around border-t border-eddie-line bg-eddie-surface/95 backdrop-blur dark:border-neutral-700 dark:bg-neutral-800/95"
      aria-label="주요 탐색"
    >
      {tabs.map((t) => {
        const active = t.href === '/' ? path === '/' : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-tap flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium ${
              active ? 'text-eddie-primary' : 'text-eddie-muted'
            }`}
          >
            <span className="text-lg" aria-hidden>
              {t.icon}
            </span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
