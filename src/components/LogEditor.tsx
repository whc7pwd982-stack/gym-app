import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, ChevronUp, Copy, Plus, Target, Trash2, TrendingUp, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { db, useSettings } from '../db';
import { useExerciseMap } from '../lib/exercises';
import { isStalled, lastEntryFor, suggestNext, workingSets, type Suggestion } from '../lib/progression';
import { move, writeBackToRoutine } from '../lib/routines';
import { emptySet, entryFor, isFilled, sessionStats } from '../lib/session';
import { bestBefore, e1rmOf } from '../lib/strength';
import type { Exercise, Session, SessionEntry, SetLog } from '../types';
import { ExerciseInfo, ExercisePicker } from './ExercisePicker';
import { Empty, fmtDate, fmtKg, NumCell, Sheet, StretchBadge, toast } from './ui';

export function LogEditor({ id, onClose }: { id: number; onClose: () => void }) {
  const stored = useLiveQuery(() => db.sessions.get(id), [id]);
  const all = useLiveQuery(() => db.sessions.toArray(), [], []);
  const [s, setS] = useState<Session | null>(null);
  useEffect(() => { if (stored && !s) setS(stored); }, [stored, s]);
  const map = useExerciseMap();
  const settings = useSettings();
  const [picking, setPicking] = useState(false);
  const [info, setInfo] = useState<Exercise | null>(null);

  if (!s) return null;
  const update = (next: Session) => { setS(next); db.sessions.put(next); };
  const patchEntry = (uid: string, fn: (e: SessionEntry) => SessionEntry) => update({ ...s, entries: s.entries.map((e) => (e.uid === uid ? fn(e) : e)) });
  const st = sessionStats(s);

  const remove = async () => {
    if (!confirm('이 날의 기록을 삭제할까요? 되돌릴 수 없어요.')) return;
    await db.sessions.delete(id);
    onClose();
  };
  const close = async () => {
    if (st.sets === 0 && s.entries.every((e) => e.sets.every((x) => !isFilled(x)))) {
      if (confirm('입력한 세트가 없어요. 이 기록을 지울까요?')) { await db.sessions.delete(id); onClose(); return; }
    }
    // 루틴으로 만든 기록이면, 방금 값으로 루틴을 갱신(다음에 불러올 때 최신 값)
    if (s.routineId != null && st.sets > 0) { await writeBackToRoutine(s); toast(`‘${s.routineName}’ 루틴도 이 값으로 업데이트했어요`); }
    onClose();
  };

  return (
    <Sheet full onClose={close}
      title={<span className="stack-sm" style={{ gap: 0 }}><span>{s.routineName}</span><span className="small muted" style={{ fontWeight: 600 }}>{fmtDate(s.startedAt)}</span></span>}
      right={<button className="icon-btn danger" onClick={remove} aria-label="기록 삭제"><Trash2 size={20} /></button>}
      footer={<div className="row"><div className="grow small text-2"><b className="tnum">{st.sets}</b>세트 · <b className="tnum">{fmtKg(st.volume)}</b>kg</div><button className="btn primary" style={{ minWidth: 120 }} onClick={close}>저장</button></div>}>
      {s.entries.length === 0 && <Empty title="종목을 추가해 보세요" sub="루틴에 없는 종목도 자유롭게 넣을 수 있어요" />}
      {s.entries.map((en, idx) => {
        const ex = map.get(en.exerciseId);
        if (!ex) return null;
        return (
          <EntryCard key={en.uid} ex={ex} en={en} session={s} all={all} goal={settings.goal}
            first={idx === 0} last={idx === s.entries.length - 1}
            onInfo={() => setInfo(ex)}
            onMove={(d) => update({ ...s, entries: move(s.entries, idx, idx + d) })}
            onRemove={() => confirm(`${ex.name}을(를) 이 기록에서 뺄까요?`) && update({ ...s, entries: s.entries.filter((x) => x.uid !== en.uid) })}
            onChange={(fn) => patchEntry(en.uid, fn)} />
        );
      })}
      <button className="btn soft block lg" onClick={() => setPicking(true)}><Plus size={20} />종목 추가</button>
      {picking && <ExercisePicker onClose={() => setPicking(false)} onDone={(ids) => { update({ ...s, entries: [...s.entries, ...ids.map((i) => map.get(i)).filter(Boolean).map((e) => entryFor(e!))] }); setPicking(false); }} />}
      {info && <ExerciseInfo e={info} onClose={() => setInfo(null)} />}
    </Sheet>
  );
}

