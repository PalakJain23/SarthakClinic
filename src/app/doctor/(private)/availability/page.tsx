import { BlockDateForm, SessionForm, SessionUpdateForm, StandardLocationsForm } from "@/components/doctor-forms";
import { indiaDate } from "@/lib/format";
import { requireDoctor } from "@/lib/doctor-auth";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const { supabase } = await requireDoctor();
  const today = indiaDate();
  const upperDate = indiaDate(60);
  const [locationResult, sessionResult, blockedResult] = await Promise.all([
    supabase.from("public_clinic_locations").select("id, name").order("sort_order"),
    supabase
      .from("availability_sessions")
      .select("id, session_date, location_id, starts_at, ends_at, capacity, bookings_enabled, is_blocked, public_note, private_note, clinic_locations(name)")
      .gte("session_date", today)
      .lte("session_date", upperDate)
      .order("session_date")
      .order("starts_at"),
    supabase.from("blocked_dates").select("blocked_date, reason").gte("blocked_date", today).order("blocked_date"),
  ]);
  if (locationResult.error) throw new Error(`Could not load locations: ${locationResult.error.message}`);
  if (sessionResult.error) throw new Error(`Could not load availability: ${sessionResult.error.message}`);
  if (blockedResult.error) throw new Error(`Could not load blocked dates: ${blockedResult.error.message}`);
  const activeLocationNames = new Set((locationResult.data ?? []).map(({ name }) => name));
  const showStandardLocationSetup =
    !activeLocationNames.has("Village consultation") ||
    !activeLocationNames.has("Sarthak Clinic, Ashta");

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-2xl font-bold text-slate-950">Availability</h1>
        <p className="mt-1 text-slate-600">Manage dated sessions and public booking status. Closing or changing a booked session flags affected visits without cancelling or moving them.</p>
      </header>
      {showStandardLocationSetup && <StandardLocationsForm />}
      <SessionForm locations={locationResult.data ?? []} />
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-950">Block a day</h2>
        <BlockDateForm />
        {(blockedResult.data ?? []).length > 0 && (
          <ul className="space-y-2">
            {(blockedResult.data ?? []).map((blocked) => (
              <li key={blocked.blocked_date} className="rounded-lg border border-amber-200 bg-white p-3 text-sm">
                <strong>{blocked.blocked_date}</strong>{blocked.reason ? ` · ${blocked.reason}` : ""} · Public bookings closed
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-950">Upcoming sessions · next 60 days</h2>
        {(sessionResult.data ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-slate-600">No sessions are configured.</p>
        ) : (
          (sessionResult.data ?? []).map((session) => (
            <article key={session.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="font-semibold text-slate-950">
                {(session.clinic_locations as unknown as { name: string } | null)?.name ?? "Location"} · {session.session_date} · {session.starts_at.slice(0, 5)}–{session.ends_at.slice(0, 5)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Capacity {session.capacity} · {session.is_blocked ? "Blocked" : session.bookings_enabled ? "Bookings open" : "Bookings closed"}
              </p>
              <div className="mt-4"><SessionUpdateForm session={session} locations={locationResult.data ?? []} /></div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
