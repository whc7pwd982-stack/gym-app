/**
 * 2D 옆모습 인체 애니메이션 엔진.
 * 각 관절 각도는 "절대 각도"(화면 기준)로 표현한다: d(a) = (sin a, cos a)
 *   a = 0 → 아래, 90 → 앞(오른쪽), 180 → 위, -90 → 뒤(왼쪽).
 * 사람은 항상 오른쪽을 보고 서 있다. viewBox 200 × 200, 바닥 y = 182.
 */

export const GROUND = 182;
export const LEN = { torso: 54, neck: 15, head: 9.5, ua: 30, fa: 27, th: 45, sh: 43, foot: 13 };

export type Anchor =
  | { at: 'ankle'; x: number; y?: number }   // 발이 바닥에 고정(서서 하는 운동)
  | { at: 'hip'; x: number; y: number }      // 엉덩이 고정(앉거나 누운 운동)
  | { at: 'hand'; x: number; y: number }     // 손 고정(매달리는 운동)
  | { at: 'knee'; x: number; y: number };    // 무릎 고정(무릎 꿇는 운동)

export interface Pose {
  anchor: Anchor;
  torso: number;          // 엉덩이 → 어깨 방향 (곧게 서면 180)
  ua: number; fa: number; // 위팔, 아래팔
  th: number; sh: number; // 허벅지, 정강이
  foot?: number;          // 발 방향 (기본 90 = 앞으로)
  head?: number;          // 머리 방향 보정 (기본: 몸통 방향)
  ua2?: number; fa2?: number; th2?: number; sh2?: number; foot2?: number; // 반대쪽(뒤쪽) 팔다리 — 없으면 같은 각도
}

export type P = { x: number; y: number };
const d = (a: number, l: number): P => ({ x: Math.sin((a * Math.PI) / 180) * l, y: Math.cos((a * Math.PI) / 180) * l });
const add = (p: P, q: P): P => ({ x: p.x + q.x, y: p.y + q.y });
const sub = (p: P, q: P): P => ({ x: p.x - q.x, y: p.y - q.y });

export interface Joints {
  hip: P; sho: P; head: P;
  elb: P; wri: P; kne: P; ank: P; toe: P;
  elb2: P; wri2: P; kne2: P; ank2: P; toe2: P;
}

export function solve(p: Pose): Joints {
  const legVec = add(d(p.th, LEN.th), d(p.sh, LEN.sh));
  const armVec = add(d(p.ua, LEN.ua), d(p.fa, LEN.fa));
  let hip: P;
  switch (p.anchor.at) {
    case 'ankle': hip = sub({ x: p.anchor.x, y: p.anchor.y ?? GROUND - 4 }, legVec); break;
    case 'hip': hip = { x: p.anchor.x, y: p.anchor.y }; break;
    case 'knee': hip = sub({ x: p.anchor.x, y: p.anchor.y }, d(p.th, LEN.th)); break;
    case 'hand': hip = sub(sub({ x: p.anchor.x, y: p.anchor.y }, armVec), d(p.torso, LEN.torso)); break;
  }
  const sho = add(hip, d(p.torso, LEN.torso));
  const head = add(sho, d(p.head ?? p.torso, LEN.neck));
  const elb = add(sho, d(p.ua, LEN.ua)), wri = add(elb, d(p.fa, LEN.fa));
  const kne = add(hip, d(p.th, LEN.th)), ank = add(kne, d(p.sh, LEN.sh)), toe = add(ank, d(p.foot ?? 90, LEN.foot));
  const elb2 = add(sho, d(p.ua2 ?? p.ua, LEN.ua)), wri2 = add(elb2, d(p.fa2 ?? p.fa, LEN.fa));
  const kne2 = add(hip, d(p.th2 ?? p.th, LEN.th)), ank2 = add(kne2, d(p.sh2 ?? p.sh, LEN.sh)), toe2 = add(ank2, d(p.foot2 ?? p.foot ?? 90, LEN.foot));
  return { hip, sho, head, elb, wri, kne, ank, toe, elb2, wri2, kne2, ank2, toe2 };
}

/** 각도는 짧은 쪽으로 돌도록 보간 */
const lerpA = (a: number, b: number, t: number) => {
  const diff = ((((b - a) % 360) + 540) % 360) - 180;
  return a + diff * t;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function mix(a: Pose, b: Pose, t: number): Pose {
  const k = (x?: number, y?: number, fb?: number, fb2?: number) => (x == null && y == null ? undefined : lerpA(x ?? fb!, y ?? fb2!, t));
  const anc = a.anchor.at === b.anchor.at
    ? ({ ...a.anchor, x: lerp(a.anchor.x, b.anchor.x, t), ...('y' in a.anchor && a.anchor.y != null ? { y: lerp(a.anchor.y, (b.anchor as { y?: number }).y ?? a.anchor.y, t) } : {}) } as Anchor)
    : (t < 0.5 ? a.anchor : b.anchor);
  return {
    anchor: anc,
    torso: lerpA(a.torso, b.torso, t), ua: lerpA(a.ua, b.ua, t), fa: lerpA(a.fa, b.fa, t), th: lerpA(a.th, b.th, t), sh: lerpA(a.sh, b.sh, t),
    foot: k(a.foot, b.foot, 90, 90), head: k(a.head, b.head, a.torso, b.torso),
    ua2: k(a.ua2, b.ua2, a.ua, b.ua), fa2: k(a.fa2, b.fa2, a.fa, b.fa), th2: k(a.th2, b.th2, a.th, b.th), sh2: k(a.sh2, b.sh2, a.sh, b.sh), foot2: k(a.foot2, b.foot2, a.foot ?? 90, b.foot ?? 90),
  };
}

/** 부드러운 왕복: 0→1 올라갔다가 잠깐 멈추고 1→0 */
export function cycle(ms: number, period = 2600) {
  const u = (ms % period) / period; // 0..1
  const hold = 0.12;
  const half = (1 - 2 * hold) / 2;
  let t: number;
  if (u < half) t = u / half;
  else if (u < half + hold) t = 1;
  else if (u < 2 * half + hold) t = 1 - (u - half - hold) / half;
  else t = 0;
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
}
