import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { TEMPLATES } from '../data/templates';
import { db } from '../db';
import { MUSCLES, MUSCLE_ORDER } from '../data/muscles';
import { analyze, type Tip } from '../lib/analysis';
import { useExerciseMap, useExercises } from '../lib/exercises';
import { applyTemplate, createRoutine, makeItem, move } from '../lib/routines';
import type { Routine, RoutineItem } from '../types';
import { AnalysisView } from './AnalysisView';
import { ExerciseInfo, ExercisePicker } from './ExercisePicker';
import { Empty, Sheet, Stepper, StretchBadge } from './ui';

export function RoutinesTab({ onStart }: { onStart: (r: Routine) => void }) {
  const routines = useLiveQuery(() => db.routines.orderBy('order').toArray(), [], []);
  const [openId, setOpenId] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const all = useExercises();
  const map = useExerciseMap();
  const plan = useMemo(() => analyze(routines, map, all, false), [routines, map, all]);
  const open = routines.find((r) => r.id === openId);

  const add = async () => setOpenId(await createRoutine());
  const reorder = async (from: number, to: number) => {
    const next = move(routines, from, to);
    await db.transaction('rw', db.routines, () => Promise.all(next.map((r, i) => db.routines.update(r.id!, { order: i }))));
  };

  if (open) return <RoutineEditor routine={open} onBack={() => setOpenId(null)} onStart={onStart} />;

  return (
    <div className="page">
      <header className="page-head">
        <h1>루틴</h1>
        <button className="btn primary" onClick={add}>＋ 새 루틴</button>
      </header>
      {routines.length === 0 ? (
        <Empty>
          <p>아직 루틴이 없어요.</p>
          <p className="muted">직접 만들거나, 추천 분할 루틴으로 시작해 보세요.</p>
        </Empty>
      ) : (
        <ul className="cards">
          {routines.map((r, i) => (
            <li key={r.id} className="card routine-card">
              <button className="routine-main" onClick={() => setOpenId(r.id!)}>
                <strong>{r.name}</strong>
                <span className="muted small">{r.items.length}종목 · {r.items.reduce((s, x) => s + x.sets, 0)}세트 · 주 {r.timesPerWeek}회</span>
              </button>
              <span className="order-btns">
                <button className="icon-btn" disabled={i === 0} onClick={() => reorder(i, i - 1)} aria-label="위로">▲</button>
                <button className="icon-btn" disabled={i === routines.length - 1} onClick={() => reorder(i, i + 1)} aria-label="아래로">▼</button>
              </span>
              <button className="btn small" disabled={!r.items.length} onClick={() => onStart(r)}>시작</button>
            </li>
          ))}
        </ul>
      )}
      <div className="btn-row">
        <button className="btn ghost" onClick={() => setShowTemplates(true)}>📋 추천 분할 루틴</button>
        {routines.length > 0 && <button className="btn ghost" onClick={() => setShowPlan(true)}>📊 주간 계획 분석</button>}
      </div>

      {showTemplates && (
        <Sheet title="추천 분할 루틴" onClose={() => setShowTemplates(false)}>
          <p className="muted small">추가한 뒤 종목·세트·순서는 마음대로 바꿀 수 있어요.</p>
          {TEMPLATES.map((t) => (
            <div key={t.id} className="card">
              <strong>{t.title}</strong>
              <p className="muted small">{t.desc}</p>
              <ul className="plain small">{t.routines.map((r) => <li key={r.name}>{r.name} (주 {r.timesPerWeek}회): {r.items.map((x) => x[0]).join(', ')}</li>)}</ul>
              <button className="btn primary small" onClick={async () => { await applyTemplate(t, all); setShowTemplates(false); }}>이 분할 추가</button>
            </div>
          ))}
        </Sheet>
      )}
      {showPlan && (
        <Sheet title="주간 계획 분석" onClose={() => setShowPlan(false)}>
          <p className="muted small">모든 루틴 × 각 루틴의 “주 N회”를 합쳐 한 주 전체를 분석해요.</p>
          <AnalysisView a={plan} single={false} map={map} />
        </Sheet>
      )}
    </div>
  );
}

/** 한글 입력(IME)이 끊기지 않도록 로컬 상태로 편집하고 포커스가 빠질 때 저장 */
function NameInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  const commit = () => { const t = v.trim(); if (t && t !== value) onSave(t); else setV(value); };
  return (
    <input className="title-input" value={v} onChange={(e) => setV(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) (e.target as HTMLInputElement).blur(); }}
      aria-label="루틴 이름 (눌러서 바꾸기)" />
  );
}

