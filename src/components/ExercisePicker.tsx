import { useLiveQuery } from 'dexie-react-hooks';
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
    <div className="ex-list">
      <input className="search" type="search" placeholder="종목 검색 (예: 사레레, ㄹㅍㄷ, 삼두)" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="filter-row">
        {(['all', 'fav', 'chest', 'shoulder', 'back', 'arm', 'legs', 'core', 'full'] as Filter[]).map((f) => (
          <button key={f} className={`pill ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? '전체' : f === 'fav' ? `★ 즐겨찾기${favs.size ? ` ${favs.size}` : ''}` : CATEGORY_KO[f]}
          </button>
        ))}
      </div>
      {filter === 'fav' && favs.size === 0 && <p className="muted pad">종목 옆 ☆를 눌러 자주 하는 운동을 즐겨찾기해 보세요.</p>}
      <ul className="rows">
        {list.slice(0, 120).map((e) => {
          const on = picked?.has(e.id);
          return (
            <li key={e.id} className={`row ${on ? 'row-on' : ''}`}>
              <button className={`star ${favs.has(e.id) ? 'on' : ''}`} onClick={() => toggle(e.id)} aria-label={favs.has(e.id) ? '즐겨찾기 해제' : '즐겨찾기'}>
                {favs.has(e.id) ? '★' : '☆'}
              </button>
              <button className="row-main" onClick={() => (onPick ? onPick(e) : onInfo?.(e))}>
                <span className="row-title">{e.name} <StretchBadge e={e} />{e.custom && <span className="badge">내 종목</span>}</span>
                <span className="row-sub">{e.equipment} · <MuscleChips e={e} compact /></span>
              </button>
              {onInfo && onPick && <button className="icon-btn" onClick={() => onInfo(e)} aria-label="상세">ⓘ</button>}
              {onPick && <span className="check">{on ? '✓' : ''}</span>}
            </li>
          );
        })}
      </ul>
      {list.length > 120 && <p className="muted pad">결과가 많아요. 검색어를 더 입력해 보세요. ({list.length}개)</p>}
      {list.length === 0 && <p className="muted pad">찾는 종목이 없나요?</p>}
      <button className="btn ghost block" onClick={() => setCreating(true)}>＋ 내 종목 직접 만들기</button>
      {creating && <CustomExerciseForm initialName={q} onClose={() => setCreating(false)} />}
    </div>
  );
}

export function ExercisePicker({ onClose, onDone, title = '종목 추가' }: { onClose: () => void; onDone: (ids: string[]) => void; title?: string }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [info, setInfo] = useState<Exercise | null>(null);
  const set = new Set(picked);
  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={<button className="btn primary block" disabled={!picked.length} onClick={() => onDone(picked)}>{picked.length ? `${picked.length}개 추가` : '종목을 선택하세요'}</button>}
    >
      <ExerciseList picked={set} onPick={(e) => setPicked((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]))} onInfo={setInfo} />
      {info && <ExerciseInfo e={info} onClose={() => setInfo(null)} />}
    </Sheet>
  );
}

export function ExerciseInfo({ e, onClose }: { e: Exercise; onClose: () => void }) {
  const row = (codes: Partial<Record<MuscleCode, number>>) =>
    (Object.entries(codes) as [MuscleCode, number][]).map(([m, w]) => <li key={m}>{MUSCLES[m].ko} <span className="muted">{w}세트</span></li>);
  return (
    <Sheet title={e.name} onClose={onClose}>
      <p className="muted">{e.en}{e.aliases.length ? ` · 별칭: ${e.aliases.join(', ')}` : ''}</p>
      <p>장비: {e.equipment} · {CATEGORY_KO[e.category]}</p>
      <div className="two-col">
        <div><h3>주동근</h3><ul className="plain">{row(e.primary)}</ul></div>
        <div><h3>보조근</h3><ul className="plain">{Object.keys(e.secondary).length ? row(e.secondary) : <li className="muted">없음</li>}</ul></div>
      </div>
      <p className="muted small">1세트를 하면 주동근에 1세트, 보조근에 0.5세트로 주간 볼륨이 쌓여요 (Pelland 2026).</p>
      {e.stretch && <p><StretchBadge e={e} /> 근육이 늘어난 위치에서 힘을 받는 운동이에요.</p>}
      {e.reps && <p>추천 반복: {e.reps[0]}–{e.reps[1]}회 · 증량 단위: {e.increment}kg</p>}
      {e.evidence && <p className="small">근거: {e.evidence}</p>}
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
    <Sheet title="내 종목 만들기" onClose={onClose} footer={<button className="btn primary block" disabled={!name.trim() || !Object.values(roles).includes(1)} onClick={save}>저장</button>}>
      <label className="field">이름<input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 헤머 아이소 로우" /></label>
      <label className="field">부위
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {Object.entries(CATEGORY_KO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label className="field">장비<input value={equipment} onChange={(e) => setEquipment(e.target.value)} /></label>
      <label className="field">기록 방식
        <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
          <option value="weight_reps">무게 × 반복</option>
          <option value="bodyweight">맨몸 반복 (+추가 중량)</option>
          <option value="assisted">보조 머신 (보조 무게 × 반복)</option>
          <option value="hold">버티기 (초)</option>
          <option value="carry">무게 × 거리</option>
          <option value="cardio">유산소 (분 · km)</option>
        </select>
      </label>
      <h3>자극 부위 <span className="muted small">한 번 누르면 주동근(1), 두 번 보조근(0.5), 세 번 해제</span></h3>
      <div className="chip-grid">
        {MUSCLE_ORDER.map((m) => (
          <button key={m} className={`chip-btn ${roles[m] === 1 ? 'p' : roles[m] === 0.5 ? 's' : ''}`} onClick={() => cycle(m)}>
            {MUSCLES[m].ko}{roles[m] ? ` ${roles[m]}` : ''}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
