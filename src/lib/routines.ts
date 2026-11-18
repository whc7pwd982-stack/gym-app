import { db } from '../db';
import type { Exercise, Goal, Routine, RoutineItem } from '../types';
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
  return { uid: uid(), exerciseId: e.id, sets, repMin, repMax, restSec: defaultRest(e) };
}

export async function nextRoutineName() {
  const all = await db.routines.toArray();
  let n = all.length + 1;
  while (all.some((r) => r.name === `루틴${n}`)) n++;
  return `루틴${n}`;
}

export async function createRoutine(name?: string): Promise<number> {
  const count = await db.routines.count();
  return db.routines.add({ name: name ?? (await nextRoutineName()), timesPerWeek: 1, items: [], order: count, createdAt: Date.now() });
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
