"use client";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-2xl flex-col justify-center px-5 py-12">
      <h1 className="text-2xl font-bold text-slate-950">We could not load this page</h1>
      <p role="alert" className="mt-3 leading-7 text-slate-700">
        The requested information is unavailable right now. No operation was reported as successful.
      </p>
      <button onClick={reset} className="mt-6 min-h-11 w-fit rounded-lg bg-[var(--primary)] px-5 font-semibold text-white">
        Try again
      </button>
    </main>
  );
}
