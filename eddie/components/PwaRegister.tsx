'use client';

import { useEffect } from 'react';
import { setSwRegistration } from '@/lib/notifications';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** 서비스 워커 등록(오프라인 + 알림). 화면에는 아무것도 그리지 않는다. */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const url = `${BASE}/sw.js`;
    navigator.serviceWorker
      .register(url, { scope: `${BASE}/` })
      .then((reg) => setSwRegistration(reg))
      .catch(() => {
        /* 등록 실패해도 앱은 정상 동작 */
      });
  }, []);

  return null;
}
