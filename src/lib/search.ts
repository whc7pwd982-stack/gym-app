import { MUSCLES } from '../data/muscles';
import type { Exercise, MuscleCode } from '../types';

const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

export function choseong(s: string) {
  let out = '';
  for (const ch of s) {
    const c = ch.charCodeAt(0) - 0xac00;
    out += c >= 0 && c <= 11171 ? CHO[Math.floor(c / 588)] : ch;
  }
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s\-·()/]/g, '');
const isAllCho = (s: string) => /^[ㄱ-ㅎ]+$/.test(s);

const cache = new WeakMap<Exercise, { text: string; cho: string; muscles: string }>();
function index(e: Exercise) {
  let v = cache.get(e);
  if (!v) {
    const names = [e.name, ...e.aliases];
    const muscles = [...Object.keys(e.primary)].map((c) => MUSCLES[c as MuscleCode]?.ko ?? '').join(' ');
    v = {
      text: norm([...names, e.en, e.equipment].join('|')),
      cho: norm(names.map(choseong).join('|')),
      muscles: norm(muscles),
    };
    cache.set(e, v);
  }
  return v;
}

/** 점수: 이름 시작 일치 > 이름 포함 > 초성 > 주동근 이름 */
export function searchExercises(list: Exercise[], q: string): Exercise[] {
  const n = norm(q);
  if (!n) return list;
  const scored: [Exercise, number][] = [];
  for (const e of list) {
    const ix = index(e);
    let s = 0;
    if (norm(e.name).startsWith(n)) s = 100;
    else if (ix.text.includes(n)) s = 60;
    else if (isAllCho(n) && ix.cho.includes(n)) s = 40;
    else if (ix.muscles.includes(n)) s = 30;
    // 같은 점수대에서는 근비대 근거·늘어난 자세 종목을 위로
    if (s) scored.push([e, s + (e.hypertrophyEvidence ? 2 : 0) + (e.stretch ? 1 : 0) - e.name.length * 0.1]);
  }
  return scored.sort((a, b) => b[1] - a[1]).map((x) => x[0]);
}
