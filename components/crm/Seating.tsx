'use client';
// Venue floorplan. Guests are dragged 1:1 from the dock onto tables; the server enforces capacity atomically
// (assign_guest). A rejected drop carries the chip back to the dock on critically damped springs.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, UserMinus, Users } from 'lucide-react';
import type { Guest, SeatTable } from '@/lib/crm/types';
import { assignGuest, updateTable } from '@/lib/crm/api';
import { supabase } from '@/lib/crm/supabase';
import { Spring, prefersReducedMotion } from '@/lib/physics';
import { toast } from './Toast';

const W = 1000, H = 880;
const isRtl = () => typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
const mx = (x: number) => (isRtl() ? W - x : x); // floorplan is stored in reading-order coordinates

export function Seating({ eventId, tables, guests, onChange }: { eventId: string; tables: SeatTable[]; guests: Guest[]; onChange: () => void }) {
  const [local, setLocal] = useState<Guest[]>(guests);
  const [tbls, setTbls] = useState<SeatTable[]>(tables);
  const [q, setQ] = useState('');
  const [hover, setHover] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null); // tap-to-seat / keyboard alternative to dragging
  const [focusTable, setFocusTable] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const live = useRef<HTMLDivElement>(null);
  const drag = useRef<{ guest: Guest; ghost: HTMLElement; offX: number; offY: number; origin: DOMRect; samples: { t: number; x: number; y: number }[] } | null>(null);
  const pending = useRef<{ guest: Guest; el: HTMLElement; x: number; y: number } | null>(null);
  const tdrag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);

  useEffect(() => setLocal(guests), [guests]);
  useEffect(() => setTbls(tables), [tables]);
  useEffect(() => { // realtime: other planners / the venue see each move
    const ch = supabase().channel(`seating:${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests', filter: `event_id=eq.${eventId}` }, () => onChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seating_tables', filter: `event_id=eq.${eventId}` }, () => onChange())
      .subscribe();
    return () => { void supabase().removeChannel(ch); };
  }, [eventId, onChange]);

  const used = useMemo(() => { const m = new Map<string, number>(); local.forEach((g) => g.table_id && m.set(g.table_id, (m.get(g.table_id) ?? 0) + g.party_size)); return m; }, [local]);
  const unseated = local.filter((g) => !g.table_id && (!q || g.name.includes(q) || g.group_name?.includes(q)));
  const seatedTotal = local.filter((g) => g.table_id).reduce((s, g) => s + g.party_size, 0);
  const total = local.reduce((s, g) => s + g.party_size, 0);
  const say = (t: string) => { if (live.current) live.current.textContent = t; };

  const toSvg = (cx: number, cy: number) => { const pt = svg.current!.createSVGPoint(); pt.x = cx; pt.y = cy; return pt.matrixTransform(svg.current!.getScreenCTM()!.inverse()); };
  const tableAt = (x: number, y: number) => (document.elementsFromPoint(x, y).find((el) => (el as HTMLElement).dataset?.table) as HTMLElement | undefined)?.dataset.table ?? null;

  const seat = async (g: Guest, tableId: string | null, rollback?: () => void) => {
    const t = tbls.find((x) => x.id === tableId);
    setLocal((s) => s.map((x) => (x.id === g.id ? { ...x, table_id: tableId } : x)));
    try { await assignGuest(g.id, tableId); say(tableId ? `${g.name} שובץ לשולחן ${t?.label}` : `${g.name} הוסר מהשולחן`); }
    catch (e) {
      setLocal((s) => s.map((x) => (x.id === g.id ? { ...x, table_id: g.table_id } : x)));
      const full = (e as Error).message.includes('TABLE_FULL');
      toast(full ? `שולחן ${t?.label} מלא (${used.get(tableId!) ?? 0}/${t?.capacity})` : (e as Error).message, 'bad');
      say(full ? `שולחן ${t?.label} מלא` : 'השיבוץ נכשל'); rollback?.();
    }
  };

  const onChipDown = (e: React.PointerEvent<HTMLElement>, g: Guest) => { if (e.button === 0) pending.current = { guest: g, el: e.currentTarget, x: e.clientX, y: e.clientY }; };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = pending.current;
      if (p && !drag.current) {
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 5) return;
        const r = p.el.getBoundingClientRect(); const ghost = p.el.cloneNode(true) as HTMLElement;
        ghost.className = 'guest-chip seat-ghost'; Object.assign(ghost.style, { width: `${r.width}px`, transform: `translate3d(${r.left}px,${r.top}px,0) scale(1.04)` });
        document.body.appendChild(ghost);
        drag.current = { guest: p.guest, ghost, offX: p.x - r.left, offY: p.y - r.top, origin: r, samples: [] };
      }
      const d = drag.current; if (!d) return;
      e.preventDefault();
      const x = e.clientX - d.offX, y = e.clientY - d.offY;
      d.ghost.style.transform = `translate3d(${x}px,${y}px,0) scale(1.04)`;
      d.samples.push({ t: e.timeStamp, x, y }); if (d.samples.length > 5) d.samples.shift();
      setHover(tableAt(e.clientX, e.clientY));
    };
    const up = (e: PointerEvent) => {
      const d = drag.current; pending.current = null; if (!d) return; drag.current = null; setHover(null);
      const target = tableAt(e.clientX, e.clientY);
      const back = () => springTo(d, d.origin.left, d.origin.top, () => d.ghost.remove());
      if (!target) { back(); return; }
      const t = tbls.find((x) => x.id === target)!; const free = t.capacity - (used.get(t.id) ?? 0);
      if (d.guest.party_size > free) { back(); toast(`שולחן ${t.label} מלא (${used.get(t.id) ?? 0}/${t.capacity})`, 'bad'); say(`שולחן ${t.label} מלא`); return; }
      const el = svg.current?.querySelector(`[data-table="${target}"]`)?.getBoundingClientRect();
      if (el) springTo(d, el.left + el.width / 2 - d.origin.width / 2, el.top + el.height / 2 - d.origin.height / 2, () => { d.ghost.remove(); }, true);
      void seat(d.guest, target);
    };
    window.addEventListener('pointermove', move, { passive: false }); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  });

  // table repositioning (drag on the table itself)
  const onTableDown = (e: React.PointerEvent<SVGGElement>, t: SeatTable) => {
    if (picked) { const g = local.find((x) => x.id === picked)!; setPicked(null); void seat(g, t.id); return; }
    const p = toSvg(e.clientX, e.clientY); tdrag.current = { id: t.id, dx: mx(p.x) - t.x, dy: p.y - t.y, moved: false };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onTableMove = (e: React.PointerEvent<SVGGElement>) => {
    const d = tdrag.current; if (!d) return;
    const p = toSvg(e.clientX, e.clientY); d.moved = true;
    setTbls((s) => s.map((t) => (t.id === d.id ? { ...t, x: Math.max(50, Math.min(W - 50, mx(p.x) - d.dx)), y: Math.max(50, Math.min(H - 50, p.y - d.dy)) } : t)));
  };
  const onTableUp = (t: SeatTable) => {
    const d = tdrag.current; tdrag.current = null; if (!d) return;
    if (!d.moved) { setFocusTable(t.id); return; }
    const cur = tbls.find((x) => x.id === t.id)!; void updateTable(t.id, { x: Math.round(cur.x), y: Math.round(cur.y) });
  };

  const ft = tbls.find((t) => t.id === focusTable);
  return (
    <div className="seating">
      <div ref={live} className="sr-only" aria-live="assertive" />
      <aside className="dock card" aria-label="אורחים ללא שיבוץ">
        <div className="dock-head">
          <div className="hstack"><Users style={{ width: 16 }} /><b>ממתינים לשיבוץ</b><span className="num faint">{local.filter((g) => !g.table_id).length}</span></div>
          <div className="seat-progress" aria-label={`שובצו ${seatedTotal} מתוך ${total}`}><span style={{ width: `${total ? (seatedTotal / total) * 100 : 0}%` }} /></div>
          <div className="t-caption num">שובצו {seatedTotal} מתוך {total} מוזמנים</div>
          <div className="search-wrap"><Search /><input className="input input-search" placeholder="חיפוש אורח או קבוצה" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש אורח" /></div>
        </div>
        <ul className="dock-list plain">
          {unseated.map((g) => (
            <li key={g.id}>
              <button className={`guest-chip ${picked === g.id ? 'picked' : ''}`} onPointerDown={(e) => onChipDown(e, g)} onClick={() => setPicked(picked === g.id ? null : g.id)} aria-pressed={picked === g.id} aria-label={`${g.name}, ${g.party_size} מקומות. בחירה ואז לחיצה על שולחן לשיבוץ`}>
                <span className="gc-name">{g.name}</span>{g.party_size > 1 && <span className="gc-count num">×{g.party_size}</span>}<span className="gc-group">{g.group_name}</span>
              </button>
            </li>
          ))}
          {unseated.length === 0 && <li className="t-callout" style={{ padding: 16 }}>{q ? 'אין תוצאות' : 'כולם שובצו 🎉'}</li>}
        </ul>
        {picked && <div className="dock-hint">בחרו שולחן במפה לשיבוץ · <button className="btn btn-ghost btn-sm" onClick={() => setPicked(null)}>ביטול</button></div>}
      </aside>

      <div className="floor card">
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="מפת האולם">
          <defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeOpacity="0.06" /></pattern></defs>
          <rect width={W} height={H} fill="url(#grid)" />
          <rect x={W / 2 - 160} y={H - 70} width={320} height={46} rx={12} className="stage" /><text x={W / 2} y={H - 41} textAnchor="middle" className="stage-label">רחבה / במה</text>
          {tbls.map((t) => {
            const u = used.get(t.id) ?? 0; const ratio = u / t.capacity; const state = ratio >= 1 ? 'full' : ratio > 0 ? 'some' : 'empty';
            const knight = t.shape === 'knight';
            return (
              <g key={t.id} className={`tbl ${state} ${hover === t.id ? 'hover' : ''} ${focusTable === t.id ? 'focus' : ''} ${picked ? 'target' : ''}`} transform={`translate(${mx(t.x)} ${t.y})`}
                onPointerDown={(e) => onTableDown(e, t)} onPointerMove={onTableMove} onPointerUp={() => onTableUp(t)} tabIndex={0} role="button"
                aria-label={`שולחן ${t.label}, ${u} מתוך ${t.capacity}`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (picked) { const g = local.find((x) => x.id === picked)!; setPicked(null); void seat(g, t.id); } else setFocusTable(t.id); } }}>
                {knight ? <rect data-table={t.id} x={-70} y={-28} width={140} height={56} rx={14} /> : <circle data-table={t.id} r={46} />}
                <text y={-4} textAnchor="middle" className="tbl-label">{t.label}</text>
                <text y={16} textAnchor="middle" className="tbl-count">{u}/{t.capacity}</text>
              </g>
            );
          })}
        </svg>
        {ft && (
          <div className="table-pop card" role="dialog" aria-label={`שולחן ${ft.label}`}>
            <div className="hstack"><b>שולחן {ft.label}</b><span className="num faint">{used.get(ft.id) ?? 0}/{ft.capacity}</span><div style={{ flex: 1 }} /><button className="btn btn-ghost btn-sm" onClick={() => setFocusTable(null)}>סגירה</button></div>
            <ul className="plain">{local.filter((g) => g.table_id === ft.id).map((g) => <li key={g.id} className="hstack pop-row"><span style={{ flex: 1 }}>{g.name}{g.party_size > 1 ? ` ×${g.party_size}` : ''}</span>{g.meal && <span className="pill">{g.meal}</span>}<button className="btn btn-ghost btn-icon btn-sm" aria-label={`הסרת ${g.name}`} onClick={() => seat(g, null)}><UserMinus /></button></li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}

function springTo(d: { ghost: HTMLElement; samples: { t: number; x: number; y: number }[] }, x: number, y: number, done: () => void, shrink = false) {
  if (prefersReducedMotion()) { done(); return; }
  const m = new DOMMatrixReadOnly(getComputedStyle(d.ghost).transform);
  const s = d.samples; const a = s[0], b = s[s.length - 1]; const dt = a && b && b.t > a.t ? b.t - a.t : 1;
  let cx = m.m41, cy = m.m42, rest = 0; const vx = a && b ? (b.x - a.x) / dt : 0, vy = a && b ? (b.y - a.y) / dt : 0;
  const total = Math.hypot(x - cx, y - cy) || 1;
  const apply = () => { const left = Math.hypot(x - cx, y - cy) / total; d.ghost.style.transform = `translate3d(${cx}px,${cy}px,0) scale(${shrink ? 0.6 + 0.44 * left : 1.04})`; if (shrink) d.ghost.style.opacity = String(0.3 + 0.7 * left); };
  const fin = () => { if (++rest === 2) done(); };
  new Spring(cx, (v) => { cx = v; apply(); }, 0.34, fin).to(x, vx);
  new Spring(cy, (v) => { cy = v; apply(); }, 0.34, fin).to(y, vy);
}
