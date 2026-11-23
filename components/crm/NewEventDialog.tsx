'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from './Dialog';
import { Field } from './ui';
import { toast } from './Toast';
import { useCrm } from './CrmProvider';
import { createEvent, createTable, listClients } from '@/lib/crm/api';
import { invalidate, useQuery } from '@/lib/crm/store';

export function NewEventDialog({ onClose }: { onClose: () => void }) {
  const { business } = useCrm();
  const router = useRouter();
  const clients = useQuery(`clients:${business.id}`, () => listClients(business.id));
  const [v, setV] = useState({ client_id: '', title: '', event_date: '', hall: '', guests_expected: '', tables: '20', seats: '12' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = { ...v, [k]: e.target.value };
    if (k === 'client_id') { const c = clients.data?.find((x) => x.id === e.target.value); if (c) { next.title ||= `האירוע של ${c.name}`; next.event_date ||= c.event_date ?? ''; next.guests_expected ||= c.guests ? String(c.guests) : ''; } }
    setV(next);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const ev = await createEvent(business.id, { title: v.title.trim(), event_date: v.event_date, client_id: v.client_id || null, hall: v.hall || null, guests_expected: v.guests_expected ? Number(v.guests_expected) : null });
      const n = Math.min(60, Number(v.tables) || 0);
      for (let i = 1; i <= n; i++) await createTable(business.id, { event_id: ev.id, label: String(i), capacity: Number(v.seats) || 10, x: 120 + ((i - 1) % 6) * 150, y: 140 + Math.floor((i - 1) / 6) * 150 });
      invalidate(`events:${business.id}`); toast('האירוע נוצר'); onClose(); router.push(`/app/events/${ev.id}`);
    } catch (err) { toast((err as Error).message, 'bad'); setBusy(false); }
  };
  return (
    <form onSubmit={save}>
      <Dialog title="אירוע חדש" onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>ביטול</button><button className="btn btn-primary" disabled={busy || !v.title.trim() || !v.event_date}>יצירה</button></>}>
        <Field label="לקוח"><select className="select" value={v.client_id} onChange={set('client_id')}><option value="">ללא</option>{clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="שם האירוע"><input className="input" required value={v.title} onChange={set('title')} /></Field>
        <div className="grid-2">
          <Field label="תאריך"><input className="input" type="date" required value={v.event_date} onChange={set('event_date')} /></Field>
          <Field label="אולם / אזור"><input className="input" value={v.hall} onChange={set('hall')} /></Field>
          <Field label="צפי אורחים"><input className="input num" inputMode="numeric" value={v.guests_expected} onChange={set('guests_expected')} /></Field>
          <Field label="שולחנות × מקומות"><div className="hstack"><input className="input num" inputMode="numeric" value={v.tables} onChange={set('tables')} aria-label="מספר שולחנות" /><span>×</span><input className="input num" inputMode="numeric" value={v.seats} onChange={set('seats')} aria-label="מקומות לשולחן" /></div></Field>
        </div>
      </Dialog>
    </form>
  );
}
