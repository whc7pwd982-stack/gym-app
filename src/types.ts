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

/** 루틴에 저장해 두는 세트 하나(정해 둔 무게·반복). 기록을 저장하면 가장 최근 값으로 갱신된다 */
export interface PlanSet {
  weight: number | null;
  reps: number | null;
  seconds?: number | null;
  distance?: number | null;
}

export interface RoutineItem {
  uid: string;
  exerciseId: string;
  sets: number;
  plan?: PlanSet[];
  /** 증량 판단용 내부 기준(화면에는 노출하지 않음) */
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

/** 하루치 운동 기록. startedAt = 그날 정오(로컬), endedAt != null 이면 저장된 기록 */
export interface Session {
  id?: number;
  routineId: number | null;
  routineName: string;
  startedAt: number;
  endedAt: number | null;
  entries: SessionEntry[];
  memo?: string;
  backfill?: boolean;
  prevEndedAt?: number;
}

export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Sex = 'male' | 'female';
export type Goal = 'hypertrophy' | 'strength' | 'both';
export type Phase = 'bulk' | 'maintain' | 'cut';

export interface Settings {
  bodyweight: number | null;
  level: Level;
  sex: Sex | null;
  birthYear: number | null;
  heightCm: number | null;
  goal: Goal;
  phase: Phase;
  defaultRestCompound: number;
  defaultRestIsolation: number;
}

export interface BodyWeight {
  date: string; // YYYY-MM-DD
  kg: number;
}
