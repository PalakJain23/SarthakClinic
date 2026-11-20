import "server-only";

import { existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getSamplePublicClinic, SAMPLE_PUBLIC_CONTENT } from "@/lib/sample-public-content";
import {
  doctorScheduleCoversSession,
  doctorScheduleSchema,
  type DoctorSchedule,
} from "@/lib/doctor-directory-schema";

const initialOwnerPhotoPath = "/images/doctors/subhal-thakur.webp";

export function getInitialOwnerPhotoUrl() {
  return existsSync(join(process.cwd(), "public", "images", "doctors", "subhal-thakur.webp"))
    ? initialOwnerPhotoPath
    : null;
}

export type SessionStatus = "open" | "closed" | "full";

export type PublicSession = {
  id: string;
  bookingSessionId?: string;
  doctorId?: string | null;
  doctorName?: string;
  date: string;
  locationId: string;
  locationName: string;
  address: string;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
  note: string | null;
  isSample: boolean;
};

export type PublicDoctor = {
  id: string;
  fullName: string;
  specialty: string;
  doctorType: "Regular" | "Visiting Specialist";
  qualification: string;
  photoUrl: string | null;
  schedule: DoctorSchedule;
};

export type PublicLocation = {
  id: string;
  name: string;
  address: string;
  directionsUrl: string | null;
};

export type PublicClinicData = {
  isDemo: boolean;
  isConfigured: boolean;
  isSampleProfile: boolean;
  isSampleAvailability: boolean;
  isSampleLocations: boolean;
  isSamplePhone: boolean;
  isSampleWhatsApp: boolean;
  clinicName: string;
  doctorName: string;
  qualification: string;
  speciality: string;
  registrationInfo: string;
  introduction: string;
  doctorPhotoUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  locations: PublicLocation[];
  sessions: PublicSession[];
  additionalDoctors: PublicDoctor[];
};

function isDemoMode() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  );
}

function dateInIndia(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]));
  return new Date(Date.UTC(values.year, values.month - 1, values.day + offsetDays))
    .toISOString()
    .slice(0, 10);
}

