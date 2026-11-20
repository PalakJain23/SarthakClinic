import test from "node:test";
import assert from "node:assert/strict";
import { buildAppointmentNotification } from "../src/lib/appointment-notification.ts";
const item = { status: "confirmed", patientName: "Demo", mobile: "9229681235", bookingReference: "TEST123", doctorName: "Dr Test", session: { date: "2026-11-21", startsAt: "19:00:00", endsAt: "22:00:00", locationName: "Clinic", locationAddress: "Ashta" } };
test("only confirmed or cancelled decisions generate notifications", () => {
  for (const status of ["requested", "waiting", "consulting", "completed", "unknown"]) assert.equal(buildAppointmentNotification({ ...item, status }), null);
  const confirmed = buildAppointmentNotification(item)!;
  assert.match(confirmed.message, /19:00–22:00/);
  assert.match(confirmed.message, /2026-11-21/);
  assert.match(confirmed.message, /Clinic, Ashta/);
  assert.match(confirmed.message, /TEST123/);
  assert.match(confirmed.message, /Dr Test/);
  assert.match(confirmed.message, /निश्चित मिलने का समय नहीं/);
  assert.equal(new URL(confirmed.whatsappUrl!).searchParams.get("text"), confirmed.message);
  const cancelled = buildAppointmentNotification({ ...item, status: "cancelled" })!;
  assert.match(cancelled.message, /रद्द/);
  assert.match(cancelled.message, /19:00–22:00/);
  assert.ok(!cancelled.message.includes("निश्चित मिलने का समय नहीं"));
});
test("invalid phones cannot open WhatsApp and clinical notes are excluded", () => {
  const result = buildAppointmentNotification({
    ...item,
    mobile: "invalid",
    reason: "SECRET MEDICAL REASON",
    privateNotes: "SECRET PRIVATE NOTE",
    amount: "₹1000",
    preferredTime: "20:00",
  } as typeof item)!;
  assert.equal(result.whatsappUrl, null);
  for (const privateValue of ["SECRET", "₹1000", "20:00"]) {
    assert.ok(!result.message.includes(privateValue));
  }
});
