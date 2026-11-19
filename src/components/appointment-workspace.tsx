"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileChartColumn,
  Pencil,
  Plus,
  UserRoundPlus,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createAppointmentAction,
  updateAppointmentAction,
  type FormActionState,
} from "@/app/doctor/actions";
import { AppointmentStatusForm, LinkPatientForm } from "@/components/doctor-forms";
import { formatDate } from "@/lib/format";

export type AppointmentRecord = {
  id: string;
  bookingReference: string;
  patientId: string | null;
  patientName: string;
  mobile: string;
  reason: string | null;
  status: string;
  preferredTime: string | null;
  needsContact: boolean;
  createdAt: string;
  session: {
    id: string;
    date: string;
    startsAt: string;
    endsAt: string;
    locationName: string;
    locationAddress: string;
    publicNote: string | null;
    privateNote: string | null;
  };
};

export type AppointmentSessionOption = {
  id: string;
  date: string;
  startsAt: string;
  endsAt: string;
  locationName: string;
  locationAddress: string;
  privateNote: string | null;
};

type PatientOption = { id: string; fullName: string; mobile: string };
type Tab = "today" | "upcoming" | "all";
const initialState: FormActionState = {};
const statusNames: Record<string, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  waiting: "Waiting",
  consulting: "Consulting",
  completed: "Completed",
  cancelled: "Cancelled",
};

function timeLabel(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(Date.UTC(2020, 0, 1, hours - 5, minutes - 30)));
}

