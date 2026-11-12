begin;

alter table public.clinic_profile
  add column if not exists speciality text
  check (speciality is null or length(speciality) <= 120);

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
  speciality
from public.clinic_profile
where singleton = true;

grant select on public.public_clinic_profile to anon, authenticated;
revoke all on public.public_clinic_profile from public;

commit;
