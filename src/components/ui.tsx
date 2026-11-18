import { useEffect, type ReactNode } from 'react';
import { MUSCLES } from '../data/muscles';
import type { Exercise, MuscleCode } from '../types';

export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function MuscleChips({ e, compact }: { e: Exercise; compact?: boolean }) {
  const p = Object.keys(e.primary) as MuscleCode[];
  const s = Object.keys(e.secondary) as MuscleCode[];
  return (
    <span className="chips">
      {p.map((m) => <span key={m} className="chip chip-p">{MUSCLES[m].ko}</span>)}
      {!compact && s.map((m) => <span key={m} className="chip chip-s">{MUSCLES[m].ko}{e.secondary[m] === 0.25 ? ' ¼' : ''}</span>)}
    </span>
  );
}

export function StretchBadge({ e }: { e: Exercise }) {
  if (e.stretch === 'S★') return <span className="badge badge-good" title="늘어난 위치 · 근비대 연구 근거">늘어난 자세 ★</span>;
  if (e.stretch === 'S') return <span className="badge" title="늘어난 위치(기전 추정)">늘어난 자세</span>;
  return null;
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 999, suffix }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  return (
    <span className="stepper">
      <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} aria-label="감소">−</button>
      <span className="stepper-val">{value}{suffix}</span>
      <button onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))} aria-label="증가">+</button>
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
