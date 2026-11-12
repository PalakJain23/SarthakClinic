import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSamplePublicClinic, SAMPLE_PUBLIC_CONTENT } from "@/lib/sample-public-content";

export type SessionStatus = "open" | "closed" | "full";

export type PublicSession = {
  id: string;
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
  clinicName: string;
  doctorName: string;
  qualification: string;
  speciality: string;
  introduction: string;
  doctorPhotoUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  locations: PublicLocation[];
  services: string[];
  sessions: PublicSession[];
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
    return getSamplePublicClinic({
      isDemo: true,
      isConfigured: false,
      includeSampleSessions: true,
    });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return getSamplePublicClinic({
      isDemo: false,
      isConfigured: false,
      includeSampleSessions: process.env.NODE_ENV !== "production",
    });
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [profileResult, locationResult, serviceResult, sessionResult] =
    await Promise.all([
      supabase.from("public_clinic_profile").select("*").maybeSingle(),
      supabase.from("public_clinic_locations").select("*").order("sort_order"),
      supabase.from("public_clinic_services").select("name").order("sort_order"),
      supabase
        .from("public_availability")
        .select("*")
        .gte("session_date", dateInIndia())
        .lte("session_date", dateInIndia(30))
        .order("session_date")
        .order("starts_at"),
    ]);

  for (const result of [
    profileResult,
    locationResult,
    serviceResult,
    sessionResult,
  ]) {
    if (result.error) {
      throw new Error(`Could not load clinic information: ${result.error.message}`);
    }
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
  const doctorName = profile?.doctor_name?.trim() || SAMPLE_PUBLIC_CONTENT.doctorName;
  const qualification = profile?.qualification?.trim() || SAMPLE_PUBLIC_CONTENT.qualification;
  const speciality = profile?.speciality?.trim() || SAMPLE_PUBLIC_CONTENT.speciality;
  const introduction = profile?.public_introduction?.trim() || SAMPLE_PUBLIC_CONTENT.introduction;
  const useSampleSessions =
    (sessionResult.data ?? []).length === 0 &&
    process.env.NODE_ENV !== "production";
  const sessions = useSampleSessions
    ? getSamplePublicClinic({
        isDemo: false,
        isConfigured: true,
        includeSampleSessions: true,
      }).sessions
    : actualSessions;

  return {
    isDemo: false,
    isConfigured: true,
    isSampleProfile: !profile || !profile.doctor_name?.trim() ||
      !profile.qualification?.trim() || !profile.speciality?.trim() ||
      !profile.public_introduction?.trim(),
    isSampleAvailability: useSampleSessions,
    clinicName: profile?.clinic_name?.trim() || SAMPLE_PUBLIC_CONTENT.clinicName,
    doctorName,
    qualification,
    speciality,
    introduction,
    doctorPhotoUrl: profile?.doctor_photo_url ?? null,
    phone: profile?.public_phone ?? SAMPLE_PUBLIC_CONTENT.publicPhone,
    whatsapp: profile?.public_whatsapp ?? SAMPLE_PUBLIC_CONTENT.publicWhatsApp,
    locations,
    services: (serviceResult.data ?? []).length
      ? (serviceResult.data ?? []).map((service) => service.name)
      : [...SAMPLE_PUBLIC_CONTENT.services],
    sessions,
  };
}
