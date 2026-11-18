import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { LEVEL_TARGET } from '../data/muscles';
import { db, DEFAULT_SETTINGS } from '../db';
import { useExerciseMap } from '../lib/exercises';
import { allExerciseFeedback, inRange, muscleFeedback, muscleSets, weekStart } from '../lib/feedback';
import { sessionStats, startSession } from '../lib/session';
import type { Settings } from '../types';
import { VolumeBars } from './AnalysisView';
import { FeedbackList, MuscleFeedbackList } from './Feedback';
import { Empty } from './ui';

const DAY = 86400000;

export function HomeTab({ go }: { go: (tab: 'routines' | 'workout' | 'history') => void }) {
  const map = useExerciseMap();
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray(), [], []);
  const routines = useLiveQuery(() => db.routines.orderBy('order').toArray(), [], []);
  const settingsRow = useLiveQuery(() => db.kv.get('settings'), []);
  const settings: Settings = { ...DEFAULT_SETTINGS, ...((settingsRow?.value as Settings) ?? {}) };
  const active = sessions.find((s) => !s.endedAt);
  const ws = weekStart();
  const thisWeek = inRange(sessions, ws, ws + 7 * DAY);
  const weekly = useMemo(() => muscleSets(thisWeek, map), [thisWeek, map]);
  const muFb = useMemo(() => muscleFeedback(sessions, map, settings.level).slice(0, 3), [sessions, map, settings.level]);
  const exFb = useMemo(() => allExerciseFeedback(sessions, map).filter((f) => f.kind !== 'reps').slice(0, 3), [sessions, map]);
  const planned = routines.reduce((n, r) => n + r.timesPerWeek, 0);
  const finished = sessions.filter((s) => s.endedAt);

  return (
    <div className="page">
      <header className="page-head"><h1>오늘도 득근 💪</h1></header>
      {active && (
        <button className="card cta" onClick={() => go('workout')}>
          <strong>진행 중인 운동: {active.routineName}</strong>
          <span className="muted small">{sessionStats(active).sets}세트 완료 · 이어서 하기 ›</span>
        </button>
      )}
      <section className="card">
        <h3>이번 주</h3>
        <p className="big">{thisWeek.length}<span className="muted"> / {planned || '-'}회 운동</span></p>
        {thisWeek.length ? <VolumeBars weekly={weekly} single={false} target={LEVEL_TARGET[settings.level]} />
          : <p className="muted small">이번 주 기록이 없어요. 운동을 완료하면 근육별 세트가 여기 쌓여요.</p>}
      </section>

      {finished.length > 0 && (muFb.length > 0 || exFb.length > 0) && (
        <section className="card">
          <h3>🎯 다음에 올릴 것</h3>
          {exFb.length > 0 && <FeedbackList items={exFb} />}
          {muFb.length > 0 && <div style={{ marginTop: exFb.length ? 8 : 0 }}><MuscleFeedbackList items={muFb} /></div>}
          <button className="btn ghost small" onClick={() => go('history')}>전체 피드백 · 결산 보기 ›</button>
        </section>
      )}

      {!active && (
        <section className="card">
          <h3>바로 시작</h3>
          {routines.length ? (
            <div className="btn-wrap">
              {routines.map((r) => <button key={r.id} className="btn" disabled={!r.items.length} onClick={async () => { await startSession(r); go('workout'); }}>{r.name}</button>)}
            </div>
          ) : (
            <Empty><p>루틴을 먼저 만들어 보세요.</p><button className="btn primary" onClick={() => go('routines')}>루틴 만들기</button></Empty>
          )}
        </section>
      )}
      {finished.length > 0 && (
        <section className="card">
          <h3>최근 운동</h3>
          <ul className="plain">
            {finished.slice(0, 3).map((s) => (
              <li key={s.id}>{new Date(s.startedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })} · {s.routineName} · {sessionStats(s).sets}세트</li>
            ))}
          </ul>
          <button className="btn ghost small" onClick={() => go('history')}>전체 기록 ›</button>
        </section>
      )}
    </div>
  );
}
