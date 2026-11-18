// 보고서(헬스장 운동 종목별 자극 부위.md)의 카탈로그 표를 src/data/exercises.json 으로 변환한다.
// 사용: node scripts/build-exercises.mjs "<보고서 경로>"
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
if (!src) throw new Error('보고서 경로를 인자로 주세요');
const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);

const CODES = ['CHEST', 'DELT_F', 'DELT_S', 'DELT_R', 'RC', 'LAT', 'UB', 'TRAP_U', 'TRAP_L', 'ES', 'BI', 'BR', 'TRI', 'FA',
  'QUAD', 'RF', 'HAM', 'GLU', 'ABD', 'ADD', 'CALF', 'TIB', 'ABS', 'OBL', 'HF', 'SERR'];
const ALIAS = { CORE: 'ABS', GAS: 'CALF', SOL: 'CALF', RA: 'ABS' };
const KO_ALIAS = { '상부등': 'UB', '등 중앙': 'UB', '광배': 'LAT', '삼두': 'TRI', '이두': 'BI', '전완': 'FA', '둔근': 'GLU' };

const SECTION = [
  [/가슴 카탈로그/, 'chest'], [/어깨 카탈로그/, 'shoulder'], [/등 카탈로그/, 'back'],
  [/팔꿈치 굴곡/, 'arm'], [/삼두/, 'arm'], [/전완/, 'arm'], [/하체 카탈로그/, 'legs'],
  [/코어 카탈로그/, 'core'], [/전신/, 'full'],
];

const clean = (s) => s.replace(/†/g, '').replace(/\*\*/g, '').trim();

function parseMuscles(cell, base, out) {
  if (!cell) return;
  for (let tok of cell.split(/[,;]/)) {
    tok = tok.trim();
    if (!tok || tok === '–' || tok === '-') continue;
    let w = base;
    const m25 = tok.match(/0\.25/);
    if (m25) w = 0.25;
    if (/\b0\s*$/.test(tok) && !m25) continue; // "HAM 0"
    let code = null;
    for (const c of tok.match(/[A-Z][A-Z_]+/g) || []) {
      const cc = ALIAS[c] || c;
      if (CODES.includes(cc)) { code = cc; break; }
    }
    if (!code) for (const [k, v] of Object.entries(KO_ALIAS)) if (tok.includes(k)) { code = v; break; }
    if (!code) continue;
    out[code] = Math.max(out[code] || 0, w);
  }
}

function parseName(cell) {
  const c = clean(cell);
  const m = c.match(/^([^(]+)\((.+)\)\s*(.*)$/);
  let name = c, aliases = [];
  if (m) { name = (m[1] + ' ' + m[3]).trim(); aliases = m[2].split(/[,/]/).map((s) => s.trim()).filter(Boolean); }
  const parts = name.split(/\s+\/\s+/);
  if (parts.length > 1) { name = parts[0]; aliases.push(...parts.slice(1)); }
  return { name: name.replace(/\s+/g, ' ').trim(), aliases };
}

function parseReps(s) {
  const m = (s || '').match(/(\d+)\s*[–-]\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

function parseIncrement(s, equipment) {
  const m = (s || '').match(/\+\s*(\d+(?:\.\d+)?)/);
  if (m) return Number(m[1]);
  if (/덤벨|케틀벨/.test(equipment + s)) return 2;
  if (/케이블|머신/.test(equipment)) return 2.5;
  return 2.5;
}

function metricOf(measure, equipment, primary, category) {
  const t = measure || '';
  if (category === 'full' && Object.keys(primary).length === 0 && /T/.test(t)) return 'cardio';
  if (/^\s*H\b|유지|홀드/.test(t)) return 'hold';
  if (/LD|거리/.test(t)) return 'carry';
  if (/어시스트/.test(equipment)) return 'assisted';
  if (/^\s*R\b/.test(t) || /맨몸|철봉|평행봉/.test(equipment)) return 'bodyweight';
  return 'weight_reps';
}

const out = [];
let section = null, header = null;
for (const line of lines) {
  if (line.startsWith('### ')) {
    section = null; header = null;
    for (const [re, cat] of SECTION) if (re.test(line) && /카탈로그/.test(line)) { section = cat; break; }
    continue;
  }
  if (line.startsWith('## ')) { section = null; header = null; continue; }
  if (!section || !line.startsWith('|')) continue;
  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  if (cells[0] === '#') { header = cells; continue; }
  if (!header || !/^\d+$/.test(cells[0])) continue;
  const col = (re) => { const i = header.findIndex((h) => re.test(h)); return i >= 0 ? cells[i] : ''; };

  const { name, aliases } = parseName(col(/한국/));
  const en = clean(col(/English/));
  const equipment = clean(col(/장비/));
  const primary = {}, secondary = {};
  parseMuscles(col(/주동/), 1, primary);
  parseMuscles(col(/보조/), 0.5, secondary);
  for (const k of Object.keys(primary)) delete secondary[k];
  const stretchRaw = col(/스트레치/);
  const stretch = /★/.test(stretchRaw) ? 'S★' : /S|✔/.test(stretchRaw) ? 'S' : /△/.test(stretchRaw) ? 'partial' : '';
  const repsCell = col(/^반복/);
  const incCell = col(/증량/) || repsCell;
  const measure = col(/측정/);
  const evidence = clean(col(/근거/));
  const category = section;
  const metric = metricOf(measure, equipment, primary, category);
  out.push({
    id: 'ex' + cells[0],
    name, aliases, en, equipment, category,
    primary, secondary, stretch,
    reps: parseReps(repsCell) || (metric === 'weight_reps' || metric === 'bodyweight' ? [8, 12] : null),
    increment: parseIncrement(incCell, equipment),
    metric,
    shoulder: col(/어깨/) || undefined,
    evidence: evidence || undefined,
    hypertrophyEvidence: /★비대/.test(evidence) || stretch === 'S★',
  });
}

const dest = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..', 'src', 'data', 'exercises.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 1));
const noMuscle = out.filter((e) => !Object.keys(e.primary).length && e.metric !== 'cardio');
console.log(`exercises: ${out.length}, no-primary: ${noMuscle.length}`);
console.log(noMuscle.map((e) => `${e.id} ${e.name}`).join('\n'));
