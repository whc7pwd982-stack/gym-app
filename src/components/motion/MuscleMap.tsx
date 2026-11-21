import { useId } from 'react';
import type { Exercise, MuscleCode } from '../../types';
import { MUSCLES } from '../../data/muscles';

/**
 * 자극 부위 인체 그림 (앞면·뒷면, 해부도 스타일).
 * 진한 색 = 주로 쓰는 근육(1세트), 연한 색 = 보조 근육(0.5세트).
 * 왼쪽 절반만 정의하고 x = 100 기준으로 거울 복사한다. viewBox 200 × 446.
 * 경로는 절대좌표 M/L/C/Z만 쓴다 (거울 복사가 숫자를 x, y 순서로 번갈아 읽음).
 */

type Shape = { m: MuscleCode | null; d: string };

/** 구간별 직선 보간 */
const lerpMap = (pts: [number, number][]) => (v: number) => {
  if (v <= pts[0][0]) return v - pts[0][0] + pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [a, fa] = pts[i - 1], [b, fb] = pts[i];
    if (v <= b) return fa + ((v - a) / (b - a)) * (fb - fa);
  }
  const [l, fl] = pts[pts.length - 1];
  return v - l + fl;
};
/** 그린 좌표 → 8등신 비율 (머리 1 : 몸통 3 : 다리 4). 팔은 손끝이 허벅지 중간에 오게 따로 늘린다 */
const bodyY = lerpMap([[10, 10], [56, 62], [81, 84], [124, 120], [142, 134], [205, 180], [244, 210], [266, 226], [342, 316], [362, 334], [440, 438]]);
const armY = lerpMap([[124, 120], [182, 172], [248, 246], [280, 278]]);
const fit = (d: string) => {
  const nums = d.match(/-?\d+(?:\.\d+)?/g) ?? [];
  const out: string[] = [];
  for (let i = 0; i < nums.length; i += 2) {
    const x = Number(nums[i]), y = Number(nums[i + 1]);
    const arm = y > 124 && y <= 280 && x < 67.5 && (y < 240 || x < 58);
    out.push(nums[i], (arm ? armY(y) : bodyY(y)).toFixed(1));
  }
  let k = 0;
  return d.replace(/-?\d+(?:\.\d+)?/g, () => out[k++]);
};

/** 몸 윤곽 (왼쪽 절반, 목 → 어깨 → 팔 → 옆구리 → 다리 → 발) */
const OUTLINE_RAW =
  'M100 56 L89.5 56 C89.5 62 89 67 88.5 70 C80 75 70 78 62 81 C50 83 42 92 41 106 C40 116 41 124 43 132 ' +
  'C40 142 39 156 40 168 C40 174 40 178 40 182 C35 194 33 208 35 222 C36 232 38 240 40 248 ' +
  'C37 258 38 270 44 276 C48 279 53 276 54 270 C55 262 55 254 53 248 C56 234 59 214 60 198 C61 190 62 184 62 180 ' +
  'C64 164 66 146 68 124 C70 150 75 180 76 204 C74 216 69 228 67 244 C64 262 64 290 68 314 C70 326 72 334 73 342 ' +
  'C73 350 72 356 71 362 C66 376 67 394 74 412 C75 418 75 424 74 430 C72 436 78 440 88 440 C93 440 95 436 94 430 ' +
  'C93 420 93 414 94 406 C98 392 99 376 97 362 C96 354 95 348 95 342 C97 318 99 290 99 270 C99.5 267 100 266 100 266 Z';

/** 윤곽선만 (가운데 세로선이 그려지지 않게 열린 경로) */
const OUTLINE = fit(OUTLINE_RAW);
const EDGE = fit(OUTLINE_RAW.replace('M100 56 L89.5 56 ', 'M89.5 56 ').replace(' C99.5 267 100 266 100 266 Z', ''));

/** 근육은 아니지만 몸처럼 보이게 하는 선 (무릎, 오금, 견갑골 가시 등) */
const FRONT_LINES = [
  'M90.5 60 C93 68 96 76 98 84', // 목빗근
  'M79 341 C83 337 89 337 92 342', // 무릎뼈 위
  'M78 353 C82 357 88 357 91 351', // 무릎뼈 아래
];
const BACK_LINES = [
  'M64 84 C70 90 77 96 84 104', // 견갑골 가시
  'M78 346 C83 350 89 350 93 346', // 오금
  'M86 412 C87 420 87.5 426 87.5 432', // 아킬레스건
];

