import { normalizeIndianMobileIfValid } from "./booking-schema.ts";

export function buildPaymentReminder(
  name: string,
  remainingAmount: string,
  mobile: string | null,
) {
  const message = `नमस्ते ${name} जी,

सार्थक क्लिनिक की ओर से आपको विनम्रतापूर्वक याद दिलाना है कि आपके खाते में ₹${remainingAmount} की राशि अभी बकाया है।

कृपया अपनी सुविधानुसार बकाया राशि का भुगतान कर दें।

यदि आपने पहले ही भुगतान कर दिया है, तो कृपया हमें सूचित करें।

धन्यवाद।
सार्थक क्लिनिक`;
  const normalizedPhone = normalizeIndianMobileIfValid(mobile);

  return {
    message,
    whatsappUrl: normalizedPhone
      ? `https://wa.me/${normalizedPhone.slice(1)}?text=${encodeURIComponent(message)}`
      : null,
  };
}
