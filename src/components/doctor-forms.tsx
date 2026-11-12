"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createPatientAction,
  createSessionAction,
  createWalkInAction,
  linkAppointmentPatientAction,
  addLocationAction,
  addStandardLocationsAction,
  addServiceAction,
  addVisitAction,
  blockDateAction,
  recordLedgerAction,
  reverseLedgerEntryAction,
  saveProfileAction,
  updateSessionAction,
  updatePatientAction,
  updateLocationAction,
  updateServiceAction,
  updateAppointmentStatusAction,
  type FormActionState,
} from "@/app/doctor/actions";
import { indiaDate } from "@/lib/format";

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

export function WalkInForm({
  sessions,
  patients,
}: {
  sessions: { id: string; label: string }[];
  patients: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createWalkInAction, initialState);
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
      <input ref={idempotencyInput} type="hidden" name="idempotencyKey" />
      <h2 className="text-lg font-bold sm:col-span-2">Add walk-in</h2>
      <label className="text-sm font-semibold">Session <select name="sessionId" required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"><option value="">Select a session</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.label}</option>)}</select></label>
      <label className="text-sm font-semibold">Existing patient (optional) <select name="patientId" defaultValue="" className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"><option value="">Create no link</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</select></label>
      <label className="text-sm font-semibold">Patient name <input name="patientName" required maxLength={100} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold">Mobile number <input name="mobile" type="tel" required maxLength={18} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <div className="sm:col-span-2"><Feedback state={state} /></div>
      <button disabled={pending || sessions.length === 0} className="min-h-11 rounded-lg bg-[var(--primary)] px-5 font-semibold text-white disabled:bg-slate-400 sm:col-span-2">{pending ? "Adding…" : "Add walk-in"}</button>
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
    <form action={action} className="space-y-3">
      <label className="block text-sm font-semibold">Location name <input name="name" required maxLength={120} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="block text-sm font-semibold">Public address <textarea name="address" required maxLength={500} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>
      <label className="block text-sm font-semibold">Google Maps directions link (optional) <input name="directionsUrl" type="url" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <Feedback state={state} />
      <button disabled={pending} className="min-h-11 rounded-lg bg-[var(--primary)] px-4 font-semibold text-white disabled:bg-slate-400">{pending ? "Saving…" : "Add location"}</button>
    </form>
  );
}

