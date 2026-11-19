"use client";

import { useState } from "react";

export function WhatsAppPaymentReminder({
  message,
  whatsappUrl,
  compact = false,
}: {
  message: string;
  whatsappUrl: string | null;
  compact?: boolean;
}) {
  const [copyStatus, setCopyStatus] = useState("");

  async function copyReminder() {
    setCopyStatus("");
    if (!navigator.clipboard?.writeText) {
      setCopyStatus("Clipboard access is unavailable. Please copy the reminder manually.");
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      setCopyStatus("Reminder copied.");
    } catch {
      setCopyStatus("Could not copy the reminder. Please copy it manually.");
    }
  }

  return (
    <div className={compact ? "space-y-2" : "mt-4 space-y-2"}>
      <div className="flex flex-wrap gap-2">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800"
          >
            Send WhatsApp Reminder
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white opacity-50"
          >
            Send WhatsApp Reminder
          </button>
        )}
        <button
          type="button"
          onClick={copyReminder}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          Copy Reminder
        </button>
      </div>
      {!whatsappUrl && (
        <p role="alert" className="text-xs font-medium text-red-700">
          Reminder unavailable: no valid Indian mobile number is saved. Add or correct the phone number to open WhatsApp.
        </p>
      )}
      {whatsappUrl && (
        <p className="text-xs text-slate-600">WhatsApp will open with the reminder ready for you to review and send.</p>
      )}
      {copyStatus && <p role="status" className="text-xs font-medium text-emerald-800">{copyStatus}</p>}
    </div>
  );
}
