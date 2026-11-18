import type { Exercise, Session, SessionEntry, SetLog } from '../types';

/** Epley e1RM — 10회 이하 세트만 (Reynolds 2006 권고) */
export function e1rm(weight: number, reps: number) {
  if (!weight || !reps || reps > 10) return null;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export function workingSets(entry: SessionEntry): SetLog[] {
  return entry.sets.filter((s) => s.done && !s.warmup);
}

export function lastEntryFor(sessions: Session[], exerciseId: string, excludeId?: number) {
  const sorted = [...sessions].filter((s) => s.endedAt && s.id !== excludeId).sort((a, b) => b.startedAt - a.startedAt);
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
}

/** 더블 프로그레션: 모든 작업 세트가 반복 상한을 채우면 증량, 아니면 같은 무게로 반복 +1 */
export function suggestNext(ex: Exercise, repMin: number, repMax: number, last: SessionEntry | null): Suggestion {
  if (!last) return { weight: null, reps: repMin, note: `처음이에요. ${repMin}–${repMax}회를 RIR 1–2로 할 수 있는 무게를 찾아보세요`, kind: 'start' };
  const ws = workingSets(last);
  const top = ws.reduce((m, s) => Math.max(m, s.weight ?? 0), 0);
  const topSets = ws.filter((s) => (s.weight ?? 0) === top);
  const minReps = Math.min(...topSets.map((s) => s.reps ?? 0));
  if (ex.metric === 'bodyweight' || ex.metric === 'hold' || ex.metric === 'cardio' || ex.metric === 'carry') {
    return { weight: top || null, reps: minReps + 1, note: '지난번보다 1회(또는 몇 초) 더 해보세요', kind: 'reps' };
  }
  if (ex.metric === 'assisted') {
    if (minReps >= repMax) return { weight: Math.max(0, top - ex.increment), reps: repMin, note: `보조 무게를 ${ex.increment}kg 줄여보세요`, kind: 'increase' };
    return { weight: top, reps: minReps + 1, note: '같은 보조로 1회 더', kind: 'reps' };
  }
  if (minReps >= repMax) {
    const inc = ex.increment || 2.5;
    const next = top + inc;
    // 가벼운 무게에서 증량폭이 10%를 넘으면 반복 상한을 늘리라고 안내
    const big = top > 0 && inc / top > 0.1;
    return {
      weight: next,
      reps: repMin,
      note: big ? `+${inc}kg는 큰 점프예요. 어렵다면 ${top}kg로 ${repMax + 2}회까지 늘린 뒤 올려도 돼요` : `모든 세트 ${repMax}회 달성! +${inc}kg로 올려요`,
      kind: 'increase',
    };
  }
  return { weight: top, reps: Math.min(repMax, minReps + 1), note: `같은 무게로 ${Math.min(repMax, minReps + 1)}회를 목표로`, kind: 'reps' };
}

/** 최근 3회 기록에서 e1RM이 오르지 않으면 정체 */
export function isStalled(sessions: Session[], exerciseId: string) {
  const vals: number[] = [];
  const sorted = [...sessions].filter((s) => s.endedAt).sort((a, b) => b.startedAt - a.startedAt);
  for (const s of sorted) {
    const en = s.entries.find((e) => e.exerciseId === exerciseId);
    if (!en) continue;
    const best = Math.max(0, ...workingSets(en).map((x) => e1rm(x.weight ?? 0, x.reps ?? 0) ?? 0));
    if (best) vals.push(best);
    if (vals.length === 3) break;
  }
  return vals.length === 3 && vals[0] <= vals[2];
}
