import { Minus, Plus, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { MUSCLES } from '../data/muscles';
import type { Exercise, MuscleCode } from '../types';

export function Sheet({ title, onClose, children, footer, full, right }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; full?: boolean; right?: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet ${full ? 'full' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="grabber" />
        <div className="sheet-head">
          <div className="sheet-title grow ellipsis">{title}</div>
          {right}
          <button className="icon-btn" onClick={onClose} aria-label="닫기"><X size={22} /></button>
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
      {p.map((m) => <span key={m} className="chip p">{MUSCLES[m].ko}</span>)}
      {!compact && s.map((m) => <span key={m} className="chip">{MUSCLES[m].ko}</span>)}
    </span>
  );
}

/** 근육이 늘어난(스트레칭된) 자세에서 힘을 받는 종목 표시 */
export function StretchBadge({ e }: { e: Exercise }) {
  if (e.stretch === 'S★') return <span className="badge success" title="근육이 늘어난 자세에서 힘을 받는 종목 · 근비대 연구로 확인">스트레칭 자극 ★</span>;
  if (e.stretch === 'S') return <span className="badge" title="근육이 늘어난 자세에서 힘을 받는 종목(구조상 추정)">스트레칭 자극</span>;
  return null;
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 999, suffix }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  return (
    <span className="stepper">
      <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} aria-label="감소"><Minus size={16} /></button>
      <span className="stepper-val">{value}{suffix && <span className="muted tiny">{suffix}</span>}</span>
      <button onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))} aria-label="증가"><Plus size={16} /></button>
    </span>
  );
}

export function Empty({ icon, title, sub, children }: { icon?: ReactNode; title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <span className="icon-tile gray">{icon}</span>}
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {children && <div className="mt">{children}</div>}
    </div>
  );
}

let toastSetter: ((t: string | null) => void) | null = null;
export function toast(msg: string) { toastSetter?.(msg); }
export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { toastSetter = setMsg; return () => { toastSetter = null; }; }, []);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 1800); return () => clearTimeout(t); }, [msg]);
  return msg ? <div className="toast">{msg}</div> : null;
}

/** 숫자 입력칸. 입력 중인 "62." 같은 값을 잃지 않도록 문자열로 들고 있다 */
export function NumCell({ value, placeholder, onChange, label, decimal = true }: { value: number | null; placeholder?: string; onChange: (v: number | null) => void; label: string; decimal?: boolean }) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => {
    if (value == null ? text !== '' : Number(text) !== value) setText(value == null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input className={`cell ${text ? 'filled' : ''}`} inputMode={decimal ? 'decimal' : 'numeric'} aria-label={label} placeholder={placeholder} value={text}
      onChange={(e) => {
        const t = e.target.value.replace(',', '.');
        if (!/^\d*\.?\d*$/.test(t)) return;
        setText(t);
        onChange(t === '' || t === '.' ? null : Number(t));
      }} />
  );
}

export const fmtDate = (t: number, opt: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', weekday: 'short' }) => new Date(t).toLocaleDateString('ko-KR', opt);
export const fmtKg = (n: number) => (Math.round(n * 10) / 10).toLocaleString('ko-KR');
