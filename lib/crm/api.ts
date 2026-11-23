'use client';
// Typed data layer. Every call is scoped by RLS; business_id is passed explicitly for inserts.
import { supabase } from './supabase';
import type { Activity, Client, CrmEvent, Dish, Doc, DocLine, Guest, Meeting, Menu, SeatTable, Stage, Task } from './types';

const db = () => supabase();
function ok<T>(r: { data: T | null; error: { message: string; code?: string; details?: string } | null }): T {
  if (r.error) { const e = new Error(r.error.message) as Error & { code?: string; details?: string }; e.code = r.error.code; e.details = r.error.details; throw e; }
  return r.data as T;
}

// clients & pipeline
export const listClients = async (bid: string) => ok(await db().from('clients').select('*').eq('business_id', bid).order('stage_position')) as Client[];
export const getClient = async (id: string) => ok(await db().from('clients').select('*').eq('id', id).single()) as Client;
export async function createClient(bid: string, v: Partial<Client> & { name: string }) {
  const c = ok(await db().from('clients').insert({ ...v, business_id: bid, stage_position: Date.now() / 1e9 }).select().single()) as Client;
  await addActivity(bid, c.id, 'created', 'לקוח נוסף ידנית');
  return c;
}
export const updateClient = async (id: string, v: Partial<Client>) => ok(await db().from('clients').update(v).eq('id', id).select().single()) as Client;
export async function moveClient(c: Client, stage: Stage, position: number) {
  const updated = await updateClient(c.id, { stage, stage_position: position });
  if (c.stage !== stage) await addActivity(c.business_id, c.id, 'stage', null, { from: c.stage, to: stage });
  return updated;
}

// activities
export const listActivities = async (clientId: string) => ok(await db().from('activities').select('*').eq('client_id', clientId).order('created_at', { ascending: false })) as Activity[];
export const recentActivities = async (bid: string, limit = 12) => ok(await db().from('activities').select('*, clients(name)').eq('business_id', bid).order('created_at', { ascending: false }).limit(limit)) as (Activity & { clients: { name: string } | null })[];
export async function addActivity(bid: string, clientId: string | null, kind: string, body: string | null, meta: Record<string, unknown> = {}) {
  const { data: u } = await db().auth.getUser();
  return ok(await db().from('activities').insert({ business_id: bid, client_id: clientId, kind, body, meta: meta as never, created_by: u.user?.id ?? null }).select().single()) as Activity;
}

// tasks
export const listTasks = async (bid: string) => ok(await db().from('tasks').select('*, clients(name)').eq('business_id', bid).order('done').order('due_at', { ascending: true, nullsFirst: false })) as (Task & { clients: { name: string } | null })[];
export const createTask = async (bid: string, v: Partial<Task> & { title: string }) => ok(await db().from('tasks').insert({ ...v, business_id: bid }).select().single()) as Task;
export const setTaskDone = async (id: string, done: boolean) => ok(await db().from('tasks').update({ done, done_at: done ? new Date().toISOString() : null }).eq('id', id).select().single()) as Task;
export const deleteTask = async (id: string) => ok(await db().from('tasks').delete().eq('id', id));

// meetings
export const listMeetings = async (bid: string, from: Date, to: Date) => ok(await db().from('meetings').select('*, clients(name, phone)').eq('business_id', bid).gte('starts_at', from.toISOString()).lt('starts_at', to.toISOString()).order('starts_at')) as (Meeting & { clients: { name: string; phone: string | null } | null })[];
export async function createMeeting(bid: string, v: Partial<Meeting> & { title: string; starts_at: string; ends_at: string }) {
  const m = ok(await db().from('meetings').insert({ ...v, business_id: bid }).select().single()) as Meeting;
  if (m.client_id) await addActivity(bid, m.client_id, 'meeting', m.title, { meeting_id: m.id, starts_at: m.starts_at });
  return m;
}
export const updateMeeting = async (id: string, v: Partial<Meeting>) => ok(await db().from('meetings').update(v).eq('id', id).select().single()) as Meeting;
export const deleteMeeting = async (id: string) => ok(await db().from('meetings').delete().eq('id', id));

