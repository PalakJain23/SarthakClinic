"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  HeartPulse,
  MapPin,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicClinicData, PublicSession } from "@/lib/clinic-data";
import { normalizeIndianMobile } from "@/lib/booking-schema";
import { SAMPLE_PUBLIC_CONTENT } from "@/lib/sample-public-content";

type Language = "hi" | "en";

const copy = {
  hi: {
    doctor: "डॉक्टर",
    availability: "उपलब्धता",
    contact: "संपर्क",
    sampleProfile: "नमूना प्रोफ़ाइल",
    sampleQualification: "MBBS — नमूना योग्यता",
    sampleIntroduction: "रोज़मर्रा की स्वास्थ्य समस्याओं के लिए सामान्य परामर्श, स्पष्ट जानकारी और आसान अपॉइंटमेंट प्रक्रिया।",
    book: "मुलाक़ात का अनुरोध करें",
    call: "कॉल करें",
    whatsapp: "WhatsApp",
    contactComingSoon: "संपर्क जानकारी जल्द उपलब्ध होगी",
    today: "आज की उपलब्धता",
    noSchedule: "उपलब्ध समय देखने के लिए कृपया फिर से जाँचें।",
    open: "बुकिंग अनुरोध खुले हैं",
    closed: "बुकिंग बंद है",
    full: "सभी स्थान भर चुके हैं",
    sampleTiming: "नमूना समय · केवल पूर्वावलोकन",
    samplePreview: "ये नमूना समय केवल पूर्वावलोकन के लिए हैं। अभी बुकिंग उपलब्ध नहीं है।",
    sampleVillage: "ग्राम परामर्श",
    sampleClinic: "सार्थक क्लिनिक, आष्टा",
    todayDate: "भारत के समय अनुसार आज",
    details: "डॉक्टर के बारे में",
    services: "उपलब्ध सेवाएँ",
    locations: "स्थान और संपर्क",
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
    language: "English",
    clinicName: "सार्थक क्लिनिक",
  },
  en: {
    doctor: "Doctor",
    availability: "Availability",
    contact: "Contact",
    sampleProfile: "Sample profile",
    sampleQualification: "MBBS — sample qualification",
    sampleIntroduction: "General consultations for everyday health concerns, with clear explanations and a simple appointment process.",
    book: "Request a Visit",
    call: "Call",
    whatsapp: "WhatsApp",
    contactComingSoon: "Contact details coming soon",
    today: "Today’s availability",
    noSchedule: "Please check back for available timings.",
    open: "Booking requests open",
    closed: "Bookings closed",
    full: "Session full",
    sampleTiming: "Sample timing · preview only",
    samplePreview: "These sample timings are for preview only. Booking is not available yet.",
    sampleVillage: "Village consultation",
    sampleClinic: "Sarthak Clinic, Ashta",
    todayDate: "Today in India",
    details: "About the doctor",
    services: "Available services",
    locations: "Locations and contact",
    directions: "Get directions",
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
    language: "हिन्दी",
    clinicName: "Sarthak Clinic",
  },
} as const;

const hindiServices: Record<string, string> = {
  "General consultation": "सामान्य परामर्श",
  "Fever, cough and cold consultation": "बुखार, खाँसी और सर्दी का परामर्श",
  "Routine health check-ups": "नियमित स्वास्थ्य जाँच",
  "Follow-up visits": "फ़ॉलो-अप मुलाक़ात",
};

