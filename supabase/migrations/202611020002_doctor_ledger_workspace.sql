begin;

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
    coalesce(sum(case
      when entry.entry_type = 'charge' then entry.amount_paise
      when entry.entry_type = 'reversal' and original.entry_type = 'charge'
        then entry.amount_paise
      else 0
    end), 0)::bigint,
    coalesce(sum(case
      when entry.entry_type = 'payment' then -entry.amount_paise
      when entry.entry_type = 'reversal' and original.entry_type = 'payment'
        then -entry.amount_paise
      else 0
    end), 0)::bigint
  from public.ledger_entries entry
  left join public.ledger_entries original on original.id = entry.reverses_entry_id
  where entry.effective_at >= (p_from::timestamp at time zone 'Asia/Kolkata')
    and entry.effective_at < ((p_to + 1)::timestamp at time zone 'Asia/Kolkata');
end;
$$;
revoke all on function public.accounting_period_summary(date, date) from public, anon;
grant execute on function public.accounting_period_summary(date, date) to authenticated;

create or replace function public.accounting_ledger_totals()
returns table (
  opening_dues_paise bigint,
  credit_charges_paise bigint,
  collected_paise bigint
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
    coalesce(sum(case
      when entry.entry_type = 'opening_balance' then entry.amount_paise
      when entry.entry_type = 'reversal' and original.entry_type = 'opening_balance'
        then entry.amount_paise
      else 0
    end), 0)::bigint,
    coalesce(sum(case
      when entry.entry_type = 'charge' then entry.amount_paise
      when entry.entry_type = 'reversal' and original.entry_type = 'charge'
        then entry.amount_paise
      else 0
    end), 0)::bigint,
    coalesce(sum(case
      when entry.entry_type = 'payment' then -entry.amount_paise
      when entry.entry_type = 'reversal' and original.entry_type = 'payment'
        then -entry.amount_paise
      else 0
    end), 0)::bigint
  from public.ledger_entries entry
  left join public.ledger_entries original on original.id = entry.reverses_entry_id;
end;
$$;
revoke all on function public.accounting_ledger_totals() from public, anon;
grant execute on function public.accounting_ledger_totals() to authenticated;

create or replace function public.doctor_ledger_patient_page(
  p_search text default '',
  p_balance_filter text default 'all',
  p_sort text default 'name',
  p_direction text default 'asc',
  p_offset integer default 0,
  p_limit integer default 10
)
returns table (
  patient_id uuid,
  full_name text,
  mobile text,
  balance_paise bigint,
  last_visit date,
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
    or p_balance_filter not in ('all', 'due', 'credit', 'settled')
    or p_sort not in ('name', 'balance', 'last_visit')
    or p_direction not in ('asc', 'desc')
    or p_offset not between 0 and 1000000
    or p_limit not between 1 and 100 then
    raise exception 'Invalid ledger page parameters' using errcode = '22023';
  end if;

  return query
  with patient_rows as (
    select
      patient.id,
      patient.full_name,
      patient.mobile,
      coalesce(balance.balance_paise, 0)::bigint as balance_paise,
      visit.last_visit
    from public.patients patient
    left join public.patient_balances balance on balance.patient_id = patient.id
    left join lateral (
      select max(visit_row.visit_date) as last_visit
      from public.visits visit_row
      where visit_row.patient_id = patient.id
    ) visit on true
    where (p_search = ''
      or patient.full_name ilike '%' || p_search || '%'
      or patient.mobile ilike '%' || p_search || '%')
      and (
        p_balance_filter = 'all'
        or (p_balance_filter = 'due' and coalesce(balance.balance_paise, 0) > 0)
        or (p_balance_filter = 'credit' and coalesce(balance.balance_paise, 0) < 0)
        or (p_balance_filter = 'settled' and coalesce(balance.balance_paise, 0) = 0)
      )
  )
  select
    rows.id,
    rows.full_name,
    rows.mobile,
    rows.balance_paise,
    rows.last_visit,
    count(*) over ()::bigint
  from patient_rows rows
  order by
    case when p_sort = 'name' and p_direction = 'asc' then rows.full_name end asc,
    case when p_sort = 'name' and p_direction = 'desc' then rows.full_name end desc,
    case when p_sort = 'balance' and p_direction = 'asc' then rows.balance_paise end asc,
    case when p_sort = 'balance' and p_direction = 'desc' then rows.balance_paise end desc,
    case when p_sort = 'last_visit' and p_direction = 'asc' then rows.last_visit end asc nulls first,
    case when p_sort = 'last_visit' and p_direction = 'desc' then rows.last_visit end desc nulls last,
    rows.id
  offset p_offset
  limit p_limit;
end;
$$;
revoke all on function public.doctor_ledger_patient_page(text, text, text, text, integer, integer) from public, anon;
grant execute on function public.doctor_ledger_patient_page(text, text, text, text, integer, integer) to authenticated;

create or replace function public.patient_ledger_summary(p_patient_id uuid)
returns table (
  opening_dues_paise bigint,
  credit_charges_paise bigint,
  collected_paise bigint,
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
  if p_patient_id is null or not exists (
    select 1 from public.patients where id = p_patient_id
  ) then
    raise exception 'Patient not found' using errcode = 'P0002';
  end if;

  return query
  select
    coalesce(sum(case
      when entry.entry_type = 'opening_balance' then entry.amount_paise
      when entry.entry_type = 'reversal' and original.entry_type = 'opening_balance'
        then entry.amount_paise
      else 0
    end), 0)::bigint,
    coalesce(sum(case
      when entry.entry_type = 'charge' then entry.amount_paise
      when entry.entry_type = 'reversal' and original.entry_type = 'charge'
        then entry.amount_paise
      else 0
    end), 0)::bigint,
    coalesce(sum(case
      when entry.entry_type = 'payment' then -entry.amount_paise
      when entry.entry_type = 'reversal' and original.entry_type = 'payment'
        then -entry.amount_paise
      else 0
    end), 0)::bigint,
    coalesce(sum(entry.amount_paise), 0)::bigint
  from public.ledger_entries entry
  left join public.ledger_entries original on original.id = entry.reverses_entry_id
  where entry.patient_id = p_patient_id;
end;
$$;
revoke all on function public.patient_ledger_summary(uuid) from public, anon;
grant execute on function public.patient_ledger_summary(uuid) to authenticated;

commit;
