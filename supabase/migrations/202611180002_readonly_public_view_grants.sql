begin;

do $$
declare
  authorization_helper_count integer;
  invoker_view_count integer;
  rls_table_count integer;
begin
  select count(*)
  into invoker_view_count
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('patient_balances', 'accounting_summary')
    and c.relkind = 'v'
    and c.reloptions @> array['security_invoker=true'];

  if invoker_view_count <> 2 then
    raise exception 'Patient and accounting views must remain security-invoker views';
  end if;

  select count(*)
  into rls_table_count
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('authorized_doctors', 'patients', 'ledger_entries', 'ledger_people')
    and c.relkind in ('r', 'p')
    and c.relrowsecurity;

  if rls_table_count <> 4 then
    raise exception 'Doctor authorization, patient, and ledger tables must have row-level security enabled';
  end if;

  select count(*)
  into authorization_helper_count
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'is_authorized_doctor'
    and p.pronargs = 0
    and p.prorettype = 'boolean'::regtype
    and p.prosecdef
    and p.provolatile = 's'
    and p.proconfig = array['search_path=pg_catalog, public']::text[]
    and regexp_replace(lower(p.prosrc), '[[:space:]]+', '', 'g') =
      'selectexists(select1frompublic.authorized_doctorswhereuser_id=auth.uid());'
    and not has_function_privilege('anon', p.oid, 'EXECUTE')
    and has_function_privilege('authenticated', p.oid, 'EXECUTE');

  if authorization_helper_count <> 1 then
    raise exception 'Doctor authorization helper must match the security-reviewed definition';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('authorized_doctors', 'patients', 'ledger_entries', 'ledger_people')
      and permissive = 'PERMISSIVE'
      and not (
        (tablename = 'authorized_doctors' and policyname = 'doctor can read own authorization')
        or (tablename = 'patients' and policyname = 'authorized doctor manages patients')
        or (tablename = 'ledger_entries' and policyname = 'authorized doctor reads ledger')
        or (tablename = 'ledger_people' and policyname = 'authorized doctor reads ledger people')
      )
  ) then
    raise exception 'Unexpected permissive policy found on doctor authorization, patient, or ledger tables';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and policyname = 'doctor can read own authorization'
      and tablename = 'authorized_doctors'
      and permissive = 'PERMISSIVE'
      and roles = array['authenticated']::name[]
      and cmd = 'SELECT'
      and regexp_replace(lower(coalesce(qual, '')), '[[:space:]]+', '', 'g') =
        '(user_id=auth.uid())'
      and with_check is null
  ) or not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'patients'
      and policyname = 'authorized doctor manages patients'
      and permissive = 'PERMISSIVE'
      and roles = array['authenticated']::name[]
      and 'authenticated' = any(roles)
      and cmd = 'ALL'
      and regexp_replace(lower(coalesce(qual, '')), '[[:space:]]+', '', 'g')
        in ('is_authorized_doctor()', 'public.is_authorized_doctor()')
      and regexp_replace(lower(coalesce(with_check, '')), '[[:space:]]+', '', 'g')
        in ('is_authorized_doctor()', 'public.is_authorized_doctor()')
  ) or not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'ledger_entries'
      and policyname = 'authorized doctor reads ledger'
      and permissive = 'PERMISSIVE'
      and roles = array['authenticated']::name[]
      and 'authenticated' = any(roles)
      and cmd = 'SELECT'
      and regexp_replace(lower(coalesce(qual, '')), '[[:space:]]+', '', 'g')
        in ('is_authorized_doctor()', 'public.is_authorized_doctor()')
      and with_check is null
  ) or not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'ledger_people'
      and policyname = 'authorized doctor reads ledger people'
      and permissive = 'PERMISSIVE'
      and roles = array['authenticated']::name[]
      and 'authenticated' = any(roles)
      and cmd = 'SELECT'
      and regexp_replace(lower(coalesce(qual, '')), '[[:space:]]+', '', 'g')
        in ('is_authorized_doctor()', 'public.is_authorized_doctor()')
      and with_check is null
  ) then
    raise exception 'Authorization, patient, and ledger policies do not match the reviewed doctor-only policy set';
  end if;
end;
$$;

revoke all privileges on table
  public.public_clinic_profile,
  public.public_clinic_locations,
  public.public_clinic_services,
  public.public_availability
from public, anon, authenticated;

grant select on table
  public.public_clinic_profile,
  public.public_clinic_locations,
  public.public_clinic_services,
  public.public_availability
to anon, authenticated;

revoke all privileges on table
  public.patient_balances,
  public.accounting_summary
from public, anon, authenticated;

grant select on table
  public.patient_balances,
  public.accounting_summary
to authenticated;

commit;
