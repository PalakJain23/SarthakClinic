import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, History, Phone, UserRound } from "lucide-react";
import {
  CorrectLedgerTransaction,
  DeleteLedgerEntryButton,
  LedgerPersonArchiveAction,
} from "@/components/doctor-forms";
import { LedgerPersonTransactionActions } from "@/components/ledger-workspace";
import { WhatsAppPaymentReminder } from "@/components/whatsapp-payment-reminder";
import { formatRupees } from "@/lib/format";
import { requireDoctor } from "@/lib/doctor-auth";
import { calculateLedgerRunningBalances } from "@/lib/ledger";
import { buildPaymentReminder } from "@/lib/whatsapp-reminder";

export const dynamic = "force-dynamic";

type HistoryEntry = {
  id: string;
  entry_type: string;
  amount_paise: number | string;
  description: string;
  effective_at: string;
  correction_reason: string | null;
  reverses_entry_id: string | null;
  reverses_entry_type: string | null;
  running_balance: number | string;
  total_udhaar_paise: number | string;
  total_paid_paise: number | string;
  balance_paise: number | string;
  has_reversal: boolean;
};

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function transactionLabel(type: string) {
  switch (type) {
    case "opening_balance": return "Old dues";
    case "charge": return "Udhaar";
    case "payment": return "Payment";
    case "reversal": return "Canceled transaction";
    case "correction": return "Correction";
    default: return type;
  }
}

export default async function LedgerPersonHistoryPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(personId)) notFound();

  const { supabase } = await requireDoctor();
  const [personResult, historyResult] = await Promise.all([
    supabase.from("ledger_people").select("id, full_name, mobile, archived_at").eq("id", personId).maybeSingle(),
    supabase.rpc("ledger_person_history", { p_person_id: personId }),
  ]);
  if (personResult.error) throw new Error(`Could not load the ledger account: ${personResult.error.message}`);
  if (!personResult.data) notFound();
  if (historyResult.error) throw new Error(`Could not load transaction history: ${historyResult.error.message}`);

  const person = personResult.data;
  const entries: HistoryEntry[] = historyResult.data ?? [];
  const historyEntries = calculateLedgerRunningBalances(entries.map((entry) => ({
    ...entry,
    amountPaise: BigInt(entry.amount_paise),
  })));
  const summary = entries[0];
  const totalUdhaarPaise = BigInt(summary?.total_udhaar_paise ?? 0);
  const totalPaidPaise = BigInt(summary?.total_paid_paise ?? 0);
  const balancePaise = BigInt(summary?.balance_paise ?? 0);
  if (historyEntries.some((entry, index) =>
    entry.runningBalance !== BigInt(entries[index]?.running_balance ?? 0)
  ) || (historyEntries.at(-1)?.runningBalance ?? 0n) !== balancePaise) {
    throw new Error("The transaction history and account balance do not agree.");
  }
  const due = balancePaise > 0n;
  const paymentReminder = due
    ? buildPaymentReminder(person.full_name, formatRupees(balancePaise).slice(1), person.mobile)
    : null;
  const initials = person.full_name.trim().split(/\s+/).slice(0, 2).map((part: string) => part[0] ?? "").join("").toUpperCase();
  const ledgerOption = {
    id: personId,
    fullName: person.full_name,
    mobile: person.mobile,
    balancePaise: String(balancePaise),
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
        <Link href="/doctor/accounts" className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:text-emerald-950 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Udhaar Ledger
        </Link>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(230px,0.8fr)_minmax(0,1.8fr)] lg:items-center">
          <div className="flex min-w-0 items-center gap-3.5">
            <div aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-900 ring-4 ring-emerald-50">
              {initials || <UserRound size={23} />}
            </div>
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Udhaar Account</span>
              <h1 className="mt-1.5 break-words text-xl font-bold leading-tight text-slate-950 sm:text-2xl">{person.full_name}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                <Phone size={14} aria-hidden="true" />
                <span>{person.mobile || "Phone number not provided"}</span>
              </p>
              {person.archived_at && <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">Archived account · history and balance kept</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <SummaryCard label="Total Udhaar" value={formatRupees(totalUdhaarPaise)} tone="mint" />
            <SummaryCard label="Total Paid" value={formatRupees(totalPaidPaise)} tone="blue" />
            <SummaryCard label="Remaining Dues" value={formatRupees(balancePaise)} tone="cream" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-start gap-3 border-t border-slate-100 pt-4">
          <div className="min-w-0 flex-1">
            {paymentReminder ? (
              <WhatsAppPaymentReminder
                message={paymentReminder.message}
                whatsappUrl={paymentReminder.whatsappUrl}
                compact
              />
            ) : (
              <p className="py-2 text-sm text-slate-500">No outstanding dues to remind about.</p>
            )}
          </div>
          <div className="ml-auto">
            <LedgerPersonArchiveAction
              personId={personId}
              balancePaise={String(balancePaise)}
              archived={Boolean(person.archived_at)}
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-white p-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <History size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-950">Transaction History</h2>
              <p className="mt-0.5 break-words text-sm text-slate-500">All udhaar and payment entries for {person.full_name}</p>
            </div>
          </div>
          {!person.archived_at && <LedgerPersonTransactionActions person={ledgerOption} />}
        </div>
        {entries.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800"><History size={22} aria-hidden="true" /></span>
            <h3 className="mt-3 font-semibold text-slate-900">No transactions yet</h3>
            <p className="mt-1 text-sm text-slate-500">Add Udhaar or record a payment to start this account history.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block" tabIndex={0} aria-label="Scrollable transaction table">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-emerald-50/80 text-xs uppercase tracking-wide text-slate-600"><tr>
                  <th className="w-12 px-3 py-3 text-center font-semibold">#</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-3 py-3 font-semibold">Description / Note</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-semibold">Amount</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-semibold">Balance</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-semibold">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {historyEntries.map((entry, index) => {
                    const amount = BigInt(entry.amount_paise);
                    return (
                      <tr key={entry.id} className="align-middle transition-colors hover:bg-emerald-50/30">
                        <td className="px-3 py-3.5 text-center text-xs text-slate-400">{index + 1}</td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-slate-600">{dateTime(entry.effective_at)}</td>
                        <td className="px-3 py-3.5"><TransactionTypeBadge type={entry.entry_type} label={transactionLabel(entry.entry_type)} /></td>
                        <td className="max-w-72 px-3 py-3.5 text-slate-700">
                          <p className="break-words">{entry.description}</p>
                          {entry.correction_reason && <p className="mt-1 max-w-72 break-words text-xs text-slate-500">Reason: {entry.correction_reason}</p>}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-3.5 text-right font-semibold ${amount < 0n ? "text-rose-700" : "text-slate-900"}`}>{amount > 0n ? `+${formatRupees(amount)}` : formatRupees(amount)}</td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-right font-semibold text-slate-800">{formatRupees(entry.runningBalance)}</td>
                        <td className="px-3 py-3.5">
                          <TransactionActions
                            entry={entry}
                            personId={personId}
                            archived={Boolean(person.archived_at)}
                            currentBalancePaise={String(balancePaise)}
                            date={dateTime(entry.effective_at)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ol className="divide-y divide-slate-100 md:hidden">
              {historyEntries.map((entry, index) => {
                const amount = BigInt(entry.amount_paise);
                return (
                  <li key={entry.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">#{index + 1} · {dateTime(entry.effective_at)}</p>
                        <div className="mt-1"><TransactionTypeBadge type={entry.entry_type} label={transactionLabel(entry.entry_type)} /></div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-bold ${amount < 0n ? "text-rose-700" : "text-slate-950"}`}>{amount > 0n ? `+${formatRupees(amount)}` : formatRupees(amount)}</p>
                        <p className="mt-1 text-xs text-slate-500">Balance {formatRupees(entry.runningBalance)}</p>
                      </div>
                    </div>
                    <p className="break-words text-sm text-slate-700">{entry.description}</p>
                    {entry.correction_reason && <p className="break-words text-xs text-slate-500">Reason: {entry.correction_reason}</p>}
                    <TransactionActions
                      entry={entry}
                      personId={personId}
                      archived={Boolean(person.archived_at)}
                      currentBalancePaise={String(balancePaise)}
                      date={dateTime(entry.effective_at)}
                    />
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "mint" | "blue" | "cream";
}) {
  const toneClass = {
    mint: "border-emerald-100 bg-emerald-50/80",
    blue: "border-sky-100 bg-sky-50/80",
    cream: "border-amber-100 bg-amber-50/80",
  }[tone];
  return (
    <article className={`min-w-0 rounded-xl border p-3.5 sm:p-4 ${toneClass}`}>
      <p className="text-xs font-semibold text-slate-600 sm:text-sm">{label}</p>
      <p className="mt-1.5 break-words text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{value}</p>
    </article>
  );
}

