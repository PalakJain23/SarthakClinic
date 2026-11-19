"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  HeartPulse,
  LayoutDashboard,
  MapPinned,
  Menu,
  Settings,
  Stethoscope,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationGroups = [
  {
    id: "clinic-management",
    label: "Clinic Management",
    items: [
      { href: "/doctor", label: "Overview", icon: LayoutDashboard },
      { href: "/doctor/appointments", label: "Appointments", icon: CalendarDays },
      { href: "/doctor/doctors", label: "Doctors", icon: Stethoscope },
      { href: "/doctor/availability", label: "Availability", icon: MapPinned },
      { href: "/doctor/patients", label: "Patients", icon: UsersRound },
    ],
  },
  {
    id: "finance-admin",
    label: "Finance & Admin",
    items: [
      { href: "/doctor/accounts", label: "Udhaar Ledger", icon: CreditCard },
      { href: "/doctor/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

function isCurrentPage(href: string, pathname: string) {
  return pathname === href || (href !== "/doctor" && pathname.startsWith(`${href}/`));
}

function NavigationGroups({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-7">
      {navigationGroups.map((group) => (
        <section key={group.id} aria-labelledby={`doctor-nav-${group.id}`}>
          <h2
            id={`doctor-nav-${group.id}`}
            className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500"
          >
            {group.label}
          </h2>
          <ul className="space-y-1">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = isCurrentPage(href, pathname);
              const secondary = href === "/doctor/settings" && !active;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                      active
                        ? "bg-teal-50 font-semibold text-teal-950 ring-1 ring-inset ring-teal-100"
                        : `font-medium hover:bg-slate-50 hover:text-slate-950 ${secondary ? "text-slate-600" : "text-slate-700"}`
                    }`}
                  >
                    <Icon size={18} aria-hidden="true" className="shrink-0" />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function DoctorSidebar() {
  const pathname = usePathname() ?? "/doctor";

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 px-5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-teal-50 text-[var(--primary)]">
          <HeartPulse size={21} aria-hidden="true" />
        </span>
        <span className="font-bold text-slate-950">Sarthak Clinic</span>
      </div>
      <nav aria-label="Doctor navigation" className="min-h-0 flex-1 overflow-y-auto p-4">
        <NavigationGroups pathname={pathname} />
      </nav>
    </aside>
  );
}

export function DoctorMobileNavigation() {
  const pathname = usePathname() ?? "/doctor";
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  function closeNavigation() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open navigation menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? "doctor-mobile-navigation" : undefined}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 md:hidden"
      >
        <Menu size={20} aria-hidden="true" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-slate-950/35" />
          <div
            ref={drawerRef}
            id="doctor-mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-labelledby="doctor-mobile-navigation-title"
            className="relative flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-xl"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-teal-50 text-[var(--primary)]">
                  <HeartPulse size={21} aria-hidden="true" />
                </span>
                <h2 id="doctor-mobile-navigation-title" className="font-bold text-slate-950">
                  Sarthak Clinic
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={closeNavigation}
                aria-label="Close navigation menu"
                className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Doctor navigation" className="min-h-0 flex-1 overflow-y-auto p-4">
              <NavigationGroups pathname={pathname} onNavigate={closeNavigation} />
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
