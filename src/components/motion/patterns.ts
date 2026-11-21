import type { Exercise } from '../../types';
import type { Pose } from './engine';

/**
 * 동작 패턴 정의. 비슷한 종목은 같은 패턴을 쓰고, 장비(바벨/덤벨/케이블)와 자세 변형만 바꾼다.
 * side: 옆모습(오른쪽을 봄), front: 앞모습(팔·다리를 옆으로 벌리는 동작)
 */

export type Equip = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'none' | 'kettlebell';
export type Prop =
  | { k: 'bench'; x1: number; y1: number; x2: number; y2: number }      // 벤치·패드 (두 점 사이 두꺼운 판)
  | { k: 'seat'; x: number; y: number; w: number; back?: { x: number; y: number } }
  | { k: 'bar-high'; y: number; x1: number; x2: number }                 // 철봉·평행봉
  | { k: 'anchor'; x: number; y: number }                               // 케이블 도르래 위치
  | { k: 'platform'; at: 'toe' }                                        // 레그프레스 발판
  | { k: 'pad'; at: 'ankle-front' | 'ankle-back' | 'hip' | 'shin' }     // 머신 패드
  | { k: 'wheel' };                                                     // 앱 롤아웃 바퀴

export interface SidePattern {
  view: 'side';
  a: Pose; b: Pose;
  hold: 'hands' | 'back' | 'front-rack' | 'hip' | 'chest' | 'none'; // 무게를 어디에 드는지
  props?: Prop[];
  hl: ('arm' | 'leg' | 'torso')[];
  cues: string[];
}

/** 앞모습: 팔(어깨에서)과 다리(엉덩이에서)를 몸 바깥쪽으로 벌리는 각도. 0 = 아래, 90 = 옆, 180 = 위 */
export interface FrontPose { ua: number; fa: number; lift?: number; shrug?: number; leg?: number; knee?: number }
export interface FrontPattern {
  view: 'front';
  a: FrontPose; b: FrontPose;
  hold: 'hands-bar' | 'hands' | 'none';
  hang?: boolean;          // 손이 고정(철봉)
  seated?: boolean;
  cable?: 'top' | 'top-wide' | 'none';
  hl: ('arm' | 'leg' | 'torso')[];
  cues: string[];
}

export type Pattern = (SidePattern | FrontPattern) & { name: string };

const A = (x: number) => ({ at: 'ankle' as const, x });
const standArms = { ua: 2, fa: 4 };

