create table public.authorized_doctors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_authorized_doctor()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.authorized_doctors
    where user_id = auth.uid()
  );
$$;
revoke all on function public.is_authorized_doctor() from public, anon;
grant execute on function public.is_authorized_doctor() to authenticated;

create table public.clinic_profile (
  singleton boolean primary key default true check (singleton),
  clinic_name text not null default 'Sarthak Clinic' check (length(clinic_name) between 1 and 120),
  doctor_name text not null default '' check (length(doctor_name) <= 120),
  qualification text not null default '' check (length(qualification) <= 200),
  public_introduction text not null default '' check (length(public_introduction) <= 1200),
  doctor_photo_url text,
  private_phone text,
  public_phone text,
  public_whatsapp text,
  updated_at timestamptz not null default now(),
  check (doctor_photo_url is null or doctor_photo_url ~ '^https://'),
  check (public_phone is null or public_phone ~ '^\+91[6-9][0-9]{9}$'),
  check (public_whatsapp is null or public_whatsapp ~ '^\+91[6-9][0-9]{9}$')
);

create table public.clinic_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  public_address text not null check (length(public_address) between 1 and 500),
  directions_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    directions_url is null or
    directions_url ~ '^https://(maps\.google\.com/|www\.google\.com/maps|maps\.app\.goo\.gl/)'
  )
);

create table public.clinic_services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.availability_sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  location_id uuid not null references public.clinic_locations(id) on delete restrict,
  starts_at time not null,
  ends_at time not null,
  capacity integer not null check (capacity between 1 and 500),
  bookings_enabled boolean not null default false,
  is_blocked boolean not null default false,
  public_note text check (length(public_note) <= 300),
  private_note text check (length(private_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  exclude using gist (
    tsrange(session_date + starts_at, session_date + ends_at, '[)') with &&
  ) where (not is_blocked)
);

create table public.blocked_dates (
  blocked_date date primary key,
  reason text check (length(reason) <= 300),
  created_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(full_name) between 1 and 120),
  mobile text not null check (mobile ~ '^\+91[6-9][0-9]{9}$'),
  age integer check (age between 1 and 120),
  private_notes text not null default '' check (length(private_notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index patients_name_search_idx on public.patients (lower(full_name));
create index patients_mobile_idx on public.patients (mobile);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  idempotency_key uuid not null unique,
  session_id uuid not null references public.availability_sessions(id) on delete restrict,
  patient_id uuid references public.patients(id) on delete set null,
  patient_name text not null check (length(patient_name) between 2 and 100),
  mobile text not null check (mobile ~ '^\+91[6-9][0-9]{9}$'),
  preferred_time time,
  age integer check (age between 1 and 120),
  reason text check (length(reason) <= 300),
  privacy_acknowledged boolean not null check (privacy_acknowledged),
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'waiting', 'consulting', 'completed', 'cancelled')),
  needs_contact boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index appointments_session_status_idx on public.appointments (session_id, status);
create index appointments_mobile_created_idx on public.appointments (mobile, created_at desc);
create index appointments_patient_idx on public.appointments (patient_id);

create or replace function public.enforce_appointment_capacity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  session_capacity integer;
  reservations integer;
begin
  if new.status = 'cancelled' then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.session_id::text, 0));
  select capacity into session_capacity
  from public.availability_sessions
  where id = new.session_id
  for update;
  if not found then
    raise exception 'Session does not exist' using errcode = 'P0002';
  end if;
  select count(*) into reservations
  from public.appointments
  where session_id = new.session_id
    and status <> 'cancelled'
    and (tg_op = 'INSERT' or id <> new.id);
  if reservations >= session_capacity then
    raise exception 'Session is full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger appointments_enforce_capacity
