import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { needsSignIn } from "@/lib/auth-errors";

export const requireDoctor = cache(async function requireDoctor() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/doctor/login?setup=required");

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) {
    if (needsSignIn(authError)) redirect("/doctor/login");
    console.error("Doctor session verification failed", {
      code: authError.code, status: authError.status,
    });
    redirect("/doctor/login?setup=auth");
  }
  if (!user) redirect("/doctor/login");

  const { data: authorization, error } = await supabase
    .from("authorized_doctors")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Doctor authorization lookup failed", { code: error.code });
    redirect("/doctor/login?setup=authorization");
  }
  if (!authorization) redirect("/doctor/login?unauthorized=1");
  return { supabase, user };
});
