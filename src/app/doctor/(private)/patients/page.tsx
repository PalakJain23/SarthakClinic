import Link from "next/link";
import { PatientForm } from "@/components/doctor-forms";
import { formatRupees } from "@/lib/format";
import { requireDoctor } from "@/lib/doctor-auth";

export const dynamic = "force-dynamic";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; add?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 80);
  const { supabase } = await requireDoctor();
  let patientQuery = supabase
    .from("patients")
    .select("id, full_name, mobile, age, updated_at")
    .order("full_name")
    .limit(200);
  if (query) {
    const escaped = query.replace(/[,%()]/g, "");
    patientQuery = patientQuery.or(`full_name.ilike.%${escaped}%,mobile.ilike.%${escaped}%`);
  }
  const [patientResult, balanceResult] = await Promise.all([
    patientQuery,
    supabase.from("patient_balances").select("patient_id, balance_paise"),
  ]);
  if (patientResult.error) throw new Error(`Could not load patients: ${patientResult.error.message}`);
  if (balanceResult.error) throw new Error(`Could not load patient balances: ${balanceResult.error.message}`);
  const balances = new Map((balanceResult.data ?? []).map((row) => [row.patient_id, BigInt(row.balance_paise)]));

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-950">Patients</h1><p className="mt-1 text-slate-600">Private patient records. Matching phone numbers never merge records.</p></div>
        <a href="#add-patient" className="min-h-11 rounded-lg bg-[var(--primary)] px-4 py-3 font-semibold text-white">Add patient</a>
      </header>
      <form className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="sr-only" htmlFor="patient-search">Search patients by name or phone</label>
        <input id="patient-search" name="q" defaultValue={query} placeholder="Search name or phone" className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3" />
        <button className="min-h-11 rounded-lg border border-slate-300 px-4 font-semibold">Search</button>
      </form>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 p-5 text-lg font-bold">Patient records</h2>
        {(patientResult.data ?? []).length === 0 ? (
          <p className="p-5 text-slate-600">{query ? "No patients match the search." : "No patient records yet."}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(patientResult.data ?? []).map((patient) => {
              const balance = balances.get(patient.id) ?? 0n;
              return (
                <li key={patient.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div><Link href={`/doctor/patients/${patient.id}`} className="font-semibold text-slate-950 underline underline-offset-2">{patient.full_name}</Link><p className="mt-1 text-sm text-slate-600">{patient.mobile}{patient.age ? ` · ${patient.age} years` : ""}</p></div>
                  <p className={`text-sm font-semibold ${balance > 0n ? "text-amber-900" : balance < 0n ? "text-emerald-800" : "text-slate-600"}`}>{balance > 0n ? "Due " : balance < 0n ? "Credit " : ""}{formatRupees(balance < 0n ? -balance : balance)}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section id="add-patient" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-bold">Add patient</h2>
        <PatientForm />
      </section>
    </div>
  );
}
