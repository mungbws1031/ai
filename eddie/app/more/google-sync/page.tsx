'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { syncGoogleCalendar, clearGoogleToken } from '@/lib/google-calendar';
import { dateKey } from '@/lib/clock';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';

function fmtTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function GoogleSyncPage() {
  const { state, setGoogleSync, upsertGoogleEvents, updateEvent, pushToast } = useStore();
  const { clientId, connected, lastSyncAt } = state.googleSync;
  const [idInput, setIdInput] = useState(clientId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attemptSync(id: string, interactive: boolean) {
    const today = dateKey(new Date());
    const toPush = state.schedule
      .filter((e) => !e.googleEventId && e.date >= today)
      .map((e) => ({ id: e.id, title: e.title, date: e.date, time: e.time }));
    const { remote, pushed } = await syncGoogleCalendar({ clientId: id, interactive, toPush });
    upsertGoogleEvents(remote);
    pushed.forEach((p) => updateEvent(p.id, { googleEventId: p.googleEventId }));
    setGoogleSync({ connected: true, lastSyncAt: new Date().toISOString() });
    pushToast(`구글 캘린더와 동기화했어 · ${remote.length}개 확인, ${pushed.length}개 올림 📆`);
  }

  async function runSync(interactive: boolean) {
    const id = idInput.trim();
    if (!id) {
      setError('클라이언트 ID를 먼저 붙여넣어줘.');
      return;
    }
    setBusy(true);
    setError(null);
    setGoogleSync({ clientId: id });
    try {
      await attemptSync(id, interactive);
    } catch (firstErr) {
      // 조용한 재연결이 실패했으면(세션 만료 등) 로그인 창을 한 번 더 띄워 자연스럽게 복구한다.
      if (!interactive) {
        try {
          await attemptSync(id, true);
          setBusy(false);
          return;
        } catch (secondErr) {
          setGoogleSync({ connected: false });
          setError(secondErr instanceof Error ? secondErr.message : '동기화에 실패했어.');
          setBusy(false);
          return;
        }
      }
      setGoogleSync({ connected: false });
      setError(firstErr instanceof Error ? firstErr.message : '동기화에 실패했어.');
    }
    setBusy(false);
  }

  function disconnect() {
    clearGoogleToken();
    setGoogleSync({ connected: false });
    pushToast('구글 캘린더 연결을 껐어.');
  }

  return (
    <div className="px-4">
      <BackLink />
      <PageHeader title="구글 캘린더 연동" subtitle="일정이 양쪽에 자동으로 오가." />

      <section className="card flex flex-col gap-3">
        {connected ? (
          <>
            <p className="font-semibold text-eddie-primary">🔗 연결됨</p>
            <p className="text-sm text-eddie-muted">
              {lastSyncAt ? `마지막 동기화 ${fmtTime(lastSyncAt)}` : '곧 동기화될 거야'} · 5분마다 자동으로 확인해.
            </p>
            <div className="flex gap-2">
              <button onClick={() => runSync(false)} disabled={busy} className="btn-soft flex-1 text-sm disabled:opacity-40">
                {busy ? '동기화 중…' : '지금 동기화'}
              </button>
              <button onClick={disconnect} className="btn-ghost flex-1 text-sm text-red-500">
                연결 해제
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="font-semibold">구글 캘린더와 연결하기</p>
            <p className="text-sm text-eddie-muted">
              연결하면 에디의 일정이 구글에 자동으로 올라가고, 구글에 새로 생긴 일정도 자동으로 당겨와. (앱이 열려 있는 동안)
            </p>
            <input
              className="field text-sm"
              placeholder="구글 OAuth 클라이언트 ID"
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              aria-label="구글 OAuth 클라이언트 ID"
            />
            <button onClick={() => runSync(true)} disabled={busy || !idInput.trim()} className="btn-primary disabled:opacity-40">
              {busy ? '연결하는 중…' : '구글 계정으로 연결'}
            </button>
            {error && <p className="text-sm text-eddie-accent">{error}</p>}
          </>
        )}
      </section>

      <section className="card mt-4">
        <p className="font-semibold">클라이언트 ID는 어디서 만들어?</p>
        <ol className="mt-2 flex flex-col gap-1.5 text-sm text-eddie-muted">
          <li>
            1. <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-eddie-primary underline">구글 클라우드 콘솔</a>에서 새 프로젝트를 만들어.
          </li>
          <li>2. 'OAuth 동의 화면'을 만들고(테스트 사용자에 본인 이메일 추가), 'Google Calendar API'를 사용 설정해.</li>
          <li>3. '사용자 인증 정보 만들기 → OAuth 클라이언트 ID → 웹 애플리케이션'을 선택해.</li>
          <li>4. '승인된 자바스크립트 원본'에 이 앱 주소를 추가해.</li>
          <li>5. 만들어진 '클라이언트 ID'를 위에 붙여넣으면 끝. (비밀번호가 아니라 공개 식별자라 안전해)</li>
        </ol>
        <p className="mt-3 text-xs text-eddie-muted">
          일정은 이 브라우저에서 구글 서버로 직접 오가고, 에디 서버는 없어서 아무 데도 거치지 않아.
        </p>
      </section>

      <section className="card mt-4">
        <p className="font-semibold">노션 캘린더는?</p>
        <p className="mt-2 text-sm text-eddie-muted">
          노션은 보안 정책상 앱(서버 없이)에서 직접 실시간으로 당겨올 수 없어. 대신 노션 캘린더 앱에서 구글 캘린더로
          동기화해두면, 위 구글 연동을 통해 자동으로 들어와. 아니면 달력 화면의 '공지·노션에서 일정 가져오기'로 텍스트를
          붙여넣어도 돼.
        </p>
      </section>
    </div>
  );
}
