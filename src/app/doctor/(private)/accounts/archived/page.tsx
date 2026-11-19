import Link from "next/link";
import { LedgerPersonArchiveAction } from "@/components/doctor-forms";
import { formatRupees } from "@/lib/format";
import { requireDoctor } from "@/lib/doctor-auth";

export const dynamic = "force-dynamic";

type ArchivedPerson = {
  person_id: string;
  full_name: string;
  mobile: string | null;
  total_udhaar_paise: number | string;
  total_paid_paise: number | string;
  balance_paise: number | string;
};

export default async function ArchivedLedgerPeoplePage() {
  const { supabase } = await requireDoctor();
  const { data, error } = await supabase.rpc("doctor_archived_ledger_people");
  if (error) throw new Error(`Could not load archived Udhaar accounts: ${error.message}`);
  const people: ArchivedPerson[] = data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <Link href="/doctor/accounts" className="inline-flex min-h-10 items-center text-sm font-semibold text-emerald-800 underline underline-offset-2">← Active Udhaar Ledger</Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-950">Archived accounts</h1>
          <p className="mt-1 text-sm text-slate-600">Archived accounts are hidden from the active ledger, but their history and balances are kept.</p>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        {people.length === 0 ? (
          <p className="p-5 text-slate-600">No archived Udhaar accounts.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-emerald-50 text-slate-700">
                  <tr>
                    <th className="p-3 font-semibold">Person</th>
                    <th className="p-3 font-semibold">Total Udhaar</th>
                    <th className="p-3 font-semibold">Total Paid</th>
                    <th className="p-3 font-semibold">Balance kept</th>
                    <th className="p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {people.map((person) => (
                    <tr key={person.person_id}>
                      <td className="p-3">
                        <Link href={`/doctor/accounts/${person.person_id}`} className="font-semibold text-emerald-900 underline underline-offset-2">{person.full_name}</Link>
                        <p className="mt-1 text-xs text-slate-500">{person.mobile || "No phone number"}</p>
                      </td>
                      <td className="p-3">{formatRupees(person.total_udhaar_paise)}</td>
                      <td className="p-3">{formatRupees(person.total_paid_paise)}</td>
                      <td className="p-3 font-semibold">{formatRupees(person.balance_paise)}</td>
                      <td className="p-3"><LedgerPersonArchiveAction key={`${person.person_id}-restore`} personId={person.person_id} balancePaise={String(person.balance_paise)} archived /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 sm:hidden">
              {people.map((person) => (
                <li key={person.person_id} className="space-y-3 p-4">
                  <div>
                    <Link href={`/doctor/accounts/${person.person_id}`} className="font-semibold text-emerald-900 underline underline-offset-2">{person.full_name}</Link>
                    <p className="mt-1 text-sm text-slate-600">{person.mobile || "No phone number"}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs text-slate-500">Total Udhaar</dt><dd className="mt-1 font-semibold">{formatRupees(person.total_udhaar_paise)}</dd></div>
                    <div><dt className="text-xs text-slate-500">Total paid</dt><dd className="mt-1 font-semibold">{formatRupees(person.total_paid_paise)}</dd></div>
                    <div className="col-span-2"><dt className="text-xs text-slate-500">Balance kept</dt><dd className="mt-1 font-semibold">{formatRupees(person.balance_paise)}</dd></div>
                  </dl>
                  <LedgerPersonArchiveAction key={`${person.person_id}-restore`} personId={person.person_id} balancePaise={String(person.balance_paise)} archived />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