export const PATTERNS: Record<string, Pattern> = {
  squat: {
    name: '스쿼트', view: 'side', hold: 'back', hl: ['leg'],
    a: { anchor: A(100), torso: 176, ua: -35, fa: 160, th: 0, sh: 0 },
    b: { anchor: A(100), torso: 140, ua: -70, fa: 125, th: 85, sh: -32 },
    cues: ['발은 어깨너비, 무릎은 발끝 방향으로', '허벅지가 바닥과 평행 이하까지 앉기', '가슴을 세우고 발 전체로 밀어 올라오기'],
  },
  frontSquat: {
    name: '프론트 스쿼트', view: 'side', hold: 'front-rack', hl: ['leg'],
    a: { anchor: A(100), torso: 179, ua: 105, fa: -80, th: 0, sh: 0 },
    b: { anchor: A(100), torso: 156, ua: 95, fa: -95, th: 88, sh: -36 },
    cues: ['팔꿈치를 높게 들어 바를 어깨에 올리기', '상체를 세운 채 깊게 앉기', '무릎이 발끝 방향으로 나가도 괜찮아요'],
  },
  goblet: {
    name: '고블릿 스쿼트', view: 'side', hold: 'chest', hl: ['leg'],
    a: { anchor: A(100), torso: 178, ua: 18, fa: 162, th: 0, sh: 0 },
    b: { anchor: A(100), torso: 152, ua: 0, fa: 140, th: 88, sh: -36 },
    cues: ['덤벨을 가슴에 붙여 들기', '팔꿈치가 무릎 안쪽을 스치도록 깊게', '상체를 세우고 일어나기'],
  },
  legPress: {
    name: '레그프레스', view: 'side', hold: 'none', hl: ['leg'],
    props: [{ k: 'seat', x: 62, y: 128, w: 40, back: { x: 30, y: 84 } }, { k: 'platform', at: 'toe' }],
    a: { anchor: { at: 'hip', x: 80, y: 124 }, torso: -128, ua: 30, fa: 60, th: 118, sh: 118, foot: 28 },
    b: { anchor: { at: 'hip', x: 80, y: 124 }, torso: -128, ua: 30, fa: 60, th: 165, sh: 72, foot: 28 },
    cues: ['허리를 등받이에 붙인 채로', '무릎이 가슴 쪽으로 올 때까지 내리기', '무릎을 완전히 잠그지 말고 밀기'],
  },
  hinge: {
    name: '루마니안 데드리프트', view: 'side', hold: 'hands', hl: ['leg', 'torso'],
    a: { anchor: A(100), torso: 178, ua: -4, fa: -4, th: 0, sh: 0 },
    b: { anchor: A(100), torso: 113, ua: -12, fa: -12, th: 35, sh: -2 },
    cues: ['무릎은 살짝만 굽히고 엉덩이를 뒤로 빼기', '바를 허벅지·정강이에 붙여 내리기', '허리는 곧게, 햄스트링이 당길 때까지'],
  },
  deadlift: {
    name: '데드리프트', view: 'side', hold: 'hands', hl: ['leg', 'torso'],
    a: { anchor: A(100), torso: 178, ua: -4, fa: -4, th: 0, sh: 0 },
    b: { anchor: A(100), torso: 130, ua: -10, fa: -10, th: 65, sh: -25 },
    cues: ['바는 발 중앙 위, 정강이에 붙여서', '허리를 곧게 펴고 바닥을 밀듯이 일어나기', '위에서 허리를 젖히지 말고 엉덩이만 펴기'],
  },
  goodMorning: {
    name: '굿모닝', view: 'side', hold: 'back', hl: ['torso', 'leg'],
    a: { anchor: A(100), torso: 178, ua: -35, fa: 160, th: 0, sh: 0 },
    b: { anchor: A(100), torso: 105, ua: -105, fa: 95, th: 32, sh: -2 },
    cues: ['바를 등 위에 얹고 무릎은 살짝', '엉덩이를 뒤로 빼며 상체 숙이기', '허리 곡선을 유지한 채 돌아오기'],
  },
  hipThrust: {
    name: '힙쓰러스트', view: 'side', hold: 'hip', hl: ['leg'],
    props: [{ k: 'bench', x1: 18, y1: 140, x2: 66, y2: 140 }],
    a: { anchor: A(140), torso: -115, ua: 55, fa: 75, th: 125, sh: -15 },
    b: { anchor: A(140), torso: -90, ua: 80, fa: 100, th: 90, sh: 0 },
    cues: ['날개뼈 아래를 벤치에 걸치기', '턱을 당기고 엉덩이를 끝까지 들어 올리기', '위에서 1초 엉덩이 조이기'],
  },
  lunge: {
    name: '런지', view: 'side', hold: 'hands', hl: ['leg'],
    a: { anchor: A(118), torso: 179, ...standArms, th: 10, sh: 0, th2: -22, sh2: -25, foot2: 40 },
    b: { anchor: A(118), torso: 176, ...standArms, th: 88, sh: -10, th2: 2, sh2: -88, foot2: 10 },
    cues: ['앞발 뒤꿈치로 체중 싣기', '뒷무릎이 바닥에 닿기 직전까지', '상체는 세우고 앞무릎은 발끝 방향'],
  },
  gluteKickback: {
    name: '글루트 킥백', view: 'side', hold: 'none', hl: ['leg'],
    props: [{ k: 'anchor', x: 22, y: 172 }],
    a: { anchor: A(112), torso: 160, ua: 30, fa: 60, th: 0, sh: 0, th2: 8, sh2: 0, foot2: 90 },
    b: { anchor: A(112), torso: 160, ua: 30, fa: 60, th: 0, sh: 0, th2: -42, sh2: -42, foot2: 50 },
    cues: ['상체를 살짝 숙이고 지지하는 다리는 고정', '다리를 뒤로 차며 엉덩이를 조이기', '허리를 젖혀서 들지 않기'],
  },
  legExt: {
    name: '레그 익스텐션', view: 'side', hold: 'none', hl: ['leg'],
    props: [{ k: 'seat', x: 70, y: 128, w: 60, back: { x: 66, y: 66 } }, { k: 'pad', at: 'ankle-front' }],
    a: { anchor: { at: 'hip', x: 88, y: 122 }, torso: -174, ua: 8, fa: 70, th: 90, sh: -8, foot: 82 },
    b: { anchor: { at: 'hip', x: 88, y: 122 }, torso: -174, ua: 8, fa: 70, th: 90, sh: 86, foot: 176 },
    cues: ['무릎 관절을 기계 축에 맞추기', '다리를 끝까지 펴고 1초 버티기', '천천히 내리기'],
  },
  legCurlSeated: {
    name: '시티드 레그컬', view: 'side', hold: 'none', hl: ['leg'],
    props: [{ k: 'seat', x: 70, y: 128, w: 60, back: { x: 66, y: 66 } }, { k: 'pad', at: 'ankle-back' }],
    a: { anchor: { at: 'hip', x: 88, y: 122 }, torso: -168, ua: 8, fa: 70, th: 90, sh: 84, foot: 176 },
    b: { anchor: { at: 'hip', x: 88, y: 122 }, torso: -168, ua: 8, fa: 70, th: 90, sh: -28, foot: 60 },
    cues: ['허벅지 패드로 무릎 위를 고정', '발뒤꿈치를 엉덩이 쪽으로 끌어당기기', '다리를 펼 때도 천천히'],
  },
  legCurlLying: {
    name: '라잉 레그컬', view: 'side', hold: 'none', hl: ['leg'],
    props: [{ k: 'bench', x1: 30, y1: 146, x2: 150, y2: 146 }, { k: 'pad', at: 'ankle-back' }],
    a: { anchor: { at: 'hip', x: 96, y: 138 }, torso: -90, head: -100, ua: -40, fa: -90, th: 90, sh: 90, foot: 10 },
    b: { anchor: { at: 'hip', x: 96, y: 138 }, torso: -90, head: -100, ua: -40, fa: -90, th: 90, sh: -165, foot: -80 },
    cues: ['엉덩이가 들리지 않게 골반을 패드에 붙이기', '발뒤꿈치를 엉덩이까지 당기기', '내릴 때 무릎을 다 펴지 않기'],
  },
  calf: {
    name: '카프레이즈', view: 'side', hold: 'hands', hl: ['leg'],
    a: { anchor: { at: 'ankle', x: 100, y: 176 }, torso: 180, ...standArms, th: 0, sh: 0, foot: 98 },
    b: { anchor: { at: 'ankle', x: 100, y: 164 }, torso: 180, ...standArms, th: 0, sh: 0, foot: 38 },
    cues: ['발 앞쪽으로 서서 뒤꿈치를 최대한 내리기', '까치발로 끝까지 올라가 1초 멈추기', '무릎은 펴고 반동 없이'],
  },
  seatedCalf: {
    name: '시티드 카프레이즈', view: 'side', hold: 'none', hl: ['leg'],
    props: [{ k: 'seat', x: 62, y: 134, w: 46 }, { k: 'pad', at: 'shin' }],
    a: { anchor: { at: 'hip', x: 86, y: 128 }, torso: 178, ua: 20, fa: 90, th: 90, sh: 2, foot: 100 },
    b: { anchor: { at: 'hip', x: 86, y: 118 }, torso: 178, ua: 20, fa: 90, th: 90, sh: 2, foot: 45 },
    cues: ['무릎 위에 패드를 대고 앉기', '뒤꿈치를 끝까지 내렸다 올리기', '가자미근 위주로 자극돼요'],
  },
  bench: {
    name: '벤치프레스', view: 'side', hold: 'hands', hl: ['arm', 'torso'],
    props: [{ k: 'bench', x1: 28, y1: 130, x2: 124, y2: 130 }],
    a: { anchor: { at: 'hip', x: 116, y: 124 }, torso: -90, ua: 178, fa: 178, th: 100, sh: -5 },
    b: { anchor: { at: 'hip', x: 116, y: 124 }, torso: -90, ua: 75, fa: 172, th: 100, sh: -5 },
    cues: ['날개뼈를 모으고 가슴을 들기', '바를 명치~가슴 아래로 내리기', '팔꿈치는 몸통과 45° 정도로'],
  },
  incline: {
    name: '인클라인 프레스', view: 'side', hold: 'hands', hl: ['arm', 'torso'],
    props: [{ k: 'bench', x1: 52, y1: 76, x2: 112, y2: 128 }, { k: 'seat', x: 104, y: 132, w: 30 }],
    a: { anchor: { at: 'hip', x: 112, y: 124 }, torso: -132, ua: 178, fa: 178, th: 92, sh: -5 },
    b: { anchor: { at: 'hip', x: 112, y: 124 }, torso: -132, ua: 100, fa: 168, th: 92, sh: -5 },
    cues: ['벤치 각도는 30° 정도가 윗가슴에 좋아요', '쇄골 아래로 바를 내리기', '어깨가 들리지 않게'],
  },
  pushup: {
    name: '푸시업', view: 'side', hold: 'none', hl: ['arm', 'torso'],
    a: { anchor: { at: 'hand', x: 50, y: 177 }, torso: -112, ua: 0, fa: 0, th: 68, sh: 68 },
    b: { anchor: { at: 'hand', x: 50, y: 177 }, torso: -95, ua: 70, fa: -80, th: 86, sh: 86 },
    cues: ['머리부터 발끝까지 일직선', '가슴이 바닥에 닿기 직전까지', '팔꿈치는 몸통 쪽으로 45°'],
  },
  dip: {
    name: '딥스', view: 'side', hold: 'none', hl: ['arm', 'torso'],
    props: [{ k: 'bar-high', y: 90, x1: 70, x2: 130 }],
    a: { anchor: { at: 'hand', x: 100, y: 90 }, torso: 172, ua: 0, fa: 0, th: 40, sh: -100, foot: -10 },
    b: { anchor: { at: 'hand', x: 100, y: 90 }, torso: 155, ua: -128, fa: 42, th: 60, sh: -100, foot: -10 },
    cues: ['상체를 살짝 숙이면 가슴, 세우면 삼두', '어깨가 팔꿈치 높이까지 내려가기', '어깨가 으쓱 올라가지 않게'],
  },
  ohp: {
    name: '오버헤드 프레스', view: 'side', hold: 'hands', hl: ['arm'],
    a: { anchor: A(100), torso: 180, ua: 25, fa: 160, th: 0, sh: 0 },
    b: { anchor: A(100), torso: 180, ua: 179, fa: 179, th: 0, sh: 0 },
    cues: ['엉덩이·복부에 힘을 주고 허리 젖히지 않기', '바를 얼굴 앞으로 지나 머리 위로', '팔을 다 펴면 머리를 바 아래로 넣기'],
  },
  ohpSeated: {
    name: '숄더 프레스', view: 'side', hold: 'hands', hl: ['arm'],
    props: [{ k: 'seat', x: 64, y: 134, w: 44, back: { x: 70, y: 70 } }],
    a: { anchor: { at: 'hip', x: 86, y: 128 }, torso: -178, ua: 30, fa: 160, th: 90, sh: 0 },
    b: { anchor: { at: 'hip', x: 86, y: 128 }, torso: -178, ua: 179, fa: 179, th: 90, sh: 0 },
    cues: ['등받이에 기대고 허리 젖히지 않기', '귀 높이까지 내렸다가 머리 위로', '팔을 끝까지 펴되 어깨는 내리기'],
  },
  frontRaise: {
    name: '프론트 레이즈', view: 'side', hold: 'hands', hl: ['arm'],
    a: { anchor: A(100), torso: 180, ua: 4, fa: 8, th: 0, sh: 0 },
    b: { anchor: A(100), torso: 180, ua: 92, fa: 96, th: 0, sh: 0 },
    cues: ['팔꿈치를 살짝 굽힌 채', '어깨 높이까지만 들기', '반동 없이 천천히 내리기'],
  },
  uprightRow: {
    name: '업라이트 로우', view: 'side', hold: 'hands', hl: ['arm'],
    a: { anchor: A(100), torso: 180, ua: -3, fa: -3, th: 0, sh: 0 },
    b: { anchor: A(100), torso: 180, ua: -108, fa: 62, th: 0, sh: 0 },
    cues: ['팔꿈치가 손보다 높게 올라가도록', '가슴 높이까지만 당기기', '어깨가 불편하면 그립을 넓게'],
  },
  rearDelt: {
    name: '리어 델트 플라이', view: 'side', hold: 'hands', hl: ['arm'],
    a: { anchor: A(100), torso: 100, ua: 2, fa: 6, th: 28, sh: -6 },
    b: { anchor: A(100), torso: 100, ua: 150, fa: 158, th: 28, sh: -6 },
    cues: ['상체를 숙이고 팔을 옆으로 벌리기', '날개뼈를 너무 모으지 말고 어깨 뒤로 들기', '가벼운 무게로 천천히'],
  },
  facePull: {
    name: '페이스풀', view: 'side', hold: 'hands', hl: ['arm'],
    props: [{ k: 'anchor', x: 192, y: 34 }],
    a: { anchor: A(96), torso: 186, ua: 88, fa: 88, th: 0, sh: 0 },
    b: { anchor: A(96), torso: 186, ua: -92, fa: 140, th: 0, sh: 0 },
    cues: ['케이블을 눈높이에 맞추기', '로프를 얼굴 쪽으로, 손은 귀 옆까지 벌리기', '팔꿈치를 높게 유지'],
  },
  rowBent: {
    name: '벤트오버 로우', view: 'side', hold: 'hands', hl: ['arm', 'torso'],
    a: { anchor: A(100), torso: 112, ua: 2, fa: 2, th: 30, sh: -10 },
    b: { anchor: A(100), torso: 112, ua: -112, fa: 4, th: 30, sh: -10 },
    cues: ['허리를 곧게 펴고 상체를 숙이기', '팔꿈치를 몸통 뒤로 당기기', '배꼽 쪽으로 당기고 천천히 내리기'],
  },
  rowSeated: {
    name: '시티드 로우', view: 'side', hold: 'hands', hl: ['arm', 'torso'],
    props: [{ k: 'seat', x: 58, y: 156, w: 50 }, { k: 'anchor', x: 186, y: 140 }],
    a: { anchor: { at: 'hip', x: 82, y: 150 }, torso: 160, ua: 92, fa: 92, th: 84, sh: 96, foot: 175 },
    b: { anchor: { at: 'hip', x: 82, y: 150 }, torso: 182, ua: -58, fa: 94, th: 84, sh: 96, foot: 175 },
    cues: ['가슴을 펴고 상체는 거의 고정', '팔꿈치를 옆구리 뒤로 당기기', '당긴 뒤 날개뼈를 1초 모으기'],
  },
  pullover: {
    name: '스트레이트 암 풀다운', view: 'side', hold: 'hands', hl: ['arm', 'torso'],
    props: [{ k: 'anchor', x: 168, y: 8 }],
    a: { anchor: A(96), torso: 158, ua: 132, fa: 132, th: 6, sh: 0 },
    b: { anchor: A(96), torso: 158, ua: 8, fa: 8, th: 6, sh: 0 },
    cues: ['팔꿈치를 거의 편 채로', '손을 허벅지 쪽으로 크게 끌어내리기', '광배에 힘이 들어가는 걸 느끼며'],
  },
  dbPullover: {
    name: '덤벨 풀오버', view: 'side', hold: 'hands', hl: ['arm', 'torso'],
    props: [{ k: 'bench', x1: 56, y1: 130, x2: 116, y2: 130 }],
    a: { anchor: { at: 'hip', x: 134, y: 128 }, torso: -96, ua: -100, fa: -104, th: 70, sh: 10 },
    b: { anchor: { at: 'hip', x: 134, y: 128 }, torso: -96, ua: -176, fa: -178, th: 70, sh: 10 },
    cues: ['어깨만 벤치에 걸치고 엉덩이는 낮게', '팔을 머리 뒤로 크게 넘기기', '가슴 위까지만 다시 올리기'],
  },
  curl: {
    name: '컬', view: 'side', hold: 'hands', hl: ['arm'],
    a: { anchor: A(100), torso: 180, ua: 4, fa: 6, th: 0, sh: 0 },
    b: { anchor: A(100), torso: 180, ua: 10, fa: 158, th: 0, sh: 0 },
    cues: ['팔꿈치를 옆구리에 고정', '손목을 꺾지 말고 끝까지 올리기', '내릴 때 팔을 거의 다 펴기'],
  },
  preacher: {
    name: '프리처 컬', view: 'side', hold: 'hands', hl: ['arm'],
    props: [{ k: 'bench', x1: 108, y1: 64, x2: 132, y2: 90 }, { k: 'seat', x: 66, y: 134, w: 40 }],
    a: { anchor: { at: 'hip', x: 88, y: 128 }, torso: 168, ua: 48, fa: 62, th: 90, sh: 0 },
    b: { anchor: { at: 'hip', x: 88, y: 128 }, torso: 168, ua: 48, fa: 172, th: 90, sh: 0 },
    cues: ['겨드랑이를 패드 위에 밀착', '팔을 거의 다 펴서 늘어난 자세까지', '반동 없이 올리기'],
  },
  inclineCurl: {
    name: '인클라인 덤벨 컬', view: 'side', hold: 'hands', hl: ['arm'],
    props: [{ k: 'bench', x1: 40, y1: 62, x2: 98, y2: 124 }, { k: 'seat', x: 92, y: 130, w: 34 }],
    a: { anchor: { at: 'hip', x: 102, y: 124 }, torso: -140, ua: -4, fa: -4, th: 90, sh: 0 },
    b: { anchor: { at: 'hip', x: 102, y: 124 }, torso: -140, ua: -4, fa: 150, th: 90, sh: 0 },
    cues: ['팔을 몸 뒤로 늘어뜨려 이두를 늘린 채 시작', '팔꿈치는 고정하고 손만 올리기', '천천히 끝까지 내리기'],
  },
  pushdown: {
    name: '푸시다운', view: 'side', hold: 'hands', hl: ['arm'],
    props: [{ k: 'anchor', x: 122, y: 6 }],
    a: { anchor: A(96), torso: 172, ua: 10, fa: 148, th: 0, sh: 0 },
    b: { anchor: A(96), torso: 172, ua: 8, fa: 6, th: 0, sh: 0 },
    cues: ['팔꿈치를 옆구리에 붙이고 고정', '팔을 끝까지 펴고 1초', '올라올 때 팔꿈치가 앞으로 나오지 않게'],
  },
  overheadExt: {
    name: '오버헤드 익스텐션', view: 'side', hold: 'hands', hl: ['arm'],
    a: { anchor: A(100), torso: 180, ua: 172, fa: -12, th: 0, sh: 0 },
    b: { anchor: A(100), torso: 180, ua: 172, fa: 176, th: 0, sh: 0 },
    cues: ['팔꿈치를 머리 옆에 고정', '손을 머리 뒤로 깊게 내려 삼두를 늘리기', '팔을 끝까지 펴기'],
  },
  overheadExtCable: {
    name: '케이블 오버헤드 익스텐션', view: 'side', hold: 'hands', hl: ['arm'],
    props: [{ k: 'anchor', x: 40, y: 170 }],
    a: { anchor: A(108), torso: 150, ua: 148, fa: -40, th: 10, sh: 0, th2: -14, sh2: -14 },
    b: { anchor: A(108), torso: 150, ua: 148, fa: 128, th: 10, sh: 0, th2: -14, sh2: -14 },
    cues: ['케이블을 등지고 한 발 앞으로', '팔꿈치를 머리 옆에 고정', '앞으로 끝까지 펴기'],
  },
  skull: {
    name: '라잉 트라이셉스 익스텐션', view: 'side', hold: 'hands', hl: ['arm'],
    props: [{ k: 'bench', x1: 28, y1: 130, x2: 124, y2: 130 }],
    a: { anchor: { at: 'hip', x: 116, y: 124 }, torso: -90, ua: -168, fa: -168, th: 100, sh: -5 },
    b: { anchor: { at: 'hip', x: 116, y: 124 }, torso: -90, ua: -160, fa: -62, th: 100, sh: -5 },
    cues: ['팔꿈치를 살짝 머리 쪽으로 기울여 고정', '바를 이마 위~머리 뒤로 내리기', '팔꿈치가 벌어지지 않게'],
  },
  kickback: {
    name: '킥백', view: 'side', hold: 'hands', hl: ['arm'],
    a: { anchor: A(100), torso: 110, ua: -98, fa: 2, th: 28, sh: -8 },
    b: { anchor: A(100), torso: 110, ua: -98, fa: -96, th: 28, sh: -8 },
    cues: ['위팔을 몸통과 나란히 고정', '팔을 뒤로 끝까지 펴기', '반동 없이 천천히'],
  },
  wristCurl: {
    name: '리스트 컬', view: 'side', hold: 'hands', hl: ['arm'],
    props: [{ k: 'seat', x: 62, y: 134, w: 40 }],
    a: { anchor: { at: 'hip', x: 86, y: 128 }, torso: 160, ua: 30, fa: 92, th: 90, sh: 0 },
    b: { anchor: { at: 'hip', x: 86, y: 128 }, torso: 160, ua: 30, fa: 84, th: 90, sh: 0 },
    cues: ['아래팔을 허벅지에 올리고 손목만 움직이기', '끝까지 내렸다 말아 올리기', '가벼운 무게로 많이'],
  },
  crunch: {
    name: '크런치', view: 'side', hold: 'none', hl: ['torso'],
    a: { anchor: { at: 'hip', x: 108, y: 172 }, torso: -90, ua: 120, fa: -90, th: 135, sh: 10 },
    b: { anchor: { at: 'hip', x: 108, y: 172 }, torso: -128, ua: 150, fa: -60, th: 135, sh: 10 },
    cues: ['허리를 바닥에 붙인 채로', '갈비뼈를 골반 쪽으로 말아 올리기', '목을 당기지 말고 복근으로'],
  },
  cableCrunch: {
    name: '케이블 크런치', view: 'side', hold: 'hands', hl: ['torso'],
    props: [{ k: 'anchor', x: 108, y: 6 }],
    a: { anchor: { at: 'knee', x: 108, y: 176 }, torso: 172, ua: 150, fa: -150, th: 0, sh: -90, foot: -90 },
    b: { anchor: { at: 'knee', x: 108, y: 176 }, torso: 105, ua: 80, fa: -80, th: 6, sh: -90, foot: -90 },
    cues: ['무릎 꿇고 로프를 머리 옆에', '엉덩이는 고정하고 몸통을 말기', '팔이 아니라 복근으로 당기기'],
  },
  legRaiseHang: {
    name: '행잉 레그레이즈', view: 'side', hold: 'none', hl: ['torso', 'leg'],
    props: [{ k: 'bar-high', y: 18, x1: 60, x2: 140 }],
    a: { anchor: { at: 'hand', x: 100, y: 18 }, torso: 180, ua: 180, fa: 180, th: 2, sh: 2 },
    b: { anchor: { at: 'hand', x: 100, y: 18 }, torso: 186, ua: 180, fa: 180, th: 96, sh: 96 },
    cues: ['몸이 흔들리지 않게 매달리기', '골반을 말아 올리듯 다리 들기', '천천히 내리기'],
  },
  legRaiseLying: {
    name: '라잉 레그레이즈', view: 'side', hold: 'none', hl: ['torso', 'leg'],
    a: { anchor: { at: 'hip', x: 96, y: 172 }, torso: -90, ua: 70, fa: 80, th: 86, sh: 86 },
    b: { anchor: { at: 'hip', x: 96, y: 172 }, torso: -90, ua: 70, fa: 80, th: 172, sh: 172 },
    cues: ['허리를 바닥에 붙이기', '다리를 수직까지 들기', '바닥에 닿기 직전까지 천천히'],
  },
  plank: {
    name: '플랭크', view: 'side', hold: 'none', hl: ['torso'],
    a: { anchor: { at: 'hip', x: 112, y: 150 }, torso: -100, ua: 0, fa: -90, th: 81, sh: 81 },
    b: { anchor: { at: 'hip', x: 112, y: 148 }, torso: -101, ua: 0, fa: -90, th: 82, sh: 82 },
    cues: ['팔꿈치는 어깨 바로 아래', '엉덩이가 처지거나 솟지 않게 일직선', '복부에 힘주고 숨은 계속 쉬기'],
  },
  rollout: {
    name: '앱 롤아웃', view: 'side', hold: 'none', hl: ['torso'],
    props: [{ k: 'wheel' }],
    a: { anchor: { at: 'knee', x: 130, y: 176 }, torso: 140, ua: 2, fa: 2, th: 30, sh: -90, foot: -90 },
    b: { anchor: { at: 'knee', x: 130, y: 176 }, torso: -104, ua: -100, fa: -100, th: 75, sh: -90, foot: -90 },
    cues: ['무릎 꿇고 바퀴를 어깨 아래에', '허리가 꺾이지 않는 데까지 굴려 나가기', '복부 힘으로 끌어당겨 돌아오기'],
  },
  backExt: {
    name: '백 익스텐션', view: 'side', hold: 'none', hl: ['torso', 'leg'],
    props: [{ k: 'pad', at: 'hip' }],
    a: { anchor: { at: 'hip', x: 96, y: 112 }, torso: 40, ua: 20, fa: 120, th: -45, sh: -45, foot: 45 },
    b: { anchor: { at: 'hip', x: 96, y: 112 }, torso: 132, ua: 110, fa: -150, th: -45, sh: -45, foot: 45 },
    cues: ['골반을 패드에 걸치기', '몸이 일직선이 될 때까지 올라오기', '위에서 허리를 과하게 젖히지 않기'],
  },
  swing: {
    name: '케틀벨 스윙', view: 'side', hold: 'hands', hl: ['leg', 'torso'],
    a: { anchor: A(100), torso: 120, ua: -24, fa: -30, th: 32, sh: -6 },
    b: { anchor: A(100), torso: 180, ua: 92, fa: 94, th: 0, sh: 0 },
    cues: ['엉덩이를 뒤로 빼며 다리 사이로', '엉덩이를 튕기듯 펴서 앞으로 띄우기', '팔이 아니라 엉덩이 힘으로'],
  },
  walk: {
    name: '걷기', view: 'side', hold: 'hands', hl: ['leg'],
    a: { anchor: { at: 'hip', x: 100, y: 92 }, torso: 178, ua: -18, fa: -10, ua2: 18, fa2: 30, th: 22, sh: 2, th2: -18, sh2: -24, foot2: 50 },
    b: { anchor: { at: 'hip', x: 100, y: 92 }, torso: 178, ua: 18, fa: 30, ua2: -18, fa2: -10, th: -18, sh: -24, th2: 22, sh2: 2, foot: 50 },
    cues: ['상체를 세우고 일정한 속도로', '팔을 자연스럽게 흔들기', '숨이 조금 찰 정도의 강도로'],
  },
  bike: {
    name: '사이클', view: 'side', hold: 'hands', hl: ['leg'],
    props: [{ k: 'seat', x: 78, y: 100, w: 26 }],
    a: { anchor: { at: 'hip', x: 90, y: 96 }, torso: 140, ua: 120, fa: 110, th: 60, sh: -10, th2: 95, sh2: 20 },
    b: { anchor: { at: 'hip', x: 90, y: 96 }, torso: 140, ua: 120, fa: 110, th: 95, sh: 20, th2: 60, sh2: -10 },
    cues: ['안장 높이는 다리가 거의 펴질 정도로', '일정한 박자로 페달 돌리기', '상체 힘은 빼기'],
  },
  rowErg: {
    name: '로잉머신', view: 'side', hold: 'hands', hl: ['leg', 'arm'],
    props: [{ k: 'anchor', x: 186, y: 140 }],
    a: { anchor: { at: 'hip', x: 70, y: 164 }, torso: 150, ua: 96, fa: 96, th: 150, sh: 30, foot: 120 },
    b: { anchor: { at: 'hip', x: 40, y: 164 }, torso: 196, ua: -50, fa: 96, th: 98, sh: 92, foot: 175 },
    cues: ['다리 → 몸통 → 팔 순서로 당기기', '돌아갈 때는 팔 → 몸통 → 다리', '등은 곧게'],
  },
  // ── 앞모습 ──
  lateral: {
    name: '사이드 레터럴 레이즈', view: 'front', hold: 'hands', hl: ['arm'],
    a: { ua: 10, fa: 12 }, b: { ua: 90, fa: 98 },
    cues: ['팔꿈치를 살짝 굽혀 고정', '어깨 높이까지 옆으로 들기', '승모가 으쓱하지 않게, 천천히 내리기'],
  },
  shrug: {
    name: '슈러그', view: 'front', hold: 'hands', hl: ['torso'],
    a: { ua: 4, fa: 4 }, b: { ua: 4, fa: 4, shrug: 9 },
    cues: ['팔은 힘 빼고 어깨만 귀 쪽으로', '위에서 1초 멈추기', '어깨를 돌리지 말고 위아래로'],
  },
  pullup: {
    name: '풀업', view: 'front', hold: 'hands-bar', hang: true, hl: ['arm', 'torso'],
    a: { ua: 160, fa: 166 }, b: { ua: 50, fa: 172, lift: 34 },
    cues: ['어깨를 내리며 시작', '가슴을 바 쪽으로 당겨 턱이 바 위로', '내려갈 때 팔을 거의 다 펴기'],
  },
  pulldown: {
    name: '랫풀다운', view: 'front', hold: 'hands-bar', seated: true, cable: 'top', hl: ['arm', 'torso'],
    a: { ua: 158, fa: 166 }, b: { ua: 40, fa: 168 },
    cues: ['가슴을 펴고 살짝만 뒤로 기대기', '바를 쇄골 쪽으로 당기기', '팔꿈치를 옆구리로 끌어내리는 느낌'],
  },
  fly: {
    name: '플라이', view: 'front', hold: 'hands', cable: 'top-wide', hl: ['arm', 'torso'],
    a: { ua: 100, fa: 106 }, b: { ua: 28, fa: 14 },
    cues: ['팔꿈치를 살짝 굽혀 각도 고정', '가슴을 펴고 크게 벌렸다가', '가슴 앞에서 손을 모으기'],
  },
  hipAbd: {
    name: '힙 어브덕션', view: 'front', hold: 'none', seated: true, hl: ['leg'],
    a: { ua: 20, fa: 30, leg: 4 }, b: { ua: 20, fa: 30, leg: 26 },
    cues: ['등을 기대고 골반 고정', '무릎을 바깥으로 밀어 벌리기', '천천히 모으기'],
  },
  hipAdd: {
    name: '힙 어덕션', view: 'front', hold: 'none', seated: true, hl: ['leg'],
    a: { ua: 20, fa: 30, leg: 28 }, b: { ua: 20, fa: 30, leg: 3 },
    cues: ['다리를 벌린 자세에서 시작', '허벅지 안쪽으로 모으기', '반동 없이 천천히'],
  },
};

