"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAction, recoveryAction, updatePasswordAction, type AuthState } from "@/app/doctor/auth-actions";

const initialState: AuthState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success === "signed_in") router.replace("/doctor");
  }, [router, state.success]);

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-semibold text-slate-800">
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          className="mt-1.5 min-h-12 w-full rounded-lg border border-slate-300 px-3 font-normal"
        />
      </label>
      <label className="block text-sm font-semibold text-slate-800">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
          className="mt-1.5 min-h-12 w-full rounded-lg border border-slate-300 px-3 font-normal"
        />
      </label>
      {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-lg bg-[var(--primary)] px-4 font-semibold text-white hover:bg-[var(--primary-dark)] disabled:bg-slate-400"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function RecoveryForm() {
  const [state, action, pending] = useActionState(recoveryAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-semibold text-slate-800">
        Account email
        <input name="email" type="email" autoComplete="email" required maxLength={254} className="mt-1.5 min-h-12 w-full rounded-lg border border-slate-300 px-3 font-normal" />
      </label>
      {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      {state.success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{state.success}</p>}
      <button type="submit" disabled={pending} className="min-h-12 w-full rounded-lg bg-[var(--primary)] px-4 font-semibold text-white hover:bg-[var(--primary-dark)] disabled:bg-slate-400">
        {pending ? "Sending…" : "Send recovery link"}
      </button>
    </form>
  );
}

export function PasswordUpdateForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-semibold text-slate-800">
        New password
        <input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={256} required className="mt-1.5 min-h-12 w-full rounded-lg border border-slate-300 px-3 font-normal" />
      </label>
      {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      {state.success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{state.success}</p>}
      <button type="submit" disabled={pending} className="min-h-12 w-full rounded-lg bg-[var(--primary)] px-4 font-semibold text-white disabled:bg-slate-400">{pending ? "Updating…" : "Update password"}</button>
    </form>
  );
}
