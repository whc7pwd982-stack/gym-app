import type { Exercise, Session, SetLog } from '../types';

/**
 * 추정 1RM (e1RM)
 * - Epley 공식: 1RM = w × (1 + reps/30)  (Reynolds 2006: 10회 이하에서 정확)
 * - RIR을 적었다면 "실패까지 가능했던 반복수" = reps + RIR 로 보정 (Zourdos 2016, Helms 2016의 RIR 기반 RPE 개념)
 * - 보정 후 12회를 넘는 세트는 오차가 커서 제외
 */
export function e1rmOf(s: Pick<SetLog, 'weight' | 'reps' | 'rir'>): number | null {
  const w = s.weight ?? 0, r = s.reps ?? 0;
  if (w <= 0 || r <= 0) return null;
  const eff = r + Math.min(s.rir ?? 0, 4);
  if (eff > 12) return null;
  return eff === 1 ? w : w * (1 + eff / 30);
}

/** e1RM에서 "reps회를 RIR rir로" 할 무게 */
export function weightFor(e1rm: number, reps: number, rir = 2) {
  const eff = reps + rir;
  return eff <= 1 ? e1rm : e1rm / (1 + eff / 30);
}

export function roundTo(w: number, step: number) {
  const s = step > 0 ? step : 2.5;
  return Math.max(0, Math.round(w / s) * s);
}

/** 반복수별 예상 최대 무게(nRM) 표 */
export function rmTable(e1rm: number, step: number, reps = [1, 3, 5, 8, 10, 12]) {
  return reps.map((r) => ({ reps: r, kg: r === 1 ? Math.round(e1rm * 2) / 2 : roundTo(weightFor(e1rm, r, 0), Math.min(step, 2.5)) }));
}

export function workingSetsOf(sets: SetLog[]) {
  return sets.filter((x) => x.done && !x.warmup);
}

/** 기록 하나에서 종목별 최고 e1RM */
export function bestE1rmIn(session: Session, exerciseId: string) {
  let best = 0;
  for (const en of session.entries) if (en.exerciseId === exerciseId) for (const x of workingSetsOf(en.sets)) best = Math.max(best, e1rmOf(x) ?? 0);
  return best;
}

export interface E1rmPoint { t: number; e1rm: number; top: string }

/** 종목의 날짜별 최고 e1RM (오래된 순) */
export function e1rmSeries(sessions: Session[], exerciseId: string): E1rmPoint[] {
  const pts: E1rmPoint[] = [];
  for (const s of [...sessions].filter((x) => x.endedAt).sort((a, b) => a.startedAt - b.startedAt)) {
    let best = 0, top = '';
    for (const en of s.entries) if (en.exerciseId === exerciseId) for (const x of workingSetsOf(en.sets)) {
      const v = e1rmOf(x) ?? 0;
      if (v > best) { best = v; top = `${x.weight}kg × ${x.reps}${x.rir != null ? ` @RIR${x.rir}` : ''}`; }
    }
    if (best) pts.push({ t: s.startedAt, e1rm: Math.round(best * 10) / 10, top });
  }
  return pts;
}

/** 이전 기록들의 최고 e1RM (before 시점 이전) */
export function bestBefore(sessions: Session[], exerciseId: string, before: number, excludeId?: number) {
  let best = 0;
  for (const s of sessions) if (s.endedAt && s.startedAt < before && s.id !== excludeId) best = Math.max(best, bestE1rmIn(s, exerciseId));
  return best;
}

/** 체중 대비 배수가 의미 있는 대표 리프트 */
export const BIG_LIFTS: Record<string, string> = {
  ex1: '벤치프레스', ex149: '스쿼트', ex183: '데드리프트', ex30: '오버헤드 프레스',
};

export function canE1rm(e: Exercise) {
  return e.metric === 'weight_reps';
}
