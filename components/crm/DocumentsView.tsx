'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Copy, FilePlus2, FileText, Mail, MessageCircle, Plus, Printer, Stamp, Trash2 } from 'lucide-react';
import { AppShell } from './AppShell';
import { useCrm } from './CrmProvider';
import { Empty, ErrorState, Field, ListSkeleton, Pill, Segmented } from './ui';
import { toast } from './Toast';
import { useQuery, invalidate } from '@/lib/crm/store';
import { createDocument, deleteDocument, getDocument, issueDocument, listClients, listDocuments, markSent, saveLines, updateDocument } from '@/lib/crm/api';
import { dateNum, money, waLink } from '@/lib/crm/format';
import { DOC_KIND_LABEL, DOC_STATUS_LABEL } from '@/lib/crm/labels';
import type { DocLine } from '@/lib/crm/types';

const STATUS_TONE: Record<string, string> = { draft: '', issued: 'accent', sent: 'ok', void: 'bad' };
type Line = Pick<DocLine, 'description' | 'qty' | 'unit_price'>;
const totals = (lines: Line[], vatRate: number) => { const sub = lines.reduce((s, l) => s + Math.round(Number(l.qty) * Number(l.unit_price) * 100) / 100, 0); const vat = Math.round(sub * vatRate) / 100; return { sub, vat, total: sub + vat }; };

export function DocumentsView({ selectedId }: { selectedId?: string }) {
  const { business } = useCrm();
  const router = useRouter();
  const key = `docs:${business.id}`;
  const { data, error, refetch } = useQuery(key, () => listDocuments(business.id));
  const [kind, setKind] = useState<'all' | string>('all');
  const rows = (data ?? []).filter((d) => kind === 'all' || d.kind === kind);
  const issuedTotal = (data ?? []).filter((d) => d.status !== 'draft' && d.kind === 'invoice').reduce((s, d) => s + Number(d.total), 0);
  const create = async (k: string) => { const d = await createDocument(business.id, k, null, Number(business.vat_rate)); invalidate(key); router.push(`/app/documents/${d.id}`); };
  return (
    <AppShell title="מסמכים וכספים" actions={<div className="hstack"><button className="btn btn-sm" onClick={() => create('quote')}><FilePlus2 />הצעת מחיר</button><button className="btn btn-primary btn-sm" onClick={() => create('invoice')}><Plus />חשבונית</button></div>}>
      <div className={`split ${selectedId ? 'has-selection' : ''}`}>
        <div className="list-col">
          <div className="list-head">
            <Segmented label="סוג מסמך" value={kind} onChange={setKind} options={[{ value: 'all', label: 'הכול' }, { value: 'quote', label: 'הצעות' }, { value: 'order', label: 'הזמנות' }, { value: 'invoice', label: 'חשבוניות' }, { value: 'receipt', label: 'קבלות' }]} />
            <div className="t-caption">סה״כ חשבוניות שהופקו: <b className="num" style={{ color: 'var(--ink-1)' }}>{money(issuedTotal)}</b></div>
          </div>
          {error ? <ErrorState error={error} retry={refetch} /> : !data ? <ListSkeleton /> : rows.length === 0 ? <Empty icon={<FileText />} title="אין מסמכים">צרו הצעת מחיר או חשבונית מתוך כרטיס לקוח או מכאן.</Empty> : (
            <ul className="plain">
              {rows.map((d) => (
                <li key={d.id}><Link href={`/app/documents/${d.id}`} className={`row ${d.id === selectedId ? 'active' : ''}`}>
                  <span className={`doc-icon doc-${d.kind}`}><FileText /></span>
                  <div className="grow"><div className="title">{DOC_KIND_LABEL[d.kind]}{d.number ? ` ${d.number}` : ''} · {d.clients?.name ?? 'ללא לקוח'}</div><div className="sub num">{dateNum(d.issue_date)} · {money(d.total, true)}</div></div>
                  <Pill tone={STATUS_TONE[d.status]}>{DOC_STATUS_LABEL[d.status]}</Pill>
                </Link></li>
              ))}
            </ul>
          )}
        </div>
        <div className="detail-col">{selectedId ? <DocEditor key={selectedId} id={selectedId} /> : <Empty icon={<FileText />} title="בחרו מסמך">הצעות מחיר, הזמנות, חשבוניות וקבלות — עם תצוגה מקדימה חיה.</Empty>}</div>
      </div>
    </AppShell>
  );
}

