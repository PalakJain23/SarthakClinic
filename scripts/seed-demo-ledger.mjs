import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const namespace = "610e4e6f-501c-5f6b-bdf7-926b2dc5db74";
const rows = [
  ["aarav-sharma", "DEMO Aarav Sharma", 28, 100000, 50000, 70000],
  ["meera-patel", "DEMO Meera Patel", 35, 0, 60000, 60000],
  ["rohan-verma", "DEMO Rohan Verma", 42, 200000, 40000, 100000],
  ["kavya-jain", "DEMO Kavya Jain", 24, 0, 30000, 0],
  ["suresh-yadav", "DEMO Suresh Yadav", 56, 500000, 80000, 200000],
  ["nisha-gupta", "DEMO Nisha Gupta", 31, 75000, 25000, 100000],
  ["mohan-joshi", "DEMO Mohan Joshi", 63, 1000000, 120000, 300000],
  ["pooja-soni", "DEMO Pooja Soni", 27, 0, 45000, 20000],
  ["deepak-malviya", "DEMO Deepak Malviya", 39, 320000, 60000, 80000],
  ["sunita-rathore", "DEMO Sunita Rathore", 48, 150000, 0, 50000],
  ["rahul-mehta", "DEMO Rahul Mehta", 22, 0, 35000, 35000],
  ["anita-chouhan", "DEMO Anita Chouhan", 44, 250000, 50000, 150000],
  ["vikram-sen", "DEMO Vikram Sen", 36, 80000, 20000, 0],
  ["rekha-parmar", "DEMO Rekha Parmar", 52, 600000, 75000, 275000],
  ["aman-mishra", "DEMO Aman Mishra", 19, 0, 19950, 10000],
  ["geeta-saxena", "DEMO Geeta Saxena", 60, 125000, 25000, 150000],
  ["kunal-tiwari", "DEMO Kunal Tiwari", 33, 400000, 100000, 200000],
  ["savita-dubey", "DEMO Savita Dubey", 46, 90000, 30000, 40000],
  ["harish-nagar", "DEMO Harish Nagar", 58, 1500000, 0, 500000],
  ["neha-agrawal", "DEMO Neha Agrawal", 26, 0, 72575, 50025],
].map(([key, fullName, age, opening, charge, payment], index) => ({
  index: index + 1,
  key,
  fullName,
  age,
  opening,
  charge,
  payment,
  balance: opening + charge - payment,
  patientId: stableUuid(`patient:${key}`),
  openingKey: stableUuid(`entry:${key}:opening_balance`),
  chargeKey: stableUuid(`entry:${key}:charge`),
  paymentKey: stableUuid(`entry:${key}:payment`),
}));

const expectedBalances = [
  80000, 0, 140000, 30000, 380000, 0, 820000, 25000, 300000, 100000,
  0, 150000, 100000, 400000, 9950, 0, 300000, 80000, 1000000, 22550,
];
const totals = rows.reduce((result, row) => {
  result.opening += row.opening;
  result.charges += row.charge;
  result.payments += row.payment;
  result.outstanding += row.balance;
  result.owing += row.balance > 0 ? 1 : 0;
  result.settled += row.balance === 0 ? 1 : 0;
  result.entries += [row.opening, row.charge, row.payment].filter((amount) => amount > 0).length;
  return result;
}, { opening: 0, charges: 0, payments: 0, outstanding: 0, owing: 0, settled: 0, entries: 0 });

function stableUuid(value) {
  const namespaceBytes = Buffer.from(namespace.replaceAll("-", ""), "hex");
  const digest = createHash("sha1").update(namespaceBytes).update(value).digest();
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function rupees(paise) {
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, "0")}`;
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function assertSeedData() {
  if (rows.length !== 20 || totals.owing !== 16 || totals.settled !== 4 ||
    totals.opening !== 5390000 || totals.charges !== 937525 ||
    totals.payments !== 2390025 || totals.outstanding !== 3937500 ||
    totals.entries !== 50 ||
    rows.some((row, index) => row.balance !== expectedBalances[index])) {
    throw new Error("The demo seed data or its recomputed verification totals are inconsistent.");
  }
}

function printTotals() {
  console.log(`Patients: ${rows.length}; positive balances: ${totals.owing}; settled: ${totals.settled}`);
  console.log(`Opening dues: INR ${rupees(totals.opening)}; charges: INR ${rupees(totals.charges)}; payments: INR ${rupees(totals.payments)}; outstanding: INR ${rupees(totals.outstanding)}`);
  console.log(`Non-zero financial entries: ${totals.entries}. No appointments or visits are seeded.`);
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}.`);
  return value;
}

