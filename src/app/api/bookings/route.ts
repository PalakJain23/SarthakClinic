import { NextResponse } from "next/server";
import { bookingSchema, normalizeIndianMobile } from "@/lib/booking-schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  ) {
    return NextResponse.json(
      { error: "Demo mode does not save or submit booking requests." },
      { status: 503 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8192) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  let mobile: string;
  try {
    mobile = normalizeIndianMobile(parsed.data.mobile);
  } catch {
    return NextResponse.json({ error: "invalid_mobile" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Booking is not configured. Please contact the clinic directly." },
      { status: 503 },
    );
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("submit_public_booking", {
    p_patient_name: parsed.data.patientName,
    p_mobile: mobile,
    p_session_id: parsed.data.sessionId,
    p_preferred_time: parsed.data.preferredTime || null,
    p_age: parsed.data.age === "" ? null : parsed.data.age,
    p_reason: parsed.data.reason || null,
    p_privacy_acknowledged: parsed.data.privacyAcknowledged,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (error) {
    if (error.message.includes("Invalid mobile number")) {
      return NextResponse.json({ error: "invalid_mobile" }, { status: 400 });
    }
    if (
      error.message.includes("Session is not accepting bookings") ||
      error.message.includes("Session is full")
    ) {
      return NextResponse.json(
        { error: "This session is no longer available. Refresh and choose another." },
        { status: 409 },
      );
    }
    if (error.message.includes("Booking request limit reached")) {
      return NextResponse.json(
        { error: "Too many booking requests. Please contact the clinic." },
        { status: 429 },
      );
    }
    console.error("Public booking RPC failed", { code: error.code });
    return NextResponse.json(
      { error: "The booking request could not be saved." },
      { status: 500 },
    );
  }

  return NextResponse.json({ bookingReference: data }, { status: 201 });
}
