import { normalizeIndianMobileIfValid } from "./booking-schema.ts";

export type AppointmentNotificationInput = {
  status: string;
  patientName: string;
  mobile: string;
  bookingReference: string;
  doctorName?: string;
  session: { date: string; startsAt: string; endsAt: string; locationName: string; locationAddress: string };
};

// Only persisted decisions may be communicated; preferred times are not assigned slots.
export function buildAppointmentNotification(item: AppointmentNotificationInput) {
  if (item.status !== "confirmed" && item.status !== "cancelled") return null;
  const s = item.session;
  const decision = item.status === "confirmed"
    ? "आपके अपॉइंटमेंट की पुष्टि हो गई है।"
    : "आपका अपॉइंटमेंट रद्द कर दिया गया है। कृपया नई बुकिंग या जानकारी के लिए क्लिनिक से संपर्क करें।";
  const doctor = item.doctorName ? `डॉक्टर: ${item.doctorName}\n` : "";
  const hours = `क्लिनिक सत्र के घंटे: ${s.startsAt.slice(0, 5)}–${s.endsAt.slice(0, 5)} (भारत समय)।`;
  const timeDisclaimer = item.status === "confirmed"
    ? "\nयह सत्र का समय है; आपका अलग से निश्चित मिलने का समय नहीं है।"
    : "";
  const message = `नमस्ते ${item.patientName} जी,\nसार्थक क्लिनिक से सूचना:\n${decision}\n${doctor}तारीख़: ${s.date}\n${hours}${timeDisclaimer}\nस्थान: ${s.locationName}${s.locationAddress ? `, ${s.locationAddress}` : ""}\nबुकिंग संदर्भ: ${item.bookingReference}`;
  const phone = normalizeIndianMobileIfValid(item.mobile);
  return { message, whatsappUrl: phone ? `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(message)}` : null };
}
