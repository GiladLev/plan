-- Business logic RPCs. Tenant-scoped work runs as SECURITY INVOKER (RLS still applies);
-- the two operations that must bypass RLS live in app_private and are reached through thin public wrappers.

-- Demo data so a new workspace is useful on first open (Hebrew sample content, dates relative to today)
create or replace function app_private.seed_demo(b uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid; c6 uuid; c7 uuid;
  e1 uuid; m1 uuid; d1 uuid; t uuid; i int;
  first_names text[] := array['נועה','איתי','מאיה','יואב','שירה','דניאל','תמר','עומר','ליה','אורי','רוני','גיל','הדר','עידו','אביגיל','נדב','יעל','אלון','מיכל','רועי'];
  last_names text[] := array['כהן','לוי','מזרחי','פרץ','ביטון','אברהם','פרידמן','דהן','אזולאי','שפירא'];
  groups text[] := array['משפחת הכלה','משפחת החתן','חברים מהצבא','עבודה','חברי ילדות'];
begin
  insert into public.clients (business_id, name, partner_name, phone, email, event_type, event_date, guests, source, stage, stage_position, value, notes) values
    (b, 'נועה ואיתי לוי', 'איתי', '052-4412233', 'noa.itai@example.com', 'wedding', current_date + 96, 380, 'דף מותג', 'inquiry', 1, 142000, 'מחפשים תאריך בספטמבר, מעדיפים גן')
    returning id into c1;
  insert into public.clients (business_id, name, partner_name, phone, event_type, event_date, guests, source, stage, stage_position, value) values
    (b, 'משפחת אזולאי — בר מצווה', null, '054-7781200', 'bar_mitzvah', current_date + 41, 220, 'המלצה', 'inquiry', 2, 68000) returning id into c2;
  insert into public.clients (business_id, name, partner_name, phone, email, event_type, event_date, guests, source, stage, stage_position, value) values
    (b, 'מאיה ויואב פרידמן', 'יואב', '050-3321987', 'maya.f@example.com', 'wedding', current_date + 152, 450, 'אינסטגרם', 'meeting', 1, 171000) returning id into c3;
  insert into public.clients (business_id, name, phone, event_type, event_date, guests, source, stage, stage_position, value) values
    (b, 'טכנולוגיות אורה — ערב חברה', '03-6120044', 'corporate', current_date + 23, 160, 'אתר', 'proposal', 1, 54000) returning id into c4;
  insert into public.clients (business_id, name, partner_name, phone, event_type, event_date, guests, source, stage, stage_position, value) values
    (b, 'שירה ודניאל כהן', 'דניאל', '052-9001122', 'wedding', current_date + 12, 320, 'דף מותג', 'won', 1, 128000) returning id into c5;
  insert into public.clients (business_id, name, phone, event_type, event_date, guests, source, stage, stage_position, value) values
    (b, 'בת המצווה של ליה', '058-6653210', 'bat_mitzvah', current_date + 64, 140, 'המלצה', 'proposal', 2, 41000) returning id into c6;
  insert into public.clients (business_id, name, partner_name, phone, event_type, event_date, guests, source, stage, stage_position, value, notes) values
    (b, 'תמר ועומר דהן', 'עומר', '053-2207744', 'wedding', current_date + 210, 280, 'יריד חתונות', 'lost', 1, 99000, 'בחרו מתחם קרוב יותר לצפון') returning id into c7;

  insert into public.activities (business_id, client_id, kind, body, created_at) values
    (b, c1, 'created', 'פנייה חדשה מדף המותג', now() - interval '2 hours'),
    (b, c3, 'created', 'פנייה מאינסטגרם', now() - interval '6 days'),
    (b, c3, 'call', 'שיחת היכרות — מתעניינים בחבילת פרימיום', now() - interval '5 days'),
    (b, c3, 'meeting', 'נקבעה פגישת טעימות', now() - interval '4 days'),
    (b, c4, 'email', 'נשלחה הצעת מחיר ראשונית', now() - interval '2 days'),
    (b, c5, 'stage', 'העסקה נסגרה 🎉', now() - interval '20 days'),
    (b, c5, 'document', 'הופקה הזמנה מס׳ 1', now() - interval '19 days'),
    (b, c5, 'whatsapp', 'נשלחה תזכורת לפגישת סידורי הושבה', now() - interval '1 day'),
    (b, c2, 'sms', 'תודה על הפנייה! נחזור אליכם עוד היום', now() - interval '1 day');

  insert into public.meetings (business_id, client_id, title, kind, starts_at, ends_at, location) values
    (b, c3, 'טעימות — מאיה ויואב', 'tasting', date_trunc('day', now()) + interval '1 day 18 hours', date_trunc('day', now()) + interval '1 day 19 hours 30 minutes', 'אולם הגפן'),
    (b, c1, 'פגישת היכרות — נועה ואיתי', 'meeting', date_trunc('day', now()) + interval '14 hours', date_trunc('day', now()) + interval '15 hours', 'משרד'),
    (b, c5, 'סידורי הושבה סופיים', 'meeting', date_trunc('day', now()) + interval '3 days 11 hours', date_trunc('day', now()) + interval '3 days 12 hours', 'משרד'),
    (b, c4, 'סיור במתחם — אורה', 'site_visit', date_trunc('day', now()) + interval '2 days 10 hours', date_trunc('day', now()) + interval '2 days 11 hours', 'גן האירועים');

  insert into public.tasks (business_id, client_id, title, category, due_at, priority) values
    (b, c1, 'לחזור לנועה עם תאריכים פנויים בספטמבר', 'client', now() + interval '3 hours', 2),
    (b, c4, 'לעדכן הצעת מחיר עם בר פתוח', 'client', now() + interval '1 day', 1),
    (b, c6, 'לשלוח תפריט צמחוני לדוגמה', 'client', now() + interval '2 days', 1),
    (b, null, 'בדיקה תקופתית לגנרטור', 'operations', now() + interval '4 days', 1),
    (b, null, 'הזמנת מפות לבנות ל-40 שולחנות', 'operations', now() - interval '1 day', 2);

  insert into public.events (business_id, client_id, title, event_date, hall, guests_expected) values
    (b, c5, 'החתונה של שירה ודניאל', current_date + 12, 'אולם הגפן', 320) returning id into e1;

  insert into public.menus (business_id, event_id, name) values (b, e1, 'תפריט חתונה — עונת סתיו') returning id into m1;
  insert into public.dishes (business_id, menu_id, name, course, tags, notes, position) values
    (b, m1, 'בר סושי חי', 'reception', '{ללא גלוטן}', 'דגים טריים מהבוקר', 1),
    (b, m1, 'פוקצ׳ות מהטאבון', 'reception', '{טבעוני}', null, 2),
    (b, m1, 'קרפצ׳ו סלק וחזרת', 'first', '{טבעוני,ללא גלוטן}', null, 1),
    (b, m1, 'פילה דג לבן על ריזוטו', 'first', '{}', 'אלרגנים: חלב', 2),
    (b, m1, 'אסאדו בבישול ארוך', 'main', '{ללא גלוטן}', '12 שעות בעישון', 1),
    (b, m1, 'עוף צלוי בעשבי תיבול', 'main', '{}', null, 2),
    (b, m1, 'ניוקי בטטה ופטריות יער', 'main', '{טבעוני}', null, 3),
    (b, m1, 'פבלובה פירות יער', 'dessert', '{ללא גלוטן}', null, 1),
    (b, m1, 'קוקטייל הבית — הדר וטימין', 'bar', '{}', null, 1);

  for i in 1..30 loop
    insert into public.seating_tables (business_id, event_id, label, capacity, shape, x, y)
    values (b, e1, i::text, case when i in (1,2) then 14 else 12 end, case when i in (1,2) then 'knight' else 'round' end,
            120 + ((i - 1) % 6) * 150, 140 + ((i - 1) / 6) * 150);
  end loop;
  for i in 1..96 loop
    select id into t from public.seating_tables where event_id = e1 and label = (((i - 1) / 4) % 26 + 3)::text;
    insert into public.guests (business_id, event_id, name, party_size, phone, group_name, meal, table_id)
    values (b, e1, first_names[1 + (i * 7) % 20] || ' ' || last_names[1 + (i * 3) % 10], 1 + (i % 3), '05' || (2 + i % 7) || '-' || lpad(((i * 7919) % 10000000)::text, 7, '0'),
            groups[1 + i % 5], case when i % 9 = 0 then 'טבעוני' when i % 13 = 0 then 'ללא גלוטן' else null end,
            case when i <= 70 then t else null end);
  end loop;

  insert into public.documents (business_id, client_id, kind, number, status, issue_date, vat_rate, subtotal, vat, total, issued_at, sent_at)
    values (b, c5, 'order', 1, 'sent', current_date - 19, 18, 108474.58, 19525.42, 128000, now() - interval '19 days', now() - interval '19 days') returning id into d1;
  insert into public.document_lines (document_id, business_id, position, description, qty, unit_price) values
    (d1, b, 1, 'חבילת אירוע פרימיום — 320 אורחים כולל בר פתוח', 1, 108474.58);
  insert into public.document_counters (business_id, kind, last_number) values (b, 'order', 1);
end $$;
revoke all on function app_private.seed_demo(uuid) from public;

create or replace function app_private.create_business(p_name text, p_display_name text, p_kind text, p_with_demo boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); b uuid;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'business name required' using errcode = '22023'; end if;
  insert into public.businesses (name, kind) values (trim(p_name), coalesce(p_kind, 'venue')) returning id into b;
  insert into public.members (business_id, user_id, role, display_name) values (b, uid, 'owner', nullif(trim(p_display_name), ''));
  if p_with_demo then perform app_private.seed_demo(b); end if;
  return b;
end $$;
revoke all on function app_private.create_business(text, text, text, boolean) from public;
grant execute on function app_private.create_business(text, text, text, boolean) to authenticated;

create or replace function public.create_business(p_name text, p_display_name text default null, p_kind text default 'venue', p_with_demo boolean default true)
returns uuid language sql security invoker set search_path = '' as $$
  select app_private.create_business(p_name, p_display_name, p_kind, p_with_demo);
$$;
revoke all on function public.create_business(text, text, text, boolean) from public;
grant execute on function public.create_business(text, text, text, boolean) to authenticated;

-- Issue a draft document: assigns the next number per (business, kind) and freezes totals. Idempotent per key.
create or replace function public.issue_document(p_document uuid, p_key uuid)
returns public.documents language plpgsql security invoker set search_path = '' as $$
declare d public.documents; n integer; sub numeric(12,2);
begin
  select * into d from public.documents where id = p_document for update;
  if not found then raise exception 'document not found' using errcode = 'P0002'; end if;
  if d.status <> 'draft' then return d; end if; -- already issued: replay returns the same row
  if exists (select 1 from public.documents where idempotency_key = p_key and id <> p_document) then
    raise exception 'idempotency key reused' using errcode = '23505';
  end if;
  insert into public.document_counters (business_id, kind, last_number) values (d.business_id, d.kind, 1)
    on conflict (business_id, kind) do update set last_number = public.document_counters.last_number + 1
    returning last_number into n;
  select coalesce(sum(round(qty * unit_price, 2)), 0) into sub from public.document_lines where document_id = p_document;
  update public.documents set number = n, status = 'issued', issued_at = now(), idempotency_key = p_key,
    subtotal = sub, vat = round(sub * vat_rate / 100, 2), total = sub + round(sub * vat_rate / 100, 2)
    where id = p_document returning * into d;
  insert into public.activities (business_id, client_id, kind, body, meta, created_by)
    values (d.business_id, d.client_id, 'document', null, jsonb_build_object('document_id', d.id, 'kind', d.kind, 'number', n, 'total', d.total), (select auth.uid()));
  return d;
end $$;
revoke all on function public.issue_document(uuid, uuid) from public;
grant execute on function public.issue_document(uuid, uuid) to authenticated;

-- Seat a guest (or unseat with null). Locks the table row so concurrent assignments can never exceed capacity.
create or replace function public.assign_guest(p_guest uuid, p_table uuid)
returns public.guests language plpgsql security invoker set search_path = '' as $$
declare g public.guests; cap integer; used integer;
begin
  select * into g from public.guests where id = p_guest for update;
  if not found then raise exception 'guest not found' using errcode = 'P0002'; end if;
  if p_table is not null then
    select capacity into cap from public.seating_tables where id = p_table and event_id = g.event_id for update;
    if not found then raise exception 'table not found' using errcode = 'P0002'; end if;
    select coalesce(sum(party_size), 0) into used from public.guests where table_id = p_table and id <> p_guest;
    if used + g.party_size > cap then raise exception 'TABLE_FULL' using errcode = 'P0001', detail = format('%s/%s', used, cap); end if;
  end if;
  update public.guests set table_id = p_table where id = p_guest returning * into g;
  return g;
end $$;
revoke all on function public.assign_guest(uuid, uuid) from public;
grant execute on function public.assign_guest(uuid, uuid) to authenticated;

-- Kiosk check-in, replayable from an offline queue: one row per operation id, first arrival time wins.
create or replace function public.check_in(p_op uuid, p_guest uuid, p_at timestamptz, p_kiosk text default null)
returns public.guests language plpgsql security invoker set search_path = '' as $$
declare g public.guests;
begin
  select * into g from public.guests where id = p_guest;
  if not found then raise exception 'guest not found' using errcode = 'P0002'; end if;
  insert into public.checkins (op_id, business_id, guest_id, kiosk, happened_at) values (p_op, g.business_id, p_guest, p_kiosk, p_at)
    on conflict (op_id) do nothing;
  update public.guests set checked_in_at = least(coalesce(checked_in_at, p_at), p_at) where id = p_guest returning * into g;
  return g;
end $$;
revoke all on function public.check_in(uuid, uuid, timestamptz, text) from public;
grant execute on function public.check_in(uuid, uuid, timestamptz, text) to authenticated;

-- Calendar subscription feed (phones fetch it without a session): token-gated, read-only.
create or replace function app_private.ics_feed(p_token text)
returns table (id uuid, title text, starts_at timestamptz, ends_at timestamptz, location text, notes text, business_name text)
language sql stable security definer set search_path = '' as $$
  select m.id, m.title, m.starts_at, m.ends_at, m.location, m.notes, bz.name
  from public.businesses bz join public.meetings m on m.business_id = bz.id
  where bz.ics_token = p_token and length(p_token) >= 32 and m.starts_at > now() - interval '60 days'
  order by m.starts_at;
$$;
revoke all on function app_private.ics_feed(text) from public;
grant usage on schema app_private to anon;
grant execute on function app_private.ics_feed(text) to anon, authenticated;
create or replace function public.ics_feed(p_token text)
returns table (id uuid, title text, starts_at timestamptz, ends_at timestamptz, location text, notes text, business_name text)
language sql stable security invoker set search_path = '' as $$ select * from app_private.ics_feed(p_token); $$;
revoke all on function public.ics_feed(text) from public;
grant execute on function public.ics_feed(text) to anon, authenticated;
