import Link from "next/link";
import { PasswordUpdateForm, RecoveryForm } from "@/components/auth-forms";

export default function DoctorRecoveryPage() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
        <Link href="/doctor/login" className="text-sm font-semibold text-[var(--primary)] underline underline-offset-2">← Doctor login</Link>
        <h1 className="mt-6 text-2xl font-bold text-slate-950">Password recovery</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">If the account is authorized, Supabase will email a secure recovery link.</p>
        {!supabaseConfigured && (
          <p role="status" className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-950">
            Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the app.
          </p>
        )}
        <div className="mt-6"><RecoveryForm /></div>
        <div className="my-6 border-t border-slate-200" />
        <p className="mb-3 text-sm font-semibold text-slate-800">Already opened a recovery link? Set a new password:</p>
        <PasswordUpdateForm />
      </section>
    </main>
  );
}