function DocEditor({ id }: { id: string }) {
  const { business } = useCrm();
  const router = useRouter();
  const { data: doc, error, refetch } = useQuery(`doc:${id}`, () => getDocument(id));
  const clients = useQuery(`clients:${business.id}`, () => listClients(business.id));
  const [lines, setLines] = useState<Line[] | null>(null);
  const [busy, setBusy] = useState(false);
  const issueKey = useRef<string | null>(null);
  const saveTimer = useRef<number>(0);
  useEffect(() => { if (doc && !lines) setLines(doc.document_lines.map((l) => ({ description: l.description, qty: Number(l.qty), unit_price: Number(l.unit_price) }))); }, [doc, lines]);
  const locked = !!doc && doc.status !== 'draft';
  const t = useMemo(() => totals(lines ?? [], Number(doc?.vat_rate ?? 18)), [lines, doc?.vat_rate]);

  if (error) return <ErrorState error={error} retry={refetch} />;
  if (!doc || !lines) return <div className="page"><div className="skeleton" style={{ height: 500, borderRadius: 16 }} /></div>;
  const client = clients.data?.find((c) => c.id === doc.client_id) ?? doc.clients;

  const queueSave = (next: Line[]) => {
    setLines(next); window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      await saveLines(business.id, doc.id, next); const tt = totals(next, Number(doc.vat_rate));
      await updateDocument(doc.id, { subtotal: tt.sub, vat: tt.vat, total: tt.total }); invalidate(`docs:${business.id}`);
    }, 500);
  };
  const setLine = (i: number, patch: Partial<Line>) => queueSave(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const meta = async (patch: Parameters<typeof updateDocument>[1]) => { await updateDocument(doc.id, patch); invalidate(`doc:${id}`); invalidate(`docs:${business.id}`); };

  const issue = async () => {
    if (!client) { toast('יש לבחור לקוח לפני הפקה', 'bad'); return; }
    if (!lines.some((l) => l.description.trim() && Number(l.unit_price) > 0)) { toast('יש להוסיף לפחות שורה אחת עם מחיר', 'bad'); return; }
    window.clearTimeout(saveTimer.current); setBusy(true);
    issueKey.current ??= crypto.randomUUID(); // same key for retries / double clicks → exactly one number
    try { await saveLines(business.id, doc.id, lines); const d = await issueDocument(doc.id, issueKey.current); toast(`${DOC_KIND_LABEL[d.kind]} מס׳ ${d.number} הופקה`); invalidate(`doc:${id}`); invalidate(`docs:${business.id}`); if (d.client_id) invalidate(`acts:${d.client_id}`); }
    catch (e) { toast((e as Error).message, 'bad'); }
    finally { setBusy(false); }
  };
  const send = async (ch: 'email' | 'whatsapp') => {
    if (ch === 'whatsapp' && client?.phone) window.open(waLink(client.phone, `שלום ${client.name.split(' ')[0]}, מצורף ${DOC_KIND_LABEL[doc.kind]} מס׳ ${doc.number} על סך ${money(doc.total, true)}. תודה! — ${business.name}`), '_blank', 'noopener');
    await markSent(doc, ch); toast(ch === 'email' ? `נשלח ל-${client?.email ?? 'הלקוח'} (הדגמה)` : 'נפתח וואטסאפ ותועד בכרטיס'); invalidate(`doc:${id}`); invalidate(`docs:${business.id}`);
  };
  const convert = async (k: string) => { const d = await createDocument(business.id, k, doc.client_id, Number(doc.vat_rate)); await saveLines(business.id, d.id, lines); const tt = totals(lines, Number(doc.vat_rate)); await updateDocument(d.id, { subtotal: tt.sub, vat: tt.vat, total: tt.total, notes: doc.notes }); invalidate(`docs:${business.id}`); router.push(`/app/documents/${d.id}`); };
  const remove = async () => { await deleteDocument(doc.id); invalidate(`docs:${business.id}`); router.push('/app/documents'); toast('הטיוטה נמחקה'); };

  return (
    <div className="doc-editor">
      <div className="doc-actions">
        <Link href="/app/documents" className="btn btn-ghost btn-sm mobile-back">→ מסמכים</Link>
        <Pill tone={STATUS_TONE[doc.status]} dot>{DOC_STATUS_LABEL[doc.status]}</Pill>
        <div style={{ flex: 1 }} />
        {!locked && <button className="btn btn-ghost btn-sm btn-danger" onClick={remove}><Trash2 />מחיקה</button>}
        <button className="btn btn-sm" onClick={() => window.print()}><Printer />הדפסה / PDF</button>
        {locked && doc.kind === 'quote' && <button className="btn btn-sm" onClick={() => convert('order')}><Copy />המרה להזמנה</button>}
        {locked && (doc.kind === 'order' || doc.kind === 'quote') && <button className="btn btn-sm" onClick={() => convert('invoice')}><Copy />הפקת חשבונית</button>}
        {locked ? <>
          <button className="btn btn-sm" onClick={() => send('whatsapp')}><MessageCircle />וואטסאפ</button>
          <button className="btn btn-primary btn-sm" onClick={() => send('email')}><Mail />שליחה במייל</button>
        </> : <button className="btn btn-primary btn-sm" onClick={issue} disabled={busy}><Stamp />{busy ? 'מפיקים…' : 'הפקה'}</button>}
      </div>
      <div className="doc-grid">
        <section className="doc-form card card-pad">
          <div className="grid-2">
            <Field label="סוג"><select className="select" value={doc.kind} disabled={locked} onChange={(e) => meta({ kind: e.target.value })}>{Object.entries(DOC_KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="לקוח"><select className="select" value={doc.client_id ?? ''} disabled={locked} onChange={(e) => meta({ client_id: e.target.value || null })}><option value="">בחירת לקוח…</option>{clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="תאריך"><input className="input" type="date" disabled={locked} value={doc.issue_date} onChange={(e) => meta({ issue_date: e.target.value })} /></Field>
            <Field label="לתשלום עד"><input className="input" type="date" disabled={locked} value={doc.due_date ?? ''} onChange={(e) => meta({ due_date: e.target.value || null })} /></Field>
          </div>
          <div className="lines" role="table" aria-label="שורות המסמך">
            <div className="line line-head" role="row"><span role="columnheader">תיאור</span><span role="columnheader">כמות</span><span role="columnheader">מחיר</span><span role="columnheader">סה״כ</span><span /></div>
            {lines.map((l, i) => (
              <div className="line" role="row" key={i}>
                <input className="input" aria-label={`תיאור שורה ${i + 1}`} disabled={locked} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="פריט או שירות" />
                <input className="input num" aria-label="כמות" inputMode="decimal" disabled={locked} value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} />
                <input className="input num" aria-label="מחיר ליחידה" inputMode="decimal" disabled={locked} value={l.unit_price} onChange={(e) => setLine(i, { unit_price: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} />
                <span className="num line-total">{money(Number(l.qty) * Number(l.unit_price), true)}</span>
                {!locked ? <button className="btn btn-ghost btn-icon btn-sm" aria-label={`מחיקת שורה ${i + 1}`} onClick={() => queueSave(lines.filter((_, k) => k !== i))}><Trash2 /></button> : <span />}
              </div>
            ))}
            {!locked && <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => queueSave([...lines, { description: '', qty: 1, unit_price: 0 }])}><Plus />שורה</button>}
          </div>
          <Field label="הערות למסמך"><textarea className="textarea" disabled={locked} defaultValue={doc.notes ?? ''} onBlur={(e) => e.target.value !== (doc.notes ?? '') && meta({ notes: e.target.value || null })} /></Field>
          {locked && <div className="pill ok" style={{ height: 'auto', padding: '8px 12px', whiteSpace: 'normal' }}><CheckCircle2 style={{ width: 14 }} /> מסמך שהופק נעול לעריכה. לתיקון יש להפיק מסמך חדש.</div>}
        </section>

        <article className="paper" aria-label="תצוגה מקדימה">
          <header className="paper-head">
            <div><div className="paper-biz">{business.name}</div><div className="paper-small">{[business.address, business.phone, business.email].filter(Boolean).join(' · ')}</div>{business.tax_id && <div className="paper-small">ע.מ / ח.פ {business.tax_id}</div>}</div>
            <div style={{ textAlign: 'end' }}><div className="paper-kind">{DOC_KIND_LABEL[doc.kind]}</div><div className="paper-small num">{doc.number ? `מס׳ ${doc.number}` : 'טיוטה'} · {dateNum(doc.issue_date)}</div></div>
          </header>
          <div className="paper-to"><span className="paper-small">לכבוד</span><b>{client?.name ?? '—'}</b>{client?.email && <span className="paper-small">{client.email}</span>}</div>
          <table className="paper-table">
            <thead><tr><th>תיאור</th><th>כמות</th><th>מחיר</th><th>סה״כ</th></tr></thead>
            <tbody>{lines.filter((l) => l.description || l.unit_price).map((l, i) => <tr key={i}><td>{l.description || '—'}</td><td>{l.qty}</td><td>{money(l.unit_price, true)}</td><td>{money(Number(l.qty) * Number(l.unit_price), true)}</td></tr>)}</tbody>
          </table>
          <dl className="paper-sum num">
            <dt>סכום לפני מע״מ</dt><dd>{money(t.sub, true)}</dd>
            <dt>מע״מ {Number(doc.vat_rate)}%</dt><dd>{money(t.vat, true)}</dd>
            <dt className="grand">סה״כ לתשלום</dt><dd className="grand">{money(t.total, true)}</dd>
          </dl>
          {doc.notes && <p className="paper-small" style={{ whiteSpace: 'pre-wrap' }}>{doc.notes}</p>}
          <footer className="paper-foot">{doc.status === 'draft' ? 'טיוטה — לא מסמך חשבונאי' : `הופק ב-${dateNum(doc.issued_at)} · Halo`}</footer>
        </article>
      </div>
    </div>
  );
}