/** 종목 → 패턴·장비. 이름 키워드로 고르고, 없으면 부위별 기본 패턴 */
export function patternFor(e: Exercise): { id: string; equip: Equip; exact: boolean } {
  const n = e.name, q = e.equipment;
  const equip: Equip = /케틀벨/.test(n + q) && !/덤벨/.test(q.split(/[/·+]/)[0]) ? 'kettlebell'
    : /^(바벨|EZ|스미스|트랩바)/.test(q) || /바벨|EZ|스미스/.test(n) ? 'barbell'
    : /덤벨/.test(q) || /덤벨/.test(n) ? 'dumbbell'
    : /케이블|풀리|로프/.test(q + n) ? 'cable'
    : /머신|스택|레그프레스|핵|펜듈럼/.test(q + n) ? 'machine' : 'none';
  const has = (re: RegExp) => re.test(n);
  const id =
    has(/러닝|트레드밀|천국|일립티컬|스텝/) ? 'walk'
    : has(/바이크|자전거|스피닝|에어바이크|어썰트/) ? 'bike'
    : has(/로잉머신|스키에르그|로잉$/) ? 'rowErg'
    : has(/파머스|썰매|캐리/) ? 'walk'
    : has(/스윙/) ? 'swing'
    : has(/시티드 카프/) ? 'seatedCalf'
    : has(/카프|티바 레이즈/) ? 'calf'
    : has(/레그 익스텐션|시시 스쿼트|리버스 노르딕/) ? 'legExt'
    : has(/시티드 레그컬/) ? 'legCurlSeated'
    : has(/레그컬|노르딕|글루트 햄|슬라이더/) ? 'legCurlLying'
    : has(/힙쓰러스트|글루트 브릿지|브릿지/) ? 'hipThrust'
    : has(/이너타이|어덕션$|어덕션\b/) && !has(/어브덕션/) ? 'hipAdd'
    : has(/아웃타이|어브덕션/) ? 'hipAbd'
    : has(/런지|스플릿|스텝업/) ? 'lunge'
    : has(/레그프레스|핵스쿼트|펜듈럼|벨트 스쿼트/) ? 'legPress'
    : has(/고블릿/) ? 'goblet'
    : has(/프론트 스쿼트|젤처|스러스터|클린|저크$/) ? 'frontSquat'
    : has(/스쿼트|스내치/) ? 'squat'
    : has(/굿모닝/) ? 'goodMorning'
    : has(/루마니안|RDL|스티프|풀스루|힙 익스텐션/) ? 'hinge'
    : has(/데드|랙풀/) ? 'deadlift'
    : has(/백 익스텐션|슈퍼맨|리버스 하이퍼|제퍼슨/) ? 'backExt'
    : has(/풀업|친업|턱걸이/) ? 'pullup'
    : has(/스트레이트 암|케이블 풀오버|풀오버 머신/) ? 'pullover'
    : has(/덤벨 풀오버/) ? 'dbPullover'
    : has(/풀다운/) ? 'pulldown'
    : has(/페이스풀/) ? 'facePull'
    : has(/리어 델트|리버스 펙덱|리어델트/) ? 'rearDelt'
    : has(/업라이트/) ? 'uprightRow'
    : has(/슈러그/) ? 'shrug'
    : has(/레터럴|사레레|Y 레이즈|Y레이즈|스캡션|외회전|내회전|쿠반/) ? 'lateral'
    : has(/프론트 레이즈/) ? 'frontRaise'
    : has(/플라이|크로스오버|펙덱/) ? 'fly'
    : has(/시티드 케이블 로우|시티드 로우|로우 머신|하이 로우|원암 케이블 로우|와이드 그립 시티드/) ? 'rowSeated'
    : has(/로우/) ? 'rowBent'
    : has(/플라이|크로스오버|펙덱/) ? 'fly'
    : has(/딥스/) ? 'dip'
    : has(/푸시업/) ? 'pushup'
    : has(/인클라인/) && has(/프레스|벤치/) ? 'incline'
    : has(/벤치|체스트 프레스|플로어 프레스|JM 프레스|스베드|랜드마인 프레스/) ? 'bench'
    : has(/시티드.*숄더|숄더프레스 머신|머신 숄더|스미스 숄더|시티드 바벨|시티드 덤벨/) ? 'ohpSeated'
    : has(/숄더프레스|오버헤드 프레스|밀리터리|아놀드|푸시 프레스|비하인드 넥 프레스|파이크/) ? 'ohp'
    : has(/프리처/) ? 'preacher'
    : has(/인클라인 덤벨 컬|베이지안/) ? 'inclineCurl'
    : has(/리스트 컬|리스트 롤러|핀치/) ? 'wristCurl'
    : has(/컬|21s/) ? 'curl'
    : has(/푸시다운/) ? 'pushdown'
    : has(/케이블 오버헤드/) ? 'overheadExtCable'
    : has(/오버헤드 익스텐션|오버헤드/) ? 'overheadExt'
    : has(/라잉 트라이셉스|스컬|테이트/) ? 'skull'
    : has(/킥백/) ? (e.category === 'legs' ? 'gluteKickback' : 'kickback')
    : has(/트라이셉스 익스텐션/) ? 'pushdown'
    : has(/케이블 크런치|머신 크런치/) ? 'cableCrunch'
    : has(/크런치|싯업|브이업|할로우|러시안|드래곤/) ? 'crunch'
    : has(/행잉|캡틴스|토즈투바|윈드실드|L-싯/) ? 'legRaiseHang'
    : has(/레그레이즈/) ? 'legRaiseLying'
    : has(/롤아웃/) ? 'rollout'
    : has(/플랭크|데드버그|버드독|팔로프|우드찹|사이드 벤드|겟업/) ? 'plank'
    : null;
  const fb = ({ chest: 'bench', shoulder: 'ohp', back: 'rowBent', arm: 'curl', legs: 'squat', core: 'crunch', full: 'walk' } as const)[e.category];
  return { id: id ?? fb, equip, exact: id !== null };
}
