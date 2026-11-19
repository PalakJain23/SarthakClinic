"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MapPin, Pencil, Trash2, Upload, UserRound } from "lucide-react";
import {
  createPatientAction,
  createSessionAction,
  linkAppointmentPatientAction,
  addLocationAction,
  addStandardLocationsAction,
  addServiceAction,
  addVisitAction,
  blockDateAction,
  recordLedgerAction,
  correctLedgerEntryAction,
  correctLedgerPersonEntryAction,
  deleteLedgerPersonEntryAction,
  archiveLedgerPersonAction,
  restoreLedgerPersonAction,
  saveClinicDetailsAction,
  saveOwnerProfileAction,
  updateSessionAction,
  updatePatientAction,
  updateLocationAction,
  updateServiceAction,
  updateAppointmentStatusAction,
  type FormActionState,
} from "@/app/doctor/actions";
import { formatRupees, indiaDate } from "@/lib/format";
import { calculateBalanceAfterReversal } from "@/lib/ledger";

const initialState: FormActionState = {};

function Feedback({ state }: { state: FormActionState }) {
  return state.error ? (
    <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</p>
  ) : state.success ? (
    <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{state.success}</p>
  ) : null;
}

export function PatientForm() {
  const [state, action, pending] = useActionState(createPatientAction, initialState);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Patient name <input name="fullName" required maxLength={120} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold">Mobile number <input name="mobile" type="tel" required maxLength={18} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold">Age (optional) <input name="age" type="number" min={1} max={120} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold sm:col-span-2">Private notes <textarea name="privateNotes" maxLength={5000} rows={3} className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>
      <p className="text-xs text-slate-600 sm:col-span-2">A separate patient record is created each time. Shared phone numbers do not merge family members.</p>
      <div className="sm:col-span-2"><Feedback state={state} /></div>
      <button disabled={pending} className="min-h-11 rounded-lg bg-[var(--primary)] px-5 font-semibold text-white disabled:bg-slate-400 sm:col-span-2">{pending ? "Saving…" : "Add patient"}</button>
    </form>
  );
}

export function SessionForm({
  locations,
}: {
  locations: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createSessionAction, initialState);
  return (
    <form action={action} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
      <h2 className="text-lg font-bold sm:col-span-2">Create a session</h2>
      <label className="text-sm font-semibold">Date <input name="sessionDate" type="date" required min={indiaDate()} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold">Location <select name="locationId" required disabled={locations.length === 0} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal disabled:bg-slate-100"><option value="">{locations.length ? "Select location" : "No active locations available"}</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>
        {locations.length === 0 && <span className="mt-1 block font-normal text-slate-600">Add a standard location above or activate a location in Settings before creating a session.</span>}
      </label>
      <label className="text-sm font-semibold">Starts at <input name="startsAt" type="time" required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold">Ends at <input name="endsAt" type="time" required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold">Booking capacity <input name="capacity" type="number" min={1} max={500} defaultValue={10} required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="flex items-center gap-3 self-end rounded-lg border border-slate-200 p-3 text-sm font-medium"><input name="bookingsEnabled" type="checkbox" className="size-5 accent-[var(--primary)]" /> Accept public booking requests</label>
      <label className="text-sm font-semibold sm:col-span-2">Public note (optional) <input name="publicNote" maxLength={300} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold sm:col-span-2">Private note (optional) <textarea name="privateNote" maxLength={1000} rows={2} className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>
      <div className="sm:col-span-2"><Feedback state={state} /></div>
      <button disabled={pending || locations.length === 0} className="min-h-11 rounded-lg bg-[var(--primary)] px-5 font-semibold text-white disabled:bg-slate-400 sm:col-span-2">{pending ? "Saving…" : "Save session"}</button>
    </form>
  );
}

export function StandardLocationsForm() {
  const [state, action, pending] = useActionState(addStandardLocationsAction, initialState);
  return (
    <form action={action} className="rounded-xl border border-teal-100 bg-teal-50 p-4">
      <p className="text-sm leading-6 text-teal-950">
        Add the standard session locations so they can be selected here. Both use Ashta, Madhya Pradesh; you can edit them later in Settings.
      </p>
      <Feedback state={state} />
      <button disabled={pending} className="mt-3 min-h-10 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:bg-slate-400">
        {pending ? "Adding locations…" : "Add Village and Sarthak Clinic locations"}
      </button>
    </form>
  );
}

