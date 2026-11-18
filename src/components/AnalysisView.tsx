import { AlertTriangle, Lightbulb, Plus, ThumbsUp } from 'lucide-react';
import { MUSCLES, MUSCLE_ORDER } from '../data/muscles';
import type { Analysis } from '../lib/analysis';
import type { Exercise, MuscleCode } from '../types';

/** 근육별 세트 막대. prev를 주면 지난 기간 대비 증감을 함께 표시(목표·상한 없음) */
export function VolumeBars({ weekly, prev, prevLabel = '지난주' }: { weekly: Record<MuscleCode, number>; prev?: Record<MuscleCode, number>; prevLabel?: string }) {
  const rows = MUSCLE_ORDER.filter((m) => weekly[m] > 0 || (prev?.[m] ?? 0) > 0).sort((a, b) => weekly[b] - weekly[a]);
  if (!rows.length) return <p className="muted small">기록한 세트가 없어요.</p>;
  const scale = Math.max(...rows.map((m) => Math.max(weekly[m], prev?.[m] ?? 0)), 1);
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return (
    <div className="vbars">
      {rows.map((m) => {
        const v = r1(weekly[m]);
        const p = prev ? r1(prev[m] ?? 0) : null;
        const d = p == null ? null : r1(v - p);
        return (
          <div key={m} className="vbar">
            <span className={`vbar-label ${MUSCLES[m].tracked ? '' : 'muted'}`}>{MUSCLES[m].ko}</span>
            <span className="vbar-track">
              {p != null && p > 0 && <span className="vbar-prev" style={{ width: `${(p / scale) * 100}%` }} />}
              <span className="vbar-fill" style={{ width: `${(v / scale) * 100}%` }} />
            </span>
            <span className="vbar-val">{v}{d != null && d !== 0 && <small className={d > 0 ? 'success' : ''}> {d > 0 ? '▲' : '▼'}{Math.abs(d)}</small>}</span>
          </div>
        );
      })}
      <p className="tiny muted">{prev ? `옅은 막대는 ${prevLabel}, ▲▼는 ${prevLabel} 대비 증감이에요. ` : ''}보조로 쓰인 근육은 0.5세트로 계산해요.</p>
    </div>
  );
}

export function AnalysisView({ a, single, map, onAdd }: { a: Analysis; single: boolean; map: Map<string, Exercise>; onAdd?: (id: string) => void }) {
  return (
    <>
      <section className="card">
        <div className="card-head"><span className="h3">이 {single ? '루틴' : '주간 계획'}의 효과</span><span className="badge">{Math.round(a.totalSets)}세트</span></div>
        {a.effects.length ? (
          <div className="stack-sm">{a.effects.map((t) => <p key={t} className="text-2 small">· {t}</p>)}</div>
        ) : <p className="muted small">종목을 추가하면 분석해 드려요.</p>}
      </section>
      <section className="card">
        <div className="card-head"><span className="h3">한 번 할 때 근육별 세트</span></div>
        <VolumeBars weekly={a.weekly} />
      </section>
      {a.tips.length > 0 && (
        <section className="card">
          <div className="card-head"><span className="h3">보충하면 좋은 점</span></div>
          {a.tips.map((t) => (
            <div key={t.title} className="tip">
              <span className={`icon-tile ${t.level === 'warn' ? 'warning' : t.level === 'good' ? 'success' : ''}`}>
                {t.level === 'warn' ? <AlertTriangle size={18} /> : t.level === 'good' ? <ThumbsUp size={18} /> : <Lightbulb size={18} />}
              </span>
              <div className="grow">
                <div className="tip-title">{t.title}</div>
                <div className="tip-detail">{t.detail}</div>
                {t.source && <div className="tip-src">근거 · {t.source}</div>}
                {t.suggest && t.suggest.length > 0 && (
                  <div className="suggest">
                    {t.suggest.map((id) => {
                      const e = map.get(id);
                      if (!e) return null;
                      return onAdd
                        ? <button key={id} className="btn soft" onClick={() => onAdd(id)}><Plus size={14} />{e.name}</button>
                        : <span key={id} className="chip">{e.name}</span>;
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
