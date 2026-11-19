import {
  LedgerWorkspace,
  type LedgerPersonOption,
  type LedgerPersonRow,
  type LedgerTotals,
} from "@/components/ledger-workspace";
import { requireDoctor } from "@/lib/doctor-auth";

export const dynamic = "force-dynamic";
const pageSize = 10;

type PersonPageResult = {
  person_id: string;
  full_name: string;
  mobile: string | null;
  total_udhaar_paise: number | string;
  total_paid_paise: number | string;
  balance_paise: number | string;
  total_count: number | string;
};

type PersonOptionResult = {
  person_id: string;
  patient_id: string | null;
  full_name: string;
  mobile: string | null;
  total_udhaar_paise: number | string;
  total_paid_paise: number | string;
  balance_paise: number | string;
};

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    balance?: string;
    sort?: string;
    direction?: string;
    page?: string;
    person?: string;
    patient?: string;
    transaction?: string;
  }>;
}) {
  const params = await searchParams;
  const search = (params.q ?? "").trim().slice(0, 80);
  const balanceFilter = ["all", "due", "credit", "settled"].includes(params.balance ?? "")
    ? params.balance!
    : "all";
  const sort = ["name", "udhaar", "paid", "balance"].includes(params.sort ?? "")
    ? params.sort!
    : "name";
  const direction = params.direction === "desc" ? "desc" : "asc";
  const page = /^\d+$/.test(params.page ?? "") ? Math.min(Number(params.page), 100_000) : 1;
  const autoTransaction = ["charge", "payment"].includes(params.transaction ?? "")
    ? params.transaction as "charge" | "payment"
    : null;
  const requestedPerson = /^[0-9a-f-]{36}$/i.test(params.person ?? "") ? params.person! : "";
  const requestedPatient = /^[0-9a-f-]{36}$/i.test(params.patient ?? "") ? params.patient! : "";
  const { supabase } = await requireDoctor();
  const [personPageResult, totalsResult, accountResult, personOptionsResult, activePeopleResult] = await Promise.all([
    supabase.rpc("doctor_ledger_person_page", {
      p_search: search,
      p_balance_filter: balanceFilter,
      p_sort: sort,
      p_direction: direction,
      p_offset: (page - 1) * pageSize,
      p_limit: pageSize,
    }),
    supabase.rpc("accounting_ledger_totals"),
    supabase.from("accounting_summary").select("outstanding_paise, patients_owing").maybeSingle(),
    supabase.rpc("ledger_person_options"),
    supabase.from("ledger_people").select("id").is("archived_at", null),
  ]);
  const initialFailure = [personPageResult, totalsResult, accountResult, personOptionsResult, activePeopleResult].find((result) => result.error);
  if (initialFailure?.error) {
    const message = initialFailure.error.code === "PGRST202"
      ? "Ledger database functions are missing from the API schema cache. Apply 202611140001_ledger_people_and_history.sql and reload the PostgREST schema cache before reloading this page."
      : initialFailure.error.message;
    throw new Error(`Could not load the Udhaar ledger: ${message}`);
  }

  const personRows: PersonPageResult[] = personPageResult.data ?? [];
  const people: LedgerPersonRow[] = personRows.map((row) => ({
    id: row.person_id,
    fullName: row.full_name,
    mobile: row.mobile,
    totalUdhaarPaise: String(row.total_udhaar_paise),
    totalPaidPaise: String(row.total_paid_paise),
    balancePaise: String(row.balance_paise),
  }));
  const totalCount = Number(personRows[0]?.total_count ?? 0);
  const totalsRow = totalsResult.data?.[0];
  const personOptions: PersonOptionResult[] = personOptionsResult.data ?? [];
  const activePersonIds = new Set((activePeopleResult.data ?? []).map((person) => person.id));
  const totalUdhaarPaise = personOptions.reduce(
    (total, person) => total + BigInt(person.total_udhaar_paise),
    0n,
  );
  const totals: LedgerTotals = {
    outstandingPaise: String(accountResult.data?.outstanding_paise ?? 0),
    patientsWithBalance: Number(accountResult.data?.patients_owing ?? 0),
    totalUdhaarPaise: String(totalUdhaarPaise),
    collectedPaise: String(totalsRow?.collected_paise ?? 0),
  };
  const initialPersonId = requestedPerson ||
    personOptions.find((person) => person.patient_id === requestedPatient)?.person_id ||
    "";

  const options: LedgerPersonOption[] = personOptions.filter((person) => activePersonIds.has(person.person_id)).map((person) => ({
    id: person.person_id,
    fullName: person.full_name,
    mobile: person.mobile,
    balancePaise: String(person.balance_paise),
  }));

  return (
    <LedgerWorkspace
      key={`${search}-${balanceFilter}-${sort}-${direction}-${page}-${initialPersonId}`}
      people={people}
      personOptions={options}
      totalCount={totalCount}
      page={page}
      search={search}
      balanceFilter={balanceFilter}
      sort={sort}
      direction={direction}
      totals={totals}
      initialPersonId={initialPersonId}
      autoTransaction={autoTransaction}
    />
  );
}
