import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Info, Plus, Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CATEGORY_KO, MUSCLES, MUSCLE_ORDER } from '../data/muscles';
import { db } from '../db';
import { useExercises } from '../lib/exercises';
import { searchExercises } from '../lib/search';
import type { Category, Exercise, Metric, MuscleCode } from '../types';
import { MuscleChips, Sheet, StretchBadge } from './ui';

export function useFavorites() {
  const favs = useLiveQuery(() => db.favorites.toArray(), [], []);
  const set = useMemo(() => new Set(favs.map((f) => f.exerciseId)), [favs]);
  const toggle = async (id: string) => {
    if (set.has(id)) await db.favorites.delete(id);
    else await db.favorites.put({ exerciseId: id, addedAt: Date.now() });
  };
  return { favs: set, toggle };
}

type Filter = 'all' | 'fav' | Category;

export function ExerciseList({ onPick, picked, onInfo }: { onPick?: (e: Exercise) => void; picked?: Set<string>; onInfo?: (e: Exercise) => void }) {
  const all = useExercises();
  const { favs, toggle } = useFavorites();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);

  const list = useMemo(() => {
    let l = all;
    if (filter === 'fav') l = l.filter((e) => favs.has(e.id));
    else if (filter !== 'all') l = l.filter((e) => e.category === filter);
    l = searchExercises(l, q);
    if (!q && filter === 'all') l = [...l.filter((e) => favs.has(e.id)), ...l.filter((e) => !favs.has(e.id))];
    return l;
  }, [all, q, filter, favs]);

  return (
    <div>
      <div className="search">
        <Search size={18} />
        <input className="input" type="search" placeholder="종목 검색 · 사레레, ㄹㅍㄷ, 삼두" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="scroll-x mt">
        {(['all', 'fav', 'chest', 'shoulder', 'back', 'arm', 'legs', 'core', 'full'] as Filter[]).map((f) => (
          <button key={f} className={`pill ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? '전체' : f === 'fav' ? <><Star size={14} />즐겨찾기{favs.size ? ` ${favs.size}` : ''}</> : CATEGORY_KO[f]}
          </button>
        ))}
      </div>
      {filter === 'fav' && favs.size === 0 && <p className="muted small" style={{ padding: '12px 4px' }}>종목 왼쪽 ☆를 눌러 자주 하는 운동을 모아보세요.</p>}
      <div className="stack-sm" style={{ gap: 2 }}>
        {list.slice(0, 120).map((e) => {
          const on = picked?.has(e.id);
          return (
            <div key={e.id} className={`ex-row ${on ? 'on' : ''}`}>
              <button className={`star ${favs.has(e.id) ? 'on' : ''}`} onClick={() => toggle(e.id)} aria-label={favs.has(e.id) ? '즐겨찾기 해제' : '즐겨찾기'}>
                <Star size={20} fill={favs.has(e.id) ? 'currentColor' : 'none'} />
              </button>
              <button className="ex-row-main" onClick={() => (onPick ? onPick(e) : onInfo?.(e))}>
                <div className="list-title">{e.name} <StretchBadge e={e} />{e.custom && <span className="badge accent">내 종목</span>}</div>
                <div className="list-sub row wrap" style={{ gap: 6 }}><span>{e.equipment}</span><MuscleChips e={e} compact /></div>
              </button>
              {onInfo && onPick && <button className="icon-btn sm" onClick={() => onInfo(e)} aria-label="상세"><Info size={18} /></button>}
              {onPick && <span className={`check ${on ? 'on' : ''}`}>{on && <Check size={15} strokeWidth={3} />}</span>}
            </div>
          );
        })}
      </div>
      {list.length > 120 && <p className="muted small center" style={{ padding: 12 }}>검색어를 더 입력해 보세요 ({list.length}개)</p>}
      {list.length === 0 && <p className="muted small" style={{ padding: '16px 4px' }}>찾는 종목이 없나요? 직접 만들 수 있어요.</p>}
      <button className="btn soft block mt" onClick={() => setCreating(true)}><Plus size={18} />내 종목 만들기</button>
      {creating && <CustomExerciseForm initialName={q} onClose={() => setCreating(false)} />}
    </div>
  );
}

export function ExercisePicker({ onClose, onDone, title = '종목 추가' }: { onClose: () => void; onDone: (ids: string[]) => void; title?: string }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [info, setInfo] = useState<Exercise | null>(null);
  return (
    <Sheet title={title} onClose={onClose} full
      footer={<button className="btn primary block lg" disabled={!picked.length} onClick={() => onDone(picked)}>{picked.length ? `${picked.length}개 추가하기` : '종목을 선택하세요'}</button>}>
      <ExerciseList picked={new Set(picked)} onPick={(e) => setPicked((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]))} onInfo={setInfo} />
      {info && <ExerciseInfo e={info} onClose={() => setInfo(null)} />}
    </Sheet>
  );
}

export function ExerciseInfo({ e, onClose }: { e: Exercise; onClose: () => void }) {
  const rows = (codes: Partial<Record<MuscleCode, number>>) =>
    (Object.entries(codes) as [MuscleCode, number][]).map(([m, w]) => <div key={m} className="kv"><span>{MUSCLES[m].full ?? MUSCLES[m].ko}</span><b>{w}세트</b></div>);
  return (
    <Sheet title={e.name} onClose={onClose}>
      <p className="muted small">{e.en}{e.aliases.length ? ` · ${e.aliases.join(', ')}` : ''}</p>
      <div className="row wrap mt" style={{ gap: 6 }}><span className="chip">{CATEGORY_KO[e.category]}</span><span className="chip">{e.equipment}</span><StretchBadge e={e} /></div>
      <div className="card mt">
        <div className="h3" style={{ marginBottom: 4 }}>1세트 하면 쌓이는 세트</div>
        {rows(e.primary)}{rows(e.secondary)}
        <p className="tiny muted mt">주로 쓰는 근육 1세트, 보조로 쓰는 근육 0.5세트로 계산해요 (Pelland 2026).</p>
      </div>
      {e.stretch && <div className="card"><div className="h3">스트레칭 자극이란?</div><p className="small text-2 mt">근육이 길게 늘어난 자세에서 힘을 받는 운동이에요. 오버헤드 익스텐션(삼두), 시티드 레그컬(햄스트링)처럼 늘어난 자세에서 하는 운동이 근육을 더 키웠다는 연구들이 있어요{e.stretch === 'S★' ? '. 이 종목은 직접 연구로 확인됐어요' : ''}.</p></div>}
      {e.reps && <div className="card"><div className="kv"><span>권장 반복</span><b>{e.reps[0]}–{e.reps[1]}회</b></div><div className="kv"><span>한 번에 올리는 무게</span><b>{e.increment}kg</b></div></div>}
      {e.evidence && <p className="tiny muted">근거 · {e.evidence}</p>}
    </Sheet>
  );
}

function CustomExerciseForm({ onClose, initialName }: { onClose: () => void; initialName: string }) {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<Category>('chest');
  const [equipment, setEquipment] = useState('머신');
  const [metric, setMetric] = useState<Metric>('weight_reps');
  const [roles, setRoles] = useState<Partial<Record<MuscleCode, number>>>({});
  const cycle = (m: MuscleCode) => setRoles((r) => {
    const v = r[m]; const n = { ...r };
    if (!v) n[m] = 1; else if (v === 1) n[m] = 0.5; else delete n[m];
    return n;
  });
  const save = async () => {
    const primary: Exercise['primary'] = {}, secondary: Exercise['secondary'] = {};
    for (const [m, w] of Object.entries(roles) as [MuscleCode, number][]) (w === 1 ? primary : secondary)[m] = w;
    await db.customExercises.put({
      id: 'c' + Date.now().toString(36), name: name.trim(), aliases: [], en: '', equipment, category, primary, secondary,
      stretch: '', reps: metric === 'weight_reps' ? [8, 12] : null, increment: /덤벨/.test(equipment) ? 2 : 2.5, metric, hypertrophyEvidence: false, custom: true,
    });
    onClose();
  };
  return (
    <Sheet title="내 종목 만들기" onClose={onClose} footer={<button className="btn primary block lg" disabled={!name.trim() || !Object.values(roles).includes(1)} onClick={save}>저장</button>}>
      <label className="field"><span className="field-label">이름</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 해머 아이소 로우" /></label>
      <label className="field"><span className="field-label">부위</span>
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {Object.entries(CATEGORY_KO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label className="field"><span className="field-label">장비</span><input className="input" value={equipment} onChange={(e) => setEquipment(e.target.value)} /></label>
      <label className="field"><span className="field-label">기록 방식</span>
        <select className="select" value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
          <option value="weight_reps">무게 × 반복</option>
          <option value="bodyweight">맨몸 반복 (+추가 중량)</option>
          <option value="assisted">보조 머신 (보조 무게 × 반복)</option>
          <option value="hold">버티기 (초)</option>
          <option value="carry">무게 × 거리</option>
          <option value="cardio">유산소 (분 · km)</option>
        </select>
      </label>
      <div className="field-label" style={{ marginBottom: 4 }}>자극 부위</div>
      <p className="tiny muted" style={{ marginBottom: 10 }}>한 번 누르면 주로 쓰는 근육(1), 두 번 보조 근육(0.5), 세 번 해제</p>
      <div className="muscle-grid">
        {MUSCLE_ORDER.map((m) => (
          <button key={m} className={`muscle-btn ${roles[m] === 1 ? 'p' : roles[m] === 0.5 ? 's' : ''}`} onClick={() => cycle(m)}>{MUSCLES[m].ko}</button>
        ))}
      </div>
    </Sheet>
  );
}
