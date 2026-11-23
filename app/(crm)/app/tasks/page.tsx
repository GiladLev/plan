'use client';
import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2, Circle, ListTodo, Plus, Trash2, Wrench } from 'lucide-react';
import { AppShell } from '@/components/crm/AppShell';
import { useCrm } from '@/components/crm/CrmProvider';
import { Empty, ErrorState, ListSkeleton, Pill, Segmented } from '@/components/crm/ui';
import { toast } from '@/components/crm/Toast';
import { useQuery, setQueryData, invalidate } from '@/lib/crm/store';
import { createTask, deleteTask, listTasks, setTaskDone } from '@/lib/crm/api';
import { relative } from '@/lib/crm/format';

type Filter = 'open' | 'today' | 'late' | 'done';

export default function TasksPage() {
  const { business } = useCrm();
  const key = `tasks:${business.id}`;
  const { data, error, refetch } = useQuery(key, () => listTasks(business.id));
  const [filter, setFilter] = useState<Filter>('open');
  const [cat, setCat] = useState<'all' | 'client' | 'operations'>('all');
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  type T = NonNullable<typeof data>[number];
  const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
  const rows = (data ?? []).filter((t) => (cat === 'all' || t.category === cat) && (
    filter === 'done' ? t.done : !t.done && (filter === 'open' || (filter === 'late' ? !!t.due_at && new Date(t.due_at) < new Date() : !!t.due_at && new Date(t.due_at) <= endOfDay))));
  const toggle = async (t: T) => {
    setQueryData<T[]>(key, (p) => (p ?? []).map((x) => (x.id === t.id ? { ...x, done: !t.done } : x)));
    try { await setTaskDone(t.id, !t.done); } catch (e) { toast((e as Error).message, 'bad'); invalidate(key); }
  };
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); if (!title.trim()) return;
    await createTask(business.id, { title: title.trim(), category: cat === 'operations' ? 'operations' : 'client', due_at: due ? new Date(due).toISOString() : null });
    setTitle(''); setDue(''); invalidate(key);
  };
  const remove = async (t: T) => { setQueryData<T[]>(key, (p) => (p ?? []).filter((x) => x.id !== t.id)); await deleteTask(t.id); toast('המשימה נמחקה'); };
  return (
    <AppShell title="משימות">
      <div className="page" style={{ maxWidth: 820 }}>
        <div className="hstack" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
          <Segmented label="סינון" value={filter} onChange={setFilter} options={[{ value: 'open', label: 'פתוחות' }, { value: 'today', label: 'להיום' }, { value: 'late', label: 'באיחור' }, { value: 'done', label: 'בוצעו' }]} />
          <div style={{ flex: 1 }} />
          <Segmented label="קטגוריה" value={cat} onChange={setCat} options={[{ value: 'all', label: 'הכול' }, { value: 'client', label: 'לקוחות' }, { value: 'operations', label: 'תפעול' }]} />
        </div>
        <form className="card card-pad hstack task-add" onSubmit={add}>
          <Plus className="faint" aria-hidden="true" style={{ width: 18 }} />
          <input className="input" style={{ border: 0, boxShadow: 'none', paddingInline: 0 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={cat === 'operations' ? 'משימת תפעול חדשה (למשל: בדיקת גנרטור)' : 'משימה חדשה…'} aria-label="משימה חדשה" />
          <input className="input" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} aria-label="מועד" style={{ width: 210 }} />
          <button className="btn btn-primary" disabled={!title.trim()}>הוספה</button>
        </form>
        <section className="card" style={{ marginTop: 12 }}>
          {error ? <ErrorState error={error} retry={refetch} /> : !data ? <ListSkeleton rows={5} /> : rows.length === 0 ? <Empty icon={<ListTodo />} title={filter === 'done' ? 'עוד לא סגרתם משימות' : 'אין משימות כאן'} /> : (
            <ul className="plain">
              {rows.map((t) => {
                const late = !t.done && t.due_at && new Date(t.due_at) < new Date();
                return (
                  <li key={t.id} className="row task-row" style={{ cursor: 'default' }}>
                    <button className={`check ${t.done ? 'done' : ''}`} aria-pressed={t.done} aria-label={`${t.done ? 'ביטול סימון' : 'סימון כבוצע'}: ${t.title}`} onClick={() => toggle(t)}>{t.done ? <CheckCircle2 /> : <Circle />}</button>
                    <div className="grow">
                      <div className="title" style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--ink-3)' : undefined }}>{t.title}</div>
                      <div className="sub">{t.category === 'operations' ? <><Wrench style={{ width: 12, verticalAlign: -1 }} /> תפעול המתחם</> : t.clients ? <Link href={`/app/clients/${t.client_id}`} className="link">{t.clients.name}</Link> : 'כללי'}</div>
                    </div>
                    {t.priority === 2 && !t.done && <Pill tone="warn">דחוף</Pill>}
                    {t.due_at && <Pill tone={late ? 'bad' : ''}>{late ? `באיחור · ${relative(t.due_at)}` : relative(t.due_at)}</Pill>}
                    <button className="btn btn-ghost btn-icon btn-sm task-del" aria-label={`מחיקת ${t.title}`} onClick={() => remove(t)}><Trash2 /></button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
