// 구글 캘린더 양방향 동기화 — 서버 없이 브라우저에서 직접 OAuth + Calendar API 호출.
//
// 노션 API와 달리 구글 Calendar API(googleapis.com)는 OAuth 토큰을 실은 브라우저
// fetch(CORS)를 허용하므로, 별도 백엔드 없이 순수 정적 앱에서도 실시간 동기화가 가능하다.
// 사용자가 본인 소유의 구글 OAuth '클라이언트 ID'를 등록해 쓰는 BYOK 방식(비밀값 아님, 공개 식별자).

const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const EVENTS_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}
interface TokenClient {
  requestAccessToken: (opts: { prompt: string }) => void;
}
interface GoogleAccountsOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (resp: TokenResponse) => void;
    error_callback?: (err: { message?: string; type?: string }) => void;
  }) => TokenClient;
}
declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleAccountsOAuth2 } };
  }
}

let gisPromise: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('브라우저에서만 동작해.'));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('구글 로그인 스크립트를 불러오지 못했어.'));
    document.head.appendChild(s);
  });
  return gisPromise;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/** 액세스 토큰 요청. interactive=false면 이미 로그인돼 있을 때 조용히 발급(가능한 경우). */
export async function requestGoogleToken(clientId: string, interactive: boolean): Promise<string> {
  if (!clientId.trim()) throw new Error('구글 클라이언트 ID를 먼저 등록해줘.');
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;
  await loadGis();
  return new Promise((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      reject(new Error('구글 로그인 모듈을 찾지 못했어.'));
      return;
    }
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || '로그인에 실패했어.'));
          return;
        }
        cachedToken = { value: resp.access_token, expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000 };
        resolve(resp.access_token);
      },
      error_callback: (err) => reject(new Error(err?.message || '로그인 창이 닫혔어.')),
    });
    client.requestAccessToken({ prompt: interactive ? 'consent' : '' });
  });
}

export function clearGoogleToken(): void {
  cachedToken = null;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function toDateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toHM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface RemoteGoogleEvent {
  googleEventId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
}

/** 최근 7일 ~ 앞으로 90일의 일정을 가져온다. */
export async function listGoogleEvents(token: string): Promise<RemoteGoogleEvent[]> {
  const now = new Date();
  const url = new URL(EVENTS_API);
  url.searchParams.set('timeMin', new Date(now.getTime() - 7 * 86400000).toISOString());
  url.searchParams.set('timeMax', new Date(now.getTime() + 90 * 86400000).toISOString());
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('maxResults', '250');
  url.searchParams.set('orderBy', 'startTime');
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error('구글 로그인이 만료됐어. 다시 연결해줘.');
  if (!res.ok) throw new Error(`구글 캘린더를 불러오지 못했어 (${res.status}).`);
  const json = await res.json();
  const items: unknown[] = json.items ?? [];
  return items
    .filter(
      (it): it is { id: string; summary: string; status?: string; start: { date?: string; dateTime?: string } } =>
        !!it &&
        typeof it === 'object' &&
        (it as { status?: string }).status !== 'cancelled' &&
        !!(it as { summary?: string }).summary &&
        !!(it as { start?: { date?: string; dateTime?: string } }).start,
    )
    .map((it) => {
      if (it.start.date) return { googleEventId: it.id, title: it.summary, date: it.start.date };
      const dt = new Date(it.start.dateTime as string);
      return { googleEventId: it.id, title: it.summary, date: toDateOnly(dt), time: toHM(dt) };
    });
}

/** 에디 일정을 구글 캘린더에 새로 만든다. 생성된 구글 이벤트 id를 반환. */
export async function insertGoogleEvent(token: string, ev: { title: string; date: string; time?: string }): Promise<string> {
  const body: Record<string, unknown> = { summary: ev.title };
  if (ev.time) {
    const [y, m, d] = ev.date.split('-').map((x) => parseInt(x, 10));
    const [hh, mm] = ev.time.split(':').map((x) => parseInt(x, 10));
    const start = new Date(y, m - 1, d, hh, mm);
    const end = new Date(start.getTime() + 60 * 60000);
    body.start = { dateTime: start.toISOString() };
    body.end = { dateTime: end.toISOString() };
  } else {
    const [y, m, d] = ev.date.split('-').map((x) => parseInt(x, 10));
    const next = new Date(y, m - 1, d + 1);
    body.start = { date: ev.date };
    body.end = { date: toDateOnly(next) };
  }
  const res = await fetch(EVENTS_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`구글 캘린더에 올리지 못했어 (${res.status}).`);
  const json = await res.json();
  return json.id as string;
}

export interface LocalPushEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
}

/** 한 번의 동기화: 구글에서 당겨오고(pull), 아직 안 올라간 에디 일정을 올린다(push). */
export async function syncGoogleCalendar(opts: {
  clientId: string;
  interactive: boolean;
  toPush: LocalPushEvent[];
}): Promise<{ remote: RemoteGoogleEvent[]; pushed: { id: string; googleEventId: string }[] }> {
  const token = await requestGoogleToken(opts.clientId, opts.interactive);
  const remote = await listGoogleEvents(token);
  const pushed: { id: string; googleEventId: string }[] = [];
  for (const ev of opts.toPush) {
    try {
      const googleEventId = await insertGoogleEvent(token, { title: ev.title, date: ev.date, time: ev.time });
      pushed.push({ id: ev.id, googleEventId });
    } catch {
      // 개별 실패는 건너뛰고 다음 동기화 때 다시 시도
    }
  }
  return { remote, pushed };
}
