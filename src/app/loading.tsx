export default function Loading() {
  return (
    <main aria-busy="true" className="mx-auto min-h-[50vh] max-w-6xl px-5 py-12">
      <p role="status" className="text-slate-600">Loading clinic information…</p>
    </main>
  );
}