export async function getPublicClinicData(): Promise<PublicClinicData> {
  const demo = isDemoMode();
  if (demo) {
    return {
      ...getSamplePublicClinic({
        isDemo: true,
        isConfigured: false,
        includeSampleSessions: true,
      }),
      doctorPhotoUrl: getInitialOwnerPhotoUrl(),
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return {
      ...getSamplePublicClinic({
        isDemo: false,
        isConfigured: false,
        includeSampleSessions: process.env.NODE_ENV !== "production",
      }),
      doctorPhotoUrl: getInitialOwnerPhotoUrl(),
    };
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [profileResult, locationResult, sessionResult, doctorResult] =
    await Promise.all([
      supabase.from("public_clinic_profile").select("*").maybeSingle(),
      supabase.from("public_clinic_locations").select("*").order("sort_order"),
      supabase
        .from("public_availability")
        .select("*")
        .gte("session_date", dateInIndia())
        .lte("session_date", dateInIndia(30))
        .order("session_date")
        .order("starts_at"),
      supabase
        .from("public_clinic_doctors")
        .select("id, full_name, specialty, doctor_type, qualifications, photo_url, schedule")
        .order("full_name"),
    ]);

  for (const result of [
    profileResult,
    locationResult,
    sessionResult,
  ]) {
    if (result.error) {
      throw new Error(`Could not load clinic information: ${result.error.message}`);
    }
  }
  if (doctorResult.error && doctorResult.error.code !== "PGRST205") {
    throw new Error(`Could not load additional doctor availability: ${doctorResult.error.message}`);
  }
  if (doctorResult.error) {
    console.error("Public additional doctor directory is not installed", {
      code: doctorResult.error.code,
    });
  }

  const configuredLocations = (locationResult.data ?? []).map((location) => ({
    id: location.id,
    name: location.name,
    address: location.public_address,
    directionsUrl: location.directions_url,
  }));
  const locations = configuredLocations.length
    ? configuredLocations
    : [SAMPLE_PUBLIC_CONTENT.location, {
        id: "sample-village",
        name: "Village consultation",
        address: "Ashta, Madhya Pradesh",
        directionsUrl: null,
      }];
  const byId = new Map(locations.map((location) => [location.id, location]));
  const actualSessions = (sessionResult.data ?? []).flatMap((session) => {
    const location = byId.get(session.location_id);
    if (!location) return [];
    return [
      {
        id: session.id,
        bookingSessionId: session.id,
        doctorId: null,
        doctorName: profileResult.data?.doctor_name?.trim() || SAMPLE_PUBLIC_CONTENT.doctorName,
        date: session.session_date,
        locationId: session.location_id,
        locationName: location.name,
        address: location.address,
        startsAt: session.starts_at.slice(0, 5),
        endsAt: session.ends_at.slice(0, 5),
        status: session.booking_status as SessionStatus,
        note: session.public_note,
        isSample: false,
      },
    ];
  });
  const profile = profileResult.data;
  const additionalDoctors = (doctorResult.data ?? []).flatMap((row) => {
    const schedule = doctorScheduleSchema.safeParse(row.schedule);
    if (!schedule.success || !row.full_name?.trim() || !row.specialty?.trim()) return [];
    return [{
      id: row.id,
      fullName: row.full_name.trim(),
      specialty: row.specialty.trim(),
      doctorType: row.doctor_type === "Visiting Specialist" ? "Visiting Specialist" as const : "Regular" as const,
      qualification: row.qualifications?.trim() ?? "",
      photoUrl: row.photo_url?.trim() || null,
      schedule: schedule.data,
    }];
  });
  const additionalDoctorSessions = actualSessions.flatMap((session) =>
    additionalDoctors
      .filter((doctor) => doctorScheduleCoversSession(
        doctor.schedule,
        session.date,
        session.startsAt,
        session.endsAt,
      ))
      .map((doctor) => ({
        ...session,
        id: `${session.id}:${doctor.id}`,
        doctorId: doctor.id,
        doctorName: doctor.fullName,
      })),
  );
  const isSamplePhone = !profile?.public_phone?.trim();
  const isSampleWhatsApp = !profile?.public_whatsapp?.trim();
  const doctorName = profile?.doctor_name?.trim() || SAMPLE_PUBLIC_CONTENT.doctorName;
  const qualification = profile?.qualification?.trim() || "";
  const speciality = profile?.speciality?.trim() || "";
  const registrationInfo = profile?.registration_info?.trim() || "";
  const introduction = profile?.public_introduction?.trim() || "";
  const useSampleSessions =
    (sessionResult.data ?? []).length === 0 &&
    process.env.NODE_ENV !== "production";
  const sessions = useSampleSessions
    ? getSamplePublicClinic({
        isDemo: false,
        isConfigured: true,
        includeSampleSessions: true,
      }).sessions
    : [...actualSessions, ...additionalDoctorSessions];

  return {
    isDemo: false,
    isConfigured: true,
    isSampleProfile: !profile || !profile.doctor_name?.trim(),
    isSampleAvailability: useSampleSessions,
    isSampleLocations: configuredLocations.length === 0,
    isSamplePhone,
    isSampleWhatsApp,
    clinicName: profile?.clinic_name?.trim() || SAMPLE_PUBLIC_CONTENT.clinicName,
    doctorName,
    qualification,
    speciality,
    registrationInfo,
    introduction,
    doctorPhotoUrl: profile?.doctor_photo_url?.trim() || getInitialOwnerPhotoUrl(),
    phone: profile?.public_phone?.trim() || SAMPLE_PUBLIC_CONTENT.publicPhone,
    whatsapp: profile?.public_whatsapp?.trim() || SAMPLE_PUBLIC_CONTENT.publicWhatsApp,
    locations,
    sessions,
    additionalDoctors,
  };
}
