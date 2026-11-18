import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LEVEL_TARGET } from '../data/muscles';
import { db, DEFAULT_SETTINGS } from '../db';
import { useExerciseMap } from '../lib/exercises';
import { addMonths, allExerciseFeedback, dayKey, monthStart, muscleFeedback, summarize, weekStart } from '../lib/feedback';
import { e1rm, workingSets } from '../lib/progression';
import { getActive, reopenSession, sessionStats, startSession } from '../lib/session';
import type { MuscleCode, Session, Settings } from '../types';
import { VolumeBars } from './AnalysisView';
import { FeedbackList, MuscleFeedbackList } from './Feedback';
import { Empty, Sheet } from './ui';

const DAY = 86400000;
const fmt = (t: number) => new Date(t).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
const fmtLong = (t: number) => new Date(t).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

type View = 'calendar' | 'summary' | 'progress';

export function HistoryTab({ goWorkout }: { goWorkout: () => void }) {
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray(), [], []);
  const [view, setView] = useState<View>('calendar');
  return (
    <div className="page">
      <header className="page-head"><h1>기록</h1></header>
      <div className="seg">
        <button className={view === 'calendar' ? 'on' : ''} onClick={() => setView('calendar')}>📅 날짜별</button>
        <button className={view === 'summary' ? 'on' : ''} onClick={() => setView('summary')}>📊 결산</button>
        <button className={view === 'progress' ? 'on' : ''} onClick={() => setView('progress')}>📈 성장</button>
      </div>
      {view === 'calendar' && <CalendarView sessions={sessions} goWorkout={goWorkout} />}
      {view === 'summary' && <SummaryView sessions={sessions} />}
      {view === 'progress' && <ProgressView sessions={sessions.filter((s) => s.endedAt)} />}
    </div>
  );
}

/* ───────────── 날짜별(달력) ───────────── */

