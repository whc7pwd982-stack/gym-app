import { AlertTriangle, Lightbulb, Plus, ThumbsUp } from 'lucide-react';
import { MUSCLES, MUSCLE_ORDER } from '../data/muscles';
import { targetFor } from '../data/targets';
import type { Analysis } from '../lib/analysis';
import type { Exercise, Level, MuscleCode } from '../types';

/** 근육별 세트 막대. level을 주면 근육별 목표선과 남은 세트를 표시 */
export function VolumeBars({ weekly, level, showAll }: { weekly: Record<MuscleCode, number>; level?: Level; showAll?: boolean }) {
  const rows = MUSCLE_ORDER.filter((m) => (MUSCLES[m].tracked && (showAll || weekly[m] > 0 || level)) || weekly[m] >= 1);
  const targets = Object.fromEntries(rows.map((m) => [m, level && MUSCLES[m].tracked ? targetFor(m, { level }) : 0])) as Record<MuscleCode, number>;
  const scale = Math.max(...rows.map((m) => Math.max(weekly[m], targets[m] * 1.3)), 6);
  return (
    <div className="vbars">
      {rows.map((m) => {
        const v = Math.round(weekly[m] * 10) / 10;
        const t = targets[m];
        const ok = t > 0 && v >= t;
        return (
          <div key={m} className="vbar">
            <span className={`vbar-label ${MUSCLES[m].tracked ? '' : 'muted'}`}>{MUSCLES[m].ko}</span>
            <span className="vbar-track">
              <span className={`vbar-fill ${ok ? 'ok' : 'low'}`} style={{ width: `${Math.min(100, (v / scale) * 100)}%` }} />
              {t > 0 && <span className="vbar-target" style={{ left: `${(t / scale) * 100}%` }} />}
            </span>
            <span className="vbar-val">{v}{t > 0 && <small> / {t}</small>}</span>
          </div>
        );
      })}
      {level && <p className="tiny muted">세로선은 근육별 목표 세트예요. 보조로 쓰인 근육은 0.5세트로 계산해요.</p>}
    </div>
  );
}

export function AnalysisView({ a, single, map, onAdd, level }: { a: Analysis; single: boolean; map: Map<string, Exercise>; onAdd?: (id: string) => void; level: Level }) {
  return (
    <>
      <section className="card">
        <div className="card-head"><span className="h3">이 {single ? '루틴' : '주간 계획'}의 효과</span><span className="badge">{Math.round(a.totalSets)}세트</span></div>
        {a.effects.length ? (
          <div className="stack-sm">{a.effects.map((t) => <p key={t} className="text-2 small">· {t}</p>)}</div>
        ) : <p className="muted small">종목을 추가하면 분석해 드려요.</p>}
      </section>
      <section className="card">
        <div className="card-head"><span className="h3">{single ? '한 번 할 때 근육별 세트' : '근육별 주간 세트'}</span></div>
        <VolumeBars weekly={a.weekly} level={single ? undefined : level} />
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