before insert or update of session_id, status on public.appointments
for each row execute function public.enforce_appointment_capacity();

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  visit_date date not null,
  notes text not null default '' check (length(notes) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index visits_patient_date_idx on public.visits (patient_id, visit_date desc);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  entry_type text not null
    check (entry_type in ('opening_balance', 'charge', 'payment', 'correction', 'reversal')),
  amount_paise bigint not null check (amount_paise <> 0),
  description text not null check (length(description) between 1 and 240),
  effective_at timestamptz not null,
  idempotency_key uuid not null unique,
  correction_reason text,
  reverses_entry_id uuid unique references public.ledger_entries(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (abs(amount_paise) <= 100000000000),
  check (
    (entry_type in ('opening_balance', 'charge') and amount_paise > 0) or
    (entry_type = 'payment' and amount_paise < 0) or
    (entry_type = 'correction' and correction_reason is not null and length(correction_reason) between 3 and 500) or
    (entry_type = 'reversal' and correction_reason is not null and reverses_entry_id is not null)
  )
);
create index ledger_patient_effective_idx on public.ledger_entries (patient_id, effective_at, created_at);
create index ledger_effective_idx on public.ledger_entries (effective_at desc);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  created_at timestamptz not null default now()
);
create index audit_events_created_idx on public.audit_events (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger clinic_profile_updated_at before update on public.clinic_profile
for each row execute function public.set_updated_at();
create trigger clinic_locations_updated_at before update on public.clinic_locations
for each row execute function public.set_updated_at();
create trigger availability_sessions_updated_at before update on public.availability_sessions
for each row execute function public.set_updated_at();
create trigger patients_updated_at before update on public.patients
for each row execute function public.set_updated_at();
create trigger appointments_updated_at before update on public.appointments
for each row execute function public.set_updated_at();
create trigger visits_updated_at before update on public.visits
for each row execute function public.set_updated_at();

create or replace function public.enforce_session_capacity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  reservations integer;
begin
  select count(*) into reservations
  from public.appointments
  where session_id = old.id and status <> 'cancelled';
  if new.capacity < reservations then
    raise exception 'Capacity cannot be below active reservations' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger availability_capacity_guard
before update of capacity on public.availability_sessions
for each row execute function public.enforce_session_capacity();

create or replace function public.flag_appointments_on_location_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.name is distinct from old.name
    or new.public_address is distinct from old.public_address
    or new.active is distinct from old.active then
    update public.appointments a
    set needs_contact = true
    from public.availability_sessions s
    where s.id = a.session_id
      and s.location_id = new.id
      and a.status <> 'cancelled';
  end if;
  return new;
end;
$$;
create trigger location_changes_flag_appointments
after update on public.clinic_locations
for each row execute function public.flag_appointments_on_location_change();

create or replace function public.update_availability_session(
  p_session_id uuid,
  p_session_date date,
  p_location_id uuid,
  p_starts_at time,
  p_ends_at time,
  p_capacity integer,
  p_bookings_enabled boolean,
  p_is_blocked boolean,
  p_public_note text,
  p_private_note text,
  p_confirm_affected boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_session public.availability_sessions%rowtype;
  reservations integer;
  schedule_changed boolean;
begin
  if not public.is_authorized_doctor() then
    raise exception 'Doctor authorization required' using errcode = '42501';
  end if;
  if p_session_date is null or p_location_id is null or p_starts_at is null
    or p_ends_at is null or p_starts_at >= p_ends_at
    or p_capacity not between 1 and 500
    or length(coalesce(p_public_note, '')) > 300
    or length(coalesce(p_private_note, '')) > 1000 then
    raise exception 'Invalid session details' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_session_id::text, 0));
  select * into current_session
  from public.availability_sessions
  where id = p_session_id
  for update;
  if not found then raise exception 'Session not found' using errcode = 'P0002'; end if;

  select count(*) into reservations
  from public.appointments
  where session_id = p_session_id and status <> 'cancelled';
  schedule_changed :=
    current_session.session_date is distinct from p_session_date
    or current_session.location_id is distinct from p_location_id
    or current_session.starts_at is distinct from p_starts_at
    or current_session.ends_at is distinct from p_ends_at
    or (current_session.bookings_enabled and not p_bookings_enabled)
    or (not current_session.is_blocked and p_is_blocked);

  if reservations > 0 and schedule_changed and p_confirm_affected is not true then
    raise exception 'Affected bookings require confirmation before changing this session' using errcode = 'P0001';
  end if;
  if p_capacity < reservations then
    raise exception 'Capacity cannot be below active reservations' using errcode = 'P0001';
  end if;

  update public.availability_sessions
  set session_date = p_session_date,
      location_id = p_location_id,
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      capacity = p_capacity,
      bookings_enabled = p_bookings_enabled,
      is_blocked = p_is_blocked,
      public_note = nullif(btrim(p_public_note), ''),
      private_note = nullif(btrim(p_private_note), '')
  where id = p_session_id;
