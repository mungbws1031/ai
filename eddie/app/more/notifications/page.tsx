'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store-context';
import * as notif from '@/lib/notifications';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';

// FR-602 알림 권한 안내 + FR-603 톤 + NFR-A-003 총량 상한.
export default function NotificationsPage() {
  const { state, updateSettings } = useStore();
  const [perm, setPerm] = useState<NotificationPermission>('default');

  useEffect(() => {
    setPerm(notif.permission());
  }, []);

  async function ask() {
    const p = await notif.requestPermission();
    setPerm(p);
    updateSettings({ notificationsAsked: true });
  }

  return (
    <div className="px-4">
      <BackLink />
      <PageHeader title="알림 설정" subtitle="알림은 적게, 확실하게." />

      {/* 권한 안내 (FR-602) */}
      <section className="card mb-4">
        <p className="font-semibold">알림 권한</p>
        {!notif.supported() ? (
          <p className="mt-2 text-sm text-eddie-muted">
            이 브라우저는 알림을 지원하지 않아. 앱이 열려 있을 때 화면 안내(토스트)로 대신 알려줄게.
          </p>
        ) : perm === 'granted' ? (
          <p className="mt-2 text-sm text-eddie-calm">✅ 알림이 켜져 있어. 약·출발 시각에 맞춰 알려줄게.</p>
        ) : perm === 'denied' ? (
          <div className="mt-2 text-sm text-eddie-muted">
            <p>알림이 꺼져 있어. 핵심 알림(복약·출발)이 안 올 수 있어.</p>
            <p className="mt-1">브라우저 주소창의 사이트 설정에서 알림을 허용하면 다시 받을 수 있어.</p>
            <p className="mt-1 text-xs">그동안은 앱이 열려 있을 때 화면 안내로 대신 알려줄게.</p>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-eddie-muted">복약·출발 알림을 받으려면 권한이 필요해.</p>
            <button onClick={ask} className="btn-primary mt-3">
              알림 허용하기
            </button>
          </div>
        )}
      </section>

      {/* 톤 (FR-603) */}
      <section className="card mb-4">
        <p className="font-semibold">알림 톤</p>
        <div className="mt-3 flex gap-2">
          {(['soft', 'firm'] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateSettings({ tone: t })}
              aria-pressed={state.settings.tone === t}
              className={`min-h-tap flex-1 rounded-xl border text-sm font-medium ${
                state.settings.tone === t
                  ? 'border-eddie-primary bg-eddie-primary-soft text-eddie-primary'
                  : 'border-eddie-line text-eddie-muted'
              }`}
            >
              {t === 'soft' ? '부드럽게' : '단호하게'}
            </button>
          ))}
        </div>
      </section>

      {/* 총량 상한 (NFR-A-003) */}
      <section className="card">
        <div className="flex items-center justify-between">
          <p className="font-semibold">하루 알림 상한</p>
          <span className="text-lg font-bold text-eddie-primary tabular-nums">{state.settings.maxNotificationsPerDay}개</span>
        </div>
        <input
          type="range"
          min={1}
          max={12}
          value={state.settings.maxNotificationsPerDay}
          onChange={(e) => updateSettings({ maxNotificationsPerDay: parseInt(e.target.value, 10) })}
          className="mt-3 w-full accent-eddie-primary"
        />
        <p className="mt-1 text-xs text-eddie-muted">상한을 넘으면 알림을 보내지 않아 과부하를 막아.</p>
      </section>
    </div>
  );
}
