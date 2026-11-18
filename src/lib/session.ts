import { db } from '../db';
import type { Exercise, Routine, Session, SessionEntry, SetLog } from '../types';
import { defaultRest } from './exercises';
import { makeItem, planOf, uid } from './routines';

export const emptySet = (): SetLog => ({ weight: null, reps: null, rir: null, seconds: null, distance: null, done: false, warmup: false });

export const noon = (dayStart: number) => dayStart + 12 * 3600000;
export function dayStartOf(t: number) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
export function dateKey(t: number) { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

/** 날짜에 루틴으로 기록 만들기 (종목·세트 수를 루틴에서 미리 채움) */
export async function createLog(day: number, r: Routine | null): Promise<number> {
  // 루틴에 정해 둔 무게·반복을 그대로 채운다(입력된 세트는 한 것으로 표시). 기록 화면에서 바꾸면 된다
  const entries: SessionEntry[] = (r?.items ?? []).map((it) => ({
    uid: uid(), exerciseId: it.exerciseId, repMin: it.repMin, repMax: it.repMax, restSec: it.restSec,
    sets: planOf(it).map((p) => {
      const x: SetLog = { ...emptySet(), weight: p.weight ?? null, reps: p.reps ?? null, seconds: p.seconds ?? null, distance: p.distance ?? null };
      x.done = isFilled(x);
      return x;
    }),
  }));
  const t = noon(dayStartOf(day));
  return db.sessions.add({ routineId: r?.id ?? null, routineName: r?.name ?? '자유 운동', startedAt: t, endedAt: t, entries });
}

export function entryFor(e: Exercise): SessionEntry {
  const it = makeItem(e);
  return { uid: uid(), exerciseId: e.id, repMin: it.repMin, repMax: it.repMax, restSec: defaultRest(e), sets: Array.from({ length: 3 }, emptySet) };
}

/** 입력된 값이 있으면 완료한 세트로 본다 */
export function isFilled(x: SetLog) {
  return (x.reps ?? 0) > 0 || (x.seconds ?? 0) > 0 || (x.distance ?? 0) > 0;
}

export function sessionStats(s: Session) {
  let sets = 0, volume = 0;
  const ex = new Set<string>();
  for (const en of s.entries) for (const x of en.sets) if (x.done && !x.warmup) { sets++; volume += (x.weight ?? 0) * (x.reps ?? 0); ex.add(en.exerciseId); }
  return { sets, volume: Math.round(volume), exercises: ex.size };
}
