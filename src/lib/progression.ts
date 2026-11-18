import type { Exercise, Goal, Level, Session, SessionEntry, SetLog, Settings } from '../types';
import { incrementFor } from './equipment';
import { isCompound } from './exercises';
import { e1rmOf, roundTo, weightFor } from './strength';

/** @deprecated e1rmOf 사용. RIR 없는 단순 Epley(10회 이하) */
export function e1rm(weight: number, reps: number) {
  return e1rmOf({ weight, reps, rir: null });
}

export function workingSets(entry: SessionEntry): SetLog[] {
  return entry.sets.filter((s) => s.done && !s.warmup);
}

/** before 시점 이전의 가장 최근 기록 */
export function lastEntryFor(sessions: Session[], exerciseId: string, before = Infinity, excludeId?: number) {
  const sorted = sessions.filter((s) => s.endedAt && s.id !== excludeId && s.startedAt < before).sort((a, b) => b.startedAt - a.startedAt);
  for (const s of sorted) {
    const en = s.entries.find((e) => e.exerciseId === exerciseId && workingSets(e).length);
    if (en) return { session: s, entry: en };
  }
  return null;
}

export interface Suggestion {
  weight: number | null;
  reps: number;
  note: string;
  kind: 'start' | 'increase' | 'reps' | 'hold';
  /** 무게 종목: 지난번 추정 1RM → 이번 목표 추정 1RM */
  e1rmFrom?: number;
  e1rmTo?: number;
  rir?: number;
}

export type ProgressOpts = { goal: Goal; level: Level } & Partial<Pick<Settings, 'plateSide' | 'dumbbellStep' | 'machineStep' | 'cableStep' | 'barKg' | 'barPrefs' | 'targetRir'>>;

/**
 * 목표별 "근비대·근력에 효과적인 구간"
 * - 근비대: 6–12회, 실패 1–2회 전(RIR 2). 1RM의 약 30–85%면 실패 근처에서 근비대가 비슷하고(Lopez 2021),
 *   1–2 RIR은 실패까지 한 것과 근성장이 같았다(Refalo 2024). 6–12회는 그중 시간·피로 효율이 좋은 구간(관행).
 * - 근력: 3–6회, RIR 2 — 무거운 부하가 1RM 향상에 유리(Schoenfeld 2017 JSCR, Lopez 2021)
 */
export const ZONES: Record<Goal, { compound: Zone; isolation: Zone }> = {
  hypertrophy: { compound: { lo: 6, hi: 12, rir: 2 }, isolation: { lo: 8, hi: 20, rir: 2 } },
  strength: { compound: { lo: 3, hi: 6, rir: 2 }, isolation: { lo: 6, hi: 12, rir: 2 } },
  both: { compound: { lo: 5, hi: 10, rir: 2 }, isolation: { lo: 8, hi: 15, rir: 2 } },
};
interface Zone { lo: number; hi: number; rir: number }

/**
 * 세션당 목표 추정 1RM 상승률 — 코칭 관행값(연구로 정해진 수치 아님).
 * 초보는 빠르게, 숙련될수록 느리게 오른다(Ahtiainen 2003 등 훈련 경력에 따른 둔화).
 */
export const SESSION_GAIN: Record<Level, number> = { beginner: 0.025, intermediate: 0.0125, advanced: 0.006 };

const e1 = (w: number, reps: number, rir: number) => w * (1 + (reps + rir) / 30);
export const fmt1 = (n: number) => (n < 30 ? (Math.round(n * 10) / 10).toString() : Math.round(n).toString());

/**
 * 다음 세션 무게·반복 추천 (추정 1RM 기반 자동 조절)
 * 1) 지난번 작업 세트들로 추정 1RM을 구한다(RIR 보정 Epley)
 * 2) 경력별 상승률만큼 높인 목표 1RM을 잡는다
 * 3) 목표 구간(근비대 6–12회 @RIR2 등) 안의 [무게 × 반복] 후보 중
 *    목표 1RM을 넘는 가장 작은 진전을 고른다 — 너무 큰 점프를 피하고, 무게든 반복이든 실제로 가능한 칸만 올림
 *    (Plotkin 2022: 무게를 올리든 반복을 올리든 근비대 효과는 같다)
 */
