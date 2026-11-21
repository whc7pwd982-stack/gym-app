import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, ChevronRight, Download, Flame, Smartphone, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { db, exportAll, importAll, saveBodyweight, saveSettings, useBodyweight, useSettings } from '../db';
import { dateKey } from '../lib/session';
import { activityFactor, ageOf, bmr, calorieTarget, proteinTarget, weeklyRateTarget } from '../lib/nutrition';
import type { Exercise, Goal, Level, Phase, Settings, Sex } from '../types';
import { ExerciseInfo, ExerciseList } from './ExercisePicker';
import { Sheet, toast } from './ui';

function Opt<T extends string>({ value, options, onChange }: { value: T | null; options: [T, string, string?][]; onChange: (v: T) => void }) {
  return (
    <div className="opt-grid" style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 3)}, 1fr)` }}>
      {options.map(([v, label, sub]) => <button key={v} className={`opt ${value === v ? 'on' : ''}`} onClick={() => onChange(v)}>{label}{sub && <small>{sub}</small>}</button>)}
    </div>
  );
}

/**
 * 숫자 칸. 아이폰은 버튼을 눌러도 입력칸에서 포커스가 안 빠지는 경우가 있어서(blur 미발생)
 * 입력을 멈추고 잠깐 지나면(0.8초) 저장하고, 엔터·포커스 해제 때도 저장한다. 범위 밖 값은 저장하지 않는다.
 */
function NumField({ label, value, onSave, suffix, placeholder, min, max }: { label: string; value: number | null; onSave: (v: number | null) => void; suffix: string; placeholder: string; min: number; max: number }) {
  const [v, setV] = useState(value == null ? '' : String(value));
  useEffect(() => { setV(value == null ? '' : String(value)); }, [value]);
  const commit = (text: string) => {
    const n = Number(text.replace(',', '.'));
    if (text.trim() === '') { if (value != null) onSave(null); return; }
    if (n >= min && n <= max && n !== value) onSave(n);
  };
  useEffect(() => {
    if (v === (value == null ? '' : String(value))) return;
    const t = setTimeout(() => commit(v), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  return (
    <label className="field grow" style={{ marginBottom: 0 }}>
      <span className="field-label">{label}</span>
      <input className="input" inputMode="decimal" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => commit(v)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(v); }} />
      <span className="tiny muted">{suffix}</span>
    </label>
  );
}

export function ProfileTab() {
  const s = useSettings();
  const bw = useBodyweight();
  const recent = useLiveQuery(() => db.sessions.where('startedAt').above(Date.now() - 28 * 86400000).toArray(), [], []);
  const weights = useLiveQuery(() => db.bodyweights.orderBy('date').toArray(), [], []);
  const [sheet, setSheet] = useState<null | 'dict'>(null);
  const [info, setInfo] = useState<Exercise | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (p: Partial<Settings>) => saveSettings({ ...s, ...p });

  const age = ageOf(s);
  // 최근 4주 실제 운동한 날로 주당 횟수 추정 (기록이 없으면 주 3회로 가정)
  const loggedDays = new Set(recent.map((x) => new Date(x.startedAt).toDateString())).size;
  const days = loggedDays ? Math.max(1, Math.round(loggedDays / 4)) : 3;
  const base = bmr(s, bw);
  const maintenance = base ? Math.round(base * activityFactor(days)) : null;
  const kcal = maintenance ? calorieTarget(maintenance, s.phase, s.level) : null;
  const protein = bw ? proteinTarget(bw, s.phase, age) : null;
  const rate = weeklyRateTarget(s.phase, s.level);

  // 최근 2–4주 체중 변화율(주당 %)
  let actualRate: number | null = null;
  if (weights.length >= 2) {
    const last = weights[weights.length - 1];
    const lastT = new Date(last.date).getTime();
    const ref = [...weights].reverse().find((w) => lastT - new Date(w.date).getTime() >= 13 * 86400000);
    if (ref) actualRate = ((last.kg - ref.kg) / ref.kg) * 100 / ((lastT - new Date(ref.date).getTime()) / (7 * 86400000));
  }

  const doExport = async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const name = `nextrep-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'nextrep 백업' }); return; } catch { /* 취소 시 다운로드 */ }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
  };
  const doImport = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      if (!confirm('지금 기기의 기록을 백업 파일 내용으로 바꿀까요?')) return;
      await importAll(data);
      toast('불러오기 완료');
    } catch (e) { alert('불러오기 실패: ' + (e as Error).message); }
  };

  return (
    <>
      <div className="large-title">프로필</div>
      <p className="subtitle">정보를 넣으면 칼로리·단백질·반복 범위가 나에게 맞춰져요</p>

      <section className="card">
        <div className="field"><span className="field-label">성별</span><Opt<Sex> value={s.sex} options={[['male', '남성'], ['female', '여성']]} onChange={(v) => set({ sex: v })} /></div>
        <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
          <NumField label="출생연도" min={1920} max={new Date().getFullYear() - 10} value={s.birthYear} onSave={(v) => set({ birthYear: v })} suffix={age ? `만 ${age}세` : ''} placeholder="1998" />
          <NumField label="키" min={100} max={250} value={s.heightCm} onSave={(v) => set({ heightCm: v })} suffix="cm" placeholder="175" />
          <NumField label="체중" min={20} max={300} value={bw} onSave={(v) => v != null && saveBodyweight(dateKey(Date.now()), v)} suffix="kg · 오늘 체중으로 기록" placeholder="70" />
        </div>
      </section>

      <section className="card">
        <div className="field"><span className="field-label">운동 경력</span>
          <Opt<Level> value={s.level} options={[['beginner', '초보', '1년 미만'], ['intermediate', '중급', '1–3년'], ['advanced', '상급', '3년 이상']]} onChange={(v) => set({ level: v })} />
        </div>
        <div className="field"><span className="field-label">운동 목표</span>
          <Opt<Goal> value={s.goal} options={[['hypertrophy', '근육 키우기', '6–12회'], ['strength', '힘 키우기', '3–6회'], ['both', '둘 다', '5–10회']]} onChange={(v) => set({ goal: v })} />
        </div>
        <div className="field"><span className="field-label">세트를 어디까지 하나요?</span>
          <Opt<string> value={String(s.targetRir)} options={[['0', '실패까지', '더 못 들 때까지'], ['2', '1–2개 남기고', '여유 남기기']]} onChange={(v) => set({ targetRir: Number(v) })} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}><span className="field-label">지금 시기</span>
          <Opt<Phase> value={s.phase} options={[['bulk', '증량', '벌크업'], ['maintain', '유지'], ['cut', '감량', '다이어트']]} onChange={(v) => set({ phase: v })} />
        </div>
      </section>

      <div className="section-label">우리 헬스장 무게 단위</div>
      <section className="card">
        <p className="tiny muted" style={{ marginBottom: 12 }}>다음 무게를 추천할 때 실제로 만들 수 있는 무게만 골라요.</p>
        <div className="field"><span className="field-label">바벨 · 원판 — 가장 작은 원판 (한쪽)</span>
          <Opt<string> value={String(s.plateSide)} options={[['1.25', '1.25kg', '한 번에 +2.5kg'], ['2.5', '2.5kg', '한 번에 +5kg'], ['5', '5kg', '한 번에 +10kg']]} onChange={(v) => set({ plateSide: Number(v) })} />
        </div>
        <div className="field"><span className="field-label">기본 바벨 봉 무게 <span className="muted">(바벨컬처럼 다른 봉을 쓰는 종목은 기록 화면에서 따로 정해요)</span></span>
          <Opt<string> value={String(s.barKg)} options={[['20', '20kg', '올림픽 봉'], ['15', '15kg', '여성용 봉'], ['10', '10kg', '짧은 봉']]} onChange={(v) => set({ barKg: Number(v) })} />
        </div>
        <div className="field"><span className="field-label">스미스 머신 봉 실제 무게 <span className="muted">(기록은 프리 봉 20kg 기준으로 입력하면 돼요)</span></span>
          <Opt<string> value={String(s.smithBarKg)} options={[['5', '5kg', '가벼운 기종'], ['10', '10kg', '모르면 이것'], ['15', '15kg'], ['20', '20kg', '프리와 같음']]} onChange={(v) => set({ smithBarKg: Number(v) })} />
        </div>
        <div className="field"><span className="field-label">덤벨 간격</span>
          <Opt<string> value={String(s.dumbbellStep)} options={[['1', '1kg'], ['2', '2kg'], ['2.5', '2.5kg']]} onChange={(v) => set({ dumbbellStep: Number(v) })} />
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div className="field grow" style={{ marginBottom: 0 }}><span className="field-label">머신 핀 간격</span>
            <Opt<string> value={String(s.machineStep)} options={[['2.5', '2.5kg'], ['5', '5kg']]} onChange={(v) => set({ machineStep: Number(v) })} />
          </div>
          <div className="field grow" style={{ marginBottom: 0 }}><span className="field-label">케이블 간격</span>
            <Opt<string> value={String(s.cableStep)} options={[['2.5', '2.5kg'], ['5', '5kg']]} onChange={(v) => set({ cableStep: Number(v) })} />
          </div>
        </div>
      </section>

      <div className="section-label">나에게 맞춘 목표</div>
      <section className="card">
        <div className="row" style={{ gap: 12, marginBottom: 6 }}>
          <span className="icon-tile warning"><Flame size={20} /></span>
          <div className="grow">
            <div className="stat-label">하루 칼로리</div>
            {kcal ? <div className="stat-value">{kcal.toLocaleString()}<small>kcal</small></div> : <div className="small muted">성별·출생연도·키·체중을 넣어주세요</div>}
          </div>
          {protein && (
            <div style={{ textAlign: 'right' }}>
              <div className="stat-label">단백질</div>
              <div className="stat-value">{protein.grams}<small>g</small></div>
            </div>
          )}
        </div>
        {maintenance && <div className="kv"><span className="muted">유지 칼로리 ({loggedDays ? `최근 4주 기록 · 주 ${days}회` : '주 3회 가정'})</span><b>{maintenance.toLocaleString()}kcal</b></div>}
        {protein && <div className="kv"><span className="muted">단백질 기준</span><b>체중 × {protein.perKg}g{protein.elderlyMin ? ` (최소 ${protein.elderlyMin}g)` : ''}</b></div>}
        {rate && <div className="kv"><span className="muted">권장 체중 변화</span><b>주 {rate[0] > 0 ? '+' : ''}{rate[0]}~{rate[1] > 0 ? '+' : ''}{rate[1]}%</b></div>}
        {rate && actualRate != null && (
          <div className="kv"><span className="muted">최근 내 체중 변화</span>
            <b className={actualRate >= Math.min(...rate) && actualRate <= Math.max(...rate) ? 'success' : ''}>주 {actualRate > 0 ? '+' : ''}{actualRate.toFixed(2)}%</b>
          </div>
        )}
        <p className="tiny muted mt">
          {s.phase === 'bulk' && '잉여가 너무 크면 근육보다 지방이 늘어요(Helms 2023). 경력이 쌓일수록 잉여를 줄여요(Iraki 2019). '}
          {s.phase === 'cut' && '하루 500kcal 넘는 적자는 근성장을 막아요(Murphy & Koehler 2022). 감량 중엔 단백질을 2.2g/kg 이상으로(Jäger 2017). '}
          기초대사량은 Mifflin-St Jeor 공식, 단백질은 Morton 2018 기준이에요. 의학적 조언이 아니에요.
        </p>
      </section>

      <div className="list">
        <button className="list-item with-icon" onClick={() => setSheet('dict')}>
          <span className="icon-tile gray"><BookOpen size={20} /></span>
          <div className="grow"><div className="list-title">종목 사전 · 즐겨찾기</div><div className="list-sub">256개 종목과 자극 부위</div></div>
          <ChevronRight size={18} className="chev" />
        </button>
      </div>

      <div className="section-label">데이터</div>
      <div className="list">
        <button className="list-item with-icon" onClick={doExport}>
          <span className="icon-tile success"><Download size={20} /></span>
          <div className="grow"><div className="list-title">백업 내보내기</div><div className="list-sub">‘파일’ 앱이나 iCloud Drive에 저장해 두세요</div></div>
        </button>
        <button className="list-item with-icon" onClick={() => fileRef.current?.click()}>
          <span className="icon-tile gray"><Upload size={20} /></span>
          <div className="grow"><div className="list-title">백업 불러오기</div></div>
        </button>
        <div className="list-item with-icon">
          <span className="icon-tile gray"><Smartphone size={20} /></span>
          <div className="grow"><div className="list-title">아이폰에 설치</div><div className="list-sub">Safari → 공유 → 홈 화면에 추가. 기록은 이 기기에만 저장돼요</div></div>
        </div>
        <button className="list-item with-icon" onClick={async () => { if (confirm('모든 루틴과 기록을 지울까요? 되돌릴 수 없어요.') && confirm('정말 지울까요? 백업을 먼저 하는 걸 추천해요.')) { await db.delete(); location.reload(); } }}>
          <span className="icon-tile" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}><Trash2 size={20} /></span>
          <div className="grow"><div className="list-title danger">모든 데이터 삭제</div></div>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />

      {sheet === 'dict' && (
        <Sheet title="종목 사전" onClose={() => setSheet(null)} full>
          <ExerciseList onInfo={setInfo} />
          {info && <ExerciseInfo e={info} onClose={() => setInfo(null)} />}
        </Sheet>
      )}
    </>
  );
}
