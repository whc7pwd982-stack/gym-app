import Dexie, { type Table } from 'dexie';
import type { Exercise, Routine, Session, Settings } from './types';

class GymDB extends Dexie {
  routines!: Table<Routine, number>;
  sessions!: Table<Session, number>;
  favorites!: Table<{ exerciseId: string; addedAt: number }, string>;
  customExercises!: Table<Exercise, string>;
  kv!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('gym-app');
    this.version(1).stores({
      routines: '++id, order',
      sessions: '++id, startedAt, endedAt, routineId',
      favorites: 'exerciseId',
      customExercises: 'id',
      kv: 'key',
    });
  }
}

export const db = new GymDB();

export const DEFAULT_SETTINGS: Settings = {
  bodyweight: null,
  level: 'beginner',
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

export async function exportAll() {
  return {
    app: 'gym-app',
    version: 1,
    exportedAt: new Date().toISOString(),
    routines: await db.routines.toArray(),
    sessions: await db.sessions.toArray(),
    favorites: await db.favorites.toArray(),
    customExercises: await db.customExercises.toArray(),
    kv: await db.kv.toArray(),
  };
}

export async function importAll(data: Awaited<ReturnType<typeof exportAll>>) {
  if (data?.app !== 'gym-app') throw new Error('이 앱의 백업 파일이 아니에요');
  await db.transaction('rw', [db.routines, db.sessions, db.favorites, db.customExercises, db.kv], async () => {
    await Promise.all([db.routines.clear(), db.sessions.clear(), db.favorites.clear(), db.customExercises.clear(), db.kv.clear()]);
    await db.routines.bulkAdd(data.routines ?? []);
    await db.sessions.bulkAdd(data.sessions ?? []);
    await db.favorites.bulkAdd(data.favorites ?? []);
    await db.customExercises.bulkAdd(data.customExercises ?? []);
    await db.kv.bulkAdd(data.kv ?? []);
  });
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    /* 지원 안 하는 브라우저 */
  }
}
