begin;

alter table public.ledger_people
  add column archived_at timestamptz;

create or replace function public.guard_ledger_entry_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  account_archived boolean;
  current_balance bigint;
begin
  select person.archived_at is not null
  into account_archived
  from public.ledger_people person
  where person.id = new.ledger_person_id
  for update;

  if not found then
    raise exception 'Ledger account not found' using errcode = 'P0002';
  end if;
  if account_archived then
    raise exception 'Restore this account before adding or correcting transactions' using errcode = 'P0001';
  end if;

  if new.entry_type = 'reversal' then
    select coalesce(sum(entry.amount_paise), 0)::bigint
    into current_balance
    from public.ledger_entries entry
    where entry.ledger_person_id = new.ledger_person_id;

    if current_balance + new.amount_paise < 0 then
      raise exception 'Removing this entry would create a negative account balance' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;
revoke all on function public.guard_ledger_entry_insert() from public, anon, authenticated;

create trigger ledger_entries_guard_insert
before insert on public.ledger_entries
for each row execute function public.guard_ledger_entry_insert();

create or replace function public.archive_ledger_person(
  p_person_id uuid,
  p_confirm_outstanding boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  selected_person public.ledger_people%rowtype;
  current_balance bigint;
begin
  if not public.is_authorized_doctor() then
    raise exception 'Doctor authorization required' using errcode = '42501';
  end if;
  if p_person_id is null or p_confirm_outstanding is null then
    raise exception 'Invalid archive request' using errcode = '22023';
  end if;

  select * into selected_person
  from public.ledger_people
  where id = p_person_id
  for update;
  if not found then
    raise exception 'Ledger account not found' using errcode = 'P0002';
  end if;
  if selected_person.archived_at is not null then
    raise exception 'This account is already archived' using errcode = 'P0001';
  end if;

  select coalesce(sum(entry.amount_paise), 0)::bigint
  into current_balance
  from public.ledger_entries entry
  where entry.ledger_person_id = p_person_id;
  if current_balance > 0 and not p_confirm_outstanding then
    raise exception 'Confirm that the outstanding dues will remain unchanged' using errcode = 'P0001';
  end if;

  update public.ledger_people
  set archived_at = now()
  where id = p_person_id;
  insert into public.audit_events (actor_id, entity_type, entity_id, action)
  values (auth.uid(), 'ledger_people', p_person_id, 'archived');
end;
$$;
revoke all on function public.archive_ledger_person(uuid, boolean) from public, anon;
grant execute on function public.archive_ledger_person(uuid, boolean) to authenticated;

create or replace function public.restore_ledger_person(
  p_person_id uuid,
  p_confirm_restore boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  selected_person public.ledger_people%rowtype;
begin
  if not public.is_authorized_doctor() then
    raise exception 'Doctor authorization required' using errcode = '42501';
  end if;
  if p_person_id is null or p_confirm_restore is not true then
    raise exception 'Confirm that this account should be restored' using errcode = '22023';
  end if;

  select * into selected_person
  from public.ledger_people
  where id = p_person_id
  for update;
  if not found then
    raise exception 'Ledger account not found' using errcode = 'P0002';
  end if;
  if selected_person.archived_at is null then
    raise exception 'This account is already active' using errcode = 'P0001';
  end if;

  update public.ledger_people
  set archived_at = null
  where id = p_person_id;
  insert into public.audit_events (actor_id, entity_type, entity_id, action)
  values (auth.uid(), 'ledger_people', p_person_id, 'restored');
end;
$$;
revoke all on function public.restore_ledger_person(uuid, boolean) from public, anon;
grant execute on function public.restore_ledger_person(uuid, boolean) to authenticated;

create or replace function public.doctor_archived_ledger_people()
returns table (
  person_id uuid,
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
  where person.archived_at is not null
  group by person.id
  order by lower(person.full_name), person.id;
end;
$$;
revoke all on function public.doctor_archived_ledger_people() from public, anon;
grant execute on function public.doctor_archived_ledger_people() to authenticated;

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
    where person.archived_at is null
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

notify pgrst, 'reload schema';

commit;
