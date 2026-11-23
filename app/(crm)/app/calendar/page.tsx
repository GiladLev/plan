'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Link2, MapPin, PartyPopper, Plus, Trash2, X } from 'lucide-react';
import { AppShell } from '@/components/crm/AppShell';
import { useCrm } from '@/components/crm/CrmProvider';
import { MeetingDialog } from '@/components/crm/MeetingDialog';
import { Pill, Segmented } from '@/components/crm/ui';
import { toast } from '@/components/crm/Toast';
import { useQuery, invalidate } from '@/lib/crm/store';
import { deleteMeeting, listEvents, listMeetings } from '@/lib/crm/api';
import { dateLong, telLink, time, wazeLink } from '@/lib/crm/format';
import { MEETING_KIND_LABEL } from '@/lib/crm/labels';

type View = 'day' | 'week' | 'month';
const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 08:00–23:00
const ROW = 52; // px per hour
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function CalendarPage() {
  const { business } = useCrm();
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [creating, setCreating] = useState<Date | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const range = useMemo(() => {
    if (view === 'day') return [anchor, addDays(anchor, 1)] as const;
    if (view === 'week') { const s = addDays(anchor, -anchor.getDay()); return [s, addDays(s, 7)] as const; } // week starts Sunday
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1); const s = addDays(first, -first.getDay());
    return [s, addDays(s, 42)] as const;
  }, [view, anchor]);
  const key = `meetings:${business.id}:${ymd(range[0])}:${view}`;
  const meetings = useQuery(key, () => listMeetings(business.id, range[0], range[1]));
  const events = useQuery(`events:${business.id}`, () => listEvents(business.id));
  const days = Array.from({ length: Math.round((range[1].getTime() - range[0].getTime()) / 86400000) }, (_, i) => addDays(range[0], i));
  const step = (dir: number) => setAnchor(view === 'day' ? addDays(anchor, dir) : view === 'week' ? addDays(anchor, 7 * dir) : new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
  const sel = meetings.data?.find((m) => m.id === selected);
  const title = view === 'month' ? anchor.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }) : view === 'day' ? dateLong(anchor) : `${range[0].toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })} – ${addDays(range[1], -1).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const icsUrl = typeof window !== 'undefined' ? `${location.origin}/api/ics/${business.ics_token}` : '';
  const copyIcs = async () => { await navigator.clipboard.writeText(icsUrl.replace(/^https?/, 'webcal')); toast('קישור היומן הועתק — הוסיפו אותו כיומן מנוי בטלפון'); };
  const dayEvents = (d: Date) => events.data?.filter((e) => e.event_date === ymd(d)) ?? [];
  const remove = async (id: string) => { await deleteMeeting(id); setSelected(null); invalidate(`meetings:${business.id}`); toast('הפגישה נמחקה'); };

  return (
    <AppShell title="יומן" actions={<><button className="btn btn-sm btn-ghost" onClick={copyIcs}><Link2 />סנכרון לטלפון</button><button className="btn btn-primary btn-sm" onClick={() => setCreating(new Date(Math.max(Date.now(), range[0].getTime())))}><Plus />פגישה</button></>}>
      <div className="cal">
        <div className="cal-toolbar">
          <div className="hstack">
            <button className="btn btn-icon btn-sm" onClick={() => step(-1)} aria-label="הקודם"><ChevronRight /></button>
            <button className="btn btn-sm" onClick={() => setAnchor(startOfDay(new Date()))}>היום</button>
            <button className="btn btn-icon btn-sm" onClick={() => step(1)} aria-label="הבא"><ChevronLeft /></button>
            <h2 className="t-headline" aria-live="polite" style={{ marginInlineStart: 8 }}>{title}</h2>
          </div>
          <Segmented label="תצוגה" value={view} onChange={setView} options={[{ value: 'day', label: 'יום' }, { value: 'week', label: 'שבוע' }, { value: 'month', label: 'חודש' }]} />
        </div>

        <div className={`cal-body ${sel ? 'with-panel' : ''}`}>
          {view === 'month' ? (
            <div className="month" role="grid" aria-label={title}>
              {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map((d) => <div key={d} className="month-dow" role="columnheader">{d}</div>)}
              {days.map((d) => {
                const ms = meetings.data?.filter((m) => sameDay(new Date(m.starts_at), d)) ?? [];
                return (
                  <div key={d.toISOString()} role="gridcell" className={`month-cell ${d.getMonth() !== anchor.getMonth() ? 'other' : ''} ${sameDay(d, new Date()) ? 'today' : ''}`} onDoubleClick={() => { const s = new Date(d); s.setHours(11); setCreating(s); }}>
                    <button className="month-num num" onClick={() => { setAnchor(d); setView('day'); }} aria-label={dateLong(d)}>{d.getDate()}</button>
                    {dayEvents(d).map((e) => <Link key={e.id} href={`/app/events/${e.id}`} className="chip chip-event"><PartyPopper />{e.title}</Link>)}
                    {ms.slice(0, 3).map((m) => <button key={m.id} className={`chip chip-${m.kind}`} onClick={() => setSelected(m.id)}><span className="num">{time(m.starts_at)}</span> {m.title}</button>)}
                    {ms.length > 3 && <span className="t-caption">+{ms.length - 3} נוספות</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="timegrid" style={{ ['--cols' as string]: days.length }}>
              <div className="tg-head">
                <div />
                {days.map((d) => (
                  <div key={d.toISOString()} className={`tg-day ${sameDay(d, new Date()) ? 'today' : ''}`}>
                    <span>{d.toLocaleDateString('he-IL', { weekday: 'short' })}</span><b className="num">{d.getDate()}</b>
                    {dayEvents(d).map((e) => <Link key={e.id} href={`/app/events/${e.id}`} className="chip chip-event"><PartyPopper />{e.title}</Link>)}
                  </div>
                ))}
              </div>
              <div className="tg-scroll">
                <div className="tg-grid" style={{ height: HOURS.length * ROW }}>
                  <div className="tg-hours">{HOURS.map((h) => <div key={h} style={{ height: ROW }} className="num">{String(h).padStart(2, '0')}:00</div>)}</div>
                  {days.map((d) => {
                    const ms = meetings.data?.filter((m) => sameDay(new Date(m.starts_at), d)) ?? [];
                    return (
                      <div key={d.toISOString()} className="tg-col" onClick={(e) => {
                        if ((e.target as HTMLElement).closest('.tg-event')) return;
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); const mins = Math.floor(((e.clientY - r.top) / ROW) * 2) * 30;
                        const s = new Date(d); s.setHours(HOURS[0], mins, 0, 0); setCreating(s);
                      }}>
                        {HOURS.map((h) => <div key={h} className="tg-slot" style={{ height: ROW }} />)}
                        {sameDay(d, new Date()) && <NowLine />}
                        {ms.map((m) => {
                          const s = new Date(m.starts_at), e = new Date(m.ends_at);
                          const top = ((s.getHours() - HOURS[0]) + s.getMinutes() / 60) * ROW; const h = Math.max(22, ((e.getTime() - s.getTime()) / 3600000) * ROW - 3);
                          return (
                            <button key={m.id} className={`tg-event kind-${m.kind} ${selected === m.id ? 'sel' : ''}`} style={{ top, height: h }} onClick={() => setSelected(m.id)}>
                              <b>{m.title}</b><span className="num">{time(m.starts_at)}–{time(m.ends_at)}</span>{h > 50 && m.location && <span>{m.location}</span>}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {sel && (
            <aside className="cal-panel card" aria-label="פרטי פגישה">
              <div className="hstack"><Pill tone="accent">{MEETING_KIND_LABEL[sel.kind]}</Pill><div style={{ flex: 1 }} /><button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelected(null)} aria-label="סגירה"><X /></button></div>
              <h3 className="t-title" style={{ marginTop: 10 }}>{sel.title}</h3>
              <div className="t-callout num">{dateLong(sel.starts_at)} · {time(sel.starts_at)}–{time(sel.ends_at)}</div>
              <div className="divider" />
              <dl className="kv">
                {sel.clients && <><dt>לקוח</dt><dd><Link className="link" href={`/app/clients/${sel.client_id}`}>{sel.clients.name}</Link></dd></>}
                {sel.location && <><dt>מיקום</dt><dd>{sel.location}</dd></>}
              </dl>
              {sel.notes && <p className="t-callout">{sel.notes}</p>}
              <div className="stack" style={{ marginTop: 14 }}>
                {sel.location && <a className="btn" href={wazeLink(sel.location)} target="_blank" rel="noopener"><MapPin />ניווט ב-Waze</a>}
                {sel.clients?.phone && <a className="btn" href={telLink(sel.clients.phone)}>חיוג ללקוח</a>}
                <button className="btn btn-ghost btn-danger" onClick={() => remove(sel.id)}><Trash2 />מחיקת פגישה</button>
              </div>
            </aside>
          )}
        </div>
      </div>
      {creating && <MeetingDialog start={creating} onClose={() => setCreating(null)} />}
    </AppShell>
  );
}

function NowLine() {
  const n = new Date(); const top = ((n.getHours() - HOURS[0]) + n.getMinutes() / 60) * ROW;
  if (top < 0 || top > HOURS.length * ROW) return null;
  return <div className="now-line" style={{ top }} aria-hidden="true" />;
}