function CalendarView({ sessions, goWorkout }: { sessions: Session[]; goWorkout: () => void }) {
  const [month, setMonth] = useState(monthStart());
  const [sel, setSel] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });
  const [open, setOpen] = useState<Session | null>(null);
  const [adding, setAdding] = useState(false);
  const routines = useLiveQuery(() => db.routines.orderBy('order').toArray(), [], []);
  const done = sessions.filter((s) => s.endedAt);
  const days = useMemo(() => new Set(done.map((s) => dayKey(s.startedAt))), [done]);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const first = new Date(month);
  const startOffset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - startOffset + i).getTime());
  const lastRowNeeded = cells.findIndex((t, i) => i % 7 === 0 && new Date(t).getMonth() !== first.getMonth() && i > 27);
  const shown = lastRowNeeded > 0 ? cells.slice(0, lastRowNeeded) : cells;
  const daySessions = done.filter((s) => dayKey(s.startedAt) === dayKey(sel));

  const startOn = async (routineId: number | null) => {
    if (await getActive()) { alert('진행 중인 운동이 있어요. 먼저 그 운동을 완료하거나 취소해 주세요.'); return; }
    await startSession(routineId == null ? null : routines.find((r) => r.id === routineId) ?? null, sel);
    setAdding(false);
    goWorkout();
  };

  return (
    <>
      <section className="card">
        <div className="period-nav">
          <button className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="이전 달">‹</button>
          <strong>{first.getFullYear()}년 {first.getMonth() + 1}월 <span className="muted small">· {[...days].filter((k) => k.startsWith(`${first.getFullYear()}-${first.getMonth() + 1}-`)).length}일 운동</span></strong>
          <button className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} disabled={addMonths(month, 1) > Date.now()} aria-label="다음 달">›</button>
        </div>
        <div className="cal">
          {['월', '화', '수', '목', '금', '토', '일'].map((d) => <span key={d} className="cal-dow">{d}</span>)}
          {shown.map((t) => {
            const d = new Date(t);
            const cls = ['cal-day', d.getMonth() !== first.getMonth() && 'other', t === today.getTime() && 'today', t === sel && 'sel', days.has(dayKey(t)) && 'has'].filter(Boolean).join(' ');
            return <button key={t} className={cls} disabled={t > today.getTime()} onClick={() => setSel(t)} aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일`}>{d.getDate()}</button>;
          })}
        </div>
      </section>

      <section className="card">
        <h3>{fmtLong(sel)}</h3>
        {daySessions.length === 0 ? <p className="muted small">이 날은 기록이 없어요.</p> : (
          <ul className="cards">
            {daySessions.map((s) => {
              const st = sessionStats(s);
              return (
                <li key={s.id}>
                  <button className="routine-main day-item" onClick={() => setOpen(s)}>
                    <strong>{s.routineName}</strong>
                    <span className="muted small">{st.minutes != null ? `${st.minutes}분 · ` : ''}{st.sets}세트 · {st.volume.toLocaleString()}kg · {s.entries.filter((e) => workingSets(e).length).length}종목</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <button className="btn primary block" onClick={() => setAdding(true)}>＋ 이 날짜에 운동 기록하기</button>
      </section>

      {adding && (
        <Sheet title={`${fmtLong(sel)} 기록`} onClose={() => setAdding(false)}>
          <p className="muted small">루틴을 고르면 종목이 미리 채워져요. 하지 않은 종목은 빼면 돼요.</p>
          <div className="btn-wrap">
            {routines.map((r) => <button key={r.id} className="btn" onClick={() => startOn(r.id!)}>{r.name}</button>)}
            <button className="btn ghost" onClick={() => startOn(null)}>루틴 없이</button>
          </div>
        </Sheet>
      )}
      {open && <SessionDetail s={open} onClose={() => setOpen(null)} onEdit={async () => {
        if (await getActive()) { alert('진행 중인 운동이 있어요. 먼저 완료하거나 취소해 주세요.'); return; }
        await reopenSession(open); setOpen(null); goWorkout();
      }} />}
    </>
  );
}

function SessionDetail({ s, onClose, onEdit }: { s: Session; onClose: () => void; onEdit: () => void }) {
  const map = useExerciseMap();
  return (
    <Sheet title={`${fmtLong(s.startedAt)} ${s.routineName}`} onClose={onClose}
      footer={<div className="btn-row">
        <button className="btn primary" onClick={onEdit}>수정</button>
        <button className="btn ghost danger" onClick={async () => { if (confirm('이 기록을 삭제할까요? 되돌릴 수 없어요.')) { await db.sessions.delete(s.id!); onClose(); } }}>삭제</button>
      </div>}>
      {s.entries.map((en) => {
        const ws = en.sets.filter((x) => x.done);
        if (!ws.length) return null;
        let n = 0;
        return (
          <div key={en.uid} className="card">
            <strong>{map.get(en.exerciseId)?.name}</strong>
            <ul className="plain small">
              {ws.map((x, i) => { if (!x.warmup) n++; return <li key={i}>{x.warmup ? 'W' : n}. {x.weight != null ? `${x.weight}kg × ` : ''}{x.reps != null ? `${x.reps}회` : x.seconds != null ? `${x.seconds}초` : ''}{x.rir != null ? ` · RIR ${x.rir}` : ''}{x.distance != null ? ` · ${x.distance}` : ''}</li>; })}
            </ul>
          </div>
        );
      })}
    </Sheet>
  );
}

/* ───────────── 주간·월간 결산 ───────────── */

function Delta({ now, prev, unit = '' }: { now: number; prev: number; unit?: string }) {
  if (!prev) return null;
  const d = now - prev;
  if (d === 0) return <span className="delta down">지난번과 같음</span>;
  const pct = Math.round((d / prev) * 100);
  return <span className={`delta ${d > 0 ? 'up' : 'down'}`}>{d > 0 ? '▲' : '▼'} {Math.abs(d).toLocaleString()}{unit} ({d > 0 ? '+' : ''}{pct}%)</span>;
}

function SummaryView({ sessions }: { sessions: Session[] }) {
  const map = useExerciseMap();
  const settingsRow = useLiveQuery(() => db.kv.get('settings'), []);
  const settings: Settings = { ...DEFAULT_SETTINGS, ...((settingsRow?.value as Settings) ?? {}) };
  const target = LEVEL_TARGET[settings.level];
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [offset, setOffset] = useState(0);

  const range = useMemo(() => {
    if (mode === 'week') {
      const from = weekStart() - offset * 7 * DAY;
      return { from, to: from + 7 * DAY, prevFrom: from - 7 * DAY, label: `${fmt(from)} – ${fmt(from + 6 * DAY)}`, weeks: 1 };
    }
    const from = addMonths(monthStart(), -offset);
    const to = addMonths(from, 1);
    const d = new Date(from);
    return { from, to, prevFrom: addMonths(from, -1), label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`, weeks: (to - from) / (7 * DAY) };
  }, [mode, offset]);

  const isCurrent = offset === 0;
  const cur = useMemo(() => summarize(sessions, map, range.from, range.to), [sessions, map, range]);
  // 진행 중인 기간은 지난 기간의 "같은 시점까지"와 비교해야 공정하다
  const prev = useMemo(() => summarize(sessions, map, range.prevFrom, isCurrent ? range.prevFrom + (Date.now() - range.from) : range.from), [sessions, map, range, isCurrent]);
  const muscleAvg = useMemo(() => {
    const v = { ...cur.muscles };
    if (mode === 'month') for (const k of Object.keys(v) as MuscleCode[]) v[k] = v[k] / range.weeks;
    return v;
  }, [cur, mode, range.weeks]);
  const exFb = useMemo(() => (isCurrent ? allExerciseFeedback(sessions, map) : []), [isCurrent, sessions, map]);
  const muFb = useMemo(() => (isCurrent ? muscleFeedback(sessions, map, settings.level) : []), [isCurrent, sessions, map, settings.level]);

  return (
    <>
      <div className="seg">
        <button className={mode === 'week' ? 'on' : ''} onClick={() => { setMode('week'); setOffset(0); }}>주간</button>
        <button className={mode === 'month' ? 'on' : ''} onClick={() => { setMode('month'); setOffset(0); }}>월간</button>
      </div>
      <section className="card">
        <div className="period-nav">
          <button className="icon-btn" onClick={() => setOffset(offset + 1)} aria-label="이전">‹</button>
          <strong>{isCurrent ? (mode === 'week' ? '이번 주' : '이번 달') : range.label}{isCurrent && <span className="muted small"> · {range.label}</span>}</strong>
          <button className="icon-btn" onClick={() => setOffset(offset - 1)} disabled={offset === 0} aria-label="다음">›</button>
        </div>
        <div className="stat-grid sum-grid">
          <div><strong>{cur.count}</strong><span>운동 횟수</span><Delta now={cur.count} prev={prev.count} unit="회" /></div>
          <div><strong>{cur.sets}</strong><span>총 세트</span><Delta now={cur.sets} prev={prev.sets} /></div>
          <div><strong>{cur.volume.toLocaleString()}</strong><span>총 볼륨 kg</span><Delta now={cur.volume} prev={prev.volume} /></div>
        </div>
        {cur.minutes > 0 && <p className="muted small center">운동 시간 {Math.floor(cur.minutes / 60)}시간 {cur.minutes % 60}분 · 비교: {mode === 'week' ? '지난주' : '지난달'}{isCurrent ? ' 같은 시점까지' : ''}</p>}
      </section>

      {cur.count === 0 ? <Empty><p className="muted">이 기간에는 기록이 없어요.</p></Empty> : (
        <>
          <section className="card">
            <h3>{mode === 'week' ? '근육별 세트' : '근육별 주 평균 세트'}</h3>
            <VolumeBars weekly={muscleAvg} single={false} target={target} />
          </section>
          {cur.prs.length > 0 && (
            <section className="card">
              <h3>🏆 개인 기록 갱신 {cur.prs.length}종목</h3>
              <ul className="plain small">{cur.prs.map((p) => <li key={p.name}>{p.name}: 추정 1RM {p.from} → <strong>{p.to}kg</strong> (+{p.to - p.from})</li>)}</ul>
            </section>
          )}
        </>
      )}

      {isCurrent && (muFb.length > 0 || exFb.length > 0) && (
        <>
          <section className="card">
            <h3>➕ 세트 늘리기 — {mode === 'week' ? '이번 주' : '이번 주 기준'}</h3>
            <MuscleFeedbackList items={muFb} />
          </section>
          {exFb.length > 0 && (
            <section className="card">
              <h3>⬆️ 종목별 다음 목표</h3>
              <FeedbackList items={exFb} />
            </section>
          )}
        </>
      )}
    </>
  );
}

