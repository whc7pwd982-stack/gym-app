import type { Level, MuscleCode, Settings } from '../types';
import { MUSCLES } from './muscles';

/**
 * 근육별 주간 분수 세트(직접 1.0 / 간접 0.5) 목표 — 시작값 → 상한(여기까지 세트를 올리고, 이후엔 무게·반복으로 진행)
 * 출처: research_notes/근성장 논문 종합/muscle_specific_volume.md
 *
 * 중요: 근육마다 용량-반응 곡선이 다르다는 메타분석은 없다(Pelland 2026은 근육 공통 곡선).
 * 근육별 차이는 ① 간접 자극을 얼마나 받는지 ② 고볼륨 반응 연구(삼두↑, 이두·대퇴사두 한계) ③ 코칭 관행에서 온다.
 * basis: 'evidence' 근육별 연구 신호 있음 / 'inference' 공통 근거 + 간접 자극으로 추정 / 'heuristic' 코칭 관행(RP 등)
 */
export interface MuscleTarget {
  start: Record<Level, number>;
  ceiling: Record<Level, number>;
  basis: 'evidence' | 'inference' | 'heuristic';
  why: string;
}

const T = (b: [number, number], i: [number, number], a: [number, number], basis: MuscleTarget['basis'], why: string): MuscleTarget =>
  ({ start: { beginner: b[0], intermediate: i[0], advanced: a[0] }, ceiling: { beginner: b[1], intermediate: i[1], advanced: a[1] }, basis, why });

export const MUSCLE_TARGETS: Partial<Record<MuscleCode, MuscleTarget>> = {
  CHEST: T([8, 12], [10, 16], [12, 20], 'inference', '근육 공통 기준(주 10세트 이상에서 더 큰 성장, 숙련자 12–20세트)을 적용했어요. 가슴만 따로 본 용량 연구는 없어요. (Schoenfeld 2017, Baz-Valle 2022)'),
  DELT_F: T([6, 10], [8, 12], [8, 14], 'heuristic', '프레스 운동에서 0.5세트씩 많이 쌓여서 목표를 낮게 잡았어요.'),
  DELT_S: T([8, 12], [10, 18], [12, 22], 'inference', '프레스·로우에서 간접 자극을 거의 못 받아 레터럴 레이즈로 직접 채워야 해요. 덤벨·케이블 모두 효과가 같았어요. (Larsen 2025)'),
  DELT_R: T([6, 10], [8, 14], [10, 18], 'inference', '로우·풀다운에서 0.5세트씩 간접 자극이 쌓여요. 직접 연구는 없어요.'),
  LAT: T([8, 12], [10, 16], [12, 20], 'inference', '근육 공통 기준을 적용했어요. 광배근만 따로 본 용량 연구는 없어요.'),
  UB: T([8, 12], [10, 16], [12, 20], 'inference', '근육 공통 기준을 적용했어요. 로우 계열에서 광배근과 함께 채워져요.'),
  TRAP_U: T([4, 8], [6, 12], [8, 16], 'heuristic', '데드리프트·로우에서 간접 자극을 많이 받아요.'),
  BI: T([8, 12], [10, 16], [12, 18], 'evidence', '로우가 컬의 약 절반만큼 이두를 키웠어요(0.5세트 근거). 주 18세트를 넘으면 추가 효과가 일정하지 않았어요. (Mannarino 2021, Heaselgrave 2019, Baz-Valle 2022)'),
  TRI: T([8, 12], [10, 18], [12, 22], 'evidence', '고볼륨(주 20세트 이상)에서 추가 성장이 나온 근육이에요. (Baz-Valle 2022, Brigatto 2022)'),
  FA: T([4, 8], [6, 10], [6, 14], 'heuristic', '당기기 운동의 그립에서 간접 자극을 받아요. 연구는 없어요.'),
  QUAD: T([8, 12], [10, 16], [12, 20], 'evidence', '여러 연구에서 주 12–20세트를 넘기면 추가 성장이 뚜렷하지 않았어요. (Aube 2022, Baz-Valle 2022)'),
  HAM: T([6, 10], [8, 14], [10, 18], 'evidence', '스쿼트로는 햄스트링이 자라지 않아서, 레그컬·루마니안 데드리프트로 따로 채워야 해요. (Kubo 2019)'),
  GLU: T([6, 10], [8, 14], [10, 18], 'evidence', '깊은 스쿼트에서 둔근이 잘 자라서 간접 자극이 많아요. (Kubo 2019)'),
  CALF: T([8, 12], [10, 16], [12, 20], 'inference', '무릎을 편 스탠딩 카프레이즈가 비복근을 키웠어요. 용량 연구는 없어요. (Kinoshita 2023)'),
  ABS: T([4, 8], [6, 12], [8, 16], 'heuristic', '대부분의 운동에서 버티는 자극을 받아요. 용량 연구는 없어요.'),
};

export function targetFor(m: MuscleCode, s: Pick<Settings, 'level'>) {
  const t = MUSCLE_TARGETS[m];
  if (!t) return MUSCLES[m].tracked ? 10 : 0;
  return t.start[s.level];
}

export function ceilingFor(m: MuscleCode, s: Pick<Settings, 'level'>) {
  const t = MUSCLE_TARGETS[m];
  if (!t) return MUSCLES[m].tracked ? 16 : 0;
  return t.ceiling[s.level];
}

export const BASIS_KO = { evidence: '연구 근거', inference: '공통 근거로 추정', heuristic: '코칭 관행' } as const;
