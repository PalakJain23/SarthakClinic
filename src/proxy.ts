import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isApi = request.nextUrl.pathname.startsWith("/api/doctor/");

  if (!url || !anonKey) {
    if (isApi) {
      return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
    }
    return NextResponse.redirect(new URL("/doctor/login?setup=required", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        for (const { name, value } of cookies) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookies) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) {
    if (isApi) return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503 });
    return NextResponse.redirect(new URL("/doctor/login?setup=auth", request.url));
  }

  if (!user) {
    if (isApi) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    return NextResponse.redirect(new URL("/doctor/login", request.url));
  }

  if (isApi) {
    const { data: authorization, error } = await supabase
      .from("authorized_doctors")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: "Doctor authorization is temporarily unavailable." }, { status: 503 });
    }
    if (!authorization) {
      return NextResponse.json({ error: "Doctor authorization required." }, { status: 403 });
    }
  }
  return response;
}

export const config = {
  matcher: ["/doctor/((?!login|recover).*)", "/api/doctor/:path*"],
};