end;
$$;
revoke all on function public.update_availability_session(uuid, date, uuid, time, time, integer, boolean, boolean, text, text, boolean) from public, anon;
grant execute on function public.update_availability_session(uuid, date, uuid, time, time, integer, boolean, boolean, text, text, boolean) to authenticated;

create or replace function public.flag_affected_appointments()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.session_date is distinct from old.session_date
    or new.location_id is distinct from old.location_id
    or new.starts_at is distinct from old.starts_at
    or new.ends_at is distinct from old.ends_at
    or (old.bookings_enabled and not new.bookings_enabled)
    or (not old.is_blocked and new.is_blocked) then
    update public.appointments
    set needs_contact = true
    where session_id = old.id and status <> 'cancelled';
  end if;
  return new;
end;
$$;
create trigger availability_changes_flag_appointments
after update on public.availability_sessions
for each row execute function public.flag_affected_appointments();

create or replace function public.flag_appointments_on_blocked_date()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  session_to_lock record;
begin
  for session_to_lock in
    select id from public.availability_sessions
    where session_date = new.blocked_date
    order by id
  loop
    perform pg_advisory_xact_lock(hashtextextended(session_to_lock.id::text, 0));
  end loop;
  update public.appointments a
  set needs_contact = true
  from public.availability_sessions s
  where s.id = a.session_id
    and s.session_date = new.blocked_date
    and a.status <> 'cancelled';
  return new;
end;
$$;
create trigger blocked_date_flags_appointments
after insert on public.blocked_dates
for each row execute function public.flag_appointments_on_blocked_date();

create or replace function public.audit_record_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  changed_id uuid;
begin
  if tg_op = 'DELETE' then
    changed_id := nullif(to_jsonb(old)->>'id', '')::uuid;
  else
    changed_id := nullif(to_jsonb(new)->>'id', '')::uuid;
  end if;
  insert into public.audit_events (actor_id, entity_type, entity_id, action)
  values (auth.uid(), tg_table_name, changed_id, lower(tg_op));
  return new;
end;
$$;
create trigger audit_patients after insert or update on public.patients
for each row execute function public.audit_record_change();
create trigger audit_appointments after insert or update on public.appointments
for each row execute function public.audit_record_change();
create trigger audit_visits after insert or update on public.visits
for each row execute function public.audit_record_change();
create trigger audit_ledger after insert on public.ledger_entries
for each row execute function public.audit_record_change();
create trigger audit_profile after insert or update or delete on public.clinic_profile
for each row execute function public.audit_record_change();
create trigger audit_locations after insert or update or delete on public.clinic_locations
for each row execute function public.audit_record_change();
create trigger audit_services after insert or update or delete on public.clinic_services
for each row execute function public.audit_record_change();
create trigger audit_sessions after insert or update or delete on public.availability_sessions
for each row execute function public.audit_record_change();
create trigger audit_blocked_dates after insert or update or delete on public.blocked_dates
for each row execute function public.audit_record_change();

create or replace function public.prevent_ledger_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Posted ledger entries are immutable; use a correction or reversal.';
end;
$$;
create trigger ledger_entries_immutable
before update or delete on public.ledger_entries
for each row execute function public.prevent_ledger_mutation();

