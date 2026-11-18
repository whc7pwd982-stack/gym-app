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

/** 스미스 머신 종목: 이름에 스미스가 있거나 장비가 스미스로 시작 */
export function isSmith(e: Exercise) {
  return /스미스/.test(e.name) || /^스미스/.test(e.equipment);
}

/**
 * 스미스는 프리 바벨처럼 "봉 20kg + 원판"으로 입력받고, 실제 무게는
 * 20kg 대신 스미스 봉의 체감 무게(설정값, 기본 10kg)로 바꿔 계산한다.
 * 스미스 봉은 기종마다 달라(카운터밸런스 여부) 정해진 값이 없으므로 설정에서 바꿀 수 있게 한다.
 */
export function realWeight(e: Exercise | undefined, w: number, smithBarKg = 10) {
  if (!e || !isSmith(e) || w <= 0) return w;
  return Math.max(0, w - 20 + smithBarKg);
}

/** 덤벨 하나만 드는 종목(한 팔씩·덤벨 1개 사용) */
const ONE_DB = /원암|싱글암|싱글 암|컨센트레이션|고블릿|풀오버|사이드 벤드|사이드라잉|싱글 레그|티바|크록|덤벨 오버헤드 익스텐션/;

/**
 * 양손에 덤벨을 하나씩 드는 종목인가 — 무게는 "한 손(덤벨 1개)" 기준으로 적고, 볼륨은 ×2.
 * 바벨/덤벨 겸용 종목은 장비 문자열에서 덤벨이 먼저 나올 때만 해당.
 */
export function isPairedDumbbell(e: Exercise) {
  return equipType(e) === 'dumbbell' && /덤벨/.test(e.equipment) && !ONE_DB.test(e.name);
}

/** 볼륨(무게×반복) 계산 배수 */
export function volumeFactor(e?: Exercise) {
  return e && isPairedDumbbell(e) ? 2 : 1;
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