function TransactionTypeBadge({ type, label }: { type: string; label: string }) {
  const toneClass = type === "payment"
    ? "bg-rose-50 text-rose-800 ring-rose-200"
    : ["charge", "opening_balance"].includes(type)
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : type === "reversal"
        ? "bg-slate-100 text-slate-700 ring-slate-200"
        : "bg-sky-50 text-sky-800 ring-sky-200";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${toneClass}`}>{label}</span>;
}

function TransactionActions({
  entry,
  personId,
  archived,
  currentBalancePaise,
  date,
}: {
  entry: HistoryEntry;
  personId: string;
  archived: boolean;
  currentBalancePaise: string;
  date: string;
}) {
  const canCorrect = !archived && entry.entry_type !== "reversal" && !entry.has_reversal;
  const canDelete = canCorrect && ["charge", "payment"].includes(entry.entry_type);
  if (!canCorrect && !canDelete) {
    return <span className="block text-right text-xs text-slate-400">—</span>;
  }
  return (
    <div className="flex items-center justify-end gap-1.5">
      {canCorrect && (
        <CorrectLedgerTransaction
          compact
          personId={personId}
          entryId={entry.id}
          entryType={transactionLabel(entry.entry_type)}
          entryDate={date}
          amountPaise={String(entry.amount_paise)}
          description={entry.description}
          expectedBalancePaise={String(BigInt(currentBalancePaise) - BigInt(entry.amount_paise))}
        />
      )}
      {canDelete && (
        <DeleteLedgerEntryButton
          compact
          personId={personId}
          entryId={entry.id}
          entryType={transactionLabel(entry.entry_type)}
          entryDate={date}
          amountPaise={String(entry.amount_paise)}
          currentBalancePaise={currentBalancePaise}
        />
      )}
    </div>
  );
}