function buildSql({ phone, doctorId }) {
  const valueRows = rows.map((row) => `(
    ${row.index},
    ${sqlLiteral(row.key)},
    ${sqlLiteral(row.patientId)}::uuid,
    ${sqlLiteral(row.openingKey)}::uuid,
    ${sqlLiteral(row.chargeKey)}::uuid,
    ${sqlLiteral(row.paymentKey)}::uuid,
    ${sqlLiteral(row.fullName)},
    ${sqlLiteral(phone)},
    ${row.age},
    ${row.opening},
    ${row.charge},
    ${row.payment},
    ${row.balance}
  )`).join(",\n");
  const doctor = sqlLiteral(doctorId);

  return `
\\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ;

CREATE TEMP TABLE demo_seed_expected (
  seed_order integer not null,
  seed_key text primary key,
  patient_id uuid not null unique,
  opening_key uuid not null unique,
  charge_key uuid not null unique,
  payment_key uuid not null unique,
  full_name text not null,
  mobile text not null,
  age integer not null,
  opening_paise bigint not null,
  charge_paise bigint not null,
  payment_paise bigint not null,
  expected_balance_paise bigint not null
);
INSERT INTO demo_seed_expected VALUES
${valueRows};
GRANT SELECT ON demo_seed_expected TO authenticated;

CREATE TEMP TABLE demo_seed_baseline (
  appointment_count bigint not null,
  visit_count bigint not null
);
INSERT INTO demo_seed_baseline
SELECT
  (SELECT count(*) FROM public.appointments),
  (SELECT count(*) FROM public.visits);
GRANT SELECT ON demo_seed_baseline TO authenticated;

CREATE TEMP TABLE demo_seed_state (
  existing_seed_entries bigint not null,
  existing_patient_entries bigint not null
);
INSERT INTO demo_seed_state
SELECT
  (SELECT count(*)
    FROM public.ledger_entries entry
    JOIN demo_seed_expected expected ON entry.patient_id = expected.patient_id
    WHERE entry.idempotency_key IN (expected.opening_key, expected.charge_key, expected.payment_key)),
  (SELECT count(*)
    FROM public.ledger_entries entry
    JOIN demo_seed_expected expected ON entry.patient_id = expected.patient_id);
GRANT SELECT ON demo_seed_state TO authenticated;

SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', ${doctor}, true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', ${doctor}, 'role', 'authenticated')::text,
    true
  );
END;
$$;

DO $$
BEGIN
  IF NOT public.is_authorized_doctor() THEN
    RAISE EXCEPTION 'The supplied user is not an authorized doctor.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM demo_seed_expected expected
    JOIN public.patients patient ON patient.full_name = expected.full_name
    WHERE patient.id <> expected.patient_id
  ) THEN
    RAISE EXCEPTION 'A DEMO patient name already exists under a different ID; refusing to create a duplicate.';
  END IF;
END;
$$;

INSERT INTO public.patients (id, full_name, mobile, age)
SELECT patient_id, full_name, mobile, age
FROM demo_seed_expected
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM demo_seed_expected expected
    LEFT JOIN public.patients patient ON patient.id = expected.patient_id
    WHERE patient.id IS NULL
      OR patient.full_name IS DISTINCT FROM expected.full_name
      OR patient.mobile IS DISTINCT FROM expected.mobile
      OR patient.age IS DISTINCT FROM expected.age
  ) THEN
    RAISE EXCEPTION 'A deterministic demo patient ID has conflicting details.';
  END IF;
END;
$$;

DO $$
DECLARE
  patient_row record;
  transaction_row record;
BEGIN
  FOR patient_row IN
    SELECT * FROM demo_seed_expected ORDER BY seed_order
  LOOP
    FOR transaction_row IN
      SELECT *
      FROM (VALUES
        (1, 'opening_balance'::text, patient_row.opening_paise, 'Demo opening dues.'::text,
          '2026-01-01T12:00:00+05:30'::timestamptz, patient_row.opening_key),
        (2, 'charge'::text, patient_row.charge_paise, 'Demo consultation charge.'::text,
          '2026-01-02T12:00:00+05:30'::timestamptz, patient_row.charge_key),
        (3, 'payment'::text, patient_row.payment_paise, 'Demo payment.'::text,
          '2026-01-03T12:00:00+05:30'::timestamptz, patient_row.payment_key)
      ) AS transaction_data(sequence_no, entry_type, amount_paise, description, effective_at, idempotency_key)
      WHERE amount_paise > 0
      ORDER BY sequence_no
    LOOP
      PERFORM public.post_ledger_entry(
        patient_row.patient_id,
        transaction_row.entry_type,
        transaction_row.amount_paise,
        transaction_row.description,
        transaction_row.effective_at,
        transaction_row.idempotency_key,
        false,
        NULL,
        NULL
      );
    END LOOP;
  END LOOP;
END;
$$;

DO $$
DECLARE
  patient_count bigint;
  positive_count bigint;
  settled_count bigint;
  entry_count bigint;
  opening_total bigint;
  charge_total bigint;
  payment_total bigint;
  seeded_balance_total bigint;
  view_balance_total bigint;
  ledger_balance_total bigint;
  appointment_count bigint;
  visit_count bigint;
  demo_search_count bigint;
  first_page_count bigint;
  second_page_count bigint;
  seed_ids_on_pages bigint;
  existing_seed_entries bigint;
  existing_patient_entries bigint;
BEGIN
  SELECT count(*) INTO patient_count
  FROM demo_seed_expected expected
  JOIN public.patients patient ON patient.id = expected.patient_id;

  SELECT
    count(*) FILTER (WHERE balance.balance_paise > 0),
    count(*) FILTER (WHERE balance.balance_paise = 0),
    coalesce(sum(balance.balance_paise), 0)
  INTO positive_count, settled_count, view_balance_total
  FROM demo_seed_expected expected
  JOIN public.patient_balances balance ON balance.patient_id = expected.patient_id;

  SELECT
    count(*),
    coalesce(sum(entry.amount_paise) FILTER (WHERE entry.idempotency_key = expected.opening_key), 0),
    coalesce(sum(entry.amount_paise) FILTER (WHERE entry.idempotency_key = expected.charge_key), 0),
    coalesce(sum(-entry.amount_paise) FILTER (WHERE entry.idempotency_key = expected.payment_key), 0),
    coalesce(sum(entry.amount_paise), 0)
  INTO entry_count, opening_total, charge_total, payment_total, seeded_balance_total
  FROM demo_seed_expected expected
  JOIN public.ledger_entries entry
    ON entry.patient_id = expected.patient_id
    AND entry.idempotency_key IN (expected.opening_key, expected.charge_key, expected.payment_key);

  SELECT coalesce(sum(balance.balance_paise), 0) INTO view_balance_total
  FROM demo_seed_expected expected
  JOIN public.patient_balances balance ON balance.patient_id = expected.patient_id;
  SELECT coalesce(sum(entry.amount_paise), 0) INTO ledger_balance_total
  FROM demo_seed_expected expected
  JOIN public.ledger_entries entry ON entry.patient_id = expected.patient_id;
  SELECT existing_seed_entries, existing_patient_entries
  INTO existing_seed_entries, existing_patient_entries
  FROM demo_seed_state;

  IF patient_count <> 20
    OR entry_count <> 50
    OR opening_total <> 5390000 OR charge_total <> 937525
    OR payment_total <> 2390025 OR seeded_balance_total <> 3937500
    OR view_balance_total <> ledger_balance_total
    OR (SELECT count(*) FILTER (WHERE expected_balance_paise > 0) FROM demo_seed_expected) <> 16
    OR (SELECT count(*) FILTER (WHERE expected_balance_paise = 0) FROM demo_seed_expected) <> 4 THEN
    RAISE EXCEPTION 'Seed-group totals did not match the row data.';
  END IF;

  IF existing_seed_entries = 0 AND existing_patient_entries = 0 AND (
    EXISTS (
      SELECT 1
      FROM demo_seed_expected expected
      JOIN public.patient_balances balance ON balance.patient_id = expected.patient_id
      WHERE balance.balance_paise <> expected.expected_balance_paise
    )
    OR positive_count <> 16 OR settled_count <> 4 OR view_balance_total <> 3937500
  ) THEN
    RAISE EXCEPTION 'First-seed live balances did not match the baseline row amounts.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM demo_seed_expected expected
    CROSS JOIN LATERAL public.patient_ledger_summary(expected.patient_id) summary
    WHERE summary.balance_paise <> (
        SELECT coalesce(sum(entry.amount_paise), 0)
        FROM public.ledger_entries entry
        WHERE entry.patient_id = expected.patient_id
      )
      OR (SELECT coalesce(max(history.total_count), 0)
        FROM public.patient_ledger_page(expected.patient_id, 0, 100) history)
        <> (SELECT count(*) FROM public.ledger_entries entry WHERE entry.patient_id = expected.patient_id)
  ) THEN
    RAISE EXCEPTION 'Patient summary, transaction history, and ledger balance did not agree.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.doctor_ledger_patient_page('DEMO Harish Nagar', 'all', 'name', 'asc', 0, 10) row
    WHERE row.patient_id = '${rows.find((row) => row.key === "harish-nagar").patientId}'::uuid
  ) THEN
    RAISE EXCEPTION 'Ledger search did not find DEMO Harish Nagar with INR 10,000 outstanding.';
  END IF;

  SELECT coalesce(max(total_count), 0) INTO demo_search_count
  FROM public.doctor_ledger_patient_page('DEMO', 'all', 'name', 'asc', 0, 100);
  IF demo_search_count = 20 THEN
    SELECT count(*) INTO first_page_count
    FROM public.doctor_ledger_patient_page('DEMO', 'all', 'name', 'asc', 0, 10);
    SELECT count(*) INTO second_page_count
    FROM public.doctor_ledger_patient_page('DEMO', 'all', 'name', 'asc', 10, 10);
    SELECT count(DISTINCT page.patient_id) INTO seed_ids_on_pages
    FROM (
      SELECT patient_id FROM public.doctor_ledger_patient_page('DEMO', 'all', 'name', 'asc', 0, 10)
      UNION ALL
      SELECT patient_id FROM public.doctor_ledger_patient_page('DEMO', 'all', 'name', 'asc', 10, 10)
    ) page
    JOIN demo_seed_expected expected ON expected.patient_id = page.patient_id;
    IF first_page_count <> 10 OR second_page_count <> 10 OR seed_ids_on_pages <> 20 THEN
      RAISE EXCEPTION 'The DEMO ledger search did not paginate its 20 patients across two pages.';
    END IF;
  END IF;

  SELECT count(*) INTO appointment_count FROM public.appointments;
  SELECT count(*) INTO visit_count FROM public.visits;
  IF appointment_count <> (SELECT appointment_count FROM demo_seed_baseline)
    OR visit_count <> (SELECT visit_count FROM demo_seed_baseline) THEN
    RAISE EXCEPTION 'Appointment or visit counts changed during seeding.';
  END IF;
END;
$$;

COMMIT;

BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', ${doctor}, true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', ${doctor}, 'role', 'authenticated')::text,
    true
  );
END;
$$;

SELECT
  count(*) AS seeded_patients,
  count(*) FILTER (WHERE expected.expected_balance_paise > 0) AS baseline_positive_balances,
  count(*) FILTER (WHERE expected.expected_balance_paise = 0) AS baseline_settled_patients,
  sum(expected.opening_paise) AS opening_dues_paise,
  sum(expected.charge_paise) AS charges_paise,
  sum(expected.payment_paise) AS payments_paise,
  sum(expected.expected_balance_paise) AS baseline_outstanding_paise,
  count(*) FILTER (WHERE balance.balance_paise > 0) AS current_positive_balances,
  count(*) FILTER (WHERE balance.balance_paise = 0) AS current_settled_patients,
  coalesce(sum(balance.balance_paise) FILTER (WHERE balance.balance_paise > 0), 0)
    AS current_outstanding_paise,
  coalesce(sum(-balance.balance_paise) FILTER (WHERE balance.balance_paise < 0), 0)
    AS current_patient_credit_paise,
  (SELECT coalesce(max(total_count), 0)
    FROM public.doctor_ledger_patient_page('DEMO', 'all', 'name', 'asc', 0, 100))
    AS demo_search_results,
  ceil(count(*)::numeric / 10)::integer AS seeded_group_pages,
  (SELECT ceil(coalesce(max(total_count), 0)::numeric / 10)::integer
    FROM public.doctor_ledger_patient_page('DEMO', 'all', 'name', 'asc', 0, 100))
    AS demo_search_pages
FROM demo_seed_expected expected
JOIN public.patient_balances balance ON balance.patient_id = expected.patient_id;

SELECT
  expected.seed_order,
  expected.full_name,
  balance.balance_paise
FROM demo_seed_expected expected
JOIN public.patient_balances balance ON balance.patient_id = expected.patient_id
ORDER BY expected.seed_order;

COMMIT;
`;
}

