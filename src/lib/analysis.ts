import { MUSCLES, MUSCLE_ORDER, VOLUME_BANDS } from '../data/muscles';
import { MUSCLE_TARGETS, targetFor } from '../data/targets';
import type { Exercise, Level, MuscleCode, Routine } from '../types';
import { credits, isCompound } from './exercises';

export type Tip = {
  level: 'good' | 'info' | 'warn';
  title: string;
  detail: string;
  source?: string;
  suggest?: string[]; // exercise ids
  muscle?: MuscleCode; // 근육 볼륨 관련 팁이면 해당 근육
};

export interface Analysis {
  weekly: Record<MuscleCode, number>;
  perSessionMax: Record<MuscleCode, number>;
  sessionsHit: Record<MuscleCode, number>;
  totalSets: number;
  minutes: number;
  effects: string[];
  tips: Tip[];
}

const zero = () => Object.fromEntries(MUSCLE_ORDER.map((m) => [m, 0])) as Record<MuscleCode, number>;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** 상한 경고 없이, 목표(기본 10세트)를 향해 올라가는 방향으로만 표시 */
export function volumeStatus(v: number, target: number = VOLUME_BANDS.low) {
  if (v <= 0) return { key: 'none', label: '' } as const;
  if (v < target) return { key: 'low', label: `+${Math.ceil(target - v)}` } as const;
  return { key: 'ok', label: '목표 달성' } as const;
}

