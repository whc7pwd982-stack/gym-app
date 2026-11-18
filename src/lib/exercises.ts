import { useLiveQuery } from 'dexie-react-hooks';
import builtin from '../data/exercises.json';
import { db } from '../db';
import type { Exercise } from '../types';

export const BUILTIN = builtin as Exercise[];

export function useExercises(): Exercise[] {
  const custom = useLiveQuery(() => db.customExercises.toArray(), [], []);
  return custom.length ? [...custom, ...BUILTIN] : BUILTIN;
}

export function useExerciseMap(): Map<string, Exercise> {
  const list = useExercises();
  return new Map(list.map((e) => [e.id, e]));
}

const COMPOUND_RE = /프레스|스쿼트|로우|풀업|친업|턱걸이|딥스|데드|런지|풀다운|푸시업|클린|스내치|저크|쓰러스트|스러스터|굿모닝|스텝업|랙풀|스윙|풀스루|힙 익스텐션|겟업/;

/** 다관절(복합) 운동 여부: 이름의 동작 패턴으로 판정, 내 종목은 근육 수로 추정 */
export function isCompound(e: Exercise) {
  if (e.metric === 'cardio' || e.metric === 'hold') return false;
  if (e.custom) return Object.keys(e.primary).length + Object.keys(e.secondary).length >= 3;
  return COMPOUND_RE.test(e.name);
}

export function credits(e: Exercise): [string, number][] {
  return [...Object.entries(e.primary), ...Object.entries(e.secondary)] as [string, number][];
}

export function defaultRest(e: Exercise) {
  if (e.metric === 'cardio') return 60;
  return isCompound(e) ? 150 : 90;
}

export function findByName(list: Exercise[], name: string) {
  return list.find((e) => e.name === name);
}
