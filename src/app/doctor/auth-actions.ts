"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; success?: string };

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
});

export async function loginAction(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: "Enter a valid email address and password." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase is not configured. See the setup instructions." };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    console.error("Doctor sign-in failed", { code: error.status });
    return { error: "Sign-in failed. Check your credentials or contact the clinic administrator." };
  }
  return { success: "signed_in" };
}

export async function recoveryAction(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!z.string().email().max(254).safeParse(email).success) {
    return { error: "Enter a valid email address." };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase is not configured. See the setup instructions." };
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const siteUrl = configuredSiteUrl || (
    process.env.NODE_ENV === "production" ? null : "http://localhost:3000"
  );
  if (!siteUrl) {
    return { error: "Password recovery is not configured. Contact the clinic administrator." };
  }
  let redirectUrl: URL;
  try {
    redirectUrl = new URL(siteUrl);
  } catch {
    return { error: "Password recovery has an invalid site URL. Contact the clinic administrator." };
  }
  if (
    redirectUrl.username ||
    redirectUrl.password ||
    (process.env.NODE_ENV === "production" && redirectUrl.protocol !== "https:") ||
    (redirectUrl.protocol !== "https:" &&
      !(process.env.NODE_ENV !== "production" &&
        redirectUrl.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(redirectUrl.hostname)))
  ) {
    return { error: "Password recovery has an invalid site URL. Contact the clinic administrator." };
  }
  redirectUrl.pathname = "/auth/callback";
  redirectUrl.search = "";
  redirectUrl.hash = "";
  redirectUrl.searchParams.set("next", "/doctor/recover");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl.toString(),
  });
  if (error) {
    console.error("Password recovery request failed", { code: error.status });
    return { error: "Password recovery is not available right now." };
  }
  return { success: "If the account is authorized, password recovery instructions will be sent." };
}

export async function updatePasswordAction(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (!z.string().min(10).max(256).safeParse(password).success) {
    return { error: "Use a password with at least 10 characters." };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase is not configured. See the setup instructions." };
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Open the password recovery link from your email first." };
  const { data: authorization, error: authorizationError } = await supabase
    .from("authorized_doctors")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (authorizationError || !authorization) {
    return { error: "This account is not authorized to use the doctor area." };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("Doctor password update failed", { code: error.status });
    return { error: "Password could not be updated." };
  }
  return { success: "Password updated. You can now sign in." };
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/doctor/login?setup=required");
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Doctor sign-out failed", { code: error.status });
    throw new Error("Could not sign out safely. Please retry.");
  }
  redirect("/doctor/login");
}
