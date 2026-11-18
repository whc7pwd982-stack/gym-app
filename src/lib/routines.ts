import { db } from '../db';
import type { Exercise, Routine, RoutineItem } from '../types';
import { defaultRest, isCompound } from './exercises';
import type { Template } from '../data/templates';

export const uid = () => Math.random().toString(36).slice(2, 10);

export function makeItem(e: Exercise, sets = 3): RoutineItem {
  let [repMin, repMax] = e.reps ?? [8, 12];
  if (e.metric === 'weight_reps' || e.metric === 'assisted') {
    // 보고서 기본: 다관절 6–10, 고립 10–15 범위 안으로 맞춤
    const [lo, hi] = isCompound(e) ? [6, 10] : [10, 15];
    repMin = Math.max(repMin, lo);
    repMax = Math.min(Math.max(repMax, repMin + 2), hi);
    if (repMin >= repMax) repMin = repMax - 2;
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
