import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart3, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MUSCLE_ORDER } from '../data/muscles';
import { db, useBodyweight, useSettings } from '../db';
import { useExerciseMap } from '../lib/exercises';
import { addMonths, allExerciseFeedback, monthStart, muscleFeedback, summarize, weekStart } from '../lib/feedback';
import { workingSets } from '../lib/progression';
import { BIG_LIFTS, e1rmSeries, rmTable } from '../lib/strength';
import type { MuscleCode, Session } from '../types';
import { VolumeBars } from './AnalysisView';
import { FeedbackList, MuscleFeedbackList } from './Feedback';
import { Empty, fmtDate, fmtKg } from './ui';

const DAY = 86400000;
type View = 'week' | 'month' | 'lift';

export function AnalysisTab() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], []);
  const [view, setView] = useState<View>('week');
  return (
    <>
      <div className="large-title">분석</div>
      <p className="subtitle">기록을 바탕으로 다음에 올릴 것을 알려드려요</p>
      <div className="seg">
        <button className={view === 'week' ? 'on' : ''} onClick={() => setView('week')}>주간</button>
        <button className={view === 'month' ? 'on' : ''} onClick={() => setView('month')}>월간</button>
        <button className={view === 'lift' ? 'on' : ''} onClick={() => setView('lift')}>종목 · 1RM</button>
      </div>
      {view === 'lift' ? <LiftView sessions={sessions} /> : <PeriodView key={view} mode={view} sessions={sessions} />}
    </>
  );
}

function Delta({ now, prev, unit = '' }: { now: number; prev: number; unit?: string }) {
  if (!prev) return <div className="delta down">–</div>;
  const d = now - prev;
  if (d === 0) return <div className="delta down">변화 없음</div>;
  const pct = Math.round((d / prev) * 100);
  return <div className={`delta ${d > 0 ? 'up' : 'down'}`}>{d > 0 ? '▲' : '▼'} {Math.abs(pct)}%{unit}</div>;
}

