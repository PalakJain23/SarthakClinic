begin;

create table public.ledger_people (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid unique references public.patients(id) on delete restrict,
  full_name text not null check (length(btrim(full_name)) between 1 and 120),
  mobile text check (mobile is null or mobile ~ '^\+91[6-9][0-9]{9}$'),
  created_at timestamptz not null default now()
);
create index ledger_people_name_search_idx on public.ledger_people (lower(full_name));

insert into public.ledger_people (patient_id, full_name, mobile)
select patient.id, patient.full_name, patient.mobile
from public.patients patient
where exists (
  select 1 from public.ledger_entries entry where entry.patient_id = patient.id
)
on conflict (patient_id) do nothing;

alter table public.ledger_entries
  add column ledger_person_id uuid references public.ledger_people(id) on delete restrict;

create or replace function public.prevent_ledger_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'UPDATE'
    and current_setting('app.ledger_person_backfill', true) = 'on'
    and old.ledger_person_id is null
    and new.ledger_person_id is not null
    and (to_jsonb(new) - 'ledger_person_id') = (to_jsonb(old) - 'ledger_person_id') then
    return new;
  end if;
  raise exception 'Posted ledger entries are immutable; use a correction or reversal.';
end;
$$;

set local app.ledger_person_backfill = 'on';
update public.ledger_entries entry
set ledger_person_id = person.id
from public.ledger_people person
where person.patient_id = entry.patient_id;

create or replace function public.prevent_ledger_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Posted ledger entries are immutable; use a correction or reversal.';
end;
$$;

alter table public.ledger_entries
  alter column patient_id drop not null,
  alter column ledger_person_id set not null;
create index ledger_person_effective_idx
  on public.ledger_entries (ledger_person_id, effective_at, created_at, id);

alter table public.ledger_people enable row level security;
create policy "authorized doctor reads ledger people"
on public.ledger_people for select to authenticated
using (public.is_authorized_doctor());
revoke all on public.ledger_people from public, anon, authenticated;
grant select on public.ledger_people to authenticated;

create or replace view public.accounting_summary
with (security_barrier = true, security_invoker = true) as
with person_balances as (
  select person.id, coalesce(sum(entry.amount_paise), 0)::bigint as balance_paise
  from public.ledger_people person
  left join public.ledger_entries entry on entry.ledger_person_id = person.id
  group by person.id
)
select
  coalesce(sum(balance_paise) filter (where balance_paise > 0), 0)::bigint as outstanding_paise,
  coalesce(count(*) filter (where balance_paise > 0), 0)::bigint as patients_owing,
  coalesce(sum(-balance_paise) filter (where balance_paise < 0), 0)::bigint as patient_credit_paise
from person_balances;
revoke all on public.accounting_summary from public, anon;
grant select on public.accounting_summary to authenticated;

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
  person_id uuid;
  signed_amount bigint;
begin
  if not public.is_authorized_doctor() then
    raise exception 'Doctor authorization required' using errcode = '42501';
  end if;

  perform 1 from public.patients where id = p_patient_id for update;
  if not found then raise exception 'Patient not found' using errcode = 'P0002'; end if;

  insert into public.ledger_people (patient_id, full_name, mobile)
  select id, full_name, mobile from public.patients where id = p_patient_id
  on conflict (patient_id) do nothing;
  select id into person_id from public.ledger_people where patient_id = p_patient_id for update;

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
    where id = p_reverses_entry_id and ledger_person_id = person_id
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
    if existing_entry.ledger_person_id <> person_id
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
    from public.ledger_entries where ledger_person_id = person_id;
    if current_balance + signed_amount < 0 then
      raise exception 'Payment exceeds the outstanding balance' using errcode = 'P0001';
    end if;
  end if;

  insert into public.ledger_entries (
    patient_id, ledger_person_id, entry_type, amount_paise, description, effective_at,
    idempotency_key, correction_reason, reverses_entry_id, created_by
  ) values (
    p_patient_id, person_id, p_entry_type, signed_amount, btrim(p_description), p_effective_at,
    p_idempotency_key, nullif(btrim(p_correction_reason), ''),
    p_reverses_entry_id, auth.uid()
  ) returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.post_ledger_entry(uuid, text, bigint, text, timestamptz, uuid, boolean, text, uuid) from public, anon;
grant execute on function public.post_ledger_entry(uuid, text, bigint, text, timestamptz, uuid, boolean, text, uuid) to authenticated;

