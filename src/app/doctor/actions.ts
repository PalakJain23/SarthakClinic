"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireDoctor } from "@/lib/doctor-auth";
import { isoDateSchema, normalizeIndianMobile } from "@/lib/booking-schema";
import { parseRupeesToPaise } from "@/lib/ledger";
import { indiaDate } from "@/lib/format";

export type FormActionState = {
  error?: string;
  success?: string;
  successToken?: string;
  patient?: { id: string; fullName: string; mobile: string };
};

const uuid = z.string().uuid();

export async function createPatientAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const name = String(formData.get("fullName") ?? "").trim();
  const rawMobile = String(formData.get("mobile") ?? "");
  const ageValue = String(formData.get("age") ?? "").trim();
  if (name.length < 1 || name.length > 120) {
    return { error: "Enter a patient name up to 120 characters." };
  }
  let mobile: string;
  try {
    mobile = normalizeIndianMobile(rawMobile);
  } catch {
    return { error: "Enter a valid Indian mobile number." };
  }
  const age = ageValue ? Number(ageValue) : null;
  if (age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) {
    return { error: "Age must be between 1 and 120." };
  }

  const { supabase } = await requireDoctor();
  const { data, error } = await supabase
    .from("patients")
    .insert({
      full_name: name,
      mobile,
      age,
      private_notes: String(formData.get("privateNotes") ?? "").slice(0, 5000),
    })
    .select("id, full_name, mobile")
    .single();
  if (error) {
    console.error("Patient creation failed", { code: error.code });
    return { error: "Patient could not be saved." };
  }
  revalidatePath("/doctor/patients");
  revalidatePath("/doctor/accounts");
  revalidatePath("/doctor/appointments");
  return {
    success: "Patient record created. Phone numbers are not used to merge records.",
    successToken: crypto.randomUUID(),
    patient: { id: data.id, fullName: data.full_name, mobile: data.mobile },
  };
}

export async function createSessionAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const locationId = String(formData.get("locationId") ?? "");
  const date = String(formData.get("sessionDate") ?? "");
  const startsAt = String(formData.get("startsAt") ?? "");
  const endsAt = String(formData.get("endsAt") ?? "");
  const capacity = Number(formData.get("capacity"));
  if (
    !uuid.safeParse(locationId).success ||
    !isoDateSchema.safeParse(date).success ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(startsAt) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(endsAt) ||
    startsAt >= endsAt ||
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    capacity > 500
  ) {
    return { error: "Check the date, location, times, and capacity." };
  }
  const { supabase } = await requireDoctor();
  const { error } = await supabase.from("availability_sessions").insert({
    location_id: locationId,
    session_date: date,
    starts_at: startsAt,
    ends_at: endsAt,
    capacity,
    bookings_enabled: formData.get("bookingsEnabled") === "on",
    public_note: String(formData.get("publicNote") ?? "").slice(0, 300) || null,
    private_note: String(formData.get("privateNote") ?? "").slice(0, 1000) || null,
  });
  if (error) {
    console.error("Availability session creation failed", { code: error.code });
    return {
      error:
        error.code === "23P01"
          ? "This time overlaps another session. Choose a different time."
          : "The session could not be saved. Check that the selected location is active.",
    };
  }
  revalidatePath("/");
  revalidatePath("/doctor/availability");
  return { success: "Session saved." };
}