export function LocationEditForm({
  location,
}: {
  location: { id: string; name: string; public_address: string; directions_url: string | null; active: boolean };
}) {
  const [state, action, pending] = useActionState(updateLocationAction, initialState);
  return (
    <form action={action} className="space-y-2 rounded-lg border border-slate-200 p-3">
      <input type="hidden" name="id" value={location.id} />
      <label className="block text-xs font-semibold">Location name <input name="name" defaultValue={location.name} required maxLength={120} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-sm font-normal" /></label>
      <label className="block text-xs font-semibold">Public address <textarea name="address" defaultValue={location.public_address} required maxLength={500} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm font-normal" /></label>
      <label className="block text-xs font-semibold">Google Maps link <input name="directionsUrl" type="url" defaultValue={location.directions_url ?? ""} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-sm font-normal" /></label>
      <label className="flex items-center gap-2 text-xs"><input name="active" type="checkbox" defaultChecked={location.active} className="size-4 accent-[var(--primary)]" /> Publicly visible</label>
      <Feedback state={state} />
      <button disabled={pending} className="min-h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold">{pending ? "Saving…" : "Update location"}</button>
    </form>
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

export function ReverseLedgerForm({
  patientId,
  entryId,
}: {
  patientId: string;
  entryId: string;
}) {
  const [state, action, pending] = useActionState(reverseLedgerEntryAction, initialState);
  const idempotencyInput = useRef<HTMLInputElement>(null);
  const effectiveAtInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state.successToken) {
      if (idempotencyInput.current) idempotencyInput.current.value = crypto.randomUUID();
      if (effectiveAtInput.current) effectiveAtInput.current.value = new Date().toISOString();
    }
  }, [state.successToken]);
  function prepareIdempotency() {
    if (idempotencyInput.current && !idempotencyInput.current.value) {
      idempotencyInput.current.value = crypto.randomUUID();
      if (effectiveAtInput.current) effectiveAtInput.current.value = new Date().toISOString();
    }
  }
  return (
    <form action={action} onSubmit={prepareIdempotency} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="entryId" value={entryId} />
      <input ref={idempotencyInput} type="hidden" name="idempotencyKey" />
      <input ref={effectiveAtInput} type="hidden" name="effectiveAt" />
      <label className="text-xs font-medium">Reversal reason <input name="reason" required minLength={3} maxLength={500} className="mt-1 min-h-9 w-full rounded-lg border border-slate-300 px-2 text-sm" /></label>
      <label className="flex items-start gap-2 text-xs text-amber-950"><input name="confirmReversal" type="checkbox" required className="mt-0.5 size-4 accent-amber-700" />I confirm this will add a reversal and preserve the original entry.</label>
      <button disabled={pending} className="min-h-9 rounded-lg border border-amber-300 px-3 text-xs font-semibold text-amber-900 disabled:opacity-50">{pending ? "Reversing…" : "Reverse/Correct entry"}</button>
      <Feedback state={state} />
    </form>
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
      <label className="flex items-start gap-3 text-sm leading-6 text-slate-700 sm:col-span-2"><input name="overpaymentConfirmed" type="checkbox" className="mt-1 size-5 accent-[var(--primary)]" /> I confirm that any payment exceeding the balance should be recorded as patient credit.</label>
      <div className="sm:col-span-2"><Feedback state={state} /></div>
      <button disabled={pending} className="min-h-11 rounded-lg bg-[var(--primary)] px-5 font-semibold text-white disabled:bg-slate-400 sm:col-span-2">{pending ? "Recording…" : "Record transaction"}</button>
    </form>
  );
}

export function ProfileForm({
  values,
}: {
  values: {
    clinicName: string;
    doctorName: string;
    qualification: string;
    speciality: string;
    introduction: string;
    doctorPhotoUrl: string;
    phone: string;
    whatsapp: string;
  };
}) {
  const [state, action, pending] = useActionState(saveProfileAction, initialState);
  return (
    <form action={action} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
      <label className="text-sm font-semibold">Clinic name <input name="clinicName" defaultValue={values.clinicName} required maxLength={120} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold">Doctor name <input name="doctorName" defaultValue={values.doctorName} maxLength={120} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold">Qualification <input name="qualification" defaultValue={values.qualification} maxLength={200} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold">Speciality <input name="speciality" defaultValue={values.speciality} maxLength={120} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold">Public phone <input name="phone" type="tel" defaultValue={values.phone} maxLength={18} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold">WhatsApp number <input name="whatsapp" type="tel" defaultValue={values.whatsapp} maxLength={18} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold sm:col-span-2">Doctor photo URL (HTTPS) <input name="doctorPhotoUrl" type="url" defaultValue={values.doctorPhotoUrl} maxLength={1000} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
      <label className="text-sm font-semibold sm:col-span-2">Public introduction <textarea name="introduction" defaultValue={values.introduction} maxLength={1200} rows={4} className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>
      <p className="text-xs text-slate-600 sm:col-span-2">Contact links are published only when valid Indian mobile numbers are saved. Keep patient details out of WhatsApp messages.</p>
      <div className="sm:col-span-2"><Feedback state={state} /></div>
      <button disabled={pending} className="min-h-11 rounded-lg bg-[var(--primary)] px-5 font-semibold text-white disabled:bg-slate-400 sm:col-span-2">{pending ? "Saving…" : "Save profile"}</button>
    </form>
  );
}
