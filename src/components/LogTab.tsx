import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Dumbbell, Plus, Scale, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { db, useSettings } from '../db';
import { useExerciseMap } from '../lib/exercises';
import { inRange, muscleSets, weekStart } from '../lib/feedback';
import { dateKey, dayStartOf, draftLog, sessionStats } from '../lib/session';
import type { Session } from '../types';
import { VolumeBars } from './AnalysisView';
import { LogEditor } from './LogEditor';
import { Empty, fmtDate, fmtKg, Sheet, toast } from './ui';

const DAY = 86400000;
const DOW = ['월', '화', '수', '목', '금', '토', '일'];

export function LogTab({ openDraft, onOpened, goAnalysis }: { openDraft: Session | null; onOpened: () => void; goAnalysis: (v?: 'week' | 'next') => void }) {
  const map = useExerciseMap();
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').toArray(), [], []);
  const routines = useLiveQuery(() => db.routines.orderBy('order').toArray(), [], []);
  const today = dayStartOf(Date.now());
  const [sel, setSel] = useState(today);
  const [monthView, setMonthView] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [choosing, setChoosing] = useState(false);

  useEffect(() => { if (openDraft) { setEditing(openDraft); onOpened(); } }, [openDraft, onOpened]);

  const byDay = useMemo(() => {
    const m = new Map<string, typeof sessions>();
    for (const s of sessions) if (s.endedAt) { const k = dateKey(s.startedAt); m.set(k, [...(m.get(k) ?? []), s]); }
    return m;
  }, [sessions]);
  const daySessions = byDay.get(dateKey(sel)) ?? [];

  const ws = weekStart();
  const thisWeek = inRange(sessions, ws, ws + 7 * DAY);
  const weekly = useMemo(() => muscleSets(thisWeek, map), [thisWeek, map]);
  // 지난주 같은 요일·시점까지와 비교
  const lastWeek = useMemo(() => muscleSets(inRange(sessions, ws - 7 * DAY, Date.now() - 7 * DAY), map), [sessions, ws, map]);
  const settings = useSettings();

  const start = (routineId: number | null) => {
    const r = routineId == null ? null : routines.find((x) => x.id === routineId) ?? null;
    setChoosing(false);
    setEditing(draftLog(sel, r));
  };

  return (
    <>
      <div className="top-bar">
        <div>
          <div className="large-title">운동 기록</div>
        </div>
        <button className={`icon-btn filled ${monthView ? 'accent' : ''}`} onClick={() => setMonthView((v) => !v)} aria-label={monthView ? '주간 보기' : '월간 달력'}>
          <CalendarDays size={21} />
        </button>
      </div>
      <p className="subtitle">{fmtDate(today, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>

      <section className="card">
        {monthView ? <MonthCalendar sel={sel} setSel={setSel} has={(t) => byDay.has(dateKey(t))} /> : <WeekStrip sel={sel} setSel={setSel} has={(t) => byDay.has(dateKey(t))} />}
      </section>

      <div className="section-label">{sel === today ? '오늘' : fmtDate(sel)}</div>
      {daySessions.length > 0 && (
        <div className="list">
          {daySessions.map((s) => {
            const st = sessionStats(s, map, settings.smithBarKg);
            const names = s.entries.filter((e) => e.sets.some((x) => x.done)).map((e) => map.get(e.exerciseId)?.name).filter(Boolean);
            return (
              <button key={s.id} className="list-item with-icon" onClick={() => setEditing(s)}>
                <span className="icon-tile"><Dumbbell size={20} /></span>
                <div className="grow">
                  <div className="row-between"><span className="list-title ellipsis">{s.routineName}</span><span className="small muted tnum">{st.sets}세트 · {fmtKg(st.volume)}kg</span></div>
                  <div className="list-sub ellipsis">{names.length ? names.join(' · ') : '아직 입력한 세트가 없어요'}</div>
                </div>
                <ChevronRight size={18} className="chev" />
              </button>
            );
          })}
        </div>
      )}
      {daySessions.length === 0 && (
        <div className="card"><Empty icon={<ClipboardList size={26} />} title={sel === today ? '오늘 한 운동을 기록해 보세요' : '이 날은 기록이 없어요'} sub="저장해 둔 루틴을 고르면 종목이 미리 채워져요" /></div>
      )}
      <button className="btn primary block lg" disabled={sel > today} onClick={() => setChoosing(true)}><Plus size={20} />{daySessions.length ? '기록 하나 더 추가' : '운동 기록하기'}</button>

      <BodyweightRow day={sel} />

      {thisWeek.length > 0 && (
        <>
          <div className="section-label row-between"><span>이번 주 근육별 세트</span><button className="link" onClick={() => goAnalysis('week')}>분석 보기<ChevronRight size={16} /></button></div>
          <section className="card"><VolumeBars weekly={weekly} prev={lastWeek} prevLabel="지난주 같은 시점" /></section>
        </>
      )}
      {sessions.length > 0 && (
        <div className="list mt">
          <button className="list-item with-icon" onClick={() => goAnalysis('next')}>
            <span className="icon-tile success"><TrendingUp size={20} /></span>
            <div className="grow"><div className="list-title">다음 목표 보기</div><div className="list-sub">루틴별 · 종목별로 다음에 들 무게와 횟수</div></div>
            <ChevronRight size={18} className="chev" />
          </button>
        </div>
      )}

      {choosing && (
        <Sheet title={`${fmtDate(sel)} 기록`} onClose={() => setChoosing(false)}>
          <p className="muted small" style={{ marginBottom: 12 }}>어떤 루틴을 했나요? 하지 않은 종목은 나중에 빼면 돼요.</p>
          <div className="list">
            {routines.map((r) => (
              <button key={r.id} className="list-item with-icon" onClick={() => start(r.id!)}>
                <span className="icon-tile"><Dumbbell size={20} /></span>
                <div className="grow"><div className="list-title">{r.name}</div><div className="list-sub ellipsis">{r.items.map((it) => map.get(it.exerciseId)?.name).join(' · ') || '종목 없음'}</div></div>
                <ChevronRight size={18} className="chev" />
              </button>
            ))}
            <button className="list-item with-icon" onClick={() => start(null)}>
              <span className="icon-tile gray"><Plus size={20} /></span>
              <div className="grow"><div className="list-title">빈 기록</div><div className="list-sub">종목을 직접 골라서 기록해요</div></div>
              <ChevronRight size={18} className="chev" />
            </button>
          </div>
          {routines.length === 0 && <p className="tiny muted center">루틴 탭에서 나만의 루틴을 만들어 두면 다음부터 한 번에 불러올 수 있어요.</p>}
        </Sheet>
      )}
      {editing && <LogEditor key={editing.id ?? 'new'} initial={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function WeekStrip({ sel, setSel, has }: { sel: number; setSel: (t: number) => void; has: (t: number) => boolean }) {
  const today = dayStartOf(Date.now());
  const start = weekStart(sel);
  const days = Array.from({ length: 7 }, (_, i) => dayStartOf(start + i * DAY + 3600000));
  return (
    <div className="row" style={{ gap: 2 }}>
      <button className="icon-btn sm" onClick={() => setSel(dayStartOf(sel - 7 * DAY))} aria-label="이전 주"><ChevronLeft size={18} /></button>
      <div className="week-strip grow">
        {days.map((t, i) => (
          <button key={t} className={`day ${t === today ? 'today' : ''} ${t === sel ? 'sel' : ''} ${has(t) ? 'has' : ''} ${t > today ? 'future' : ''}`} onClick={() => setSel(t)} disabled={t > today}>
            <span className="day-dow">{DOW[i]}</span><span className="day-num">{new Date(t).getDate()}</span><span className="day-dot" />
          </button>
        ))}
      </div>
      <button className="icon-btn sm" disabled={start + 7 * DAY > today} onClick={() => setSel(Math.min(today, dayStartOf(sel + 7 * DAY)))} aria-label="다음 주"><ChevronRight size={18} /></button>
    </div>
  );
}

function MonthCalendar({ sel, setSel, has }: { sel: number; setSel: (t: number) => void; has: (t: number) => boolean }) {
  const today = dayStartOf(Date.now());
  const [month, setMonth] = useState(() => { const d = new Date(sel); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); });
  const first = new Date(month);
  const offset = (first.getDay() + 6) % 7;
  const total = Math.ceil((offset + new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()) / 7) * 7;
  const cells = Array.from({ length: total }, (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - offset + i).getTime());
  const count = cells.filter((t) => new Date(t).getMonth() === first.getMonth() && has(t)).length;
  const shift = (n: number) => setMonth(new Date(first.getFullYear(), first.getMonth() + n, 1).getTime());
  return (
    <>
      <div className="row-between" style={{ marginBottom: 8 }}>
        <button className="icon-btn sm" onClick={() => shift(-1)} aria-label="이전 달"><ChevronLeft size={18} /></button>
        <span className="h3">{first.getFullYear()}년 {first.getMonth() + 1}월 <span className="muted small">· {count}일 운동</span></span>
        <button className="icon-btn sm" onClick={() => shift(1)} disabled={new Date(first.getFullYear(), first.getMonth() + 1, 1).getTime() > today} aria-label="다음 달"><ChevronRight size={18} /></button>
      </div>
      <div className="cal">
        {DOW.map((d) => <span key={d} className="day-dow center">{d}</span>)}
        {cells.map((t) => {
          const d = new Date(t);
          return (
            <button key={t} className={`day ${d.getMonth() !== first.getMonth() ? 'other' : ''} ${t === today ? 'today' : ''} ${t === sel ? 'sel' : ''} ${has(t) ? 'has' : ''} ${t > today ? 'future' : ''}`} disabled={t > today} onClick={() => setSel(t)}>
              <span className="day-num">{d.getDate()}</span><span className="day-dot" />
            </button>
          );
        })}
      </div>
    </>
  );
}

function BodyweightRow({ day }: { day: number }) {
  const key = dateKey(day);
  const row = useLiveQuery(() => db.bodyweights.get(key), [key]);
  const [v, setV] = useState('');
  useEffect(() => { setV(row ? String(row.kg) : ''); }, [row, key]);
  const save = async () => {
    const n = Number(v.replace(',', '.'));
    if (!v) { if (row) await db.bodyweights.delete(key); return; }
    if (!n || n < 20 || n > 300) return;
    await db.bodyweights.put({ date: key, kg: n });
    toast('체중을 저장했어요');
  };
  return (
    <div className="list mt">
      <div className="list-item with-icon">
        <span className="icon-tile success"><Scale size={20} /></span>
        <div className="grow"><div className="list-title">체중</div><div className="list-sub">기록하면 추천 칼로리·증량 속도에 반영돼요</div></div>
        <input className="cell" style={{ width: 84 }} inputMode="decimal" placeholder="kg" value={v} onChange={(e) => setV(e.target.value)} onBlur={save} aria-label="체중 kg" />
      </div>
    </div>
  );
}