function RoutineEditor({ routine, onBack, onStart }: { routine: Routine; onBack: () => void; onStart: (r: Routine) => void }) {
  const all = useExercises();
  const map = useExerciseMap();
  const allRoutines = useLiveQuery(() => db.routines.toArray(), [], []);
  const [picking, setPicking] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [tab, setTab] = useState<'list' | 'analysis'>('list');
  const id = routine.id!;
  const save = (patch: Partial<Routine>) => db.routines.update(id, patch);
  const setItems = (items: RoutineItem[]) => save({ items });
  const patchItem = (uid: string, p: Partial<RoutineItem>) => setItems(routine.items.map((x) => (x.uid === uid ? { ...x, ...p } : x)));
  const addIds = (ids: string[]) => setItems([...routine.items, ...ids.map((i) => map.get(i)).filter(Boolean).map((e) => makeItem(e!))]);

  const single = useMemo(() => analyze([routine], map, all, true), [routine, map, all]);
  const week = useMemo(() => analyze(allRoutines, map, all, false), [allRoutines, map, all]);
  const merged = useMemo(() => {
    // 분할 루틴이면 다른 부위가 비는 건 당연하므로, 주간 기준 부족 팁은 "이 루틴이 다루는 근육"만 보여준다
    const weekTips = week.tips.filter((t) => t.muscle && single.weekly[t.muscle] >= 1 && !single.tips.some((x) => x.title === t.title));
    const missing = MUSCLE_ORDER.filter((m) => MUSCLES[m].tracked && week.weekly[m] < 1);
    const extra: Tip[] = missing.length && routine.items.length ? [{
      level: 'info',
      title: `주간 계획 전체에서 아직 안 하는 부위 ${missing.length}곳`,
      detail: `${missing.map((m) => MUSCLES[m].ko).join(', ')} — 분할 루틴이라면 다른 루틴에서 채우면 돼요. 루틴 목록의 ‘주간 계획 분석’에서 한 주 전체를 확인할 수 있어요.`,
    }] : [];
    return { ...single, tips: [...weekTips.map((t) => ({ ...t, title: `주간 계획: ${t.title}` })), ...single.tips, ...extra] };
  }, [single, week, routine.items.length]);

  const del = async () => {
    if (!confirm(`'${routine.name}' 루틴을 삭제할까요? 운동 기록은 남아요.`)) return;
    await db.routines.delete(id);
    onBack();
  };
  const dup = async () => {
    await db.routines.add({ ...routine, id: undefined, name: routine.name + ' 복사', order: allRoutines.length, createdAt: Date.now() });
    onBack();
  };

  return (
    <div className="page">
      <header className="page-head">
        <button className="icon-btn" onClick={onBack} aria-label="뒤로">‹</button>
        <NameInput value={routine.name} onSave={(name) => save({ name })} />
        <button className="btn primary small" disabled={!routine.items.length} onClick={() => onStart(routine)}>시작</button>
      </header>
      <div className="meta-row">
        <span>주 몇 회 할까요?</span>
        <Stepper value={routine.timesPerWeek} min={0} max={7} onChange={(v) => save({ timesPerWeek: v })} suffix="회" />
      </div>
      <div className="seg">
        <button className={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>종목 {routine.items.length}</button>
        <button className={tab === 'analysis' ? 'on' : ''} onClick={() => setTab('analysis')}>효과 · 추천 {single.tips.filter((t) => t.level === 'warn').length ? '⚠️' : ''}</button>
      </div>

      {tab === 'list' ? (
        <>
          {routine.items.length === 0 && <Empty><p>종목을 추가해 보세요.</p></Empty>}
          <ol className="items">
            {routine.items.map((it, i) => {
              const e = map.get(it.exerciseId);
              if (!e) return null;
              const unit = e.metric === 'hold' ? '초' : e.metric === 'cardio' ? '분' : '회';
              return (
                <li key={it.uid} className="card item">
                  <div className="item-head">
                    <span className="item-no">{i + 1}</span>
                    <button className="item-name" onClick={() => setInfo(e.id)}>{e.name} <StretchBadge e={e} /></button>
                    <span className="order-btns">
                      <button className="icon-btn" disabled={i === 0} onClick={() => setItems(move(routine.items, i, i - 1))} aria-label="위로">▲</button>
                      <button className="icon-btn" disabled={i === routine.items.length - 1} onClick={() => setItems(move(routine.items, i, i + 1))} aria-label="아래로">▼</button>
                      <button className="icon-btn danger" onClick={() => setItems(routine.items.filter((x) => x.uid !== it.uid))} aria-label="삭제">✕</button>
                    </span>
                  </div>
                  <div className="item-controls">
                    <label>세트 <Stepper value={it.sets} min={1} max={10} onChange={(v) => patchItem(it.uid, { sets: v })} /></label>
                    <label>목표 <Stepper value={it.repMin} min={1} max={it.repMax} onChange={(v) => patchItem(it.uid, { repMin: v })} />–<Stepper value={it.repMax} min={it.repMin} max={100} onChange={(v) => patchItem(it.uid, { repMax: v })} suffix={unit} /></label>
                    <label>휴식 <Stepper value={it.restSec} step={15} min={0} max={600} onChange={(v) => patchItem(it.uid, { restSec: v })} suffix="초" /></label>
                  </div>
                </li>
              );
            })}
          </ol>
          <button className="btn primary block" onClick={() => setPicking(true)}>＋ 종목 추가</button>
          <div className="btn-row">
            <button className="btn ghost small" onClick={dup}>복제</button>
            <button className="btn ghost small danger" onClick={del}>루틴 삭제</button>
          </div>
        </>
      ) : (
        <AnalysisView a={merged} single map={map} onAdd={(eid) => addIds([eid])} />
      )}

      {picking && <ExercisePicker onClose={() => setPicking(false)} onDone={(ids) => { addIds(ids); setPicking(false); }} />}
      {info && map.get(info) && <ExerciseInfo e={map.get(info)!} onClose={() => setInfo(null)} />}
    </div>
  );
}
