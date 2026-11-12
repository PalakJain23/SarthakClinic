export default function DoctorLoading() {
  return (
    <div aria-busy="true" className="space-y-4">
      <p role="status" className="text-slate-600">Loading private clinic records…</p>
      <div className="h-28 animate-pulse rounded-xl bg-slate-200" />
      <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
}