/** m: null = 색칠하지 않는 근육 (봉공근 등) */
const FRONT: Shape[] = [
  { m: 'TRAP_U', d: 'M88.5 64 C86 72 76 77 62 81 L66 84 C76 82 84 80 89.5 78 Z' },
  { m: 'CHEST', d: 'M99 86 C90 84 77 84 66 86 C67.5 92 67.5 99 66.5 106 C66 113 67 119 69 124 C73 134 82 141 92 142 C95 142 97.5 141 99 139 Z' },
  { m: 'DELT_S', d: 'M64 82 C52 82 42 90 41 106 C40 120 44 134 50 146 C48 132 47 118 50 104 C52 94 57 86 62 82 Z' },
  { m: 'DELT_F', d: 'M62 82 C57 86 52 94 50 104 C47 118 48 132 50 146 C56 136 63 120 67 104 C68 94 67 87 64 82 Z' },
  { m: 'LAT', d: 'M68.5 124 C70 136 71.5 148 73 160 L76 158 C74 146 72.5 134 70.5 126 Z' },
  { m: 'SERR', d: 'M71 130 C74 131 77 133 79 136 L78 140 C75 139 72.5 138 71 137 Z M72 142 C75 143 78 145 80 148 L79.5 152 C76.5 151 74 150 72.5 149 Z M73 154 C76 155 79 157 81 160 L80.5 164 C77.5 163 75 162 73.5 161 Z' },
  { m: 'OBL', d: 'M74 165 C78 160 82 157 86.5 156 L87.5 156 L87.5 224 C83 226 79 224 76 218 C77 202 76.5 182 74 165 Z' },
  { m: 'ABS', d: 'M88.5 145 C88.5 142 90 141.5 92.5 141.5 L99 141.5 L99 161 L89 161 C88.7 155 88.5 150 88.5 145 Z' },
  { m: 'ABS', d: 'M89 163.5 L99 163.5 L99 183 L89.3 183 C89.2 176 89.1 169 89 163.5 Z' },
  { m: 'ABS', d: 'M89.4 185.5 L99 185.5 L99 205 L89.7 205 C89.6 198 89.5 191 89.4 185.5 Z' },
  { m: 'ABS', d: 'M89.8 207.5 L99 207.5 L99 250 C95 248 92 242 90.8 234 C90.2 225 89.9 216 89.8 207.5 Z' },
  { m: 'HF', d: 'M76.5 224 C78 228 79.5 232 80.5 236 C79 242 77 246 74 248 C73.5 240 74.5 231 76.5 224 Z' },
  { m: 'QUAD', d: 'M67 246 C64 262 64 290 68 314 C70 326 72 334 74 340 L79 338 C79 322 78 304 77 290 C75.5 274 74 260 72 248 C70.5 245 68.5 245 67 246 Z' },
  { m: 'RF', d: 'M72 248 C74 260 75.5 274 77 290 C78 304 79 322 79 338 L84.5 337 C84 322 85 306 88 291 C86.5 276 85 262 82.5 250 C81 242 79 235 76 228 C74 236 72.5 242 72 248 Z' },
  { m: 'QUAD', d: 'M84.5 337 C84 322 85 306 88 291 C90.5 304 92 318 92.5 332 C91 337 87.5 339 84.5 337 Z' },
  { m: 'ADD', d: 'M83 236 C86 248 88 258 89.5 270 C92 290 94 312 94.5 330 C95.5 320 97 300 98.5 284 C99 278 99 272 99 268 C94 258 88 246 83 236 Z' },
  { m: null, d: 'M76 228 C80 240 83 252 86 270 C88.5 290 90.5 310 92.5 332 L94.5 335 C94 312 92 290 89.5 270 C87 252 83 236 78.5 226 Z' },
  { m: 'TIB', d: 'M74 356 C72 372 73 390 79 406 L83 406 C82 390 81 372 80 356 C78 353 75 353 74 356 Z' },
  { m: 'CALF', d: 'M90 352 C96 360 99 374 97 390 C95 398 93 404 92 406 C89 392 87 374 86 360 C86 355 88 352 90 352 Z' },
  { m: 'CALF', d: 'M71.5 362 C67.5 374 68 388 72.5 400 L75 398 C73 386 73 372 74 360 Z' },
  { m: 'BI', d: 'M50.5 147 C47.5 155 47.5 165 49.5 173 C52.5 179 58 180 61 174 C64 163 65 147 63 135 C61 129 57 129 54.5 135 C52.5 139 51.5 143 50.5 147 Z' },
  { m: 'BR', d: 'M44.5 147 C41.5 157 41.5 169 43.5 180 L47.5 178 C46 168 46.5 157 49 149 Z' },
  { m: 'TRI', d: 'M64.5 137 C66 151 65 166 62.5 178 L61.5 176 C63.5 164 64 151 63 139 Z' },
  { m: 'FA', d: 'M41 182 C36 194 34.5 208 36 222 C37 232 39 240 41 246 L45 246 C46 228 48 208 51 192 C52 186 51 182 48 180 C45 179 43 180 41 182 Z' },
  { m: 'FA', d: 'M51.5 186 C56 186 60 192 60 202 C59 218 56 234 52.5 246 L46.5 246 C47.5 228 49.5 208 51.5 192 Z' },
];

