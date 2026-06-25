import { useEffect, useState } from 'react';

// beforeinstallprompt 이벤트 타입 (표준 미정의라 직접 선언)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'miri.install.dismissed';

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ 는 Mac으로 위장 → touch 지원 + Mac 으로 보정
  const iPadOS = navigator.platform === 'MacIntel' && (navigator as Navigator).maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

/**
 * 설치 가능 상태와 설치 트리거를 제공한다.
 * - Android/Chrome: beforeinstallprompt 캡처 → deferredPrompt.prompt()
 * - iOS Safari: 네이티브 프롬프트 없음 → 수동 안내 노출
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setDeferred(null);
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* noop */
    }
  };

  // 안드로이드는 deferred 있을 때, iOS는 항상(설치 전) 안내 가능
  const canShow = !installed && !dismissed && (deferred !== null || isIOS());

  return { canShow, ios: isIOS(), promptInstall, dismiss, installed };
}