/** 특정 근육을 주동근으로 키우는 추천 종목 (근비대 근거·늘어난 위치 우선) */
export function bestFor(list: Exercise[], m: MuscleCode, exclude: Set<string>, n = 3) {
  return list
    .filter((e) => (e.primary[m] ?? 0) >= 1 && !exclude.has(e.id) && e.metric !== 'cardio')
    .map((e) => ({ e, s: (e.hypertrophyEvidence ? 3 : 0) + (e.stretch === 'S★' ? 3 : e.stretch === 'S' ? 1 : 0) + (e.custom ? -5 : 0) - Object.keys(e.primary).length * 0.2 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.e.id);
}

/**
 * routines: 분석할 루틴들. single=true면 "이 루틴 1회"를 기준으로 보고,
 * false면 각 루틴의 주당 횟수를 곱해 한 주 전체 계획으로 본다.
 */
export function analyze(routines: Routine[], map: Map<string, Exercise>, all: Exercise[], single: boolean, level: Level = 'beginner'): Analysis {
  const weekly = zero(), perSessionMax = zero(), sessionsHit = zero();
  let totalSets = 0, seconds = 0;
  const used = new Set<string>();
  const tips: Tip[] = [];

  for (const r of routines) {
    const times = single ? 1 : Math.max(0, r.timesPerWeek || 0);
    const session = zero();
    r.items.forEach((it, idx) => {
      const e = map.get(it.exerciseId);
      if (!e) return;
      used.add(e.id);
      totalSets += it.sets * (single ? 1 : times);
      seconds += it.sets * (it.restSec + 45) * (single ? 1 : times);
      for (const [m, w] of credits(e)) session[m as MuscleCode] += it.sets * w;
      // 순서: 같은 주동근의 고립 운동이 다관절보다 먼저 오는지
      if (!isCompound(e)) {
        for (const m of Object.keys(e.primary) as MuscleCode[]) {
          const laterCompound = r.items.slice(idx + 1).some((x) => { const xe = map.get(x.exerciseId); return xe && isCompound(xe) && (xe.primary[m] ?? 0) >= 1; });
          if (laterCompound) tips.push({ level: 'info', title: `${r.name}: ${e.name}이(가) 다관절 운동보다 먼저 있어요`, detail: '근비대에는 순서 차이가 거의 없지만, 먼저 한 운동의 근력이 더 오르기 쉬워요. 무겁게 키우고 싶은 다관절 운동을 앞에 두는 걸 추천해요.', source: 'Nunes 2021 (메타분석)' });
        }
      }
      if (it.repMax > 30 || it.repMin < 3) tips.push({ level: 'info', title: `${e.name} 반복 범위 ${it.repMin}–${it.repMax}회`, detail: '근비대는 약 5–30회(1RM의 30–85%) 범위에서 실패 가까이 하면 비슷해요. 범위 밖이면 근력 또는 지구력 쪽으로 치우쳐요.', source: 'Lopez 2021, Schoenfeld 2017' });
    });
    for (const m of MUSCLE_ORDER) {
      weekly[m] += session[m] * times;
      perSessionMax[m] = Math.max(perSessionMax[m], session[m]);
      if (session[m] >= 1) sessionsHit[m] += times;
    }
  }

  // 근육별 볼륨
  const tracked = MUSCLE_ORDER.filter((m) => MUSCLES[m].tracked);
  const lacking = tracked.filter((m) => weekly[m] < targetFor(m, { level }));
  if (!single) {
    for (const m of lacking) {
      const v = r1(weekly[m]);
      const t = targetFor(m, { level });
      tips.push({
        level: v < VOLUME_BANDS.min ? 'warn' : 'info',
        title: `${MUSCLES[m].ko} 주 ${v}세트 → ${Math.ceil(t - v)}세트 더 추가해 보세요`,
        detail: `${MUSCLES[m].ko} 목표는 주 ${t}세트예요(보조근은 0.5세트로 계산). ${MUSCLE_TARGETS[m]?.why ?? ''}`,
        source: 'Pelland 2026 외 (근육별 근거는 프로필 > 근육별 목표)',
        suggest: bestFor(all, m, used),
        muscle: m,
      });
    }
  }

  // 근거 기반 종목 보완
  const has = (pred: (e: Exercise) => boolean) => [...used].some((id) => { const e = map.get(id); return !!e && pred(e); });
  const byName = (n: string) => all.find((e) => e.name === n)?.id;
  const ids = (...names: string[]) => names.map(byName).filter(Boolean) as string[];

  if (weekly.QUAD >= 3 && weekly.RF < 1.5) tips.push({ level: 'info', title: '대퇴직근 자극이 부족해요', detail: '스쿼트·레그프레스만으로는 대퇴직근(허벅지 앞 가운데)이 거의 자라지 않았어요. 레그 익스텐션을 추가해 보세요.', source: 'Zabaleta-Korta 2021', suggest: ids('레그 익스텐션', '리컴번트 레그 익스텐션') });
  if (weekly.QUAD >= 3 && weekly.HAM < 1) tips.push({ level: 'warn', title: '스쿼트로는 햄스트링이 크지 않아요', detail: '스쿼트 깊이와 상관없이 햄스트링 성장은 없었어요. 레그컬이나 루마니안 데드리프트를 따로 넣어야 해요.', source: 'Kubo 2019', suggest: ids('시티드 레그컬', '루마니안 데드리프트') });
  if (has((e) => e.name === '라잉 레그컬') && !has((e) => e.name === '시티드 레그컬')) tips.push({ level: 'info', title: '라잉 대신 시티드 레그컬을 고려해 보세요', detail: '엉덩이를 굽힌 자세(햄스트링이 늘어난 상태)의 시티드 레그컬이 햄스트링을 더 키웠어요(약 14% vs 9%).', source: 'Maeo 2021', suggest: ids('시티드 레그컬') });
  if (has((e) => e.name === '시티드 카프레이즈') && !has((e) => /스탠딩 카프|레그프레스 카프|동키/.test(e.name))) tips.push({ level: 'info', title: '시티드 카프레이즈만으로는 비복근이 잘 안 커요', detail: '무릎을 편 스탠딩 카프레이즈가 비복근을 크게 키웠고, 시티드는 거의 변화가 없었어요.', source: 'Kinoshita 2023', suggest: ids('스탠딩 카프레이즈') });
  if (weekly.TRI >= 3 && !has((e) => /오버헤드/.test(e.name) && (e.primary.TRI ?? 0) >= 1)) tips.push({ level: 'info', title: '오버헤드 삼두 운동을 추가해 보세요', detail: '팔을 머리 위로 올린 오버헤드 익스텐션이 푸시다운보다 삼두를 더 키웠어요(장두 +28.5% vs +19.6%).', source: 'Maeo 2023', suggest: ids('케이블 오버헤드 트라이셉스 익스텐션', '덤벨 오버헤드 익스텐션') });
  if (weekly.CHEST >= 4 && !has((e) => /인클라인/.test(e.name) && (e.primary.CHEST ?? 0) >= 1)) tips.push({ level: 'info', title: '윗가슴 운동이 없어요', detail: '30° 인클라인 프레스가 플랫보다 윗가슴을 더 키웠어요.', source: 'Chaves 2020', suggest: ids('인클라인 덤벨 프레스', '인클라인 벤치프레스') });
  if (weekly.ABS < 1 && !single) tips.push({ level: 'info', title: '복근 운동이 없어요', detail: '스쿼트·데드리프트는 복근 활성이 크지 않았어요. 앱 롤아웃처럼 부하를 줄 수 있는 복근 운동이 복직근 두께를 늘렸어요.', source: 'Hamlyn 2007, Takai 2017', suggest: ids('앱 롤아웃', '케이블 크런치', '행잉 레그레이즈') });

  const push = weekly.CHEST + weekly.DELT_F * 0.5;
  const pull = weekly.LAT + weekly.UB;
  if (!single && push > 6 && pull < push * 0.6) tips.push({ level: 'warn', title: '미는 운동에 비해 당기는 운동이 적어요', detail: `밀기 약 ${r1(push)}세트, 당기기 약 ${r1(pull)}세트예요. 등 운동을 늘리면 균형과 자세에 좋아요.`, suggest: bestFor(all, 'LAT', used, 2).concat(bestFor(all, 'UB', used, 1)) });

  const stretchCount = [...used].filter((id) => { const s = map.get(id)?.stretch; return s === 'S' || s === 'S★'; }).length;
  if (used.size >= 4) {
    if (stretchCount / used.size >= 0.4) tips.push({ level: 'good', title: `늘어난 자세 운동이 ${stretchCount}개 있어요`, detail: '근육이 늘어난 위치에서 부하를 받는 운동은 근성장에 유리하다는 근거가 쌓이고 있어요.', source: 'Wolf 2023, Maeo 2021·2023' });
    else tips.push({ level: 'info', title: '늘어난 자세 운동이 적어요', detail: '오버헤드 익스텐션, 인클라인 컬, 시티드 레그컬, 딥 스쿼트처럼 근육이 늘어난 위치에서 힘을 받는 종목을 섞어 보세요.', source: 'Wolf 2023 (메타분석)' });
  }

  const minutes = Math.round(seconds / 60);

  // 효능 요약
  const ranked = tracked.filter((m) => weekly[m] >= 1).sort((a, b) => weekly[b] - weekly[a]);
  const effects: string[] = [];
  if (ranked.length) effects.push(`가장 많이 자극하는 부위: ${ranked.slice(0, 4).map((m) => `${MUSCLES[m].ko}(${r1(weekly[m])})`).join(', ')}`);
  const groups = new Map<string, number>();
  // 근육 수가 많은 부위(하체 등)가 합계로 과대평가되지 않도록 부위별 평균으로 비교
  const groupCount = new Map<string, number>();
  for (const m of ranked) {
    const g = MUSCLES[m].group;
    groups.set(g, (groups.get(g) ?? 0) + weekly[m]);
    groupCount.set(g, (groupCount.get(g) ?? 0) + 1);
  }
  for (const [g, v] of groups) groups.set(g, v / (groupCount.get(g) ?? 1));
  const topGroups = [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map((g) => g[0]);
  if (topGroups.length) effects.push(`${topGroups.join('·')} 중심의 근비대 루틴이에요`);
  const okCount = tracked.filter((m) => weekly[m] >= targetFor(m, { level })).length;
  if (!single) effects.push(`주요 근육 ${tracked.length}개 중 ${okCount}개가 근육별 목표 세트를 채워요`);
  const compound = [...used].filter((id) => { const e = map.get(id); return e && isCompound(e); }).length;
  if (used.size) effects.push(`다관절 ${compound}개 · 고립 ${used.size - compound}개 — ${compound >= used.size / 2 ? '무거운 다관절 위주라 근력과 근육량을 함께 키우는 구성' : '고립 운동 위주라 특정 부위를 집중적으로 다듬는 구성'}`);
  if (has((e) => e.metric === 'cardio')) effects.push('유산소가 포함돼 심폐 지구력도 함께 챙겨요');

  const order = { warn: 0, info: 1, good: 2 };
  tips.sort((a, b) => order[a.level] - order[b.level]);
  return { weekly, perSessionMax, sessionsHit, totalSets, minutes, effects, tips: dedupe(tips) };
}

function dedupe(tips: Tip[]) {
  const seen = new Set<string>();
  return tips.filter((t) => (seen.has(t.title) ? false : (seen.add(t.title), true)));
}