export function BlockDateForm() {
  const [state, action, pending] = useActionState(blockDateAction, initialState);
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:grid-cols-[1fr_2fr_auto_auto] sm:items-end">
      <label className="text-sm font-semibold">Date <input name="blockedDate" type="date" required className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal" /></label>
      <label className="text-sm font-semibold">Reason (optional) <input name="reason" maxLength={300} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal" /></label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input name="blocked" type="checkbox" className="size-4 accent-[var(--primary)]" /> Block date</label>
      <button disabled={pending} className="min-h-11 rounded-lg border border-amber-400 px-4 font-semibold text-amber-950 disabled:opacity-50">{pending ? "Saving…" : "Update date"}</button>
      <div className="sm:col-span-4"><Feedback state={state} /></div>
      <p className="text-xs leading-5 text-amber-950 sm:col-span-4">Blocking a date stops public booking and flags existing bookings for manual contact. Unblocking does not clear those flags.</p>
    </form>
  );
}

export function SessionUpdateForm({
  session,
  locations,
}: {
  session: {
    id: string;
    session_date: string;
    location_id: string;
    starts_at: string;
    ends_at: string;
    capacity: number;
    bookings_enabled: boolean;
    is_blocked: boolean;
    public_note: string | null;
    private_note: string | null;
  };
  locations: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(updateSessionAction, initialState);
  return (
    <form action={action} className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
      <input type="hidden" name="sessionId" value={session.id} />
      <label className="text-sm font-semibold">Date <input name="sessionDate" type="date" defaultValue={session.session_date} required className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 font-normal" /></label>
      <label className="text-sm font-semibold">Location <select name="locationId" defaultValue={session.location_id} required className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 font-normal">{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
      <label className="text-sm font-semibold">Starts <input name="startsAt" type="time" defaultValue={session.starts_at.slice(0, 5)} required className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 font-normal" /></label>
      <label className="text-sm font-semibold">Ends <input name="endsAt" type="time" defaultValue={session.ends_at.slice(0, 5)} required className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 font-normal" /></label>
      <label className="text-sm font-semibold">Capacity <input name="capacity" type="number" min={1} max={500} defaultValue={session.capacity} required className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 font-normal" /></label>
      <div className="flex flex-col gap-2 text-sm sm:justify-end">
        <label className="flex items-center gap-2"><input name="bookingsEnabled" type="checkbox" defaultChecked={session.bookings_enabled} className="size-4 accent-[var(--primary)]" /> Public bookings open</label>
        <label className="flex items-center gap-2"><input name="isBlocked" type="checkbox" defaultChecked={session.is_blocked} className="size-4 accent-[var(--primary)]" /> Block session</label>
      </div>
      <label className="text-sm font-semibold sm:col-span-2">Public note <input name="publicNote" defaultValue={session.public_note ?? ""} maxLength={300} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 font-normal" /></label>
      <label className="text-sm font-semibold sm:col-span-2">Private note <input name="privateNote" defaultValue={session.private_note ?? ""} maxLength={1000} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 font-normal" /></label>
      <label className="flex items-start gap-2 text-sm text-amber-900 sm:col-span-2"><input name="confirmAffected" type="checkbox" className="mt-1 size-4 accent-[var(--primary)]" /> I understand that affected appointments will remain unchanged and be flagged for manual contact.</label>
      <div className="sm:col-span-2"><Feedback state={state} /></div>
      <button disabled={pending} className="min-h-10 rounded-lg border border-slate-300 px-4 font-semibold sm:col-span-2">{pending ? "Saving…" : "Update session"}</button>
    </form>
  );
}

export function VisitForm({
  patientId,
  appointments,
}: {
  patientId: string;
  appointments: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(addVisitAction, initialState);
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <input type="hidden" name="patientId" value={patientId} />
      <label className="text-sm font-semibold">Visit date <input name="visitDate" type="date" required defaultValue={indiaDate()} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold">Link appointment (optional) <select name="appointmentId" defaultValue="" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"><option value="">No linked appointment</option>{appointments.map((appointment) => <option key={appointment.id} value={appointment.id}>{appointment.label}</option>)}</select></label>
      <label className="text-sm font-semibold">Consultation notes <textarea name="notes" maxLength={10000} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>
      <Feedback state={state} />
      <button disabled={pending} className="min-h-11 rounded-lg bg-[var(--primary)] px-4 font-semibold text-white disabled:bg-slate-400">{pending ? "Saving…" : "Save visit"}</button>
    </form>
  );
}

export function LocationForm() {
  const [state, action, pending] = useActionState(addLocationAction, initialState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-semibold">Location name <input name="name" required maxLength={120} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="block text-sm font-semibold">Google Maps directions link (optional) <input name="directionsUrl" type="url" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="block text-sm font-semibold sm:col-span-2">Public address <textarea name="address" required maxLength={500} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>
      <div className="sm:col-span-2"><Feedback state={state} /></div>
      <button disabled={pending} className="min-h-11 rounded-lg bg-[var(--primary)] px-4 font-semibold text-white disabled:bg-slate-400 sm:col-span-2">{pending ? "Saving…" : "Add location"}</button>
    </form>
  );
}

export function LocationEditForm({
  location,
}: {
  location: { id: string; name: string; public_address: string; directions_url: string | null; active: boolean };
}) {
  const [state, action, pending] = useActionState(updateLocationAction, initialState);
  const [editing, setEditing] = useState(false);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      {editing ? (
        <form action={action} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={location.id} />
          <label className="text-sm font-semibold">Location name <input name="name" defaultValue={location.name} required maxLength={120} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
          <label className="text-sm font-semibold">Google Maps link <input name="directionsUrl" type="url" defaultValue={location.directions_url ?? ""} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
          <label className="text-sm font-semibold sm:col-span-2">Public address <textarea name="address" defaultValue={location.public_address} required maxLength={500} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>
          <label className="flex min-h-10 items-center gap-2 text-sm sm:col-span-2"><input name="active" type="checkbox" defaultChecked={location.active} className="size-4 accent-[var(--primary)]" /> Publicly visible</label>
          <div className="sm:col-span-2"><Feedback state={state} /></div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button disabled={pending} className="min-h-10 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:bg-slate-400">{pending ? "Saving…" : "Save location"}</button>
            <button type="button" onClick={() => setEditing(false)} disabled={pending} className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-950">{location.name}</h3>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${location.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                {location.active ? "Public" : "Hidden"}
              </span>
            </div>
            <p className="mt-1 text-sm leading-5 text-slate-700">{location.public_address}</p>
            {location.directions_url && (
              <a href={location.directions_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-sm font-semibold text-teal-800 hover:text-teal-950">
                <MapPin size={15} aria-hidden="true" /> Open Google Maps
              </a>
            )}
          </div>
          <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Pencil size={14} aria-hidden="true" /> Edit
          </button>
        </div>
      )}
      {!editing && <Feedback state={state} />}
    </section>
  );
}

export function ServiceForm() {
  const [state, action, pending] = useActionState(addServiceAction, initialState);
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-semibold">Service name <input name="name" required maxLength={120} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <Feedback state={state} />
      <button disabled={pending} className="min-h-11 rounded-lg bg-[var(--primary)] px-4 font-semibold text-white disabled:bg-slate-400">{pending ? "Saving…" : "Add service"}</button>
    </form>
  );
}

