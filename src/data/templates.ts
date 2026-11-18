export interface TemplateRoutine {
  name: string;
  timesPerWeek: number;
  items: [name: string, sets: number][];
}

export interface Template {
  id: string;
  title: string;
  desc: string;
  routines: TemplateRoutine[];
}

export const TEMPLATES: Template[] = [
  {
    id: 'full',
    title: '무분할 (전신 A/B, 주 3회)',
    desc: '초보에게 추천. 매 운동마다 전신을 하고 A·B를 번갈아 해요.',
    routines: [
      { name: '전신 A', timesPerWeek: 2, items: [['스쿼트', 3], ['벤치프레스', 3], ['랫풀다운', 3], ['루마니안 데드리프트', 3], ['사이드 레터럴 레이즈', 3], ['케이블 오버헤드 트라이셉스 익스텐션', 2]] },
      { name: '전신 B', timesPerWeek: 1, items: [['레그프레스', 3], ['인클라인 덤벨 프레스', 3], ['시티드 케이블 로우', 3], ['시티드 레그컬', 3], ['인클라인 덤벨 컬', 2], ['스탠딩 카프레이즈', 3], ['앱 롤아웃', 2]] },
    ],
  },
  {
    id: 'upper-lower',
    title: '2분할 (상체/하체, 주 4회)',
    desc: '중급자에게 추천. 근육마다 주 2회씩 자극해요.',
    routines: [
      { name: '상체', timesPerWeek: 2, items: [['벤치프레스', 3], ['바벨로우', 3], ['인클라인 덤벨 프레스', 2], ['랫풀다운', 3], ['사이드 레터럴 레이즈', 3], ['리버스 펙덱', 2], ['인클라인 덤벨 컬', 2], ['케이블 오버헤드 트라이셉스 익스텐션', 2]] },
      { name: '하체', timesPerWeek: 2, items: [['스쿼트', 3], ['루마니안 데드리프트', 3], ['레그 익스텐션', 2], ['시티드 레그컬', 3], ['스탠딩 카프레이즈', 3], ['케이블 크런치', 3]] },
    ],
  },
  {
    id: 'ppl',
    title: '3분할 (밀기/당기기/하체, 주 6회)',
    desc: '운동을 자주 할 수 있는 중·상급자용. 각 루틴을 주 2회씩 해요.',
    routines: [
      { name: '밀기', timesPerWeek: 2, items: [['벤치프레스', 3], ['인클라인 덤벨 프레스', 3], ['시티드 덤벨 숄더프레스', 2], ['사이드 레터럴 레이즈', 3], ['케이블 크로스오버', 2], ['케이블 오버헤드 트라이셉스 익스텐션', 2], ['로프 푸시다운', 2]] },
      { name: '당기기', timesPerWeek: 2, items: [['풀업', 3], ['바벨로우', 3], ['시티드 케이블 로우', 2], ['페이스풀', 3], ['인클라인 덤벨 컬', 3], ['해머 컬', 2]] },
      { name: '하체', timesPerWeek: 2, items: [['스쿼트', 3], ['루마니안 데드리프트', 3], ['레그프레스', 2], ['시티드 레그컬', 3], ['레그 익스텐션', 2], ['스탠딩 카프레이즈', 3], ['행잉 레그레이즈', 3]] },
    ],
  },
];