function main() {
  assertSeedData();
  if (process.argv.includes("--check")) {
    printTotals();
    console.log("Check only: no database connection or writes were attempted.");
    return;
  }

  const confirmation = requiredEnvironment("DEMO_SEED_CONFIRM_TEST_TARGET");
  if (confirmation !== "I_CONFIRM_THIS_IS_A_TEST_DATABASE") {
    throw new Error("Set DEMO_SEED_CONFIRM_TEST_TARGET to I_CONFIRM_THIS_IS_A_TEST_DATABASE only after confirming the target is test-only.");
  }

  const connectionString = requiredEnvironment("DEMO_SEED_DATABASE_URL");
  const expectedHost = requiredEnvironment("DEMO_SEED_EXPECTED_HOST").toLowerCase();
  const expectedDatabase = requiredEnvironment("DEMO_SEED_EXPECTED_DATABASE");
  const doctorId = requiredEnvironment("DEMO_SEED_DOCTOR_USER_ID");
  const phone = requiredEnvironment("DEMO_SEED_PHONE");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(doctorId)) {
    throw new Error("DEMO_SEED_DOCTOR_USER_ID must be a UUID.");
  }
  if (!/^\+91[6-9]\d{9}$/.test(phone)) {
    throw new Error("DEMO_SEED_PHONE must be a controlled test number in +91XXXXXXXXXX format.");
  }

  const target = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(target.protocol)) {
    throw new Error("DEMO_SEED_DATABASE_URL must be a PostgreSQL connection URI.");
  }
  const database = decodeURIComponent(target.pathname.replace(/^\/+/, ""));
  if (target.hostname.toLowerCase() !== expectedHost || database !== expectedDatabase) {
    throw new Error("Connection host/database do not exactly match the separately confirmed expected target.");
  }
  if (!target.username || !target.password) {
    throw new Error("The PostgreSQL connection URI must include a database username and password.");
  }

  const childEnv = { ...process.env };
  delete childEnv.DEMO_SEED_DATABASE_URL;
  childEnv.PGHOST = target.hostname;
  childEnv.PGPORT = target.port || "5432";
  childEnv.PGDATABASE = database;
  childEnv.PGUSER = decodeURIComponent(target.username);
  childEnv.PGPASSWORD = decodeURIComponent(target.password);
  childEnv.PGSSLMODE = target.searchParams.get("sslmode") || "require";

  printTotals();
  console.log("Target host/database matched the explicit confirmation. No credentials will be printed.");
  const result = spawnSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1"], {
    env: childEnv,
    input: buildSql({ phone, doctorId }),
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
  });
  if (result.error) {
    throw new Error(`Could not start psql: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Seed failed with psql exit code ${result.status ?? "unknown"}. The write transaction is rolled back on SQL errors.`);
  }
  console.log("Seed committed and post-commit group verification completed.");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Demo seed failed.");
  process.exitCode = 1;
}
