import { AppointmentWorkspace, type AppointmentRecord, type AppointmentSessionOption, type AppointmentDoctorOption } from "@/components/appointment-workspace";
import { indiaDate } from "@/lib/format";
import { requireDoctor } from "@/lib/doctor-auth";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const { supabase } = await requireDoctor();
  const today = indiaDate();
  const future = indiaDate(90);
  const [appointmentResult, patientResult, sessionResult, doctorResult, doctorAssignmentResult] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, booking_reference, patient_id, patient_name, mobile, status, preferred_time, reason, needs_contact, session_id, created_at, availability_sessions!inner(id, session_date, starts_at, ends_at, public_note, private_note, clinic_locations(name, public_address))")
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase.from("patients").select("id, full_name, mobile").order("full_name").limit(1000),
    supabase
      .from("availability_sessions")
      .select("id, session_date, starts_at, ends_at, private_note, clinic_locations(name, public_address)")
      .gte("session_date", today)
      .lte("session_date", future)
      .order("session_date")
      .order("starts_at"),
    supabase
      .from("clinic_doctors")
      .select("id, details")
      .order("created_at"),
    supabase
      .from("appointments")
      .select("id, doctor_id"),
  ]);
  if (appointmentResult.error) throw new Error(`Could not load appointments: ${appointmentResult.error.message}`);
  if (patientResult.error) throw new Error(`Could not load patient options: ${patientResult.error.message}`);
  if (sessionResult.error) throw new Error(`Could not load appointment sessions: ${sessionResult.error.message}`);

  const doctorIdByAppointment = new Map(
    (doctorAssignmentResult.data ?? []).map((row) =>
      [row.id, (row as unknown as { doctor_id?: string | null }).doctor_id ?? null] as const
    ),
  );

  const appointments: AppointmentRecord[] = (appointmentResult.data ?? []).flatMap((row) => {
    const session = row.availability_sessions as unknown as {
      id: string;
      session_date: string;
      starts_at: string;
      ends_at: string;
      public_note: string | null;
      private_note: string | null;
      clinic_locations: { name: string; public_address: string } | null;
    } | null;
    if (!session) return [];
    return [{
      id: row.id,
      bookingReference: row.booking_reference,
      patientId: row.patient_id,
      patientName: row.patient_name,
      mobile: row.mobile,
      reason: row.reason,
      status: row.status,
      preferredTime: row.preferred_time,
      needsContact: row.needs_contact,
      createdAt: row.created_at,
      doctorId: doctorIdByAppointment.get(row.id) ?? null,
      session: {
        id: session.id,
        date: session.session_date,
        startsAt: session.starts_at,
        endsAt: session.ends_at,
        locationName: session.clinic_locations?.name ?? "Clinic",
        locationAddress: session.clinic_locations?.public_address ?? "",
        publicNote: session.public_note,
        privateNote: session.private_note,
      },
    }];
  });
  const sessions: AppointmentSessionOption[] = (sessionResult.data ?? []).map((row) => ({
    id: row.id,
    date: row.session_date,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    locationName: (row.clinic_locations as unknown as { name: string } | null)?.name ?? "Clinic",
    locationAddress: (row.clinic_locations as unknown as { public_address: string } | null)?.public_address ?? "",
    privateNote: row.private_note,
  }));
  for (const appointment of appointments) {
    if (!sessions.some((session) => session.id === appointment.session.id)) {
      sessions.push({
        id: appointment.session.id,
        date: appointment.session.date,
        startsAt: appointment.session.startsAt,
        endsAt: appointment.session.endsAt,
        locationName: appointment.session.locationName,
        locationAddress: appointment.session.locationAddress,
        privateNote: appointment.session.privateNote,
      });
    }
  }
  sessions.sort((left, right) => left.date.localeCompare(right.date) || left.startsAt.localeCompare(right.startsAt));
  const doctors: AppointmentDoctorOption[] = (doctorResult.data ?? []).flatMap((row) => {
    const details = row.details as {
      fullName?: unknown;
      specialty?: unknown;
      status?: unknown;
    } | null;
    if (
      !details ||
      typeof details.fullName !== "string" ||
      typeof details.specialty !== "string" ||
      details.status !== "Active"
    ) {
      return [];
    }
    return [{ id: row.id, name: details.fullName, specialty: details.specialty }];
  });

  return (
    <AppointmentWorkspace
      today={today}
      appointments={appointments}
      sessions={sessions}
      doctors={doctors}
      patients={(patientResult.data ?? []).map((patient) => ({
        id: patient.id,
        fullName: patient.full_name,
        mobile: patient.mobile,
      }))}
    />
  );
}
