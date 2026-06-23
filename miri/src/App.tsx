import { useEffect, useState } from 'react';
import { promotePromptedSeeds, promoteShown, useStore } from './store';
import { TabBar, type Tab } from './components/TabBar';
import { Home } from './components/Home';
import { CalendarView } from './components/CalendarView';
import { SomedayBox } from './components/SomedayBox';
import { QuickAdd } from './components/QuickAdd';
import { Settings } from './components/Settings';

export default function App() {
  const load = useStore((s) => s.load);
  const loaded = useStore((s) => s.loaded);
  const [tab, setTab] = useState<Tab>('home');
  const [adding, setAdding] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // §8.2 / §8.4: appOpen 루프 — 도달한 리마인더/seed 승격 후 로드
  useEffect(() => {
    (async () => {
      await Promise.all([promoteShown(), promotePromptedSeeds()]);
      await load();
    })();
  }, [load]);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <main className="flex-1 px-4 pb-28 pt-5">
        {!loaded ? (
          <p className="pt-20 text-center text-sm text-muted">불러오는 중…</p>
        ) : tab === 'home' ? (
          <Home />
        ) : tab === 'calendar' ? (
          <CalendarView />
        ) : (
          <SomedayBox />
        )}
      </main>

      {/* 어디서든 + 빠른 추가 (§9) */}
      <button
        onClick={() => setAdding(true)}
        aria-label="빠른 추가"
        className="fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-point text-3xl font-light text-white shadow-card"
      >
        ＋
      </button>

      {/* 설정/백업 진입 */}
      <button
        onClick={() => setSettingsOpen(true)}
        aria-label="설정"
        className="fixed right-4 top-4 z-20 text-xl text-muted"
      >
        ⚙︎
      </button>

      <TabBar active={tab} onChange={setTab} />

      {adding && <QuickAdd onClose={() => setAdding(false)} />}
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
