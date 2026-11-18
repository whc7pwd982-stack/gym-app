import { MUSCLES, MUSCLE_ORDER, VOLUME_BANDS } from '../data/muscles';
import type { Analysis } from '../lib/analysis';
import { volumeStatus } from '../lib/analysis';
import type { Exercise } from '../types';

export function VolumeBars({ weekly, single, target = VOLUME_BANDS.low }: { weekly: Analysis['weekly']; single: boolean; target?: number }) {
  const rows = MUSCLE_ORDER.filter((m) => MUSCLES[m].tracked || weekly[m] >= 1);
  const maxV = Math.max(0, ...rows.map((m) => weekly[m]));
  const scale = single ? Math.max(12, maxV) : Math.max(target * 1.5, maxV);
  return (
    <div className="vbars">
      {rows.map((m) => {
        const v = Math.round(weekly[m] * 10) / 10;
        const st = single ? null : volumeStatus(v, target);
        return (
          <div key={m} className="vbar">
            <span className="vbar-label">{MUSCLES[m].ko}{!MUSCLES[m].tracked && <span className="muted"> ·</span>}</span>
            <span className="vbar-track">
              <span className={`vbar-fill ${st ? 'st-' + st.key : 'st-ok'}`} style={{ width: `${Math.min(100, (v / scale) * 100)}%` }} />
              {!single && <span className="vbar-target" style={{ left: `${(target / scale) * 100}%` }} />}
            </span>
            <span className="vbar-val">{v}{st && MUSCLES[m].tracked ? <em className={`st-text st-${st.key}`}> {st.label}</em> : null}</span>
          </div>
        );
      })}
      {!single && <p className="muted small">세로선 = 목표 {target}세트, “+숫자” = 목표까지 남은 세트. 보조근은 0.5세트로 계산. “·” 표시는 참고용 부위.</p>}
    </div>
  );
}

export function AnalysisView({ a, single, map, onAdd }: { a: Analysis; single: boolean; map: Map<string, Exercise>; onAdd?: (id: string) => void }) {
  return (
    <div className="analysis">
      <section className="card">
        <h3>이 {single ? '루틴' : '주간 계획'}의 효과</h3>
        {a.effects.length ? <ul className="effects">{a.effects.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="muted">종목을 추가하면 분석해 드려요.</p>}
        <p className="muted small">총 {Math.round(a.totalSets)}세트{single ? ` · 예상 ${a.minutes}분` : ''}</p>
      </section>
      <section className="card">
        <h3>{single ? '1회당 근육별 세트' : '근육별 주간 세트'}</h3>
        <VolumeBars weekly={a.weekly} single={single} />
      </section>
      {a.tips.length > 0 && (
        <section className="card">
          <h3>보충할 점 · 추천</h3>
          <ul className="tips">
            {a.tips.map((t) => (
              <li key={t.title} className={`tip tip-${t.level}`}>
                <strong>{t.level === 'warn' ? '⚠️ ' : t.level === 'good' ? '👍 ' : '💡 '}{t.title}</strong>
                <p>{t.detail}</p>
                {t.source && <p className="muted small">근거: {t.source}</p>}
                {t.suggest && t.suggest.length > 0 && (
                  <div className="suggest">
                    {t.suggest.map((id) => {
                      const e = map.get(id);
                      if (!e) return null;
                      return onAdd ? (
                        <button key={id} className="pill" onClick={() => onAdd(id)}>＋ {e.name}</button>
                      ) : <span key={id} className="pill static">{e.name}</span>;
                    })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
