import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { needsSignIn } from "@/lib/auth-errors";

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
  function withSessionCookies(result: NextResponse) {
    for (const cookie of response.cookies.getAll()) result.cookies.set(cookie);
    result.headers.set("Cache-Control", "private, no-store");
    return result;
  }
  if (authError) {
    const signIn = needsSignIn(authError);
    if (!signIn) console.error("Session verification failed", { code: authError.code, status: authError.status });
    if (isApi) return withSessionCookies(NextResponse.json({ error: signIn ? "Authentication required." : "Authentication is temporarily unavailable." }, { status: signIn ? 401 : 503 }));
    return withSessionCookies(NextResponse.redirect(new URL(signIn ? "/doctor/login" : "/doctor/login?setup=auth", request.url)));
  }

  if (!user) {
    if (isApi) return withSessionCookies(NextResponse.json({ error: "Authentication required." }, { status: 401 }));
    return withSessionCookies(NextResponse.redirect(new URL("/doctor/login", request.url)));
  }

  if (isApi) {
    const { data: authorization, error } = await supabase
      .from("authorized_doctors")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      return withSessionCookies(NextResponse.json({ error: "Doctor authorization is temporarily unavailable." }, { status: 503 }));
    }
    if (!authorization) {
      return withSessionCookies(NextResponse.json({ error: "Doctor authorization required." }, { status: 403 }));
    }
  }
  return withSessionCookies(response);
}

export const config = {
  matcher: ["/doctor/((?!login|recover).*)", "/api/doctor/:path*"],
};