export async function updateSessionAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  const date = String(formData.get("sessionDate") ?? "");
  const startsAt = String(formData.get("startsAt") ?? "");
  const endsAt = String(formData.get("endsAt") ?? "");
  const capacity = Number(formData.get("capacity"));
  if (
    !uuid.safeParse(sessionId).success ||
    !uuid.safeParse(locationId).success ||
    !isoDateSchema.safeParse(date).success ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(startsAt) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(endsAt) ||
    startsAt >= endsAt ||
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    capacity > 500
  ) {
    return { error: "Check the date, location, times, and capacity." };
  }
  const { supabase } = await requireDoctor();
  const { error } = await supabase.rpc("update_availability_session", {
    p_session_id: sessionId,
    p_session_date: date,
    p_location_id: locationId,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_capacity: capacity,
    p_bookings_enabled: formData.get("bookingsEnabled") === "on",
    p_is_blocked: formData.get("isBlocked") === "on",
    p_public_note: String(formData.get("publicNote") ?? "").slice(0, 300) || null,
    p_private_note: String(formData.get("privateNote") ?? "").slice(0, 1000) || null,
    p_confirm_affected: formData.get("confirmAffected") === "on",
  });
  if (error) {
    console.error("Availability session update failed", { code: error.code });
    if (error.message.includes("Affected bookings require confirmation")) {
      return { error: "Existing bookings will be flagged for manual contact. Confirm before saving." };
    }
    if (error.message.includes("Capacity cannot be below")) {
      return { error: "Capacity cannot be lower than the number of active bookings." };
    }
    return {
      error:
        error.code === "23P01"
          ? "This time overlaps another session. Choose a different time."
          : "The session could not be updated.",
    };
  }
  revalidatePath("/");
  revalidatePath("/doctor/availability");
  revalidatePath("/doctor");
  return { success: "Session updated. Existing bookings were preserved and flagged when needed." };
}

export async function updateAppointmentStatusAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (
    !uuid.safeParse(appointmentId).success ||
    !["requested", "confirmed", "waiting", "consulting", "completed", "cancelled"].includes(status)
  ) {
    return { error: "Invalid appointment update." };
  }
  const { supabase } = await requireDoctor();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Appointment update failed", { code: error.code });
    return { error: "Appointment status could not be updated." };
  }
  if (!data) return { error: "Appointment was not found. Refresh and try again." };
  revalidatePath("/doctor");
  revalidatePath("/doctor/appointments");
  revalidatePath("/");
  return { success: "Appointment updated." };
}

