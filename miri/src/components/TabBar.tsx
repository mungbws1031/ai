export type Tab = 'home' | 'calendar' | 'someday';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: '홈', icon: '🏠' },
  { id: 'calendar', label: '캘린더', icon: '🗓️' },
  { id: 'someday', label: '보관함', icon: '🫧' },
];

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 mx-auto flex max-w-md justify-around border-t border-soft bg-cream/95 px-2 pt-2 safe-bottom backdrop-blur"
      aria-label="주요 화면"
    >
      {TABS.map((t) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-current={on ? 'page' : undefined}
            className={`flex min-w-[64px] flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              on ? 'text-point' : 'text-muted'
            }`}
          >
            <span className="text-lg" aria-hidden>
              {t.icon}
            </span>
            <span className={on ? 'font-semibold' : ''}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
