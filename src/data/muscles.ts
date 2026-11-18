import type { MuscleCode } from '../types';

export interface MuscleInfo {
  /** 짧은 이름(막대 그래프·칩용) */
  ko: string;
  /** 풀네임(종목 상세용). 없으면 ko */
  full?: string;
  group: string;
  /** true면 주간 볼륨 부족/과다 경고 대상 */
  tracked: boolean;
}

export const MUSCLES: Record<MuscleCode, MuscleInfo> = {
  CHEST: { ko: '가슴', group: '가슴', tracked: true },
  DELT_F: { ko: '전면 어깨', group: '어깨', tracked: true },
  DELT_S: { ko: '측면 어깨', group: '어깨', tracked: true },
  DELT_R: { ko: '후면 어깨', group: '어깨', tracked: true },
  RC: { ko: '회전근개', group: '어깨', tracked: false },
  LAT: { ko: '광배근', group: '등', tracked: true },
  UB: { ko: '등 중앙', full: '등 중앙 (능형근·중부 승모)', group: '등', tracked: true },
  TRAP_U: { ko: '상부 승모', group: '등', tracked: true },
  TRAP_L: { ko: '하부 승모', group: '등', tracked: false },
  ES: { ko: '척추기립근', group: '등', tracked: false },
  BI: { ko: '이두', group: '팔', tracked: true },
  BR: { ko: '상완근', full: '상완근·상완요골근', group: '팔', tracked: false },
  TRI: { ko: '삼두', group: '팔', tracked: true },
  FA: { ko: '전완', group: '팔', tracked: true },
  QUAD: { ko: '대퇴사두', group: '하체', tracked: true },
  RF: { ko: '대퇴직근', group: '하체', tracked: false },
  HAM: { ko: '햄스트링', group: '하체', tracked: true },
  GLU: { ko: '둔근', group: '하체', tracked: true },
  ABD: { ko: '중둔근', full: '중둔근·외전근', group: '하체', tracked: false },
  ADD: { ko: '내전근', group: '하체', tracked: false },
  CALF: { ko: '종아리', group: '하체', tracked: true },
  TIB: { ko: '정강이', full: '정강이 (전경골근)', group: '하체', tracked: false },
  ABS: { ko: '복근', group: '코어', tracked: true },
  OBL: { ko: '옆구리', full: '옆구리 (복사근)', group: '코어', tracked: false },
  HF: { ko: '고관절 굴곡', full: '고관절 굴곡근', group: '코어', tracked: false },
  SERR: { ko: '전거근', group: '코어', tracked: false },
};

export const MUSCLE_ORDER = Object.keys(MUSCLES) as MuscleCode[];

export const CATEGORY_KO: Record<string, string> = {
  chest: '가슴', shoulder: '어깨', back: '등', arm: '팔', legs: '하체', core: '코어', full: '전신·유산소',
};

/** 주간 분수 세트 기준 (근성장 논문 종합 보고서). 상한 경고는 두지 않는다. */
export const VOLUME_BANDS = { min: 4, low: 10 };

/** 경력별 근육당 주간 세트 첫 목표 */
export const LEVEL_TARGET = { beginner: 10, intermediate: 12, advanced: 14 } as const;
