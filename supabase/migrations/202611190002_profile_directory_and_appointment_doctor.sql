begin;

alter table public.clinic_profile
  add column if not exists speciality text
  check (speciality is null or length(speciality) <= 120);

alter table public.clinic_profile
  add column if not exists registration_info text not null default ''
  check (length(registration_info) <= 300);

alter table public.clinic_profile
  add column if not exists doctor_photo_url text;

revoke all on public.clinic_profile from public, anon, authenticated;
grant select, insert, update on public.clinic_profile to authenticated;

create table if not exists public.clinic_doctors (
  id uuid primary key,
  details jsonb not null check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id),
  constraint doctor_name_required check (
    details ? 'fullName'
    and jsonb_typeof(details->'fullName') = 'string'
    and length(btrim(details->>'fullName')) between 1 and 120
  ),
  constraint doctor_status_required check (
    details ? 'status'
    and details->>'status' in ('Active', 'Inactive')
  )
);

alter table public.clinic_doctors enable row level security;
revoke all on public.clinic_doctors from public, anon, authenticated;
grant select, insert, update on public.clinic_doctors to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'clinic_doctors'
      and policyname = 'authorized administrators read doctor directory'
  ) then
    create policy "authorized administrators read doctor directory"
      on public.clinic_doctors for select to authenticated
      using (public.is_authorized_doctor());
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'clinic_doctors'
      and policyname = 'authorized administrators add doctors'
  ) then
    create policy "authorized administrators add doctors"
      on public.clinic_doctors for insert to authenticated
      with check (public.is_authorized_doctor() and updated_by = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'clinic_doctors'
      and policyname = 'authorized administrators edit doctors'
  ) then
    create policy "authorized administrators edit doctors"
      on public.clinic_doctors for update to authenticated
      using (public.is_authorized_doctor())
      with check (public.is_authorized_doctor() and updated_by = auth.uid());
  end if;
end;
$$;

alter table public.appointments
  add column if not exists doctor_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_doctor_id_fkey'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_doctor_id_fkey
      foreign key (doctor_id) references public.clinic_doctors(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists appointments_doctor_idx
  on public.appointments (doctor_id);

grant select, insert, update on public.appointments to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clinic-profile-images',
  'clinic-profile-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'directory administrators upload headshots'
  ) then
    create policy "directory administrators upload headshots"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'clinic-profile-images'
        and public.is_authorized_doctor()
      );
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'directory administrators remove headshots'
  ) then
    create policy "directory administrators remove headshots"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'clinic-profile-images'
        and public.is_authorized_doctor()
      );
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