create or replace function public.submit_public_booking(
  p_patient_name text,
  p_mobile text,
  p_session_id uuid,
  p_preferred_time time,
  p_age integer,
  p_reason text,
  p_privacy_acknowledged boolean,
  p_idempotency_key uuid
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  selected_session public.availability_sessions%rowtype;
  existing_booking public.appointments%rowtype;
  compact_mobile text;
  normalized_mobile text;
  current_bookings integer;
  new_reference text;
begin
  if p_privacy_acknowledged is distinct from true
    or p_session_id is null or p_idempotency_key is null
    or p_patient_name is null or length(btrim(p_patient_name)) not between 2 and 100
    or p_reason is not null and length(p_reason) > 300
    or p_age is not null and p_age not between 1 and 120 then
    raise exception 'Invalid booking details' using errcode = '22023';
  end if;

  if coalesce(p_mobile, '') !~ '^[+0-9 ()-]+$' then
    raise exception 'Invalid mobile number' using errcode = '22023';
  end if;
  compact_mobile := regexp_replace(btrim(coalesce(p_mobile, '')), '[ ()-]', '', 'g');
  if compact_mobile ~ '^[6-9][0-9]{9}$' then
    normalized_mobile := '+91' || compact_mobile;
  elsif compact_mobile ~ '^\+?91[6-9][0-9]{9}$' then
    normalized_mobile := '+91' || right(compact_mobile, 10);
  else
    raise exception 'Invalid mobile number' using errcode = '22023';
  end if;

  select * into existing_booking
  from public.appointments
  where idempotency_key = p_idempotency_key;
  if found then
    if existing_booking.mobile <> normalized_mobile
      or existing_booking.session_id <> p_session_id
      or existing_booking.patient_name <> btrim(p_patient_name)
      or existing_booking.preferred_time is distinct from p_preferred_time
      or existing_booking.age is distinct from p_age
      or existing_booking.reason is distinct from nullif(btrim(p_reason), '') then
      raise exception 'Idempotency key conflict' using errcode = '22023';
    end if;
    return existing_booking.booking_reference;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_session_id::text, 0));
  select * into existing_booking
  from public.appointments
  where idempotency_key = p_idempotency_key;
  if found then
    if existing_booking.mobile <> normalized_mobile
      or existing_booking.session_id <> p_session_id
      or existing_booking.patient_name <> btrim(p_patient_name)
      or existing_booking.preferred_time is distinct from p_preferred_time
      or existing_booking.age is distinct from p_age
      or existing_booking.reason is distinct from nullif(btrim(p_reason), '') then
      raise exception 'Idempotency key conflict' using errcode = '22023';
    end if;
    return existing_booking.booking_reference;
  end if;

  select * into selected_session
  from public.availability_sessions
  where id = p_session_id
  for update;
  if not found or selected_session.is_blocked
    or not selected_session.bookings_enabled
    or not exists (
      select 1 from public.clinic_locations
      where id = selected_session.location_id and active
    )
    or exists (
      select 1 from public.blocked_dates where blocked_date = selected_session.session_date
    )
    or selected_session.session_date < (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'Session is not accepting bookings' using errcode = 'P0001';
  end if;

  if p_preferred_time is not null and
    (p_preferred_time < selected_session.starts_at or p_preferred_time >= selected_session.ends_at) then
    raise exception 'Preferred time is outside the session' using errcode = '22023';
  end if;

  select count(*) into current_bookings
  from public.appointments
  where session_id = p_session_id and status <> 'cancelled';
  if current_bookings >= selected_session.capacity then
    raise exception 'Session is full' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.appointments
    where mobile = normalized_mobile
      and status not in ('cancelled', 'completed')
      and created_at >= date_trunc('day', now() at time zone 'Asia/Kolkata')
        at time zone 'Asia/Kolkata'
  ) >= 3 then
    raise exception 'Booking request limit reached' using errcode = 'P0001';
  end if;

  new_reference := upper(substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 12));
  insert into public.appointments (
    booking_reference, idempotency_key, session_id, patient_name, mobile,
    preferred_time, age, reason, privacy_acknowledged
  ) values (
    new_reference, p_idempotency_key, p_session_id, btrim(p_patient_name),
    normalized_mobile, p_preferred_time, p_age, nullif(btrim(p_reason), ''),
    p_privacy_acknowledged
  );
  return new_reference;
end;
$$;
revoke all on function public.submit_public_booking(text, text, uuid, time, integer, text, boolean, uuid) from public;
grant execute on function public.submit_public_booking(text, text, uuid, time, integer, text, boolean, uuid) to anon, authenticated;