// documents
export const listDocuments = async (bid: string) => ok(await db().from('documents').select('*, clients(name)').eq('business_id', bid).order('created_at', { ascending: false })) as (Doc & { clients: { name: string } | null })[];
export const getDocument = async (id: string) => ok(await db().from('documents').select('*, clients(*), document_lines(*)').eq('id', id).order('position', { referencedTable: 'document_lines' }).single()) as Doc & { clients: Client | null; document_lines: DocLine[] };
export async function createDocument(bid: string, kind: string, clientId: string | null, vat: number) {
  const d = ok(await db().from('documents').insert({ business_id: bid, kind, client_id: clientId, vat_rate: vat }).select().single()) as Doc;
  await db().from('document_lines').insert({ business_id: bid, document_id: d.id, position: 1, description: '', qty: 1, unit_price: 0 });
  return d;
}
export const updateDocument = async (id: string, v: Partial<Doc>) => ok(await db().from('documents').update(v).eq('id', id).select().single()) as Doc;
export async function saveLines(bid: string, docId: string, lines: Pick<DocLine, 'description' | 'qty' | 'unit_price'>[]) {
  ok(await db().from('document_lines').delete().eq('document_id', docId));
  if (lines.length) ok(await db().from('document_lines').insert(lines.map((l, i) => ({ ...l, business_id: bid, document_id: docId, position: i + 1 }))));
}
export const issueDocument = async (id: string, key: string) => ok(await db().rpc('issue_document', { p_document: id, p_key: key })) as Doc;
export async function markSent(d: Doc, channel: 'email' | 'whatsapp') {
  const u = await updateDocument(d.id, { status: 'sent', sent_at: new Date().toISOString() });
  await addActivity(d.business_id, d.client_id, channel, null, { document_id: d.id, kind: d.kind, number: d.number, sent: true });
  return u;
}
export const deleteDocument = async (id: string) => ok(await db().from('documents').delete().eq('id', id));

// events, menus, seating
export const listEvents = async (bid: string) => ok(await db().from('events').select('*, clients(name)').eq('business_id', bid).order('event_date')) as (CrmEvent & { clients: { name: string } | null })[];
export const getEvent = async (id: string) => ok(await db().from('events').select('*, clients(*)').eq('id', id).single()) as CrmEvent & { clients: Client | null };
export const createEvent = async (bid: string, v: Partial<CrmEvent> & { title: string; event_date: string }) => ok(await db().from('events').insert({ ...v, business_id: bid }).select().single()) as CrmEvent;
export const listMenus = async (eventId: string) => ok(await db().from('menus').select('*, dishes(*)').eq('event_id', eventId).order('position', { referencedTable: 'dishes' })) as (Menu & { dishes: Dish[] })[];
export const createMenu = async (bid: string, eventId: string, name: string) => ok(await db().from('menus').insert({ business_id: bid, event_id: eventId, name }).select().single()) as Menu;
export const upsertDish = async (bid: string, d: Partial<Dish> & { menu_id: string; name: string }) => ok(await db().from('dishes').upsert({ ...d, business_id: bid }).select().single()) as Dish;
export const deleteDish = async (id: string) => ok(await db().from('dishes').delete().eq('id', id));
export const listTables = async (eventId: string) => ok(await db().from('seating_tables').select('*').eq('event_id', eventId)) as SeatTable[];
export const updateTable = async (id: string, v: Partial<SeatTable>) => ok(await db().from('seating_tables').update(v).eq('id', id).select().single()) as SeatTable;
export const createTable = async (bid: string, v: Partial<SeatTable> & { event_id: string; label: string; capacity: number }) => ok(await db().from('seating_tables').insert({ ...v, business_id: bid }).select().single()) as SeatTable;
export const listGuests = async (eventId: string) => ok(await db().from('guests').select('*').eq('event_id', eventId).order('name')) as Guest[];
export const assignGuest = async (guestId: string, tableId: string | null) => ok(await db().rpc('assign_guest', { p_guest: guestId, p_table: tableId as string })) as Guest;
export const checkIn = async (op: string, guestId: string, at: string, kiosk: string) => ok(await db().rpc('check_in', { p_op: op, p_guest: guestId, p_at: at, p_kiosk: kiosk })) as Guest;
