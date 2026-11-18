import type { Exercise, Session, SessionEntry, SetLog } from '../types';
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
}

/**
 * 더블 프로그레션 (Plotkin 2022: 반복 추가와 무게 추가 모두 근성장에 유효)
 * - 모든 작업 세트가 반복 상한 도달 → 무게 증가
 * - 아니면 같은 무게로 반복 +1
 * - 기록이 없고 다른 종목/이전 e1RM이 있으면 e1RM으로 시작 무게 제안
 */
export function suggestNext(ex: Exercise, repMin: number, repMax: number, last: SessionEntry | null, knownE1rm = 0): Suggestion {
  if (!last) {
    if (knownE1rm > 0 && ex.metric === 'weight_reps') {
      const w = roundTo(weightFor(knownE1rm, repMin, 2), ex.increment);
      return { weight: w, reps: repMin, note: `추정 1RM 기준으로 ${repMin}회를 2개 남기고 할 수 있는 무게예요`, kind: 'start' };
    }
    return { weight: null, reps: Math.round((repMin + repMax) / 2), note: '첫 기록이에요. 1–2개 더 할 수 있을 정도의 무게로 해보세요', kind: 'start' };
  }
  const ws = workingSets(last);
  const top = ws.reduce((m, s) => Math.max(m, s.weight ?? 0), 0);
  const topSets = ws.filter((s) => (s.weight ?? 0) === top);
  const minReps = Math.min(...topSets.map((s) => s.reps ?? s.seconds ?? 0));
  if (ex.metric === 'bodyweight' || ex.metric === 'hold' || ex.metric === 'cardio' || ex.metric === 'carry') {
    return { weight: top || null, reps: minReps + 1, note: ex.metric === 'hold' ? '지난번보다 5초 더 버텨보세요' : '지난번보다 1회 더 해보세요', kind: 'reps' };
  }
  if (ex.metric === 'assisted') {
    if (minReps >= repMax) return { weight: Math.max(0, top - ex.increment), reps: repMin, note: `보조 무게를 ${ex.increment}kg 줄여보세요`, kind: 'increase' };
    return { weight: top, reps: minReps + 1, note: '같은 보조 무게로 1회 더', kind: 'reps' };
  }
  const rirs = ws.map((x) => x.rir).filter((x): x is number => x != null);
  const easy = rirs.length >= 2 && rirs.every((r) => r >= 4);
  if (minReps >= repMax || easy) {
    const inc = ex.increment || 2.5;
    return {
      weight: top + inc,
      reps: minReps,
      note: easy && minReps < repMax ? `여유가 많았어요(RIR 4+). ${top + inc}kg로 올려보세요` : `지난번 모든 세트를 ${minReps}회 해냈어요 → ${top + inc}kg로 올려요. 횟수가 조금 줄어도 괜찮아요`,
      kind: 'increase',
    };
  }
  const r = Math.min(repMax, minReps + 1);
  return { weight: top, reps: r, note: `${top}kg로 ${r}회 목표. ${repMax}회를 다 채우면 무게를 올려요`, kind: 'reps' };
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
