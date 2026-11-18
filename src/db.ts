import Dexie, { type Table } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import type { BodyWeight, Exercise, Routine, Session, Settings } from './types';

class GymDB extends Dexie {
  routines!: Table<Routine, number>;
  sessions!: Table<Session, number>;
  favorites!: Table<{ exerciseId: string; addedAt: number }, string>;
  customExercises!: Table<Exercise, string>;
  kv!: Table<{ key: string; value: unknown }, string>;
  bodyweights!: Table<BodyWeight, string>;

  constructor() {
    super('gym-app');
    this.version(1).stores({
      routines: '++id, order',
      sessions: '++id, startedAt, endedAt, routineId',
      favorites: 'exerciseId',
      customExercises: 'id',
      kv: 'key',
    });
    // v2: 실시간 운동(진행 중) 개념 제거 → 모든 기록은 저장된 날짜별 기록. 체중 기록 추가
    this.version(2).stores({ bodyweights: 'date' }).upgrade(async (tx) => {
      await tx.table('sessions').toCollection().modify((s: Session) => {
        if (!s.endedAt) s.endedAt = s.startedAt;
        delete s.prevEndedAt;
      });
    });
  }
}

export const db = new GymDB();

export const DEFAULT_SETTINGS: Settings = {
  bodyweight: null,
  level: 'beginner',
  sex: null,
  birthYear: null,
  heightCm: null,
  goal: 'hypertrophy',
  phase: 'maintain',
  defaultRestCompound: 150,
  defaultRestIsolation: 90,
};

export async function getSettings(): Promise<Settings> {
  const row = await db.kv.get('settings');
  return { ...DEFAULT_SETTINGS, ...((row?.value as Settings) ?? {}) };
}

export async function saveSettings(s: Settings) {
  await db.kv.put({ key: 'settings', value: s });
}

export function useSettings(): Settings {
  const row = useLiveQuery(() => db.kv.get('settings'), []);
  return { ...DEFAULT_SETTINGS, ...((row?.value as Settings) ?? {}) };
}

/** 가장 최근 체중(체중 기록 → 없으면 프로필 값) */
export function useBodyweight(): number | null {
  const s = useSettings();
  const last = useLiveQuery(() => db.bodyweights.orderBy('date').last(), []);
  return last?.kg ?? s.bodyweight;
}

export async function exportAll() {
  return {
    app: 'gym-app',
    version: 2,
    exportedAt: new Date().toISOString(),
    routines: await db.routines.toArray(),
    sessions: await db.sessions.toArray(),
    favorites: await db.favorites.toArray(),
    customExercises: await db.customExercises.toArray(),
    kv: await db.kv.toArray(),
    bodyweights: await db.bodyweights.toArray(),
  };
}

export async function importAll(data: Awaited<ReturnType<typeof exportAll>>) {
  if (data?.app !== 'gym-app') throw new Error('이 앱의 백업 파일이 아니에요');
  const tables = [db.routines, db.sessions, db.favorites, db.customExercises, db.kv, db.bodyweights];
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()));
    await db.routines.bulkAdd(data.routines ?? []);
    await db.sessions.bulkAdd((data.sessions ?? []).map((s) => ({ ...s, endedAt: s.endedAt ?? s.startedAt })));
    await db.favorites.bulkAdd(data.favorites ?? []);
    await db.customExercises.bulkAdd(data.customExercises ?? []);
    await db.kv.bulkAdd(data.kv ?? []);
    await db.bodyweights.bulkAdd(data.bodyweights ?? []);
  });
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    /* 지원 안 하는 브라우저 */
  }
}
