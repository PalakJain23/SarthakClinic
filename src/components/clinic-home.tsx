"use client";

import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartPulse,
  MapPin,
  MessageCircle,
  Menu,
  Phone,
  Search,
  ShieldCheck,
  X,
  UsersRound,
  UserRound,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { PublicClinicData, PublicSession } from "@/lib/clinic-data";
import { normalizeIndianMobile } from "@/lib/booking-schema";

type Language = "hi" | "en";

type PublishedDoctor = {
  id: string;
  fullName: string;
  specialty: string;
  doctorType: "regular" | "visiting";
  qualification?: string | null;
  visitingDays?: string | null;
  visitingHours?: string | null;
  photoUrl?: string | null;
  profileHref?: string | null;
};

const copy = {
  hi: {
    home: "होम",
    doctors: "क्लिनिक संचालक",
    availability: "उपलब्धता",
    contact: "संपर्क",
    about: "हमारे बारे में",
    heroEyebrow: "स्वास्थ्य क्लिनिक",
    heroTitle: "गुणवत्तापूर्ण स्वास्थ्य सेवा, आपके घर के पास",
    heroDescription:
      "सार्थक क्लिनिक में सही डॉक्टर खोजें, उपलब्ध क्लिनिक सत्र देखें और अपॉइंटमेंट का अनुरोध करें।",
    viewDoctors: "संचालक की प्रोफ़ाइल",
    featureDoctorsTitle: "संचालक प्रोफ़ाइल",
    featureDoctorsDescription: "क्लिनिक संचालक की जानकारी देखें।",
    featureSchedulesTitle: "क्लिनिक सत्र",
    featureSchedulesDescription: "सूचीबद्ध समय देखें।",
    featureAppointmentsTitle: "अपॉइंटमेंट अनुरोध",
    featureAppointmentsDescription: "अनुरोध भेजें; पुष्टि आवश्यक।",
    featureContactTitle: "संपर्क जानकारी",
    featureContactDescription: "क्लिनिक से संपर्क करें।",
    heroImageDescription: "सार्थक क्लिनिक का स्वागत कक्ष और मरीजों के बैठने की जगह।",
    openNavigation: "नेविगेशन खोलें",
    closeNavigation: "नेविगेशन बंद करें",
    profileInfoUnavailable: "क्लिनिक संचालक की सार्वजनिक प्रोफ़ाइल जानकारी अभी उपलब्ध नहीं है।",
    book: "मुलाक़ात का अनुरोध करें",
    bookAppointment: "अपॉइंटमेंट बुक करें",
    call: "कॉल करें",
    whatsapp: "WhatsApp",
    contactComingSoon: "संपर्क जानकारी जल्द उपलब्ध होगी",
    today: "आज की उपलब्धता",
    findDoctorTitle: "क्लिनिक संचालक",
    findDoctorSubtitle: "सार्थक क्लिनिक के संचालक की सार्वजनिक प्रोफ़ाइल।",
    viewAllDoctors: "प्रोफ़ाइल देखें",
    regularDoctor: "नियमित डॉक्टर",
    visitingSpecialist: "विज़िटिंग विशेषज्ञ",
    doctorPortrait: "डॉक्टर का चित्र",
    visitingDays: "आने के दिन",
    visitingHours: "समय",
    viewProfile: "प्रोफ़ाइल देखें",
    noSchedule: "उपलब्ध समय देखने के लिए कृपया फिर से जाँचें।",
    open: "बुकिंग अनुरोध खुले हैं",
    closed: "बुकिंग बंद है",
    full: "सभी स्थान भर चुके हैं",
    sampleTiming: "नमूना समय · केवल पूर्वावलोकन",
    samplePreview: "ये नमूना समय केवल पूर्वावलोकन के लिए हैं। अभी बुकिंग उपलब्ध नहीं है।",
    sampleVillage: "ग्राम परामर्श",
    sampleClinic: "सार्थक क्लिनिक, आष्टा",
    todayDate: "भारत के समय अनुसार आज",
    details: "संचालक का परिचय",
    clinicOwner: "क्लिनिक संचालक",
    verifiedQualifications: "सत्यापित योग्यताएँ",
    verifiedDesignation: "सत्यापित पेशेवर पदनाम",
    registrationInfo: "पंजीकरण जानकारी",
    bookingGuideTitle: "अपॉइंटमेंट कैसे लें",
    bookingStepOneTitle: "क्लिनिक सत्र देखें",
    bookingStepOneDescription:
      "उपलब्ध समय और स्थान देखें। अभी डॉक्टर चुनने की सुविधा उपलब्ध नहीं है।",
    bookingStepTwoTitle: "अपॉइंटमेंट अनुरोध भेजें",
    bookingStepTwoDescription:
      "पसंदीदा तारीख़ और उपलब्ध सत्र चुनकर अनुरोध भेजें।",
    bookingStepThreeTitle: "पुष्टि प्राप्त करें",
    bookingStepThreeDescription:
      "क्लिनिक आपके अनुरोध की समीक्षा करेगा। पुष्टि मिलने तक अपॉइंटमेंट पक्का नहीं है।",
    bookingGuideAction: "अपॉइंटमेंट अनुरोध करें",
    locations: "क्लिनिक की जानकारी",
    clinicInfoDescription: "पते और क्लिनिक सत्रों की जानकारी देखें।",
    sessionInformation: "क्लिनिक सत्र",
    sessionInformationDescription: "उपलब्ध तारीख़, समय और स्थान देखें।",
    clinicAddress: "क्लिनिक का पता",
    locationUnavailable: "क्लिनिक का सत्यापित पता अभी प्रकाशित नहीं है।",
    mapPanelTitle: "क्लिनिक का स्थान",
    directionsUnavailable: "इस स्थान के लिए दिशा लिंक अभी उपलब्ध नहीं है।",
    quickLinks: "त्वरित लिंक",
    getInTouch: "संपर्क करें",
    footerIntro: "क्लिनिक की जानकारी और अपॉइंटमेंट अनुरोध एक ही जगह पर।",
    footerLocationUnavailable: "सत्यापित स्थान उपलब्ध नहीं है।",
    footerContactUnavailable: "सत्यापित संपर्क जानकारी उपलब्ध नहीं है।",
    footerPrivacyNote:
      "अपॉइंटमेंट अनुरोध के लिए दी गई जानकारी केवल अनुरोध संभालने हेतु उपयोग होती है।",
    directions: "रास्ता देखें",
    privacy: "गोपनीयता सूचना",
    login: "डॉक्टर लॉगिन",
    optionalNote: "डॉक्टर का नोट",
    bookingTitle: "मुलाक़ात का अनुरोध",
    bookingDate: "तारीख़ चुनें",
    bookingSession: "समय और स्थान चुनें",
    selectSession: "सत्र चुनें",
    name: "मरीज़ का नाम",
    mobile: "मोबाइल नंबर",
    preferredTime: "पसंदीदा समय (वैकल्पिक)",
    preferredTimeHelp: "यह समय की पसंद है, पक्का अपॉइंटमेंट समय नहीं।",
    age: "उम्र (वैकल्पिक)",
    reason: "आने का संक्षिप्त कारण (वैकल्पिक)",
    privacyAck:
      "मैं समझता/समझती हूँ कि मेरी जानकारी केवल इस अनुरोध को संभालने के लिए उपयोग होगी।",
    privacyLink: "गोपनीयता सूचना",
    submit: "अनुरोध भेजें",
    sending: "भेजा जा रहा है…",
    pending: "डॉक्टर की पुष्टि बाकी",
    bookingSuccess:
      "आपका अनुरोध दर्ज हुआ है। डॉक्टर से पुष्टि होने तक यह अपॉइंटमेंट पक्का नहीं है।",
    reference: "अनुरोध संदर्भ",
    noSessions: "इस तारीख़ के लिए कोई उपलब्ध सत्र नहीं है।",
    requestError: "अनुरोध भेजा नहीं जा सका। कृपया फिर कोशिश करें।",
    formError: "कृपया सभी आवश्यक जानकारी सही भरें।",
    mobileError: "कृपया सही 10 अंकों का भारतीय मोबाइल नंबर दें।",
    required: "आवश्यक",
    close: "बंद करें",
    notGuaranteed: "बुकिंग अनुरोध है — डॉक्टर की पुष्टि आवश्यक है।",
    clinicName: "सार्थक क्लिनिक",
  },
  en: {
    home: "Home",
    doctors: "Clinic Owner",
    availability: "Availability",
    contact: "Contact",
    about: "About",
    heroEyebrow: "Healthcare Clinic",
    heroTitle: "Quality Healthcare, Close to Home",
    heroDescription:
      "Find the right doctor, explore available clinic sessions, and request an appointment at Sarthak Clinic.",
    viewDoctors: "Meet the clinic owner",
    featureDoctorsTitle: "Owner Profile",
    featureDoctorsDescription: "View the clinic owner’s profile.",
    featureSchedulesTitle: "Clinic Sessions",
    featureSchedulesDescription: "See listed visiting times.",
    featureAppointmentsTitle: "Appointment Request",
    featureAppointmentsDescription: "Send a visit request.",
    featureContactTitle: "Contact Details",
    featureContactDescription: "View available contact options.",
    heroImageDescription: "Sarthak Clinic reception with the clinic sign and patient waiting area.",
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation",
    profileInfoUnavailable: "The clinic owner’s public profile has not been added yet.",
    book: "Request a Visit",
    bookAppointment: "Book Appointment",
    call: "Call",
    whatsapp: "WhatsApp",
    contactComingSoon: "Contact details coming soon",
    today: "Today’s availability",
    findDoctorTitle: "Clinic Owner",
    findDoctorSubtitle: "The public profile of the Sarthak Clinic owner.",
    viewAllDoctors: "View Profile",
    regularDoctor: "Regular Doctor",
    visitingSpecialist: "Visiting Specialist",
    doctorPortrait: "Portrait of",
    visitingDays: "Visiting days",
    visitingHours: "Visiting hours",
    viewProfile: "View Profile",
    noSchedule: "Please check back for available timings.",
    open: "Booking requests open",
    closed: "Bookings closed",
    full: "Session full",
    sampleTiming: "Sample timing · preview only",
    samplePreview: "These sample timings are for preview only. Booking is not available yet.",
    sampleVillage: "Village consultation",
    sampleClinic: "Sarthak Clinic, Ashta",
    todayDate: "Today in India",
    details: "About the clinic owner",
    clinicOwner: "Clinic Owner",
    verifiedQualifications: "Verified qualifications",
    verifiedDesignation: "Verified professional designation",
    registrationInfo: "Registration information",
    bookingGuideTitle: "How to Book an Appointment",
    bookingStepOneTitle: "Explore Clinic Sessions",
    bookingStepOneDescription:
      "Review available times and locations. Doctor selection is not available yet.",
    bookingStepTwoTitle: "Request an Appointment",
    bookingStepTwoDescription:
      "Choose a preferred date and available session, then send your request.",
    bookingStepThreeTitle: "Get Confirmation",
    bookingStepThreeDescription:
      "The clinic will review your request. It is not confirmed until you receive confirmation.",
    bookingGuideAction: "Request Appointment",
    locations: "Clinic Information",
    clinicInfoDescription: "Find clinic locations and session information.",
    sessionInformation: "Clinic sessions",
    sessionInformationDescription: "Review available dates, times, and locations.",
    clinicAddress: "Clinic address",
    locationUnavailable: "A verified clinic address has not been published yet.",
    mapPanelTitle: "Clinic location",
    directionsUnavailable: "Directions are not available for this location yet.",
    quickLinks: "Quick Links",
    getInTouch: "Get in Touch",
    footerIntro: "Clinic information and appointment requests in one place.",
    footerLocationUnavailable: "No verified location is available.",
    footerContactUnavailable: "No verified contact details are available.",
    footerPrivacyNote:
      "Information provided for an appointment request is used only to handle that request.",
    directions: "Get Directions",
    privacy: "Privacy notice",
    login: "Doctor login",
    optionalNote: "Doctor’s note",
    bookingTitle: "Request a visit",
    bookingDate: "Choose a date",
    bookingSession: "Choose a session and location",
    selectSession: "Select a session",
    name: "Patient name",
    mobile: "Mobile number",
    preferredTime: "Preferred time (optional)",
    preferredTimeHelp: "This is a preference, not a confirmed appointment time.",
    age: "Age (optional)",
    reason: "Short reason for visit (optional)",
    privacyAck:
      "I understand my information will only be used to handle this request.",
    privacyLink: "privacy notice",
    submit: "Send request",
    sending: "Sending…",
    pending: "Pending doctor confirmation",
    bookingSuccess:
      "Your request was recorded. It is not a confirmed appointment until the doctor confirms it.",
    reference: "Request reference",
    noSessions: "There are no available sessions for this date.",
    requestError: "Could not send your request. Please try again.",
    formError: "Please enter valid information in all required fields.",
    mobileError: "Enter a valid 10-digit Indian mobile number.",
    required: "Required",
    close: "Close",
    notGuaranteed: "Visit request only — doctor confirmation is required.",
    clinicName: "Sarthak Clinic",
  },
} as const;

