"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { saveAdditionalDoctor } from "@/app/doctor/doctor-directory-actions";
import type { Doctor, DoctorDetails, DoctorSchedule, Weekday } from "@/lib/doctor-directory-schema";
import { ImagePlus, Plus, Search, Stethoscope, UserRound, X } from "lucide-react";

const specialties = [
  "General Medicine",
  "Internal Medicine",
  "Pediatrics",
  "Dermatology",
  "Gynecology",
  "Orthopedics",
  "Cardiology",
  "Ophthalmology",
  "ENT",
  "Dentistry",
  "Psychiatry",
  "Other",
];

type DoctorFieldError =
  | "fullName"
  | "specialty"
  | "otherSpecialty"
  | "experience"
  | "consultationFee"
  | "scheduleDays"
  | "scheduleDate"
  | "scheduleStartTime"
  | "scheduleEndTime";
type DoctorErrors = Partial<Record<DoctorFieldError, string>>;

const weekdays: Weekday[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const emptyDoctor: DoctorDetails = {
  fullName: "",
  specialty: "",
  qualifications: "",
  registrationNumber: "",
  experience: "",
  doctorType: "Regular",
  consultationFee: "",
  description: "",
  schedule: { type: "unconfirmed" },
  status: "Active",
};

const controlClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700";

function isValidTime(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match !== null;
}

function isValidDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function schedulePreview(schedule: DoctorSchedule) {
  if (schedule.type === "unconfirmed") return "Schedule not confirmed";
  if (schedule.type === "weekly") {
    if (
      schedule.days.length === 0 ||
      !isValidTime(schedule.startTime) ||
      !isValidTime(schedule.endTime) ||
      schedule.endTime <= schedule.startTime
    ) {
      return "Choose at least one day and a valid time range.";
    }
    return `Every ${schedule.days.map((day) => day.slice(0, 3)).join(", ")} · ${formatTime(schedule.startTime)}–${formatTime(schedule.endTime)}`;
  }
  if (
    !isValidDate(schedule.date) ||
    !isValidTime(schedule.startTime) ||
    !isValidTime(schedule.endTime) ||
    schedule.endTime <= schedule.startTime
  ) {
    return "Choose a date and a valid time range.";
  }
  const visitDate = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${schedule.date}T00:00:00Z`));
  return `${visitDate} · ${formatTime(schedule.startTime)}–${formatTime(schedule.endTime)}`;
}

function DoctorField({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        {label}
        {required && <span className="ml-1 text-rose-700" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function DoctorsWorkspace({ initialDoctors, owner, loadError }: {
  initialDoctors: Doctor[];
  owner: { name: string; qualification: string; photoUrl: string | null };
  loadError?: string;
}) {
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const saveId = useRef("");
  const savingRef = useRef(false);
  const [query, setQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DoctorDetails>(emptyDoctor);
  const [otherSpecialty, setOtherSpecialty] = useState("");
  const [errors, setErrors] = useState<DoctorErrors>({});
  const dialogRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  useEffect(() => {
    if (!isFormOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !savingRef.current) {
        setIsFormOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      openerRef.current?.focus();
    };
  }, [isFormOpen]);

  function openForm(doctor?: Doctor, opener?: HTMLElement) {
    openerRef.current = opener ?? null;
    saveId.current = doctor?.id ?? crypto.randomUUID();
    setSaveError("");
    setPhoto(null);
    setPhotoPreview(doctor?.photoUrl ?? null);
    setEditingId(doctor?.id ?? null);
    setDraft(doctor ? { ...doctor, specialty: specialties.includes(doctor.specialty) ? doctor.specialty : "Other" } : emptyDoctor);
    setOtherSpecialty(doctor && !specialties.includes(doctor.specialty) ? doctor.specialty : "");
    setErrors({});
    setIsFormOpen(true);
  }

  function updateDraft<Key extends keyof DoctorDetails>(key: Key, value: DoctorDetails[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (key === "fullName" || key === "specialty" || key === "experience" || key === "consultationFee") {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  }

  function updateSchedule(schedule: DoctorSchedule) {
    setDraft((current) => ({ ...current, schedule }));
    setErrors((current) => ({
      ...current,
      scheduleDays: undefined,
      scheduleDate: undefined,
      scheduleStartTime: undefined,
      scheduleEndTime: undefined,
    }));
  }

  function updateScheduleTime(field: "startTime" | "endTime", value: string) {
    const schedule = draft.schedule;
    if (schedule.type === "unconfirmed") return;
    updateSchedule({ ...schedule, [field]: value });
  }

  async function saveDoctor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    const specialtyValue = draft.specialty === "Other" ? otherSpecialty.trim() : draft.specialty.trim();
    const nextErrors: DoctorErrors = {};
    if (!draft.fullName.trim()) nextErrors.fullName = "Enter the doctor's full name.";
    if (!draft.specialty.trim()) nextErrors.specialty = "Choose or enter a specialty.";
    else if (draft.specialty === "Other" && !specialtyValue) {
      nextErrors.otherSpecialty = "Enter the doctor's specialty.";
    }
    if (
      draft.experience &&
      (!Number.isInteger(Number(draft.experience)) ||
        Number(draft.experience) < 0 ||
        Number(draft.experience) > 100)
    ) {
      nextErrors.experience = "Enter a whole number from 0 to 100.";
    }
    if (
      draft.consultationFee &&
      (!Number.isFinite(Number(draft.consultationFee)) || Number(draft.consultationFee) < 0)
    ) {
      nextErrors.consultationFee = "Enter a fee of 0 or more.";
    }
    if (draft.schedule.type === "weekly") {
      if (draft.schedule.days.length === 0) {
        nextErrors.scheduleDays = "Select at least one visiting day.";
      }
      if (!isValidTime(draft.schedule.startTime)) {
        nextErrors.scheduleStartTime = "Enter a valid start time.";
      }
      if (!isValidTime(draft.schedule.endTime)) {
        nextErrors.scheduleEndTime = "Enter a valid end time.";
      } else if (
        isValidTime(draft.schedule.startTime) &&
        draft.schedule.endTime <= draft.schedule.startTime
      ) {
        nextErrors.scheduleEndTime = "End time must be later than start time.";
      }
    } else if (draft.schedule.type === "specific") {
      if (!isValidDate(draft.schedule.date)) {
        nextErrors.scheduleDate = "Choose a valid visit date.";
      }
      if (!isValidTime(draft.schedule.startTime)) {
        nextErrors.scheduleStartTime = "Enter a valid start time.";
      }
      if (!isValidTime(draft.schedule.endTime)) {
        nextErrors.scheduleEndTime = "Enter a valid end time.";
      } else if (
        isValidTime(draft.schedule.startTime) &&
        draft.schedule.endTime <= draft.schedule.startTime
      ) {
        nextErrors.scheduleEndTime = "End time must be later than start time.";
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const savedDoctor: Doctor = {
      ...draft,
      fullName: draft.fullName.trim(),
      specialty: specialtyValue,
      qualifications: draft.qualifications.trim(),
      registrationNumber: draft.registrationNumber.trim(),
      experience: draft.experience.trim(),
      consultationFee: draft.consultationFee.trim(),
      description: draft.description.trim(),
      id: saveId.current,
    };
    const data = new FormData();
    data.set("doctor", JSON.stringify(savedDoctor));
    if (photo) data.set("photo", photo);
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const result = await saveAdditionalDoctor(data);
      if (result.error || !result.doctor) {
        setSaveError(result.error || "Doctor could not be saved.");
        return;
      }
      const saved = result.doctor;
      setDoctors((current) => current.some((doctor) => doctor.id === saved.id)
        ? current.map((doctor) => doctor.id === saved.id ? saved : doctor)
        : [...current, saved]);
      setIsFormOpen(false);
    } catch {
      setSaveError("Could not save. Check your connection or sign in again, then retry.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const filteredDoctors = doctors.filter((doctor) => {
    const searchText = `${doctor.fullName} ${doctor.specialty}`.toLowerCase();
    return searchText.includes(query.trim().toLowerCase());
  });
  const weeklySchedule =
    draft.schedule.type === "weekly" ? draft.schedule : null;
  const specificSchedule =
    draft.schedule.type === "specific" ? draft.schedule : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Manage Doctors</h1>
          <p className="mt-1 text-slate-600">Manage clinic doctors and visiting specialists</p>
        </div>
        <button
          type="button"
          disabled={Boolean(loadError)}
          onClick={(event) => openForm(undefined, event.currentTarget)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:w-auto"
        >
          <Plus size={18} aria-hidden="true" />
          Add Doctor
        </button>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-teal-800">Permanent clinic owner</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">{owner.name}</h2>
        {owner.qualification && <p className="mt-1 text-slate-600">{owner.qualification}</p>}
        {owner.photoUrl && <Image unoptimized width={80} height={80} src={owner.photoUrl} alt={owner.name} className="mt-3 size-20 rounded-full object-cover" />}
        <Link href="/doctor/settings" className="mt-3 inline-block font-semibold text-teal-800 underline">Edit main profile</Link>
      </section>
      {loadError && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-amber-950">{loadError}</p>}

      <section aria-label="Search doctors" className="rounded-xl border border-slate-200 bg-white p-4">
        <label htmlFor="doctor-search" className="mb-1.5 block text-sm font-semibold text-slate-800">
          Search doctors
        </label>
        <div className="relative">
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            id="doctor-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or specialty"
            className={`${controlClass} pl-10`}
          />
        </div>
      </section>

      {loadError ? null : filteredDoctors.length === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-teal-50 text-teal-800">
            <Stethoscope size={24} aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-slate-950">
            {doctors.length > 0 ? "No doctors match your search" : "No doctors added yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            {doctors.length > 0
              ? "Try another name or specialty."
              : "Add an additional clinic doctor or visiting specialist. Saved records remain available after refresh."}
          </p>
          {doctors.length === 0 && (
            <button
              type="button"
              disabled={Boolean(loadError)}
          onClick={(event) => openForm(undefined, event.currentTarget)}
              className="mt-5 min-h-11 rounded-lg border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50"
            >
              Add your first doctor
            </button>
          )}
        </section>
      ) : (
        <section aria-label="Doctor records" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDoctors.map((doctor) => (
            <article
              key={doctor.id}
              className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-800">
                  {doctor.photoUrl ? <Image unoptimized width={48} height={48} src={doctor.photoUrl} alt={doctor.fullName} className="size-12 rounded-full object-cover" /> : <UserRound size={23} aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words font-bold text-slate-950">{doctor.fullName}</h2>
                  <p className="mt-1 text-sm text-slate-600">{doctor.specialty}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900">
                  {doctor.doctorType === "Visiting Specialist" ? "Visiting specialist" : "Regular"}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    doctor.status === "Active"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {doctor.status}
                </span>
              </div>
              <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Visiting schedule
                </p>
                <p className="mt-1 text-sm text-slate-700">{schedulePreview(doctor.schedule)}</p>
              </div>
              <button
                type="button"
                onClick={(event) => openForm(doctor, event.currentTarget)}
                aria-label={`Edit ${doctor.fullName}`}
                className="mt-5 min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Edit
              </button>
            </article>
          ))}
        </section>
      )}

      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsFormOpen(false);
          }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="doctor-form-title"
            className="max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
              <div>
                <h2 id="doctor-form-title" className="text-xl font-bold text-slate-950">
                  {editingId ? "Edit Doctor" : "Add Doctor"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">Fields marked * are required.</p>
              </div>
              <button
                type="button"
                onClick={() => { if (!savingRef.current) setIsFormOpen(false); }}
                aria-label="Close form"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            {saveError && <p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-red-800">{saveError}</p>}
            <form onSubmit={saveDoctor} noValidate className="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
              <section aria-labelledby="doctor-basic-details">
                <h3 id="doctor-basic-details" className="mb-4 text-base font-bold text-slate-950">
                  Basic Details
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <DoctorField
                      id="doctor-full-name"
                      label="Full name"
                      required
                      error={errors.fullName}
                    >
                      <input
                        id="doctor-full-name"
                        autoFocus
                        autoComplete="name"
                        value={draft.fullName}
                        onChange={(event) => updateDraft("fullName", event.target.value)}
                        aria-invalid={Boolean(errors.fullName)}
                        aria-describedby={errors.fullName ? "doctor-full-name-error" : undefined}
                        className={controlClass}
                        maxLength={120}
                      />
                    </DoctorField>
                  </div>
                  <DoctorField
                    id="doctor-specialty"
                    label="Specialty"
                    required
                    error={errors.specialty}
                  >
                    <input
                      id="doctor-specialty"
                      list="doctor-specialty-options"
                      value={draft.specialty}
                      onChange={(event) => updateDraft("specialty", event.target.value)}
                      aria-invalid={Boolean(errors.specialty)}
                      aria-describedby={errors.specialty ? "doctor-specialty-error" : undefined}
                      placeholder="Search or enter a specialty"
                      className={controlClass}
                      maxLength={100}
                    />
                    <datalist id="doctor-specialty-options">
                      {specialties.map((specialty) => (
                        <option key={specialty} value={specialty} />
                      ))}
                    </datalist>
                  </DoctorField>
                  {draft.specialty === "Other" && (
                    <DoctorField
                      id="doctor-other-specialty"
                      label="Other specialty"
                      required
                      error={errors.otherSpecialty}
                    >
                      <input
                        id="doctor-other-specialty"
                        value={otherSpecialty}
                        onChange={(event) => {
                          setOtherSpecialty(event.target.value);
                          setErrors((current) => ({ ...current, otherSpecialty: undefined }));
                        }}
                        aria-invalid={Boolean(errors.otherSpecialty)}
                        aria-describedby={
                          errors.otherSpecialty ? "doctor-other-specialty-error" : undefined
                        }
                        className={controlClass}
                        maxLength={100}
                      />
                    </DoctorField>
                  )}
                  <DoctorField id="doctor-qualifications" label="Qualifications">
                    <input
                      id="doctor-qualifications"
                      value={draft.qualifications}
                      onChange={(event) => updateDraft("qualifications", event.target.value)}
                      className={controlClass}
                      maxLength={150}
                      placeholder="e.g. MBBS, MD"
                    />
                  </DoctorField>
                  <DoctorField id="doctor-registration" label="Medical registration number">
                    <input
                      id="doctor-registration"
                      value={draft.registrationNumber}
                      onChange={(event) => updateDraft("registrationNumber", event.target.value)}
                      className={controlClass}
                      maxLength={100}
                    />
                  </DoctorField>
                  <DoctorField
                    id="doctor-experience"
                    label="Years of experience"
                    error={errors.experience}
                  >
                    <input
                      id="doctor-experience"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={draft.experience}
                      onChange={(event) => updateDraft("experience", event.target.value)}
                      aria-invalid={Boolean(errors.experience)}
                      aria-describedby={errors.experience ? "doctor-experience-error" : undefined}
                      className={controlClass}
                      inputMode="numeric"
                    />
                  </DoctorField>
                </div>
              </section>

              <section aria-labelledby="doctor-clinic-details">
                <h3 id="doctor-clinic-details" className="mb-4 text-base font-bold text-slate-950">
                  Clinic Details
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DoctorField id="doctor-type" label="Doctor type">
                    <select
                      id="doctor-type"
                      value={draft.doctorType}
                      onChange={(event) =>
                        updateDraft(
                          "doctorType",
                          event.target.value === "Visiting Specialist" ? "Visiting Specialist" : "Regular",
                        )
                      }
                      className={controlClass}
                    >
                      <option value="Regular">Regular</option>
                      <option value="Visiting Specialist">Visiting Specialist</option>
                    </select>
                  </DoctorField>
                  <DoctorField
                    id="doctor-fee"
                    label="Consultation fee"
                    error={errors.consultationFee}
                  >
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 mt-1.5 -translate-y-1/2 text-sm text-slate-500">
                        INR
                      </span>
                      <input
                        id="doctor-fee"
                        type="number"
                        min="0"
                        step="1"
                        value={draft.consultationFee}
                        onChange={(event) => updateDraft("consultationFee", event.target.value)}
                        aria-invalid={Boolean(errors.consultationFee)}
                        aria-describedby={
                          errors.consultationFee ? "doctor-fee-error" : undefined
                        }
                        className={`${controlClass} pl-12`}
                        inputMode="decimal"
                      />
                    </div>
                  </DoctorField>
                  <div className="sm:col-span-2">
                    <DoctorField id="doctor-description" label="Short professional description">
                      <textarea
                        id="doctor-description"
                        value={draft.description}
                        onChange={(event) => updateDraft("description", event.target.value)}
                        className={`${controlClass} min-h-24 py-2`}
                        maxLength={500}
                        rows={3}
                        placeholder="A brief introduction for patients"
                      />
                    </DoctorField>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-800" htmlFor="additional-doctor-photo">Profile photograph</label>
                    <input
                      id="additional-doctor-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={saving}
                      onChange={(event) => {
                        const selected = event.target.files?.[0] ?? null;
                        if (selected && (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) || selected.size > 5 * 1024 * 1024)) {
                          event.target.value = "";
                          setPhoto(null);
                          setPhotoPreview(editingId ? doctors.find((doctor) => doctor.id === editingId)?.photoUrl ?? null : null);
                          setSaveError("Choose a JPG, PNG or WebP photo smaller than 5 MB.");
                          return;
                        }
                        setSaveError("");
                        setPhoto(selected);
                        setPhotoPreview(selected ? URL.createObjectURL(selected) : editingId ? doctors.find((doctor) => doctor.id === editingId)?.photoUrl ?? null : null);
                      }}
                      className="mt-2 block w-full text-sm"
                    />
                    <div
                      aria-label="Profile photograph"
                      className="mt-1.5 flex min-h-20 items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3"
                    >
                      {photoPreview ? (
                        <Image unoptimized width={64} height={64} src={photoPreview} alt="Selected doctor photo" className="size-16 shrink-0 rounded-full object-cover" />
                      ) : (
                        <ImagePlus size={22} aria-hidden="true" className="shrink-0 text-slate-500" />
                      )}
                      <p className="text-sm leading-5 text-slate-600">
                        {photoPreview ? "Photo selected. It will be saved with this doctor." : "Choose a JPG, PNG or WebP photo, up to 5 MB."}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section aria-labelledby="doctor-visiting-schedule">
                <h3
                  id="doctor-visiting-schedule"
                  className="mb-4 text-base font-bold text-slate-950"
                >
                  Visiting Schedule
                </h3>
                <fieldset className="space-y-2">
                  <legend className="sr-only">Choose a visiting schedule option</legend>
                  {[
                    {
                      type: "weekly" as const,
                      title: "Weekly recurring schedule",
                      description: "Use the same days and times each week.",
                    },
                    {
                      type: "specific" as const,
                      title: "Specific visit date",
                      description: "Set a one-time visit date and hours.",
                    },
                    {
                      type: "unconfirmed" as const,
                      title: "Schedule not confirmed yet",
                      description: "Add the schedule details later.",
                    },
                  ].map((option) => (
                    <label
                      key={option.type}
                      className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        draft.schedule.type === option.type
                          ? "border-teal-700 bg-teal-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="doctor-schedule-type"
                        value={option.type}
                        checked={draft.schedule.type === option.type}
                        onChange={() => {
                          if (option.type === "weekly") {
                            updateSchedule({
                              type: "weekly",
                              days: [],
                              startTime: "",
                              endTime: "",
                            });
                          } else if (option.type === "specific") {
                            updateSchedule({
                              type: "specific",
                              date: "",
                              startTime: "",
                              endTime: "",
                            });
                          } else {
                            updateSchedule({ type: "unconfirmed" });
                          }
                        }}
                        className="mt-1 size-4 shrink-0 accent-teal-700"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">
                          {option.title}
                        </span>
                        <span className="mt-0.5 block text-sm text-slate-600">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>

                {weeklySchedule && (
                  <div className="mt-4 space-y-4">
                    <fieldset
                      aria-describedby={errors.scheduleDays ? "doctor-schedule-days-error" : undefined}
                      aria-invalid={Boolean(errors.scheduleDays)}
                    >
                      <legend className="text-sm font-semibold text-slate-800">
                        Visiting days <span className="text-rose-700" aria-hidden="true">*</span>
                        <span className="sr-only"> (required)</span>
                      </legend>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {weekdays.map((day) => (
                          <label
                            key={day}
                            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium ${
                              weeklySchedule.days.includes(day)
                                ? "border-teal-700 bg-teal-50 text-teal-950"
                                : "border-slate-300 bg-white text-slate-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              aria-label={day}
                              checked={weeklySchedule.days.includes(day)}
                              onChange={() => {
                                const days = weeklySchedule.days.includes(day)
                                  ? weeklySchedule.days.filter((selected) => selected !== day)
                                  : weekdays.filter(
                                      (weekday) =>
                                        weeklySchedule.days.includes(weekday) || weekday === day,
                                    );
                                updateSchedule({ ...weeklySchedule, days });
                              }}
                              className="size-4 shrink-0 accent-teal-700"
                            />
                            {day}
                          </label>
                        ))}
                      </div>
                      {errors.scheduleDays && (
                        <p
                          id="doctor-schedule-days-error"
                          className="mt-1 text-sm text-rose-700"
                          role="alert"
                        >
                          {errors.scheduleDays}
                        </p>
                      )}
                    </fieldset>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <DoctorField
                        id="doctor-weekly-start"
                        label="Start time"
                        required
                        error={errors.scheduleStartTime}
                      >
                        <input
                          id="doctor-weekly-start"
                          type="time"
                          value={weeklySchedule.startTime}
                          onChange={(event) => updateScheduleTime("startTime", event.target.value)}
                          aria-invalid={Boolean(errors.scheduleStartTime)}
                          aria-describedby={
                            errors.scheduleStartTime ? "doctor-weekly-start-error" : undefined
                          }
                          className={controlClass}
                        />
                      </DoctorField>
                      <DoctorField
                        id="doctor-weekly-end"
                        label="End time"
                        required
                        error={errors.scheduleEndTime}
                      >
                        <input
                          id="doctor-weekly-end"
                          type="time"
                          value={weeklySchedule.endTime}
                          onChange={(event) => updateScheduleTime("endTime", event.target.value)}
                          aria-invalid={Boolean(errors.scheduleEndTime)}
                          aria-describedby={
                            errors.scheduleEndTime ? "doctor-weekly-end-error" : undefined
                          }
                          className={controlClass}
                        />
                      </DoctorField>
                    </div>
                  </div>
                )}

                {specificSchedule && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <DoctorField
                      id="doctor-specific-date"
                      label="Visit date"
                      required
                      error={errors.scheduleDate}
                    >
                      <input
                        id="doctor-specific-date"
                        type="date"
                        value={specificSchedule.date}
                        onChange={(event) =>
                          updateSchedule({ ...specificSchedule, date: event.target.value })
                        }
                        aria-invalid={Boolean(errors.scheduleDate)}
                        aria-describedby={
                          errors.scheduleDate ? "doctor-specific-date-error" : undefined
                        }
                        className={controlClass}
                      />
                    </DoctorField>
                    <div className="hidden sm:block" aria-hidden="true" />
                    <DoctorField
                      id="doctor-specific-start"
                      label="Start time"
                      required
                      error={errors.scheduleStartTime}
                    >
                      <input
                        id="doctor-specific-start"
                        type="time"
                        value={specificSchedule.startTime}
                        onChange={(event) => updateScheduleTime("startTime", event.target.value)}
                        aria-invalid={Boolean(errors.scheduleStartTime)}
                        aria-describedby={
                          errors.scheduleStartTime ? "doctor-specific-start-error" : undefined
                        }
                        className={controlClass}
                      />
                    </DoctorField>
                    <DoctorField
                      id="doctor-specific-end"
                      label="End time"
                      required
                      error={errors.scheduleEndTime}
                    >
                      <input
                        id="doctor-specific-end"
                        type="time"
                        value={specificSchedule.endTime}
                        onChange={(event) => updateScheduleTime("endTime", event.target.value)}
                        aria-invalid={Boolean(errors.scheduleEndTime)}
                        aria-describedby={
                          errors.scheduleEndTime ? "doctor-specific-end-error" : undefined
                        }
                        className={controlClass}
                      />
                    </DoctorField>
                  </div>
                )}

                {draft.schedule.type === "unconfirmed" && (
                  <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-950">
                    Schedule not confirmed
                  </p>
                )}

                <div
                  aria-live="polite"
                  className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Schedule preview
                  </p>
                  <p className="mt-1 text-sm text-slate-800">
                    {schedulePreview(draft.schedule)}
                  </p>
                </div>
              </section>

              <section aria-labelledby="doctor-status">
                <h3 id="doctor-status" className="mb-3 text-base font-bold text-slate-950">
                  Status
                </h3>
                <div className="flex flex-wrap gap-3">
                  {(["Active", "Inactive"] as const).map((status) => (
                    <label
                      key={status}
                      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-800"
                    >
                      <input
                        type="radio"
                        name="doctor-status"
                        value={status}
                        checked={draft.status === status}
                        onChange={() => updateDraft("status", status)}
                        className="size-4 accent-teal-700"
                      />
                      {status}
                    </label>
                  ))}
                </div>
              </section>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => { if (!savingRef.current) setIsFormOpen(false); }}
                  className="min-h-11 rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || Boolean(loadError)}
                  className="min-h-11 rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
                >
                  {saving ? "Saving…" : "Save Doctor"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
