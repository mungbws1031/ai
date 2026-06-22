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
