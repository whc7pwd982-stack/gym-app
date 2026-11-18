import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, ChevronRight, ChevronUp, Copy, Dumbbell, LayoutTemplate, PenLine, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TEMPLATES } from '../data/templates';
import { db, useSettings } from '../db';
import { analyze } from '../lib/analysis';
import { useExerciseMap, useExercises } from '../lib/exercises';
import { isPairedDumbbell } from '../lib/equipment';
import { applyTemplate, draftRoutine, makeItem, move, planOf } from '../lib/routines';
import type { Exercise, PlanSet, Routine, RoutineItem } from '../types';
import { AnalysisView } from './AnalysisView';
import { ExerciseInfo, ExercisePicker } from './ExercisePicker';
import { Empty, NumCell, Sheet, StretchBadge, toast } from './ui';

export function RoutinesTab({ onLog }: { onLog: (r: Routine) => void }) {
  const routines = useLiveQuery(() => db.routines.orderBy('order').toArray(), [], []);
  const [open, setOpen] = useState<Routine | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const all = useExercises();

  const reorder = async (from: number, to: number) => {
    const next = move(routines, from, to);
    await db.transaction('rw', db.routines, () => Promise.all(next.map((r, i) => db.routines.update(r.id!, { order: i }))));
  };

  if (open) return <RoutineEditor key={open.id ?? 'new'} initial={open} onBack={() => setOpen(null)} onLog={onLog} />;

  return (
    <>
      <div className="top-bar">
        <div className="large-title">내 루틴</div>
        <button className="btn primary sm" onClick={async () => setOpen(await draftRoutine())}><Plus size={17} />새 루틴</button>
      </div>
      <p className="subtitle">루틴을 저장해 두고, 기록할 때 불러와요</p>

      {routines.length === 0 ? (
        <div className="card"><Empty icon={<Dumbbell size={26} />} title="아직 루틴이 없어요" sub="직접 만들거나 추천 분할로 시작해 보세요" /></div>
      ) : (
        <div className="list">
          {routines.map((r, i) => (
            <div key={r.id} className="list-item with-icon">
              <span className="icon-tile"><Dumbbell size={20} /></span>
              <button className="grow" style={{ textAlign: 'left' }} onClick={() => setOpen(r)}>
                <div className="list-title">{r.name}</div>
                <div className="list-sub ellipsis">{r.items.length}종목 · {r.items.reduce((s, x) => s + x.sets, 0)}세트</div>
              </button>
              <div className="order">
                <button className="icon-btn sm" disabled={i === 0} onClick={() => reorder(i, i - 1)} aria-label="위로"><ChevronUp size={17} /></button>
                <button className="icon-btn sm" disabled={i === routines.length - 1} onClick={() => reorder(i, i + 1)} aria-label="아래로"><ChevronDown size={17} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="list">
        <button className="list-item with-icon" onClick={() => setShowTemplates(true)}>
          <span className="icon-tile gray"><LayoutTemplate size={20} /></span>
          <div className="grow"><div className="list-title">추천 분할 루틴</div><div className="list-sub">무분할 · 상하체 · 밀기/당기기/하체</div></div>
          <ChevronRight size={18} className="chev" />
        </button>
      </div>

      {showTemplates && (
        <Sheet title="추천 분할 루틴" onClose={() => setShowTemplates(false)}>
          <p className="muted small" style={{ marginBottom: 12 }}>추가한 뒤 종목·세트·순서는 자유롭게 바꿀 수 있어요.</p>
          {TEMPLATES.map((t) => (
            <div key={t.id} className="card">
              <div className="h3">{t.title}</div>
              <p className="muted small" style={{ margin: '4px 0 10px' }}>{t.desc}</p>
              {t.routines.map((r) => <p key={r.name} className="small text-2" style={{ marginBottom: 4 }}><b>{r.name}</b> · {r.items.map((x) => x[0]).join(', ')}</p>)}
              <button className="btn soft block mt" onClick={async () => { await applyTemplate(t, all); setShowTemplates(false); }}><Plus size={17} />이 분할 추가</button>
            </div>
          ))}
        </Sheet>
      )}
    </>
  );
}

/** 루틴에 정해 둘 세트별 무게·반복 */
function PlanRows({ ex, plan, onChange }: { ex: Exercise; plan: PlanSet[]; onChange: (p: PlanSet[]) => void }) {
  const m = ex.metric;
  const hasW = m === 'weight_reps' || m === 'assisted' || m === 'bodyweight' || m === 'carry';
  const unit = m === 'hold' ? '초' : m === 'cardio' ? '분' : m === 'carry' ? 'm' : '회';
  const wLabel = m === 'assisted' ? '보조kg' : m === 'bodyweight' ? '+kg' : isPairedDumbbell(ex) ? '한 손 kg' : 'kg';
  const setAt = (i: number, p: Partial<PlanSet>) => onChange(plan.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const valOf = (x: PlanSet) => (m === 'hold' ? x.seconds ?? null : m === 'cardio' ? (x.seconds == null ? null : Math.round(x.seconds / 60)) : m === 'carry' ? x.distance ?? null : x.reps);
  const patchVal = (v: number | null): Partial<PlanSet> => (m === 'hold' ? { seconds: v } : m === 'cardio' ? { seconds: v == null ? null : v * 60 } : m === 'carry' ? { distance: v } : { reps: v });
  return (
    <div style={{ marginTop: 10 }}>
      <div className={`plan-grid ${hasW ? '' : 'no-w'}`}>
        <span className="set-h">세트</span>{hasW && <span className="set-h">{wLabel}</span>}<span className="set-h">{unit}</span><span />
        {plan.map((x, i) => [
          <span key={`n${i}`} className="set-no">{i + 1}</span>,
          hasW && <NumCell key={`w${i}`} label="무게" value={x.weight} placeholder="–" onChange={(v) => setAt(i, { weight: v })} />,
          <NumCell key={`r${i}`} label={unit} decimal={false} value={valOf(x)} placeholder="–" onChange={(v) => setAt(i, patchVal(v))} />,
          <button key={`x${i}`} className="icon-btn sm" disabled={plan.length <= 1} onClick={() => onChange(plan.filter((_, j) => j !== i))} aria-label="세트 삭제"><X size={16} /></button>,
        ])}
      </div>
      <button className="btn sm" style={{ marginTop: 8 }} onClick={() => onChange([...plan, { ...(plan[plan.length - 1] ?? { weight: null, reps: null }) }])}><Plus size={15} />세트 추가</button>
    </div>
  );
}

function NameInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  const commit = () => { const t = v.trim(); if (t && t !== value) onSave(t); else setV(value); };
  return (
    <input className="title-input" value={v} onChange={(e) => setV(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) (e.target as HTMLInputElement).blur(); }}
      aria-label="루틴 이름 (눌러서 바꾸기)" />
  );
}

/** 루틴 편집. 변경은 화면 안에서만 들고 있다가 [저장]을 눌러야 DB에 쓴다 */
function RoutineEditor({ initial, onBack, onLog }: { initial: Routine; onBack: () => void; onLog: (r: Routine) => void }) {
  const all = useExercises();
  const map = useExerciseMap();
  const settings = useSettings();
  const allRoutines = useLiveQuery(() => db.routines.toArray(), [], []);
  const [routine, setRoutine] = useState<Routine>(initial);
  const [dirty, setDirty] = useState(initial.id == null);
  const [picking, setPicking] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [tab, setTab] = useState<'list' | 'analysis'>('list');
  const edit = (patch: Partial<Routine>) => { setRoutine((r) => ({ ...r, ...patch })); setDirty(true); };
  const setItems = (items: RoutineItem[]) => edit({ items });
  const patchItem = (uid: string, p: Partial<RoutineItem>) => setItems(routine.items.map((x) => (x.uid === uid ? { ...x, ...p } : x)));
  const addIds = (ids: string[]) => setItems([...routine.items, ...ids.map((i) => map.get(i)).filter(Boolean).map((e) => makeItem(e!, 3, settings.goal))]);

  const single = useMemo(() => analyze([routine], map, all, true), [routine, map, all]);

  const persist = async (): Promise<Routine> => {
    const id = await db.routines.put(routine);
    const saved = { ...routine, id };
    setRoutine(saved);
    setDirty(false);
    return saved;
  };
  const save = async () => { await persist(); toast('루틴을 저장했어요'); };
  const back = () => {
    if (dirty && !confirm('저장하지 않은 변경이 있어요. 저장하지 않고 나갈까요?')) return;
    onBack();
  };
  const del = async () => {
    if (routine.id == null) { if (confirm('이 루틴을 저장하지 않고 버릴까요?')) onBack(); return; }
    if (!confirm(`'${routine.name}' 루틴을 삭제할까요? 기록은 남아요.`)) return;
    await db.routines.delete(routine.id);
    onBack();
  };
  const dup = async () => {
    if (dirty && !confirm('저장하지 않은 변경은 빼고, 저장된 루틴을 복제할까요?')) return;
    const base = routine.id != null ? (await db.routines.get(routine.id)) ?? routine : routine;
    await db.routines.add({ ...base, id: undefined, name: base.name + ' 복사', order: allRoutines.length, createdAt: Date.now() });
    toast('복제했어요');
    onBack();
  };
  const logToday = async () => {
    const r = dirty || routine.id == null ? await persist() : routine;
    onLog(r);
  };

  return (
    <>
      <div className="top-bar">
        <button className="icon-btn" onClick={back} aria-label="뒤로" style={{ marginLeft: -8 }}><ChevronRight size={24} style={{ transform: 'rotate(180deg)' }} /></button>
        <div className="top-bar-actions">
          <button className="icon-btn" onClick={dup} aria-label="복제"><Copy size={20} /></button>
          <button className="icon-btn danger" onClick={del} aria-label="루틴 삭제"><Trash2 size={20} /></button>
          <button className="btn primary sm" disabled={!dirty} onClick={save}>저장</button>
        </div>
      </div>
      <div className="row" style={{ gap: 6, marginBottom: 14 }}><NameInput value={routine.name} onSave={(name) => edit({ name })} /><PenLine size={18} className="muted" /></div>
      {dirty && <p className="tiny" style={{ color: 'var(--warning)', margin: '-8px 0 12px' }}>저장하지 않은 변경이 있어요</p>}

      <div className="seg">
        <button className={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>종목 {routine.items.length}</button>
        <button className={tab === 'analysis' ? 'on' : ''} onClick={() => setTab('analysis')}>효과 · 추천</button>
      </div>

      {tab === 'list' ? (
        <>
          {routine.items.length > 0 ? (
            <div className="list">
              {routine.items.map((it, i) => {
                const e = map.get(it.exerciseId);
                if (!e) return null;
                return (
                  <div key={it.uid} className="item">
                    <span className="item-idx">{i + 1}</span>
                    <div className="grow">
                      <div className="row-between" style={{ alignItems: 'flex-start' }}>
                        <button className="list-title" style={{ textAlign: 'left' }} onClick={() => setInfo(e.id)}>{e.name} <StretchBadge e={e} /></button>
                        <div className="row" style={{ gap: 0, marginTop: -6, marginRight: -6 }}>
                          <button className="icon-btn sm" disabled={i === 0} onClick={() => setItems(move(routine.items, i, i - 1))} aria-label="위로"><ChevronUp size={17} /></button>
                          <button className="icon-btn sm" disabled={i === routine.items.length - 1} onClick={() => setItems(move(routine.items, i, i + 1))} aria-label="아래로"><ChevronDown size={17} /></button>
                          <button className="icon-btn sm" onClick={() => setItems(routine.items.filter((x) => x.uid !== it.uid))} aria-label="삭제"><X size={17} /></button>
                        </div>
                      </div>
                      <PlanRows ex={e} plan={planOf(it)} onChange={(plan) => patchItem(it.uid, { plan, sets: plan.length })} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="card"><Empty title="종목을 추가해 보세요" sub="검색하거나 즐겨찾기에서 골라 담을 수 있어요" /></div>}
          <button className="btn soft block lg" onClick={() => setPicking(true)}><Plus size={20} />종목 추가</button>
          {routine.items.length > 0 && <button className="btn primary block lg mt" onClick={logToday}>{dirty ? '저장하고 오늘 이 루틴으로 기록하기' : '오늘 이 루틴으로 기록하기'}</button>}
        </>
      ) : (
        <AnalysisView a={single} single map={map} onAdd={(eid) => addIds([eid])} />
      )}

      {picking && <ExercisePicker onClose={() => setPicking(false)} onDone={(ids) => { addIds(ids); setPicking(false); }} />}
      {info && map.get(info) && <ExerciseInfo e={map.get(info)!} onClose={() => setInfo(null)} />}
    </>
  );
}