export async function createAppointmentAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const patientId = String(formData.get("patientId") ?? "").trim();
  const patientNameInput = String(formData.get("patientName") ?? "").trim();
  const mobileInput = String(formData.get("mobile") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const preferredTimeInput = String(formData.get("preferredTime") ?? "").trim();
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  if (
    !uuid.safeParse(sessionId).success ||
    (patientId && !uuid.safeParse(patientId).success) ||
    !uuid.safeParse(idempotencyKey).success ||
    reason.length > 300 ||
    (preferredTimeInput && !/^([01]\d|2[0-3]):[0-5]\d$/.test(preferredTimeInput))
  ) {
    return { error: "Check the appointment details and selected session." };
  }

  const { supabase } = await requireDoctor();
  const [sessionResult, patientResult, existingResult] = await Promise.all([
    supabase
      .from("availability_sessions")
      .select("id, session_date")
      .eq("id", sessionId)
      .gte("session_date", indiaDate())
      .maybeSingle(),
    patientId
      ? supabase.from("patients").select("id, full_name, mobile").eq("id", patientId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("appointments")
      .select("id, session_id, patient_id, patient_name, mobile, reason, preferred_time")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle(),
  ]);
  if (sessionResult.error || patientResult.error || existingResult.error) {
    console.error("Could not verify appointment details", {
      code: sessionResult.error?.code ?? patientResult.error?.code ?? existingResult.error?.code,
    });
    return { error: "Appointment details could not be verified. No changes were made." };
  }
  if (!sessionResult.data) return { error: "Choose an available current or future session." };
  if (patientId && !patientResult.data) return { error: "The selected patient record was not found." };

  const patientName = patientResult.data?.full_name ?? patientNameInput;
  let mobile: string;
  try {
    mobile = patientResult.data?.mobile ?? normalizeIndianMobile(mobileInput);
  } catch {
    return { error: "Enter a valid Indian mobile number." };
  }
  if (patientName.length < 2 || patientName.length > 100) {
    return { error: "Enter a patient name between 2 and 100 characters." };
  }

  const existing = existingResult.data;
  if (existing) {
    const same = existing.session_id === sessionId &&
      existing.patient_id === (patientId || null) &&
      existing.patient_name === patientName &&
      existing.mobile === mobile &&
      existing.reason === (reason || null) &&
      existing.preferred_time === (preferredTimeInput || null);
    return same
      ? { success: "Appointment saved.", successToken: crypto.randomUUID() }
      : { error: "This submission key was already used for a different appointment." };
  }

  const { error } = await supabase.from("appointments").insert({
    booking_reference: `DOCTOR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    idempotency_key: idempotencyKey,
    session_id: sessionId,
    patient_id: patientId || null,
    patient_name: patientName,
    mobile,
    preferred_time: preferredTimeInput || null,
    reason: reason || null,
    privacy_acknowledged: true,
    status: "confirmed",
  });
  if (error) {
    console.error("Appointment creation failed", { code: error.code });
    if (error.code === "23505") {
      const { data: retryRecord, error: retryError } = await supabase
        .from("appointments")
        .select("session_id, patient_id, patient_name, mobile, reason, preferred_time")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (!retryError && retryRecord &&
        retryRecord.session_id === sessionId &&
        retryRecord.patient_id === (patientId || null) &&
        retryRecord.patient_name === patientName &&
        retryRecord.mobile === mobile &&
        retryRecord.reason === (reason || null) &&
        retryRecord.preferred_time === (preferredTimeInput || null)) {
        return { success: "Appointment saved.", successToken: crypto.randomUUID() };
      }
    }
    return {
      error: error.code === "P0001"
        ? "This session is full or no longer accepts appointments."
        : "Appointment could not be saved.",
    };
  }
  revalidatePath("/doctor");
  revalidatePath("/doctor/appointments");
  revalidatePath("/doctor/accounts");
  revalidatePath("/doctor/reports");
  return { success: "Appointment saved.", successToken: crypto.randomUUID() };
}

export async function updateAppointmentAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const status = String(formData.get("status") ?? "");
  const preferredTime = String(formData.get("preferredTime") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (
    !uuid.safeParse(appointmentId).success ||
    !uuid.safeParse(sessionId).success ||
    !["requested", "confirmed", "waiting", "consulting", "completed", "cancelled"].includes(status) ||
    (preferredTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(preferredTime)) ||
    reason.length > 300
  ) {
    return { error: "Check the appointment status, requested time, and reason." };
  }
  const { supabase } = await requireDoctor();
  const sessionResult = await supabase
    .from("availability_sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionResult.error) {
    console.error("Appointment session check failed", { code: sessionResult.error.code });
    return { error: "The selected session could not be verified." };
  }
  if (!sessionResult.data) return { error: "The selected session was not found." };
  const { data, error } = await supabase
    .from("appointments")
    .update({
      session_id: sessionId,
      status,
      preferred_time: preferredTime || null,
      reason: reason || null,
    })
    .eq("id", appointmentId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Appointment update failed", { code: error.code });
    return {
      error: error.code === "P0001"
        ? "This session is full or no longer accepts appointments."
        : "Appointment could not be updated.",
    };
  }
  if (!data) return { error: "Appointment was not found. Refresh and try again." };
  revalidatePath("/doctor");
  revalidatePath("/doctor/appointments");
  revalidatePath(`/doctor/patients`);
  revalidatePath("/doctor/reports");
  return { success: "Appointment updated.", successToken: crypto.randomUUID() };
}

export type LedgerPatientSummary = {
  patient: { id: string; fullName: string; mobile: string };
  openingDuesPaise: string;
  chargesPaise: string;
  paymentsPaise: string;
  balancePaise: string;
  recentEntries: {
    id: string;
    entryType: string;
    amountPaise: string;
    description: string;
    effectiveAt: string;
  }[];
};

export async function loadLedgerPatientSummaryAction(
  patientId: string,
): Promise<LedgerPatientSummary | null> {
  if (!uuid.safeParse(patientId).success) return null;
  const { supabase } = await requireDoctor();
  const [patientResult, summaryResult, entriesResult] = await Promise.all([
    supabase.from("patients").select("id, full_name, mobile").eq("id", patientId).maybeSingle(),
    supabase.rpc("patient_ledger_summary", { p_patient_id: patientId }),
    supabase
      .from("ledger_entries")
      .select("id, entry_type, amount_paise, description, effective_at")
      .eq("patient_id", patientId)
      .order("effective_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const failed = [patientResult, summaryResult, entriesResult].find((result) => result.error);
  if (failed?.error) {
    console.error("Patient ledger summary load failed", { code: failed.error.code });
    throw new Error("Could not load this patient’s ledger summary.");
  }
  const patient = patientResult.data;
  const summary = summaryResult.data?.[0];
  if (!patient || !summary) return null;
  return {
    patient: { id: patient.id, fullName: patient.full_name, mobile: patient.mobile },
    openingDuesPaise: String(summary.opening_dues_paise),
    chargesPaise: String(summary.credit_charges_paise),
    paymentsPaise: String(summary.collected_paise),
    balancePaise: String(summary.balance_paise),
    recentEntries: (entriesResult.data ?? []).map((entry) => ({
      id: entry.id,
      entryType: entry.entry_type,
      amountPaise: String(entry.amount_paise),
      description: entry.description,
      effectiveAt: entry.effective_at,
    })),
  };
}

export async function linkAppointmentPatientAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const patientId = String(formData.get("patientId") ?? "").trim();
  const createNew = formData.get("createNew") === "on";
  if (
    !uuid.safeParse(appointmentId).success ||
    (patientId && !uuid.safeParse(patientId).success) ||
    (createNew && patientId) ||
    (!createNew && !patientId)
  ) {
    return { error: "Select an existing patient or choose to create a new record." };
  }
  const { supabase } = await requireDoctor();
  const { error } = await supabase.rpc("link_appointment_patient", {
    p_appointment_id: appointmentId,
    p_patient_id: patientId || null,
    p_create_new: createNew,
  });
  if (error) {
    console.error("Appointment patient link failed", { code: error.code });
    return { error: "Patient record could not be linked. It may already be linked." };
  }
  revalidatePath("/doctor/appointments");
  revalidatePath("/doctor/patients");
  revalidatePath("/doctor");
  revalidatePath("/doctor/reports");
  return { success: createNew ? "New patient record created and linked." : "Patient record linked." };
}

export async function createWalkInAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const patientId = String(formData.get("patientId") ?? "").trim();
  const name = String(formData.get("patientName") ?? "").trim();
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  if (
    !uuid.safeParse(sessionId).success ||
    (patientId && !uuid.safeParse(patientId).success) ||
    !uuid.safeParse(idempotencyKey).success
  ) {
    return { error: "Select a valid session and patient record." };
  }
  let mobile: string;
  try {
    mobile = normalizeIndianMobile(String(formData.get("mobile") ?? ""));
  } catch {
    return { error: "Enter a valid Indian mobile number." };
  }
  if (name.length < 2 || name.length > 100) {
    return { error: "Enter a patient name." };
  }
  const { supabase } = await requireDoctor();
  const { data: existing, error: existingError } = await supabase
    .from("appointments")
    .select("id, session_id, patient_id, patient_name, mobile")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existingError) {
    console.error("Could not check walk-in idempotency", { code: existingError.code });
    return { error: "Walk-in could not be verified. Try again." };
  }
  if (existing) {
    return existing.session_id === sessionId &&
      existing.patient_id === (patientId || null) &&
      existing.patient_name === name &&
      existing.mobile === mobile
      ? { success: "Walk-in added.", successToken: crypto.randomUUID() }
      : { error: "This submission key was already used for a different walk-in." };
  }
  const { error } = await supabase.from("appointments").insert({
    booking_reference: `WALKIN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    idempotency_key: idempotencyKey,
    session_id: sessionId,
    patient_id: patientId || null,
    patient_name: name,
    mobile,
    privacy_acknowledged: true,
    status: "waiting",
  });
  if (error) {
    console.error("Walk-in creation failed", { code: error.code });
    if (error.code === "23505") {
      const { data: retryRecord, error: retryError } = await supabase
        .from("appointments")
        .select("id, session_id, patient_id, patient_name, mobile")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (!retryError && retryRecord?.session_id === sessionId &&
        retryRecord.patient_id === (patientId || null) &&
        retryRecord.patient_name === name && retryRecord.mobile === mobile) {
        return { success: "Walk-in added.", successToken: crypto.randomUUID() };
      }
    }
    return { error: "Walk-in could not be added. Check session capacity and try again." };
  }
  revalidatePath("/doctor");
  revalidatePath("/doctor/appointments");
  revalidatePath("/doctor/reports");
  return { success: "Walk-in added.", successToken: crypto.randomUUID() };
}

export async function recordLedgerAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const patientId = String(formData.get("patientId") ?? "");
  const entryType = String(formData.get("entryType") ?? "");
  const amount = parseRupeesToPaise(String(formData.get("amount") ?? ""), true);
  const rawDescription = String(formData.get("description") ?? "").trim();
  const description = rawDescription || (String(formData.get("entryType") ?? "") === "payment" ? "Payment received" : "Treatment charge");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const reason = String(formData.get("correctionReason") ?? "").trim();
  const signedTypes = entryType === "correction";
  if (
    !uuid.safeParse(patientId).success ||
    !uuid.safeParse(idempotencyKey).success ||
    !["opening_balance", "charge", "payment", "correction"].includes(entryType) ||
    amount === null ||
    (signedTypes && !reason) ||
    description.length < 1 ||
    description.length > 240
  ) {
    return { error: "Enter a valid transaction, amount, description, and correction reason if needed." };
  }
  if (entryType !== "correction" && amount < 0) {
    return { error: "Opening dues, charges, and payments must be entered as positive amounts." };
  }
  const effectiveDate = String(formData.get("effectiveDate") ?? "");
  if (!isoDateSchema.safeParse(effectiveDate).success) {
    return { error: "Choose an effective date." };
  }

  const { supabase } = await requireDoctor();
  const { error } = await supabase.rpc("post_ledger_entry", {
    p_patient_id: patientId,
    p_entry_type: entryType,
    p_amount_paise: Number(entryType === "correction" ? amount : amount < 0n ? -amount : amount),
    p_description: description,
    p_effective_at: `${effectiveDate}T12:00:00+05:30`,
    p_idempotency_key: idempotencyKey,
    p_overpayment_confirmed: formData.get("overpaymentConfirmed") === "on",
    p_correction_reason: signedTypes ? reason : null,
    p_reverses_entry_id: null,
  });
  if (error) {
    console.error("Ledger write failed", { code: error.code });
    if (error.message.includes("Overpayment confirmation required")) {
      return { error: "Payment exceeds the balance. Confirm patient credit and retry." };
    }
    return { error: "Transaction could not be recorded." };
  }
  revalidatePath("/doctor/accounts");
  revalidatePath(`/doctor/patients/${patientId}`);
  revalidatePath("/doctor");
  revalidatePath("/doctor/reports");
  return { success: "Transaction recorded.", successToken: crypto.randomUUID() };
}

