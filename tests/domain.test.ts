import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingSchema,
  normalizeIndianMobile,
} from "../src/lib/booking-schema.ts";
import {
  calculateBalanceAfterReversal,
  calculateAccountTotals,
  calculateLedgerBalance,
  calculateLedgerRunningBalances,
  parseRupeesToPaise,
} from "../src/lib/ledger.ts";
import { formatRupees } from "../src/lib/format.ts";
import {
  getSamplePublicClinic,
  SAMPLE_PUBLIC_CONTENT,
} from "../src/lib/sample-public-content.ts";

test("normalizes common Indian mobile formats and rejects invalid numbers", () => {
  assert.equal(normalizeIndianMobile("98765 43210"), "+919876543210");
  assert.equal(normalizeIndianMobile("+91 98765-43210"), "+919876543210");
  assert.throws(() => normalizeIndianMobile("1234567890"));
  assert.throws(() => normalizeIndianMobile("98765432101"));
  assert.throws(() => normalizeIndianMobile("abc9876543210"));
});

test("booking validation requires privacy acknowledgement and an unpredictable-key shape", () => {
  const valid = {
    patientName: "A Patient",
    mobile: "9876543210",
    sessionId: "123e4567-e89b-42d3-a456-426614174000",
    preferredTime: "",
    age: "",
    reason: "",
    privacyAcknowledged: true,
    idempotencyKey: "987e4567-e89b-42d3-a456-426614174000",
  };
  assert.equal(bookingSchema.safeParse(valid).success, true);
  assert.equal(bookingSchema.safeParse({
    ...valid,
    doctorId: "123e4567-e89b-42d3-a456-426614174000",
  }).success, true);
  assert.equal(bookingSchema.safeParse({ ...valid, doctorId: "unknown-doctor" }).success, false);
  assert.equal(bookingSchema.safeParse({ ...valid, privacyAcknowledged: false }).success, false);
  assert.equal(bookingSchema.safeParse({ ...valid, idempotencyKey: "not-a-uuid" }).success, false);
  assert.equal(bookingSchema.safeParse({ ...valid, age: true }).success, false);
});

test("sample public schedule is preview-only and uses the configured local times", () => {
  const preview = getSamplePublicClinic({
    isDemo: false,
    isConfigured: false,
    includeSampleSessions: true,
  });
  assert.equal(preview.isSampleProfile, true);
  assert.equal(preview.isSampleAvailability, true);
  assert.equal(preview.doctorName, "Subhal Singh Thakur");
  assert.equal(preview.qualification, "");
  assert.equal(preview.speciality, "");
  assert.equal(preview.registrationInfo, "");
  assert.equal(preview.phone, "+919229681235");
  assert.equal(preview.whatsapp, "+919229681235");
  assert.equal(SAMPLE_PUBLIC_CONTENT.publicPhoneDisplay, "+91 92296 81235");
  assert.equal(preview.sessions.length, 14);
  assert.deepEqual(preview.additionalDoctors, []);
  assert.ok(preview.sessions.every((session) => session.isSample && session.status === "closed"));
  assert.deepEqual(
    preview.sessions.slice(0, 2).map(({ startsAt, endsAt }) => [startsAt, endsAt]),
    [["10:00", "13:00"], ["19:00", "22:00"]],
  );
  assert.equal(
    getSamplePublicClinic({
      isDemo: false,
      isConfigured: true,
      includeSampleSessions: false,
    }).sessions.length,
    0,
  );
});

test("uses exact integer paise for ledger amounts", () => {
  assert.equal(parseRupeesToPaise("2000"), 200000n);
  assert.equal(parseRupeesToPaise("0.01"), 1n);
  assert.equal(parseRupeesToPaise("-12.34", true), -1234n);
  assert.equal(parseRupeesToPaise("1.234"), null);
  assert.equal(parseRupeesToPaise("0"), null);
  assert.equal(parseRupeesToPaise("-5"), null);
});

test("ledger example and corrections calculate without floating-point arithmetic", () => {
  const balance = calculateLedgerBalance([
    { amountPaise: 200000n },
    { amountPaise: 50000n },
    { amountPaise: -100000n },
  ]);
  assert.equal(balance, 150000n);
  assert.equal(
    calculateLedgerBalance([
      { amountPaise: balance },
      { amountPaise: 2500n },
      { amountPaise: -500n },
      { amountPaise: -1000n },
    ]),
    151000n,
  );
});

test("reversal cannot create a negative account balance", () => {
  assert.equal(calculateBalanceAfterReversal(50000n, 50000n), 0n);
  assert.equal(calculateBalanceAfterReversal(49999n, 50000n), null);
  assert.equal(calculateBalanceAfterReversal(0n, -50000n), 50000n);
});

test("transaction history calculates chronological balances for partial and full payments", () => {
  const history = calculateLedgerRunningBalances([
    { amountPaise: 200000n },
    { amountPaise: -50000n },
    { amountPaise: 2500n },
    { amountPaise: -2500n },
    { amountPaise: -100000n },
    { amountPaise: -50000n },
  ]);
  assert.deepEqual(history.map((entry) => entry.runningBalance), [
    200000n,
    150000n,
    152500n,
    150000n,
    50000n,
    0n,
  ]);
  assert.equal(history.at(-1)?.runningBalance, 0n);
});

test("opening dues, charges, and payments produce one consistent paise balance", () => {
  const entries = [
    { amountPaise: 200000n },
    { amountPaise: 50000n },
    { amountPaise: -100000n },
  ];
  assert.equal(calculateLedgerBalance(entries), 150000n);
  assert.equal(calculateLedgerBalance([...entries, { amountPaise: -50000n }]), 100000n);
  assert.equal(
    calculateLedgerBalance([...entries, { amountPaise: -50000n }, { amountPaise: 50000n }]),
    150000n,
  );
});

test("a patient without appointments can repay opening dues through ledger entries alone", () => {
  const openingDues = parseRupeesToPaise("1000");
  const payment = parseRupeesToPaise("400");
  assert.ok(openingDues !== null && payment !== null);
  assert.equal(calculateLedgerBalance([
    { amountPaise: openingDues },
    { amountPaise: -payment },
  ]), 60000n);
});

test("account totals separate outstanding balances and patient credit", () => {
  assert.deepEqual(
    calculateAccountTotals([150000n, -4000n, 0n, 2500n]),
    { outstanding: 152500n, patientsOwing: 2, patientCredit: 4000n },
  );
});

test("formats paise exactly, including values larger than JavaScript safe integers", () => {
  assert.equal(formatRupees(150000n), "₹1,500.00");
  assert.equal(formatRupees(-1n), "−₹0.01");
  assert.equal(formatRupees(900719925474099300n), "₹9,00,71,99,25,47,40,993.00");
});
