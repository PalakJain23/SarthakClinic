import { notFound } from "next/navigation";
import Link from "next/link";
import {
  LedgerEntryForm,
  PatientDetailsForm,
  CorrectLedgerTransaction,
  VisitForm,
} from "@/components/doctor-forms";
import { formatDate, formatRupees } from "@/lib/format";
import { requireDoctor } from "@/lib/doctor-auth";

export const dynamic = "force-dynamic";

type LedgerPageEntry = {
  id: string;
  entry_type: string;
  amount_paise: number | string;
  description: string;
  effective_at: string;
  correction_reason: string | null;
  has_reversal: boolean;
  running_balance: number | string;
  total_count: number | string;
};

function ledgerEntryLabel(type: string) {
  switch (type) {
    case "opening_balance": return "Old dues";
    case "charge": return "Udhaar";
    case "payment": return "Payment";
    case "reversal": return "Canceled transaction";
    case "correction": return "Correction";
    default: return type;
  }
}

export default async function PatientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<{ tab?: string; offset?: string }>;
}) {
  const { patientId } = await params;
  const { tab: requestedTab, offset: offsetValue } = await searchParams;
  const offset = /^\d+$/.test(offsetValue ?? "") ? Math.min(Number(offsetValue), 1_000_000) : 0;
  const pageSize = 100;
  if (!/^[0-9a-f-]{36}$/i.test(patientId)) notFound();
  const tab = ["details", "visits", "account"].includes(requestedTab ?? "")
    ? requestedTab!
    : "details";
  const { supabase } = await requireDoctor();
  const [patientResult, visitsResult, appointmentResult, balanceResult, ledgerSummaryResult, ledgerResult] =
    await Promise.all([
      supabase.from("patients").select("*").eq("id", patientId).maybeSingle(),
      supabase
        .from("visits")
        .select("id, visit_date, notes, appointment_id, created_at")
        .eq("patient_id", patientId)
        .order("visit_date", { ascending: false }),
      supabase
        .from("appointments")
        .select("id, session_id, status, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
      supabase
        .from("patient_balances")
        .select("balance_paise")
        .eq("patient_id", patientId)
        .maybeSingle(),
      supabase.rpc("patient_ledger_summary", { p_patient_id: patientId }),
      supabase.rpc("patient_ledger_page", {
        p_patient_id: patientId,
        p_offset: offset,
        p_limit: pageSize,
      }),
    ]);
  if (patientResult.error) throw new Error(`Could not load patient: ${patientResult.error.message}`);
  if (!patientResult.data) notFound();
  if (visitsResult.error) throw new Error(`Could not load visits: ${visitsResult.error.message}`);
  if (appointmentResult.error) throw new Error(`Could not load appointment history: ${appointmentResult.error.message}`);
  if (balanceResult.error) throw new Error(`Could not load the patient balance: ${balanceResult.error.message}`);
  if (ledgerSummaryResult.error) throw new Error(`Could not load the patient ledger summary: ${ledgerSummaryResult.error.message}`);
  if (ledgerResult.error) throw new Error(`Could not load the patient ledger: ${ledgerResult.error.message}`);
  const ledgerSummary = ledgerSummaryResult.data?.[0];
  if (!ledgerSummary) throw new Error("Could not load the patient ledger summary.");

  const patient = patientResult.data;
  const sessionsIds = [...new Set((appointmentResult.data ?? []).map((appointment) => appointment.session_id))];
  const { data: sessions, error: sessionError } = sessionsIds.length
    ? await supabase.from("availability_sessions").select("id, session_date, starts_at, clinic_locations(name)").in("id", sessionsIds)
    : { data: [], error: null };
  if (sessionError) throw new Error(`Could not load appointment history: ${sessionError.message}`);
  const sessionById = new Map((sessions ?? []).map((session) => [session.id, session]));
  const entries: LedgerPageEntry[] = ledgerResult.data ?? [];
  const balance = BigInt(balanceResult.data?.balance_paise ?? 0);
  if (balance !== BigInt(ledgerSummary.balance_paise)) {
    throw new Error("The patient balance and financial summary do not agree.");
  }
  const ledgerTotal = Number(entries[0]?.total_count ?? 0);
  const tabs = [
    { key: "details", label: "Details" },
    { key: "visits", label: "Visits" },
    { key: "account", label: "Account" },
  ];

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-5">
        <Link href="/doctor/patients" className="text-sm font-semibold text-[var(--primary)] underline underline-offset-2">← Patients</Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-2xl font-bold text-slate-950">{patient.full_name}</h1><p className="mt-1 text-slate-600">{patient.mobile}{patient.age ? ` · ${patient.age} years` : ""}</p></div>
          <p className="text-sm font-semibold">{balance > 0n ? "Due " : balance < 0n ? "Credit " : "Balance "}{formatRupees(balance < 0n ? -balance : balance)}</p>
        </div>
      </header>
      <nav aria-label="Patient record sections" className="flex gap-2 overflow-x-auto">
        {tabs.map((item) => (
          <Link key={item.key} href={`/doctor/patients/${patientId}?tab=${item.key}`} aria-current={tab === item.key ? "page" : undefined} className={`min-h-11 rounded-lg border px-4 py-2.5 text-sm font-semibold ${tab === item.key ? "border-teal-700 bg-teal-50 text-teal-950" : "border-slate-300 bg-white text-slate-700"}`}>{item.label}</Link>
        ))}
      </nav>

      {tab === "details" && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Patient details</h2>
          <PatientDetailsForm patient={{ id: patient.id, full_name: patient.full_name, age: patient.age, private_notes: patient.private_notes }} />
        </section>
      )}

      {tab === "visits" && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Visits and consultation notes</h2>
          <VisitForm
            patientId={patientId}
            appointments={(appointmentResult.data ?? []).map((appointment) => {
              const session = sessionById.get(appointment.session_id);
              return {
                id: appointment.id,
                label: `${session?.session_date ?? ""} · ${appointment.status}`,
              };
            })}
          />
          {(visitsResult.data ?? []).length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-slate-600">No visit records yet.</p>
          ) : (
            <ul className="space-y-3">
              {(visitsResult.data ?? []).map((visit) => (
                <li key={visit.id} className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="font-semibold">{formatDate(visit.visit_date)}</p>
                  {visit.appointment_id && <p className="mt-1 text-xs text-slate-500">Linked appointment</p>}
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{visit.notes || "No notes recorded."}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold">Appointment history</h3>
            {(appointmentResult.data ?? []).length === 0 ? <p className="mt-2 text-sm text-slate-600">No linked appointments yet.</p> : (
              <ul className="mt-3 divide-y divide-slate-100">
                {(appointmentResult.data ?? []).map((appointment) => {
                  const session = sessionById.get(appointment.session_id);
                  return <li key={appointment.id} className="py-3 text-sm text-slate-700">{session?.session_date} · {(session?.clinic_locations as unknown as { name: string } | null)?.name ?? "Location"} · {appointment.status}</li>;
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {tab === "account" && (
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">Account summary</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <LedgerAmountCard label="Opening dues" amount={ledgerSummary.opening_dues_paise} />
              <LedgerAmountCard label="Net charges" amount={ledgerSummary.credit_charges_paise} />
              <LedgerAmountCard label="Net payments received" amount={ledgerSummary.collected_paise} />
              <LedgerAmountCard
                label={balance < 0n ? "Patient credit" : "Current outstanding"}
                amount={balance < 0n ? -balance : balance}
              />
            </div>
            <p className="mt-2 text-sm text-slate-600">Opening dues + charges − payments + signed corrections. Balance is derived from the ledger.</p>
          </div>
          <LedgerEntryForm patientId={patientId} />
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <h3 className="border-b border-slate-100 p-5 font-bold">Chronological ledger</h3>
            {entries.length === 0 ? (
              <p className="p-5 text-slate-600">
                {offset > 0 ? "No entries on this page. " : "No financial entries."}
                {offset > 0 && <Link className="font-semibold text-[var(--primary)] underline" href={`/doctor/patients/${patientId}?tab=account&offset=${Math.max(0, offset - pageSize)}`}>Go to previous entries</Link>}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Description</th><th className="p-3">Charge</th><th className="p-3">Payment</th><th className="p-3">Running Balance</th><th className="p-3">Correction</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.map((entry) => {
                      const amount = BigInt(entry.amount_paise);
                      return (
                        <tr key={entry.id} className="align-top">
                          <td className="p-3">{new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" }).format(new Date(entry.effective_at))}</td>
                          <td className="p-3">{ledgerEntryLabel(entry.entry_type)}</td>
                          <td className="p-3">{entry.description}</td>
                          <td className="p-3">{amount > 0n ? formatRupees(amount) : "—"}</td>
                          <td className="p-3">{amount < 0n ? formatRupees(-amount) : "—"}</td>
                          <td className="p-3 font-semibold">{formatRupees(entry.running_balance)}</td>
                          <td className="p-3">
                            {entry.correction_reason && <p className="max-w-40 text-xs text-slate-600">{entry.correction_reason}</p>}
                            {entry.entry_type !== "reversal" && !entry.has_reversal && (
                              <CorrectLedgerTransaction
                                patientId={patientId}
                                entryId={entry.id}
                                entryType={ledgerEntryLabel(entry.entry_type)}
                                entryDate={new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" }).format(new Date(entry.effective_at))}
                                amountPaise={String(entry.amount_paise)}
                                description={entry.description}
                                expectedBalancePaise={String(balance - BigInt(entry.amount_paise))}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {ledgerTotal > pageSize && (
              <nav aria-label="Ledger pages" className="flex items-center justify-between border-t border-slate-100 p-4 text-sm">
                {offset > 0 ? <a className="font-semibold text-[var(--primary)] underline" href={`/doctor/patients/${patientId}?tab=account&offset=${Math.max(0, offset - pageSize)}`}>Earlier entries</a> : <span />}
                <span className="text-slate-600">Entries {offset + 1}–{Math.min(offset + entries.length, ledgerTotal)} of {ledgerTotal}</span>
                {offset + pageSize < ledgerTotal ? <a className="font-semibold text-[var(--primary)] underline" href={`/doctor/patients/${patientId}?tab=account&offset=${offset + pageSize}`}>Later entries</a> : <span />}
              </nav>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function LedgerAmountCard({ label, amount }: { label: string; amount: number | string | bigint }) {
  return <div className="rounded-lg border border-slate-100 p-3">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="mt-1 font-bold text-slate-900">{formatRupees(amount)}</p>
  </div>;
}
