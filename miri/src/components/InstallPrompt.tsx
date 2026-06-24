import { useInstallPrompt } from '../lib/install';

// 폰 홈 화면에 미리를 '앱처럼' 설치하도록 안내하는 부드러운 배너. (무압박 톤)
export function InstallPrompt() {
  const { canShow, ios, promptInstall, dismiss } = useInstallPrompt();
  if (!canShow) return null;

  return (
    <div className="fixed bottom-[5.5rem] left-1/2 z-20 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-card bg-white p-4 shadow-card ring-1 ring-point-soft">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          📲
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">미리를 앱으로 설치할까요?</p>
          {ios ? (
            <p className="mt-1 text-xs leading-relaxed text-muted">
              하단 <span className="font-semibold text-ink">공유 􀈂</span> → <span className="font-semibold text-ink">홈 화면에 추가</span>를
              누르면 앱처럼 전체화면으로 떠요.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-muted">
              홈 화면에 두면 한 번 탭으로 바로 열려요. 알림판이 늘 곁에 있게.
            </p>
          )}
          <div className="mt-2.5 flex gap-2">
            {!ios && (
              <button
                onClick={promptInstall}
                className="rounded-xl bg-point px-4 py-2 text-sm font-semibold text-white"
              >
                설치하기
              </button>
            )}
            <button onClick={dismiss} className="rounded-xl border border-soft px-3 py-2 text-sm text-muted">
              나중에
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="닫기" className="text-muted">
          ✕
        </button>
      </div>
    </div>
  );
}