// Doctor Management is local-only, so only a verified public source should populate this list.
const publishedDoctors: PublishedDoctor[] = [];

function PublicDoctorCard({
  doctor,
  language,
}: {
  doctor: PublishedDoctor;
  language: Language;
}) {
  const t = copy[language];
  const typeLabel =
    doctor.doctorType === "regular" ? t.regularDoctor : t.visitingSpecialist;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-emerald-700">
          {doctor.photoUrl ? (
            <Image
              src={doctor.photoUrl}
              alt={`${t.doctorPortrait}: ${doctor.fullName}`}
              fill
              sizes="56px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <UserRound size={25} aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span
            className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-semibold ${
              doctor.doctorType === "regular"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-teal-50 text-teal-800"
            }`}
          >
            {typeLabel}
          </span>
          <h3 className="mt-2 break-words text-base font-bold leading-6 text-emerald-950">
            {doctor.fullName}
          </h3>
          <p className="mt-0.5 text-sm text-slate-600">{doctor.specialty}</p>
          {doctor.qualification && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {doctor.qualification}
            </p>
          )}
        </div>
      </div>

      {(doctor.visitingDays || doctor.visitingHours) && (
        <div className="mt-4 space-y-2 border-t border-emerald-50 pt-3 text-sm text-slate-700">
          {doctor.visitingDays && (
            <p className="flex items-start gap-2">
              <CalendarDays
                className="mt-0.5 shrink-0 text-emerald-700"
                size={16}
                aria-hidden="true"
              />
              <span>
                <span className="font-semibold">{t.visitingDays}: </span>
                {doctor.visitingDays}
              </span>
            </p>
          )}
          {doctor.visitingHours && (
            <p className="flex items-start gap-2">
              <Clock3
                className="mt-0.5 shrink-0 text-emerald-700"
                size={16}
                aria-hidden="true"
              />
              <span>
                <span className="font-semibold">{t.visitingHours}: </span>
                {doctor.visitingHours}
              </span>
            </p>
          )}
        </div>
      )}

      {doctor.profileHref && (
        <a
          href={doctor.profileHref}
          className="mt-auto inline-flex min-h-10 items-center gap-1 pt-4 text-sm font-semibold text-emerald-800 hover:text-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          {t.viewProfile}
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      )}
    </article>
  );
}

function locationText(value: string, language: Language) {
  if (language === "en") return value;
  if (value === "Ashta, Madhya Pradesh") return "आष्टा, मध्य प्रदेश";
  if (value === "Village consultation") return "ग्राम परामर्श";
  if (value === "Sarthak Clinic, Ashta") return "सार्थक क्लिनिक, आष्टा";
  return value;
}

function todayIndia() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]));
  return `${values.year}-${String(values.month).padStart(2, "0")}-${String(values.day).padStart(2, "0")}`;
}

function dateLabel(date: string, language: Language) {
  return new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00+05:30`));
}