create or replace function public.post_ledger_entry(
  p_patient_id uuid,
  p_entry_type text,
  p_amount_paise bigint,
  p_description text,
  p_effective_at timestamptz,
  p_idempotency_key uuid,
  p_overpayment_confirmed boolean default false,
  p_correction_reason text default null,
  p_reverses_entry_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_id uuid;
  current_balance bigint;
  existing_entry public.ledger_entries%rowtype;
  original_entry public.ledger_entries%rowtype;
  signed_amount bigint;
begin
  if not public.is_authorized_doctor() then
    raise exception 'Doctor authorization required' using errcode = '42501';
  end if;

  perform 1 from public.patients where id = p_patient_id for update;
  if not found then raise exception 'Patient not found' using errcode = 'P0002'; end if;

  if p_entry_type not in ('opening_balance', 'charge', 'payment', 'correction', 'reversal')
    or length(btrim(coalesce(p_description, ''))) not between 1 and 240
    or p_effective_at is null then
    raise exception 'Invalid ledger entry' using errcode = '22023';
  end if;

  if p_entry_type in ('opening_balance', 'charge', 'payment') then
    if p_amount_paise is null or p_amount_paise <= 0
      or p_correction_reason is not null or p_reverses_entry_id is not null then
      raise exception 'Amount must be positive for charges and payments' using errcode = '22023';
    end if;
    signed_amount := case when p_entry_type = 'payment' then -p_amount_paise else p_amount_paise end;
  elsif p_entry_type = 'correction' then
    if p_amount_paise is null or p_amount_paise = 0
      or length(btrim(coalesce(p_correction_reason, ''))) not between 3 and 500
      or p_reverses_entry_id is not null then
      raise exception 'A correction needs a signed amount and reason' using errcode = '22023';
    end if;
    signed_amount := p_amount_paise;
  else
    if length(btrim(coalesce(p_correction_reason, ''))) not between 3 and 500
      or p_reverses_entry_id is null then
      raise exception 'A reversal needs an original entry and reason' using errcode = '22023';
    end if;
    select * into original_entry from public.ledger_entries
    where id = p_reverses_entry_id and patient_id = p_patient_id
    for update;
    if not found or original_entry.entry_type = 'reversal' then
      raise exception 'Original entry cannot be reversed' using errcode = '22023';
    end if;
    signed_amount := -original_entry.amount_paise;
  end if;

  select * into existing_entry
  from public.ledger_entries
  where idempotency_key = p_idempotency_key;
  if found then
    if existing_entry.patient_id <> p_patient_id
      or existing_entry.entry_type <> p_entry_type
      or existing_entry.amount_paise <> signed_amount
      or existing_entry.description <> btrim(p_description)
      or existing_entry.effective_at <> p_effective_at
      or existing_entry.correction_reason is distinct from nullif(btrim(p_correction_reason), '')
      or existing_entry.reverses_entry_id is distinct from p_reverses_entry_id then
      raise exception 'Idempotency key conflict' using errcode = '22023';
    end if;
    return existing_entry.id;
  end if;

  if p_entry_type = 'payment' then
    select coalesce(sum(amount_paise), 0) into current_balance
    from public.ledger_entries where patient_id = p_patient_id;
    if current_balance + signed_amount < 0 and not p_overpayment_confirmed then
      raise exception 'Overpayment confirmation required' using errcode = 'P0001';
    end if;
  end if;

  insert into public.ledger_entries (
    patient_id, entry_type, amount_paise, description, effective_at,
    idempotency_key, correction_reason, reverses_entry_id, created_by
  ) values (
    p_patient_id, p_entry_type, signed_amount, btrim(p_description), p_effective_at,
    p_idempotency_key, nullif(btrim(p_correction_reason), ''),
    p_reverses_entry_id, auth.uid()
  ) returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.post_ledger_entry(uuid, text, bigint, text, timestamptz, uuid, boolean, text, uuid) from public, anon;
grant execute on function public.post_ledger_entry(uuid, text, bigint, text, timestamptz, uuid, boolean, text, uuid) to authenticated;

create or replace function public.accounting_period_summary(
  p_from date,
  p_to date
)
returns table (charges_paise bigint, collections_paise bigint)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_authorized_doctor() then
    raise exception 'Doctor authorization required' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Invalid accounting period' using errcode = '22023';
  end if;
  return query
  select
    coalesce(sum(l.amount_paise) filter (where l.entry_type = 'charge'), 0)::bigint,
    coalesce(sum(-l.amount_paise) filter (where l.entry_type = 'payment'), 0)::bigint
  from public.ledger_entries l
  where l.effective_at >= (p_from::timestamp at time zone 'Asia/Kolkata')
    and l.effective_at < ((p_to + 1)::timestamp at time zone 'Asia/Kolkata');
end;
$$;
revoke all on function public.accounting_period_summary(date, date) from public, anon;
grant execute on function public.accounting_period_summary(date, date) to authenticated;

create or replace function public.patient_ledger_page(
  p_patient_id uuid,
  p_offset integer default 0,
  p_limit integer default 100
)
returns table (
  id uuid,
  entry_type text,
  amount_paise bigint,
  description text,
  effective_at timestamptz,
  correction_reason text,
  reverses_entry_id uuid,
  running_balance bigint,
  has_reversal boolean,
  total_count bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_authorized_doctor() then
    raise exception 'Doctor authorization required' using errcode = '42501';
  end if;
  if p_patient_id is null or p_offset is null or p_offset < 0
    or p_offset > 1000000 or p_limit is null or p_limit not between 1 and 100 then
    raise exception 'Invalid ledger page' using errcode = '22023';
  end if;
  return query
  with ordered_entries as (
    select
      l.id,
      l.entry_type,
      l.amount_paise,
      l.description,
      l.effective_at,
      l.correction_reason,
      l.reverses_entry_id,
      sum(l.amount_paise) over (
        order by l.effective_at, l.created_at, l.id
        rows between unbounded preceding and current row
      )::bigint as running_balance,
      exists (
        select 1 from public.ledger_entries r
        where r.reverses_entry_id = l.id
      ) as has_reversal,
      row_number() over (order by l.effective_at, l.created_at, l.id) as row_number,
      count(*) over ()::bigint as total_count
    from public.ledger_entries l
    where l.patient_id = p_patient_id
  )
  select
    o.id, o.entry_type, o.amount_paise, o.description, o.effective_at,
    o.correction_reason, o.reverses_entry_id, o.running_balance, o.has_reversal, o.total_count
  from ordered_entries o
  where o.row_number > p_offset and o.row_number <= p_offset + p_limit
  order by o.row_number;
end;
$$;
revoke all on function public.patient_ledger_page(uuid, integer, integer) from public, anon;
grant execute on function public.patient_ledger_page(uuid, integer, integer) to authenticated;

create or replace function public.link_appointment_patient(
  p_appointment_id uuid,
  p_patient_id uuid,
  p_create_new boolean
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  selected_appointment public.appointments%rowtype;
  linked_patient_id uuid;
begin
  if not public.is_authorized_doctor() then
    raise exception 'Doctor authorization required' using errcode = '42501';
  end if;
  if p_appointment_id is null or p_create_new is null then
    raise exception 'Invalid patient link' using errcode = '22023';
  end if;

  select * into selected_appointment
  from public.appointments
  where id = p_appointment_id
  for update;
  if not found then raise exception 'Appointment not found' using errcode = 'P0002'; end if;
  if selected_appointment.patient_id is not null then
    raise exception 'Appointment already has a patient record' using errcode = 'P0001';
  end if;

  if p_create_new then
    if p_patient_id is not null then
      raise exception 'Choose either an existing record or create a new record' using errcode = '22023';
    end if;
    insert into public.patients (full_name, mobile, age)
    values (selected_appointment.patient_name, selected_appointment.mobile, selected_appointment.age)
    returning id into linked_patient_id;
  else
    if p_patient_id is null then
      raise exception 'Select an existing patient or create a new record' using errcode = '22023';
    end if;
    perform 1 from public.patients where id = p_patient_id;
    if not found then raise exception 'Patient not found' using errcode = 'P0002'; end if;
    linked_patient_id := p_patient_id;
  end if;

  update public.appointments
  set patient_id = linked_patient_id
  where id = p_appointment_id;
  return linked_patient_id;
end;
$$;
revoke all on function public.link_appointment_patient(uuid, uuid, boolean) from public, anon;
grant execute on function public.link_appointment_patient(uuid, uuid, boolean) to authenticated;

create view public.public_clinic_profile with (security_barrier = true) as
select clinic_name, doctor_name, qualification, public_introduction, doctor_photo_url, public_phone, public_whatsapp
from public.clinic_profile
where singleton = true;
create view public.public_clinic_locations with (security_barrier = true) as
select id, name, public_address, directions_url, sort_order
from public.clinic_locations
where active = true;
create view public.public_clinic_services with (security_barrier = true) as
select id, name, sort_order from public.clinic_services where active = true;
create view public.public_availability with (security_barrier = true) as
select
  s.id,
  s.session_date,
  s.location_id,
  s.starts_at,
  s.ends_at,
  s.public_note,
  case
    when s.is_blocked or exists (select 1 from public.blocked_dates b where b.blocked_date = s.session_date)
      or not s.bookings_enabled then 'closed'
    when count(a.id) filter (where a.status <> 'cancelled') >= s.capacity then 'full'
    else 'open'
  end as booking_status
from public.availability_sessions s
left join public.appointments a on a.session_id = s.id
group by s.id;

create view public.patient_balances with (security_barrier = true, security_invoker = true) as
select p.id as patient_id, coalesce(sum(l.amount_paise), 0)::bigint as balance_paise
from public.patients p
left join public.ledger_entries l on l.patient_id = p.id
group by p.id;
create view public.accounting_summary with (security_barrier = true, security_invoker = true) as
select
  coalesce(sum(balance_paise) filter (where balance_paise > 0), 0)::bigint as outstanding_paise,
  coalesce(count(*) filter (where balance_paise > 0), 0)::bigint as patients_owing,
  coalesce(sum(-balance_paise) filter (where balance_paise < 0), 0)::bigint as patient_credit_paise
from public.patient_balances;

alter table public.authorized_doctors enable row level security;
alter table public.clinic_profile enable row level security;
alter table public.clinic_locations enable row level security;
alter table public.clinic_services enable row level security;
alter table public.availability_sessions enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.visits enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.audit_events enable row level security;

create policy "doctor can read own authorization"
on public.authorized_doctors for select to authenticated
using (user_id = auth.uid());
create policy "authorized doctor reads profile"
on public.clinic_profile for select to authenticated using (public.is_authorized_doctor());
create policy "authorized doctor manages profile"
on public.clinic_profile for update to authenticated using (public.is_authorized_doctor()) with check (public.is_authorized_doctor());
create policy "authorized doctor creates profile"
on public.clinic_profile for insert to authenticated with check (public.is_authorized_doctor());
create policy "authorized doctor manages locations"
on public.clinic_locations for all to authenticated using (public.is_authorized_doctor()) with check (public.is_authorized_doctor());
create policy "authorized doctor manages services"
on public.clinic_services for all to authenticated using (public.is_authorized_doctor()) with check (public.is_authorized_doctor());
create policy "authorized doctor manages sessions"
on public.availability_sessions for all to authenticated using (public.is_authorized_doctor()) with check (public.is_authorized_doctor());
create policy "authorized doctor manages blocked dates"
on public.blocked_dates for all to authenticated using (public.is_authorized_doctor()) with check (public.is_authorized_doctor());
create policy "authorized doctor manages patients"
on public.patients for all to authenticated using (public.is_authorized_doctor()) with check (public.is_authorized_doctor());
create policy "authorized doctor manages appointments"
on public.appointments for all to authenticated using (public.is_authorized_doctor()) with check (public.is_authorized_doctor());
create policy "authorized doctor manages visits"
on public.visits for all to authenticated using (public.is_authorized_doctor()) with check (public.is_authorized_doctor());
create policy "authorized doctor reads ledger"
on public.ledger_entries for select to authenticated using (public.is_authorized_doctor());
create policy "authorized doctor reads audit"
on public.audit_events for select to authenticated using (public.is_authorized_doctor());

revoke all on public.authorized_doctors, public.clinic_profile, public.clinic_locations,
  public.clinic_services, public.availability_sessions, public.patients,
  public.blocked_dates, public.appointments, public.visits, public.ledger_entries, public.audit_events
from public, anon, authenticated;
grant select on public.authorized_doctors to authenticated;
grant select, insert, update on public.clinic_profile to authenticated;
grant select, insert, update on public.clinic_locations, public.clinic_services to authenticated;
grant select, insert, update, delete on public.blocked_dates to authenticated;
grant select, insert on public.availability_sessions to authenticated;
grant select, insert, update on public.clinic_locations, public.clinic_services,
  public.patients, public.appointments, public.visits to authenticated;
grant select on public.ledger_entries, public.audit_events to authenticated;
grant select on public.public_clinic_profile, public.public_clinic_locations,
  public.public_clinic_services, public.public_availability to anon, authenticated;
revoke all on public.public_clinic_profile, public.public_clinic_locations,
  public.public_clinic_services, public.public_availability from public;
revoke all on public.patient_balances, public.accounting_summary from public, anon;
grant select on public.patient_balances, public.accounting_summary to authenticated;
grant usage, select on all sequences in schema public to authenticated;
