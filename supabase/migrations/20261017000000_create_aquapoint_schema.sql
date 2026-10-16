-- Aquapoint database and RLS foundation. This migration is local SQL only.
begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create table if not exists private.reservation_year_counters (
  reservation_year integer primary key,
  last_value integer not null check (last_value between 1 and 99999)
);
revoke all on table private.reservation_year_counters from public, anon, authenticated;

-- Keep reservation fields required by the existing idempotent booking flow as
-- compatibility columns; the app remains in mock mode during this step.
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique,
  request_fingerprint text,
  reservation_number text not null unique,
  guest_full_name text not null,
  guest_email text not null,
  guest_phone text not null,
  guest_address text not null,
  room_slug text,
  room_name text,
  booking_type text not null default 'overnight',
  check_in date,
  check_out date,
  nights integer,
  adults integer not null,
  children integer not null default 0,
  activities jsonb not null default '[]'::jsonb,
  amenities jsonb not null default '[]'::jsonb,
  payment_method text,
  transaction_reference text,
  special_occasion text,
  special_requests text,
  nightly_rate numeric(12,2),
  estimated_total numeric(12,2),
  terms_accepted boolean not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_adults_check check (adults >= 1),
  constraint reservations_children_check check (children >= 0),
  constraint reservations_nights_check check (nights is null or nights >= 1),
  constraint reservations_nightly_rate_check check (nightly_rate is null or nightly_rate >= 0),
  constraint reservations_estimated_total_check check (estimated_total is null or estimated_total >= 0),
  constraint reservations_terms_accepted_check check (terms_accepted is true),
  constraint reservations_status_check check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  constraint reservations_dates_order check (check_in is null or check_out is null or check_out > check_in),
  constraint reservations_nights_match check (nights is null or check_in is null or check_out is null or nights = check_out - check_in)
);

alter table public.reservations
  add column if not exists request_id uuid,
  add column if not exists request_fingerprint text,
  add column if not exists nightly_rate numeric(12,2);

-- The prior migration used text arrays. Convert their contents without losing
-- existing selections, then standardize their JSONB defaults.
do $$
declare
  column_type text;
begin
  select data_type into column_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'reservations' and column_name = 'activities';
  if column_type is distinct from 'jsonb' then
    alter table public.reservations alter column activities drop default;
    alter table public.reservations alter column activities type jsonb using to_jsonb(activities);
  end if;

  select data_type into column_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'reservations' and column_name = 'amenities';
  if column_type is distinct from 'jsonb' then
    alter table public.reservations alter column amenities drop default;
    alter table public.reservations alter column amenities type jsonb using to_jsonb(amenities);
  end if;
end;
$$;

alter table public.reservations
  alter column activities set default '[]'::jsonb,
  alter column amenities set default '[]'::jsonb,
  alter column room_slug drop not null,
  alter column room_name drop not null,
  alter column check_in drop not null,
  alter column check_out drop not null,
  alter column nights drop not null,
  alter column activities set not null,
  alter column amenities set not null,
  alter column guest_address drop not null;

