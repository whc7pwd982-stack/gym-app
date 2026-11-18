import type { BarPref, Exercise, Settings } from '../types';

export type EquipType = 'plate' | 'dumbbell' | 'machine' | 'cable';

const RULES: [EquipType, RegExp][] = [
  ['plate', /바벨|EZ|스미스|트랩바|원판|랜드마인|핵|펜듈럼|레그프레스|벨트스쿼트|티바/],
  ['dumbbell', /덤벨|케틀벨/],
  ['cable', /케이블|풀리/],
  ['machine', /머신|스택/],
];

/** 장비 문자열에서 가장 먼저 나오는 장비 종류로 분류 */
export function equipType(e: Exercise): EquipType {
  let best: EquipType = 'machine', at = Infinity;
  for (const [t, re] of RULES) {
    const m = re.exec(e.equipment);
    if (m && m.index < at) { at = m.index; best = t; }
  }
  return best;
}

export const EQUIP_KO: Record<EquipType, string> = { plate: '바벨·원판', dumbbell: '덤벨', machine: '머신', cable: '케이블' };

type EquipSettings = Partial<Pick<Settings, 'plateSide' | 'dumbbellStep' | 'machineStep' | 'cableStep' | 'barKg' | 'barPrefs'>>;

/** 봉을 골라 쓸 수 있는 종목(바벨·EZ바 종목. 원판 머신·스미스는 제외) */
export function canChooseBar(e: Exercise) {
  return equipType(e) === 'plate' && /바벨|EZ/.test(e.equipment) && !/스미스/.test(e.equipment.split(/[/·+]/)[0]);
}

/** 이 종목의 봉 설정. 따로 정하지 않았으면 바벨은 프로필의 봉 무게, EZ바는 10kg으로 가정 */
export function barPrefFor(e: Exercise, s: EquipSettings): BarPref | null {
  if (!canChooseBar(e)) return null;
  const saved = s.barPrefs?.[e.id];
  if (saved) return saved;
  if (/EZ/.test(e.equipment) && !/^바벨/.test(e.equipment)) return { kind: 'bar', kg: 10, label: 'EZ바' };
  return { kind: 'bar', kg: s.barKg ?? 20 };
}

export const BAR_OPTIONS: { pref: BarPref; title: string; sub: string }[] = [
  { pref: { kind: 'bar', kg: 20 }, title: '20kg 봉', sub: '올림픽 바벨 + 원판' },
  { pref: { kind: 'bar', kg: 15 }, title: '15kg 봉', sub: '여성용·짧은 바벨 + 원판' },
  { pref: { kind: 'bar', kg: 10, label: 'EZ바' }, title: 'EZ바 (약 10kg)', sub: '굽은 봉 + 원판' },
  { pref: { kind: 'fixed', step: 2.5 }, title: '고정 바벨 · 2.5kg 간격', sub: '무게가 정해진 바벨 (10, 12.5, 15…)' },
  { pref: { kind: 'fixed', step: 5 }, title: '고정 바벨 · 5kg 간격', sub: '무게가 정해진 바벨 (10, 15, 20…)' },
];

export function barLabel(p: BarPref) {
  return p.kind === 'fixed' ? `고정 바벨 ${p.step}kg 간격` : `${p.label ?? ''}${p.label ? ' ' : ''}${p.kg}kg 봉`;
}

/** 이 종목에서 한 번에 올릴 수 있는 최소 무게(총합 kg) */
export function incrementFor(e: Exercise, s: EquipSettings) {
  const bar = barPrefFor(e, s);
  if (bar?.kind === 'fixed') return bar.step;
  switch (equipType(e)) {
    case 'plate': return (s.plateSide ?? 2.5) * 2; // 양쪽에 한 장씩
    case 'dumbbell': return s.dumbbellStep ?? 2;
    case 'cable': return s.cableStep ?? 2.5;
    default: return s.machineStep ?? 5;
  }
}

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

/** 바벨 무게 → 한쪽에 끼울 원판 조합 (봉 무게 제외). 못 맞추면 null */
export function platesPerSide(total: number, bar: number): number[] | null {
  let side = (total - bar) / 2;
  if (side < 0) return null;
  const out: number[] = [];
  for (const p of PLATES) while (side >= p - 1e-9) { out.push(p); side -= p; }
  return Math.abs(side) < 1e-6 ? out : null;
}