create or replace function public.post_ledger_person_entry(
  p_person_id uuid,
  p_full_name text,
  p_mobile text,
  p_entry_type text,
  p_amount_paise bigint,
  p_description text,
  p_effective_at timestamptz,
  p_idempotency_key uuid,
  p_correction_reason text default null,
  p_reverses_entry_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing_entry public.ledger_entries%rowtype;
  original_entry public.ledger_entries%rowtype;
  selected_person public.ledger_people%rowtype;
  signed_amount bigint;
  current_balance bigint;
begin
  if not public.is_authorized_doctor() then
    raise exception 'Doctor authorization required' using errcode = '42501';
  end if;
  if p_idempotency_key is null or p_effective_at is null
    or p_entry_type is null
    or p_entry_type not in ('charge', 'payment', 'correction', 'reversal')
    or length(btrim(coalesce(p_description, ''))) not between 1 and 240 then
    raise exception 'Invalid ledger entry' using errcode = '22023';
  end if;
  if p_person_id is null and (
    p_entry_type <> 'charge'
    or length(btrim(coalesce(p_full_name, ''))) not between 1 and 120
    or p_mobile is not null and p_mobile !~ '^\+91[6-9][0-9]{9}$'
  ) then
    raise exception 'A new ledger person needs a name and a valid optional phone number' using errcode = '22023';
  end if;
  if p_entry_type in ('charge', 'payment') and (
    p_amount_paise is null or p_amount_paise <= 0 or p_amount_paise > 100000000000
    or p_correction_reason is not null or p_reverses_entry_id is not null
  ) then
    raise exception 'Amount must be a positive valid value' using errcode = '22023';
  elsif p_entry_type = 'correction' and (
    p_amount_paise is null or p_amount_paise = 0
    or p_amount_paise not between -100000000000 and 100000000000
    or length(btrim(coalesce(p_correction_reason, ''))) not between 3 and 500
    or p_reverses_entry_id is not null
  ) then
    raise exception 'A correction needs a valid signed amount and reason' using errcode = '22023';
  elsif p_entry_type = 'reversal' and (
    length(btrim(coalesce(p_correction_reason, ''))) not between 3 and 500
    or p_reverses_entry_id is null
  ) then
    raise exception 'A reversal needs an original entry and reason' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));
  select * into existing_entry
  from public.ledger_entries
  where idempotency_key = p_idempotency_key;
  if found then
    select * into selected_person
    from public.ledger_people
    where id = existing_entry.ledger_person_id;
    if (p_person_id is not null and existing_entry.ledger_person_id <> p_person_id)
      or (p_person_id is null and (
        selected_person.full_name <> btrim(p_full_name)
        or selected_person.mobile is distinct from p_mobile
      ))
      or existing_entry.entry_type <> p_entry_type
      or existing_entry.description <> btrim(p_description)
      or existing_entry.effective_at <> p_effective_at
      or existing_entry.correction_reason is distinct from nullif(btrim(p_correction_reason), '')
      or existing_entry.reverses_entry_id is distinct from p_reverses_entry_id then
      raise exception 'Idempotency key conflict' using errcode = '22023';
    end if;
    if p_entry_type in ('charge', 'payment', 'correction')
      and existing_entry.amount_paise <>
        (case when p_entry_type = 'payment' then -p_amount_paise else p_amount_paise end) then
      raise exception 'Idempotency key conflict' using errcode = '22023';
    end if;
    return existing_entry.ledger_person_id;
  end if;

  if p_person_id is null then
    insert into public.ledger_people (full_name, mobile)
    values (btrim(p_full_name), p_mobile)
    returning * into selected_person;
  else
    select * into selected_person
    from public.ledger_people
    where id = p_person_id
    for update;
    if not found then raise exception 'Ledger person not found' using errcode = 'P0002'; end if;
  end if;

  if p_entry_type in ('charge', 'payment') then
    if p_amount_paise is null or p_amount_paise <= 0
      or p_amount_paise > 100000000000
      or p_correction_reason is not null or p_reverses_entry_id is not null then
      raise exception 'Amount must be a positive valid value' using errcode = '22023';
    end if;
    signed_amount := case when p_entry_type = 'payment' then -p_amount_paise else p_amount_paise end;
  elsif p_entry_type = 'correction' then
    if p_amount_paise is null or p_amount_paise = 0
      or p_amount_paise not between -100000000000 and 100000000000
      or length(btrim(coalesce(p_correction_reason, ''))) not between 3 and 500
      or p_reverses_entry_id is not null then
      raise exception 'A correction needs a valid signed amount and reason' using errcode = '22023';
    end if;
    signed_amount := p_amount_paise;
  else
    if length(btrim(coalesce(p_correction_reason, ''))) not between 3 and 500
      or p_reverses_entry_id is null then
      raise exception 'A reversal needs an original entry and reason' using errcode = '22023';
    end if;
    select * into original_entry
    from public.ledger_entries
    where id = p_reverses_entry_id and ledger_person_id = selected_person.id
    for update;
    if not found or original_entry.entry_type = 'reversal'
      or exists (
        select 1 from public.ledger_entries
        where reverses_entry_id = p_reverses_entry_id
      ) then
      raise exception 'Original entry cannot be reversed' using errcode = '22023';
    end if;
    signed_amount := -original_entry.amount_paise;
  end if;

  if p_entry_type = 'payment' then
    select coalesce(sum(amount_paise), 0) into current_balance
    from public.ledger_entries
    where ledger_person_id = selected_person.id;
    if current_balance < p_amount_paise then
      raise exception 'Payment exceeds the outstanding balance' using errcode = 'P0001';
    end if;
  end if;

  insert into public.ledger_entries (
    patient_id, ledger_person_id, entry_type, amount_paise, description, effective_at,
    idempotency_key, correction_reason, reverses_entry_id, created_by
  ) values (
    selected_person.patient_id, selected_person.id, p_entry_type, signed_amount,
    btrim(p_description), p_effective_at, p_idempotency_key,
    nullif(btrim(p_correction_reason), ''), p_reverses_entry_id, auth.uid()
  );
  return selected_person.id;
