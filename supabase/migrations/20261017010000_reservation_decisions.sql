begin;

alter table public.reservations
  add column if not exists guest_country text,
  add column if not exists decision_at timestamptz,
  add column if not exists decision_by uuid references auth.users(id) on delete set null,
  add column if not exists decision_email_status text,
  add column if not exists decision_email_sent_at timestamptz,
  add column if not exists decision_email_error text,
  add column if not exists decision_email_claim uuid,
  add column if not exists decision_email_claimed_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.reservations'::regclass and conname = 'reservations_decision_email_status_check') then
    alter table public.reservations add constraint reservations_decision_email_status_check
      check (decision_email_status is null or decision_email_status in ('pending','processing','sent','failed'));
  end if;
end $$;

-- The original check excludes not_available. Preserve existing statuses and rows.
alter table public.reservations drop constraint if exists reservations_status_check;
alter table public.reservations add constraint reservations_status_check
  check (status in ('pending','confirmed','not_available','cancelled','completed'));

create index if not exists reservations_status_created_at_idx on public.reservations (status, created_at desc);

create or replace function private.can_review_reservations()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_profiles
    where id = (select auth.uid()) and active is true
      and role in ('administrator','reservation_staff')
  );
$$;
revoke all on function private.can_review_reservations() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.can_review_reservations() to authenticated;

-- The auth controller needs to see only its own staff profile.
grant select on public.staff_profiles to authenticated;
drop policy if exists staff_profiles_read_self on public.staff_profiles;
create policy staff_profiles_read_self on public.staff_profiles for select to authenticated
  using (id = (select auth.uid()));

-- The public booking Edge Function and decision/email functions use server-side
-- credentials. No browser path needs direct INSERT, UPDATE, or DELETE.
-- Remove the legacy administrator policies as well as the table privileges:
-- an old permissive SELECT policy would otherwise bypass the active-role check.
drop policy if exists "Administrators can create reservations" on public.reservations;
drop policy if exists "Administrators can delete reservations" on public.reservations;
drop policy if exists "Administrators can update reservations" on public.reservations;
drop policy if exists "Administrators can view reservations" on public.reservations;
revoke insert, update, delete on public.reservations from public, anon, authenticated;

grant select on public.reservations to authenticated;
drop policy if exists reservations_staff_read on public.reservations;
create policy reservations_staff_read on public.reservations for select to authenticated
  using ((select private.can_review_reservations()));

-- No browser UPDATE grant: the only decision path is this atomic, checked RPC.
create or replace function public.decide_reservation(p_reservation_id uuid, p_decision text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_row public.reservations%rowtype;
begin
  if not private.can_review_reservations() then
    raise exception 'Reservation access denied' using errcode = '42501';
  end if;
  if p_decision not in ('confirmed','not_available') or p_decision is null then
    raise exception 'Invalid reservation decision' using errcode = '22023';
  end if;

  update public.reservations
  set status = p_decision, decision_at = now(), decision_by = auth.uid(),
      decision_email_status = 'pending', decision_email_sent_at = null,
      decision_email_error = null, decision_email_claim = null,
      decision_email_claimed_at = null
  where id = p_reservation_id and status = 'pending'
  returning * into v_row;
  if not found then return 'conflict'; end if;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'reservation_decision', 'reservation', v_row.id::text,
    pg_catalog.jsonb_build_object('reservation_number', v_row.reservation_number,
      'previous_status', 'pending', 'new_status', p_decision));
  return 'updated';
end;
$$;
revoke all on function public.decide_reservation(uuid,text) from public, anon;
grant execute on function public.decide_reservation(uuid,text) to authenticated;

-- A claim serializes retries. Email content is fetched from the row by the function.
create or replace function public.claim_reservation_email(p_reservation_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_claim uuid := pg_catalog.gen_random_uuid();
begin
  if not private.can_review_reservations() then
    raise exception 'Reservation access denied' using errcode = '42501';
  end if;
  update public.reservations
  set decision_email_status = 'processing', decision_email_claim = v_claim,
      decision_email_claimed_at = now(), decision_email_error = null
  where id = p_reservation_id and status in ('confirmed','not_available')
    and (decision_email_status in ('pending','failed') or
      (decision_email_status = 'processing' and decision_email_claimed_at < now() - interval '5 minutes'));
  if not found then return null; end if;
  return v_claim;
end;
$$;
revoke all on function public.claim_reservation_email(uuid) from public, anon;
grant execute on function public.claim_reservation_email(uuid) to authenticated;

commit;