export async function saveProfileAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const clinicName = String(formData.get("clinicName") ?? "").trim();
  const doctorName = String(formData.get("doctorName") ?? "").trim();
  const qualification = String(formData.get("qualification") ?? "").trim();
  const speciality = String(formData.get("speciality") ?? "").trim();
  const introduction = String(formData.get("introduction") ?? "").trim();
  const phoneInput = String(formData.get("phone") ?? "").trim();
  const whatsappInput = String(formData.get("whatsapp") ?? "").trim();
  const photoUrl = String(formData.get("doctorPhotoUrl") ?? "").trim();
  let validPhotoUrl = false;
  if (photoUrl) {
    try {
      validPhotoUrl = new URL(photoUrl).protocol === "https:" && Boolean(new URL(photoUrl).hostname);
    } catch {
      validPhotoUrl = false;
    }
  }
  if (
    !clinicName ||
    clinicName.length > 120 ||
    doctorName.length > 120 ||
    qualification.length > 200 ||
    speciality.length > 120 ||
    introduction.length > 1200 ||
    (photoUrl !== "" && (!validPhotoUrl || photoUrl.length > 1000))
  ) {
    return { error: "Check the clinic and doctor details." };
  }
  function optionalMobile(value: string) {
    if (!value) return null;
    try {
      return normalizeIndianMobile(value);
    } catch {
      return undefined;
    }
  }
  const phone = optionalMobile(phoneInput);
  const whatsapp = optionalMobile(whatsappInput);
  if (phone === undefined || whatsapp === undefined) {
    return { error: "Use a valid 10-digit Indian number or leave the contact field blank." };
  }
  const { supabase } = await requireDoctor();
  const { error } = await supabase.from("clinic_profile").upsert(
    {
      singleton: true,
      clinic_name: clinicName,
      doctor_name: doctorName,
      qualification,
      speciality: speciality || null,
      public_introduction: introduction,
      doctor_photo_url: photoUrl || null,
      public_phone: phone,
      public_whatsapp: whatsapp,
    },
    { onConflict: "singleton" },
  );
  if (error) {
    console.error("Clinic profile update failed", { code: error.code });
    return { error: "Settings could not be saved." };
  }
  revalidatePath("/");
  revalidatePath("/doctor/settings");
  return { success: "Settings saved." };
}

