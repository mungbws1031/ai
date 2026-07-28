// 일정 공유 — 친구에게 카톡/문자 등으로 보내기.
//
// 정적 사이트(서버·키 없음)라 카카오 SDK 직접 연동 대신 OS 공유 시트를 쓴다.
// 모바일에서 navigator.share를 호출하면 공유 시트에 카카오톡·문자·메일 등이 모두 뜬다.
// 공유 API가 없는 환경(주로 데스크톱)에서는 문자(SMS) 링크와 복사로 대체한다.

export interface ShareEvent {
  title: string;
  time?: string;
}

function dateLabel(date: string): string {
  const [, m, d] = date.split('-');
  return `${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
}

function eventLine(e: ShareEvent): string {
  return e.time ? `${e.time} ${e.title}` : e.title;
}

/** 단일 일정 공유 텍스트. */
export function formatEvent(date: string, e: ShareEvent): string {
  return `📅 ${dateLabel(date)}\n• ${eventLine(e)}`;
}

/** 하루치 전체 일정 공유 텍스트. */
export function formatDay(date: string, events: ShareEvent[]): string {
  const lines = events.map((e) => `• ${eventLine(e)}`);
  return [`📅 ${dateLabel(date)} 일정`, ...lines].join('\n');
}

/** 문자(SMS) 작성 화면을 본문 채워서 여는 링크. iOS/Android 모두에서 무난한 형태. */
export function smsHref(text: string): string {
  return `sms:?&body=${encodeURIComponent(text)}`;
}

export type ShareResult = 'shared' | 'unsupported' | 'cancelled';

/** OS 공유 시트 호출(카톡·문자 등). 미지원 시 'unsupported'. */
export async function nativeShare(text: string): Promise<ShareResult> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unsupported';
  }
  try {
    await navigator.share({ text });
    return 'shared';
  } catch {
    // 사용자가 취소했거나 권한 문제 — 조용히 처리.
    return 'cancelled';
  }
}

/** OS 공유 시트로 링크 공유(카톡·문자 등). 미지원 시 'unsupported'. */
export async function shareUrl(url: string, title: string): Promise<ShareResult> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unsupported';
  }
  try {
    await navigator.share({ title, text: title, url });
    return 'shared';
  } catch {
    return 'cancelled';
  }
}

// ── 일정 공유 링크 (서버 없이 링크에 일정을 실어 보냄) ──
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

function toB64Url(s: string): string {
  const b64 = btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b64)));
}

export interface SharedSchedEvent {
  date: string; // 'YYYY-MM-DD'
  time?: string;
  title: string;
}

export function encodeScheduleEvents(events: SharedSchedEvent[]): string {
  const compact = events.map((e) => [e.date, e.time || '', e.title]);
  return toB64Url(JSON.stringify(compact));
}

export function decodeScheduleEvents(code: string): SharedSchedEvent[] | null {
  try {
    const arr = JSON.parse(fromB64Url(code));
    if (!Array.isArray(arr)) return null;
    return arr
      .map((x: unknown) => {
        const t = x as [string, string, string];
        return { date: String(t[0]), time: t[1] ? String(t[1]) : undefined, title: String(t[2]) };
      })
      .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.title.trim());
  } catch {
    return null;
  }
}

/** 친구에게 보낼 가져오기 링크. (#sched= 해시라 서버 처리 불필요) 달력이 첫 화면(/)이라 거기로 보낸다. */
export function scheduleShareLink(events: SharedSchedEvent[]): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${BASE}/#sched=${encodeScheduleEvents(events)}`;
}

/** 클립보드 복사. 실패 시 false. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallthrough */
  }
  return false;
}

/** 공유 API 사용 가능 여부(클라이언트에서만 정확). */
export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}
