import { ArrowUp, Layers, Repeat } from 'lucide-react';
import type { ExerciseFeedback } from '../lib/feedback';

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
