import type { PublicClinicData, PublicLocation, PublicSession } from "@/lib/clinic-data";

export const SAMPLE_PUBLIC_CONTENT = {
  clinicName: "Sarthak Clinic",
  doctorName: "Dr. Subhal Singh Thakur",
  qualification: "MBBS — sample qualification",
  speciality: "General Physician",
  introduction:
    "General consultations for everyday health concerns, with clear explanations and a simple appointment process.",
  publicPhone: "+919229681235",
  publicPhoneDisplay: "+91 92296 81235",
  publicWhatsApp: "+919229681235",
  location: {
    id: "sample-ashta",
    name: "Ashta, Madhya Pradesh",
    address: "Ashta, Madhya Pradesh",
    directionsUrl: null,
  },
  services: [
    "General consultation",
    "Fever, cough and cold consultation",
    "Routine health check-ups",
    "Follow-up visits",
  ],
  sessions: [
    {
      id: "village-consultation",
      locationId: "sample-village",
      locationName: "Village consultation",
      address: "Ashta, Madhya Pradesh",
      startsAt: "10:00",
      endsAt: "13:00",
    },
    {
      id: "sarthak-clinic-ashta",
      locationId: "sample-ashta",
      locationName: "Sarthak Clinic, Ashta",
      address: "Ashta, Madhya Pradesh",
      startsAt: "19:00",
      endsAt: "22:00",
    },
  ],
} as const;

function indiaDate(offsetDays = 0) {
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

export function getSamplePublicClinic({
  isDemo,
  isConfigured,
  includeSampleSessions,
}: {
  isDemo: boolean;
  isConfigured: boolean;
  includeSampleSessions: boolean;
}): PublicClinicData {
  const locations: PublicLocation[] = [
    SAMPLE_PUBLIC_CONTENT.location,
    {
      id: "sample-village",
      name: "Village consultation",
      address: "Ashta, Madhya Pradesh",
      directionsUrl: null,
    },
  ];
  const sessions: PublicSession[] = includeSampleSessions
    ? Array.from({ length: 7 }, (_, offset) =>
        SAMPLE_PUBLIC_CONTENT.sessions.map((sample, index) => ({
          ...sample,
          id: `sample-${indiaDate(offset)}-${index}`,
          date: indiaDate(offset),
          status: "closed" as const,
          note: null,
          isSample: true,
        })),
      ).flat()
    : [];

  return {
    isDemo,
    isConfigured,
    isSampleProfile: true,
    isSampleAvailability: includeSampleSessions,
    clinicName: SAMPLE_PUBLIC_CONTENT.clinicName,
    doctorName: SAMPLE_PUBLIC_CONTENT.doctorName,
    qualification: SAMPLE_PUBLIC_CONTENT.qualification,
    speciality: SAMPLE_PUBLIC_CONTENT.speciality,
    introduction: SAMPLE_PUBLIC_CONTENT.introduction,
    doctorPhotoUrl: null,
    phone: SAMPLE_PUBLIC_CONTENT.publicPhone,
    whatsapp: SAMPLE_PUBLIC_CONTENT.publicWhatsApp,
    locations,
    services: [...SAMPLE_PUBLIC_CONTENT.services],
    sessions,
  };
}
