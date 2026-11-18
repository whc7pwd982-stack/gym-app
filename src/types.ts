export type MuscleCode =
  | 'CHEST' | 'DELT_F' | 'DELT_S' | 'DELT_R' | 'RC' | 'LAT' | 'UB' | 'TRAP_U' | 'TRAP_L' | 'ES'
  | 'BI' | 'BR' | 'TRI' | 'FA' | 'QUAD' | 'RF' | 'HAM' | 'GLU' | 'ABD' | 'ADD' | 'CALF' | 'TIB'
  | 'ABS' | 'OBL' | 'HF' | 'SERR';

export type Category = 'chest' | 'shoulder' | 'back' | 'arm' | 'legs' | 'core' | 'full';
export type Metric = 'weight_reps' | 'bodyweight' | 'assisted' | 'hold' | 'carry' | 'cardio';

export interface Exercise {
  id: string;
  name: string;
  aliases: string[];
  en: string;
  equipment: string;
  category: Category;
  primary: Partial<Record<MuscleCode, number>>;
  secondary: Partial<Record<MuscleCode, number>>;
  stretch: '' | 'S' | 'S★' | 'partial';
  reps: [number, number] | null;
  increment: number;
  metric: Metric;
  shoulder?: string;
  evidence?: string;
  hypertrophyEvidence: boolean;
  custom?: boolean;
}

export interface RoutineItem {
  uid: string;
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
}

export interface Routine {
  id?: number;
  name: string;
  timesPerWeek: number;
  items: RoutineItem[];
  order: number;
  createdAt: number;
}

export interface SetLog {
  weight: number | null;
  reps: number | null;
  rir: number | null;
  seconds: number | null;
  distance: number | null;
  done: boolean;
  warmup: boolean;
}

export interface SessionEntry {
  uid: string;
  exerciseId: string;
  repMin: number;
  repMax: number;
  restSec: number;
  sets: SetLog[];
}

export interface Session {
  id?: number;
  routineId: number | null;
  routineName: string;
  startedAt: number;
  endedAt: number | null;
  entries: SessionEntry[];
  /** 지난 날짜에 나중에 입력한 기록 (운동 시간은 계산하지 않음) */
  backfill?: boolean;
  /** 완료된 기록을 수정 중일 때 원래 종료 시각 */
  prevEndedAt?: number;
}

export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface Settings {
  bodyweight: number | null;
  level: Level;
  defaultRestCompound: number;
  defaultRestIsolation: number;
}
