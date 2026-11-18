import type { ExerciseFeedback, MuscleFeedback } from '../lib/feedback';

const ICON = { weight: '⬆️', reps: '🔁', sets: '➕' } as const;
const LABEL = { weight: '무게 올리기', reps: '반복 늘리기', sets: '세트 늘리기' } as const;

export function FeedbackList({ items }: { items: ExerciseFeedback[] }) {
  const order = { weight: 0, sets: 1, reps: 2 };
  return (
    <ul className="fb-list">
      {[...items].sort((a, b) => order[a.kind] - order[b.kind]).map((f) => (
        <li key={f.exerciseId} className={`fb fb-${f.kind}`}>
          <span className="fb-icon">{ICON[f.kind]}</span>
          <span>
            <strong>{f.name}</strong> <span className="fb-tag">{LABEL[f.kind]}</span>
            <br /><span className="small">{f.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MuscleFeedbackList({ items }: { items: MuscleFeedback[] }) {
  if (!items.length) return <p className="muted small">최근 4주에 훈련한 부위는 모두 목표 세트를 채우고 있어요. 지금처럼 무게·반복을 올려가세요.</p>;
  return (
    <ul className="fb-list">
      {items.map((f) => (
        <li key={f.muscle} className="fb fb-sets">
          <span className="fb-icon">➕</span>
          <span><strong>{f.name}</strong> <span className="fb-tag">주 {f.next}세트 목표</span><br /><span className="small">{f.text}</span></span>
        </li>
      ))}
    </ul>
  );
}
