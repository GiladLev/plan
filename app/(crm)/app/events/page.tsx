'use client';
import Link from 'next/link';
import { useState } from 'react';
import { PartyPopper, Plus } from 'lucide-react';
import { AppShell } from '@/components/crm/AppShell';
import { useCrm } from '@/components/crm/CrmProvider';
import { NewEventDialog } from '@/components/crm/NewEventDialog';
import { Empty, ErrorState, Pill, Skeleton } from '@/components/crm/ui';
import { useQuery } from '@/lib/crm/store';
import { listEvents } from '@/lib/crm/api';
import { dateLong, daysUntil } from '@/lib/crm/format';

export default function EventsPage() {
  const { business } = useCrm();
  const { data, error, refetch } = useQuery(`events:${business.id}`, () => listEvents(business.id));
  const [adding, setAdding] = useState(false);
  const upcoming = (data ?? []).filter((e) => daysUntil(e.event_date) >= 0); const past = (data ?? []).filter((e) => daysUntil(e.event_date) < 0);
  return (
    <AppShell title="אירועים" actions={<button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Plus />אירוע חדש</button>}>
      <div className="page">
        {error ? <ErrorState error={error} retry={refetch} /> : !data ? <div className="events-grid"><Skeleton h={150} /><Skeleton h={150} /></div> : data.length === 0 ? <Empty icon={<PartyPopper />} title="עוד אין אירועים"><button className="btn btn-primary" onClick={() => setAdding(true)}>יצירת אירוע</button></Empty> : (
          <>
            <h2 className="t-headline" style={{ marginBottom: 10 }}>קרובים</h2>
            <div className="events-grid">{upcoming.map((e) => { const d = daysUntil(e.event_date); return (
              <Link key={e.id} href={`/app/events/${e.id}`} className="event-card card">
                <div className="event-card-top"><span className="event-icon"><PartyPopper /></span><Pill tone={d <= 14 ? 'warn' : 'accent'}>{d === 0 ? 'היום!' : `בעוד ${d} ימים`}</Pill></div>
                <div className="t-headline">{e.title}</div>
                <div className="t-callout">{dateLong(e.event_date)}</div>
                <div className="t-caption">{[e.hall, e.guests_expected ? `${e.guests_expected} אורחים` : null, e.clients?.name].filter(Boolean).join(' · ')}</div>
              </Link>); })}</div>
            {past.length > 0 && <><h2 className="t-headline" style={{ margin: '24px 0 10px' }}>היו</h2><div className="events-grid">{past.map((e) => <Link key={e.id} href={`/app/events/${e.id}`} className="event-card card past"><div className="t-headline">{e.title}</div><div className="t-callout">{dateLong(e.event_date)}</div></Link>)}</div></>}
          </>
        )}
      </div>
      {adding && <NewEventDialog onClose={() => setAdding(false)} />}
    </AppShell>
  );
}
