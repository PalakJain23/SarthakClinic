import Link from "next/link";
import { ExternalLink, HeartPulse } from "lucide-react";
import { logoutAction } from "@/app/doctor/auth-actions";
import { DoctorMobileNavigation, DoctorSidebar } from "@/components/doctor-navigation";

export function DoctorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <a
        href="#doctor-main"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-slate-950 focus:shadow-lg"
      >
        Skip to main content
      </a>
      <DoctorSidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
          <div className="flex min-h-16 items-center justify-between gap-2 px-2 sm:gap-4 sm:px-6">
            <Link href="/doctor" className="flex shrink-0 items-center gap-2 font-bold text-slate-950 md:hidden"><HeartPulse className="text-[var(--primary)]" size={21} aria-hidden="true" /> Sarthak Clinic</Link>
            <div className="hidden text-sm font-medium text-slate-600 md:block">Doctor dashboard · Private</div>
            <div className="flex items-center gap-2">
              <DoctorMobileNavigation />
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View website (opens in a new tab)"
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-teal-700 px-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:px-4"
              >
                <span className="hidden sm:inline">View Website</span>
                <ExternalLink size={16} aria-hidden="true" />
              </a>
              <form action={logoutAction}>
                <button className="min-h-11 rounded-lg border border-slate-300 px-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:px-4">Log out</button>
              </form>
            </div>
          </div>
        </header>
        <main id="doctor-main" className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
