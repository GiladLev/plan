'use client';
import { useState } from 'react';
import { Dialog } from './Dialog';
import { Field } from './ui';
import { toast } from './Toast';
import { useCrm } from './CrmProvider';
import { createMeeting, listClients } from '@/lib/crm/api';
import { invalidate, useQuery } from '@/lib/crm/store';
import { MEETING_KIND_LABEL } from '@/lib/crm/labels';

const pad = (n: number) => String(n).padStart(2, '0');
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function MeetingDialog({ defaultClientId, start, onClose }: { defaultClientId?: string; start?: Date; onClose: () => void }) {
  const { business } = useCrm();
  const clients = useQuery(`clients:${business.id}`, () => listClients(business.id));
  const s = start ?? (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(11, 0, 0, 0); return d; })();
  const [v, setV] = useState({ client_id: defaultClientId ?? '', kind: 'meeting', title: '', starts: localInput(s), minutes: '60', location: business.address ?? '', notes: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const client = clients.data?.find((c) => c.id === v.client_id);
    const startsAt = new Date(v.starts); const endsAt = new Date(startsAt.getTime() + Number(v.minutes) * 60000);
    try {
      await createMeeting(business.id, { client_id: v.client_id || null, kind: v.kind, title: v.title.trim() || `${MEETING_KIND_LABEL[v.kind]}${client ? ` — ${client.name}` : ''}`, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), location: v.location || null, notes: v.notes || null });
      invalidate(`meetings:${business.id}`); if (v.client_id) invalidate(`acts:${v.client_id}`);
      toast('הפגישה נקבעה ונוספה ליומן'); onClose();
    } catch (err) { toast((err as Error).message, 'bad'); setBusy(false); }
  };
  return (
    <form onSubmit={save}>
      <Dialog title="פגישה חדשה" onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>ביטול</button><button className="btn btn-primary" disabled={busy}>קביעה</button></>}>
        <div className="grid-2">
          <Field label="לקוח"><select className="select" value={v.client_id} onChange={set('client_id')}><option value="">ללא</option>{clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="סוג"><select className="select" value={v.kind} onChange={set('kind')}>{Object.entries(MEETING_KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        </div>
        <Field label="כותרת (לא חובה)"><input className="input" value={v.title} onChange={set('title')} /></Field>
        <div className="grid-2">
          <Field label="מתי"><input className="input" type="datetime-local" required value={v.starts} onChange={set('starts')} /></Field>
          <Field label="משך"><select className="select" value={v.minutes} onChange={set('minutes')}>{[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} דק׳</option>)}</select></Field>
        </div>
        <Field label="מיקום (יופיע קישור Waze)"><input className="input" value={v.location} onChange={set('location')} /></Field>
        <Field label="הערות"><textarea className="textarea" value={v.notes} onChange={set('notes')} /></Field>
      </Dialog>
    </form>
  );
}
