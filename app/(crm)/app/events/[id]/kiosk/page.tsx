'use client';
// iPad reception kiosk, evening dark mode. Works offline: the guest manifest is cached in IndexedDB,
// check-ins are applied locally at once and queued; the queue drains idempotently (op id) when the network returns.
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowRight, Check, Search, Wifi, WifiOff } from 'lucide-react';
import { useCrm } from '@/components/crm/CrmProvider';
import { checkIn, getEvent, listGuests, listTables } from '@/lib/crm/api';
import { idbGet, idbSet } from '@/lib/crm/idb';
import { supabase } from '@/lib/crm/supabase';
import type { Guest, SeatTable } from '@/lib/crm/types';

type Op = { op: string; guest: string; at: string };
type Manifest = { title: string; guests: Guest[]; tables: SeatTable[]; savedAt: string };

export default function KioskPage() {
  const { id } = useParams<{ id: string }>();
  useCrm();
  const [m, setM] = useState<Manifest | null>(null);
  const [queue, setQueue] = useState<Op[]>([]);
  const [q, setQ] = useState('');
  const [online, setOnline] = useState(true);
  const [flash, setFlash] = useState<{ name: string; table?: string } | null>(null);
  const kiosk = useRef('ipad-' + Math.random().toString(36).slice(2, 6));
  const MK = `kiosk:${id}`, QK = `queue:${id}`;

  const pull = useCallback(async () => {
    try {
      const [ev, guests, tables] = await Promise.all([getEvent(id), listGuests(id), listTables(id)]);
      const pending = (await idbGet<Op[]>(QK)) ?? [];
      const merged = guests.map((g) => { const p = pending.find((o) => o.guest === g.id); return p && !g.checked_in_at ? { ...g, checked_in_at: p.at } : g; });
      const next = { title: ev.title, guests: merged, tables, savedAt: new Date().toISOString() };
      setM(next); await idbSet(MK, next);
    } catch { const cached = await idbGet<Manifest>(MK); if (cached) setM(cached); }
  }, [id, MK, QK]);

  const drain = useCallback(async () => {
    const pending = (await idbGet<Op[]>(QK)) ?? [];
    if (!pending.length || !navigator.onLine) return;
    const left: Op[] = [];
    for (const o of pending) { try { await checkIn(o.op, o.guest, o.at, kiosk.current); } catch { left.push(o); } }
    await idbSet(QK, left); setQueue(left);
  }, [QK]);

  useEffect(() => {
    void (async () => { const cached = await idbGet<Manifest>(MK); if (cached) setM(cached); setQueue((await idbGet<Op[]>(QK)) ?? []); await pull(); await drain(); })();
    const on = () => { setOnline(true); void drain().then(pull); }; const off = () => setOnline(false);
    setOnline(navigator.onLine); window.addEventListener('online', on); window.addEventListener('offline', off);
    const ch = supabase().channel(`kiosk:${id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'guests', filter: `event_id=eq.${id}` }, (p) => {
      const g = p.new as Guest; setM((s) => (s ? { ...s, guests: s.guests.map((x) => (x.id === g.id ? { ...x, checked_in_at: x.checked_in_at ?? g.checked_in_at, table_id: g.table_id } : x)) } : s));
    }).subscribe();
    const t = setInterval(() => void drain(), 15000);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); void supabase().removeChannel(ch); clearInterval(t); };
  }, [id, MK, QK, pull, drain]);

  const label = (tid: string | null) => m?.tables.find((t) => t.id === tid)?.label;
  const results = useMemo(() => { if (!m) return []; const s = q.trim(); return m.guests.filter((g) => !s || g.name.includes(s) || g.phone?.replace(/\D/g, '').includes(s.replace(/\D/g, '') || '#') || g.group_name?.includes(s)).slice(0, 40); }, [m, q]);
  const arrive = async (g: Guest) => {
    if (g.checked_in_at || !m) return;
    const op: Op = { op: crypto.randomUUID(), guest: g.id, at: new Date().toISOString() };
    const next = { ...m, guests: m.guests.map((x) => (x.id === g.id ? { ...x, checked_in_at: op.at } : x)) };
    setM(next); void idbSet(MK, next);
    const pending = [...((await idbGet<Op[]>(QK)) ?? []), op]; await idbSet(QK, pending); setQueue(pending);
    setFlash({ name: g.name, table: label(g.table_id) }); setTimeout(() => setFlash(null), 2600);
    navigator.vibrate?.(12); setQ('');
    void drain();
  };
  const people = m?.guests.reduce((s, g) => s + g.party_size, 0) ?? 0;
  const arrived = m?.guests.filter((g) => g.checked_in_at).reduce((s, g) => s + g.party_size, 0) ?? 0;

  return (
    <div className="kiosk theme-evening">
      <header className="kiosk-head">
        <Link href={`/app/events/${id}`} className="btn btn-ghost btn-sm"><ArrowRight />יציאה</Link>
        <div style={{ flex: 1, textAlign: 'center' }}><div className="kiosk-title">{m?.title ?? '…'}</div><div className="t-caption">קבלת פנים</div></div>
        <span className={`pill ${online ? 'ok' : 'warn'}`}>{online ? <Wifi style={{ width: 13 }} /> : <WifiOff style={{ width: 13 }} />}{online ? (queue.length ? `מסנכרן ${queue.length}` : 'מחובר') : `לא מקוון · ${queue.length} בתור`}</span>
      </header>
      <div className="kiosk-stats"><div><b className="num">{arrived}</b><span>הגיעו</span></div><div className="kiosk-bar"><span style={{ width: `${people ? (arrived / people) * 100 : 0}%` }} /></div><div><b className="num">{people}</b><span>מוזמנים</span></div></div>
      <div className="kiosk-search search-wrap"><Search /><input className="input input-search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="שם האורח, טלפון או קבוצה" aria-label="חיפוש אורח" /></div>
      <ul className="kiosk-list plain" aria-live="polite">
        {results.map((g) => (
          <li key={g.id}>
            <button className={`kiosk-row ${g.checked_in_at ? 'in' : ''}`} onClick={() => arrive(g)} disabled={!!g.checked_in_at} aria-label={`${g.name}${g.checked_in_at ? ' — הגיע' : ', סימון הגעה'}`}>
              <span className="kr-table num">{label(g.table_id) ?? '—'}</span>
              <span className="kr-main"><b>{g.name}</b><span>{[g.group_name, g.party_size > 1 ? `${g.party_size} אורחים` : null, g.meal].filter(Boolean).join(' · ')}</span></span>
              <span className="kr-state">{g.checked_in_at ? <><Check />הגיע</> : 'סימון הגעה'}</span>
            </button>
          </li>
        ))}
      </ul>
      {flash && <div className="kiosk-flash" role="status"><Check /><div><b>ברוכים הבאים, {flash.name}!</b>{flash.table && <span>שולחן {flash.table}</span>}</div></div>}
    </div>
  );
}