export async function updatePatientAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const patientId = String(formData.get("patientId") ?? "");
  const name = String(formData.get("fullName") ?? "").trim();
  const ageValue = String(formData.get("age") ?? "").trim();
  const age = ageValue ? Number(ageValue) : null;
  const notes = String(formData.get("privateNotes") ?? "");
  if (
    !uuid.safeParse(patientId).success ||
    !name ||
    name.length > 120 ||
    (age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) ||
    notes.length > 5000
  ) {
    return { error: "Check the name, age, and private notes." };
  }
  const { supabase } = await requireDoctor();
  const { error } = await supabase
    .from("patients")
    .update({ full_name: name, age, private_notes: notes })
    .eq("id", patientId);
  if (error) {
    console.error("Patient profile update failed", { code: error.code });
    return { error: "Patient details could not be updated." };
  }
  revalidatePath(`/doctor/patients/${patientId}`);
  revalidatePath("/doctor/patients");
  revalidatePath("/doctor/accounts");
  return { success: "Patient details updated." };
}

export async function addLocationAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const directionsUrl = String(formData.get("directionsUrl") ?? "").trim();
  if (!name || name.length > 120 || !address || address.length > 500) {
    return { error: "Enter a location name and address." };
  }
  if (
    directionsUrl &&
    !/^https:\/\/(maps\.google\.com\/|www\.google\.com\/maps|maps\.app\.goo\.gl\/)/.test(directionsUrl)
  ) {
    return { error: "Use a Google Maps directions link or leave it blank." };
  }
  const { supabase } = await requireDoctor();
  const { error } = await supabase.from("clinic_locations").insert({
    name,
    public_address: address,
    directions_url: directionsUrl || null,
  });
  if (error) {
    console.error("Clinic location creation failed", { code: error.code });
    return { error: "Location could not be saved." };
  }
  revalidatePath("/");
  revalidatePath("/doctor/settings");
  revalidatePath("/doctor/availability");
  return { success: "Location added." };
}

