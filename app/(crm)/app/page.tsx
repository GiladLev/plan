'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2, Circle, Inbox, MapPin, PartyPopper, TrendingUp } from 'lucide-react';
import { AppShell } from '@/components/crm/AppShell';
import { useCrm } from '@/components/crm/CrmProvider';
import { Avatar, Pill, Skeleton } from '@/components/crm/ui';
import { useQuery, invalidate } from '@/lib/crm/store';
import { listClients, listEvents, listMeetings, listTasks, recentActivities, setTaskDone } from '@/lib/crm/api';
import { daysUntil, dateShort, money, relative, time, wazeLink } from '@/lib/crm/format';
import { ACTIVITY_LABEL, EVENT_TYPE_LABEL, MEETING_KIND_LABEL } from '@/lib/crm/labels';

export default function TodayPage() {
  const { business, displayName } = useCrm();
  const bid = business.id;
  const day = useMemo(() => { const s = new Date(); s.setHours(0, 0, 0, 0); const e = new Date(s); e.setDate(e.getDate() + 7); return [s, e] as const; }, []);
  const clients = useQuery(`clients:${bid}`, () => listClients(bid));
  const tasks = useQuery(`tasks:${bid}`, () => listTasks(bid));
  const meetings = useQuery(`meetings:${bid}:week`, () => listMeetings(bid, day[0], day[1]));
  const events = useQuery(`events:${bid}`, () => listEvents(bid));
  const feed = useQuery(`feed:${bid}`, () => recentActivities(bid, 8));

  const open = clients.data?.filter((c) => !['won', 'lost'].includes(c.stage)) ?? [];
  const inquiries = clients.data?.filter((c) => c.stage === 'inquiry') ?? [];
  const pipelineValue = open.reduce((s, c) => s + Number(c.value ?? 0), 0);
  const openTasks = tasks.data?.filter((t) => !t.done) ?? [];
  const overdue = openTasks.filter((t) => t.due_at && new Date(t.due_at) < new Date());
  const todays = meetings.data?.filter((m) => new Date(m.starts_at).toDateString() === new Date().toDateString()) ?? [];
  const upcoming = events.data?.filter((e) => daysUntil(e.event_date) >= 0).slice(0, 3) ?? [];
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב';

  const toggle = async (id: string, done: boolean) => { await setTaskDone(id, done); invalidate(`tasks:${bid}`); };

  return (
    <AppShell title="היום">
      <div className="page today">
        <header style={{ marginBottom: 22 }}>
          <div className="t-caption">{new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h2 className="t-display">{greet}{displayName ? `, ${displayName}` : ''}</h2>
        </header>

        <section className="kpis" aria-label="מדדים">
          <Kpi icon={<Inbox />} label="פניות שממתינות" value={clients.data ? String(inquiries.length) : null} href="/app/pipeline" tone="accent" />
          <Kpi icon={<TrendingUp />} label="שווי צינור פתוח" value={clients.data ? money(pipelineValue) : null} href="/app/pipeline" />
          <Kpi icon={<CalendarClock />} label="פגישות היום" value={meetings.data ? String(todays.length) : null} href="/app/calendar" />
          <Kpi icon={<AlertCircle />} label="משימות באיחור" value={tasks.data ? String(overdue.length) : null} href="/app/tasks" tone={overdue.length ? 'bad' : ''} />
        </section>

        <div className="today-grid">
          <section className="card">
            <div className="card-head"><h3>היומן הקרוב</h3><div style={{ flex: 1 }} /><Link className="btn btn-ghost btn-sm" href="/app/calendar">ליומן</Link></div>
            {!meetings.data ? <div className="card-pad stack"><Skeleton h={44} /><Skeleton h={44} /></div> : meetings.data.length === 0 ? <div className="empty" style={{ padding: 28 }}>אין פגישות השבוע</div> : (
              <ul className="plain">
                {meetings.data.slice(0, 5).map((m) => (
                  <li key={m.id} className="row" style={{ cursor: 'default' }}>
                    <div className="time-chip num"><b>{time(m.starts_at)}</b><span>{new Date(m.starts_at).toDateString() === new Date().toDateString() ? 'היום' : dateShort(m.starts_at)}</span></div>
                    <div className="grow"><div className="title">{m.title}</div><div className="sub">{MEETING_KIND_LABEL[m.kind]}{m.location ? ` · ${m.location}` : ''}</div></div>
                    {m.location && <a className="btn btn-ghost btn-icon btn-sm" href={wazeLink(m.location)} target="_blank" rel="noopener" aria-label={`ניווט ל${m.location}`}><MapPin /></a>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <div className="card-head"><h3>משימות פתוחות</h3><div style={{ flex: 1 }} /><Link className="btn btn-ghost btn-sm" href="/app/tasks">הכול</Link></div>
            {!tasks.data ? <div className="card-pad stack"><Skeleton h={36} /><Skeleton h={36} /></div> : openTasks.length === 0 ? <div className="empty" style={{ padding: 28 }}>הכול סגור. יום שקט ✨</div> : (
              <ul className="plain">
                {openTasks.slice(0, 6).map((t) => {
                  const late = t.due_at && new Date(t.due_at) < new Date();
                  return (
                    <li key={t.id} className="row" style={{ cursor: 'default' }}>
                      <button className="check" aria-label={`סימון "${t.title}" כבוצע`} onClick={() => toggle(t.id, true)}><Circle /></button>
                      <div className="grow"><div className="title">{t.title}</div><div className="sub">{t.clients?.name ?? (t.category === 'operations' ? 'תפעול המתחם' : '')}</div></div>
                      {t.due_at && <Pill tone={late ? 'bad' : ''}>{late ? 'באיחור' : relative(t.due_at)}</Pill>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card">
            <div className="card-head"><h3>פניות חדשות</h3><div style={{ flex: 1 }} /><Link className="btn btn-ghost btn-sm" href="/app/pipeline">לצינור</Link></div>
            {!clients.data ? <div className="card-pad"><Skeleton h={40} /></div> : inquiries.length === 0 ? <div className="empty" style={{ padding: 28 }}>אין פניות שממתינות</div> : (
              <ul className="plain">
                {inquiries.map((c) => (
                  <li key={c.id}><Link className="row" href={`/app/clients/${c.id}`}><Avatar name={c.name} /><div className="grow"><div className="title">{c.name}</div><div className="sub">{EVENT_TYPE_LABEL[c.event_type]} · {c.guests ?? '—'} אורחים · {dateShort(c.event_date)}</div></div><span className="num faint" style={{ fontSize: 13 }}>{money(c.value)}</span></Link></li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <div className="card-head"><h3>אירועים קרובים</h3><div style={{ flex: 1 }} /><Link className="btn btn-ghost btn-sm" href="/app/events">הכול</Link></div>
            {!events.data ? <div className="card-pad"><Skeleton h={40} /></div> : upcoming.length === 0 ? <div className="empty" style={{ padding: 28 }}>אין אירועים בקרוב</div> : (
              <ul className="plain">
                {upcoming.map((e) => {
                  const d = daysUntil(e.event_date);
                  return <li key={e.id}><Link className="row" href={`/app/events/${e.id}`}><span className="event-icon"><PartyPopper /></span><div className="grow"><div className="title">{e.title}</div><div className="sub">{dateShort(e.event_date)} · {e.hall ?? ''} · {e.guests_expected ?? '—'} אורחים</div></div><Pill tone={d <= 14 ? 'warn' : ''}>{d === 0 ? 'היום' : `בעוד ${d} ימים`}</Pill></Link></li>;
                })}
              </ul>
            )}
          </section>

          <section className="card span-2">
            <div className="card-head"><h3>פעילות אחרונה</h3></div>
            {!feed.data ? <div className="card-pad"><Skeleton h={40} /></div> : (
              <ul className="plain feed">
                {feed.data.map((a) => (
                  <li key={a.id} className="row" style={{ cursor: 'default' }}>
                    <CheckCircle2 className="feed-dot" aria-hidden="true" />
                    <div className="grow"><div className="title" style={{ fontWeight: 500 }}><b>{ACTIVITY_LABEL[a.kind]}</b> · {a.clients?.name ?? 'כללי'}</div>{a.body && <div className="sub">{a.body}</div>}</div>
                    <span className="t-caption">{relative(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Kpi({ icon, label, value, href, tone = '' }: { icon: React.ReactNode; label: string; value: string | null; href: string; tone?: string }) {
  return (
    <Link href={href} className={`kpi card ${tone}`}>
      <span className="kpi-icon" aria-hidden="true">{icon}</span>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value num">{value ?? <Skeleton h={28} w={70} />}</span>
    </Link>
  );
}
