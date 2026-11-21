import type { Exercise, MuscleCode } from '../../types';
import { MUSCLES } from '../../data/muscles';

/**
 * 자극 부위 인체 그림 (앞면·뒷면).
 * 진한 색 = 주로 쓰는 근육(1세트), 연한 색 = 보조 근육(0.5세트).
 * 좌우 대칭 근육은 왼쪽 모양만 정의하고 거울 복사한다. viewBox 120 × 250, 몸 중심 x = 60.
 */

type Shape = { d: string; m: MuscleCode; mirror?: boolean };

const E = (cx: number, cy: number, rx: number, ry: number, rot = 0) => {
  // 회전된 타원을 path로 (좌우 대칭 복사를 쉽게 하려고)
  const r = (rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const pts = Array.from({ length: 24 }, (_, i) => {
    const t = (i / 24) * Math.PI * 2, x = rx * Math.cos(t), y = ry * Math.sin(t);
    return `${(cx + x * c - y * s).toFixed(1)},${(cy + x * s + y * c).toFixed(1)}`;
  });
  return `M${pts.join('L')}Z`;
};

const FRONT: Shape[] = [
  { m: 'TRAP_U', d: 'M53 40 L44 46 L36 51 L46 52 L54 47 Z', mirror: true },
  { m: 'DELT_F', d: E(39, 59, 7, 9.5, 15), mirror: true },
  { m: 'DELT_S', d: E(31.5, 61, 4.2, 9, 10), mirror: true },
  { m: 'CHEST', d: 'M58.5 52 C50 51 43 54 41 61 C40 68 45 74 52 75 C56 75.5 58.5 73 58.5 70 Z', mirror: true },
  { m: 'SERR', d: 'M41 76 L46 74 L46 78 L41.5 80 Z M41.5 82 L46 80 L46 84 L42 86 Z', mirror: true },
  { m: 'BI', d: E(31, 81, 5.2, 11, 8), mirror: true },
  { m: 'BR', d: E(27.5, 94, 3.2, 5, 15), mirror: true },
  { m: 'FA', d: E(24, 108, 4.6, 13, 14), mirror: true },
  { m: 'OBL', d: 'M46 80 C44 88 44 97 47 106 L52 103 C50 95 50 88 51 80 Z', mirror: true },
  { m: 'ABS', d: 'M52.5 78 L58.8 78 L58.8 116 C56 117 53.5 114 52.5 109 Z', mirror: true },
  { m: 'HF', d: E(52, 119, 3.5, 6, -25), mirror: true },
  { m: 'QUAD', d: 'M45 120 C41 132 41 150 44 166 C46 172 51 173 54 168 C56 155 56 135 53 124 Z', mirror: true },
  { m: 'RF', d: E(49.5, 145, 2.8, 17, 3), mirror: true },
  { m: 'ADD', d: 'M56 125 C58.5 133 58.5 145 57 155 L55 154 C55.5 143 55 133 53.5 127 Z', mirror: true },
  { m: 'TIB', d: E(48.5, 197, 2.8, 15, 2), mirror: true },
  { m: 'CALF', d: E(44, 196, 3.2, 13, -4), mirror: true },
];

const BACK: Shape[] = [
  { m: 'TRAP_U', d: 'M60 36 L54 42 L42 50 L50 52 L60 54 Z', mirror: true },
  { m: 'TRAP_L', d: 'M60 66 L54 70 L57 86 L60 92 Z', mirror: true },
  { m: 'UB', d: 'M60 54 L50 53 L48 60 L54 70 L60 66 Z', mirror: true },
  { m: 'RC', d: E(46.5, 62, 4.5, 5, -20), mirror: true },
  { m: 'DELT_R', d: E(38.5, 59, 6.5, 9, -15), mirror: true },
  { m: 'DELT_S', d: E(31.5, 61, 4.2, 9, 10), mirror: true },
  { m: 'LAT', d: 'M42 66 C41 76 43 88 48 97 C51 99 54 96 55 92 L54 72 L49 66 Z', mirror: true },
  { m: 'ES', d: 'M56 86 C55 94 55 104 56 112 L59.5 112 L59.5 86 Z', mirror: true },
  { m: 'TRI', d: E(31.5, 80, 5.4, 11.5, 6), mirror: true },
  { m: 'FA', d: E(24, 108, 4.6, 13, 14), mirror: true },
  { m: 'ABD', d: E(46.5, 115, 5, 5.5, -10), mirror: true },
  { m: 'GLU', d: 'M59.5 114 C52 113 45 117 45 126 C45 133 51 136 59.5 134 Z', mirror: true },
  { m: 'HAM', d: 'M45.5 138 C44 148 45 160 47.5 168 C50 171 54 170 55.5 166 C57 156 57 145 56 138 Z', mirror: true },
  { m: 'ADD', d: 'M57 138 C58.5 145 58.5 152 57.5 158 L56.2 157 C56.5 151 56.5 145 55.6 139 Z', mirror: true },
  { m: 'CALF', d: 'M44.5 180 C43 189 44 199 47 205 C50 207 53 205 54 200 C55 192 54.5 185 53 180 Z', mirror: true },
];

/** 몸 실루엣 (앞뒤 공통) */
const SILHOUETTE = [
  E(60, 22, 11, 13), // 머리
  'M55 33 L65 33 L66 40 L54 40 Z', // 목
  'M60 39 C50 40 40 44 33 50 C27 54 26 62 27 70 L28 86 C26 96 22 106 20 118 C19 124 22 126 25 122 C28 112 31 102 34 92 L36 78 L38 86 C39 98 41 108 43 118 C40 138 40 158 43 176 C42 190 42 205 44 214 C44 220 45 226 46 230 L52 230 C53 222 53 212 54 200 C56 186 56 172 57 160 L58 140 L60 128 Z',
];
/** 좌우 거울 복사: 경로는 절대좌표 M/L/C/Z만 쓰므로 숫자가 x, y 순서로 번갈아 나온다 */
const mirrorPath = (d: string) => {
  let i = 0;
  return d.replace(/-?\d+(?:\.\d+)?/g, (n) => (i++ % 2 === 0 ? (120 - Number(n)).toFixed(1) : n));
};

function Body({ shapes, e, label }: { shapes: Shape[]; e: Exercise; label: string }) {
  const role = (m: MuscleCode) => (e.primary[m] ? 'p' : e.secondary[m] ? 's' : '');
  return (
    <figure className="mm-fig">
      <svg viewBox="0 0 120 236" role="img" aria-label={`${label} 자극 부위`}>
        <g className="mm-body">
          {SILHOUETTE.map((d, i) => <path key={i} d={d} />)}
          {SILHOUETTE.slice(2).map((d, i) => <path key={`m${i}`} d={mirrorPath(d)} />)}
        </g>
        {shapes.map((s, i) => {
          const r = role(s.m);
          return (
            <g key={i} className={`mm-m ${r}`}>
              <path d={s.d}><title>{MUSCLES[s.m].ko}</title></path>
              {s.mirror && <path d={mirrorPath(s.d)} />}
            </g>
          );
        })}
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export function MuscleMap({ e }: { e: Exercise }) {
  if (!Object.keys(e.primary).length && !Object.keys(e.secondary).length) return null;
  return (
    <div className="mm">
      <div className="mm-row">
        <Body shapes={FRONT} e={e} label="앞" />
        <Body shapes={BACK} e={e} label="뒤" />
      </div>
    </div>
  );
}