const BACK: Shape[] = [
  { m: 'LAT', d: 'M68.5 125 C72 150 75 180 76 204 C80 214 90 226 100 236 L100 190 C99 184 97 176 95 166 C93 156 90.5 142 88 130 C82 128 75 127 68.5 125 Z' },
  { m: 'ES', d: 'M95.5 192 C93.5 206 93.5 220 95 232 L100 238 L100 196 C98.8 191 97 189 95.5 192 Z' },
  { m: 'TRAP_U', d: 'M100 48 L92 54 C90 62 89 68 87 72 C79 76 70 79 62 81 C68 84 74 87 80 90 C86 92 93 94 100 95 Z' },
  { m: 'UB', d: 'M100 95 C93 94 86 92 80 90 C74 87 68 84 63 82 C66 86 70 92 76 98 C80 102 83 106 85 110 C89 114 94 118 100 120 Z' },
  { m: 'TRAP_L', d: 'M100 120 C94 118 89 114 85 110 C87 126 91 148 95 166 C97 176 99 184 100 190 Z' },
  { m: 'RC', d: 'M66.5 97 C66 109 67 118 70 125 C76 127 82 128 88 130 C87 122 86 116 85 110 C82 106 79 102 76 98 C72.5 94 68.5 92 66.5 97 Z' },
  { m: 'DELT_S', d: 'M64 82 C52 82 42 90 41 106 C40 120 44 134 50 146 C48 132 47 118 50 104 C52 94 57 86 62 82 Z' },
  { m: 'DELT_R', d: 'M62 82 C57 86 52 94 50 104 C47 118 48 132 50 146 C55 136 61 122 65 108 C66.5 98 66 88 64 82 Z' },
  { m: 'TRI', d: 'M44.5 141 C41 151 40.5 163 42.5 173 C45 177 49 175 50 169 C50.5 161 50.5 153 50 147 Z' },
  { m: 'TRI', d: 'M51 147 C51 157 51.5 167 53.5 175 C56.5 180 61 177 62.5 169 C64.5 157 65 145 63 134 C61 129 57 129 54.5 135 C52.5 139 51.5 143 51 147 Z' },
  { m: 'FA', d: 'M41 182 C36 194 34.5 208 36 222 C37 232 39 240 41 246 L45 246 C46 228 48 208 51 192 C52 186 51 182 48 180 C45 179 43 180 41 182 Z' },
  { m: 'FA', d: 'M51.5 186 C56 186 60 192 60 202 C59 218 56 234 52.5 246 L46.5 246 C47.5 228 49.5 208 51.5 192 Z' },
  { m: 'ABD', d: 'M76 206 C73 217 69 229 67 243 C72 240 78 236 85 233 C82 224 79 215 76 206 Z' },
  { m: 'GLU', d: 'M100 239 C92 235 82 237 74 244 C69 251 67 261 67.5 270 C68.5 277 73 281 80 282 C88 283 95 281.5 100 279 Z' },
  { m: 'HAM', d: 'M66 282 C64 298 66 318 71 334 C74 340 78 340 80 334 C80.5 316 81 298 82 285 C77 282 71 281 66 282 Z' },
  { m: 'HAM', d: 'M82 285 C83 300 84.5 318 86 334 C88 340 92 340 93.5 334 C96 318 97 300 97.5 286 C92 283 87 283 82 285 Z' },
  { m: 'CALF', d: 'M71 356 C66.5 368 67 384 73 398 C76 402 80.5 398 82 390 C83.5 376 83 362 81 354 C78 350 73.5 351 71 356 Z' },
  { m: 'CALF', d: 'M83 354 C86 362 88 376 88.5 390 C89.5 400 94.5 402 97 392 C99 378 98.5 364 94.5 354 C91 350 86 350 83 354 Z' },
  { m: 'CALF', d: 'M73.5 400 C77 406 80 410 82.5 414 L90 414 C92.5 408 94.5 402 96 396 C93 403 89 404 86 399 C83 404 77.5 404 73.5 400 Z' },
];