export function suggestNext(ex: Exercise, repMin: number, repMax: number, last: SessionEntry | null, knownE1rm = 0, opts: ProgressOpts = { goal: 'hypertrophy', level: 'beginner' }): Suggestion {
  // 고립 운동은 가벼운 무게·높은 반복이 관절 부담이 적고 근비대 효과는 비슷(Lopez 2021: 30–85% 1RM)
  // 세트 강도는 프로필 설정(기본: 실패까지 = RIR 0). 실패까지 해도, 1–2회 남겨도 근비대는 비슷(Refalo 2024)
  const tRir = opts.targetRir ?? 0;
  const zone = { ...(isCompound(ex) ? ZONES[opts.goal].compound : ZONES[opts.goal].isolation), rir: tRir };
  // RIR을 안 적은 세트는 평소 하는 강도(설정값)로 했다고 본다
  const rirOr = (r: number | null) => (r == null ? tRir : Math.min(r, 4));
  // 내 헬스장 장비로 실제 올릴 수 있는 최소 단위 (바벨이면 가장 작은 원판 × 양쪽)
  const step = incrementFor(ex, opts);
  if (!last) {
    if (knownE1rm > 0 && ex.metric === 'weight_reps') {
      const reps = Math.round((zone.lo + zone.hi) / 2);
      const w = roundTo(weightFor(knownE1rm, reps, zone.rir), step);
      return { weight: w, reps, rir: zone.rir, e1rmFrom: knownE1rm, e1rmTo: knownE1rm, note: `추정 1RM ${Math.round(knownE1rm)}kg 기준으로 계산한 시작 무게예요`, kind: 'start' };
    }
    return { weight: null, reps: Math.round((zone.lo + zone.hi) / 2), note: tRir === 0 ? '첫 기록이에요. 이 횟수 근처에서 더는 못 들 정도의 무게로 해보세요' : '첫 기록이에요. 1–2개 더 할 수 있을 정도의 무게로 해보세요', kind: 'start' };
  }
  const ws = workingSets(last);
  const top = ws.reduce((m, s) => Math.max(m, s.weight ?? 0), 0);
  const topSets = ws.filter((s) => (s.weight ?? 0) === top);
  const minReps = Math.min(...topSets.map((s) => s.reps ?? s.seconds ?? 0));
  if (ex.metric === 'bodyweight' || ex.metric === 'hold' || ex.metric === 'cardio' || ex.metric === 'carry') {
    return { weight: top || null, reps: minReps + 1, note: ex.metric === 'hold' ? '지난번보다 5초 더 버텨보세요' : '지난번보다 1회 더 해보세요', kind: 'reps' };
  }
  if (ex.metric === 'assisted') {
    if (minReps >= repMax) return { weight: Math.max(0, top - step), reps: repMin, note: `보조 무게를 ${step}kg 줄여보세요`, kind: 'increase' };
    return { weight: top, reps: minReps + 1, note: '같은 보조 무게로 1회 더', kind: 'reps' };
  }
  // ── 무게 × 반복 종목: 추정 1RM 기반 ──
  void repMin; void repMax;
  const inc = step;
  // 지난번 추정 1RM: 작업 세트들의 RIR 보정 e1RM 중 최고(12회 초과 환산은 오차가 커서 제외)
  let cur = 0;
  for (const x of ws) {
    const w = x.weight ?? 0, r = x.reps ?? 0;
    // 고반복은 절대값 오차가 크지만, 같은 공식으로 전후를 비교하므로 진전 판단에는 쓸 수 있다
    if (w <= 0 || r <= 0 || r + rirOr(x.rir) > 24) continue;
    cur = Math.max(cur, e1(w, r, rirOr(x.rir)));
  }
  if (!cur) return { weight: top || null, reps: minReps + 1, note: '지난번보다 1회 더 해보세요', kind: 'reps' };

  const target = cur * (1 + SESSION_GAIN[opts.level]);
  const lastReps = Math.round(topSets.reduce((s, x) => s + (x.reps ?? 0), 0) / topSets.length);
  const prefer = Math.min(zone.hi, Math.max(zone.lo, lastReps));
  // 후보: 지난 무게 −1칸 ~ +3칸, 반복은 목표 구간 전체
  let best: { w: number; r: number; v: number; score: number } | null = null;
  for (let k = -1; k <= 3; k++) {
    // 지난번 무게에서 장비 단위만큼 더하고 빼서 실제로 만들 수 있는 무게만 후보로 쓴다
    const w = Math.round((top + k * inc) * 100) / 100;
    if (w <= 0) continue;
    for (let r = zone.lo; r <= zone.hi; r++) {
      const v = e1(w, r, zone.rir);
      if (v < target) continue;
      // 목표를 가장 적게 넘는 것 우선, 같으면 지난번 반복수에 가까운 것
      const score = (v - target) / target + Math.abs(r - prefer) * 0.008;
      if (!best || score < best.score) best = { w, r, v, score };
    }
  }
  if (!best) best = { w: top + inc, r: zone.lo, v: e1(top + inc, zone.lo, zone.rir), score: 0 };

  const pct = ((best.v / cur - 1) * 100).toFixed(1);
  const why = lastReps > zone.hi ? `반복이 많아서 효과 구간(${zone.lo}–${zone.hi}회)으로 무게를 올렸어요. `
    : lastReps < zone.lo ? `반복이 적어서 효과 구간(${zone.lo}–${zone.hi}회)으로 맞췄어요. ` : '';
  const kind: Suggestion['kind'] = best.w > top ? 'increase' : 'reps';
  return {
    weight: best.w, reps: best.r, rir: zone.rir, e1rmFrom: Math.round(cur * 10) / 10, e1rmTo: Math.round(best.v * 10) / 10, kind,
    note: `${why}추정 1RM ${fmt1(cur)} → ${fmt1(best.v)}kg(+${pct}%)이 되는 가장 작은 진전이에요.`,
  };
}

/** 최근 3번 기록에서 e1RM이 오르지 않으면 정체 */
export function isStalled(sessions: Session[], exerciseId: string, before = Infinity) {
  const vals: number[] = [];
  const sorted = sessions.filter((s) => s.endedAt && s.startedAt < before).sort((a, b) => b.startedAt - a.startedAt);
  for (const s of sorted) {
    const en = s.entries.find((e) => e.exerciseId === exerciseId);
    if (!en) continue;
    const best = Math.max(0, ...workingSets(en).map((x) => e1rmOf(x) ?? 0));
    if (best) vals.push(best);
    if (vals.length === 3) break;
  }
  return vals.length === 3 && vals[0] <= vals[2];
}
