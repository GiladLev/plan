'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CalendarPlus, FileText, Mail, MapPin, MessageCircle, Phone, Plus, Search, Send, Users } from 'lucide-react';
import { AppShell } from './AppShell';
import { useCrm } from './CrmProvider';
import { NewClientDialog } from './NewClientDialog';
import { MeetingDialog } from './MeetingDialog';
import { Avatar, Empty, ErrorState, Field, ListSkeleton, Pill, Segmented } from './ui';
import { toast } from './Toast';
import { useQuery, invalidate, setQueryData } from '@/lib/crm/store';
import { addActivity, createDocument, createTask, listActivities, listClients, listTasks, setTaskDone, updateClient } from '@/lib/crm/api';
import { dateLong, dateShort, money, relative, telLink, waLink, wazeLink } from '@/lib/crm/format';
import { ACTIVITY_LABEL, DOC_KIND_LABEL, EVENT_TYPE_LABEL, STAGE_LABEL, STAGE_TONE } from '@/lib/crm/labels';
import { STAGES, type Client, type Stage } from '@/lib/crm/types';
import { useRouter } from 'next/navigation';

export function ClientsView({ selectedId }: { selectedId?: string }) {
  const { business } = useCrm();
  const key = `clients:${business.id}`;
  const { data, error, refetch } = useQuery(key, () => listClients(business.id));
  const [q, setQ] = useState('');
  const [stage, setStage] = useState<'all' | Stage>('all');
  const [adding, setAdding] = useState(false);
  const list = useMemo(() => (data ?? []).filter((c) => (stage === 'all' || c.stage === stage) && (!q || [c.name, c.phone, c.email, c.partner_name].some((f) => f?.toLowerCase().includes(q.toLowerCase())))).sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [data, q, stage]);
  const selected = data?.find((c) => c.id === selectedId);

  return (
    <AppShell title="לקוחות" actions={<button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Plus />לקוח חדש</button>}>
      <div className={`split with-inspector ${selectedId ? 'has-selection' : ''}`}>
        <div className="list-col" aria-label="רשימת לקוחות">
          <div className="list-head">
            <div className="search-wrap"><Search /><input className="input input-search" type="search" placeholder="חיפוש שם, טלפון או אימייל" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש לקוחות" /></div>
            <select className="select" value={stage} onChange={(e) => setStage(e.target.value as Stage)} aria-label="סינון לפי שלב" style={{ height: 32, fontSize: 13 }}>
              <option value="all">כל השלבים</option>{STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </select>
          </div>
          {error ? <ErrorState error={error} retry={refetch} /> : !data ? <ListSkeleton /> : list.length === 0 ? <Empty icon={<Users />} title={q ? 'לא נמצאו לקוחות' : 'עוד אין לקוחות'}>{!q && <button className="btn btn-primary" onClick={() => setAdding(true)}>הוספת לקוח ראשון</button>}</Empty> : (
            <ul className="plain" role="listbox" aria-label="לקוחות">
              {list.map((c) => (
                <li key={c.id} role="option" aria-selected={c.id === selectedId}>
                  <Link className={`row ${c.id === selectedId ? 'active' : ''}`} href={`/app/clients/${c.id}`}>
                    <Avatar name={c.name} />
                    <div className="grow"><div className="title">{c.name}</div><div className="sub">{EVENT_TYPE_LABEL[c.event_type]} · {dateShort(c.event_date)}</div></div>
                    <Pill tone={STAGE_TONE[c.stage as Stage]} dot>{STAGE_LABEL[c.stage as Stage]}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="detail-col">{selected ? <ClientDetail client={selected} /> : selectedId && !data ? <div className="page"><div className="skeleton" style={{ height: 120 }} /></div> : <Empty icon={<Users />} title="בחרו לקוח מהרשימה">כרטיס הלקוח, ציר הזמן והפעולות המהירות יופיעו כאן.</Empty>}</div>
        <aside className="inspector" aria-label="פרטי לקוח">{selected ? <ClientInspector key={selected.id} client={selected} /> : <div className="t-callout">פרטי הלקוח יופיעו כאן לעריכה.</div>}</aside>
      </div>
      {adding && <NewClientDialog bid={business.id} onClose={() => setAdding(false)} />}
    </AppShell>
  );
}

const COMPOSE_KINDS = [{ value: 'note', label: 'הערה' }, { value: 'call', label: 'שיחה' }, { value: 'whatsapp', label: 'וואטסאפ' }, { value: 'sms', label: 'SMS' }, { value: 'email', label: 'אימייל' }] as const;
const TEMPLATES: Record<string, (c: Client) => string> = {
  'אישור פגישה': (c) => `היי ${c.partner_name ?? c.name.split(' ')[0]}, מאשרים את הפגישה שלנו. מחכים לכם!`,
  'תודה על הפנייה': (c) => `תודה שפניתם אלינו, ${c.name.split(' ')[0]}! נחזור אליכם עוד היום עם תאריכים פנויים.`,
  'הצעת מחיר נשלחה': () => 'שלחנו לכם הצעת מחיר מסודרת למייל. נשמח לענות על כל שאלה.',
};

function ClientDetail({ client: c }: { client: Client }) {
  const { business } = useCrm();
  const router = useRouter();
  const acts = useQuery(`acts:${c.id}`, () => listActivities(c.id));
  const tasks = useQuery(`tasks:${business.id}`, () => listTasks(business.id));
  const [kind, setKind] = useState<(typeof COMPOSE_KINDS)[number]['value']>('note');
  const [body, setBody] = useState('');
  const [meeting, setMeeting] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const myTasks = (tasks.data ?? []).filter((t) => t.client_id === c.id);

  const log = async (e: React.FormEvent) => {
    e.preventDefault(); if (!body.trim()) return;
    const text = body.trim(); setBody('');
    if (kind === 'whatsapp' && c.phone) window.open(waLink(c.phone, text), '_blank', 'noopener');
    await addActivity(business.id, c.id, kind, text); invalidate(`acts:${c.id}`); invalidate(`feed:${business.id}`);
    toast(kind === 'note' ? 'נשמר בציר הזמן' : `${ACTIVITY_LABEL[kind]} תועד בכרטיס`);
  };
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault(); if (!taskTitle.trim()) return;
    await createTask(business.id, { title: taskTitle.trim(), client_id: c.id, due_at: new Date(Date.now() + 86400000).toISOString() });
    setTaskTitle(''); invalidate(`tasks:${business.id}`);
  };
  const newDoc = async (kind: string) => { const d = await createDocument(business.id, kind, c.id, Number(business.vat_rate)); invalidate(`docs:${business.id}`); router.push(`/app/documents/${d.id}`); };

  return (
    <div className="page client-page">
      <Link href="/app/clients" className="btn btn-ghost btn-sm mobile-back">→ לקוחות</Link>
      <header className="client-hero card card-pad">
        <Avatar name={c.name} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="hstack"><h2 className="t-title">{c.name}</h2><Pill tone={STAGE_TONE[c.stage as Stage]} dot>{STAGE_LABEL[c.stage as Stage]}</Pill></div>
          <div className="t-callout">{EVENT_TYPE_LABEL[c.event_type]} · {dateLong(c.event_date)}</div>
        </div>
        <div className="quick-actions">
          {c.phone && <a className="qa" href={telLink(c.phone)}><Phone /><span>חיוג</span></a>}
          {c.phone && <a className="qa" href={waLink(c.phone)} target="_blank" rel="noopener"><MessageCircle /><span>וואטסאפ</span></a>}
          {c.email && <a className="qa" href={`mailto:${c.email}`}><Mail /><span>מייל</span></a>}
          <button className="qa" onClick={() => setMeeting(true)}><CalendarPlus /><span>פגישה</span></button>
          <button className="qa" onClick={() => newDoc('quote')}><FileText /><span>הצעה</span></button>
        </div>
      </header>

      <section className="facts">
        <div className="fact card"><span>תאריך</span><b className="num">{dateShort(c.event_date)}</b></div>
        <div className="fact card"><span>אורחים</span><b className="num">{c.guests ?? '—'}</b></div>
        <div className="fact card"><span>שווי</span><b className="num">{money(c.value)}</b></div>
        <div className="fact card"><span>מקור</span><b>{c.source ?? '—'}</b></div>
      </section>

      <div className="client-cols">
        <section className="card">
          <form className="composer" onSubmit={log}>
            <Segmented label="סוג תיעוד" value={kind} options={[...COMPOSE_KINDS]} onChange={setKind} />
            <textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} placeholder={kind === 'note' ? 'מה חשוב לזכור?' : 'תוכן ההודעה / סיכום השיחה'} aria-label="תוכן" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) log(e); }} />
            <div className="hstack" style={{ flexWrap: 'wrap' }}>
              {kind !== 'note' && kind !== 'call' && Object.entries(TEMPLATES).map(([n, f]) => <button key={n} type="button" className="btn btn-sm" onClick={() => setBody(f(c))}>{n}</button>)}
              <div style={{ flex: 1 }} />
              <span className="t-caption">⌘↵</span>
              <button className="btn btn-primary btn-sm" disabled={!body.trim()}><Send />{kind === 'whatsapp' ? 'שליחה ותיעוד' : 'תיעוד'}</button>
            </div>
          </form>
          <div className="divider" style={{ margin: 0 }} />
          <ol className="timeline" aria-label="ציר זמן">
            {!acts.data ? <li className="t-callout" style={{ padding: 18 }}>טוען…</li> : acts.data.length === 0 ? <li className="t-callout" style={{ padding: 18 }}>עוד אין פעילות</li> : acts.data.map((a) => (
              <li key={a.id} className={`tl-item tl-${a.kind}`}>
                <span className="tl-dot" aria-hidden="true" />
                <div className="tl-body">
                  <div className="hstack"><b>{ACTIVITY_LABEL[a.kind]}</b><span className="t-caption">{relative(a.created_at)}</span></div>
                  {a.kind === 'stage' && (a.meta as { from?: Stage }).from ? <div className="t-callout">{STAGE_LABEL[(a.meta as { from: Stage }).from]} ← {STAGE_LABEL[(a.meta as { to: Stage }).to]}</div> : null}
                  {a.kind === 'document' && (a.meta as { kind?: string }).kind ? <Link className="t-callout link" href={`/app/documents/${(a.meta as { document_id: string }).document_id}`}>{DOC_KIND_LABEL[(a.meta as { kind: string }).kind]} מס׳ {(a.meta as { number: number }).number} · {money((a.meta as { total: number }).total, true)}</Link> : null}
                  {a.body && <div className="tl-text">{a.body}</div>}
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className="card">
          <div className="card-head"><h3>משימות</h3></div>
          <ul className="plain">
            {myTasks.map((t) => (
              <li key={t.id} className="row" style={{ cursor: 'default' }}>
                <button className={`check ${t.done ? 'done' : ''}`} aria-pressed={t.done} aria-label={t.title} onClick={async () => { setQueryData(`tasks:${business.id}`, (p: typeof tasks.data) => (p ?? []).map((x) => (x.id === t.id ? { ...x, done: !t.done } : x))); await setTaskDone(t.id, !t.done); }}>{t.done ? '✓' : '○'}</button>
                <div className="grow"><div className="title" style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--ink-3)' : undefined }}>{t.title}</div>{t.due_at && <div className="sub">{relative(t.due_at)}</div>}</div>
              </li>
            ))}
          </ul>
          <form className="card-pad hstack" onSubmit={addTask}><input className="input" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="משימה חדשה…" aria-label="משימה חדשה" /><button className="btn btn-icon" aria-label="הוספה"><Plus /></button></form>
          {c.notes && <><div className="divider" style={{ margin: 0 }} /><div className="card-pad"><div className="t-caption" style={{ marginBottom: 4 }}>הערות</div><div>{c.notes}</div></div></>}
          {c.phone && <div className="card-pad" style={{ paddingTop: 0 }}><a className="btn btn-sm" href={wazeLink(business.address ?? business.name)} target="_blank" rel="noopener"><MapPin />קישור הגעה למתחם</a></div>}
        </section>
      </div>
      {meeting && <MeetingDialog defaultClientId={c.id} onClose={() => setMeeting(false)} />}
    </div>
  );
}

function ClientInspector({ client: c }: { client: Client }) {
  const { business } = useCrm();
  const [v, setV] = useState(c);
  const save = async (patch: Partial<Client>) => {
    setQueryData<Client[]>(`clients:${business.id}`, (p) => (p ?? []).map((x) => (x.id === c.id ? { ...x, ...patch } : x)));
    try { await updateClient(c.id, patch); } catch (e) { toast((e as Error).message, 'bad'); invalidate(`clients:${business.id}`); }
  };
  const bind = (k: keyof Client, cast: (s: string) => unknown = (s) => s || null) => ({
    value: (v[k] ?? '') as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value }),
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { const nv = cast(e.target.value); if (nv !== c[k]) void save({ [k]: nv } as Partial<Client>); },
  });
  const n = (s: string) => (s === '' ? null : Number(s));
  return (
    <div className="stack">
      <div className="t-headline">פרטי לקוח</div>
      <Field label="שם"><input className="input" {...bind('name', (s) => s || c.name)} /></Field>
      <Field label="בן/בת זוג"><input className="input" {...bind('partner_name')} /></Field>
      <Field label="טלפון"><input className="input" dir="ltr" {...bind('phone')} /></Field>
      <Field label="אימייל"><input className="input" dir="ltr" {...bind('email')} /></Field>
      <Field label="שלב"><select className="select" value={v.stage} onChange={(e) => { setV({ ...v, stage: e.target.value }); void save({ stage: e.target.value }); }}>{STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select></Field>
      <div className="grid-2">
        <Field label="סוג אירוע"><select className="select" {...bind('event_type', (s) => s)}>{Object.entries(EVENT_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="תאריך"><input className="input" type="date" {...bind('event_date')} /></Field>
        <Field label="אורחים"><input className="input num" inputMode="numeric" {...bind('guests', n)} /></Field>
        <Field label="שווי (₪)"><input className="input num" inputMode="decimal" {...bind('value', n)} /></Field>
      </div>
      <Field label="מקור"><input className="input" {...bind('source')} /></Field>
      <Field label="הערות"><textarea className="textarea" {...bind('notes')} /></Field>
      <div className="t-caption">נשמר אוטומטית ביציאה מהשדה</div>
    </div>
  );
}
