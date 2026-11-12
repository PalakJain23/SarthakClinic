import Link from "next/link";
import { CalendarDays, CircleDollarSign, ClipboardCheck, Clock3, UserPlus } from "lucide-react";
import { indiaDate, formatRupees } from "@/lib/format";
import { requireDoctor } from "@/lib/doctor-auth";

export const dynamic = "force-dynamic";

export default async function DoctorOverviewPage() {
  const { supabase } = await requireDoctor();
  const today = indiaDate();
  const sessionResult = await supabase
    .from("availability_sessions")
    .select("id, session_date, starts_at, ends_at, bookings_enabled, is_blocked, clinic_locations(name, public_address)")
    .eq("session_date", today)
    .order("starts_at");
  if (sessionResult.error) throw new Error(`Could not load today’s schedule: ${sessionResult.error.message}`);
  const sessions = sessionResult.data ?? [];
  const sessionIds = sessions.map((session) => session.id);
  const [appointmentResult, summaryResult] = await Promise.all([
    sessionIds.length
      ? supabase
          .from("appointments")
          .select("id, patient_name, mobile, status, preferred_time, needs_contact, session_id")
          .in("session_id", sessionIds)
          .neq("status", "cancelled")
          .order("created_at")
      : Promise.resolve({ data: [], error: null }),
    supabase.from("accounting_summary").select("*").maybeSingle(),
  ]);
  if (appointmentResult.error) throw new Error(`Could not load today’s appointments: ${appointmentResult.error.message}`);
  if (summaryResult.error) throw new Error(`Could not load the account summary: ${summaryResult.error.message}`);
  const appointments = appointmentResult.data ?? [];
  const locationNames = new Map(
    sessions.map((session) => [
      session.id,
      (session.clinic_locations as unknown as { name: string } | null)?.name ?? "Location",
    ]),
  );
  const requested = appointments.filter((item) => item.status === "requested").length;
  const completed = appointments.filter((item) => item.status === "completed").length;
  const outstanding = summaryResult.data?.outstanding_paise ?? 0;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Overview</h1>
          <p className="mt-1 text-slate-600">Today · {today} · Asia/Kolkata</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 font-semibold text-white" href="/doctor/patients?add=1"><UserPlus size={17} aria-hidden="true" /> Add patient</Link>
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-800" href="/doctor/availability"><Clock3 size={17} aria-hidden="true" /> Change timing</Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Today's summary">
        <SummaryCard icon={<CalendarDays size={19} />} label="Today’s appointments" value={appointments.length.toString()} />
        <SummaryCard icon={<Clock3 size={19} />} label="Pending requests" value={requested.toString()} />
        <SummaryCard icon={<ClipboardCheck size={19} />} label="Completed consultations" value={completed.toString()} />
        <SummaryCard icon={<CircleDollarSign size={19} />} label="Total outstanding" value={formatRupees(outstanding)} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-950">Today’s locations and sessions</h2>
        {sessions.length === 0 ? (
          <p className="mt-3 rounded-lg bg-slate-50 p-4 text-slate-700">No schedule is configured for today. Add a session in Availability.</p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {sessions.map((session) => (
              <li key={session.id} className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold">{(session.clinic_locations as unknown as { name: string } | null)?.name ?? "Location"}</p>
                <p className="mt-1 text-sm text-slate-600">{session.starts_at.slice(0, 5)}–{session.ends_at.slice(0, 5)} · {session.bookings_enabled && !session.is_blocked ? "Bookings open" : "Bookings closed"}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <h2 className="text-lg font-bold text-slate-950">Today’s patient list</h2>
          <Link href="/doctor/appointments" className="text-sm font-semibold text-[var(--primary)] underline underline-offset-2">All appointments</Link>
        </div>
        {appointments.length === 0 ? (
          <p className="p-5 text-slate-600">No appointments for today.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-semibold text-slate-950">{appointment.patient_name}</p>
                  <p className="mt-1 text-sm text-slate-600">{appointment.mobile} · {locationNames.get(appointment.session_id)} · {appointment.status}</p>
                  {appointment.needs_contact && <p className="mt-1 text-sm font-semibold text-amber-800">Schedule changed — contact patient</p>}
                </div>
                <div className="flex gap-2">
                  <a href={`tel:${appointment.mobile}`} className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Call</a>
                  <a href={`https://wa.me/${appointment.mobile.replace("+", "")}`} target="_blank" rel="noreferrer" className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">WhatsApp</a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-[var(--primary)]">{icon}<span className="text-sm font-medium text-slate-600">{label}</span></div>
      <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
    </article>
  );
}
