'use client';
import { useState } from 'react';
import { Plus, Printer, Trash2 } from 'lucide-react';
import type { Dish, Menu } from '@/lib/crm/types';
import { createMenu, deleteDish, upsertDish } from '@/lib/crm/api';
import { COURSE_LABEL } from '@/lib/crm/labels';
import { toast } from './Toast';

const TAGS = ['טבעוני', 'צמחוני', 'ללא גלוטן', 'ללא לקטוז', 'חריף', 'מכיל אגוזים'];
const COURSES = Object.keys(COURSE_LABEL);

export function MenuBuilder({ bid, eventId, menus, onChange }: { bid: string; eventId: string; menus: (Menu & { dishes: Dish[] })[]; onChange: () => void }) {
  const menu = menus[0];
  const [draft, setDraft] = useState<{ name: string; course: string; tags: string[]; notes: string }>({ name: '', course: 'main', tags: [], notes: '' });
  const [filter, setFilter] = useState<string | null>(null);
  if (!menu) return <div className="empty"><div className="t-headline">עוד אין תפריט לאירוע</div><button className="btn btn-primary" onClick={async () => { await createMenu(bid, eventId, 'תפריט האירוע'); onChange(); }}>יצירת תפריט</button></div>;
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); if (!draft.name.trim()) return;
    await upsertDish(bid, { menu_id: menu.id, name: draft.name.trim(), course: draft.course, tags: draft.tags, notes: draft.notes || null, position: menu.dishes.length + 1 });
    setDraft({ ...draft, name: '', notes: '', tags: [] }); onChange(); toast('המנה נוספה');
  };
  const toggleTag = async (d: Dish, tag: string) => { await upsertDish(bid, { ...d, tags: d.tags.includes(tag) ? d.tags.filter((t) => t !== tag) : [...d.tags, tag] }); onChange(); };
  return (
    <div className="menu-builder">
      <div className="hstack" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        <h3 className="t-headline">{menu.name}</h3><div style={{ flex: 1 }} />
        <div className="tag-filter" role="group" aria-label="סינון לפי תגית">{TAGS.slice(0, 4).map((t) => <button key={t} className={`tag ${filter === t ? 'on' : ''}`} aria-pressed={filter === t} onClick={() => setFilter(filter === t ? null : t)}>{t}</button>)}</div>
        <button className="btn btn-sm" onClick={() => window.print()}><Printer />הדפסה למטבח</button>
      </div>
      <form className="card card-pad dish-add" onSubmit={add}>
        <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="שם המנה" aria-label="שם המנה" />
        <select className="select" value={draft.course} onChange={(e) => setDraft({ ...draft, course: e.target.value })} aria-label="מנה">{COURSES.map((c) => <option key={c} value={c}>{COURSE_LABEL[c]}</option>)}</select>
        <input className="input" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="הערות שף / אלרגנים" aria-label="הערות" />
        <button className="btn btn-primary" disabled={!draft.name.trim()}><Plus />הוספה</button>
        <div className="tag-row">{TAGS.map((t) => <button type="button" key={t} className={`tag ${draft.tags.includes(t) ? 'on' : ''}`} aria-pressed={draft.tags.includes(t)} onClick={() => setDraft({ ...draft, tags: draft.tags.includes(t) ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] })}>{t}</button>)}</div>
      </form>
      <div className="courses printable">
        {COURSES.map((c) => {
          const dishes = menu.dishes.filter((d) => d.course === c && (!filter || d.tags.includes(filter)));
          if (!dishes.length) return null;
          return (
            <section key={c} className="course">
              <h4>{COURSE_LABEL[c]}</h4>
              <ul className="plain">{dishes.map((d) => (
                <li key={d.id} className="dish card">
                  <div style={{ flex: 1, minWidth: 0 }}><div className="dish-name">{d.name}</div>{d.notes && <div className="t-callout">{d.notes}</div>}
                    <div className="tag-row">{TAGS.map((t) => <button key={t} className={`tag sm ${d.tags.includes(t) ? 'on' : ''}`} aria-pressed={d.tags.includes(t)} onClick={() => toggleTag(d, t)}>{t}</button>)}</div>
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm" aria-label={`מחיקת ${d.name}`} onClick={async () => { await deleteDish(d.id); onChange(); }}><Trash2 /></button>
                </li>
              ))}</ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
