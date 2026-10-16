-- Aquapoint booking requests. Public clients have no table privileges or RLS policies.
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create table if not exists private.reservation_year_counters (
  reservation_year integer primary key,
  last_value integer not null check (last_value between 1 and 99999)
);
revoke all on private.reservation_year_counters from public, anon, authenticated;

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  reservation_number text not null unique check (reservation_number ~ '^AQP-[0-9]{4}-[0-9]{5}$'),
  guest_full_name text not null check (length(btrim(guest_full_name)) between 2 and 150),
  guest_email text not null check (length(guest_email) between 3 and 254),
  guest_phone text not null check (length(btrim(guest_phone)) between 5 and 40),
  guest_address text,
  room_slug text not null,
  room_name text not null,
  booking_type text not null default 'overnight' check (booking_type = 'overnight'),
  check_in date not null,
  check_out date not null,
  nights integer not null check (nights > 0),
  adults integer not null check (adults >= 1),
  children integer not null default 0 check (children >= 0),
  activities text[] not null default '{}',
  amenities text[] not null default '{}',
  payment_method text,
  transaction_reference text,
  special_occasion text,
  special_requests text,
  estimated_total numeric(12,2) check (estimated_total is null or estimated_total >= 0),
  terms_accepted boolean not null check (terms_accepted = true),
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_dates_order check (check_out > check_in),
  constraint reservations_nights_match check (nights = check_out - check_in)
);

create index if not exists reservations_status_check_in_idx on public.reservations (status, check_in);
create index if not exists reservations_created_at_idx on public.reservations (created_at desc);
create index if not exists reservations_room_slug_idx on public.reservations (room_slug);
-- Unique constraints already index reservation_number and request_id.

create or replace function private.next_aqp_reservation_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  year_value integer := extract(year from now() at time zone 'Asia/Manila')::integer;
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
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.reservations_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists reservations_before_insert_trigger on public.reservations;
create trigger reservations_before_insert_trigger
before insert on public.reservations
for each row execute function private.reservations_before_insert();

drop trigger if exists reservations_updated_at_trigger on public.reservations;
create trigger reservations_updated_at_trigger
before update on public.reservations
for each row execute function private.reservations_set_updated_at();

revoke execute on function private.next_aqp_reservation_number() from public, anon, authenticated;
revoke execute on function private.reservations_before_insert() from public, anon, authenticated;
revoke execute on function private.reservations_set_updated_at() from public, anon, authenticated;

alter table public.reservations enable row level security;
revoke all on public.reservations from public, anon, authenticated;
grant select, insert, update, delete on public.reservations to service_role;
-- Intentionally no anon or authenticated policies. Staff policies belong to the future admin phase.
