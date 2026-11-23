'use client';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import { MonitorSmartphone, PartyPopper } from 'lucide-react';
import { AppShell } from '@/components/crm/AppShell';
import { useCrm } from '@/components/crm/CrmProvider';
import { Seating } from '@/components/crm/Seating';
import { MenuBuilder } from '@/components/crm/MenuBuilder';
import { ErrorState, Pill, Segmented, Skeleton } from '@/components/crm/ui';
import { useQuery, invalidate } from '@/lib/crm/store';
import { getEvent, listGuests, listMenus, listTables } from '@/lib/crm/api';
import { dateLong, daysUntil } from '@/lib/crm/format';

type Tab = 'overview' | 'seating' | 'menu';

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const { business } = useCrm();
  const [tab, setTab] = useState<Tab>('seating');
  const ev = useQuery(`event:${id}`, () => getEvent(id));
  const tables = useQuery(`tables:${id}`, () => listTables(id));
  const guests = useQuery(`guests:${id}`, () => listGuests(id));
  const menus = useQuery(`menus:${id}`, () => listMenus(id));
  const refreshSeating = useCallback(() => { invalidate(`guests:${id}`); invalidate(`tables:${id}`); }, [id]);
  if (ev.error) return <AppShell title="אירוע"><ErrorState error={ev.error} retry={ev.refetch} /></AppShell>;
  const e = ev.data;
  const g = guests.data ?? [];
  const people = g.reduce((s, x) => s + x.party_size, 0);
  const arrived = g.filter((x) => x.checked_in_at).reduce((s, x) => s + x.party_size, 0);
  const meals = g.reduce<Record<string, number>>((m, x) => { if (x.meal) m[x.meal] = (m[x.meal] ?? 0) + x.party_size; return m; }, {});
  return (
    <AppShell title={e?.title ?? 'אירוע'} actions={<Link className="btn btn-sm" href={`/app/events/${id}/kiosk`}><MonitorSmartphone />מצב קבלת פנים</Link>}>
      <div className="event-page">
        <header className="event-head">
          <span className="event-icon" style={{ width: 44, height: 44, borderRadius: 13 }}><PartyPopper /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {e ? <><div className="hstack"><h2 className="t-title">{e.title}</h2><Pill tone={daysUntil(e.event_date) <= 14 ? 'warn' : 'accent'}>{daysUntil(e.event_date) === 0 ? 'היום' : daysUntil(e.event_date) > 0 ? `בעוד ${daysUntil(e.event_date)} ימים` : 'הסתיים'}</Pill></div><div className="t-callout">{dateLong(e.event_date)}{e.hall ? ` · ${e.hall}` : ''}{e.clients ? ` · ` : ''}{e.clients && <Link className="link" href={`/app/clients/${e.client_id}`}>{e.clients.name}</Link>}</div></> : <Skeleton h={40} w={300} />}
          </div>
          <Segmented label="אזור" value={tab} onChange={setTab} options={[{ value: 'overview', label: 'סקירה' }, { value: 'seating', label: 'סידורי הושבה' }, { value: 'menu', label: 'תפריט' }]} />
        </header>
        {tab === 'overview' && (
          <div className="page" style={{ paddingTop: 0 }}>
            <section className="kpis">
              <div className="kpi card"><span className="kpi-label">מוזמנים</span><span className="kpi-value num">{people}</span></div>
              <div className="kpi card"><span className="kpi-label">שובצו</span><span className="kpi-value num">{g.filter((x) => x.table_id).reduce((s, x) => s + x.party_size, 0)}</span></div>
              <div className="kpi card"><span className="kpi-label">שולחנות</span><span className="kpi-value num">{tables.data?.length ?? '—'}</span></div>
              <div className="kpi card"><span className="kpi-label">הגיעו</span><span className="kpi-value num">{arrived}</span></div>
            </section>
            <section className="card card-pad"><h3 className="t-headline" style={{ marginBottom: 8 }}>מנות מיוחדות למטבח</h3>{Object.keys(meals).length ? <div className="hstack" style={{ flexWrap: 'wrap' }}>{Object.entries(meals).map(([k, v]) => <Pill key={k} tone="accent">{k} · {v}</Pill>)}</div> : <div className="t-callout">אין בקשות מיוחדות</div>}</section>
          </div>
        )}
        {tab === 'seating' && (tables.data && guests.data ? <Seating eventId={id} tables={tables.data} guests={guests.data} onChange={refreshSeating} /> : <div className="page"><Skeleton h={500} /></div>)}
        {tab === 'menu' && <div className="page" style={{ paddingTop: 0 }}>{menus.data ? <MenuBuilder bid={business.id} eventId={id} menus={menus.data} onChange={() => invalidate(`menus:${id}`)} /> : <Skeleton h={300} />}</div>}
      </div>
    </AppShell>
  );
}