export function ServiceEditForm({
  service,
}: {
  service: { id: string; name: string; active: boolean };
}) {
  const [state, action, pending] = useActionState(updateServiceAction, initialState);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 p-3">
      <input type="hidden" name="id" value={service.id} />
      <label className="min-w-40 flex-1 text-xs font-semibold">Service name <input name="name" defaultValue={service.name} required maxLength={120} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-sm font-normal" /></label>
      <label className="flex min-h-10 items-center gap-2 text-xs"><input name="active" type="checkbox" defaultChecked={service.active} className="size-4 accent-[var(--primary)]" /> Published</label>
      <button disabled={pending} className="min-h-10 rounded-lg border border-slate-300 px-3 text-xs font-semibold">{pending ? "Saving…" : "Save"}</button>
      <Feedback state={state} />
    </form>
  );
}

export function CorrectLedgerTransaction({
  patientId,
  personId,
  entryId,
  entryType,
  entryDate,
  amountPaise,
  description,
  expectedBalancePaise,
  compact = false,
}: {
  patientId?: string;
  personId?: string;
  entryId: string;
  entryType: string;
  entryDate: string;
  amountPaise: string;
  description: string;
  expectedBalancePaise: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={compact ? "Correct transaction" : undefined} className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border bg-white px-2.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${compact ? "border-emerald-300 text-emerald-900 hover:bg-emerald-50 focus-visible:outline-emerald-700" : "border-amber-300 text-amber-900 hover:bg-amber-50 focus-visible:outline-amber-700"}`}>
        {compact && <Pencil size={14} aria-hidden="true" />}
        {compact ? "Correct" : "Correct Mistake"}
      </button>
      {open && (
        <CorrectionDialog
          key={entryId}
          patientId={patientId}
          personId={personId}
          entryId={entryId}
          entryType={entryType}
          entryDate={entryDate}
          amountPaise={amountPaise}
          description={description}
          expectedBalancePaise={expectedBalancePaise}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export function DeleteLedgerEntryButton({
  personId,
  entryId,
  entryType,
  entryDate,
  amountPaise,
  currentBalancePaise,
  compact = false,
}: {
  personId: string;
  entryId: string;
  entryType: string;
  entryDate: string;
  amountPaise: string;
  currentBalancePaise: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={compact ? "Delete transaction entry" : undefined} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-white px-2.5 text-xs font-semibold text-rose-800 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700">
        {compact && <Trash2 size={14} aria-hidden="true" />}
        {compact ? "Delete" : "Delete Entry"}
      </button>
      {open && (
        <DeleteLedgerEntryDialog
          key={entryId}
          personId={personId}
          entryId={entryId}
          entryType={entryType}
          entryDate={entryDate}
          amountPaise={amountPaise}
          currentBalancePaise={currentBalancePaise}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function DeleteLedgerEntryDialog({
  personId,
  entryId,
  entryType,
  entryDate,
  amountPaise,
  currentBalancePaise,
  onClose,
}: {
  personId: string;
  entryId: string;
  entryType: string;
  entryDate: string;
  amountPaise: string;
  currentBalancePaise: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(deleteLedgerPersonEntryAction, initialState);
  const idempotencyInput = useRef<HTMLInputElement>(null);
  const effectiveAtInput = useRef<HTMLInputElement>(null);
  const entryAmount = BigInt(amountPaise);
  const currentBalance = BigInt(currentBalancePaise);
  const nextBalance = calculateBalanceAfterReversal(currentBalance, entryAmount);
  useEffect(() => {
    if (state.successToken) {
      if (idempotencyInput.current) idempotencyInput.current.value = crypto.randomUUID();
      if (effectiveAtInput.current) effectiveAtInput.current.value = new Date().toISOString();
      const refreshTimer = window.setTimeout(() => router.refresh(), 1000);
      return () => window.clearTimeout(refreshTimer);
    }
  }, [router, state.successToken]);
  function prepareIdempotency() {
    if (idempotencyInput.current && !idempotencyInput.current.value) {
      idempotencyInput.current.value = crypto.randomUUID();
      if (effectiveAtInput.current) effectiveAtInput.current.value = new Date().toISOString();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="delete-entry-title" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <h2 id="delete-entry-title" className="text-xl font-bold text-slate-950">Delete this entry?</h2>
        <p className="mt-1 text-sm text-slate-600">{entryType} · {entryDate} · {formatRupees(entryAmount < 0n ? -entryAmount : entryAmount)}</p>
        {state.success ? (
          <div className="mt-5 space-y-4">
            <Feedback state={state} />
            <button type="button" onClick={() => { onClose(); router.refresh(); }} className="min-h-11 w-full rounded-lg bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800">Refresh transaction history</button>
          </div>
        ) : (
          <form action={action} onSubmit={prepareIdempotency} className="mt-5 space-y-4">
            <input type="hidden" name="ledgerPersonId" value={personId} />
            <input type="hidden" name="entryId" value={entryId} />
            <input ref={idempotencyInput} type="hidden" name="idempotencyKey" />
            <input ref={effectiveAtInput} type="hidden" name="effectiveAt" />
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p>This will remove the amount from the current balance by adding a cancellation. The original entry and its cancellation will remain in history.</p>
              {nextBalance === null ? (
                <p className="mt-2 font-semibold">This would make the account balance negative, so this entry cannot be removed.</p>
              ) : (
                <p className="mt-2 font-semibold">Expected remaining balance: {formatRupees(nextBalance)}.</p>
              )}
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input name="confirmDelete" type="checkbox" required className="mt-0.5 size-4 accent-rose-700" />
              I understand this only removes the amount from the balance; it does not erase the history.
            </label>
            <Feedback state={state} />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} disabled={pending} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:opacity-50">Cancel</button>
              <button disabled={pending || nextBalance === null} className="min-h-11 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:opacity-50">{pending ? "Removing…" : "Confirm Delete Entry"}</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export function LedgerPersonArchiveAction({
  personId,
  balancePaise,
  archived,
}: {
  personId: string;
  balancePaise: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [completedOperation, setCompletedOperation] = useState<"archive" | "restore" | null>(null);
  const [state, action, pending] = useActionState(
    archived ? restoreLedgerPersonAction : archiveLedgerPersonAction,
    initialState,
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`min-h-10 rounded-lg border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${archived ? "border-emerald-300 text-emerald-800 hover:bg-emerald-50 focus-visible:outline-emerald-700" : "border-rose-300 text-rose-800 hover:bg-rose-50 focus-visible:outline-rose-700"}`}>
        {archived ? "Restore Account" : "Delete Person"}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="archive-person-title" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <h2 id="archive-person-title" className="text-xl font-bold text-slate-950">{archived ? "Restore this account?" : "Delete this person from the ledger?"}</h2>
            {state.success ? (
              <div className="mt-5 space-y-4">
                <Feedback state={state} />
                <button type="button" onClick={() => { onArchiveComplete(router, completedOperation === "restore"); }} className="min-h-11 w-full rounded-lg bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800">
                  {completedOperation === "restore" ? "Go to active Udhaar Ledger" : "Go to archived accounts"}
                </button>
              </div>
            ) : (
              <form action={action} onSubmit={() => setCompletedOperation(archived ? "restore" : "archive")} className="mt-4 space-y-4">
                <input type="hidden" name="ledgerPersonId" value={personId} />
                {archived ? (
                  <>
                    <p className="text-sm text-slate-700">This will return the account to the active Udhaar Ledger. Its transaction history and balance will stay unchanged.</p>
                    <label className="flex items-start gap-2 text-sm text-slate-700">
                      <input name="confirmRestore" type="checkbox" required className="mt-0.5 size-4 accent-emerald-700" />
                      I confirm this account should be restored.
                    </label>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-700">This hides the account from the active Udhaar Ledger. It does not delete the clinical patient, financial history, or balance.</p>
                    {BigInt(balancePaise) > 0n && (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                        <p className="font-semibold">Outstanding dues: {formatRupees(balancePaise)}.</p>
                        <p className="mt-1">These dues will remain in the account and in the clinic’s totals. Archiving does not clear or write them off.</p>
                        <label className="mt-3 flex items-start gap-2">
                          <input name="confirmOutstanding" type="checkbox" required className="mt-0.5 size-4 accent-amber-700" />
                          I understand these dues will remain.
                        </label>
                      </div>
                    )}
                    <label className="flex items-start gap-2 text-sm text-slate-700">
                      <input name="confirmArchive" type="checkbox" required className="mt-0.5 size-4 accent-rose-700" />
                      I confirm this account should be archived, not erased.
                    </label>
                  </>
                )}
                <Feedback state={state} />
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setOpen(false)} disabled={pending} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:opacity-50">Cancel</button>
                  <button disabled={pending} className={`min-h-11 rounded-lg px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${archived ? "bg-emerald-700 hover:bg-emerald-800 focus-visible:outline-emerald-700" : "bg-rose-700 hover:bg-rose-800 focus-visible:outline-rose-700"}`}>
                    {pending ? "Saving…" : archived ? "Confirm Restore" : "Confirm Delete Person"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function onArchiveComplete(router: ReturnType<typeof useRouter>, wasArchived: boolean) {
  router.push(wasArchived ? "/doctor/accounts" : "/doctor/accounts/archived");
  router.refresh();
}

function CorrectionDialog({
  patientId,
  personId,
  entryId,
  entryType,
  entryDate,
  amountPaise,
  description,
  expectedBalancePaise,
  onClose,
}: {
  patientId?: string;
  personId?: string;
  entryId: string;
  entryType: string;
  entryDate: string;
  amountPaise: string;
  description: string;
  expectedBalancePaise: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    personId ? correctLedgerPersonEntryAction : correctLedgerEntryAction,
    initialState,
  );
  const [mistake, setMistake] = useState("");
  const idempotencyInput = useRef<HTMLInputElement>(null);
  const effectiveAtInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state.successToken) {
      if (idempotencyInput.current) idempotencyInput.current.value = crypto.randomUUID();
      if (effectiveAtInput.current) effectiveAtInput.current.value = new Date().toISOString();
      const refreshTimer = window.setTimeout(() => router.refresh(), 1200);
      return () => window.clearTimeout(refreshTimer);
    }
  }, [router, state.successToken]);
  function prepareIdempotency() {
    if (idempotencyInput.current && !idempotencyInput.current.value) {
      idempotencyInput.current.value = crypto.randomUUID();
      if (effectiveAtInput.current) effectiveAtInput.current.value = new Date().toISOString();
    }
  }
  const amount = BigInt(amountPaise);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="correction-dialog-title" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="correction-dialog-title" className="text-xl font-bold text-slate-950">Correct this transaction</h2>
            <p className="mt-1 text-sm text-slate-600">The original will stay in your transaction history.</p>
          </div>
          {!state.success && <button type="button" onClick={onClose} aria-label="Close" className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">Close</button>}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
          <div><dt className="text-xs text-slate-500">Date</dt><dd className="mt-1 font-semibold text-slate-900">{entryDate}</dd></div>
          <div><dt className="text-xs text-slate-500">Type</dt><dd className="mt-1 font-semibold text-slate-900">{entryType}</dd></div>
          <div><dt className="text-xs text-slate-500">Amount</dt><dd className="mt-1 font-semibold text-slate-900">{formatRupees(amount < 0n ? -amount : amount)}</dd></div>
          <div className="col-span-2"><dt className="text-xs text-slate-500">Description</dt><dd className="mt-1 break-words font-semibold text-slate-900">{description || "No description"}</dd></div>
        </dl>

        {state.success ? (
          <div className="mt-5 space-y-4">
            <Feedback state={state} />
            <button type="button" onClick={() => { onClose(); router.refresh(); }} className="min-h-11 w-full rounded-lg bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800">Refresh transaction history</button>
          </div>
        ) : (
          <form action={action} onSubmit={prepareIdempotency} className="mt-5 space-y-4">
            {personId
              ? <input type="hidden" name="ledgerPersonId" value={personId} />
              : <input type="hidden" name="patientId" value={patientId ?? ""} />}
            <input type="hidden" name="entryId" value={entryId} />
            <input ref={idempotencyInput} type="hidden" name="idempotencyKey" />
            <input ref={effectiveAtInput} type="hidden" name="effectiveAt" />
            <fieldset>
              <legend className="text-sm font-bold text-slate-900">What went wrong?</legend>
              <div className="mt-2 space-y-2">
                {[
                  ["wrong_amount", "Wrong amount entered"],
                  ["duplicate_entry", "Duplicate entry"],
                  ["other_mistake", "Other mistake"],
                ].map(([value, label]) => (
                  <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50">
                    <input type="radio" name="mistake" value={value} required checked={mistake === value} onChange={() => setMistake(value)} className="size-4 accent-emerald-700" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            {mistake === "wrong_amount" && (
              <label className="block text-sm font-medium text-slate-800">What should the amount be?
                <span className="mt-1 flex min-h-11 items-center rounded-lg border border-slate-300 px-3 focus-within:ring-2 focus-within:ring-emerald-600">
                  <span className="mr-2 text-slate-500">₹</span>
                  <input name="correctAmount" type="number" min="0.01" max="1000000000" step="0.01" required className="w-full border-0 bg-transparent outline-none" />
                </span>
              </label>
            )}
            {mistake && mistake !== "wrong_amount" && (
              <label className="block text-sm font-medium text-slate-800">Add a note (optional)
                <textarea name="explanation" maxLength={400} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm font-normal" placeholder="A few words to help you remember" />
              </label>
            )}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">After canceling, the expected remaining balance will be {formatRupees(expectedBalancePaise)}.</p>
              <p className="mt-2">This will add a cancellation and keep the original transaction in history. It will not add a replacement. If needed, add the correct Udhaar or payment separately afterward.</p>
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input name="confirmCorrection" type="checkbox" required className="mt-0.5 size-4 accent-emerald-700" />
              I understand the original will stay in history and a correct entry may need to be added separately.
            </label>
            <Feedback state={state} />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} disabled={pending} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:opacity-50">Keep transaction</button>
              <button disabled={pending} className="min-h-11 rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:opacity-50">{pending ? "Saving…" : "Confirm cancellation"}</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export function PatientDetailsForm({
  patient,
}: {
  patient: { id: string; full_name: string; age: number | null; private_notes: string };
}) {
  const [state, action, pending] = useActionState(updatePatientAction, initialState);
  return (
    <form action={action} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <input type="hidden" name="patientId" value={patient.id} />
      <label className="block text-sm font-semibold">Name <input name="fullName" defaultValue={patient.full_name} required maxLength={120} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="block text-sm font-semibold">Age <input name="age" type="number" min={1} max={120} defaultValue={patient.age ?? ""} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="block text-sm font-semibold">Private notes <textarea name="privateNotes" defaultValue={patient.private_notes} maxLength={5000} rows={5} className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>
      <Feedback state={state} />
      <button disabled={pending} className="min-h-11 rounded-lg bg-[var(--primary)] px-4 font-semibold text-white disabled:bg-slate-400">{pending ? "Saving…" : "Save details"}</button>
    </form>
  );
}

export function AppointmentStatusForm({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [state, action, pending] = useActionState(updateAppointmentStatusAction, initialState);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="appointmentId" value={id} />
      <select name="status" defaultValue={status} aria-label="Appointment status" className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm">
        {["requested", "confirmed", "waiting", "consulting", "completed", "cancelled"].map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <button disabled={pending} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">Save</button>
      <Feedback state={state} />
    </form>
  );
}

export function LinkPatientForm({
  appointmentId,
  patients,
}: {
  appointmentId: string;
  patients: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(linkAppointmentPatientAction, initialState);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <label className="text-xs font-semibold">Link a patient <select name="patientId" defaultValue="" className="mt-1 block min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal"><option value="">Select existing</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</select></label>
      <label className="flex min-h-10 items-center gap-2 text-xs"><input type="checkbox" name="createNew" className="size-4 accent-[var(--primary)]" /> Create a separate new patient</label>
      <button disabled={pending} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:opacity-50">{pending ? "Linking…" : "Link record"}</button>
      <Feedback state={state} />
    </form>
  );
}

export function LedgerEntryForm({ patientId }: { patientId: string }) {
  const [state, action, pending] = useActionState(recordLedgerAction, initialState);
  const idempotencyInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state.successToken && idempotencyInput.current) {
      idempotencyInput.current.value = crypto.randomUUID();
    }
  }, [state.successToken]);
  function prepareIdempotency() {
    const input = idempotencyInput.current;
    if (input && !input.value) input.value = crypto.randomUUID();
  }
  return (
    <form action={action} onSubmit={prepareIdempotency} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
      <input type="hidden" name="patientId" value={patientId} />
      <input ref={idempotencyInput} type="hidden" name="idempotencyKey" />
      <h3 className="text-lg font-bold sm:col-span-2">Record a transaction</h3>
      <label className="text-sm font-semibold">Entry type <select name="entryType" className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"><option value="charge">Treatment charge</option><option value="payment">Payment</option><option value="opening_balance">Opening dues</option><option value="correction">Signed correction</option></select></label>
      <label className="text-sm font-semibold">Amount (₹) <input name="amount" inputMode="decimal" pattern="-?\d+(\.\d{1,2})?" required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold">Description <input name="description" maxLength={240} required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold">Effective date <input name="effectiveDate" type="date" required defaultValue={indiaDate()} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold sm:col-span-2">Correction reason (required for corrections) <textarea name="correctionReason" maxLength={500} rows={2} className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>
      <div className="sm:col-span-2"><Feedback state={state} /></div>
      <button disabled={pending} className="min-h-11 rounded-lg bg-[var(--primary)] px-5 font-semibold text-white disabled:bg-slate-400 sm:col-span-2">{pending ? "Recording…" : "Record transaction"}</button>
    </form>
  );
}

export function ProfileForm({
  values,
}: {
  values: {
    doctorName: string;
    qualification: string;
    speciality: string;
    registrationInfo: string;
    introduction: string;
    doctorPhotoUrl: string | null;
  };
}) {
  const [state, action, pending] = useActionState(saveOwnerProfileAction, initialState);
  const [editing, setEditing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function choosePhoto(file: File | undefined, input: HTMLInputElement) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      input.value = "";
      setPhotoPreview(null);
      setPhotoError("Choose a JPEG, PNG, or WebP image smaller than 5 MB.");
      return;
    }
    setPhotoError(null);
    setPhotoPreview(URL.createObjectURL(file));
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-50 text-teal-700">
            {photoPreview || values.doctorPhotoUrl ? (
              <Image src={photoPreview ?? values.doctorPhotoUrl ?? ""} alt={`${values.doctorName} profile`} fill sizes="80px" unoptimized className="object-cover" />
            ) : (
              <UserRound size={34} aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900">Clinic Owner</span>
            <h2 className="mt-1 break-words text-lg font-bold text-slate-950">{values.doctorName || "Subhal Thakur"}</h2>
            {values.qualification ? (
              <p className="mt-0.5 text-sm text-slate-600">Qualification: {values.qualification}</p>
            ) : (
              <p className="mt-0.5 text-sm text-slate-600">No verified credentials added</p>
            )}
            {values.speciality && <p className="mt-0.5 text-sm text-slate-600">Designation: {values.speciality}</p>}
            {values.registrationInfo && <p className="mt-0.5 text-sm text-slate-600">Registration: {values.registrationInfo}</p>}
          </div>
        </div>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Pencil size={15} aria-hidden="true" /> Edit profile
          </button>
        )}
      </div>
      <Feedback state={state} />
      {editing && (
        <form action={action} className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <label className="text-sm font-semibold">Full name <input name="doctorName" defaultValue={values.doctorName || "Subhal Thakur"} required maxLength={120} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
          <div className="flex items-center gap-3">
            <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-50 text-teal-700">
              {photoPreview || values.doctorPhotoUrl ? (
                <Image src={photoPreview ?? values.doctorPhotoUrl ?? ""} alt="Profile image preview" fill sizes="64px" unoptimized className="object-cover" />
              ) : (
                <UserRound size={26} aria-hidden="true" />
              )}
            </div>
            <div>
              <input
                ref={photoInput}
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                aria-label="Upload or change profile photo"
                onChange={(event) => choosePhoto(event.currentTarget.files?.[0], event.currentTarget)}
              />
              <button type="button" onClick={() => photoInput.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Upload size={15} aria-hidden="true" /> {values.doctorPhotoUrl || photoPreview ? "Change photo" : "Upload photo"}
              </button>
              <p className="mt-1 text-xs text-slate-500">JPEG, PNG, or WebP · 5 MB max</p>
            </div>
          </div>
          <label className="text-sm font-semibold">Verified qualifications (optional) <input name="qualification" defaultValue={values.qualification} maxLength={200} placeholder="Add only verified qualifications" className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
          <label className="text-sm font-semibold">Verified professional designation (optional) <input name="speciality" defaultValue={values.speciality} maxLength={120} placeholder="Add only a verified designation" className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
          <label className="text-sm font-semibold sm:col-span-2">Verified registration information (optional) <input name="registrationInfo" defaultValue={values.registrationInfo} maxLength={300} placeholder="Add only if applicable and verified" className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
          <label className="text-sm font-semibold sm:col-span-2">Public introduction <textarea name="introduction" defaultValue={values.introduction} maxLength={1200} rows={4} className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>
          <p className="text-xs leading-5 text-slate-600 sm:col-span-2">“Clinic Owner” is an administrative role. Add medical credentials only when verified; no title or qualification is added automatically.</p>
          {photoError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">{photoError}</p>}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button disabled={pending} className="min-h-11 rounded-lg bg-[var(--primary)] px-5 font-semibold text-white disabled:bg-slate-400">{pending ? "Saving…" : "Save profile"}</button>
            <button type="button" onClick={() => { setEditing(false); setPhotoPreview(null); setPhotoError(null); }} disabled={pending} className="min-h-11 rounded-lg border border-slate-300 px-5 font-semibold text-slate-700">Cancel</button>
          </div>
        </form>
      )}
    </section>
  );
}

export function ClinicDetailsForm({
  values,
}: {
  values: { clinicName: string; phone: string; whatsapp: string };
}) {
  const [state, action, pending] = useActionState(saveClinicDetailsAction, initialState);
  const [editing, setEditing] = useState(false);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-950">{values.clinicName}</h2>
          <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Public phone</dt><dd className="mt-0.5 text-slate-800">{values.phone || "Not set"}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">WhatsApp</dt><dd className="mt-0.5 text-slate-800">{values.whatsapp || "Not set"}</dd></div>
          </dl>
        </div>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Pencil size={15} aria-hidden="true" /> Edit details
          </button>
        )}
      </div>
      <Feedback state={state} />
      {editing && (
        <form action={action} className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <label className="text-sm font-semibold">Clinic name <input name="clinicName" defaultValue={values.clinicName} required maxLength={120} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
          <label className="text-sm font-semibold">Public phone <input name="phone" type="tel" defaultValue={values.phone} maxLength={18} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
          <label className="text-sm font-semibold">WhatsApp number <input name="whatsapp" type="tel" defaultValue={values.whatsapp} maxLength={18} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
          <p className="self-end text-xs leading-5 text-slate-600">Contact links publish only when a valid Indian mobile number is saved.</p>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button disabled={pending} className="min-h-11 rounded-lg bg-[var(--primary)] px-5 font-semibold text-white disabled:bg-slate-400">{pending ? "Saving…" : "Save details"}</button>
            <button type="button" onClick={() => setEditing(false)} disabled={pending} className="min-h-11 rounded-lg border border-slate-300 px-5 font-semibold text-slate-700">Cancel</button>
          </div>
        </form>
      )}
    </section>
  );
}
