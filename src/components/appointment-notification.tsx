"use client";

import { buildAppointmentNotification, type AppointmentNotificationInput } from "@/lib/appointment-notification";

export function AppointmentNotification({ item }: { item: AppointmentNotificationInput }) {
  const notification = buildAppointmentNotification(item);
  if (!notification) return null;
  return (
    <details className="w-full min-w-0 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
      <summary className="cursor-pointer font-semibold text-emerald-900">Notify on WhatsApp · {item.status === "confirmed" ? "Confirmed" : "Cancelled"}</summary>
      <p className="mt-2 text-slate-700">Status saved. This message is not sent automatically. Review it, open WhatsApp, then press Send.</p>
      <textarea aria-label="Appointment message preview" readOnly value={notification.message} rows={8} className="mt-3 w-full rounded-lg border border-slate-300 bg-white p-3" />
      {notification.whatsappUrl ? <a href={notification.whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 font-semibold text-white">Open WhatsApp</a>
        : <p className="mt-2 text-amber-900">No valid WhatsApp number. Copy the message above or contact the patient by phone.</p>}
      <p className="mt-2 text-xs text-slate-600">Opening WhatsApp does not confirm delivery. Check the recipient before sending.</p>
    </details>
  );
}
