import { db } from '../db';
import type { Exercise, Goal, PlanSet, Routine, RoutineItem, Session } from '../types';
import { defaultRest, isCompound } from './exercises';
import type { Template } from '../data/templates';

export const uid = () => Math.random().toString(36).slice(2, 10);

/** 목표별 기본 반복 범위. 근비대는 5–30회 어디서든 실패 근처면 비슷(Lopez 2021), 근력은 무거운 쪽이 유리(Schoenfeld 2017) */
const REP_RANGES: Record<Goal, { compound: [number, number]; isolation: [number, number] }> = {
  hypertrophy: { compound: [6, 10], isolation: [10, 15] },
  strength: { compound: [3, 6], isolation: [8, 12] },
  both: { compound: [5, 8], isolation: [8, 12] },
};

export function makeItem(e: Exercise, sets = 3, goal: Goal = 'hypertrophy'): RoutineItem {
  let [repMin, repMax] = e.reps ?? [8, 12];
  if (e.metric === 'weight_reps' || e.metric === 'assisted') {
    [repMin, repMax] = isCompound(e) ? REP_RANGES[goal].compound : REP_RANGES[goal].isolation;
  }
  if (e.metric === 'hold') [repMin, repMax] = [20, 60];
  if (e.metric === 'cardio') [repMin, repMax] = [10, 30];
  const mid = Math.round((repMin + repMax) / 2);
  const one: PlanSet = e.metric === 'hold' ? { weight: null, reps: null, seconds: 30 }
    : e.metric === 'cardio' ? { weight: null, reps: null, seconds: 20 * 60 }
    : { weight: null, reps: mid };
  return { uid: uid(), exerciseId: e.id, sets, plan: Array.from({ length: sets }, () => ({ ...one })), repMin, repMax, restSec: defaultRest(e) };
}

/** 저장된 세트 계획 (예전 데이터는 세트 수만 있으므로 빈 세트로 채움) */
export function planOf(it: RoutineItem): PlanSet[] {
  if (it.plan && it.plan.length) return it.plan;
  return Array.from({ length: Math.max(1, it.sets) }, () => ({ weight: null, reps: null }));
}

/**
 * 기록을 저장하면 그 루틴의 같은 종목을 방금 기록한 값(워밍업 제외)으로 갱신해서
 * 다음에 루틴을 불러올 때 가장 최근 값이 채워지게 한다.
 */
export async function writeBackToRoutine(s: Session) {
  if (s.routineId == null) return;
  const r = await db.routines.get(s.routineId);
  if (!r) return;
  let changed = false;
  const items = r.items.map((it) => {
    const en = s.entries.find((e) => e.exerciseId === it.exerciseId);
    const sets = en?.sets.filter((x) => x.done && !x.warmup) ?? [];
    if (!sets.length) return it;
    changed = true;
    const plan = sets.map((x) => ({ weight: x.weight, reps: x.reps, seconds: x.seconds, distance: x.distance }));
    return { ...it, plan, sets: plan.length };
  });
  if (changed) await db.routines.update(r.id!, { items });
}

export async function nextRoutineName() {
  const all = await db.routines.toArray();
  let n = all.length + 1;
  while (all.some((r) => r.name === `루틴${n}`)) n++;
  return `루틴${n}`;
}

/** 새 루틴 초안 (DB에는 [저장]할 때 들어간다) */
export async function draftRoutine(): Promise<Routine> {
  const count = await db.routines.count();
  return { name: await nextRoutineName(), timesPerWeek: 1, items: [], order: count, createdAt: Date.now() };
}

export async function applyTemplate(t: Template, list: Exercise[]) {
  const byName = new Map(list.map((e) => [e.name, e]));
  let order = await db.routines.count();
  for (const r of t.routines) {
    const items = r.items.flatMap(([n, sets]) => { const e = byName.get(n); return e ? [makeItem(e, sets)] : []; });
    await db.routines.add({ name: r.name, timesPerWeek: r.timesPerWeek, items, order: order++, createdAt: Date.now() } as Routine);
  }
}

export function move<T>(arr: T[], from: number, to: number) {
  const a = [...arr];
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x);
  return a;
}
