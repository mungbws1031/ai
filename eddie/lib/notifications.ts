// 알림 (FR-102/201/203, NFR-A-003, NFR-R-003)
//
// 웹 한계 고지: 브라우저 Notification API + 인앱 스케줄링은 "탭이 열려 있을 때"
// 안정적으로 동작한다. PRD의 OS 백그라운드 알림 신뢰성(NFR-R-001/002)은
// 네이티브(React Native/Flutter) 또는 Service Worker + Push로 확장해야 한다.
// 본 MVP는 로직(역산·재알림·총량 상한·톤)을 검증하는 데 초점을 둔다.

import { NotificationTone } from './types';

const FIRED_KEY = 'eddie.firedNotifications.v1';

// 서비스 워커 등록 핸들(있으면 트레이에 남는 알림 + 클릭 시 앱 포커스).
let swReg: ServiceWorkerRegistration | null = null;
export function setSwRegistration(reg: ServiceWorkerRegistration | null) {
  swReg = reg;
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function supported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function permission(): NotificationPermission {
  if (!supported()) return 'denied';
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!supported()) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

// 하루 단위 발송 기록(중복 방지 + 총량 상한 집계)
interface FiredRecord {
  date: string;
  keys: string[];
}

function readFired(): FiredRecord {
  if (typeof window === 'undefined') return { date: '', keys: [] };
  try {
    const raw = window.localStorage.getItem(FIRED_KEY);
    if (raw) return JSON.parse(raw) as FiredRecord;
  } catch {
    /* noop */
  }
  return { date: '', keys: [] };
}

function writeFired(rec: FiredRecord) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FIRED_KEY, JSON.stringify(rec));
}

export function firedCountToday(date: string): number {
  const rec = readFired();
  return rec.date === date ? rec.keys.length : 0;
}

export function alreadyFired(date: string, key: string): boolean {
  const rec = readFired();
  return rec.date === date && rec.keys.includes(key);
}

export interface NotifyOptions {
  title: string;
  body: string;
  tone: NotificationTone;
  // 하루 1회만 발송되도록 보장하는 키 (예: 'med:<id>:<time>:remind')
  key: string;
  date: string;
  // 1일 알림 총량 상한
  cap: number;
  // 인앱 대체 표시(토스트) 콜백 — 권한이 없을 때 사용
  fallback?: (msg: string) => void;
}

/**
 * 알림 발송. 총량 상한·중복을 지키며, 권한이 없으면 fallback(인앱)으로 안내.
 * 반환: 실제로 발송/표시했으면 true.
 */
export function fire(opts: NotifyOptions): boolean {
  const { title, body, key, date, cap, fallback } = opts;

  if (alreadyFired(date, key)) return false;

  const rec = readFired();
  const base: FiredRecord = rec.date === date ? rec : { date, keys: [] };
  if (base.keys.length >= cap) {
    // 총량 상한 초과 — 발송하지 않는다(누락보다 과부하가 더 해롭다, NFR-A-003).
    return false;
  }

  let shown = false;
  if (permission() === 'granted') {
    const icon = `${BASE}/icon-192.png`;
    try {
      // 서비스 워커가 있으면 트레이에 남고 클릭 시 앱으로 돌아오는 알림을 띄운다.
      if (swReg && typeof swReg.showNotification === 'function') {
        swReg.showNotification(title, { body, tag: key, icon, badge: icon });
      } else {
        new Notification(title, { body, tag: key, icon });
      }
      shown = true;
    } catch {
      shown = false;
    }
  }
  if (!shown && fallback) {
    fallback(`${title} — ${body}`);
    shown = true;
  }

  if (shown) {
    base.keys.push(key);
    writeFired(base);
  }
  return shown;
}

/** 톤에 따른 카피 변형 (FR-603은 Should지만 톤 데이터는 MVP에서 사용) */
export function tonePhrase(tone: NotificationTone, soft: string, firm: string): string {
  return tone === 'firm' ? firm : soft;
}