function PeriodView({ mode, sessions }: { mode: 'week' | 'month'; sessions: Session[] }) {
  const map = useExerciseMap();
  const settings = useSettings();
  const [offset, setOffset] = useState(0);
  const isCurrent = offset === 0;

  const range = useMemo(() => {
    if (mode === 'week') {
      const from = weekStart() - offset * 7 * DAY;
      return { from, to: from + 7 * DAY, prevFrom: from - 7 * DAY, label: `${fmtDate(from, { month: 'numeric', day: 'numeric' })} – ${fmtDate(from + 6 * DAY, { month: 'numeric', day: 'numeric' })}`, weeks: 1 };
    }
    const from = addMonths(monthStart(), -offset);
    const to = addMonths(from, 1);
    const d = new Date(from);
    return { from, to, prevFrom: addMonths(from, -1), label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`, weeks: (to - from) / (7 * DAY) };
  }, [mode, offset]);

  const cur = useMemo(() => summarize(sessions, map, range.from, range.to), [sessions, map, range]);
  const prev = useMemo(() => summarize(sessions, map, range.prevFrom, isCurrent ? range.prevFrom + (Date.now() - range.from) : range.from), [sessions, map, range, isCurrent]);
  const muscles = useMemo(() => {
    const v = { ...cur.muscles };
    if (mode === 'month') for (const k of MUSCLE_ORDER as MuscleCode[]) v[k] = Math.round((v[k] / range.weeks) * 10) / 10;
    return v;
  }, [cur, mode, range.weeks]);
  const exFb = useMemo(() => (isCurrent ? allExerciseFeedback(sessions, map) : []), [isCurrent, sessions, map]);
  const muFb = useMemo(() => (isCurrent ? muscleFeedback(sessions, map, settings.level) : []), [isCurrent, sessions, map, settings.level]);

  return (
    <>
      <section className="card">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <button className="icon-btn sm" onClick={() => setOffset(offset + 1)} aria-label="이전"><ChevronLeft size={18} /></button>
          <div className="center">
            <div className="h3">{isCurrent ? (mode === 'week' ? '이번 주' : '이번 달') : range.label}</div>
            {isCurrent && <div className="tiny muted">{range.label}</div>}
          </div>
          <button className="icon-btn sm" onClick={() => setOffset(offset - 1)} disabled={offset === 0} aria-label="다음"><ChevronRight size={18} /></button>
        </div>
        <div className="stats">
          <div className="stat"><div className="stat-label">운동한 날</div><div className="stat-value">{cur.count}<small>일</small></div><Delta now={cur.count} prev={prev.count} /></div>
          <div className="stat"><div className="stat-label">총 세트</div><div className="stat-value">{cur.sets}</div><Delta now={cur.sets} prev={prev.sets} /></div>
          <div className="stat"><div className="stat-label">총 볼륨</div><div className="stat-value">{cur.volume >= 10000 ? `${(cur.volume / 1000).toFixed(1)}` : fmtKg(cur.volume)}<small>{cur.volume >= 10000 ? 't' : 'kg'}</small></div><Delta now={cur.volume} prev={prev.volume} /></div>
        </div>
        <p className="tiny muted mt center">{mode === 'week' ? '지난주' : '지난달'}{isCurrent ? ' 같은 시점까지' : ''}와 비교</p>
      </section>

      {cur.count === 0 ? <div className="card"><Empty icon={<BarChart3 size={26} />} title="이 기간에는 기록이 없어요" /></div> : (
        <>
          <div className="section-label">{mode === 'week' ? '근육별 세트' : '근육별 주 평균 세트'}</div>
          <section className="card"><VolumeBars weekly={muscles} level={settings.level} /></section>
          {cur.prs.length > 0 && (
            <>
              <div className="section-label">개인 기록 갱신</div>
              <div className="list">
                {cur.prs.map((p) => (
                  <div key={p.name} className="list-item with-icon">
                    <span className="icon-tile warning"><Trophy size={19} /></span>
                    <div className="grow"><div className="list-title">{p.name}</div><div className="list-sub">추정 1RM {p.from} → {p.to}kg</div></div>
                    <span className="badge gold">+{p.to - p.from}kg</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {isCurrent && muFb.length > 0 && (
        <>
          <div className="section-label">세트를 늘릴 부위</div>
          <section className="card" style={{ paddingTop: 6, paddingBottom: 6 }}><MuscleFeedbackList items={muFb} /></section>
        </>
      )}
      {isCurrent && exFb.length > 0 && (
        <>
          <div className="section-label">종목별 다음 목표</div>
          <section className="card" style={{ paddingTop: 6, paddingBottom: 6 }}><FeedbackList items={exFb} /></section>
        </>
      )}
    </>
  );
}

function LiftView({ sessions }: { sessions: Session[] }) {
  const map = useExerciseMap();
  const bw = useBodyweight();
  const logged = useMemo(() => {
    const count = new Map<string, number>();
    for (const s of sessions) if (s.endedAt) for (const en of s.entries) if (workingSets(en).some((x) => (x.weight ?? 0) > 0)) count.set(en.exerciseId, (count.get(en.exerciseId) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]).filter((id) => map.get(id)?.metric === 'weight_reps');
  }, [sessions, map]);
  const [exId, setExId] = useState('');
  const selected = exId || logged[0] || '';
  const ex = map.get(selected);
  const series = useMemo(() => e1rmSeries(sessions, selected), [sessions, selected]);

  if (!logged.length) return <div className="card"><Empty icon={<BarChart3 size={26} />} title="무게를 기록한 종목이 없어요" sub="무게와 반복을 기록하면 추정 1RM과 성장 그래프가 나와요" /></div>;

  const latest = series[series.length - 1];
  const best = Math.max(...series.map((p) => p.e1rm));
  const monthAgo = [...series].reverse().find((p) => p.t <= Date.now() - 28 * DAY);
  const change = latest && monthAgo ? latest.e1rm - monthAgo.e1rm : null;
  const data = series.map((p) => ({ ...p, date: fmtDate(p.t, { month: 'numeric', day: 'numeric' }) }));

  return (
    <>
      <div className="scroll-x">
        {logged.map((id) => <button key={id} className={`pill ${id === selected ? 'on' : ''}`} onClick={() => setExId(id)}>{map.get(id)?.name}</button>)}
      </div>
      {latest ? (
        <>
          <section className="card">
            <div className="stat-label">추정 1RM · 최근 기록 기준</div>
            <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
              <span className="hero-num">{fmtKg(latest.e1rm)}<small>kg</small></span>
              {change != null && <span className={`delta ${change > 0 ? 'up' : 'down'}`} style={{ fontSize: 14 }}>{change > 0 ? '▲' : change < 0 ? '▼' : ''} {fmtKg(Math.abs(change))}kg · 4주</span>}
            </div>
            <div className="small muted" style={{ marginTop: 4 }}>최고 {fmtKg(best)}kg · {latest.top}</div>
            {bw && BIG_LIFTS[selected] && <div className="badge accent mt">체중의 {(latest.e1rm / bw).toFixed(2)}배</div>}
            <div className="chart" style={{ marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
                  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} /><stop offset="100%" stopColor="var(--accent)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: 'none', borderRadius: 12, boxShadow: 'var(--shadow-lg)', color: 'var(--text)' }} formatter={(v) => [`${v}kg`, '추정 1RM']} />
                  <Area type="monotone" dataKey="e1rm" stroke="var(--accent)" strokeWidth={2.5} fill="url(#g)" dot={{ r: 3, fill: 'var(--accent)' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
          <div className="section-label">지금 들 수 있는 무게 (추정)</div>
          <section className="card">
            <div className="rm-table">
              {rmTable(latest.e1rm, ex?.increment ?? 2.5).map((r) => <div key={r.reps} className="rm-cell"><b>{fmtKg(r.kg)}</b><span>{r.reps}RM</span></div>)}
            </div>
            <p className="tiny muted mt">nRM = n회까지 겨우 들 수 있는 무게. Epley 공식으로 계산하고, 적어둔 RIR(남긴 반복 수)은 반복 수에 더해요. 데드리프트는 실제보다 낮게 나올 수 있어요 (LeSuer 1997).</p>
          </section>
          <div className="section-label">최근 기록</div>
          <div className="list">
            {[...series].reverse().slice(0, 8).map((p) => (
              <div key={p.t} className="list-item"><div className="grow"><div className="list-title">{fmtDate(p.t)}</div><div className="list-sub">{p.top}</div></div><b className="tnum">{fmtKg(p.e1rm)}kg</b></div>
            ))}
          </div>
        </>
      ) : <div className="card"><Empty title="1RM을 계산할 세트가 없어요" sub="반복 + RIR이 12 이하인 세트로 계산해요" /></div>}
    </>
  );
}