function EntryCard({ ex, en, session, all, first, last, onInfo, onMove, onRemove, onChange }: {
  ex: Exercise; en: SessionEntry; session: Session; all: Session[]; goal: string; first: boolean; last: boolean;
  onInfo: () => void; onMove: (d: number) => void; onRemove: () => void; onChange: (fn: (e: SessionEntry) => SessionEntry) => void;
}) {
  const prev = useMemo(() => lastEntryFor(all, ex.id, session.startedAt, session.id), [all, ex.id, session.startedAt, session.id]);
  const best = useMemo(() => bestBefore(all, ex.id, session.startedAt + 1, session.id), [all, ex.id, session.startedAt, session.id]);
  const sug: Suggestion = useMemo(() => suggestNext(ex, en.repMin, en.repMax, prev?.entry ?? null, best), [ex, en.repMin, en.repMax, prev, best]);
  const stalled = useMemo(() => isStalled(all.filter((x) => x.id !== session.id), ex.id, session.startedAt), [all, ex.id, session.id, session.startedAt]);
  const m = ex.metric;
  const hasW = m === 'weight_reps' || m === 'assisted' || m === 'bodyweight' || m === 'carry';
  const hasRir = m === 'weight_reps' || m === 'bodyweight' || m === 'assisted';
  const repLabel = m === 'hold' ? '초' : m === 'cardio' ? '분' : m === 'carry' ? 'm' : '회';
  const wLabel = m === 'assisted' ? '보조kg' : m === 'bodyweight' ? '+kg' : 'kg';
  const todayBest = Math.max(0, ...workingSets(en).map((x) => e1rmOf(x) ?? 0));
  const prevSummary = prev ? workingSets(prev.entry).map((x) => (x.weight ? `${fmtKg(x.weight)}×${x.reps ?? x.seconds ?? ''}` : `${x.reps ?? x.seconds ?? ''}`)).join(' · ') : null;

  const setSet = (i: number, p: Partial<SetLog>) => onChange((e) => ({
    ...e,
    sets: e.sets.map((x, j) => {
      if (j !== i) return x;
      const n = { ...x, ...p };
      // 반복만 적고 무게를 비워두면 바로 위 세트 무게 → 없으면 추천 무게로 채움
      if (hasW && 'reps' in p && n.weight == null && p.reps != null) {
        const above = [...e.sets.slice(0, j)].reverse().find((y) => y.weight != null)?.weight;
        n.weight = above ?? sug.weight ?? null;
      }
      n.done = isFilled(n);
      return n;
    }),
  }));
  const copyPrev = () => prev && onChange((e) => ({
    ...e,
    sets: workingSets(prev.entry).map((x) => ({ ...emptySet(), weight: x.weight, reps: x.reps, rir: x.rir, seconds: x.seconds, distance: x.distance, done: isFilled(x) })),
  }));

  let n = 0;
  const grid = `set-grid ${!hasW ? 'no-w' : ''} ${!hasRir ? 'no-rir' : ''}`;
  return (
    <section className="ex-card">
      <div className="ex-head">
        <div className="grow">
          <button className="ex-name" onClick={onInfo}>{ex.name}</button> <StretchBadge e={ex} />
          <div className="ex-meta">{prevSummary ? `지난번 ${fmtDate(prev!.session.startedAt, { month: 'numeric', day: 'numeric' })} · ${prevSummary}` : '첫 기록이에요'}</div>
        </div>
        <div className="row" style={{ gap: 0 }}>
          <button className="icon-btn sm" disabled={first} onClick={() => onMove(-1)} aria-label="위로"><ChevronUp size={18} /></button>
          <button className="icon-btn sm" disabled={last} onClick={() => onMove(1)} aria-label="아래로"><ChevronDown size={18} /></button>
          <button className="icon-btn sm" onClick={onRemove} aria-label="종목 빼기"><X size={18} /></button>
        </div>
      </div>

      <div className={`target ${sug.kind === 'increase' ? 'up' : ''}`}>
        {sug.kind === 'increase' ? <TrendingUp size={17} /> : <Target size={17} />}
        <div className="grow">
          <b>오늘 목표 {sug.weight != null && m !== 'bodyweight' ? `${fmtKg(sug.weight)}${m === 'assisted' ? 'kg 보조' : 'kg'} × ` : ''}{sug.reps}{repLabel}</b>
          <div className="text-2">{stalled ? '최근 3번 기록이 같아요. 오늘은 세트를 1개 더 해서 볼륨을 올려보세요.' : sug.note}</div>
          {best > 0 && <div className="tiny muted" style={{ marginTop: 3 }}>추정 1RM {fmtKg(best)}kg{todayBest > best ? <b className="accent"> → 오늘 {fmtKg(todayBest)}kg 🎉</b> : ''}</div>}
        </div>
      </div>

      <div className={grid}>
        <span className="set-h">세트</span>
        {hasW && <span className="set-h">{wLabel}</span>}
        <span className="set-h">{repLabel}</span>
        {hasRir && <span className="set-h">RIR</span>}
        <span className="set-h" style={{ textAlign: 'right' }}>{m === 'weight_reps' ? '1RM' : ''}</span>
        {en.sets.map((x, i) => {
          if (!x.warmup) n++;
          const v = m === 'weight_reps' && x.done && !x.warmup ? e1rmOf(x) : null;
          const pr = v != null && best > 0 && v > best;
          const repVal = m === 'hold' ? x.seconds : m === 'cardio' ? (x.seconds == null ? null : Math.round(x.seconds / 60)) : m === 'carry' ? x.distance : x.reps;
          return [
            <button key={`n${i}`} className={`set-no ${x.warmup ? 'warm' : ''}`} onClick={() => setSet(i, { warmup: !x.warmup })} title="눌러서 워밍업 표시">{x.warmup ? 'W' : n}</button>,
            hasW && <NumCell key={`w${i}`} label="무게" value={x.weight} placeholder={sug.weight != null ? fmtKg(sug.weight) : '–'} onChange={(val) => setSet(i, { weight: val })} />,
            <NumCell key={`r${i}`} label={repLabel} decimal={false} value={repVal} placeholder={String(sug.reps)}
              onChange={(val) => setSet(i, m === 'hold' ? { seconds: val } : m === 'cardio' ? { seconds: val == null ? null : val * 60 } : m === 'carry' ? { distance: val } : { reps: val })} />,
            hasRir && (
              <select key={`i${i}`} className={`cell ${x.rir != null ? 'filled' : ''}`} aria-label="RIR (남긴 반복 수)" value={x.rir ?? ''} onChange={(e) => setSet(i, { rir: e.target.value === '' ? null : Number(e.target.value) })}>
                <option value="">–</option>{[0, 1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r}{r === 5 ? '+' : ''}</option>)}
              </select>
            ),
            <span key={`e${i}`} className={`set-e1rm ${pr ? 'pr' : ''}`}>{v ? <>{Math.round(v)}{pr && <><br />PR</>}</> : ''}</span>,
          ];
        })}
      </div>
      <div className="ex-foot">
        <button className="btn sm grow" onClick={() => onChange((e) => ({ ...e, sets: [...e.sets, { ...emptySet(), weight: e.sets[e.sets.length - 1]?.weight ?? null }] }))}><Plus size={16} />세트</button>
        {en.sets.length > 1 && <button className="btn sm" onClick={() => onChange((e) => ({ ...e, sets: e.sets.slice(0, -1) }))}>－ 세트</button>}
        {prev && <button className="btn sm" onClick={copyPrev}><Copy size={15} />지난번 그대로</button>}
      </div>
    </section>
  );
}