-- Older records may not have an address. Preserve those rows with an empty
-- unknown value rather than inventing guest data, then enforce the new contract.
update public.reservations set guest_address = '' where guest_address is null;
alter table public.reservations alter column guest_address set not null;
alter table public.reservations drop constraint if exists reservations_booking_type_check;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.reservations'::regclass and conname = 'reservations_nights_check') then
    alter table public.reservations add constraint reservations_nights_check check (nights is null or nights >= 1);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.reservations'::regclass and conname = 'reservations_nightly_rate_check') then
    alter table public.reservations add constraint reservations_nightly_rate_check check (nightly_rate is null or nightly_rate >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.reservations'::regclass and conname = 'reservations_estimated_total_check') then
    alter table public.reservations add constraint reservations_estimated_total_check check (estimated_total is null or estimated_total >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.reservations'::regclass and conname = 'reservations_terms_accepted_check') then
    alter table public.reservations add constraint reservations_terms_accepted_check check (terms_accepted is true);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.reservations'::regclass and conname = 'reservations_status_check') then
    alter table public.reservations add constraint reservations_status_check check (status in ('pending', 'confirmed', 'cancelled', 'completed'));
  end if;
end;
$$;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text,
  description text,
  capacity integer,
  pricing_type text not null,
  nightly_rate numeric(12,2),
  primary_image text,
  gallery jsonb not null default '[]'::jsonb,
  visible boolean not null default true,
  featured boolean not null default false,
  booking_enabled boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_capacity_check check (capacity is null or capacity > 0),
  constraint rooms_pricing_type_check check (pricing_type in ('fixed', 'on_request')),
  constraint rooms_nightly_rate_check check (nightly_rate is null or nightly_rate >= 0),
  constraint rooms_gallery_array_check check (jsonb_typeof(gallery) = 'array')
);

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  visible boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.amenities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  visible boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  media_path text not null,
  alt_text text,
  caption text,
  category text,
  visible boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  policy_type text not null unique,
  title text not null,
  content text not null,
  visible boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint policies_policy_type_check check (policy_type in ('reservation_terms', 'cancellation', 'privacy', 'house_rules'))
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  file_name text not null,
  media_type text not null,
  mime_type text,
  alt_text text,
  file_size bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_file_size_check check (file_size is null or file_size >= 0)
);

create table if not exists public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_profiles_role_check check (role in ('administrator', 'reservation_staff', 'content_manager'))
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Verified inventory and existing local room descriptions only. Image metadata
-- is intentionally left empty until actual media is migrated.
insert into public.rooms (slug, name, capacity, pricing_type, nightly_rate, description, primary_image, display_order)
values
  ('annex-room', 'Annex Room', 2, 'fixed', 5500, 'A simple and comfortable retreat for couples or two guests looking for an easy beach escape with essential resort comfort.', null, 1),
  ('premier-room', 'Premier Room', 3, 'fixed', 6000, 'A polished premier room for small families or friends, balancing resort comfort with a calm tropical atmosphere.', null, 2),
  ('premier-deluxe', 'Premier Deluxe', 4, 'fixed', 7000, 'A spacious upgraded room designed for families and small groups, combining resort comfort with a warm and relaxing atmosphere.', null, 3),
  ('cabin-1', 'Cabin 1', 3, 'fixed', 6000, 'A cozy cabin-style accommodation perfect for couples or small groups looking for a more private and relaxed beach stay.', null, 4),
  ('annex-dorm', 'Annex Dorm', 6, 'fixed', 8000, 'A practical shared accommodation for barkadas, families, and small groups who want to stay together during their beach getaway.', null, 5),
  ('annex-loft-room', 'Annex Loft Room', 8, 'fixed', 10000, 'A roomy loft-style accommodation ideal for larger families and groups looking for flexible sleeping space near the resort experience.', null, 6),
  ('premier-loft-room', 'Premier Loft Room', 10, 'fixed', 12000, 'A premium loft-style accommodation offering additional space and flexible sleeping arrangements for families and groups.', null, 7),
  ('dormitory-room', 'Dormitory Room', 15, 'fixed', 15000, 'A spacious group accommodation designed for retreats, barkadas, student groups, family gatherings, and team outings.', null, 8),
  ('aquapoint-luxury-villa', 'Aquapoint Luxury Villa', null, 'on_request', null, 'A spacious private retreat designed for families, celebrations, and group escapes, offering generous sleeping space and the comfort of a private resort stay.', null, 9)
on conflict (slug) do update set
  name = excluded.name,
  capacity = excluded.capacity,
  pricing_type = excluded.pricing_type,
  nightly_rate = excluded.nightly_rate,
  description = excluded.description,
  primary_image = excluded.primary_image,
  display_order = excluded.display_order;

insert into public.experiences (name, display_order)
values
  ('Swimming', 1),
  ('Kayaking', 2),
  ('Snorkeling', 3),
  ('Beach Volleyball', 4),
  ('Relaxing at the Beach', 5)
on conflict (name) do update set display_order = excluded.display_order;

