import type { Exercise, Routine, Session, SessionEntry, SetLog } from '../types';
import { realWeight, volumeFactor } from './equipment';
import { BUILTIN, defaultRest } from './exercises';
import { makeItem, planOf, uid } from './routines';

export const emptySet = (): SetLog => ({ weight: null, reps: null, rir: null, seconds: null, distance: null, done: false, warmup: false });

export const noon = (dayStart: number) => dayStart + 12 * 3600000;
export function dayStartOf(t: number) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
export function dateKey(t: number) { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

/** 날짜에 루틴으로 새 기록 초안 만들기 (DB에는 [저장]할 때 들어간다) */
export function draftLog(day: number, r: Routine | null): Session {
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
  return { routineId: r?.id ?? null, routineName: r?.name ?? '자유 운동', startedAt: t, endedAt: t, entries };
}

export function entryFor(e: Exercise): SessionEntry {
  const it = makeItem(e);
  return { uid: uid(), exerciseId: e.id, repMin: it.repMin, repMax: it.repMax, restSec: defaultRest(e), sets: Array.from({ length: 3 }, emptySet) };
}

/** 입력된 값이 있으면 완료한 세트로 본다 */
export function isFilled(x: SetLog) {
  return (x.reps ?? 0) > 0 || (x.seconds ?? 0) > 0 || (x.distance ?? 0) > 0;
}

const BUILTIN_MAP = new Map(BUILTIN.map((e) => [e.id, e]));

/** 볼륨은 저장된 숫자로 그때그때 계산한다(양손 덤벨은 ×2) — 그래서 예전 기록·백업도 자동으로 같은 기준이 된다 */
export function sessionStats(s: Session, map: Map<string, Exercise> = BUILTIN_MAP, smithBarKg = 10) {
  let sets = 0, volume = 0;
  const ex = new Set<string>();
  for (const en of s.entries) {
    const e = map.get(en.exerciseId);
    const f = volumeFactor(e);
    for (const x of en.sets) if (x.done && !x.warmup) { sets++; volume += realWeight(e, x.weight ?? 0, smithBarKg) * (x.reps ?? 0) * f; ex.add(en.exerciseId); }
  }
  return { sets, volume: Math.round(volume), exercises: ex.size };
}