/* ───────────── 종목별 성장 그래프 ───────────── */

function ProgressView({ sessions }: { sessions: Session[] }) {
  const map = useExerciseMap();
  const logged = useMemo(() => {
    const count = new Map<string, number>();
    for (const s of sessions) for (const en of s.entries) if (workingSets(en).length) count.set(en.exerciseId, (count.get(en.exerciseId) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  }, [sessions]);
  const [exId, setExId] = useState('');
  const selected = exId || logged[0] || '';

  const series = useMemo(() => {
    const pts: { t: number; date: string; e1rm: number; top: string }[] = [];
    for (const s of [...sessions].reverse()) {
      const en = s.entries.find((e) => e.exerciseId === selected);
      if (!en) continue;
      let best = 0, top = '';
      for (const x of workingSets(en)) {
        const v = e1rm(x.weight ?? 0, x.reps ?? 0) ?? 0;
        if (v > best) { best = v; top = `${x.weight}kg×${x.reps}`; }
      }
      if (best) pts.push({ t: s.startedAt, date: fmt(s.startedAt), e1rm: Math.round(best * 10) / 10, top });
    }
    return pts;
  }, [sessions, selected]);

  if (!logged.length) return <Empty><p>아직 완료한 운동이 없어요.</p></Empty>;
  return (
    <section className="card">
      <select className="full" value={selected} onChange={(e) => setExId(e.target.value)} aria-label="종목 선택">
        {logged.map((id) => <option key={id} value={id}>{map.get(id)?.name ?? id}</option>)}
      </select>
      {series.length >= 1 ? (
        <>
          <div className="chart">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={series} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--text)' }} formatter={(v) => [`${v}kg`, '추정 1RM']} />
                <Line type="monotone" dataKey="e1rm" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="muted small">추정 1RM = Epley 공식, 10회 이하 세트만 사용. 데드리프트는 실제보다 9–14% 낮게 나올 수 있어요(LeSuer 1997).</p>
          <ul className="plain small">{[...series].reverse().slice(0, 8).map((p) => <li key={p.t}>{p.date} · 최고 {p.top} · 1RM≈{p.e1rm}kg</li>)}</ul>
        </>
      ) : <p className="muted">10회 이하로 무게를 기록한 세트가 있어야 그래프가 그려져요.</p>}
    </section>
  );
}
