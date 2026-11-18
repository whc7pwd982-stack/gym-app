import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../db';
import { useExerciseMap } from '../lib/exercises';
import { e1rm, isStalled, lastEntryFor, suggestNext, type Suggestion } from '../lib/progression';
import { emptySet, entryFor, finishedAt, sessionStats, startSession } from '../lib/session';
import { exerciseFeedback, type ExerciseFeedback } from '../lib/feedback';
import { FeedbackList } from './Feedback';
import { move } from '../lib/routines';
import type { Exercise, Session, SessionEntry, SetLog } from '../types';
import { ExerciseInfo, ExercisePicker } from './ExercisePicker';
import { Empty, StretchBadge } from './ui';

export function WorkoutTab({ goRoutines }: { goRoutines: () => void }) {
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], undefined);
  const routines = useLiveQuery(() => db.routines.orderBy('order').toArray(), [], []);
  const active = sessions?.find((s) => !s.endedAt);
  const [summary, setSummary] = useState<Session | null>(null);

  if (!sessions) return null;
  if (summary) return <Summary s={summary} all={sessions} onClose={() => setSummary(null)} />;
  if (active) return <ActiveSession key={active.id} initial={active} history={sessions} onFinish={setSummary} />;

  return (
    <div className="page">
      <header className="page-head"><h1>운동하기</h1></header>
      {routines.length === 0 ? (
        <Empty>
          <p>먼저 루틴을 만들어 보세요.</p>
          <button className="btn primary" onClick={goRoutines}>루틴 만들기</button>
        </Empty>
      ) : (
        <ul className="cards">
          {routines.map((r) => (
            <li key={r.id} className="card routine-card">
              <span className="routine-main"><strong>{r.name}</strong><span className="muted small">{r.items.length}종목 · 주 {r.timesPerWeek}회</span></span>
              <button className="btn primary small" disabled={!r.items.length} onClick={() => startSession(r)}>시작</button>
            </li>
          ))}
        </ul>
      )}
      <button className="btn ghost block" onClick={() => startSession(null)}>루틴 없이 자유 운동 시작</button>
    </div>
  );
}

