'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useStore } from '@/lib/store-context';
import BottomTabs from './BottomTabs';
import Toasts from './Toasts';

// 온보딩 게이팅 + 공통 프레임. 하나씩 원칙(§1.4)에 따라
// 온보딩 미완료 시 온보딩으로 유도한다.
export default function AppFrame({ children }: { children: React.ReactNode }) {
  const { hydrated, state } = useStore();
  const path = usePathname();
  const router = useRouter();
  const onOnboarding = path.startsWith('/onboarding');

  useEffect(() => {
    if (!hydrated) return;
    if (!state.onboarded && !onOnboarding) {
      router.replace('/onboarding');
    }
  }, [hydrated, state.onboarded, onOnboarding, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-eddie-muted">
        <span className="animate-pulse">에디가 준비 중… 🐣</span>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md pb-24">
      <Toasts />
      {children}
      {!onOnboarding && <BottomTabs />}
    </div>
  );
}