export async function addStandardLocationsAction(
  _previous: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  void _previous;
  void _formData;
  const standardLocations = [
    { name: "Village consultation", public_address: "Ashta, Madhya Pradesh", sort_order: 0 },
    { name: "Sarthak Clinic, Ashta", public_address: "Ashta, Madhya Pradesh", sort_order: 1 },
  ];
  const { supabase } = await requireDoctor();
  const { data: existing, error: lookupError } = await supabase
    .from("clinic_locations")
    .select("name, active")
    .in("name", standardLocations.map(({ name }) => name));
  if (lookupError) {
    console.error("Standard clinic location lookup failed", { code: lookupError.code });
    return { error: "Clinic locations could not be checked. Try again." };
  }

  const existingNames = new Set((existing ?? []).map(({ name }) => name));
  const activeNames = new Set(
    (existing ?? []).filter(({ active }) => active).map(({ name }) => name),
  );
  const inactiveLocation = standardLocations.find(
    ({ name }) => existingNames.has(name) && !activeNames.has(name),
  );
  if (inactiveLocation) {
    return {
      error: `${inactiveLocation.name} already exists but is inactive. Enable it in Settings to use it.`,
    };
  }

  const missing = standardLocations.filter(
    ({ name }) => !existingNames.has(name) && !activeNames.has(name),
  );
  if (missing.length > 0) {
    const { error: insertError } = await supabase.from("clinic_locations").insert(missing);
    if (insertError) {
      console.error("Standard clinic location creation failed", { code: insertError.code });
      return { error: "Standard clinic locations could not be added. Check Settings and try again." };
    }
  }

  revalidatePath("/");
  revalidatePath("/doctor/settings");
  revalidatePath("/doctor/availability");
  return { success: "Village consultation and Sarthak Clinic, Ashta are available." };
}

