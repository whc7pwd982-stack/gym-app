import type { Level, Phase, Settings } from '../types';

export function ageOf(s: Settings) {
  return s.birthYear ? new Date().getFullYear() - s.birthYear : null;
}

/** Mifflin-St Jeor 기초대사량 (Mifflin 1990, Am J Clin Nutr) */
export function bmr(s: Settings, kg: number | null) {
  const age = ageOf(s);
  if (!kg || !s.heightCm || !age || !s.sex) return null;
  return 10 * kg + 6.25 * s.heightCm - 5 * age + (s.sex === 'male' ? 5 : -161);
}

/** 주당 운동 횟수 → 활동계수 (일반적인 Harris-Benedict 계열 계수) */
export function activityFactor(daysPerWeek: number) {
  if (daysPerWeek <= 1) return 1.375;
  if (daysPerWeek <= 3) return 1.45;
  if (daysPerWeek <= 5) return 1.55;
  return 1.7;
}

/**
 * 목표 칼로리
 * - 벌크: 유지 + 초보 10–15% / 중급 5–10% / 상급 5% (Iraki 2019, Helms 2023: 큰 잉여는 지방만 늘림)
 * - 감량: 유지 − 최대 500kcal (Murphy & Koehler 2022: 하루 약 500kcal 넘는 적자는 근성장 저해)
 */
export function calorieTarget(maintenance: number, phase: Phase, level: Level) {
  if (phase === 'bulk') {
    const pct = level === 'beginner' ? 0.12 : level === 'intermediate' ? 0.08 : 0.05;
    return Math.round((maintenance * (1 + pct)) / 10) * 10;
  }
  if (phase === 'cut') return Math.round((maintenance - Math.min(500, maintenance * 0.2)) / 10) * 10;
  return Math.round(maintenance / 10) * 10;
}

/**
 * 단백질 (g/일)
 * - 기본 1.6 g/kg (Morton 2018 메타분석), 65세 이상은 최소 1.2 (Nunes 2022)
 * - 감량기 2.2 g/kg 이상 (Jäger 2017 ISSN: 감량 중 2.3–3.1)
 */
export function proteinTarget(kg: number, phase: Phase, age: number | null) {
  const perKg = phase === 'cut' ? 2.2 : 1.6;
  return { grams: Math.round(kg * perKg), perKg, max: Math.round(kg * 2.2), elderlyMin: age != null && age >= 65 ? Math.round(kg * 1.2) : null };
}

/** 주당 체중 변화 권장 범위(체중 대비 %) — Iraki 2019(벌크), Garthe 2011(감량) */
export function weeklyRateTarget(phase: Phase, level: Level): [number, number] | null {
  if (phase === 'bulk') return level === 'beginner' ? [0.25, 0.5] : [0.1, 0.25];
  if (phase === 'cut') return [-1.0, -0.5];
  return null;
}
