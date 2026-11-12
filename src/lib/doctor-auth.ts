import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const requireDoctor = cache(async function requireDoctor() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/doctor/login?setup=required");

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw new Error("Could not verify the doctor’s Supabase session.");
  if (!user) redirect("/doctor/login");

  const { data: authorization, error } = await supabase
    .from("authorized_doctors")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error("Could not verify doctor authorization.");
  if (!authorization) redirect("/doctor/login?unauthorized=1");
  return { supabase, user };
});