export async function addServiceAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 120) return { error: "Enter a service name." };
  const { supabase } = await requireDoctor();
  const { error } = await supabase.from("clinic_services").insert({ name });
  if (error) {
    console.error("Clinic service creation failed", { code: error.code });
    return { error: "Service could not be saved." };
  }
  revalidatePath("/");
  revalidatePath("/doctor/settings");
  return { success: "Service added." };
}

export async function blockDateAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const date = String(formData.get("blockedDate") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const blocked = formData.get("blocked") === "on";
  if (!isoDateSchema.safeParse(date).success || reason.length > 300) {
    return { error: "Choose a valid date and keep the note under 300 characters." };
  }
  const { supabase } = await requireDoctor();
  const result = blocked
    ? await supabase.from("blocked_dates").upsert(
        { blocked_date: date, reason: reason || null },
        { onConflict: "blocked_date", ignoreDuplicates: true },
      )
    : await supabase.from("blocked_dates").delete().eq("blocked_date", date);
  if (result.error) {
    console.error("Blocked date update failed", { code: result.error.code });
    return { error: "Blocked date could not be updated." };
  }
  revalidatePath("/");
  revalidatePath("/doctor/availability");
  return { success: blocked ? "Date blocked. Existing appointments were preserved and flagged." : "Date unblocked." };
}

