import { useLiveQuery } from 'dexie-react-hooks';
import { Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CATEGORY_KO, MUSCLES } from '../data/muscles';
import { db, useSettings } from '../db';
import { incrementFor, isPairedDumbbell, realWeight, volumeFactor } from '../lib/equipment';
import { useExerciseMap } from '../lib/exercises';
import { exerciseFeedback } from '../lib/feedback';
import { workingSets } from '../lib/progression';
import { e1rmSeries } from '../lib/strength';
import type { Exercise, MuscleCode } from '../types';
import { FeedbackList } from './Feedback';
import { patternFor, PATTERNS } from './motion/patterns';
import { MuscleMap } from './motion/MuscleMap';
import { fmtDate, fmtKg, Sheet, StretchBadge } from './ui';

/** 종목 상세: 내 기록 → 자극 부위 → 자세 포인트 → 설명 */
export function ExerciseInfo({ e, onClose }: { e: Exercise; onClose: () => void }) {
  const settings = useSettings();
  const map = useExerciseMap();
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], []);

  const mine = useMemo(() => {
    const list = sessions
      .filter((s) => s.endedAt && s.entries.some((en) => en.exerciseId === e.id && workingSets(en).length))
      .sort((a, b) => b.startedAt - a.startedAt);
    let sets = 0, volume = 0;
    const f = volumeFactor(e);
    for (const s of list) for (const en of s.entries) if (en.exerciseId === e.id) for (const x of workingSets(en)) {
      sets++; volume += realWeight(e, x.weight ?? 0, settings.smithBarKg) * (x.reps ?? 0) * f;
    }
    return { list, sets, volume: Math.round(volume) };
  }, [sessions, e, settings.smithBarKg]);

  const fb = useMemo(() => exerciseFeedback(sessions, map, e.id, settings), [sessions, map, e.id, settings]);
  const series = useMemo(() => (e.metric === 'weight_reps' ? e1rmSeries(sessions, e.id) : []), [sessions, e]);
  const best = series.length ? series.reduce((a, b) => (b.e1rm > a.e1rm ? b : a)) : null;
  const latest = series[series.length - 1];

  const setText = (x: { weight: number | null; reps: number | null; seconds: number | null; distance: number | null }) =>
    e.metric === 'hold' ? `${x.seconds ?? 0}초` : e.metric === 'cardio' ? `${Math.round((x.seconds ?? 0) / 60)}분` : `${x.weight ? `${fmtKg(x.weight)}×` : ''}${x.reps ?? x.distance ?? ''}`;

  const muscles = [
    ...(Object.entries(e.primary) as [MuscleCode, number][]).map(([m, w]) => [m, w, 'p'] as const),
    ...(Object.entries(e.secondary) as [MuscleCode, number][]).map(([m, w]) => [m, w, 's'] as const),
  ];
  const cues = useMemo(() => { const p = patternFor(e); return p.exact ? (PATTERNS[p.id]?.cues ?? []) : []; }, [e]);

  return (
    <Sheet title={e.name} onClose={onClose} full>
      <p className="muted small">{e.en}{e.aliases.length ? ` · ${e.aliases.join(', ')}` : ''}</p>
      <div className="row wrap mt" style={{ gap: 6 }}><span className="chip">{CATEGORY_KO[e.category]}</span><span className="chip">{e.equipment}</span><StretchBadge e={e} /></div>

      {/* ── 내 기록 ── */}
      <div className="section-label">내 기록</div>
      {mine.list.length === 0 ? (
        <section className="card"><p className="muted small">아직 이 종목을 기록한 적이 없어요. 한 번 기록하면 다음 목표와 1RM 추이가 여기 나와요.</p></section>
      ) : (
        <>
          {fb && <section className="card" style={{ paddingTop: 6, paddingBottom: 6 }}><FeedbackList items={[fb]} /></section>}
          <div className="stats">
            <div className="stat"><div className="stat-label">한 날</div><div className="stat-value">{mine.list.length}<small>일</small></div></div>
            <div className="stat"><div className="stat-label">총 세트</div><div className="stat-value">{mine.sets}</div></div>
            <div className="stat"><div className="stat-label">총 볼륨</div><div className="stat-value">{mine.volume >= 10000 ? (mine.volume / 1000).toFixed(1) : fmtKg(mine.volume)}<small>{mine.volume >= 10000 ? 't' : 'kg'}</small></div></div>
          </div>
          {latest && (
            <section className="card mt">
              <div className="row-between">
                <div><div className="stat-label">추정 1RM</div><div className="stat-value">{fmtKg(latest.e1rm)}<small>kg</small></div></div>
                {best && <div style={{ textAlign: 'right' }}><div className="stat-label row" style={{ gap: 4, justifyContent: 'flex-end' }}><Trophy size={13} />최고 기록</div><div className="bold tnum">{fmtKg(best.e1rm)}kg</div><div className="tiny muted">{fmtDate(best.t, { month: 'numeric', day: 'numeric' })} · {best.top}</div></div>}
              </div>
              {series.length > 1 && (
                <div className="chart" style={{ marginTop: 8 }}>
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={series.map((p) => ({ ...p, date: fmtDate(p.t, { month: 'numeric', day: 'numeric' }) }))} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                      <defs><linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} /><stop offset="100%" stopColor="var(--accent)" stopOpacity={0} /></linearGradient></defs>
                      <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={['dataMin - 3', 'dataMax + 3']} tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: 'none', borderRadius: 12, boxShadow: 'var(--shadow-lg)', color: 'var(--text)' }} formatter={(v) => [`${v}kg`, '추정 1RM']} />
                      <Area type="monotone" dataKey="e1rm" stroke="var(--accent)" strokeWidth={2} fill="url(#gd)" dot={{ r: 2.5, fill: 'var(--accent)' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          )}
          <div className="list mt">
            {mine.list.slice(0, 6).map((s) => {
              const sets = s.entries.filter((en) => en.exerciseId === e.id).flatMap((en) => workingSets(en));
              return (
                <div key={s.id} className="list-item" style={{ alignItems: 'flex-start' }}>
                  <div style={{ width: 54 }} className="small bold">{fmtDate(s.startedAt, { month: 'numeric', day: 'numeric' })}</div>
                  <div className="grow small text-2" style={{ lineHeight: 1.6 }}>{sets.map(setText).join(' · ')}</div>
                </div>
              );
            })}
          </div>
          {isPairedDumbbell(e) && <p className="tiny muted mt">무게는 한 손(덤벨 1개) 기준, 볼륨은 양손으로 계산해요.</p>}
        </>
      )}

      {/* ── 자극 부위 ── */}
      <div className="section-label">자극 부위</div>
      <section className="card">
        <MuscleMap e={e} />
        <div className="mm-list">
          {muscles.map(([m, w, r]) => (
            <div key={m} className="mm-item">
              <i className={'mm-dot ' + r} />
              <span className="grow">{MUSCLES[m].full ?? MUSCLES[m].ko}</span>
              <span className="tiny muted">{r === 'p' ? '주로 씀' : '보조'}</span>
              <b className="tnum">{w}세트</b>
            </div>
          ))}
        </div>
        <p className="tiny muted mt">이 종목 1세트를 하면 각 근육에 쌓이는 세트예요. 주로 쓰는 근육 1세트, 보조 근육 0.5세트 (Pelland 2026).</p>
      </section>

      {/* ── 자세 포인트 ── */}
      {cues.length > 0 && (
        <>
          <div className="section-label">자세 포인트</div>
          <section className="card">
            <ol className="cue-list">{cues.map((c, i) => <li key={c}><span className="cue-n">{i + 1}</span>{c}</li>)}</ol>
          </section>
        </>
      )}

      {/* ── 설명 ── */}
      {(e.stretch || e.metric === 'weight_reps') && <div className="section-label">종목 정보</div>}
      {e.stretch && <section className="card"><div className="h3">스트레칭 자극이란?</div><p className="small text-2 mt">근육이 길게 늘어난 자세에서 힘을 받는 운동이에요. 오버헤드 익스텐션(삼두), 시티드 레그컬(햄스트링)처럼 늘어난 자세에서 하는 운동이 근육을 더 키웠다는 연구들이 있어요{e.stretch === 'S★' ? '. 이 종목은 직접 연구로 확인됐어요' : ''}.</p></section>}
      {e.metric === 'weight_reps' && <section className="card"><div className="kv"><span>한 번에 올리는 무게 (내 헬스장 기준)</span><b>{incrementFor(e, settings)}kg</b></div></section>}
      {e.evidence && <p className="tiny muted">근거 · {e.evidence}</p>}
    </Sheet>
  );
}
