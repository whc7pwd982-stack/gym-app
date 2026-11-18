import { useEffect, useRef, useState } from 'react';
import { db, exportAll, getSettings, importAll, saveSettings } from '../db';
import type { Level, Settings } from '../types';
import { ExerciseInfo, ExerciseList } from './ExercisePicker';
import type { Exercise } from '../types';
import { Sheet } from './ui';

export function SettingsTab() {
  const [s, setS] = useState<Settings | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [browse, setBrowse] = useState(false);
  const [info, setInfo] = useState<Exercise | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { getSettings().then(setS); navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null)); }, []);
  if (!s) return null;
  const set = (p: Partial<Settings>) => { const n = { ...s, ...p }; setS(n); saveSettings(n); };

  const doExport = async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const name = `gym-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: '운동 기록 백업' }); return; } catch { /* 취소하면 다운로드로 */ }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      if (!confirm('지금 기기에 있는 기록을 백업 파일 내용으로 바꿀까요?')) return;
      await importAll(data);
      alert('불러오기 완료!');
      location.reload();
    } catch (e) {
      alert('불러오기 실패: ' + (e as Error).message);
    }
  };

  return (
    <div className="page">
      <header className="page-head"><h1>설정</h1></header>
      <section className="card">
        <h3>내 정보</h3>
        <label className="field">운동 경력
          <select value={s.level} onChange={(e) => set({ level: e.target.value as Level })}>
            <option value="beginner">초보 (1년 미만)</option>
            <option value="intermediate">중급 (1–3년)</option>
            <option value="advanced">상급 (3년 이상)</option>
          </select>
        </label>
        <label className="field">체중 (kg)
          <input inputMode="decimal" value={s.bodyweight ?? ''} onChange={(e) => set({ bodyweight: e.target.value ? Number(e.target.value) || null : null })} placeholder="예: 70" />
        </label>
        {s.bodyweight ? <p className="small">권장 단백질: 하루 약 <strong>{Math.round(s.bodyweight * 1.6)}g</strong> (체중 × 1.6g, 최대 효과 {Math.round(s.bodyweight * 2.2)}g) · Morton 2018</p> : null}
        <p className="muted small">권장 주간 세트: {s.level === 'beginner' ? '근육당 주 10세트부터' : s.level === 'intermediate' ? '근육당 주 12세트부터' : '근육당 주 14세트부터'} 시작해서, 3주 연속 채우면 +2세트씩 올려가요.</p>
      </section>

      <section className="card">
        <h3>운동 종목</h3>
        <button className="btn block" onClick={() => setBrowse(true)}>종목 사전 · 즐겨찾기 관리</button>
      </section>

      <section className="card">
        <h3>백업</h3>
        <p className="muted small">기록은 이 폰에만 저장돼요. 폰을 바꾸거나 앱을 지우기 전에 백업 파일을 ‘파일’ 앱이나 iCloud Drive에 저장해 두세요.</p>
        <div className="btn-row">
          <button className="btn primary" onClick={doExport}>백업 내보내기</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>백업 불러오기</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        {persisted === false && <p className="small">⚠️ 브라우저가 저장소를 지울 수 있는 상태예요. 아이폰은 Safari에서 <strong>공유 → 홈 화면에 추가</strong>로 설치하면 안전해요.</p>}
      </section>

      <section className="card">
        <h3>아이폰에 설치하기</h3>
        <ol className="plain small">
          <li>1. Safari로 이 페이지를 열어요</li>
          <li>2. 아래쪽 공유 버튼(□↑) → <strong>홈 화면에 추가</strong></li>
          <li>3. 홈 화면 아이콘으로 열면 앱처럼 전체화면으로 쓸 수 있어요</li>
        </ol>
        <p className="muted small">화면 밝기 테마는 폰의 라이트/다크 모드 설정을 자동으로 따라가요.</p>
      </section>

      <section className="card">
        <h3>데이터</h3>
        <button className="btn ghost danger" onClick={async () => { if (confirm('모든 루틴과 운동 기록을 지울까요? 되돌릴 수 없어요.') && confirm('정말 지울까요? 백업을 먼저 하는 걸 추천해요.')) { await db.delete(); location.reload(); } }}>모든 데이터 삭제</button>
        <p className="muted small">근거: 근성장 논문 종합 · 헬스장 운동 종목별 자극 부위 보고서. 참고용 정보이며 의학적 조언이 아니에요.</p>
      </section>

      {browse && (
        <Sheet title="종목 사전" onClose={() => setBrowse(false)}>
          <ExerciseList onInfo={setInfo} />
          {info && <ExerciseInfo e={info} onClose={() => setInfo(null)} />}
        </Sheet>
      )}
    </div>
  );
}
