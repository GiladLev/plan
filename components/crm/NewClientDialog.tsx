'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from './Dialog';
import { Field } from './ui';
import { toast } from './Toast';
import { createClient } from '@/lib/crm/api';
import { invalidate } from '@/lib/crm/store';
import { EVENT_TYPE_LABEL } from '@/lib/crm/labels';

export function NewClientDialog({ bid, onClose }: { bid: string; onClose: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({ name: '', phone: '', email: '', event_type: 'wedding', event_date: '', guests: '', value: '', source: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!v.name.trim()) return; setBusy(true);
    try {
      const c = await createClient(bid, { name: v.name.trim(), phone: v.phone || null, email: v.email || null, event_type: v.event_type, event_date: v.event_date || null, guests: v.guests ? Number(v.guests) : null, value: v.value ? Number(v.value) : null, source: v.source || null });
      invalidate(`clients:${bid}`); toast('הלקוח נוסף'); onClose(); router.push(`/app/clients/${c.id}`);
    } catch (err) { toast((err as Error).message, 'bad'); setBusy(false); }
  };
  return (
    <form onSubmit={save}>
      <Dialog title="לקוח חדש" onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>ביטול</button><button className="btn btn-primary" disabled={busy || !v.name.trim()}>הוספה</button></>}>
        <Field label="שם הלקוח / הזוג"><input className="input" required value={v.name} onChange={set('name')} placeholder="למשל: נועה ואיתי" /></Field>
        <div className="grid-2">
          <Field label="טלפון"><input className="input" dir="ltr" inputMode="tel" value={v.phone} onChange={set('phone')} /></Field>
          <Field label="אימייל"><input className="input" dir="ltr" type="email" value={v.email} onChange={set('email')} /></Field>
          <Field label="סוג אירוע"><select className="select" value={v.event_type} onChange={set('event_type')}>{Object.entries(EVENT_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="תאריך מבוקש"><input className="input" type="date" value={v.event_date} onChange={set('event_date')} /></Field>
          <Field label="מספר אורחים"><input className="input num" inputMode="numeric" value={v.guests} onChange={set('guests')} /></Field>
          <Field label="שווי משוער (₪)"><input className="input num" inputMode="decimal" value={v.value} onChange={set('value')} /></Field>
        </div>
        <Field label="מקור הפנייה"><input className="input" value={v.source} onChange={set('source')} placeholder="דף מותג, המלצה, אינסטגרם…" /></Field>
      </Dialog>
    </form>
  );
}
