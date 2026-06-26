import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { needsBackup, backupNow, snoozeBackup, getLastBackupAt } from '../lib/backup';

// 데이터 유실 방지 배너: 백업이 오래됐고 데이터가 있으면 부드럽게 권한다. (무압박 톤)
export function BackupNudge() {
  const tasks = useStore((s) => s.tasks);
  const seeds = useStore((s) => s.seeds);
  const [hidden, setHidden] = useState(false);
  const [done, setDone] = useState(false);

  const hasData = tasks.length > 0 || seeds.length > 0;
  // tasks/seeds가 바뀔 때만 재평가 (localStorage 값 포함)
  const show = useMemo(
    () => !hidden && !done && needsBackup(hasData),
    [hidden, done, hasData, tasks.length, seeds.length],
  );
  if (!show) return null;

  const last = getLastBackupAt();
  const sub = last
    ? `마지막 백업: ${last.slice(0, 10)}`
    : '아직 백업한 적이 없어요';

  return (
    <div className="fixed bottom-[5.5rem] left-1/2 z-20 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-card bg-white p-4 shadow-card ring-1 ring-point-soft">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          💾
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">데이터를 안전하게 백업해둘까요?</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            미리는 이 기기 안에만 저장돼요. 가끔 백업해두면 폰을 바꾸거나 캐시를 지워도 안전해요. ({sub})
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              onClick={async () => {
                await backupNow();
                setDone(true);
              }}
              className="rounded-xl bg-point px-4 py-2 text-sm font-semibold text-white"
            >
              백업하기
            </button>
            <button
              onClick={() => {
                snoozeBackup(3);
                setHidden(true);
              }}
              className="rounded-xl border border-soft px-3 py-2 text-sm text-muted"
            >
              나중에
            </button>
          </div>
        </div>
        <button onClick={() => setHidden(true)} aria-label="닫기" className="text-muted">
          ✕
        </button>
      </div>
    </div>
  );
}
