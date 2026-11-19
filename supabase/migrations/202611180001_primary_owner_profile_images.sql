begin;

alter table public.clinic_profile
  add column if not exists registration_info text not null default ''
  check (length(registration_info) <= 300);

create or replace view public.public_clinic_profile
with (security_barrier = true) as
select
  clinic_name,
  doctor_name,
  qualification,
  public_introduction,
  doctor_photo_url,
  public_phone,
  public_whatsapp,
  speciality,
  registration_info
from public.clinic_profile
where singleton = true;

grant select on public.public_clinic_profile to anon, authenticated;
revoke all on public.public_clinic_profile from public;

insert into public.clinic_profile as current_profile (singleton, clinic_name, doctor_name)
values (true, 'Sarthak Clinic', 'Subhal Thakur')
on conflict (singleton) do update
set doctor_name = case
  when btrim(current_profile.doctor_name) = '' then excluded.doctor_name
  else current_profile.doctor_name
end;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clinic-profile-images',
  'clinic-profile-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "authorized doctors read profile images"
on storage.objects for select to authenticated
using (
  bucket_id = 'clinic-profile-images'
  and public.is_authorized_doctor()
);

create policy "authorized doctors upload profile images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'clinic-profile-images'
  and public.is_authorized_doctor()
);

create policy "authorized doctors replace profile images"
on storage.objects for update to authenticated
using (
  bucket_id = 'clinic-profile-images'
  and public.is_authorized_doctor()
)
with check (
  bucket_id = 'clinic-profile-images'
  and public.is_authorized_doctor()
);

create policy "authorized doctors delete profile images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'clinic-profile-images'
  and public.is_authorized_doctor()
);

commit;