function publicText(value: string, sampleText: string, language: Language, hindiText: string) {
  return value === sampleText && language === "hi" ? hindiText : value;
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

function phoneDisplay(value: string | null) {
  const normalized = normalizedPhone(value);
  if (!normalized) return null;
  const digits = normalized.slice(-10);
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function ClinicHome({ clinic }: { clinic: PublicClinicData }) {
  const [language, setLanguage] = useState<Language>("hi");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [formState, setFormState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [bookingReference, setBookingReference] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const idempotencyRef = useRef({ fingerprint: "", key: "" });
  const router = useRouter();
  const t = copy[language];
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

  const phoneHref = safePhone(clinic.phone);
  const whatsappHref = safePhone(clinic.whatsapp, true);
  const contactPhone = phoneDisplay(clinic.phone);

  return (
    <main className="min-h-screen pb-24 md:pb-0">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
          <a href="#" className="flex items-center gap-3" aria-label={clinic.clinicName || t.clinicName}>
            <span className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-[var(--primary)]">
              <HeartPulse aria-hidden="true" size={25} />
            </span>
            <span>
              <span className="block font-bold text-slate-900">{clinic.clinicName || t.clinicName}</span>
            </span>
          </a>
          <div className="order-2 flex items-center gap-2 md:order-3">
            <button
              type="button"
              onClick={() => setLanguage(language === "hi" ? "en" : "hi")}
              className="min-h-11 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              aria-label={`Switch language to ${t.language}`}
            >
              {t.language}
            </button>
            <button
              type="button"
              onClick={openBooking}
              className="hidden min-h-11 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] sm:inline-flex"
            >
              {t.book}
            </button>
          </div>
          <nav aria-label={language === "hi" ? "मुख्य नेविगेशन" : "Main navigation"} className="order-3 flex w-full items-center gap-5 overflow-x-auto whitespace-nowrap border-t border-slate-100 pt-2 text-sm font-medium text-slate-700 md:order-2 md:w-auto md:border-0 md:pt-0">
            <a className="hover:text-[var(--primary)]" href="#doctor">{t.doctor}</a>
            <a className="hover:text-[var(--primary)]" href="#availability">{t.availability}</a>
            <a className="hover:text-[var(--primary)]" href="#about">{t.details}</a>
            <a className="hover:text-[var(--primary)]" href="#services">{t.services}</a>
            <a className="hover:text-[var(--primary)]" href="#contact">{t.contact}</a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <section
          id="doctor"
          className="grid gap-7 py-9 md:grid-cols-[1.4fr_0.8fr] md:items-center md:py-12"
        >
          <div className="order-2 md:order-1">
            <p className="mb-3 text-sm font-semibold tracking-wide text-[var(--primary)]">
              {publicText(clinic.speciality, SAMPLE_PUBLIC_CONTENT.speciality, language, "सामान्य चिकित्सक")}
            </p>
            <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
              {clinic.doctorName}
            </h1>
            {clinic.isSampleProfile && <span className="mt-2 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">{t.sampleProfile}</span>}
            <p className="mt-3 text-base font-medium text-slate-600">
              {publicText(clinic.qualification, SAMPLE_PUBLIC_CONTENT.qualification, language, t.sampleQualification)}
            </p>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-700">
              {publicText(clinic.introduction, SAMPLE_PUBLIC_CONTENT.introduction, language, t.sampleIntroduction)}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openBooking}
                className="min-h-12 rounded-lg bg-[var(--primary)] px-6 font-semibold text-white hover:bg-[var(--primary-dark)]"
              >
                {t.book}
              </button>
              {phoneHref ? (
                <a
                  href={phoneHref}
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-5 font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <Phone size={18} aria-hidden="true" /> {t.call}
                </a>
              ) : (
                <button type="button" disabled aria-disabled="true" className="inline-flex min-h-12 cursor-not-allowed items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-5 font-semibold text-slate-400">
                  <Phone size={18} aria-hidden="true" /> {t.call}
                </button>
              )}
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center rounded-lg border border-[var(--border)] bg-white px-5 font-semibold text-slate-800 hover:bg-slate-50"
                >
                  {t.whatsapp}
                </a>
              ) : (
                <button type="button" disabled aria-disabled="true" className="inline-flex min-h-12 cursor-not-allowed items-center rounded-lg border border-slate-200 bg-slate-50 px-5 font-semibold text-slate-400">
                  {t.whatsapp}
                </button>
              )}
            </div>
            {phoneHref && contactPhone && (
              <p className="mt-3 text-sm text-slate-600">
                <a href={phoneHref} className="font-medium underline underline-offset-2">{contactPhone}</a>
              </p>
            )}
            {!phoneHref && !whatsappHref && <p className="mt-3 text-sm text-slate-500">{t.contactComingSoon}</p>}
          </div>
          <div className="order-1 flex justify-center md:order-2">
            <div
              className="relative flex aspect-square w-48 items-center justify-center overflow-hidden rounded-[2rem] border border-teal-100 bg-gradient-to-br from-teal-50 to-cyan-100 sm:w-56 md:w-64"
            >
              {clinic.doctorPhotoUrl ? (
                // This is a doctor-managed public image URL, never patient content.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={clinic.doctorPhotoUrl}
                  alt={clinic.doctorName}
                  referrerPolicy="no-referrer"
                  className="size-full object-cover"
                />
              ) : (
                <svg viewBox="0 0 220 220" role="img" aria-label={language === "hi" ? "डॉक्टर का चित्रित अवतार" : "Illustrated doctor avatar"} className="h-full w-full">
                  <circle cx="110" cy="110" r="92" fill="#ccfbf1" />
                  <path d="M37 210c4-37 33-61 73-61s69 24 73 61" fill="#0f766e" />
                  <path d="M79 147h62l20 63H59z" fill="#fff" />
                  <path d="M98 150h24l-12 21z" fill="#99f6e4" />
                  <path d="M95 170h30l14 40H81z" fill="#f8fafc" />
                  <path d="M102 171h16v13h-16z" fill="#0f766e" />
                  <path d="M92 80c0-23 13-38 34-38 22 0 34 15 34 39v27c0 25-16 42-37 42s-37-17-37-42V80z" fill="#f2c6a0" />
                  <path d="M83 88c-5-35 12-55 43-55 29 0 45 21 38 56-6-4-10-12-11-23-15 12-35 16-61 14-1 4-4 7-9 8z" fill="#334155" />
                  <path d="M100 97h2m32 0h2" stroke="#334155" strokeLinecap="round" strokeWidth="4" />
                  <path d="M104 120c4 4 8 6 13 6s9-2 13-6" fill="none" stroke="#9a5b4b" strokeLinecap="round" strokeWidth="3" />
                  <path d="M71 178c17 3 27 13 33 32M149 178c-17 3-27 13-33 32" fill="none" stroke="#0f766e" strokeLinecap="round" strokeWidth="5" />
                  <circle cx="110" cy="195" r="5" fill="#0f766e" />
                </svg>
              )}
            </div>
          </div>
        </section>

        <section id="availability" className="scroll-mt-6 py-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">{t.today}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {t.todayDate}: {dateLabel(today, language)}
              </p>
            </div>
          </div>
          {todaySessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-6 text-slate-700">
              {t.noSchedule}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {todaySessions.map((session) => (
                <SessionCard key={session.id} session={session} language={language} />
              ))}
            </div>
          )}
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <ShieldCheck size={17} aria-hidden="true" />
            {clinic.isSampleAvailability ? t.samplePreview : t.notGuaranteed}
          </p>
        </section>

        <section id="about" className="grid scroll-mt-6 gap-5 py-9 md:grid-cols-2">
          <article className="rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-7">
            <h2 className="text-xl font-bold text-slate-950">{t.details}</h2>
            <p className="mt-3 leading-7 text-slate-700">
              {publicText(clinic.introduction, SAMPLE_PUBLIC_CONTENT.introduction, language, t.sampleIntroduction)}
            </p>
          </article>
          <article id="services" className="scroll-mt-6 rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-7">
            <h2 className="text-xl font-bold text-slate-950">{t.services}</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {clinic.services.map((service) => (
                <li key={service} className="rounded-full bg-teal-50 px-3 py-1.5 text-sm text-teal-900">
                  {language === "hi" ? hindiServices[service] ?? service : service}
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section id="contact" className="scroll-mt-6 pb-9">
          <article className="rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-7">
            <h2 className="text-xl font-bold text-slate-950">{t.locations}</h2>
            {clinic.locations.length === 0 ? (
              <p className="mt-3 flex items-center gap-2 text-slate-700"><MapPin size={18} aria-hidden="true" />Ashta, Madhya Pradesh</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {clinic.locations.map((location) => (
                  <li key={location.id} className="flex gap-3">
                    <MapPin className="mt-1 shrink-0 text-[var(--primary)]" size={19} aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-slate-900">{locationText(location.name, language)}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{locationText(location.address, language)}</p>
                      {location.directionsUrl && (
                        <a
                          href={location.directionsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)] underline underline-offset-2"
                        >
                          {t.directions} <ArrowUpRight size={15} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {contactPhone && <p className="mt-4 text-sm font-medium text-slate-700">{contactPhone}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {phoneHref ? <a className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal-50 px-4 font-semibold text-teal-950" href={phoneHref}><Phone size={17} aria-hidden="true" />{t.call}</a> : <button type="button" disabled aria-disabled="true" className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-lg bg-slate-100 px-4 font-semibold text-slate-400"><Phone size={17} aria-hidden="true" />{t.call}</button>}
              {whatsappHref ? <a className="inline-flex min-h-11 items-center rounded-lg bg-teal-50 px-4 font-semibold text-teal-950" href={whatsappHref} target="_blank" rel="noreferrer">{t.whatsapp}</a> : <button type="button" disabled aria-disabled="true" className="inline-flex min-h-11 cursor-not-allowed items-center rounded-lg bg-slate-100 px-4 font-semibold text-slate-400">{t.whatsapp}</button>}
              {!phoneHref && !whatsappHref && <span className="text-sm text-slate-500">{t.contactComingSoon}</span>}
            </div>
          </article>
        </section>
      </div>

      <footer id="privacy" className="border-t border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} {clinic.clinicName || t.clinicName}</span>
          <p className="max-w-2xl">{t.privacy}: {language === "hi" ? "बुकिंग के लिए दी गई जानकारी केवल अनुरोध संभालने के लिए उपयोग होगी।" : "Information provided for a visit request is used only to handle that request."}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {phoneHref && contactPhone && <a className="font-medium text-[var(--primary)] underline underline-offset-2" href={phoneHref}>{contactPhone}</a>}
            {whatsappHref && <a className="font-medium text-[var(--primary)] underline underline-offset-2" href={whatsappHref} target="_blank" rel="noreferrer">{t.whatsapp}</a>}
          </div>
          <a className="font-medium text-[var(--primary)] underline underline-offset-2" href="/doctor/login">{t.login}</a>
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
      : "bg-slate-100 text-slate-700";

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-950">
            {session.isSample
              ? session.locationName === "Village consultation" ? t.sampleVillage : t.sampleClinic
              : session.locationName}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{locationText(session.address, language)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${session.isSample ? "bg-amber-50 text-amber-900" : statusStyle}`}>
          {session.isSample ? t.sampleTiming : statusLabel}
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-600">{dateLabel(session.date, language)}</p>
      <p className="mt-2 flex items-center gap-2 font-semibold text-slate-800">
        <Clock3 size={18} className="text-[var(--primary)]" aria-hidden="true" />
        {timeLabel(session.startsAt)} – {timeLabel(session.endsAt)}
      </p>
      {session.note && (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          <span className="font-semibold">{t.optionalNote}: </span>{session.note}
        </p>
      )}
    </article>
  );
}
