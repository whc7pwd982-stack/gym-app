import type { Exercise, Settings } from '../types';

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

/** 이 종목에서 한 번에 올릴 수 있는 최소 무게(총합 kg) */
export function incrementFor(e: Exercise, s: Partial<Pick<Settings, 'plateSide' | 'dumbbellStep' | 'machineStep' | 'cableStep'>>) {
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

/** 봉을 쓰는 바벨 종목(원판 머신·EZ바 제외) */
export function usesOlympicBar(e: Exercise) {
  return /바벨/.test(e.equipment) && !/EZ/.test(e.equipment) && equipType(e) === 'plate';
}
