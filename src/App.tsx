import { BarChart3, CalendarCheck, Dumbbell, UserRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AnalysisTab, type View } from './components/AnalysisTab';
import { LogTab } from './components/LogTab';
import { ProfileTab } from './components/ProfileTab';
import { RoutinesTab } from './components/RoutinesTab';
import { ToastHost } from './components/ui';
import { requestPersistence } from './db';
import { draftLog } from './lib/session';
import type { Routine, Session } from './types';

type Tab = 'log' | 'routines' | 'analysis' | 'profile';
const TABS: [Tab, string, typeof Dumbbell][] = [
  ['log', '기록', CalendarCheck], ['routines', '루틴', Dumbbell], ['analysis', '분석', BarChart3], ['profile', '프로필', UserRound],
];

function savedTab(): Tab {
  try { const t = sessionStorage.getItem('tab') as Tab; return TABS.some((x) => x[0] === t) ? t : 'log'; } catch { return 'log'; }
}

export default function App() {
  const [tab, setTab] = useState<Tab>(savedTab);
  const [openLog, setOpenLog] = useState<Session | null>(null);
  const [analysisView, setAnalysisView] = useState<View>('week');
  useEffect(() => { requestPersistence(); }, []);
  useEffect(() => { try { sessionStorage.setItem('tab', tab); } catch { /* 무시 */ } window.scrollTo(0, 0); }, [tab]);
  const onOpened = useCallback(() => setOpenLog(null), []);

  const logRoutineToday = (r: Routine) => {
    setOpenLog(draftLog(Date.now(), r));
    setTab('log');
  };

  return (
    <div className="app">
      <main>
        {tab === 'log' && <LogTab openDraft={openLog} onOpened={onOpened} goAnalysis={(v) => { setAnalysisView(v ?? 'week'); setTab('analysis'); }} />}
        {tab === 'routines' && <RoutinesTab onLog={logRoutineToday} />}
        {tab === 'analysis' && <AnalysisTab key={analysisView} initialView={analysisView} />}
        {tab === 'profile' && <ProfileTab />}
      </main>
      <nav className="tabbar">
        <div className="tabbar-inner">
          {TABS.map(([k, label, Icon]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} aria-label={label} aria-current={tab === k ? 'page' : undefined}>
              <Icon size={24} strokeWidth={tab === k ? 2.4 : 1.9} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
      <ToastHost />
    </div>
  );
}
