import { ArrowUp, Layers, Repeat } from 'lucide-react';
import type { ExerciseFeedback, MuscleFeedback } from '../lib/feedback';

const META = {
  weight: { icon: <ArrowUp size={18} />, cls: 'success', label: '무게 올리기' },
  reps: { icon: <Repeat size={18} />, cls: '', label: '반복 늘리기' },
  sets: { icon: <Layers size={18} />, cls: 'warning', label: '세트 늘리기' },
} as const;

export function FeedbackList({ items }: { items: ExerciseFeedback[] }) {
  const order = { weight: 0, sets: 1, reps: 2 };
  return (
    <div className="fb-list">
      {[...items].sort((a, b) => order[a.kind] - order[b.kind]).map((f) => (
        <div key={f.exerciseId} className="fb">
          <span className={`icon-tile ${META[f.kind].cls}`}>{META[f.kind].icon}</span>
          <div className="grow">
            <div className="row-between"><span className="fb-title ellipsis">{f.name}</span><span className={`badge ${f.kind === 'weight' ? 'success' : f.kind === 'sets' ? 'warning' : 'accent'}`}>{META[f.kind].label}</span></div>
            <div className="fb-text">{f.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MuscleFeedbackList({ items }: { items: MuscleFeedback[] }) {
  if (!items.length) return <p className="muted small">최근 4주에 훈련한 부위는 모두 목표 세트를 채우고 있어요. 지금처럼 무게와 반복을 올려가세요.</p>;
  return (
    <div className="fb-list">
      {items.map((f) => (
        <div key={f.muscle} className="fb">
          <span className="icon-tile warning"><Layers size={18} /></span>
          <div className="grow">
            <div className="row-between"><span className="fb-title">{f.name}</span><span className="badge warning">주 {f.next}세트 목표</span></div>
            <div className="fb-text">{f.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