insert into public.amenities (name, display_order)
values
  ('Swimming Pool', 1),
  ('Beach Cottage', 2),
  ('Shower Room', 3),
  ('Picnic Area', 4),
  ('Resort Restaurant', 5)
on conflict (name) do update set display_order = excluded.display_order;

create or replace function private.next_aqp_reservation_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  year_value integer := extract(year from (now() at time zone 'Asia/Manila'))::integer;
  next_value integer;
begin
  insert into private.reservation_year_counters (reservation_year, last_value)
  values (year_value, 1)
  on conflict (reservation_year) do update
    set last_value = private.reservation_year_counters.last_value + 1
  returning last_value into next_value;
  if next_value > 99999 then
    raise exception 'Annual reservation number space exhausted';
  end if;
  return 'AQP-' || year_value::text || '-' || lpad(next_value::text, 5, '0');
end;
$$;

create or replace function private.reservations_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.reservation_number := private.next_aqp_reservation_number();
  new.status := 'pending';
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.next_aqp_reservation_number() from public, anon, authenticated;
revoke execute on function private.reservations_before_insert() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists reservations_before_insert_trigger on public.reservations;
create trigger reservations_before_insert_trigger
before insert on public.reservations
for each row execute function private.reservations_before_insert();

do $$
declare
  table_name text;
begin
  foreach table_name in array array['reservations', 'rooms', 'experiences', 'amenities', 'gallery_items', 'site_settings', 'policies', 'media', 'staff_profiles'] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', table_name || '_set_updated_at', table_name);
  end loop;
end;
$$;

create index if not exists reservations_status_idx on public.reservations (status);
create index if not exists reservations_check_in_idx on public.reservations (check_in);
create index if not exists reservations_check_out_idx on public.reservations (check_out);
create index if not exists reservations_created_at_idx on public.reservations (created_at desc);
create index if not exists reservations_room_slug_idx on public.reservations (room_slug);
create index if not exists reservations_guest_email_idx on public.reservations (guest_email);

create index if not exists rooms_visible_display_order_idx on public.rooms (visible, display_order);
create index if not exists rooms_featured_idx on public.rooms (featured);
create index if not exists experiences_visible_display_order_idx on public.experiences (visible, display_order);
create index if not exists amenities_visible_display_order_idx on public.amenities (visible, display_order);
create index if not exists gallery_items_visible_display_order_idx on public.gallery_items (visible, display_order);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_user_id_idx on public.audit_logs (actor_user_id);

alter table public.reservations enable row level security;
alter table public.rooms enable row level security;
alter table public.experiences enable row level security;
alter table public.amenities enable row level security;
alter table public.gallery_items enable row level security;
alter table public.site_settings enable row level security;
alter table public.policies enable row level security;
alter table public.media enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.audit_logs enable row level security;

revoke all on table public.reservations, public.rooms, public.experiences, public.amenities,
  public.gallery_items, public.site_settings, public.policies, public.media,
  public.staff_profiles, public.audit_logs from public, anon, authenticated;
grant select, insert, update, delete on table public.reservations, public.rooms, public.experiences, public.amenities,
  public.gallery_items, public.site_settings, public.policies, public.media,
  public.staff_profiles, public.audit_logs to service_role;

comment on table public.reservations is 'Contains private guest and reservation information. The Supabase service_role bypasses RLS; privileged keys must remain server-only, and public/authenticated client roles have no access.';
comment on column public.reservations.room_name is 'Historical room-name snapshot captured for this reservation.';
comment on column public.reservations.nightly_rate is 'Trusted server/database price snapshot; never recalculate historical reservations from current room prices.';
comment on column public.reservations.estimated_total is 'Historical total snapshot; never recalculate it from current room prices.';
comment on column public.rooms.nightly_rate is 'Only trusted server/database values may be used to price reservations; NULL is valid for on-request rooms.';
comment on table public.staff_profiles is 'Staff profile preparation only; rows must correspond to auth.users and no staff accounts are seeded.';
comment on table public.audit_logs is 'Admin audit metadata only. Never store passwords, access tokens, or secret credentials.';
comment on table public.media is 'Media metadata only; no Storage bucket or file object is created by this migration.';

commit;