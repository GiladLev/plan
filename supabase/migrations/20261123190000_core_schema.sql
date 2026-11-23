-- Halo CRM: multi-tenant core schema. Every row belongs to a business; access is granted through membership.


create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  kind text not null default 'venue' check (kind in ('venue','catering','photo','music','design','production','other')),
  phone text, email text, address text, tax_id text,
  vat_rate numeric(5,2) not null default 18,
  currency text not null default 'ILS',
  ics_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

create table public.members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','staff','kiosk')),
  display_name text,
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index members_user_idx on public.members(user_id);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  partner_name text, phone text, email text,
  event_type text not null default 'wedding' check (event_type in ('wedding','bar_mitzvah','bat_mitzvah','brit','birthday','corporate','other')),
  event_date date, guests integer check (guests is null or guests >= 0),
  source text, notes text,
  stage text not null default 'inquiry' check (stage in ('inquiry','meeting','proposal','won','lost')),
  stage_position double precision not null default 0,
  value numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_business_stage_idx on public.clients(business_id, stage, stage_position);
create index clients_business_date_idx on public.clients(business_id, event_date);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  kind text not null check (kind in ('note','call','sms','email','whatsapp','meeting','document','stage','task','created')),
  body text,
  meta jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index activities_client_idx on public.activities(client_id, created_at desc);
create index activities_business_idx on public.activities(business_id, created_at desc);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  event_date date not null,
  hall text,
  guests_expected integer,
  status text not null default 'planned' check (status in ('planned','live','done','cancelled')),
  created_at timestamptz not null default now()
);
create index events_business_date_idx on public.events(business_id, event_date);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  title text not null,
  category text not null default 'client' check (category in ('client','operations')),
  due_at timestamptz,
  priority smallint not null default 1 check (priority between 0 and 2),
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index tasks_business_open_idx on public.tasks(business_id, done, due_at);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  kind text not null default 'meeting' check (kind in ('meeting','tasting','site_visit','call')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text, notes text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index meetings_business_time_idx on public.meetings(business_id, starts_at);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  kind text not null check (kind in ('quote','order','receipt','invoice')),
  number integer,
  status text not null default 'draft' check (status in ('draft','issued','sent','void')),
  issue_date date not null default current_date,
  due_date date,
  notes text,
  vat_rate numeric(5,2) not null default 18,
  subtotal numeric(12,2) not null default 0,
  vat numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  idempotency_key uuid unique,
  issued_at timestamptz, sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, kind, number)
);
create index documents_business_idx on public.documents(business_id, created_at desc);

create table public.document_lines (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  position integer not null default 0,
  description text not null default '',
  qty numeric(12,2) not null default 1 check (qty >= 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0)
);
create index document_lines_doc_idx on public.document_lines(document_id, position);

create table public.document_counters (
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null,
  last_number integer not null default 0,
  primary key (business_id, kind)
);

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now()
);
create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  menu_id uuid not null references public.menus(id) on delete cascade,
  name text not null,
  course text not null default 'main' check (course in ('reception','first','main','dessert','bar')),
  tags text[] not null default '{}',
  notes text,
  position integer not null default 0
);
create index dishes_menu_idx on public.dishes(menu_id, course, position);

create table public.seating_tables (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  label text not null,
  capacity integer not null check (capacity between 1 and 40),
  shape text not null default 'round' check (shape in ('round','rect','knight')),
  x double precision not null default 0,
  y double precision not null default 0
);
create index seating_tables_event_idx on public.seating_tables(event_id);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  party_size integer not null default 1 check (party_size between 1 and 20),
  phone text, group_name text, meal text,
  table_id uuid references public.seating_tables(id) on delete set null,
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);
create index guests_event_idx on public.guests(event_id, name);
create index guests_table_idx on public.guests(table_id);

create table public.checkins (
  op_id uuid primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  kiosk text,
  happened_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- membership check used by every policy; lives in a non-exposed schema (security definer avoids RLS recursion on members)
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;
create or replace function app_private.is_member(b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.business_id = b and m.user_id = (select auth.uid()));
$$;
revoke all on function app_private.is_member(uuid) from public;
grant execute on function app_private.is_member(uuid) to authenticated;

-- foreign-key indexes not covered above
create index tasks_client_idx on public.tasks(client_id);
create index tasks_event_idx on public.tasks(event_id);
create index meetings_client_idx on public.meetings(client_id);
create index documents_client_idx on public.documents(client_id);
create index document_lines_business_idx on public.document_lines(business_id);
create index events_client_idx on public.events(client_id);
create index menus_business_idx on public.menus(business_id);
create index menus_event_idx on public.menus(event_id);
create index dishes_business_idx on public.dishes(business_id);
create index seating_tables_business_idx on public.seating_tables(business_id);
create index guests_business_idx on public.guests(business_id);
create index checkins_guest_idx on public.checkins(guest_id);
create index checkins_business_idx on public.checkins(business_id);
create index activities_created_by_idx on public.activities(created_by);
create index tasks_business_idx on public.tasks(business_id);

alter table public.businesses enable row level security;
alter table public.members enable row level security;
create policy businesses_rw on public.businesses for all to authenticated using (app_private.is_member(id)) with check (app_private.is_member(id));
create policy members_read on public.members for select to authenticated using (user_id = (select auth.uid()) or app_private.is_member(business_id));

do $$
declare t text;
begin
  foreach t in array array['clients','activities','events','tasks','meetings','documents','document_lines','menus','dishes','seating_tables','guests','checkins','document_counters'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (app_private.is_member(business_id)) with check (app_private.is_member(business_id))', t || '_tenant', t);
  end loop;
end $$;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
create trigger clients_touch before update on public.clients for each row execute function public.touch_updated_at();

alter publication supabase_realtime add table public.guests, public.seating_tables;

-- Data API exposure: signed-in users only (rows are still filtered by RLS); nothing for anon
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
