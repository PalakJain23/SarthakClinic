import Link from "next/link";
import {
  CalendarDays,
  CreditCard,
  FileChartColumn,
  HeartPulse,
  LayoutDashboard,
  MapPinned,
  Settings,
  UsersRound,
} from "lucide-react";
import { logoutAction } from "@/app/doctor/auth-actions";

const navigation = [
  { href: "/doctor", label: "Overview", icon: LayoutDashboard },
  { href: "/doctor/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/doctor/availability", label: "Availability", icon: MapPinned },
  { href: "/doctor/patients", label: "Patients", icon: UsersRound },
  { href: "/doctor/accounts", label: "Udhaar Ledger", icon: CreditCard },
  { href: "/doctor/reports", label: "Reports", icon: FileChartColumn },
  { href: "/doctor/settings", label: "Settings", icon: Settings },
];

export function DoctorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-teal-50 text-[var(--primary)]"><HeartPulse size={21} aria-hidden="true" /></span>
          <span className="font-bold text-slate-950">Sarthak Clinic</span>
        </div>
        <nav aria-label="Doctor navigation" className="space-y-1 p-3">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-950">
              <Icon size={18} aria-hidden="true" /> {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/doctor" className="flex items-center gap-2 font-bold text-slate-950 md:hidden"><HeartPulse className="text-[var(--primary)]" size={21} aria-hidden="true" /> Sarthak Clinic</Link>
            <div className="hidden text-sm font-medium text-slate-600 md:block">Doctor dashboard · Private</div>
            <form action={logoutAction}>
              <button className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Log out</button>
            </form>
          </div>
          <nav aria-label="Doctor navigation" className="flex gap-2 overflow-x-auto px-3 pb-3 md:hidden">
            {navigation.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
                <Icon size={16} aria-hidden="true" /> {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
