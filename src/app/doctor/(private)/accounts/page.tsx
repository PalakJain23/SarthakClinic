import { LedgerWorkspace, type LedgerPatientRow, type LedgerTotals } from "@/components/ledger-workspace";
import type { LedgerPatientSummary } from "@/app/doctor/actions";
import { requireDoctor } from "@/lib/doctor-auth";

export const dynamic = "force-dynamic";
const pageSize = 10;
type PatientPageResult = {
  patient_id: string;
  full_name: string;
  mobile: string;
  balance_paise: number | string;
  last_visit: string | null;
  total_count: number | string;
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
    patient?: string;
    transaction?: string;
  }>;
}) {
  const params = await searchParams;
  const search = (params.q ?? "").trim().slice(0, 80);
  const balanceFilter = ["all", "due", "credit", "settled"].includes(params.balance ?? "")
    ? params.balance!
    : "all";
  const sort = ["name", "balance", "last_visit"].includes(params.sort ?? "")
    ? params.sort!
    : "name";
  const direction = params.direction === "desc" ? "desc" : "asc";
  const page = /^\d+$/.test(params.page ?? "") ? Math.min(Number(params.page), 100_000) : 1;
  const autoTransaction = ["charge", "payment"].includes(params.transaction ?? "")
    ? params.transaction as "charge" | "payment"
    : null;
  const requestedPatient = /^[0-9a-f-]{36}$/i.test(params.patient ?? "") ? params.patient! : "";
  const { supabase } = await requireDoctor();
  const [patientPageResult, totalsResult, accountResult, patientOptionsResult] = await Promise.all([
    supabase.rpc("doctor_ledger_patient_page", {
      p_search: search,
      p_balance_filter: balanceFilter,
      p_sort: sort,
      p_direction: direction,
      p_offset: (page - 1) * pageSize,
      p_limit: pageSize,
    }),
    supabase.rpc("accounting_ledger_totals"),
    supabase.from("accounting_summary").select("outstanding_paise, patients_owing").maybeSingle(),
    supabase.from("patients").select("id, full_name, mobile").order("full_name").limit(1000),
  ]);
  const initialFailure = [patientPageResult, totalsResult, accountResult, patientOptionsResult].find((result) => result.error);
  if (initialFailure?.error) {
    const message = initialFailure.error.code === "PGRST202"
      ? "Ledger database functions are missing from the API schema cache. Verify that 202611020002_doctor_ledger_workspace.sql was applied and the RPC definitions exist before reloading the PostgREST schema cache."
      : initialFailure.error.message;
    throw new Error(`Could not load the Udhaar ledger: ${message}`);
  }

  const patientRows: PatientPageResult[] = patientPageResult.data ?? [];
  const lastTransactionResults = await Promise.all(patientRows.map((row) =>
    supabase
      .from("ledger_entries")
      .select("effective_at")
      .eq("patient_id", row.patient_id)
      .order("effective_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ));
  const lastTransactionFailure = lastTransactionResults.find((result) => result.error);
  if (lastTransactionFailure?.error) {
    throw new Error(`Could not load last ledger transaction: ${lastTransactionFailure.error.message}`);
  }
  const patients: LedgerPatientRow[] = patientRows.map((row, index) => ({
    id: row.patient_id,
    fullName: row.full_name,
    mobile: row.mobile,
    balancePaise: String(row.balance_paise),
    lastVisit: row.last_visit,
    lastTransaction: lastTransactionResults[index]?.data?.effective_at ?? null,
  }));
  const totalCount = Number(patientRows[0]?.total_count ?? 0);
  const totalsRow = totalsResult.data?.[0];
  const totals: LedgerTotals = {
    outstandingPaise: String(accountResult.data?.outstanding_paise ?? 0),
    patientsWithBalance: Number(accountResult.data?.patients_owing ?? 0),
    creditChargesPaise: String(totalsRow?.credit_charges_paise ?? 0),
    openingDuesPaise: String(totalsRow?.opening_dues_paise ?? 0),
    collectedPaise: String(totalsRow?.collected_paise ?? 0),
  };
  const patientOptions = (patientOptionsResult.data ?? []).map((patient) => ({
    id: patient.id,
    fullName: patient.full_name,
    mobile: patient.mobile,
  }));
  for (const patient of patients) {
    if (!patientOptions.some((option) => option.id === patient.id)) {
      patientOptions.push({ id: patient.id, fullName: patient.fullName, mobile: patient.mobile });
    }
  }
  const selectedPatientId = requestedPatient ||
    patients[0]?.id ||
    patientOptions[0]?.id ||
    "";
  let initialSummary: LedgerPatientSummary | null = null;
  if (selectedPatientId) {
    const [patientResult, summaryResult, entriesResult] = await Promise.all([
      supabase.from("patients").select("id, full_name, mobile").eq("id", selectedPatientId).maybeSingle(),
      supabase.rpc("patient_ledger_summary", { p_patient_id: selectedPatientId }),
      supabase
        .from("ledger_entries")
        .select("id, entry_type, amount_paise, description, effective_at")
        .eq("patient_id", selectedPatientId)
        .order("effective_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    const summaryFailure = [patientResult, summaryResult, entriesResult].find((result) => result.error);
    if (summaryFailure?.error) throw new Error(`Could not load the selected patient’s ledger: ${summaryFailure.error.message}`);
    const patient = patientResult.data;
    const summary = summaryResult.data?.[0];
    if (patient && summary) {
      initialSummary = {
        patient: { id: patient.id, fullName: patient.full_name, mobile: patient.mobile },
        openingDuesPaise: String(summary.opening_dues_paise),
        chargesPaise: String(summary.credit_charges_paise),
        paymentsPaise: String(summary.collected_paise),
        balancePaise: String(summary.balance_paise),
        recentEntries: (entriesResult.data ?? []).map((entry) => ({
          id: entry.id,
          entryType: entry.entry_type,
          amountPaise: String(entry.amount_paise),
          description: entry.description,
          effectiveAt: entry.effective_at,
        })),
      };
      if (!patientOptions.some((item) => item.id === patient.id)) patientOptions.unshift({
        id: patient.id,
        fullName: patient.full_name,
        mobile: patient.mobile,
      });
    }
  }

  return (
    <LedgerWorkspace
      key={`${search}-${balanceFilter}-${sort}-${direction}-${page}-${selectedPatientId}`}
      patients={patients}
      patientOptions={patientOptions}
      totalCount={totalCount}
      page={page}
      search={search}
      balanceFilter={balanceFilter}
      sort={sort}
      direction={direction}
      totals={totals}
      initialSummary={initialSummary}
      autoTransaction={autoTransaction}
    />
  );
}
