begin;

create or replace function public.submit_public_booking(
  p_patient_name text,
  p_mobile text,
  p_session_id uuid,
  p_preferred_time time,
  p_age integer,
  p_reason text,
  p_privacy_acknowledged boolean,
  p_idempotency_key uuid,
  p_doctor_id uuid
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  selected_session public.availability_sessions%rowtype;
  existing_booking public.appointments%rowtype;
  selected_doctor jsonb;
  doctor_schedule jsonb;
  compact_mobile text;
  normalized_mobile text;
  current_bookings integer;
  new_reference text;
  doctor_schedule_matches boolean := false;
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
      or existing_booking.doctor_id is distinct from p_doctor_id
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
      or existing_booking.doctor_id is distinct from p_doctor_id
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
    or selected_session.session_date + selected_session.ends_at
      <= (clock_timestamp() at time zone 'Asia/Kolkata') then
    raise exception 'Session is not accepting bookings' using errcode = 'P0001';
  end if;

  if p_doctor_id is not null then
    select details into selected_doctor
    from public.clinic_doctors
    where id = p_doctor_id and details->>'status' = 'Active'
    for share;
    if not found then
      raise exception 'Doctor is not available for booking' using errcode = 'P0001';
    end if;

    doctor_schedule := selected_doctor->'schedule';
    if doctor_schedule->>'type' = 'weekly' then
      doctor_schedule_matches :=
        coalesce(
          doctor_schedule->'days' ? (
            case extract(isodow from selected_session.session_date)::integer
              when 1 then 'Monday'
              when 2 then 'Tuesday'
              when 3 then 'Wednesday'
              when 4 then 'Thursday'
              when 5 then 'Friday'
              when 6 then 'Saturday'
              else 'Sunday'
            end
          ),
          false
        )
        and selected_session.starts_at >= (doctor_schedule->>'startTime')::time
        and selected_session.ends_at <= (doctor_schedule->>'endTime')::time;
    elsif doctor_schedule->>'type' = 'specific' then
      doctor_schedule_matches :=
        doctor_schedule->>'date' = selected_session.session_date::text
        and selected_session.starts_at >= (doctor_schedule->>'startTime')::time
        and selected_session.ends_at <= (doctor_schedule->>'endTime')::time;
    end if;
    if not doctor_schedule_matches then
      raise exception 'Session is outside the doctor availability' using errcode = 'P0001';
    end if;
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
    booking_reference, idempotency_key, session_id, doctor_id, patient_name, mobile,
    preferred_time, age, reason, privacy_acknowledged
  ) values (
    new_reference, p_idempotency_key, p_session_id, p_doctor_id, btrim(p_patient_name),
    normalized_mobile, p_preferred_time, p_age, nullif(btrim(p_reason), ''),
    p_privacy_acknowledged
  );
  return new_reference;
end;
$$;

notify pgrst, 'reload schema';
commit;