end;
$$;
revoke all on function public.post_ledger_person_entry(uuid, text, text, text, bigint, text, timestamptz, uuid, text, uuid) from public, anon;
grant execute on function public.post_ledger_person_entry(uuid, text, text, text, bigint, text, timestamptz, uuid, text, uuid) to authenticated;

create or replace function public.doctor_ledger_person_page(
  p_search text default '',
  p_balance_filter text default 'all',
  p_sort text default 'name',
  p_direction text default 'asc',
  p_offset integer default 0,
  p_limit integer default 10
)
returns table (
  person_id uuid,
  full_name text,
  mobile text,
  total_udhaar_paise bigint,
  total_paid_paise bigint,
  balance_paise bigint,
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
  if p_search is null or length(p_search) > 80
    or p_balance_filter is null or p_balance_filter not in ('all', 'due', 'credit', 'settled')
    or p_sort is null or p_sort not in ('name', 'udhaar', 'paid', 'balance')
    or p_direction is null or p_direction not in ('asc', 'desc')
    or p_offset not between 0 and 1000000
    or p_limit not between 1 and 100 then
    raise exception 'Invalid ledger page parameters' using errcode = '22023';
  end if;

  return query
  with person_totals as (
    select
      person.id,
      person.full_name,
      person.mobile,
      coalesce(sum(case
        when entry.entry_type in ('opening_balance', 'charge', 'correction') then entry.amount_paise
        when entry.entry_type = 'reversal'
          and original.entry_type in ('opening_balance', 'charge', 'correction') then entry.amount_paise
        else 0
      end), 0)::bigint as total_udhaar_paise,
      coalesce(sum(case
        when entry.entry_type = 'payment' then -entry.amount_paise
        when entry.entry_type = 'reversal' and original.entry_type = 'payment' then -entry.amount_paise
        else 0
      end), 0)::bigint as total_paid_paise,
      coalesce(sum(entry.amount_paise), 0)::bigint as balance_paise
    from public.ledger_people person
    left join public.ledger_entries entry on entry.ledger_person_id = person.id
    left join public.ledger_entries original on original.id = entry.reverses_entry_id
    group by person.id
  ),
  filtered_people as (
    select totals.*
    from person_totals totals
    where (p_search = ''
      or totals.full_name ilike '%' || p_search || '%'
      or coalesce(totals.mobile, '') ilike '%' || p_search || '%')
      and (
        p_balance_filter = 'all'
        or (p_balance_filter = 'due' and totals.balance_paise > 0)
        or (p_balance_filter = 'credit' and totals.balance_paise < 0)
        or (p_balance_filter = 'settled' and totals.balance_paise = 0)
      )
  )
  select
    rows.id,
    rows.full_name,
    rows.mobile,
    rows.total_udhaar_paise,
    rows.total_paid_paise,
    rows.balance_paise,
    count(*) over ()::bigint
  from filtered_people rows
  order by
    case when p_sort = 'name' and p_direction = 'asc' then rows.full_name end asc,
    case when p_sort = 'name' and p_direction = 'desc' then rows.full_name end desc,
    case when p_sort = 'udhaar' and p_direction = 'asc' then rows.total_udhaar_paise end asc,
    case when p_sort = 'udhaar' and p_direction = 'desc' then rows.total_udhaar_paise end desc,
    case when p_sort = 'paid' and p_direction = 'asc' then rows.total_paid_paise end asc,
    case when p_sort = 'paid' and p_direction = 'desc' then rows.total_paid_paise end desc,
    case when p_sort = 'balance' and p_direction = 'asc' then rows.balance_paise end asc,
    case when p_sort = 'balance' and p_direction = 'desc' then rows.balance_paise end desc,
    rows.id
  offset p_offset
  limit p_limit;
end;
$$;
revoke all on function public.doctor_ledger_person_page(text, text, text, text, integer, integer) from public, anon;
grant execute on function public.doctor_ledger_person_page(text, text, text, text, integer, integer) to authenticated;

create or replace function public.ledger_person_options()
returns table (
  person_id uuid,
  patient_id uuid,
  full_name text,
  mobile text,
  total_udhaar_paise bigint,
  total_paid_paise bigint,
  balance_paise bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_authorized_doctor() then
    raise exception 'Doctor authorization required' using errcode = '42501';
  end if;
  return query
  select
    person.id,
    person.patient_id,
    person.full_name,
    person.mobile,
    coalesce(sum(case
      when entry.entry_type in ('opening_balance', 'charge', 'correction') then entry.amount_paise
      when entry.entry_type = 'reversal'
        and original.entry_type in ('opening_balance', 'charge', 'correction') then entry.amount_paise
      else 0
    end), 0)::bigint,
    coalesce(sum(case
      when entry.entry_type = 'payment' then -entry.amount_paise
      when entry.entry_type = 'reversal' and original.entry_type = 'payment' then -entry.amount_paise
      else 0
    end), 0)::bigint,
    coalesce(sum(entry.amount_paise), 0)::bigint
  from public.ledger_people person
  left join public.ledger_entries entry on entry.ledger_person_id = person.id
  left join public.ledger_entries original on original.id = entry.reverses_entry_id
  group by person.id
  order by lower(person.full_name), person.id;
end;
$$;
revoke all on function public.ledger_person_options() from public, anon;
grant execute on function public.ledger_person_options() to authenticated;

create or replace function public.ledger_person_history(p_person_id uuid)
returns table (
  id uuid,
  entry_type text,
  amount_paise bigint,
  description text,
  effective_at timestamptz,
  correction_reason text,
  reverses_entry_id uuid,
  reverses_entry_type text,
  running_balance bigint,
  total_udhaar_paise bigint,
  total_paid_paise bigint,
  balance_paise bigint,
  has_reversal boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_authorized_doctor() then
    raise exception 'Doctor authorization required' using errcode = '42501';
  end if;
  if p_person_id is null or not exists (
    select 1 from public.ledger_people person where person.id = p_person_id
  ) then
    raise exception 'Ledger person not found' using errcode = 'P0002';
  end if;

  return query
  with ordered_entries as (
    select
      entry.id,
      entry.entry_type,
      entry.amount_paise,
      entry.description,
      entry.effective_at,
      entry.created_at,
      entry.correction_reason,
      entry.reverses_entry_id,
      original.entry_type as reverses_entry_type,
      sum(entry.amount_paise) over (
        order by entry.effective_at, entry.created_at, entry.id
        rows between unbounded preceding and current row
      )::bigint as running_balance,
      sum(case
        when entry.entry_type in ('opening_balance', 'charge', 'correction') then entry.amount_paise
        when entry.entry_type = 'reversal'
          and original.entry_type in ('opening_balance', 'charge', 'correction') then entry.amount_paise
        else 0
      end) over ()::bigint as total_udhaar_paise,
      sum(case
        when entry.entry_type = 'payment' then -entry.amount_paise
        when entry.entry_type = 'reversal' and original.entry_type = 'payment' then -entry.amount_paise
        else 0
      end) over ()::bigint as total_paid_paise,
      sum(entry.amount_paise) over ()::bigint as balance_paise,
      exists (
        select 1 from public.ledger_entries reversal
        where reversal.reverses_entry_id = entry.id
      ) as has_reversal
    from public.ledger_entries entry
    left join public.ledger_entries original on original.id = entry.reverses_entry_id
    where entry.ledger_person_id = p_person_id
  )
  select
    entry.id,
    entry.entry_type,
    entry.amount_paise,
    entry.description,
    entry.effective_at,
    entry.correction_reason,
    entry.reverses_entry_id,
    entry.reverses_entry_type,
    entry.running_balance,
    coalesce(entry.total_udhaar_paise, 0)::bigint,
    coalesce(entry.total_paid_paise, 0)::bigint,
    coalesce(entry.balance_paise, 0)::bigint,
    entry.has_reversal
  from ordered_entries entry
  order by entry.effective_at, entry.created_at, entry.id;
end;
$$;
revoke all on function public.ledger_person_history(uuid) from public, anon;
grant execute on function public.ledger_person_history(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
