import { Capacitor } from '@capacitor/core';
import type { Reminder } from '../types';
import { toneByStage } from './tone';

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

// uuid 문자열 → 안정적인 양의 32bit 정수 (LocalNotifications는 정수 id 요구)
function hashId(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 2_000_000_000 || 1;
}

/**
 * FR-A07: 네이티브에서 pending 리마인더를 OS 로컬 알림으로 예약한다.
 * 앱이 닫혀 있어도 fireAt에 알림이 뜬다. 완료/스누즈 변화를 반영하려고
 * 매번 전체 재동기화(취소 후 재예약)한다. 웹에서는 아무 동작도 하지 않는다.
 */
export async function syncNativeNotifications(reminders: Reminder[]): Promise<void> {
  if (!isNative()) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');

  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') return;

  // 기존 예약 모두 취소
  const pendingList = await LocalNotifications.getPending();
  if (pendingList.notifications.length) {
    await LocalNotifications.cancel({ notifications: pendingList.notifications.map((n) => ({ id: n.id })) });
  }

  const toSchedule = selectNotifications(reminders, Date.now()).map(({ r, at }) => ({
    id: hashId(r.id),
    title: '미리',
    body: toneByStage(r.stage, r.title),
    // smallIcon 미지정 → Capacitor가 앱 기본 아이콘 사용 (없는 drawable 참조 방지)
    schedule: { at: new Date(at), allowWhileIdle: true },
  }));

  if (toSchedule.length) {
    await LocalNotifications.schedule({ notifications: toSchedule });
  }
}

// pending은 fireAt에, snoozed("오늘은 패스")는 snoozedUntil에 알림이 떠야 한다.
function fireTimeOf(r: Reminder): number | null {
  if (r.status === 'pending') return new Date(r.fireAt).getTime();
  if (r.status === 'snoozed' && r.snoozedUntil) return new Date(r.snoozedUntil).getTime();
  return null;
}

/**
 * 미래에 떠야 할 리마인더를 빠른 순으로 정렬한 뒤 OS 예약 한도(cap)만큼 자른다.
 * 정렬을 캡보다 먼저 해야 가까운 알림이 먼 알림에 밀려 누락되지 않는다.
 */
export function selectNotifications(
  reminders: Reminder[],
  now: number,
  cap = 60,
): { r: Reminder; at: number }[] {
  return reminders
    .map((r) => ({ r, at: fireTimeOf(r) }))
    .filter((x): x is { r: Reminder; at: number } => x.at !== null && x.at > now)
    .sort((a, b) => a.at - b.at)
    .slice(0, cap);
}
