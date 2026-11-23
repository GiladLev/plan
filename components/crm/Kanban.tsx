'use client';
// Pipeline board. Drag follows the pointer 1:1 from the grab point; on release the card is carried by
// critically damped springs (seeded with release velocity) into its new slot. Arrow keys move a focused card between stages.
import { useRef, useState } from 'react';
import Link from 'next/link';
import type { Client, Stage } from '@/lib/crm/types';
import { STAGES } from '@/lib/crm/types';
import { STAGE_LABEL, EVENT_TYPE_LABEL } from '@/lib/crm/labels';
import { dateShort, money } from '@/lib/crm/format';
import { Spring, prefersReducedMotion } from '@/lib/physics';
import { Avatar } from './ui';

type Drag = { id: string; ghost: HTMLElement; offX: number; offY: number; samples: { t: number; x: number; y: number }[]; origin: HTMLElement };

export function Kanban({ clients, onMove }: { clients: Client[]; onMove: (c: Client, stage: Stage, position: number) => void }) {
  const board = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ stage: Stage; index: number } | null>(null);
  const drag = useRef<Drag | null>(null);
  const pending = useRef<{ id: string; x: number; y: number; pointer: number; el: HTMLElement } | null>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  const byStage = (s: Stage) => clients.filter((c) => c.stage === s && c.id !== dragId).sort((a, b) => a.stage_position - b.stage_position);
  const all = (s: Stage) => clients.filter((c) => c.stage === s).sort((a, b) => a.stage_position - b.stage_position);

  const positionFor = (stage: Stage, index: number, movingId: string) => {
    const list = all(stage).filter((c) => c.id !== movingId);
    const before = list[index - 1]?.stage_position; const after = list[index]?.stage_position;
    if (before == null && after == null) return 1;
    if (before == null) return after! - 1;
    if (after == null) return before + 1;
    return (before + after) / 2;
  };

  const hitTest = (x: number, y: number): { stage: Stage; index: number } | null => {
    const cols = board.current?.querySelectorAll<HTMLElement>('[data-stage]') ?? [];
    for (const col of cols) {
      const r = col.getBoundingClientRect();
      if (x < r.left - 12 || x > r.right + 12) continue; // hysteresis around column edges
      const stage = col.dataset.stage as Stage;
      const cards = Array.from(col.querySelectorAll<HTMLElement>('[data-card]:not([data-placeholder])'));
      let index = cards.length;
      for (let i = 0; i < cards.length; i++) { const cr = cards[i].getBoundingClientRect(); if (y < cr.top + cr.height / 2) { index = i; break; } }
      return { stage, index };
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>, c: Client) => {
    if (e.button !== 0) return;
    pending.current = { id: c.id, x: e.clientX, y: e.clientY, pointer: e.pointerId, el: e.currentTarget };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p = pending.current;
    if (p && !drag.current) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
      const r = p.el.getBoundingClientRect();
      const ghost = p.el.cloneNode(true) as HTMLElement;
      ghost.classList.add('kanban-ghost');
      Object.assign(ghost.style, { width: `${r.width}px`, left: '0px', top: '0px', transform: `translate3d(${r.left}px, ${r.top}px, 0) scale(1.03) rotate(-1deg)` });
      document.body.appendChild(ghost);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = { id: p.id, ghost, offX: p.x - r.left, offY: p.y - r.top, samples: [], origin: p.el };
      setDragId(p.id);
    }
    const d = drag.current; if (!d) return;
    const x = e.clientX - d.offX, y = e.clientY - d.offY;
    d.ghost.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.03) rotate(-1deg)`;
    d.samples.push({ t: e.timeStamp, x, y }); if (d.samples.length > 5) d.samples.shift();
    const h = hitTest(e.clientX, e.clientY);
    setOver((o) => (o?.stage === h?.stage && o?.index === h?.index ? o : h));
  };
  const finish = (e: React.PointerEvent) => {
    const d = drag.current; pending.current = null;
    if (!d) return;
    drag.current = null;
    const target = hitTest(e.clientX, e.clientY);
    const client = clients.find((c) => c.id === d.id)!;
    const s = d.samples; const a = s[0], b = s[s.length - 1];
    const dt = b && a && b.t > a.t ? b.t - a.t : 1;
    const vx = b && a ? (b.x - a.x) / dt : 0, vy = b && a ? (b.y - a.y) / dt : 0;
    const settle = () => { d.ghost.remove(); setDragId(null); setOver(null); };
    if (!target) { animateTo(d, d.origin, vx, vy, settle); return; }
    const ph = board.current?.querySelector<HTMLElement>('[data-placeholder]');
    animateTo(d, ph ?? d.origin, vx, vy, () => {
      settle();
      if (target.stage !== client.stage || all(target.stage).filter((c) => c.id !== client.id).findIndex((c) => c.id === client.id) !== target.index) {
        onMove(client, target.stage, positionFor(target.stage, target.index, client.id));
        if (liveRef.current) liveRef.current.textContent = `${client.name} הועבר ל${STAGE_LABEL[target.stage]}`;
      }
    });
  };

  const onKey = (e: React.KeyboardEvent, c: Client) => {
    const dir = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0; // RTL: left = forward
    if (!dir) return;
    e.preventDefault();
    const i = STAGES.indexOf(c.stage as Stage) + dir;
    if (i < 0 || i >= STAGES.length) return;
    const stage = STAGES[i];
    onMove(c, stage, positionFor(stage, all(stage).length, c.id));
    if (liveRef.current) liveRef.current.textContent = `${c.name} הועבר ל${STAGE_LABEL[stage]}`;
  };

  return (
    <div className="kanban" ref={board} onPointerMove={onPointerMove} onPointerUp={finish} onPointerCancel={finish}>
      <div ref={liveRef} className="sr-only" aria-live="polite" />
      {STAGES.map((stage) => {
        const list = byStage(stage);
        const total = all(stage).reduce((s, c) => s + Number(c.value ?? 0), 0);
        const showPh = dragId && over?.stage === stage;
        return (
          <section key={stage} className={`kanban-col stage-${stage} ${showPh ? 'is-over' : ''}`} data-stage={stage} aria-label={STAGE_LABEL[stage]}>
            <header className="kanban-col-head"><span className="stage-dot" /><h2>{STAGE_LABEL[stage]}</h2><span className="count num">{all(stage).length}</span><span className="sum num">{money(total)}</span></header>
            <div className="kanban-list">
              {list.map((c, i) => (
                <div key={c.id} style={{ display: 'contents' }}>
                  {showPh && over!.index === i && <div className="kanban-ph" data-placeholder data-card />}
                  <Card c={c} onPointerDown={(e) => onPointerDown(e, c)} onKeyDown={(e) => onKey(e, c)} />
                </div>
              ))}
              {showPh && over!.index >= list.length && <div className="kanban-ph" data-placeholder data-card />}
              {list.length === 0 && !showPh && <div className="kanban-empty">גררו לכאן</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function animateTo(d: Drag, target: HTMLElement, vx: number, vy: number, done: () => void) {
  const to = target.getBoundingClientRect();
  const m = new DOMMatrixReadOnly(getComputedStyle(d.ghost).transform); // presentation value
  if (prefersReducedMotion()) { done(); return; }
  let x = m.m41, y = m.m42, sx = false, sy = false, scale = 1.03;
  const apply = () => { d.ghost.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`; };
  const end = () => { if (sx && sy) done(); };
  const springX = new Spring(x, (v) => { x = v; scale = 1 + 0.03 * Math.min(1, Math.abs(v - to.left) / 60); apply(); }, 0.32, () => { sx = true; end(); });
  const springY = new Spring(y, (v) => { y = v; apply(); }, 0.32, () => { sy = true; end(); });
  d.ghost.classList.add('is-dropping');
  springX.to(to.left, vx); springY.to(to.top, vy);
}

function Card({ c, ...handlers }: { c: Client; onPointerDown: (e: React.PointerEvent<HTMLElement>) => void; onKeyDown: (e: React.KeyboardEvent) => void }) {
  return (
    <Link href={`/app/clients/${c.id}`} className="kanban-card" data-card draggable={false} {...handlers} onClick={(e) => { if (document.querySelector('.kanban-ghost')) e.preventDefault(); }} aria-label={`${c.name}, ${STAGE_LABEL[c.stage as Stage]}. חיצים להעברה בין שלבים`}>
      <div className="hstack" style={{ gap: 10 }}><Avatar name={c.name} /><div style={{ minWidth: 0 }}><div className="kc-name">{c.name}</div><div className="kc-sub">{EVENT_TYPE_LABEL[c.event_type]} · {dateShort(c.event_date)}</div></div></div>
      <div className="kc-foot"><span className="num">{c.guests ?? '—'} אורחים</span><span className="num kc-val">{money(c.value)}</span></div>
    </Link>
  );
}
