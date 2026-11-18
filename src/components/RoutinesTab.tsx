import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart3, ChevronDown, ChevronRight, ChevronUp, Copy, Dumbbell, LayoutTemplate, PenLine, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MUSCLES, MUSCLE_ORDER } from '../data/muscles';
import { TEMPLATES } from '../data/templates';
import { db, useSettings } from '../db';
import { analyze, type Tip } from '../lib/analysis';
import { useExerciseMap, useExercises } from '../lib/exercises';
import { applyTemplate, createRoutine, makeItem, move } from '../lib/routines';
import type { Routine, RoutineItem } from '../types';
import { AnalysisView } from './AnalysisView';
import { ExerciseInfo, ExercisePicker } from './ExercisePicker';
import { Empty, Sheet, Stepper, StretchBadge } from './ui';

export function RoutinesTab({ onLog }: { onLog: (r: Routine) => void }) {
  const routines = useLiveQuery(() => db.routines.orderBy('order').toArray(), [], []);
  const [openId, setOpenId] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const all = useExercises();
  const map = useExerciseMap();
  const settings = useSettings();
  const plan = useMemo(() => analyze(routines, map, all, false, settings.level), [routines, map, all, settings.level]);
  const open = routines.find((r) => r.id === openId);

  const reorder = async (from: number, to: number) => {
    const next = move(routines, from, to);
    await db.transaction('rw', db.routines, () => Promise.all(next.map((r, i) => db.routines.update(r.id!, { order: i }))));
  };

  if (open) return <RoutineEditor routine={open} onBack={() => setOpenId(null)} onLog={onLog} />;

  return (
    <>
      <div className="top-bar">
        <div className="large-title">내 루틴</div>
        <button className="btn primary sm" onClick={async () => setOpenId(await createRoutine())}><Plus size={17} />새 루틴</button>
      </div>
      <p className="subtitle">루틴을 저장해 두고, 기록할 때 불러와요</p>

      {routines.length === 0 ? (
        <div className="card"><Empty icon={<Dumbbell size={26} />} title="아직 루틴이 없어요" sub="직접 만들거나 추천 분할로 시작해 보세요" /></div>
      ) : (
        <div className="list">
          {routines.map((r, i) => (
            <div key={r.id} className="list-item with-icon">
              <span className="icon-tile"><Dumbbell size={20} /></span>
              <button className="grow" style={{ textAlign: 'left' }} onClick={() => setOpenId(r.id!)}>
                <div className="list-title">{r.name}</div>
                <div className="list-sub ellipsis">{r.items.length}종목 · {r.items.reduce((s, x) => s + x.sets, 0)}세트 · 주 {r.timesPerWeek}회</div>
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
        {routines.length > 0 && (
          <button className="list-item with-icon" onClick={() => setShowPlan(true)}>
            <span className="icon-tile gray"><BarChart3 size={20} /></span>
            <div className="grow"><div className="list-title">주간 계획 분석</div><div className="list-sub">모든 루틴 × 주당 횟수로 근육별 세트 계산</div></div>
            <ChevronRight size={18} className="chev" />
          </button>
        )}
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
      {showPlan && (
        <Sheet title="주간 계획 분석" onClose={() => setShowPlan(false)} full>
          <p className="muted small" style={{ marginBottom: 12 }}>모든 루틴과 각 루틴의 ‘주 N회’를 합쳐 한 주를 분석해요.</p>
          <AnalysisView a={plan} single={false} map={map} level={settings.level} />
        </Sheet>
      )}
    </>
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

function RoutineEditor({ routine, onBack, onLog }: { routine: Routine; onBack: () => void; onLog: (r: Routine) => void }) {
  const all = useExercises();
  const map = useExerciseMap();
  const settings = useSettings();
  const allRoutines = useLiveQuery(() => db.routines.toArray(), [], []);
  const [picking, setPicking] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [tab, setTab] = useState<'list' | 'analysis'>('list');
  const id = routine.id!;
  const save = (patch: Partial<Routine>) => db.routines.update(id, patch);
  const setItems = (items: RoutineItem[]) => save({ items });
  const patchItem = (uid: string, p: Partial<RoutineItem>) => setItems(routine.items.map((x) => (x.uid === uid ? { ...x, ...p } : x)));
  const addIds = (ids: string[]) => setItems([...routine.items, ...ids.map((i) => map.get(i)).filter(Boolean).map((e) => makeItem(e!, 3, settings.goal))]);

  const single = useMemo(() => analyze([routine], map, all, true, settings.level), [routine, map, all, settings.level]);
  const week = useMemo(() => analyze(allRoutines, map, all, false, settings.level), [allRoutines, map, all, settings.level]);
  const merged = useMemo(() => {
    const weekTips = week.tips.filter((t) => t.muscle && single.weekly[t.muscle] >= 1 && !single.tips.some((x) => x.title === t.title));
    const missing = MUSCLE_ORDER.filter((m) => MUSCLES[m].tracked && week.weekly[m] < 1);
    const extra: Tip[] = missing.length && routine.items.length ? [{
      level: 'info',
      title: `주간 계획에서 아직 안 하는 부위 ${missing.length}곳`,
      detail: `${missing.map((m) => MUSCLES[m].ko).join(', ')} — 분할 루틴이라면 다른 루틴에서 채우면 돼요.`,
    }] : [];
    return { ...single, tips: [...weekTips.map((t) => ({ ...t, title: `주간 계획 · ${t.title}` })), ...single.tips, ...extra] };
  }, [single, week, routine.items.length]);

  const del = async () => {
    if (!confirm(`'${routine.name}' 루틴을 삭제할까요? 기록은 남아요.`)) return;
    await db.routines.delete(id);
    onBack();
  };
  const dup = async () => {
    await db.routines.add({ ...routine, id: undefined, name: routine.name + ' 복사', order: allRoutines.length, createdAt: Date.now() });
    onBack();
  };

  return (
    <>
      <div className="top-bar">
        <button className="icon-btn" onClick={onBack} aria-label="뒤로" style={{ marginLeft: -8 }}><ChevronRight size={24} style={{ transform: 'rotate(180deg)' }} /></button>
        <div className="top-bar-actions">
          <button className="icon-btn" onClick={dup} aria-label="복제"><Copy size={20} /></button>
          <button className="icon-btn danger" onClick={del} aria-label="루틴 삭제"><Trash2 size={20} /></button>
        </div>
      </div>
      <div className="row" style={{ gap: 6 }}><NameInput value={routine.name} onSave={(name) => save({ name })} /><PenLine size={18} className="muted" /></div>
      <div className="card row-between mt">
        <span className="bold">일주일에 몇 번 하나요?</span>
        <Stepper value={routine.timesPerWeek} min={0} max={7} onChange={(v) => save({ timesPerWeek: v })} suffix="회" />
      </div>

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
                const unit = e.metric === 'hold' ? '초' : e.metric === 'cardio' ? '분' : '회';
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
                      <div className="item-controls">
                        <label>세트<Stepper value={it.sets} min={1} max={10} onChange={(v) => patchItem(it.uid, { sets: v })} /></label>
                        <label>{unit}<Stepper value={it.repMin} min={1} max={it.repMax} onChange={(v) => patchItem(it.uid, { repMin: v })} />–<Stepper value={it.repMax} min={it.repMin} max={100} onChange={(v) => patchItem(it.uid, { repMax: v })} /></label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="card"><Empty title="종목을 추가해 보세요" sub="검색하거나 즐겨찾기에서 골라 담을 수 있어요" /></div>}
          <button className="btn soft block lg" onClick={() => setPicking(true)}><Plus size={20} />종목 추가</button>
          {routine.items.length > 0 && <button className="btn primary block lg mt" onClick={() => onLog(routine)}>오늘 이 루틴으로 기록하기</button>}
        </>
      ) : (
        <AnalysisView a={merged} single map={map} level={settings.level} onAdd={(eid) => addIds([eid])} />
      )}

      {picking && <ExercisePicker onClose={() => setPicking(false)} onDone={(ids) => { addIds(ids); setPicking(false); }} />}
      {info && map.get(info) && <ExerciseInfo e={map.get(info)!} onClose={() => setInfo(null)} />}
    </>
  );
}