function sessionTime(session: AppointmentSessionOption | AppointmentRecord["session"]) {
  return `${timeLabel(session.startsAt)}–${timeLabel(session.endsAt)}`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    requested: "bg-slate-100 text-slate-700",
    confirmed: "bg-emerald-100 text-emerald-800",
    waiting: "bg-amber-100 text-amber-800",
    consulting: "bg-sky-100 text-sky-800",
    completed: "bg-teal-100 text-teal-800",
    cancelled: "bg-rose-100 text-rose-800",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[status] ?? colors.requested}`}>
      {statusNames[status] ?? status}
    </span>
  );
}

export function AppointmentWorkspace({
  today,
  appointments,
  sessions,
  patients,
}: {
  today: string;
  appointments: AppointmentRecord[];
  sessions: AppointmentSessionOption[];
  patients: PatientOption[];
}) {
  const [tab, setTab] = useState<Tab>("today");
  const [dialog, setDialog] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<AppointmentRecord | null>(null);
  const router = useRouter();
  const closeAfterSave = useCallback(() => {
    setDialog(null);
    router.refresh();
  }, [router]);
  const todays = appointments.filter((item) => item.session.date === today && item.status !== "cancelled");
  const upcoming = appointments.filter((item) => item.session.date > today && item.status !== "cancelled");
  const completed = todays.filter((item) => item.status === "completed");
  const shown = tab === "today"
    ? appointments.filter((item) => item.session.date === today)
    : tab === "upcoming"
      ? appointments.filter((item) => item.session.date > today)
      : appointments;

  function openDialog(mode: "edit" | "view", item: AppointmentRecord) {
    setSelected(item);
    setDialog(mode);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">Appointments · {formatDate(today)} · Asia/Kolkata</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Manage appointments</h1>
          <p className="mt-1 text-slate-600">Sessions show clinic hours. A preferred time is a request, not a confirmed appointment time.</p>
        </div>
        <button type="button" onClick={() => setDialog("add")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800">
          <Plus size={18} aria-hidden="true" /> Add Appointment
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Appointment summaries">
        <Metric icon={<CalendarDays size={20} />} label="Today’s appointments" value={todays.length} />
        <Metric icon={<Clock3 size={20} />} label="Upcoming appointments" value={upcoming.length} />
        <Metric icon={<CheckCircle2 size={20} />} label="Completed today" value={completed.length} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(270px,0.8fr)]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-50 p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                {tab === "today" ? "Today’s Appointments" : tab === "upcoming" ? "Upcoming Appointments" : "All Appointments"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{shown.length} records</p>
            </div>
          </div>
          <div role="tablist" aria-label="Appointment date range" className="flex gap-2 overflow-x-auto border-b border-slate-100 p-3">
            {([
              ["today", `Today (${todays.length})`],
              ["upcoming", `Upcoming (${upcoming.length})`],
              ["all", `All (${appointments.length})`],
            ] as const).map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`min-h-10 shrink-0 rounded-lg px-4 text-sm font-semibold ${tab === key ? "bg-emerald-700 text-white" : "bg-slate-50 text-slate-700 hover:bg-emerald-50"}`}>
                {label}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="p-6 text-slate-600">{tab === "today" ? "No appointments scheduled for today." : "No appointments in this view."}</p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-emerald-50 text-slate-700">
                    <tr>{["Time", "Patient Name", "Phone", "Reason", "Status", "Actions"].map((item) => <th key={item} className="px-3 py-3 font-semibold">{item}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shown.map((item) => (
                      <tr key={item.id} className="align-top hover:bg-emerald-50/30">
                        <td className="px-3 py-4">
                          <span className="font-medium">{sessionTime(item.session)}</span>
                          {item.preferredTime && <span className="mt-1 block text-xs text-amber-800">Preferred {timeLabel(item.preferredTime)} · unconfirmed</span>}
                          {tab !== "today" && <span className="mt-1 block text-xs text-slate-500">{formatDate(item.session.date)}</span>}
                        </td>
                        <td className="px-3 py-4 font-semibold text-slate-900">{item.patientName}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-slate-600">{item.mobile}</td>
                        <td className="max-w-40 px-3 py-4 text-slate-600">{item.reason || "—"}</td>
                        <td className="px-3 py-4"><StatusBadge status={item.status} /></td>
                        <td className="px-3 py-4"><AppointmentActions item={item} onView={() => openDialog("view", item)} onEdit={() => openDialog("edit", item)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-slate-100 md:hidden">
                {shown.map((item) => (
                  <li key={item.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-semibold text-slate-950">{item.patientName}</p><p className="mt-1 text-sm text-slate-600">{item.mobile}</p></div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-sm text-slate-700">{formatDate(item.session.date)} · {sessionTime(item.session)}</p>
                    {item.preferredTime && <p className="text-xs text-amber-800">Preferred {timeLabel(item.preferredTime)} · not confirmed</p>}
                    <p className="text-sm text-slate-600">{item.reason || "No reason provided"}</p>
                    <AppointmentActions item={item} onView={() => openDialog("view", item)} onEdit={() => openDialog("edit", item)} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-emerald-100 bg-white shadow-sm">
            <header className="border-b border-emerald-50 p-4"><h2 className="font-bold text-slate-950">Today’s Location</h2></header>
            {sessions.filter((session) => session.date === today).length === 0 ? (
              <p className="p-4 text-sm text-slate-600">No clinic sessions are scheduled today.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {sessions.filter((session) => session.date === today).map((session) => {
                  return <li key={session.id} className="p-4">
                    <p className="font-semibold text-slate-900">{session.locationName}</p>
                    <p className="mt-1 text-sm text-slate-600">{sessionTime(session)} · actual session hours</p>
                    {session.privateNote && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950"><strong>Doctor’s note:</strong> {session.privateNote}</p>}
                    {session.locationAddress && <p className="mt-2 text-xs text-slate-500">{session.locationAddress}</p>}
                  </li>;
                })}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <h2 className="font-bold text-slate-950">Quick Actions</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/doctor/patients#add-patient" className="quick-action"><UserRoundPlus size={20} />Add Patient</Link>
              <Link href="/doctor/accounts?transaction=charge" className="quick-action"><Wallet size={20} />Add Udhaar</Link>
              <Link href="/doctor/accounts?transaction=payment" className="quick-action"><Wallet size={20} />Record Payment</Link>
              <Link href="/doctor/reports" className="quick-action"><FileChartColumn size={20} />Reports</Link>
            </div>
          </section>
        </aside>
      </div>

      {dialog && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="appointment-dialog-title" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div><h2 id="appointment-dialog-title" className="text-xl font-bold">{dialog === "add" ? "Add Appointment" : dialog === "edit" ? "Edit Appointment" : "Appointment Details"}</h2><p className="mt-1 text-sm text-slate-600">Clinic session hours are not a patient-specific confirmed time.</p></div>
              <button type="button" onClick={() => setDialog(null)} aria-label="Close" className="flex size-10 items-center justify-center rounded-lg border border-slate-200"><X size={18} /></button>
            </div>
            {dialog === "add" ? <CreateAppointmentForm sessions={sessions.filter((session) => session.date >= today)} patients={patients} onSaved={closeAfterSave} /> : selected && dialog === "edit" ? <EditAppointmentForm appointment={selected} sessions={sessions} onSaved={closeAfterSave} /> : selected && <AppointmentDetails item={selected} patients={patients} onEdit={() => setDialog("edit")} />}
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <article className="flex min-h-24 items-center gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-4 shadow-sm">
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">{icon}</span>
    <div><p className="text-sm text-slate-600">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{value}</p></div>
  </article>;
}

function AppointmentActions({ item, onView, onEdit }: { item: AppointmentRecord; onView: () => void; onEdit: () => void }) {
  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" onClick={onView} aria-label={`View ${item.patientName}`} title="View details" className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-emerald-50"><Eye size={16} /></button>
    <button type="button" onClick={onEdit} aria-label={`Edit ${item.patientName}`} title="Edit appointment" className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-emerald-50"><Pencil size={16} /></button>
    <AppointmentStatusForm id={item.id} status={item.status} />
  </div>;
}

function Feedback({ state }: { state: FormActionState }) {
  if (state.error) return <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{state.error}</p>;
  if (state.success) return <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{state.success}</p>;
  return null;
}

function CreateAppointmentForm({ sessions, patients, onSaved }: { sessions: AppointmentSessionOption[]; patients: PatientOption[]; onSaved: () => void }) {
  const [state, action, pending] = useActionState(createAppointmentAction, initialState);
  const keyRef = useRef<HTMLInputElement>(null);
  const [patientId, setPatientId] = useState("");
  useEffect(() => { if (state.successToken) { if (keyRef.current) keyRef.current.value = crypto.randomUUID(); onSaved(); } }, [state.successToken, onSaved]);
  function setKey() { if (keyRef.current && !keyRef.current.value) keyRef.current.value = crypto.randomUUID(); }
  const selectedPatient = patients.find((patient) => patient.id === patientId);
  return <form action={action} onSubmit={setKey} className="grid gap-4 sm:grid-cols-2">
    <input ref={keyRef} type="hidden" name="idempotencyKey" />
    <label className="text-sm font-semibold sm:col-span-2">Clinic session <select name="sessionId" required defaultValue="" className="field-control"><option value="">Select a saved session</option>{sessions.map((session) => <option key={session.id} value={session.id}>{formatDate(session.date)} · {session.locationName} · {sessionTime(session)}</option>)}</select></label>
    <label className="text-sm font-semibold sm:col-span-2">Existing patient (optional) <select name="patientId" value={patientId} onChange={(event) => setPatientId(event.target.value)} className="field-control"><option value="">Enter a new appointment contact below</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName} · {patient.mobile}</option>)}</select></label>
    {!selectedPatient && <>
      <label className="text-sm font-semibold">Patient name <input name="patientName" required minLength={2} maxLength={100} className="field-control" /></label>
      <label className="text-sm font-semibold">Phone <input name="mobile" type="tel" inputMode="tel" required maxLength={18} className="field-control" /></label>
    </>}
    {selectedPatient && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950 sm:col-span-2"><strong>{selectedPatient.fullName}</strong> · {selectedPatient.mobile}</div>}
    <label className="text-sm font-semibold">Preferred time (optional) <input name="preferredTime" type="time" className="field-control" /><span className="mt-1 block text-xs font-normal text-amber-800">Patient preference only; not a confirmed appointment time.</span></label>
    <label className="text-sm font-semibold">Reason (optional) <input name="reason" maxLength={300} className="field-control" /></label>
    <p className="text-sm text-slate-600 sm:col-span-2">The appointment is recorded as confirmed against the clinic session. Session hours do not assign an individual visit time.</p>
    <div className="sm:col-span-2"><Feedback state={state} /></div>
    <button disabled={pending || sessions.length === 0} className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50 sm:col-span-2">{pending ? "Saving…" : "Save appointment"}</button>
    {sessions.length === 0 && <p className="text-sm text-amber-800 sm:col-span-2">Create a saved session in Availability before adding an appointment.</p>}
  </form>;
}

function EditAppointmentForm({ appointment, sessions, onSaved }: { appointment: AppointmentRecord; sessions: AppointmentSessionOption[]; onSaved: () => void }) {
  const [state, action, pending] = useActionState(updateAppointmentAction, initialState);
  useEffect(() => { if (state.successToken) onSaved(); }, [state.successToken, onSaved]);
  const matchingSessions = sessions.some((session) => session.id === appointment.session.id) ? sessions : [
    {
      id: appointment.session.id,
      date: appointment.session.date,
      startsAt: appointment.session.startsAt,
      endsAt: appointment.session.endsAt,
      locationName: appointment.session.locationName,
      locationAddress: appointment.session.locationAddress,
      privateNote: appointment.session.privateNote,
    },
    ...sessions,
  ];
  return <form action={action} className="grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="appointmentId" value={appointment.id} />
    <div className="rounded-lg bg-emerald-50 p-3 text-sm sm:col-span-2"><strong>{appointment.patientName}</strong> · {appointment.mobile}</div>
    <label className="text-sm font-semibold sm:col-span-2">Saved clinic session <select name="sessionId" defaultValue={appointment.session.id} required className="field-control">{matchingSessions.map((session) => <option key={session.id} value={session.id}>{formatDate(session.date)} · {session.locationName} · {sessionTime(session)}</option>)}</select></label>
    <label className="text-sm font-semibold">Status <select name="status" defaultValue={appointment.status} className="field-control">{Object.entries(statusNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
    <label className="text-sm font-semibold">Preferred time <input name="preferredTime" type="time" defaultValue={appointment.preferredTime?.slice(0, 5) ?? ""} className="field-control" /><span className="mt-1 block text-xs font-normal text-amber-800">Preference only; not confirmed appointment time.</span></label>
    <label className="text-sm font-semibold sm:col-span-2">Reason <textarea name="reason" defaultValue={appointment.reason ?? ""} maxLength={300} rows={3} className="field-control" /></label>
    <div className="sm:col-span-2"><Feedback state={state} /></div>
    <button disabled={pending} className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50 sm:col-span-2">{pending ? "Saving…" : "Save changes"}</button>
  </form>;
}

function AppointmentDetails({ item, patients, onEdit }: { item: AppointmentRecord; patients: PatientOption[]; onEdit: () => void }) {
  return <div className="space-y-4">
    <div className="rounded-xl bg-emerald-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-lg font-bold">{item.patientName}</h3><p className="mt-1 text-sm text-slate-700">{item.mobile}</p></div><StatusBadge status={item.status} /></div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Detail label="Date" value={formatDate(item.session.date)} />
        <Detail label="Location" value={item.session.locationName} />
        <Detail label="Session hours" value={`${sessionTime(item.session)} · Asia/Kolkata`} />
        <Detail label="Preferred time" value={item.preferredTime ? `${timeLabel(item.preferredTime)} · unconfirmed preference` : "Not provided"} />
        <Detail label="Reason" value={item.reason || "Not provided"} />
        <Detail label="Doctor’s note" value={item.session.privateNote || "No note for this session"} />
      </dl>
      {item.needsContact && <p className="mt-4 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">Session changed; contact this patient manually.</p>}
    </div>
    <div className="flex flex-wrap gap-2">
      <a href={`tel:${item.mobile}`} className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">Call patient</a>
      {item.patientId && <Link href={`/doctor/patients/${item.patientId}`} className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">Patient record</Link>}
      {item.patientId && <Link href={`/doctor/accounts?transaction=charge&patient=${item.patientId}`} className="min-h-10 rounded-lg border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-800">Add Charge</Link>}
      <button type="button" onClick={onEdit} className="min-h-10 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Edit appointment</button>
    </div>
    {!item.patientId && <div className="rounded-xl border border-slate-200 p-4"><p className="mb-3 font-semibold">Link a patient record</p><AppointmentPatientLink appointmentId={item.id} patients={patients} /></div>}
  </div>;
}

function AppointmentPatientLink({ appointmentId, patients }: { appointmentId: string; patients: PatientOption[] }) {
  return <LinkPatientForm appointmentId={appointmentId} patients={patients.map((patient) => ({ id: patient.id, name: patient.fullName }))} />;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-900">{value}</dd></div>;
}