/** 좌우 거울 복사 */
const fitAll = (list: Shape[]) => list.map((x) => ({ ...x, d: fit(x.d) }));
const FRONT_FIT = fitAll(FRONT), BACK_FIT = fitAll(BACK);
const FRONT_LINES_FIT = FRONT_LINES.map(fit), BACK_LINES_FIT = BACK_LINES.map(fit);

const mirrorPath = (d: string) => {
  let i = 0;
  return d.replace(/-?\d+(?:\.\d+)?/g, (n) => (i++ % 2 === 0 ? (200 - Number(n)).toFixed(1) : n));
};

function Body({ shapes, lines, e, label, face }: { shapes: Shape[]; lines: string[]; e: Exercise; label: string; face?: boolean }) {
  const role = (m: MuscleCode | null) => (!m ? '' : e.primary[m] ? 'p' : e.secondary[m] ? 's' : '');
  const fid = useId().replace(/:/g, '');
  return (
    <figure className="mm-fig">
      <svg viewBox="0 0 200 446" role="img" aria-label={`${label} 자극 부위`}>
        <defs>
          {/* 근육 가장자리에 안쪽 그림자 → 입체감 */}
          <filter id={fid} x="-10%" y="-10%" width="120%" height="120%">
            <feComponentTransfer in="SourceAlpha"><feFuncA type="table" tableValues="1 0" /></feComponentTransfer>
            <feGaussianBlur stdDeviation="2.2" />
            <feOffset dx="1.2" dy="1.6" result="sh" />
            <feFlood floodColor="#0b1530" floodOpacity="0.22" />
            <feComposite in2="sh" operator="in" />
            <feComposite in2="SourceAlpha" operator="in" result="inner" />
            <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="inner" /></feMerge>
          </filter>
        </defs>
        <g className="mm-body">
          <ellipse cx="81" cy="39" rx="2.8" ry="6" />
          <ellipse cx="119" cy="39" rx="2.8" ry="6" />
          <ellipse cx="100" cy="36" rx="19" ry="26" />
        </g>
        <g className="mm-fill">
          <path d={OUTLINE} />
          <path d={mirrorPath(OUTLINE)} />
        </g>
        <g className="mm-edge">
          <path d={EDGE} />
          <path d={mirrorPath(EDGE)} />
        </g>
        {face && <path className="mm-line" d="M93.5 47 C97.5 49.5 102.5 49.5 106.5 47" />}
        <g filter={`url(#${fid})`}>
        {shapes.map((s, i) => {
          const r = role(s.m);
          return (
            <g key={i} className={`mm-m ${r}`}>
              {s.m && <title>{MUSCLES[s.m].full ?? MUSCLES[s.m].ko}</title>}
              <path d={s.d} />
              <path d={mirrorPath(s.d)} />
            </g>
          );
        })}
        </g>
        <g className="mm-line">
          {lines.map((d, i) => <path key={i} d={d} />)}
          {lines.map((d, i) => <path key={`m${i}`} d={mirrorPath(d)} />)}
        </g>
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
        <Body shapes={FRONT_FIT} lines={FRONT_LINES_FIT} e={e} label="앞" face />
        <Body shapes={BACK_FIT} lines={BACK_LINES_FIT} e={e} label="뒤" />
      </div>
    </div>
  );
}
