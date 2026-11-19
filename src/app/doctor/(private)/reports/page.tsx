import { formatDate, formatRupees, indiaDate } from "@/lib/format";
import { requireDoctor } from "@/lib/doctor-auth";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = indiaDate();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "") ? params.from! : today.slice(0, 7) + "-01";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "") ? params.to! : today;
  const { supabase } = await requireDoctor();
  const [periodResult, totalsResult, appointmentCountResult, completedCountResult, outstandingResult] = await Promise.all([
    supabase.rpc("accounting_period_summary", { p_from: from, p_to: to }),
    supabase.rpc("accounting_ledger_totals"),
    supabase
      .from("appointments")
      .select("id, availability_sessions!inner(session_date)", { count: "exact", head: true })
      .neq("status", "cancelled")
      .gte("availability_sessions.session_date", from)
      .lte("availability_sessions.session_date", to),
    supabase
      .from("appointments")
      .select("id, availability_sessions!inner(session_date)", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("availability_sessions.session_date", from)
      .lte("availability_sessions.session_date", to),
    supabase.from("accounting_summary").select("outstanding_paise, patients_owing").maybeSingle(),
  ]);
  const failed = [periodResult, totalsResult, appointmentCountResult, completedCountResult, outstandingResult].find((result) => result.error);
  if (failed?.error) throw new Error(`Could not load reports: ${failed.error.message}`);
  const period = periodResult.data?.[0];
  const totals = totalsResult.data?.[0];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-emerald-700">Clinic reports · Asia/Kolkata</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">Reports</h1>
        <p className="mt-1 text-slate-600">Appointments use their saved clinic-session dates. Financial figures include recorded ledger transactions only.</p>
      </header>
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-emerald-100 bg-white p-4">
        <label className="text-sm font-semibold">From <input name="from" type="date" required defaultValue={from} className="field-control" /></label>
        <label className="text-sm font-semibold">To <input name="to" type="date" required defaultValue={to} className="field-control" /></label>
        <button className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white">Update report</button>
      </form>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportMetric label="Appointments in selected dates" value={String(appointmentCountResult.count ?? 0)} note={`${formatDate(from)} – ${formatDate(to)} · excludes cancelled`} />
        <ReportMetric label="Completed appointments" value={String(completedCountResult.count ?? 0)} note="Based on saved appointment status" />
        <ReportMetric label="Net charges" value={formatRupees(period?.charges_paise ?? 0)} note="Selected date range · after reversals" />
        <ReportMetric label="Net payments collected" value={formatRupees(period?.collections_paise ?? 0)} note="Selected date range · after reversals" />
      </section>
      <section className="rounded-2xl border border-emerald-100 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-950">All-time account position</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReportValue label="Total outstanding" value={formatRupees(outstandingResult.data?.outstanding_paise ?? 0)} />
          <ReportValue label="Accounts with positive balance" value={String(outstandingResult.data?.patients_owing ?? 0)} />
          <ReportValue label="Net credit charges" value={formatRupees(totals?.credit_charges_paise ?? 0)} />
          <ReportValue label="Opening dues (separate)" value={formatRupees(totals?.opening_dues_paise ?? 0)} />
        </dl>
        <p className="mt-4 text-xs leading-5 text-slate-500">All figures are derived from saved records. Opening dues are separate from new charges; signed corrections and reversals are reflected in outstanding balances and account histories.</p>
      </section>
    </div>
  );
}

function ReportMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-4">
    <p className="text-sm font-semibold text-slate-700">{label}</p>
    <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{note}</p>
  </article>;
}

function ReportValue({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 text-lg font-bold text-slate-950">{value}</dd></div>;
}
