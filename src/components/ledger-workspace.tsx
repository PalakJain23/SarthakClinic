"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Search,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createPatientAction,
  loadLedgerPatientSummaryAction,
  recordLedgerAction,
  type FormActionState,
  type LedgerPatientSummary,
} from "@/app/doctor/actions";
import { formatDate, formatRupees, indiaDate } from "@/lib/format";

export type LedgerPatientRow = {
  id: string;
  fullName: string;
  mobile: string;
  balancePaise: string;
  lastVisit: string | null;
  lastTransaction: string | null;
};

export type LedgerTotals = {
  outstandingPaise: string;
  patientsWithBalance: number;
  creditChargesPaise: string;
  openingDuesPaise: string;
  collectedPaise: string;
};

const initialState: FormActionState = {};
const pageSize = 10;

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function balanceLabel(balanceValue: string) {
  const balance = BigInt(balanceValue);
  if (balance > 0n) return { text: `Due ${formatRupees(balance)}`, style: "text-amber-800" };
  if (balance < 0n) return { text: `Credit ${formatRupees(-balance)}`, style: "text-emerald-800" };
  return { text: "Settled", style: "text-slate-600" };
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function LedgerWorkspace({
  patients,
  patientOptions,
  totalCount,
  page,
  search,
  balanceFilter,
  sort,
  direction,
  totals,
  initialSummary,
  autoTransaction,
}: {
  patients: LedgerPatientRow[];
  patientOptions: { id: string; fullName: string; mobile: string }[];
  totalCount: number;
  page: number;
  search: string;
  balanceFilter: string;
  sort: string;
  direction: string;
  totals: LedgerTotals;
  initialSummary: LedgerPatientSummary | null;
  autoTransaction: "charge" | "payment" | null;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialSummary?.patient.id ?? patients[0]?.id ?? "");
  const [summary, setSummary] = useState(initialSummary);
  const [summaryError, setSummaryError] = useState("");
  const [transactionType, setTransactionType] = useState<"charge" | "payment">(autoTransaction ?? "charge");
  const [transactionOpen, setTransactionOpen] = useState(Boolean(autoTransaction));
  const [pending, startTransition] = useTransition();

  const choosePatient = useCallback((patientId: string) => {
    setSelectedId(patientId);
    setSummary(null);
    setSummaryError("");
    startTransition(async () => {
      try {
        const result = await loadLedgerPatientSummaryAction(patientId);
        setSummary(result);
        if (!result) setSummaryError("This patient record is no longer available.");
      } catch {
        setSummary(null);
        setSummaryError("Could not load this patient’s ledger summary. Refresh and try again.");
      }
    });
  }, [startTransition]);

  function openTransaction(type: "charge" | "payment") {
    setTransactionType(type);
    setTransactionOpen(true);
  }

  const transactionSaved = useCallback((patientId: string) => {
    router.refresh();
    startTransition(async () => {
      try {
        const result = await loadLedgerPatientSummaryAction(patientId);
        setSelectedId(patientId);
        setSummary(result);
      } catch {
        setSummaryError("The transaction was saved, but the refreshed summary could not be loaded.");
      }
    });
  }, [router, startTransition]);

  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (balanceFilter !== "all") params.set("balance", balanceFilter);
  if (sort !== "name") params.set("sort", sort);
  if (direction !== "asc") params.set("direction", direction);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  function pageHref(nextPage: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    return `/doctor/accounts?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">Patient accounts · all-time totals · Asia/Kolkata</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Udhaar Ledger</h1>
          <p className="mt-1 text-slate-600">Balances are calculated from opening dues, charges, payments, and signed corrections.</p>
        </div>
        <button type="button" onClick={() => openTransaction("charge")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800">
          <CircleDollarSign size={18} aria-hidden="true" /> Add Transaction
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="All-time ledger summary">
        <Metric label="Total Outstanding" note="Positive current patient balances" value={formatRupees(totals.outstandingPaise)} />
        <Metric label="Patients with Balance" note="Patients with a positive current balance" value={String(totals.patientsWithBalance)} />
        <Metric label="Total Given on Credit" note={`Net charges; opening dues separately ${formatRupees(totals.openingDuesPaise)}`} value={formatRupees(totals.creditChargesPaise)} />
        <Metric label="Total Collected" note="Net recorded payments after reversals" value={formatRupees(totals.collectedPaise)} />
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(290px,0.8fr)]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-50 p-4 sm:p-5">
            <div><h2 className="text-lg font-bold text-slate-950">Udhaar Ledger</h2><p className="mt-1 text-sm text-slate-500">{totalCount} matching patient{totalCount === 1 ? "" : "s"}</p></div>
            <button type="button" onClick={() => openTransaction("charge")} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-300 px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"><CircleDollarSign size={16} />Add Transaction</button>
          </div>
          <form method="get" className="grid gap-3 border-b border-slate-100 bg-emerald-50/40 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end">
            <label className="text-xs font-semibold text-slate-700">Search by patient name or phone
              <span className="relative mt-1 block"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input name="q" defaultValue={search} placeholder="Search patients…" className="min-h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-normal" /></span>
            </label>
            <label className="text-xs font-semibold text-slate-700">Balance
              <select name="balance" defaultValue={balanceFilter} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal"><option value="all">All balances</option><option value="due">Has due</option><option value="credit">Patient credit</option><option value="settled">Settled</option></select>
            </label>
            <label className="text-xs font-semibold text-slate-700">Sort by
              <select name="sort" defaultValue={sort} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal"><option value="name">Patient name</option><option value="balance">Current balance</option><option value="last_visit">Last visit</option></select>
            </label>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="ledger-direction">Sort direction</label>
              <select id="ledger-direction" name="direction" defaultValue={direction} aria-label="Sort direction" className="min-h-10 min-w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm"><option value="asc">Ascending</option><option value="desc">Descending</option></select>
              <button className="min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white">Apply</button>
            </div>
          </form>

          {patients.length === 0 ? (
            <p className="p-6 text-slate-600">{search || balanceFilter !== "all" ? "No patients match these filters." : "No patient records yet."}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-emerald-50 text-slate-700"><tr>
                    <th className="px-4 py-3 font-semibold">Patient Name</th>
                    <th className="px-4 py-3 font-semibold">Current Outstanding</th>
                    <th className="px-4 py-3 font-semibold">Last Visit</th>
                    <th className="px-4 py-3 font-semibold">Last Transaction</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {patients.map((patient) => {
                      const balance = balanceLabel(patient.balancePaise);
                      const active = selectedId === patient.id;
                      return <tr key={patient.id} className={`${active ? "bg-emerald-50/70" : "hover:bg-slate-50"}`}>
                        <td className="px-4 py-4">
                          <button type="button" onClick={() => choosePatient(patient.id)} className="text-left font-semibold text-slate-950 hover:text-emerald-800">{patient.fullName}</button>
                          <p className="mt-1 text-xs text-slate-500">{patient.mobile}</p>
                        </td>
                        <td className={`px-4 py-4 font-semibold ${balance.style}`}>{balance.text}</td>
                        <td className="px-4 py-4 text-slate-600">{patient.lastVisit ? formatDate(patient.lastVisit) : "No visit recorded"}</td>
                        <td className="px-4 py-4 text-slate-600">{patient.lastTransaction ? dateTime(patient.lastTransaction) : "—"}</td>
                        <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BigInt(patient.balancePaise) > 0n ? "bg-amber-100 text-amber-800" : BigInt(patient.balancePaise) < 0n ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{BigInt(patient.balancePaise) > 0n ? "Due" : BigInt(patient.balancePaise) < 0n ? "Credit" : "Settled"}</span></td>
                        <td className="px-4 py-4"><div className="flex gap-2">
                          <button type="button" onClick={() => { choosePatient(patient.id); }} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold hover:bg-emerald-50">View</button>
                          <Link href={`/doctor/patients/${patient.id}?tab=account`} className="min-h-9 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-emerald-50">History</Link>
                        </div></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
              <nav aria-label="Patient ledger pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm">
                <span className="text-slate-600">Showing {Math.min((page - 1) * pageSize + 1, totalCount)}–{Math.min(page * pageSize, totalCount)} of {totalCount}</span>
                <div className="flex gap-2">
                  <Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={pageHref(Math.max(1, page - 1))} className={`inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 font-semibold ${page <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-700 hover:bg-emerald-50"}`}><ChevronLeft size={16} />Previous</Link>
                  <span className="inline-flex min-h-9 items-center px-2 text-slate-600">Page {page} of {totalPages}</span>
                  <Link aria-disabled={page >= totalPages} tabIndex={page >= totalPages ? -1 : undefined} href={pageHref(Math.min(totalPages, page + 1))} className={`inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 font-semibold ${page >= totalPages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-700 hover:bg-emerald-50"}`}>Next<ChevronRight size={16} /></Link>
                </div>
              </nav>
            </>
          )}
        </section>

        <aside className="min-w-0 rounded-2xl border border-emerald-100 bg-white shadow-sm">
          {summary ? <PatientSummary summary={summary} loading={pending} onAddCharge={() => openTransaction("charge")} onAddPayment={() => openTransaction("payment")} /> : (
            <div className="p-5">
              <h2 className="text-lg font-bold">Patient Summary</h2>
              <p role={summaryError ? "alert" : "status"} className="mt-4 text-sm text-slate-600">{summaryError || (pending ? "Loading patient summary…" : "Select a patient to view their account.")}</p>
            </div>
          )}
        </aside>
      </div>

      {transactionOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setTransactionOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="transaction-heading" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div><h2 id="transaction-heading" className="text-xl font-bold">Add Transaction</h2><p className="mt-1 text-sm text-slate-600">Financial entries are immutable; the current balance is calculated from the ledger.</p></div>
              <button type="button" onClick={() => setTransactionOpen(false)} aria-label="Close" className="flex size-10 items-center justify-center rounded-lg border border-slate-200"><X size={18} /></button>
            </div>
            <TransactionForm patients={patientOptions} ledgerPatients={patients} selectedId={selectedId} selectedSummary={summary} initialType={transactionType} onPatientChange={choosePatient} onSaved={transactionSaved} />
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({ label, note, value }: { label: string; note: string; value: string }) {
  return <article className="min-w-0 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-4 shadow-sm">
    <div className="flex items-center gap-2 text-emerald-700"><Wallet size={19} aria-hidden="true" /><p className="text-sm font-semibold text-slate-700">{label}</p></div>
    <p className="mt-3 break-words text-xl font-bold text-slate-950">{value}</p>
    <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>
  </article>;
}

function PatientSummary({ summary, loading, onAddCharge, onAddPayment }: { summary: LedgerPatientSummary; loading: boolean; onAddCharge: () => void; onAddPayment: () => void }) {
  const balance = BigInt(summary.balancePaise);
  const label = balance > 0n ? "Current Outstanding" : balance < 0n ? "Patient Credit" : "Current Balance";
  return <div aria-busy={loading}>
    <header className="border-b border-emerald-50 p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">{initials(summary.patient.fullName) || <UserRound size={20} />}</span>
        <div className="min-w-0"><h2 className="truncate text-lg font-bold text-slate-950">Patient Summary</h2><p className="truncate font-semibold">{summary.patient.fullName}</p><p className="text-sm text-slate-600">{summary.patient.mobile}</p></div>
      </div>
    </header>
    <div className="space-y-4 p-5">
      <div className="grid grid-cols-2 gap-3">
        <Amount label="Opening dues" value={formatRupees(summary.openingDuesPaise)} />
        <Amount label="Net charges" value={formatRupees(summary.chargesPaise)} />
        <Amount label="Net payments" value={formatRupees(summary.paymentsPaise)} />
        <div className="col-span-2 rounded-xl bg-emerald-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">{label}</p><p className={`mt-1 text-2xl font-bold ${balance < 0n ? "text-emerald-800" : "text-slate-950"}`}>{formatRupees(balance < 0n ? -balance : balance)}</p>{balance < 0n && <p className="mt-1 text-xs text-emerald-800">Patient credit is shown separately from outstanding dues.</p>}</div>
      </div>
      <div>
        <h3 className="font-bold text-slate-900">Recent Transactions</h3>
        {summary.recentEntries.length === 0 ? <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No transactions recorded.</p> : (
          <ul className="mt-2 divide-y divide-slate-100">
            {summary.recentEntries.map((entry) => {
              const amount = BigInt(entry.amountPaise);
              return <li key={entry.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0"><p className="truncate font-medium text-slate-800">{entry.description}</p><p className="mt-1 text-xs text-slate-500">{dateTime(entry.effectiveAt)} · {entry.entryType.replaceAll("_", " ")}</p></div>
                <strong className={`shrink-0 ${amount < 0n ? "text-emerald-800" : "text-slate-900"}`}>{amount > 0n ? "+" : "−"}{formatRupees(amount < 0n ? -amount : amount)}</strong>
              </li>;
            })}
          </ul>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onAddCharge} className="min-h-10 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white">Add Udhaar</button>
        <button type="button" onClick={onAddPayment} className="min-h-10 rounded-lg border border-emerald-300 px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Add Payment</button>
        <Link href={`/doctor/patients/${summary.patient.id}?tab=account`} className="col-span-2 min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-semibold hover:bg-slate-50">View History</Link>
      </div>
    </div>
  </div>;
}

function Amount({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-100 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-900">{value}</p></div>;
}

function TransactionForm({ patients: initialPatients, ledgerPatients, selectedId, selectedSummary, initialType, onPatientChange, onSaved }: { patients: { id: string; fullName: string; mobile: string }[]; ledgerPatients: LedgerPatientRow[]; selectedId: string; selectedSummary: LedgerPatientSummary | null; initialType: "charge" | "payment"; onPatientChange: (id: string) => void; onSaved: (id: string) => void }) {
  const [state, action, pending] = useActionState(recordLedgerAction, initialState);
  const [patientState, setPatientState] = useState<FormActionState>({});
  const [patientPending, setPatientPending] = useState(false);
  const keyRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const patientFormRef = useRef<HTMLFormElement>(null);
  const [patientId, setPatientId] = useState(selectedId);
  const [patients, setPatients] = useState(initialPatients);
  const [addingPatient, setAddingPatient] = useState(false);
  const [entryType, setEntryType] = useState<"opening_balance" | "charge" | "payment">(initialType);
  useEffect(() => { if (state.successToken) { if (keyRef.current) keyRef.current.value = crypto.randomUUID(); formRef.current?.reset(); onSaved(patientId); } }, [state.successToken, patientId, onSaved]);
  async function addPatient(formData: FormData) {
    setPatientPending(true);
    try {
      const result = await createPatientAction(initialState, formData);
      setPatientState(result);
      if (!result.patient) return;
      const patient = result.patient;
      setPatients((current) => current.some((item) => item.id === patient.id) ? current : [...current, patient]);
      setPatientId(patient.id);
      onPatientChange(patient.id);
      patientFormRef.current?.reset();
      setAddingPatient(false);
    } finally {
      setPatientPending(false);
    }
  }
  function setKey() { if (keyRef.current && !keyRef.current.value) keyRef.current.value = crypto.randomUUID(); }
  const selectedPatient = patients.find((patient) => patient.id === patientId);
  const selectedBalance = ledgerPatients.find((patient) => patient.id === patientId);
  const displayedBalance = selectedSummary?.patient.id === patientId
    ? BigInt(selectedSummary.balancePaise)
    : selectedBalance
      ? BigInt(selectedBalance.balancePaise)
      : null;
  const balanceText = displayedBalance === null
    ? "Loading latest balance…"
    : displayedBalance > 0n
      ? `Due ${formatRupees(displayedBalance)}`
      : displayedBalance < 0n
        ? `Patient credit ${formatRupees(-displayedBalance)}`
        : "Settled · ₹0.00";
  return <>
    <label className="block text-sm font-semibold">Select patient
      <select name="patientId" form="ledger-entry-form" value={patientId} onChange={(event) => { setPatientId(event.target.value); onPatientChange(event.target.value); }} required className="field-control"><option value="">Select a patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName} · {patient.mobile}</option>)}</select>
    </label>
    <button type="button" onClick={() => setAddingPatient((open) => !open)} className="text-sm font-semibold text-emerald-800 underline underline-offset-2">{addingPatient ? "Cancel adding patient" : "Add a new patient"}</button>
    {addingPatient && <form ref={patientFormRef} action={addPatient} className="grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 sm:grid-cols-2">
      <p className="text-sm text-slate-600 sm:col-span-2">Patient details only—no appointment, visit, or medical notes are required. If this patient is already listed, select that record above.</p>
      <label className="text-sm font-semibold">Patient name <input name="fullName" required maxLength={120} className="field-control" /></label>
      <label className="text-sm font-semibold">Mobile number <input name="mobile" type="tel" required maxLength={18} className="field-control" /></label>
      {patientState.error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800 sm:col-span-2">{patientState.error}</p>}
      <button disabled={patientPending} className="min-h-10 rounded-lg border border-emerald-300 px-3 text-sm font-semibold text-emerald-900 disabled:opacity-50 sm:col-span-2">{patientPending ? "Adding patient…" : "Add patient and select"}</button>
    </form>}
    <form id="ledger-entry-form" ref={formRef} action={action} onSubmit={setKey} className="space-y-4">
      <input ref={keyRef} type="hidden" name="idempotencyKey" />
      {selectedPatient && <div className="rounded-xl bg-emerald-50 p-4 text-sm"><p className="font-semibold text-slate-950">{selectedPatient.fullName} · {selectedPatient.mobile}</p><p className="mt-1 text-slate-600">Balance before saving: <strong className="text-slate-900">{balanceText}</strong></p><p className="mt-1 text-xs text-slate-500">The latest patient balance is rechecked atomically by the database when saved.</p></div>}
      <label className="block text-sm font-semibold">Transaction type
        <select name="entryType" value={entryType} onChange={(event) => setEntryType(event.target.value === "payment" ? "payment" : event.target.value === "opening_balance" ? "opening_balance" : "charge")} className="field-control"><option value="opening_balance">Opening dues</option><option value="charge">Charge / Udhaar</option><option value="payment">Payment</option></select>
      </label>
      <label className="block text-sm font-semibold">Amount (₹)
        <input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required className="field-control" placeholder="0.00" />
      </label>
      <label className="block text-sm font-semibold">Effective date
        <input name="effectiveDate" type="date" required defaultValue={indiaDate()} className="field-control" />
      </label>
      <label className="block text-sm font-semibold">Description (optional)
        <input name="description" maxLength={240} className="field-control" placeholder={entryType === "payment" ? "Payment received" : entryType === "opening_balance" ? "Opening dues" : "Consultation or treatment"} />
      </label>
      {entryType === "payment" && <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950"><input name="overpaymentConfirmed" type="checkbox" className="mt-1 size-4 accent-emerald-700" />If payment exceeds the outstanding balance, record the remainder as patient credit.</label>}
      {state.error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{state.error}</p>}
      {state.success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{state.success}</p>}
      <button disabled={pending || !patientId} className="min-h-11 w-full rounded-lg bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : entryType === "payment" ? "Record Payment" : entryType === "opening_balance" ? "Record Opening Dues" : "Add Udhaar"}</button>
      {patients.length === 0 && <p className="text-sm text-amber-800">Add a patient record before posting a transaction.</p>}
    </form>
  </>;
}
