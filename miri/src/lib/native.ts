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

  const now = Date.now();
  const toSchedule = reminders
    .filter((r) => r.status === 'pending' && new Date(r.fireAt).getTime() > now)
    .slice(0, 60) // OS 예약 한도 보호
    .map((r) => ({
      id: hashId(r.id),
      title: '미리',
      body: toneByStage(r.stage, r.title),
      schedule: { at: new Date(r.fireAt), allowWhileIdle: true },
      smallIcon: 'ic_stat_icon_config_sample',
    }));

  if (toSchedule.length) {
    await LocalNotifications.schedule({ notifications: toSchedule });
  }
}
