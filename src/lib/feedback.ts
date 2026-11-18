import { MUSCLE_ORDER } from '../data/muscles';
import type { Exercise, MuscleCode, Session } from '../types';
import { credits } from './exercises';
import { isStalled, lastEntryFor, suggestNext, workingSets } from './progression';
import { e1rmOf } from './strength';

/**
 * 점진적 과부하 피드백 — "더 올리는 방향"만 안내한다.
 * 종목: 무게 ↑ / 반복 ↑ / 세트 ↑ (정체 시)
 * 근육별 세트 수는 목표·상한 없이 지난 기간과 비교만 한다.
 */

export type FeedbackKind = 'weight' | 'reps' | 'sets';
export interface ExerciseFeedback {
  exerciseId: string;
  name: string;
  kind: FeedbackKind;
  text: string;
}

const DAY = 86400000;
export const r1 = (n: number) => Math.round(n * 10) / 10;

export function weekStart(t = Date.now()) {
  const x = new Date(t);
  const day = (x.getDay() + 6) % 7; // 월요일 시작
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x.getTime();
}
export function monthStart(t = Date.now()) {
  const x = new Date(t);
  return new Date(x.getFullYear(), x.getMonth(), 1).getTime();
}
export function addMonths(t: number, n: number) {
  const x = new Date(t);
  return new Date(x.getFullYear(), x.getMonth() + n, 1).getTime();
}

export const done = (s: Session[]) => s.filter((x) => x.endedAt);
export const inRange = (s: Session[], from: number, to: number) => done(s).filter((x) => x.startedAt >= from && x.startedAt < to);

/** 기간 내 근육별 실제 세트 (워밍업·RIR 5+ 제외, 보조근 0.5) */
export function muscleSets(sessions: Session[], map: Map<string, Exercise>) {
  const v = Object.fromEntries(MUSCLE_ORDER.map((m) => [m, 0])) as Record<MuscleCode, number>;
  for (const s of sessions) for (const en of s.entries) {
    const e = map.get(en.exerciseId);
    if (!e) continue;
    const n = en.sets.filter((x) => x.done && !x.warmup && (x.rir == null || x.rir <= 4)).length;
    for (const [m, w] of credits(e)) v[m as MuscleCode] += n * w;
  }
  return v;
}

export function exerciseFeedback(all: Session[], map: Map<string, Exercise>, exerciseId: string): ExerciseFeedback | null {
  const ex = map.get(exerciseId);
  const last = lastEntryFor(all, exerciseId);
  if (!ex || !last) return null;
  const en = last.entry;
  const name = ex.name;
  const ws = workingSets(en);
  if (isStalled(all, exerciseId)) {
    return { exerciseId, name, kind: 'sets', text: `최근 3번 기록이 그대로예요. 다음엔 세트를 1개 늘려서(${ws.length}→${ws.length + 1}세트) 총 볼륨을 올려보세요.` };
  }
  const rirs = ws.map((x) => x.rir).filter((x): x is number => x != null);
  const easy = rirs.length >= 2 && rirs.every((r) => r >= 4);
  const sug = suggestNext(ex, en.repMin, en.repMax, en);
  if (easy && (ex.metric === 'weight_reps') && sug.kind !== 'increase') {
    const top = Math.max(0, ...ws.map((x) => x.weight ?? 0));
    return { exerciseId, name, kind: 'weight', text: `모든 세트가 RIR 4 이상으로 여유 있었어요. 다음엔 ${top + ex.increment}kg로 올려보세요.` };
  }
  if (sug.kind === 'increase') {
    return { exerciseId, name, kind: 'weight', text: sug.weight != null ? `지난번 모든 세트를 해냈어요! 다음엔 ${sug.weight}kg로 올려보세요(${sug.reps}회 목표, 조금 줄어도 괜찮아요).` : sug.note };
  }
  if (ex.metric === 'bodyweight' || ex.metric === 'hold' || ex.metric === 'carry' || ex.metric === 'cardio') {
    return { exerciseId, name, kind: 'reps', text: sug.note };
  }
  return { exerciseId, name, kind: 'reps', text: `${sug.weight}kg 그대로, 다음엔 세트마다 ${sug.reps}회를 목표로 해보세요. ${en.repMax}회를 다 채우면 무게를 올려요.` };
}

/** 최근 4주 동안 훈련한 종목 전체의 다음 할 일 */
export function allExerciseFeedback(all: Session[], map: Map<string, Exercise>, since = Date.now() - 28 * DAY) {
  const ids = new Set<string>();
  for (const s of done(all)) if (s.startedAt >= since) for (const en of s.entries) if (workingSets(en).length) ids.add(en.exerciseId);
  return [...ids].map((id) => exerciseFeedback(all, map, id)).filter(Boolean) as ExerciseFeedback[];
}


export interface PeriodSummary {
  count: number;
  sets: number;
  volume: number;
  muscles: Record<MuscleCode, number>;
  prs: { name: string; from: number; to: number }[];
  days: Set<string>;
}

export const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

export function summarize(all: Session[], map: Map<string, Exercise>, from: number, to: number): PeriodSummary {
  const list = inRange(all, from, to);
  let sets = 0, volume = 0;
  const days = new Set<string>();
  for (const s of list) {
    days.add(dayKey(s.startedAt));
    for (const en of s.entries) for (const x of workingSets(en)) { sets++; volume += (x.weight ?? 0) * (x.reps ?? 0); }
  }
  // 기간 내 최고 e1RM이 기간 이전 최고보다 높으면 PR
  const prs: PeriodSummary['prs'] = [];
  const ids = new Set(list.flatMap((s) => s.entries.map((e) => e.exerciseId)));
  for (const id of ids) {
    const best = (ss: Session[]) => Math.max(0, ...ss.flatMap((s) => s.entries.filter((e) => e.exerciseId === id).flatMap((e) => workingSets(e).map((x) => e1rmOf(x) ?? 0))));
    const before = best(done(all).filter((s) => s.startedAt < from));
    const now = best(list);
    if (before && now > before) prs.push({ name: map.get(id)?.name ?? id, from: Math.round(before), to: Math.round(now) });
  }
  return { count: days.size, sets, volume: Math.round(volume), muscles: muscleSets(list, map), prs, days };
}