function timeLabel(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(Date.UTC(2020, 0, 1, hours - 5, minutes - 30)));
}

function normalizedPhone(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!/^(91)?[6-9]\d{9}$/.test(digits)) return null;
  return digits.length === 10 ? `91${digits}` : digits;
}

function safePhone(value: string | null, whatsapp = false) {
  const normalized = normalizedPhone(value);
  if (!normalized) return null;
  return whatsapp
    ? `https://wa.me/${normalized}`
    : `tel:+${normalized}`;
}

function safeDirectionsUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const isGoogleMapsUrl =
      url.hostname === "maps.app.goo.gl" ||
      url.hostname === "maps.google.com" ||
      (url.hostname === "www.google.com" &&
        (url.pathname === "/maps" || url.pathname.startsWith("/maps/")));
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !isGoogleMapsUrl
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function phoneDisplay(value: string | null) {
  const normalized = normalizedPhone(value);
  if (!normalized) return null;
  const digits = normalized.slice(-10);
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function ClinicHome({ clinic }: { clinic: PublicClinicData }) {
  const [language, setLanguage] = useState<Language>("hi");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [formState, setFormState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [bookingReference, setBookingReference] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const idempotencyRef = useRef({ fingerprint: "", key: "" });
  const router = useRouter();
  const t = copy[language];
  const verifiedLocations = clinic.isSampleLocations ? [] : clinic.locations;
  const verifiedPhone = clinic.isSamplePhone ? null : clinic.phone;
  const verifiedWhatsApp = clinic.isSampleWhatsApp ? null : clinic.whatsapp;
  const clinicInfoPhoneHref = safePhone(verifiedPhone);
  const clinicInfoWhatsAppHref = safePhone(verifiedWhatsApp, true);
  const clinicInfoPhoneDisplay = phoneDisplay(verifiedPhone);
  const today = todayIndia();
  const todaySessions = clinic.sessions.filter((session) => session.date === today);
  const dates = useMemo(
    () => [...new Set(clinic.sessions.map((session) => session.date))].sort(),
    [clinic.sessions],
  );
  const sessionsOnSelectedDate = clinic.sessions.filter(
    (session) =>
      session.date === selectedDate &&
      session.status === "open" &&
      session.date >= today,
  );
  const chosenSession = clinic.sessions.find((session) => session.id === selectedSession);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleMenuKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleMenuKeyDown);
    return () => window.removeEventListener("keydown", handleMenuKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    if (!bookingOpen) {
      triggerRef.current?.focus();
      return;
    }
    const firstField = dialogRef.current?.querySelector<HTMLElement>(
      "input, select, button",
    );
    firstField?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setBookingOpen(false);
      if (event.key === "Tab") {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
          ) ?? [],
        );
        if (focusable.length === 0) return;
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
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bookingOpen]);

  function openBooking() {
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setFormState("idle");
    setFormMessage("");
    setBookingReference("");
    idempotencyRef.current = { fingerprint: "", key: "" };
    const firstOpen = clinic.sessions.find(
      (session) => session.status === "open" && session.date >= today,
    );
    setSelectedDate(firstOpen?.date ?? dates[0] ?? "");
    setSelectedSession(firstOpen?.id ?? "");
    setBookingOpen(true);
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("sending");
    setFormMessage("");
    const formData = new FormData(event.currentTarget);
    let mobile: string;
    try {
      mobile = normalizeIndianMobile(String(formData.get("mobile") ?? ""));
    } catch {
      setFormState("error");
      setFormMessage(t.mobileError);
      return;
    }

    const selected = clinic.sessions.find(
      (session) => session.id === selectedSession,
    );
    if (
      !selected ||
      selected.date !== selectedDate ||
      selected.isSample ||
      clinic.isDemo ||
      clinic.isSampleAvailability
    ) {
      setFormState("error");
      setFormMessage(clinic.isDemo || selected?.isSample || clinic.isSampleAvailability ? t.samplePreview : t.formError);
      return;
    }
    const payload = {
      patientName: formData.get("patientName"),
      mobile,
      sessionId: selected.id,
      preferredTime: formData.get("preferredTime") || "",
      age: formData.get("age") || "",
      reason: formData.get("reason") || "",
      privacyAcknowledged: formData.get("privacyAcknowledged") === "on",
    };
    const fingerprint = JSON.stringify(payload);
    const idempotencyKey =
      idempotencyRef.current.fingerprint === fingerprint && idempotencyRef.current.key
        ? idempotencyRef.current.key
        : crypto.randomUUID();
    idempotencyRef.current = { fingerprint, key: idempotencyKey };
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...payload,
          idempotencyKey,
        }),
      });
      const result = (await response.json()) as {
        bookingReference?: string;
        error?: string;
      };
      if (!response.ok || !result.bookingReference) {
        setFormState("error");
        setFormMessage(
          result.error === "invalid_mobile" ? t.mobileError : t.requestError,
        );
        return;
      }
      setBookingReference(result.bookingReference);
      setFormState("success");
    } catch {
      setFormState("error");
      setFormMessage(t.requestError);
    }
  }

  const navigationItems = [
    { href: "#home", label: t.home },
    { href: "#doctors", label: t.doctors },
    { href: "#about", label: t.about },
    { href: "#contact", label: t.contact },
  ];

  return (
    <main className="min-h-screen pb-24 md:pb-0">
      <header id="home" className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/95 shadow-sm backdrop-blur">
        <div className="home-container flex flex-wrap items-center justify-between gap-2 py-2 sm:gap-4 lg:flex-nowrap">
          <a href="#home" className="flex shrink-0 items-center gap-2" aria-label={clinic.clinicName || t.clinicName}>
            <span className="flex items-center justify-center text-emerald-700">
              <HeartPulse aria-hidden="true" size={26} />
            </span>
            <span className="text-sm font-bold tracking-tight text-slate-950 sm:text-base">{clinic.clinicName || t.clinicName}</span>
          </a>
          <nav aria-label={language === "hi" ? "मुख्य नेविगेशन" : "Main navigation"} className="hidden items-center gap-3 whitespace-nowrap text-sm font-semibold lg:flex xl:gap-5">
            {navigationItems.map((item) => (
              <a
                key={item.href}
                aria-current={item.href === "#home" ? "page" : undefined}
                className={`rounded-sm border-b-2 px-1 py-2 transition-colors hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 ${
                  item.href === "#home"
                    ? "border-emerald-700 text-emerald-800"
                    : "border-transparent text-slate-700"
                }`}
                href={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div
              aria-label={language === "hi" ? "भाषा चुनें" : "Choose language"}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5"
            >
              <button
                type="button"
                onClick={() => setLanguage("en")}
                aria-pressed={language === "en"}
                className={`min-h-8 rounded-md px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                  language === "en"
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-slate-600 hover:text-emerald-800"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage("hi")}
                aria-pressed={language === "hi"}
                className={`min-h-8 rounded-md px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                  language === "hi"
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-slate-600 hover:text-emerald-800"
                }`}
              >
                हिन्दी
              </button>
            </div>
            <button
              type="button"
              onClick={openBooking}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:px-4"
            >
              <CalendarDays size={17} aria-hidden="true" />
              <span className="hidden sm:inline">{t.bookAppointment}</span>
              <span className="sr-only sm:hidden">{t.bookAppointment}</span>
            </button>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? t.closeNavigation : t.openNavigation}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-primary-navigation"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-[var(--border)] text-slate-700 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 lg:hidden"
            >
              {mobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
          <nav
            id="mobile-primary-navigation"
            aria-label={language === "hi" ? "मुख्य नेविगेशन" : "Main navigation"}
            className={`${mobileMenuOpen ? "flex" : "hidden"} order-3 w-full flex-col gap-1 border-t border-emerald-100 pt-2 text-sm font-semibold text-slate-700 lg:hidden`}
          >
            {navigationItems.map((item) => (
              <a
                key={item.href}
                className="flex min-h-11 items-center rounded-lg px-3 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="home-container">
        <div className="mt-4 overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-white shadow-sm sm:mt-5">
          <section
            aria-labelledby="clinic-hero-title"
            className="grid min-w-0 lg:grid-cols-[1.05fr_0.95fr]"
          >
            <div className="clinic-hero-copy order-1 min-w-0 px-5 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-8">
              <p className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
                <HeartPulse size={16} aria-hidden="true" /> {t.heroEyebrow}
              </p>
              <h1 id="clinic-hero-title" className="max-w-lg break-words text-3xl font-bold leading-[1.16] tracking-tight text-emerald-950 sm:text-4xl lg:text-[2.5rem]">
                {t.heroTitle}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 lg:text-lg">
                {t.heroDescription}
              </p>
              <div className="mt-6 flex flex-wrap gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={openBooking}
                  className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:px-5"
                >
                  {t.bookAppointment}
                </button>
                <a href="#doctors" className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:px-5">
                  {t.viewDoctors}
                </a>
              </div>
            </div>
            <div className="relative order-2 min-h-[230px] min-w-0 overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50 sm:min-h-[280px] lg:min-h-[340px]">
              <Image
                src="/images/clinic-hero.webp"
                alt={t.heroImageDescription}
                fill
                priority
                sizes="(min-width: 1024px) 570px, 100vw"
                className="absolute inset-0 size-full object-cover lg:[clip-path:ellipse(100%_125%_at_right_center)]"
              />
            </div>
          </section>
          <div aria-hidden="true" className="h-px bg-emerald-100" />

          <section aria-label={language === "hi" ? "क्लिनिक की जानकारी" : "Clinic information"} className="grid grid-cols-2 [&>div:nth-child(odd)]:border-r [&>div:nth-child(odd)]:border-[var(--border)] lg:grid-cols-4 lg:divide-x lg:divide-[var(--border)] lg:[&>div:nth-child(odd)]:border-r-0">
            <div className="flex min-w-0 items-center gap-2.5 px-3 py-3 text-slate-700 sm:gap-3 sm:px-5 sm:py-4">
              <UsersRound className="shrink-0 text-emerald-700" size={20} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[0.8125rem] font-bold leading-5 text-emerald-950 sm:text-sm">{t.featureDoctorsTitle}</span>
                <span className="mt-0.5 block text-xs leading-4 text-slate-600">{t.featureDoctorsDescription}</span>
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2.5 px-3 py-3 text-slate-700 sm:gap-3 sm:px-5 sm:py-4">
              <CalendarDays className="shrink-0 text-emerald-700" size={20} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[0.8125rem] font-bold leading-5 text-emerald-950 sm:text-sm">{t.featureSchedulesTitle}</span>
                <span className="mt-0.5 block text-xs leading-4 text-slate-600">{t.featureSchedulesDescription}</span>
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2.5 px-3 py-3 text-slate-700 sm:gap-3 sm:px-5 sm:py-4">
              <CheckCircle2 className="shrink-0 text-emerald-700" size={20} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[0.8125rem] font-bold leading-5 text-emerald-950 sm:text-sm">{t.featureAppointmentsTitle}</span>
                <span className="mt-0.5 block text-xs leading-4 text-slate-600">{t.featureAppointmentsDescription}</span>
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2.5 px-3 py-3 text-slate-700 sm:gap-3 sm:px-5 sm:py-4">
              <Phone className="shrink-0 text-emerald-700" size={20} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[0.8125rem] font-bold leading-5 text-emerald-950 sm:text-sm">{t.featureContactTitle}</span>
                <span className="mt-0.5 block text-xs leading-4 text-slate-600">{t.featureContactDescription}</span>
              </span>
            </div>
          </section>
        </div>
      </div>

      <div className="home-container">
        <section
          id="doctors"
          aria-labelledby="find-doctor-heading"
          className="scroll-mt-24 py-6 sm:py-7"
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="find-doctor-heading"
                className="text-xl font-bold text-emerald-950 sm:text-2xl"
              >
                {t.findDoctorTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {t.findDoctorSubtitle}
              </p>
            </div>
            <a
              href="#doctor-directory"
              className="inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              {t.viewAllDoctors}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <article id="doctor-directory" className="rounded-xl border border-emerald-100 bg-white p-4 sm:p-5">
              <div className="flex items-start gap-4">
                <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-emerald-700">
                  {clinic.doctorPhotoUrl ? (
                    <Image
                      src={clinic.doctorPhotoUrl}
                      alt={`${t.clinicOwner}: ${clinic.doctorName}`}
                      fill
                      sizes="80px"
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <UserRound size={34} aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900">{t.clinicOwner}</span>
                  <h3 className="mt-2 break-words text-lg font-bold text-emerald-950">{clinic.doctorName || "Subhal Thakur"}</h3>
                  {clinic.qualification && (
                    <p className="mt-2 text-sm leading-5 text-slate-700">
                      <span className="font-semibold">{t.verifiedQualifications}: </span>{clinic.qualification}
                    </p>
                  )}
                  {clinic.speciality && (
                    <p className="mt-1 text-sm leading-5 text-slate-700">
                      <span className="font-semibold">{t.verifiedDesignation}: </span>{clinic.speciality}
                    </p>
                  )}
                  {clinic.registrationInfo && (
                    <p className="mt-1 text-sm leading-5 text-slate-700">
                      <span className="font-semibold">{t.registrationInfo}: </span>{clinic.registrationInfo}
                    </p>
                  )}
                </div>
              </div>
            </article>
            <article
              id="about"
              className="scroll-mt-24 rounded-xl border border-emerald-100 bg-white p-4 sm:p-5"
            >
              <h3 className="font-semibold text-emerald-950">{t.details}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-700">
                {clinic.isSampleProfile || !clinic.introduction ? t.profileInfoUnavailable : clinic.introduction}
              </p>
            </article>
            {publishedDoctors.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-3">
                {publishedDoctors.map((doctor) => (
                  <PublicDoctorCard key={doctor.id} doctor={doctor} language={language} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="availability" className="scroll-mt-24 py-6 sm:py-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-emerald-950 sm:text-2xl">{t.today}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {t.todayDate}: {dateLabel(today, language)}
              </p>
            </div>
          </div>
          {todaySessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-white px-4 py-3 text-sm text-slate-700">
              {t.noSchedule}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {todaySessions.map((session) => (
                <SessionCard key={session.id} session={session} language={language} />
              ))}
            </div>
          )}
          <p className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
            clinic.isSampleAvailability
              ? "bg-amber-50 text-amber-950"
              : "bg-slate-50 text-slate-700"
          }`}>
            <ShieldCheck size={17} aria-hidden="true" />
            {clinic.isSampleAvailability ? t.samplePreview : t.notGuaranteed}
          </p>
        </section>
      </div>

      <section
        id="booking-process"
        aria-labelledby="booking-process-heading"
        className="scroll-mt-24 py-3 sm:py-4"
      >
        <div className="home-container">
          <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white">
            <div className="px-4 pt-4 sm:px-6">
              <h2
                id="booking-process-heading"
                className="text-xl font-bold text-emerald-950 sm:text-2xl"
              >
                {t.bookingGuideTitle}
              </h2>
            </div>
            <ol className="grid lg:grid-cols-3 lg:divide-x lg:divide-emerald-100">
              <li className="flex gap-3 border-b border-emerald-100 px-4 py-4 last:border-b-0 sm:px-6 lg:border-b-0">
                <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Search size={20} strokeWidth={1.8} aria-hidden="true" />
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-emerald-700 text-[0.6875rem] font-bold text-white">
                    1
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-6 text-emerald-950">
                    {t.bookingStepOneTitle}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">
                    {t.bookingStepOneDescription}
                  </span>
                </span>
              </li>
              <li className="flex gap-3 border-b border-emerald-100 px-4 py-4 last:border-b-0 sm:px-6 lg:border-b-0">
                <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <CalendarDays size={20} strokeWidth={1.8} aria-hidden="true" />
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-emerald-700 text-[0.6875rem] font-bold text-white">
                    2
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-6 text-emerald-950">
                    {t.bookingStepTwoTitle}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">
                    {t.bookingStepTwoDescription}
                  </span>
                </span>
              </li>
              <li className="flex gap-3 px-4 py-4 sm:px-6">
                <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <CheckCircle2 size={20} strokeWidth={1.8} aria-hidden="true" />
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-emerald-700 text-[0.6875rem] font-bold text-white">
                    3
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-6 text-emerald-950">
                    {t.bookingStepThreeTitle}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">
                    {t.bookingStepThreeDescription}
                  </span>
                </span>
              </li>
            </ol>
            <div className="border-t border-emerald-100 px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={openBooking}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                {t.bookingGuideAction}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="contact"
        aria-labelledby="clinic-information-heading"
        className="scroll-mt-24 py-6 sm:py-7"
      >
        <div className="home-container">
          <div className="mb-4">
            <h2
              id="clinic-information-heading"
              className="text-xl font-bold text-emerald-950 sm:text-2xl"
            >
              {t.locations}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t.clinicInfoDescription}
            </p>
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-white p-4 sm:p-5">
              <div className="flex gap-3 border-b border-slate-100 pb-4">
                <Clock3
                  className="mt-0.5 shrink-0 text-emerald-700"
                  size={20}
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-semibold text-emerald-950">
                    {t.sessionInformation}
                  </h3>
                  <p className="mt-0.5 text-sm leading-5 text-slate-600">
                    {t.sessionInformationDescription}
                  </p>
                  <a
                    href="#availability"
                    className="mt-1 inline-flex min-h-8 items-center gap-1 text-sm font-semibold text-emerald-800 underline underline-offset-4 hover:text-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    {t.today}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="flex gap-3 border-b border-slate-100 py-4">
                <MapPin
                  className="mt-0.5 shrink-0 text-emerald-700"
                  size={20}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <h3 className="font-semibold text-emerald-950">
                    {t.clinicAddress}
                  </h3>
                  {verifiedLocations.length > 0 ? (
                    <ul className="mt-1.5 space-y-2">
                      {verifiedLocations.map((location) => (
                        <li key={location.id} className="text-sm">
                          <p className="font-medium text-slate-800">
                            {locationText(location.name, language)}
                          </p>
                          <p className="mt-0.5 leading-5 text-slate-600">
                            {locationText(location.address, language)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      {t.locationUnavailable}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Phone
                  className="mt-0.5 shrink-0 text-emerald-700"
                  size={19}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <h3 className="font-semibold text-emerald-950">{t.contact}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {clinicInfoPhoneHref && clinicInfoPhoneDisplay && (
                      <a
                        href={clinicInfoPhoneHref}
                        className="inline-flex min-h-8 items-center text-sm font-medium text-emerald-900 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                      >
                        {clinicInfoPhoneDisplay}
                      </a>
                    )}
                    {clinicInfoWhatsAppHref && (
                      <a
                        href={clinicInfoWhatsAppHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-8 items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:text-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                      >
                        <MessageCircle size={16} aria-hidden="true" />
                        {t.whatsapp}
                      </a>
                    )}
                    {!clinicInfoPhoneHref && !clinicInfoWhatsAppHref && (
                      <p className="text-sm leading-5 text-slate-600">
                        {t.footerContactUnavailable}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
              <h3 className="px-4 py-3 font-semibold text-emerald-950 sm:px-5">
                {t.mapPanelTitle}
              </h3>
              {verifiedLocations.length > 0 ? (
                <ul className="space-y-3 p-4 sm:px-5">
                  {verifiedLocations.map((location) => {
                    const directionsUrl = safeDirectionsUrl(location.directionsUrl);
                    return (
                      <li
                        key={location.id}
                        className="flex flex-col gap-3 rounded-lg bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <MapPin
                            className="mt-0.5 shrink-0 text-emerald-700"
                            size={19}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-emerald-950">
                              {locationText(location.name, language)}
                            </p>
                            <p className="mt-1 text-sm leading-5 text-slate-600">
                              {locationText(location.address, language)}
                            </p>
                          </div>
                        </div>
                        {directionsUrl ? (
                          <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${t.directions}: ${locationText(location.name, language)}`}
                            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:self-auto"
                          >
                            {t.directions}
                            <ArrowUpRight size={16} aria-hidden="true" />
                          </a>
                        ) : (
                          <p className="text-sm leading-5 text-slate-600 sm:text-right">
                            {t.directionsUnavailable}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                  <MapPin
                    className="text-slate-400"
                    size={28}
                    aria-hidden="true"
                  />
                  <p className="max-w-sm text-sm leading-6 text-slate-600">
                    {t.locationUnavailable}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer id="privacy" className="bg-emerald-950 text-emerald-50">
        <div className="home-container py-6 sm:py-7">
          <div className="grid grid-cols-2 items-start gap-x-5 gap-y-6 lg:grid-cols-3 lg:gap-8">
            <section aria-labelledby="footer-brand-heading" className="col-span-2 lg:col-span-1 lg:pr-7">
              <a
                href="#home"
                className="inline-flex min-h-10 items-center gap-2 rounded-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
              >
                <HeartPulse size={25} aria-hidden="true" />
                <span id="footer-brand-heading">
                  {clinic.clinicName || t.clinicName}
                </span>
              </a>
              <p className="mt-3 max-w-xs text-sm leading-6 text-emerald-100/80">
                {clinic.isSampleProfile || !clinic.introduction ? t.footerIntro : clinic.introduction}
              </p>
            </section>

            <section
              aria-labelledby="footer-links-heading"
              className="min-w-0"
            >
              <h2 id="footer-links-heading" className="flex min-h-10 items-center font-semibold text-white">
                {t.quickLinks}
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-emerald-100/80">
                {navigationItems.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="inline-flex min-h-7 items-center hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section
              aria-labelledby="footer-contact-heading"
              className="col-span-2 min-w-0 border-t border-emerald-50/15 pt-4 lg:col-span-1 lg:border-t-0 lg:pt-0"
            >
              <h2 id="footer-contact-heading" className="flex min-h-10 items-center font-semibold text-white">
                {t.getInTouch}
              </h2>
              {verifiedLocations[0] && (
                <p className="mt-3 flex items-start gap-2 text-sm leading-5 text-emerald-100/80">
                  <MapPin className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
                  <span>{locationText(verifiedLocations[0].address, language)}</span>
                </p>
              )}
              {clinicInfoPhoneHref && clinicInfoPhoneDisplay && (
                <a
                  href={clinicInfoPhoneHref}
                  className="mt-2 inline-flex min-h-9 items-center gap-2 text-sm text-emerald-100/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
                >
                  <Phone size={15} aria-hidden="true" />
                  {clinicInfoPhoneDisplay}
                </a>
              )}
              {!verifiedLocations[0] && !clinicInfoPhoneHref && !clinicInfoWhatsAppHref && (
                <p className="mt-3 text-sm leading-5 text-emerald-100/70">
                  {t.footerContactUnavailable}
                </p>
              )}
              {clinicInfoWhatsAppHref && (
                <a
                  href={clinicInfoWhatsAppHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex min-h-9 items-center gap-2 text-sm text-emerald-100/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
                >
                  <MessageCircle size={15} aria-hidden="true" />
                  {t.whatsapp}
                </a>
              )}
              <button
                type="button"
                onClick={openBooking}
                className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
              >
                {t.bookingGuideAction}
              </button>
            </section>
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-emerald-50/15 pt-4 text-xs leading-5 text-emerald-100/70 sm:flex-row sm:items-center sm:justify-between">
            <span>
              © {new Date().getFullYear()} {clinic.clinicName || t.clinicName}
            </span>
            <p className="max-w-2xl sm:text-right">{t.footerPrivacyNote}</p>
          </div>
        </div>
      </footer>

      <button
        type="button"
        onClick={openBooking}
        className="fixed inset-x-4 bottom-4 z-20 min-h-12 rounded-xl bg-[var(--primary)] px-5 font-semibold text-white shadow-lg hover:bg-[var(--primary-dark)] sm:hidden"
      >
        {t.book}
      </button>

      {bookingOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setBookingOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-heading"
            className="max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="booking-heading" className="text-xl font-bold text-slate-950">{t.bookingTitle}</h2>
                <p className="mt-1 text-sm text-slate-600">{t.notGuaranteed}</p>
              </div>
              <button
                type="button"
                className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-slate-700 hover:bg-slate-50"
                onClick={() => setBookingOpen(false)}
                aria-label={t.close}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            {formState === "success" ? (
              <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
                <CheckCircle2 size={26} aria-hidden="true" />
                <p className="mt-3 font-semibold">{t.pending}</p>
                <p className="mt-3 font-semibold">{t.bookingSuccess}</p>
                <p className="mt-3 text-sm">{t.reference}: <strong>{bookingReference}</strong></p>
                <p className="mt-1 text-sm">{dateLabel(selectedDate, language)} · {chosenSession?.locationName} · {chosenSession && `${timeLabel(chosenSession.startsAt)}–${timeLabel(chosenSession.endsAt)}`}</p>
                {chosenSession && <p className="mt-1 text-sm">{locationText(chosenSession.address, language)}</p>}
              </div>
            ) : clinic.isSampleAvailability ? (
              <p role="status" className="rounded-xl border border-teal-100 bg-teal-50 p-5 leading-7 text-teal-950">{t.samplePreview}</p>
            ) : (
              <form className="space-y-4" onSubmit={submitBooking}>
                <label className="block text-sm font-semibold text-slate-800">
                  {t.bookingDate} <Required />
                  <select
                    className="mt-1.5 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"
                    value={selectedDate}
                    onChange={(event) => {
                      setSelectedDate(event.target.value);
                      setSelectedSession("");
                    }}
                    required
                    disabled={dates.length === 0 || clinic.isDemo || clinic.isSampleAvailability}
                  >
                    {dates.length === 0 && <option value="">{t.noSessions}</option>}
                    {dates.map((date) => (
                      <option key={date} value={date}>{dateLabel(date, language)}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-800">
                  {t.bookingSession} <Required />
                  <select
                    className="mt-1.5 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"
                    value={selectedSession}
                    onChange={(event) => setSelectedSession(event.target.value)}
                    required
                    disabled={sessionsOnSelectedDate.length === 0 || clinic.isDemo || clinic.isSampleAvailability}
                  >
                    <option value="">{t.selectSession}</option>
                    {sessionsOnSelectedDate.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.locationName} · {timeLabel(session.startsAt)}–{timeLabel(session.endsAt)}
                      </option>
                    ))}
                  </select>
                  {selectedDate && sessionsOnSelectedDate.length === 0 && (
                    <span className="mt-1 block font-normal text-slate-600">{t.noSessions}</span>
                  )}
                  {chosenSession && selectedDate === chosenSession.date && (
                    <span className="mt-1 block font-normal text-slate-600">{locationText(chosenSession.address, language)}</span>
                  )}
                </label>
                <label className="block text-sm font-semibold text-slate-800">
                  {t.name} <Required />
                  <input name="patientName" autoComplete="name" required maxLength={100} className="mt-1.5 min-h-12 w-full rounded-lg border border-slate-300 px-3 font-normal" />
                </label>
                <label className="block text-sm font-semibold text-slate-800">
                  {t.mobile} <Required />
                  <input name="mobile" type="tel" inputMode="tel" autoComplete="tel" required maxLength={18} className="mt-1.5 min-h-12 w-full rounded-lg border border-slate-300 px-3 font-normal" />
                </label>
                <label className="block text-sm font-semibold text-slate-800">
                  {t.preferredTime}
                  <input name="preferredTime" type="time" className="mt-1.5 min-h-12 w-full rounded-lg border border-slate-300 px-3 font-normal" />
                  <span className="mt-1 block font-normal text-slate-500">{t.preferredTimeHelp}</span>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    {t.age}
                    <input name="age" type="number" min={1} max={120} inputMode="numeric" className="mt-1.5 min-h-12 w-full rounded-lg border border-slate-300 px-3 font-normal" />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    {t.reason}
                    <input name="reason" maxLength={300} className="mt-1.5 min-h-12 w-full rounded-lg border border-slate-300 px-3 font-normal" />
                  </label>
                </div>
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-700">
                  <input name="privacyAcknowledged" type="checkbox" required className="mt-1 size-5 shrink-0 accent-[var(--primary)]" />
                  <span>{t.privacyAck} <a href="#privacy" onClick={() => setBookingOpen(false)} className="font-semibold text-[var(--primary)] underline underline-offset-2">{t.privacyLink}</a></span> <Required />
                </label>
                {formMessage && (
                  <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{formMessage}</p>
                )}
                <button
                  type="submit"
                  disabled={formState === "sending" || clinic.isDemo || clinic.isSampleAvailability || dates.length === 0 || !selectedSession || sessionsOnSelectedDate.length === 0}
                  className="min-h-12 w-full rounded-lg bg-[var(--primary)] px-5 font-semibold text-white hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {formState === "sending" ? t.sending : t.submit}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Required() {
  return <span aria-hidden="true" className="text-red-700">*</span>;
}

function SessionCard({
  session,
  language,
}: {
  session: PublicSession;
  language: Language;
}) {
  const t = copy[language];
  const statusLabel =
    session.status === "open" ? t.open : session.status === "full" ? t.full : t.closed;
  const statusStyle =
    session.status === "open"
      ? "bg-emerald-50 text-emerald-900"
      : session.status === "full"
        ? "bg-amber-50 text-amber-900"
        : "bg-slate-100 text-slate-700";

  return (
    <article className="rounded-xl border border-[var(--border)] bg-white p-3.5 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="order-2 min-w-0 sm:order-1">
          <h3 className="text-base font-bold text-emerald-950 sm:text-lg">
            {session.isSample
              ? session.locationName === "Village consultation" ? t.sampleVillage : t.sampleClinic
              : session.locationName}
          </h3>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
            <MapPin className="mt-0.5 shrink-0 text-[var(--primary)]" size={15} aria-hidden="true" />
            {locationText(session.address, language)}
          </p>
        </div>
        <span className={`order-1 w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold leading-4 sm:order-2 ${session.isSample ? "bg-amber-50 text-amber-900" : statusStyle}`}>
          {session.isSample ? t.sampleTiming : statusLabel}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
        <p className="flex items-center gap-1.5">
          <CalendarDays size={15} className="shrink-0 text-[var(--primary)]" aria-hidden="true" />
          {dateLabel(session.date, language)}
        </p>
        <p className="flex items-center gap-1.5 font-semibold text-slate-800">
          <Clock3 size={16} className="shrink-0 text-[var(--primary)]" aria-hidden="true" />
          {timeLabel(session.startsAt)} – {timeLabel(session.endsAt)}
        </p>
      </div>
      {session.note && (
        <p className="mt-2 text-sm leading-5 text-slate-600">
          <span className="font-semibold">{t.optionalNote}: </span>{session.note}
        </p>
      )}
    </article>
  );
}
