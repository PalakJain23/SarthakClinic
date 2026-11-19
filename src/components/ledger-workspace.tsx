"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Plus,
  Search,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  recordLedgerPersonAction,
  type FormActionState,
} from "@/app/doctor/actions";
import { formatRupees, indiaDate } from "@/lib/format";

export type LedgerPersonRow = {
  id: string;
  fullName: string;
  mobile: string | null;
  totalUdhaarPaise: string;
  totalPaidPaise: string;
  balancePaise: string;
};

export type LedgerPersonOption = {
  id: string;
  fullName: string;
  mobile: string | null;
  balancePaise: string;
};

export type LedgerTotals = {
  outstandingPaise: string;
  patientsWithBalance: number;
  totalUdhaarPaise: string;
  collectedPaise: string;
};

const initialState: FormActionState = {};
const pageSize = 10;

function isDue(balancePaise: string) {
  return BigInt(balancePaise) > 0n;
}

export function LedgerWorkspace({
  people,
  personOptions,
  totalCount,
  page,
  search,
  balanceFilter,
  sort,
  direction,
  totals,
  initialPersonId,
  autoTransaction,
}: {
  people: LedgerPersonRow[];
  personOptions: LedgerPersonOption[];
  totalCount: number;
  page: number;
  search: string;
  balanceFilter: string;
  sort: string;
  direction: string;
  totals: LedgerTotals;
  initialPersonId: string;
  autoTransaction: "charge" | "payment" | null;
}) {
  const router = useRouter();
  const [transactionType, setTransactionType] = useState<"charge" | "payment">(autoTransaction ?? "charge");
  const [transactionOpen, setTransactionOpen] = useState(Boolean(autoTransaction));

  function openTransaction(type: "charge" | "payment") {
    setTransactionType(type);
    setTransactionOpen(true);
  }

  function transactionSaved() {
    setTransactionOpen(false);
    router.refresh();
  }

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
          <p className="text-sm font-medium text-emerald-700">All-time totals · Asia/Kolkata</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Udhaar Ledger</h1>
          <p className="mt-1 text-slate-600">See every account’s credit, payments, and remaining dues.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/doctor/accounts/archived" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50">
            Archived accounts
          </Link>
          <button type="button" onClick={() => openTransaction("charge")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800">
            <CircleDollarSign size={18} aria-hidden="true" /> Add Udhaar
          </button>
          <button type="button" onClick={() => openTransaction("payment")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 font-semibold text-emerald-800 hover:bg-emerald-50">
            <Wallet size={18} aria-hidden="true" /> Payment Received
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="All-time ledger summary">
        <Metric label="Total Outstanding" note="Positive current account balances" value={formatRupees(totals.outstandingPaise)} />
        <Metric label="Accounts with Balance" note="Accounts with positive remaining dues" value={String(totals.patientsWithBalance)} />
        <Metric label="Total Given on Credit" note="Opening dues, Udhaar, and net credit adjustments" value={formatRupees(totals.totalUdhaarPaise)} />
        <Metric label="Total Collected" note="Payments net of reversals" value={formatRupees(totals.collectedPaise)} />
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-50 p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Udhaar Ledger</h2>
            <p className="mt-1 text-sm text-slate-500">{totalCount} matching {totalCount === 1 ? "person" : "people"}</p>
          </div>
        </div>
        <form method="get" className="grid gap-3 border-b border-slate-100 bg-emerald-50/40 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end">
          <label className="text-xs font-semibold text-slate-700">Search by name or phone
            <span className="relative mt-1 block"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input name="q" defaultValue={search} placeholder="Search people…" className="min-h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-normal" /></span>
          </label>
          <label className="text-xs font-semibold text-slate-700">Balance
            <select name="balance" defaultValue={balanceFilter} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal">
              <option value="all">All balances</option><option value="due">Has due</option><option value="credit">Account credit</option><option value="settled">Settled</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">Sort by
            <select name="sort" defaultValue={sort} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal">
              <option value="name">Name</option><option value="udhaar">Total Udhaar</option><option value="paid">Total paid</option><option value="balance">Remaining dues</option>
            </select>
          </label>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="ledger-direction">Sort direction</label>
            <select id="ledger-direction" name="direction" defaultValue={direction} aria-label="Sort direction" className="min-h-10 min-w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm">
              <option value="asc">Ascending</option><option value="desc">Descending</option>
            </select>
            <button className="min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white">Apply</button>
          </div>
        </form>

        {people.length === 0 ? (
          <p className="p-6 text-slate-600">{search || balanceFilter !== "all" ? "No people match these filters." : "No Udhaar accounts yet. Add Udhaar to create the first account."}</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-emerald-50 text-slate-700"><tr>
                  <th className="w-14 px-3 py-3 font-semibold">No.</th>
                  <th className="px-3 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Phone Number</th>
                  <th className="px-3 py-3 font-semibold">Total Udhaar</th>
                  <th className="px-3 py-3 font-semibold">Total Paid</th>
                  <th className="px-3 py-3 font-semibold">Remaining Dues</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Action</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {people.map((person, index) => {
                    const due = isDue(person.balancePaise);
                    return (
                      <tr key={person.id} className="hover:bg-slate-50">
                        <td className="px-3 py-4 text-slate-500">{(page - 1) * pageSize + index + 1}</td>
                        <td className="px-3 py-4 font-semibold text-slate-950">{person.fullName}</td>
                        <td className="px-3 py-4 text-slate-600">{person.mobile || "Not provided"}</td>
                        <td className="px-3 py-4 font-medium text-slate-800">{formatRupees(person.totalUdhaarPaise)}</td>
                        <td className="px-3 py-4 font-medium text-slate-800">{formatRupees(person.totalPaidPaise)}</td>
                        <td className={`px-3 py-4 font-semibold ${due ? "text-amber-800" : "text-slate-700"}`}>{formatRupees(person.balancePaise)}</td>
                        <td className="px-3 py-4"><Status due={due} /></td>
                        <td className="px-3 py-4"><ViewButton personId={person.id} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 xl:hidden">
              {people.map((person, index) => {
                const due = isDue(person.balancePaise);
                return (
                  <li key={person.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="text-xs text-slate-500">No. {(page - 1) * pageSize + index + 1}</p><p className="mt-1 break-words font-semibold text-slate-950">{person.fullName}</p><p className="mt-1 text-sm text-slate-600">{person.mobile || "Not provided"}</p></div>
                      <Status due={due} />
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <MobileAmount label="Total Udhaar" value={formatRupees(person.totalUdhaarPaise)} />
                      <MobileAmount label="Total Paid" value={formatRupees(person.totalPaidPaise)} />
                      <MobileAmount label="Remaining Dues" value={formatRupees(person.balancePaise)} />
                      <div className="flex items-end justify-end"><ViewButton personId={person.id} /></div>
                    </dl>
                  </li>
                );
              })}
            </ul>
            <nav aria-label="Udhaar ledger pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm">
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

      {transactionOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setTransactionOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="transaction-heading" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div><h2 id="transaction-heading" className="text-xl font-bold">{transactionType === "payment" ? "Payment Received" : "Add Udhaar"}</h2><p className="mt-1 text-sm text-slate-600">Transactions are saved securely and balances are calculated from the ledger.</p></div>
              <button type="button" onClick={() => setTransactionOpen(false)} aria-label="Close" className="flex size-10 items-center justify-center rounded-lg border border-slate-200"><X size={18} /></button>
            </div>
            <TransactionForm
              key={transactionType}
              people={personOptions}
              initialPersonId={initialPersonId}
              initialType={transactionType}
              onSaved={transactionSaved}
            />
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

function Status({ due }: { due: boolean }) {
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${due ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
    {due ? "Due" : "Paid"}
  </span>;
}

function ViewButton({ personId }: { personId: string }) {
  return <Link href={`/doctor/accounts/${personId}`} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-emerald-300 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-50">View</Link>;
}

function MobileAmount({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-900">{value}</dd></div>;
}

function TransactionForm({
  people,
  initialPersonId,
  initialType,
  onSaved,
  allowNewPerson = true,
}: {
  people: LedgerPersonOption[];
  initialPersonId: string;
  initialType: "charge" | "payment";
  onSaved: () => void;
  allowNewPerson?: boolean;
}) {
  const [state, action, pending] = useActionState(recordLedgerPersonAction, initialState);
  const keyRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstOption = initialPersonId && people.some((person) => person.id === initialPersonId)
    ? initialPersonId
    : "";
  const [personChoice, setPersonChoice] = useState(firstOption || (allowNewPerson && initialType === "charge" ? "new" : ""));
  useEffect(() => {
    if (!state.successToken) return;
    if (keyRef.current) keyRef.current.value = crypto.randomUUID();
    formRef.current?.reset();
    onSaved();
  }, [state.successToken, onSaved]);
  function prepareIdempotency() {
    if (keyRef.current && !keyRef.current.value) keyRef.current.value = crypto.randomUUID();
  }

  const selectedPerson = people.find((person) => person.id === personChoice);
  const selectedBalance = selectedPerson ? BigInt(selectedPerson.balancePaise) : 0n;
  const isNewPerson = allowNewPerson && personChoice === "new";
  return (
    <form ref={formRef} action={action} onSubmit={prepareIdempotency} className="space-y-4">
      <input ref={keyRef} type="hidden" name="idempotencyKey" />
      <input type="hidden" name="entryType" value={initialType} />
      <label className="block text-sm font-semibold">Person
        <select name="personChoice" value={personChoice} onChange={(event) => setPersonChoice(event.target.value)} required className="field-control">
          <option value="" disabled>{people.length ? "Select a person" : "No accounts available"}</option>
          {people.map((person) => <option key={person.id} value={person.id}>{person.fullName} · {person.mobile || "No phone"}</option>)}
          {allowNewPerson && initialType === "charge" && <option value="new">Add a new person</option>}
        </select>
      </label>
      {isNewPerson ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Name
            <input name="fullName" required maxLength={120} className="field-control" autoComplete="name" />
          </label>
          <label className="text-sm font-semibold">Phone number <span className="font-normal text-slate-500">(optional)</span>
            <input name="mobile" type="tel" maxLength={18} className="field-control" autoComplete="tel" />
          </label>
        </div>
      ) : (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm">
          <p className="font-semibold text-slate-950">{selectedPerson?.fullName ?? "Select a person"}</p>
          {initialType === "payment" && <p className="mt-1 text-slate-600">Outstanding balance: <strong className="text-slate-900">{formatRupees(selectedBalance > 0n ? selectedBalance : 0n)}</strong></p>}
          <p className="mt-1 text-xs text-slate-500">{initialType === "payment" ? "Partial and full payments are accepted; payments above the current balance are rejected." : selectedPerson?.mobile || "Not provided"}</p>
        </div>
      )}
      <label className="block text-sm font-semibold">Amount (₹)
        <input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required className="field-control" placeholder="0.00" />
      </label>
      <label className="block text-sm font-semibold">{initialType === "payment" ? "Payment date" : "Udhaar date"}
        <input name="effectiveDate" type="date" required defaultValue={indiaDate()} className="field-control" />
      </label>
      <label className="block text-sm font-semibold">Note <span className="font-normal text-slate-500">(optional)</span>
        <input name="description" maxLength={240} className="field-control" placeholder={initialType === "payment" ? "Payment received" : "Udhaar added"} />
      </label>
      {state.error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{state.error}</p>}
      {state.success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{state.success}</p>}
      <button disabled={pending || (initialType === "payment" && (!selectedPerson || selectedBalance <= 0n))} className="min-h-11 w-full rounded-lg bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50">
        {pending ? "Saving…" : initialType === "payment" ? "Save Payment" : "Save Udhaar"}
      </button>
    </form>
  );
}

export function LedgerPersonTransactionActions({ person }: { person: LedgerPersonOption }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"charge" | "payment">("charge");
  const [transactionOpen, setTransactionOpen] = useState(false);

  function openTransaction(type: "charge" | "payment") {
    setTransactionType(type);
    setMenuOpen(false);
    setTransactionOpen(true);
  }

  function transactionSaved() {
    setTransactionOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          <Plus size={17} aria-hidden="true" /> Add Entry
        </button>
        {menuOpen && (
          <div role="menu" className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
            <button type="button" role="menuitem" onClick={() => openTransaction("charge")} className="min-h-10 w-full rounded-lg px-3 text-left text-sm font-medium text-slate-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-700">Add Udhaar</button>
            <button type="button" role="menuitem" onClick={() => openTransaction("payment")} className="min-h-10 w-full rounded-lg px-3 text-left text-sm font-medium text-slate-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-700">Record Payment</button>
          </div>
        )}
      </div>
      {transactionOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setTransactionOpen(false);
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="person-transaction-heading" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 id="person-transaction-heading" className="text-xl font-bold text-slate-950">{transactionType === "payment" ? "Record Payment" : "Add Udhaar"}</h2>
                <p className="mt-1 text-sm text-slate-600">For {person.fullName}. Saved transactions update the account balance.</p>
              </div>
              <button type="button" onClick={() => setTransactionOpen(false)} aria-label="Close" className="flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <TransactionForm
              key={transactionType}
              people={[person]}
              initialPersonId={person.id}
              initialType={transactionType}
              onSaved={transactionSaved}
              allowNewPerson={false}
            />
          </section>
        </div>
      )}
    </>
  );
}
