import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { HistoryTab } from './components/HistoryTab';
import { HomeTab } from './components/HomeTab';
import { RoutinesTab } from './components/RoutinesTab';
import { SettingsTab } from './components/SettingsTab';
import { WorkoutTab } from './components/WorkoutTab';
import { db, requestPersistence } from './db';
import { getActive, startSession } from './lib/session';
import type { Routine } from './types';

type Tab = 'home' | 'routines' | 'workout' | 'history' | 'settings';
const TABS: [Tab, string, string][] = [
  ['home', '홈', '🏠'], ['routines', '루틴', '📋'], ['workout', '운동', '🏋️'], ['history', '기록', '📈'], ['settings', '설정', '⚙️'],
];

function savedTab(): Tab {
  try { return (sessionStorage.getItem('tab') as Tab) || 'home'; } catch { return 'home'; }
}

export default function App() {
  const [tab, setTab] = useState<Tab>(savedTab);
  const active = useLiveQuery(() => db.sessions.filter((s) => !s.endedAt).count(), [], 0);
  useEffect(() => { requestPersistence(); }, []);
  useEffect(() => { try { sessionStorage.setItem('tab', tab); } catch { /* 무시 */ } window.scrollTo(0, 0); }, [tab]);

  const onStart = async (r: Routine) => {
    const cur = await getActive();
    if (cur) {
      if (!confirm(`진행 중인 운동(${cur.routineName})이 있어요. 그 운동을 이어서 할까요?\n취소를 누르면 기존 운동을 지우고 새로 시작해요.`)) {
        await db.sessions.delete(cur.id!);
        await startSession(r);
      }
    } else await startSession(r);
    setTab('workout');
  };

  return (
    <div className="app">
      <main>
        {tab === 'home' && <HomeTab go={setTab} />}
        {tab === 'routines' && <RoutinesTab onStart={onStart} />}
        {tab === 'workout' && <WorkoutTab goRoutines={() => setTab('routines')} />}
        {tab === 'history' && <HistoryTab goWorkout={() => setTab('workout')} />}
        {tab === 'settings' && <SettingsTab />}
      </main>
      <nav className="tabbar">
        {TABS.map(([k, label, icon]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} aria-label={label} aria-current={tab === k ? 'page' : undefined}>
            <span className="tab-icon">{icon}{k === 'workout' && active ? <i className="dot" /> : null}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
