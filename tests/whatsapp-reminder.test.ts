import assert from "node:assert/strict";
import test from "node:test";
import { normalizeIndianMobileIfValid } from "../src/lib/booking-schema.ts";
import { buildPaymentReminder } from "../src/lib/whatsapp-reminder.ts";

test("normalizes valid Indian numbers without duplicating the country code", () => {
  assert.equal(normalizeIndianMobileIfValid("98765 43210"), "+919876543210");
  assert.equal(normalizeIndianMobileIfValid("+91 98765-43210"), "+919876543210");
  assert.equal(normalizeIndianMobileIfValid("919876543210"), "+919876543210");
  assert.equal(normalizeIndianMobileIfValid("+91919876543210"), null);
  assert.equal(normalizeIndianMobileIfValid("1234567890"), null);
  assert.equal(normalizeIndianMobileIfValid(null), null);
});

test("builds the exact Hindi reminder and a URL-encoded WhatsApp link", () => {
  const reminder = buildPaymentReminder("Asha", "1,250.50", "+91 98765-43210");

  assert.equal(reminder.message, `नमस्ते Asha जी,

सार्थक क्लिनिक की ओर से आपको विनम्रतापूर्वक याद दिलाना है कि आपके खाते में ₹1,250.50 की राशि अभी बकाया है।

कृपया अपनी सुविधानुसार बकाया राशि का भुगतान कर दें।

यदि आपने पहले ही भुगतान कर दिया है, तो कृपया हमें सूचित करें।

धन्यवाद।
सार्थक क्लिनिक`);
  assert.ok(reminder.whatsappUrl);
  const url = new URL(reminder.whatsappUrl);
  assert.equal(url.origin + url.pathname, "https://wa.me/919876543210");
  assert.equal(url.searchParams.get("text"), reminder.message);
});

test("keeps the reminder copyable when the saved phone number is invalid", () => {
  const reminder = buildPaymentReminder("Asha", "100.00", "1234567890");

  assert.equal(reminder.whatsappUrl, null);
  assert.match(reminder.message, /₹100\.00/);
});