export async function updateLocationAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const directionsUrl = String(formData.get("directionsUrl") ?? "").trim();
  if (!uuid.safeParse(id).success || !name || name.length > 120 || !address || address.length > 500) {
    return { error: "Check the location name and address." };
  }
  if (
    directionsUrl &&
    !/^https:\/\/(maps\.google\.com\/|www\.google\.com\/maps|maps\.app\.goo\.gl\/)/.test(directionsUrl)
  ) {
    return { error: "Use a Google Maps directions link or leave it blank." };
  }
  const { supabase } = await requireDoctor();
  const active = formData.get("active") === "on";
  if (!active) {
    const { count, error: countError } = await supabase
      .from("availability_sessions")
      .select("id", { count: "exact", head: true })
      .eq("location_id", id)
      .eq("bookings_enabled", true)
      .gte("session_date", indiaDate());
    if (countError) {
      console.error("Could not check active location sessions", { code: countError.code });
      return { error: "Existing sessions could not be checked. No changes were made." };
    }
    if (count) return { error: "Close future booking sessions at this location before hiding it." };
  }
  const { error } = await supabase.from("clinic_locations").update({
    name,
    public_address: address,
    directions_url: directionsUrl || null,
    active,
  }).eq("id", id);
  if (error) {
    console.error("Clinic location update failed", { code: error.code });
    return { error: "Location could not be updated." };
  }
  revalidatePath("/");
  revalidatePath("/doctor/settings");
  revalidatePath("/doctor/availability");
  return { success: "Location updated." };
}

export async function updateServiceAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!uuid.safeParse(id).success || !name || name.length > 120) {
    return { error: "Check the service name." };
  }
  const { supabase } = await requireDoctor();
  const { error } = await supabase.from("clinic_services").update({
    name,
    active: formData.get("active") === "on",
  }).eq("id", id);
  if (error) {
    console.error("Clinic service update failed", { code: error.code });
    return { error: "Service could not be updated." };
  }
  revalidatePath("/");
  revalidatePath("/doctor/settings");
  return { success: "Service updated." };
}

export async function addVisitAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const patientId = String(formData.get("patientId") ?? "");
  const appointmentId = String(formData.get("appointmentId") ?? "").trim();
  const visitDate = String(formData.get("visitDate") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (
    !uuid.safeParse(patientId).success ||
    (appointmentId && !uuid.safeParse(appointmentId).success) ||
    !isoDateSchema.safeParse(visitDate).success ||
    notes.length > 10000
  ) {
    return { error: "Check the visit date and notes." };
  }
  const { supabase } = await requireDoctor();
  const { error } = await supabase.from("visits").insert({
    patient_id: patientId,
    appointment_id: appointmentId || null,
    visit_date: visitDate,
    notes,
  });
  if (error) {
    console.error("Visit record creation failed", { code: error.code });
    return { error: "Visit record could not be saved." };
  }
  revalidatePath(`/doctor/patients/${patientId}`);
  revalidatePath("/doctor/accounts");
  return { success: "Visit note saved." };
}

export async function reverseLedgerEntryAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const patientId = String(formData.get("patientId") ?? "");
  const entryId = String(formData.get("entryId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const effectiveAt = String(formData.get("effectiveAt") ?? "");
  if (
    !uuid.safeParse(patientId).success ||
    !uuid.safeParse(entryId).success ||
    !uuid.safeParse(idempotencyKey).success ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(effectiveAt) ||
    reason.length < 3 ||
    reason.length > 500
  ) {
    return { error: "Provide a reason of 3–500 characters to reverse this entry." };
  }
  if (formData.get("confirmReversal") !== "on") {
    return { error: "Confirm that this entry should be reversed and retained in the ledger history." };
  }
  const { supabase } = await requireDoctor();
  const { error } = await supabase.rpc("post_ledger_entry", {
    p_patient_id: patientId,
    p_entry_type: "reversal",
    p_amount_paise: 1,
    p_description: "Reversal",
    p_effective_at: effectiveAt,
    p_idempotency_key: idempotencyKey,
    p_overpayment_confirmed: true,
    p_correction_reason: reason,
    p_reverses_entry_id: entryId,
  });
  if (error) {
    console.error("Ledger reversal failed", { code: error.code });
    return { error: "Entry could not be reversed. It may already have a reversal." };
  }
  revalidatePath("/doctor/accounts");
  revalidatePath(`/doctor/patients/${patientId}`);
  revalidatePath("/doctor");
  revalidatePath("/doctor/reports");
  return {
    success: "Reversal recorded as a new ledger entry.",
    successToken: crypto.randomUUID(),
  };
}
