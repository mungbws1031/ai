'use client';

import { useEffect, useState } from 'react';

// beforeinstallprompt 이벤트 타입(표준 미정이라 최소 정의).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * 홈 화면에 추가(PWA 설치) 카드.
 * - 설치 가능 신호(beforeinstallprompt)가 오면 '홈 화면에 추가' 버튼을 보여준다.
 * - 이미 설치(standalone)면 아무것도 보여주지 않는다.
 * - iOS Safari는 beforeinstallprompt가 없어, 공유→홈 화면에 추가 안내를 보여준다.
 */
export default function InstallCard() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }
    const ua = window.navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  // 설치 신호도 없고 iOS도 아니면(이미 가능성 낮음) 노출하지 않아 잡음을 줄인다.
  if (!deferred && !isIOS) return null;

  return (
    <section className="card mb-3 flex items-center gap-4 border-eddie-primary/30 bg-eddie-primary-soft">
      <span className="text-2xl" aria-hidden>
        📲
      </span>
      <div className="flex-1">
        <p className="font-semibold">홈 화면에 추가</p>
        <p className="text-sm text-eddie-muted">
          {isIOS
            ? '공유 버튼 → "홈 화면에 추가"를 누르면 앱처럼 열려서 더 자주 보게 돼.'
            : '앱처럼 한 번에 열려서, 할 일을 잊지 않게 도와줘.'}
        </p>
      </div>
      {deferred && (
        <button onClick={install} className="btn-primary shrink-0 text-sm">
          추가
        </button>
      )}
    </section>
  );
}
