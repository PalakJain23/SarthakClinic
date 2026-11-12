import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export default async function DoctorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string; unauthorized?: string; recovery?: string }>;
}) {
  const params = await searchParams;
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="text-sm font-semibold text-[var(--primary)] underline underline-offset-2">← Sarthak Clinic</Link>
        <h1 className="mt-6 text-2xl font-bold text-slate-950">Doctor login</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Private access for the clinic’s authorized doctor.</p>
        {(params.setup || !supabaseConfigured) && (
          <p role="status" className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-950">
            {params.setup === "authorization"
              ? "Doctor authorization could not be checked. Verify the migration and Supabase availability."
              : params.setup === "auth"
                ? "Supabase authentication is temporarily unavailable."
                : "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the app."}
          </p>
        )}
        {params.recovery && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">The recovery link could not be verified. Request a new link.</p>}
        {params.unauthorized && (
          <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
            This account is not authorized for doctor access. Contact the clinic administrator.
          </p>
        )}
        <div className="mt-6"><LoginForm /></div>
        <Link href="/doctor/recover" className="mt-5 inline-block text-sm font-semibold text-[var(--primary)] underline underline-offset-2">Forgot password?</Link>
        <p className="mt-7 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">There is no public signup or demo login. The doctor account must be provisioned privately.</p>
      </section>
    </main>
  );
}