function ActiveSession({ initial, history, onFinish }: { initial: Session; history: Session[]; onFinish: (s: Session) => void }) {
  const map = useExerciseMap();
  const [s, setS] = useState<Session>(initial);
  const [picking, setPicking] = useState(false);
  const [info, setInfo] = useState<Exercise | null>(null);
  const [rest, setRest] = useState<{ until: number; total: number } | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, []);

  const update = (next: Session) => { setS(next); db.sessions.put(next); };
  const patchEntry = (uid: string, fn: (e: SessionEntry) => SessionEntry) => update({ ...s, entries: s.entries.map((e) => (e.uid === uid ? fn(e) : e)) });

  const suggestions = useMemo(() => {
    const m = new Map<string, Suggestion & { stalled: boolean }>();
    for (const en of s.entries) {
      const ex = map.get(en.exerciseId);
      if (!ex || m.has(en.uid)) continue;
      const last = lastEntryFor(history, en.exerciseId, s.id);
      m.set(en.uid, { ...suggestNext(ex, en.repMin, en.repMax, last?.entry ?? null), stalled: isStalled(history, en.exerciseId) });
    }
    return m;
  }, [s.entries, map, history, s.id]);

  const restLeft = rest ? Math.max(0, Math.ceil((rest.until - Date.now()) / 1000)) : 0;
  const restDoneRef = useRef(false);
  useEffect(() => {
    if (rest && restLeft === 0 && !restDoneRef.current) {
      restDoneRef.current = true;
      try { navigator.vibrate?.([200, 100, 200]); } catch { /* iOS 미지원 */ }
    }
  }, [rest, restLeft]);

  const completeSet = (en: SessionEntry, i: number, sug?: Suggestion) => {
    const ex = map.get(en.exerciseId);
    patchEntry(en.uid, (e) => ({
      ...e,
      sets: e.sets.map((x, j) => {
        if (j !== i) return x;
        if (x.done) return { ...x, done: false };
        const filled = { ...x, done: true };
        if (ex?.metric === 'hold') filled.seconds ??= sug?.reps ?? e.repMin;
        else if (ex?.metric === 'cardio') filled.seconds ??= e.repMin * 60;
        else {
          filled.reps ??= sug?.reps ?? e.repMin;
          if (filled.weight == null && sug?.weight != null) filled.weight = sug.weight;
        }
        return filled;
      }),
    }));
    if (!en.sets[i].done && !en.sets[i].warmup) { restDoneRef.current = false; setRest({ until: Date.now() + en.restSec * 1000, total: en.restSec }); }
  };

  const finish = async () => {
    const stats = sessionStats(s);
    if (stats.sets === 0 && !confirm('완료한 세트가 없어요. 이 운동을 삭제할까요?')) return;
    if (stats.sets === 0) { await db.sessions.delete(s.id!); return; }
    if (!confirm('운동을 마칠까요?')) return;
    const done = { ...s, endedAt: finishedAt(s), prevEndedAt: undefined };
    await db.sessions.put(done);
    onFinish(done);
  };

  const st = sessionStats(s);
  return (
    <div className="page workout">
      <header className="page-head">
        <div>
          <h1>{s.routineName}</h1>
          <span className="muted small">
            {s.backfill || s.prevEndedAt ? `📅 ${new Date(s.startedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} 기록${s.prevEndedAt ? ' 수정' : ''} · ` : `${st.minutes}분 · `}
            완료 {st.sets}세트 · {st.volume.toLocaleString()}kg
          </span>
        </div>
        <button className="btn primary small" onClick={finish}>완료</button>
      </header>

      {s.entries.map((en, idx) => {
        const ex = map.get(en.exerciseId);
        if (!ex) return null;
        const sug = suggestions.get(en.uid);
        return (
          <section key={en.uid} className="card entry">
            <div className="item-head">
              <button className="item-name" onClick={() => setInfo(ex)}>{ex.name} <StretchBadge e={ex} /></button>
              <span className="order-btns">
                <button className="icon-btn" disabled={idx === 0} onClick={() => update({ ...s, entries: move(s.entries, idx, idx - 1) })} aria-label="위로">▲</button>
                <button className="icon-btn" disabled={idx === s.entries.length - 1} onClick={() => update({ ...s, entries: move(s.entries, idx, idx + 1) })} aria-label="아래로">▼</button>
                <button className="icon-btn danger" onClick={() => confirm(`${ex.name}을(를) 이번 운동에서 뺄까요?`) && update({ ...s, entries: s.entries.filter((x) => x.uid !== en.uid) })} aria-label="삭제">✕</button>
              </span>
            </div>
            {sug && (
              <p className={`sug sug-${sug.kind}`}>
                {sug.kind === 'increase' ? '⬆️ ' : sug.kind === 'start' ? '🆕 ' : '🎯 '}
                {sug.weight != null && ex.metric !== 'bodyweight' ? <strong>{sug.weight}kg × {sug.reps}{ex.metric === 'hold' ? '초' : '회'}</strong> : null} {sug.note}
                {sug.stalled && <><br />➕ 최근 3번 기록이 같아요. 오늘은 세트를 1개 더 추가해서 총 볼륨을 올려보세요.</>}
              </p>
            )}
            <SetTable ex={ex} en={en} sug={sug}
              onChange={(i, p) => patchEntry(en.uid, (e) => ({ ...e, sets: e.sets.map((x, j) => (j === i ? { ...x, ...p } : x)) }))}
              onDone={(i) => completeSet(en, i, sug)}
              onRemove={(i) => patchEntry(en.uid, (e) => ({ ...e, sets: e.sets.filter((_, j) => j !== i) }))} />
            <button className="btn ghost small" onClick={() => patchEntry(en.uid, (e) => ({ ...e, sets: [...e.sets, { ...emptySet(), weight: e.sets[e.sets.length - 1]?.weight ?? null }] }))}>＋ 세트 추가</button>
          </section>
        );
      })}
      <button className="btn ghost block" onClick={() => setPicking(true)}>＋ 종목 추가</button>
      <button className="btn ghost block danger" onClick={async () => { if (confirm('기록을 저장하지 않고 이 운동을 취소할까요?')) await db.sessions.delete(s.id!); }}>운동 취소</button>

      {rest && (
        <div className={`rest-bar ${restLeft === 0 ? 'done' : ''}`}>
          <span className="rest-time">{restLeft === 0 ? '휴식 끝! 💪' : `휴식 ${Math.floor(restLeft / 60)}:${String(restLeft % 60).padStart(2, '0')}`}</span>
          <span className="rest-progress" style={{ width: `${(1 - restLeft / rest.total) * 100}%` }} />
          <button className="btn small" onClick={() => setRest({ ...rest, until: rest.until + 30000, total: rest.total + 30 })}>+30초</button>
          <button className="btn small" onClick={() => setRest(null)}>닫기</button>
        </div>
      )}
      {picking && <ExercisePicker onClose={() => setPicking(false)} onDone={(ids) => { update({ ...s, entries: [...s.entries, ...ids.map((i) => map.get(i)).filter(Boolean).map((e) => entryFor(e!))] }); setPicking(false); }} />}
      {info && <ExerciseInfo e={info} onClose={() => setInfo(null)} />}
    </div>
  );
}

