import { db } from '../db';
import type { Exercise, Routine, Session, SessionEntry, SetLog } from '../types';
import { defaultRest } from './exercises';
import { makeItem, uid } from './routines';

export const emptySet = (): SetLog => ({ weight: null, reps: null, rir: null, seconds: null, distance: null, done: false, warmup: false });

export async function getActive() {
  return (await db.sessions.toArray()).find((s) => !s.endedAt) ?? null;
}

/** at: 지난 날짜에 기록할 때 그 날짜(로컬 자정 기준). 없으면 지금 시작 */
export async function startSession(r: Routine | null, at?: number): Promise<number> {
  const entries: SessionEntry[] = (r?.items ?? []).map((it) => ({
    uid: uid(), exerciseId: it.exerciseId, repMin: it.repMin, repMax: it.repMax, restSec: it.restSec,
    sets: Array.from({ length: it.sets }, emptySet),
  }));
  const backfill = at != null && !isToday(at);
  const startedAt = backfill ? at + 18 * 3600000 : Date.now(); // 지난 날짜는 저녁 6시로 기록
  return db.sessions.add({ routineId: r?.id ?? null, routineName: r?.name ?? '자유 운동', startedAt, endedAt: null, entries, backfill });
}

export function isToday(t: number) {
  const a = new Date(t), b = new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** 완료된 기록을 다시 열어 수정 */
export async function reopenSession(s: Session) {
  await db.sessions.update(s.id!, { endedAt: null, prevEndedAt: s.endedAt ?? undefined });
}

export function finishedAt(s: Session) {
  if (s.prevEndedAt) return s.prevEndedAt;
  if (s.backfill) return s.startedAt + 3600000;
  return Date.now();
}

export function entryFor(e: Exercise): SessionEntry {
  const it = makeItem(e);
  return { uid: uid(), exerciseId: e.id, repMin: it.repMin, repMax: it.repMax, restSec: defaultRest(e), sets: Array.from({ length: 3 }, emptySet) };
}

export function sessionStats(s: Session) {
  let sets = 0, volume = 0;
  for (const en of s.entries) for (const x of en.sets) if (x.done && !x.warmup) { sets++; volume += (x.weight ?? 0) * (x.reps ?? 0); }
  const end = s.endedAt ?? Date.now();
  const minutes = s.backfill ? null : Math.round((end - s.startedAt) / 60000);
  return { sets, volume: Math.round(volume), minutes };
}
