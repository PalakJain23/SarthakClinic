-- Apply this reviewed migration individually to the confirmed project.
-- Does not replay prior migrations or modify patient, appointment or ledger data.
begin;

create table public.clinic_doctors (
  id uuid primary key,
  details jsonb not null check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id),
  constraint doctor_name_required check (
    details ? 'fullName' and jsonb_typeof(details->'fullName') = 'string'
    and length(btrim(details->>'fullName')) between 1 and 120
  ),
  constraint doctor_status_required check (
    details ? 'status' and details->>'status' in ('Active', 'Inactive')
  )
);
alter table public.clinic_doctors enable row level security;
revoke all on public.clinic_doctors from public, anon, authenticated;
grant select, insert, update on public.clinic_doctors to authenticated;
create policy "authorized administrators read doctor directory"
  on public.clinic_doctors for select to authenticated
  using (public.is_authorized_doctor());
create policy "authorized administrators add doctors"
  on public.clinic_doctors for insert to authenticated
  with check (public.is_authorized_doctor() and updated_by = auth.uid());
create policy "authorized administrators edit doctors"
  on public.clinic_doctors for update to authenticated
  using (public.is_authorized_doctor())
  with check (public.is_authorized_doctor() and updated_by = auth.uid());

-- Owner remains in the original singleton profile, never a removable directory row.
insert into public.clinic_profile (singleton, clinic_name, doctor_name)
values (true, 'Sarthak Clinic', 'Subhal Singh Thakur')
on conflict (singleton) do update set doctor_name = excluded.doctor_name;

-- Public headshots only; no patient documents belong in this bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clinic-profile-images', 'clinic-profile-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "directory administrators upload headshots"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'clinic-profile-images' and public.is_authorized_doctor());
create policy "directory administrators read headshots"
  on storage.objects for select to authenticated
  using (bucket_id = 'clinic-profile-images' and public.is_authorized_doctor());
create policy "directory administrators remove unpublished headshots"
  on storage.objects for delete to authenticated
  using (bucket_id = 'clinic-profile-images' and public.is_authorized_doctor());

notify pgrst, 'reload schema';
commit;