function NumInput({ value, placeholder, onChange, label, decimal = true }: { value: number | null; placeholder?: string; onChange: (v: number | null) => void; label: string; decimal?: boolean }) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => { if (value == null ? text !== '' : Number(text) !== value) setText(value == null ? '' : String(value)); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input className="num" inputMode={decimal ? 'decimal' : 'numeric'} aria-label={label} placeholder={placeholder} value={text}
      onChange={(e) => {
        const t = e.target.value.replace(',', '.');
        if (!/^\d*\.?\d*$/.test(t)) return;
        setText(t);
        onChange(t === '' || t === '.' ? null : Number(t));
      }} />
  );
}

function SetTable({ ex, en, sug, onChange, onDone, onRemove }: {
  ex: Exercise; en: SessionEntry; sug?: Suggestion;
  onChange: (i: number, p: Partial<SetLog>) => void; onDone: (i: number) => void; onRemove: (i: number) => void;
}) {
  const m = ex.metric;
  const wLabel = m === 'assisted' ? '보조kg' : m === 'bodyweight' ? '+kg' : 'kg';
  const hasWeight = m === 'weight_reps' || m === 'assisted' || m === 'bodyweight' || m === 'carry';
  const second = m === 'hold' ? '초' : m === 'cardio' ? '분' : m === 'carry' ? 'm' : '회';
  let n = 0;
  return (
    <table className="sets">
      <thead><tr><th>세트</th>{hasWeight && <th>{wLabel}</th>}<th>{second}</th>{m !== 'cardio' && m !== 'hold' && <th>RIR</th>}{m === 'cardio' && <th>km</th>}<th></th></tr></thead>
      <tbody>
        {en.sets.map((x, i) => {
          if (!x.warmup) n++;
          const best = e1rm(x.weight ?? 0, x.reps ?? 0);
          return (
            <tr key={i} className={x.done ? 'done' : ''}>
              <td>
                <button className={`set-no ${x.warmup ? 'warm' : ''}`} onClick={() => onChange(i, { warmup: !x.warmup })} title="눌러서 워밍업 표시" aria-label="워밍업 전환">{x.warmup ? 'W' : n}</button>
              </td>
              {hasWeight && <td><NumInput label="무게" value={x.weight} placeholder={sug?.weight != null ? String(sug.weight) : '-'} onChange={(v) => onChange(i, { weight: v })} /></td>}
              <td>
                {m === 'hold' || m === 'cardio' ? (
                  <NumInput label={second} decimal={false} value={x.seconds == null ? null : m === 'cardio' ? Math.round(x.seconds / 60) : x.seconds}
                    placeholder={String(m === 'cardio' ? en.repMin : sug?.reps ?? en.repMin)} onChange={(v) => onChange(i, { seconds: v == null ? null : m === 'cardio' ? v * 60 : v })} />
                ) : m === 'carry' ? (
                  <NumInput label="거리" decimal={false} value={x.distance} placeholder="20" onChange={(v) => onChange(i, { distance: v })} />
                ) : (
                  <NumInput label="반복" decimal={false} value={x.reps} placeholder={String(sug?.reps ?? en.repMin)} onChange={(v) => onChange(i, { reps: v })} />
                )}
              </td>
              {m !== 'cardio' && m !== 'hold' && (
                <td>
                  <select className="rir" aria-label="RIR (남은 반복)" value={x.rir ?? ''} onChange={(e) => onChange(i, { rir: e.target.value === '' ? null : Number(e.target.value) })}>
                    <option value="">-</option>{[0, 1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}{v === 5 ? '+' : ''}</option>)}
                  </select>
                </td>
              )}
              {m === 'cardio' && <td><NumInput label="km" value={x.distance} placeholder="-" onChange={(v) => onChange(i, { distance: v })} /></td>}
              <td className="set-actions">
                <button className={`done-btn ${x.done ? 'on' : ''}`} onClick={() => onDone(i)} aria-label="세트 완료">✓</button>
                {!x.done && en.sets.length > 1 && <button className="icon-btn tiny" onClick={() => onRemove(i)} aria-label="세트 삭제">✕</button>}
                {x.done && best && en.repMax <= 12 ? <span className="muted tiny" title="추정 1RM">{Math.round(best)}</span> : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Summary({ s, all, onClose }: { s: Session; all: Session[]; onClose: () => void }) {
  const map = useExerciseMap();
  const st = sessionStats(s);
  const prs: string[] = [];
  for (const en of s.entries) {
    const best = Math.max(0, ...en.sets.filter((x) => x.done && !x.warmup).map((x) => e1rm(x.weight ?? 0, x.reps ?? 0) ?? 0));
    if (!best) continue;
    const prev = Math.max(0, ...all.filter((o) => o.id !== s.id && o.endedAt).flatMap((o) => o.entries.filter((e) => e.exerciseId === en.exerciseId).flatMap((e) => e.sets.filter((x) => x.done && !x.warmup).map((x) => e1rm(x.weight ?? 0, x.reps ?? 0) ?? 0))));
    if (prev && best > prev) prs.push(`${map.get(en.exerciseId)?.name}: 추정 1RM ${Math.round(prev)} → ${Math.round(best)}kg`);
  }
  const withThis = [...all.filter((o) => o.id !== s.id), s];
  const fb = [...new Set(s.entries.map((e) => e.exerciseId))].map((id) => exerciseFeedback(withThis, map, id)).filter(Boolean) as ExerciseFeedback[];
  return (
    <div className="page">
      <header className="page-head"><h1>수고했어요! 🎉</h1></header>
      <div className="card stat-grid">
        <div><strong>{st.minutes ?? '-'}</strong><span>분</span></div>
        <div><strong>{st.sets}</strong><span>세트</span></div>
        <div><strong>{st.volume.toLocaleString()}</strong><span>kg 볼륨</span></div>
      </div>
      {prs.length > 0 && <div className="card"><h3>🏆 개인 기록 갱신</h3><ul className="plain">{prs.map((p) => <li key={p}>{p}</li>)}</ul></div>}
      {fb.length > 0 && <div className="card"><h3>➡️ 다음 운동에선</h3><FeedbackList items={fb} /></div>}
      <button className="btn primary block" onClick={onClose}>확인</button>
    </div>
  );
}
