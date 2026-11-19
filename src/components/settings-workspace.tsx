"use client";

import { useState } from "react";
import { Building2, DatabaseBackup, MapPin, UserRound } from "lucide-react";
import {
  ClinicDetailsForm,
  LocationEditForm,
  LocationForm,
  ProfileForm,
} from "@/components/doctor-forms";

type SettingsTab = "profile" | "clinic" | "locations" | "system";

const tabs: { id: SettingsTab; label: string; icon: typeof UserRound }[] = [
  { id: "profile", label: "My Profile", icon: UserRound },
  { id: "clinic", label: "Clinic Details", icon: Building2 },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "system", label: "System & Backups", icon: DatabaseBackup },
];

export function SettingsWorkspace({
  profile,
  locations,
}: {
  profile: {
    clinicName: string;
    doctorName: string;
    qualification: string;
    speciality: string;
    registrationInfo: string;
    introduction: string;
    doctorPhotoUrl: string | null;
    phone: string;
    whatsapp: string;
  };
  locations: {
    id: string;
    name: string;
    public_address: string;
    directions_url: string | null;
    active: boolean;
  }[];
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your public profile and clinic information.</p>
      </header>

      <div role="tablist" aria-label="Settings sections" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`settings-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            aria-controls="settings-panel"
            tabIndex={activeTab === id ? 0 : -1}
            onClick={() => setActiveTab(id)}
            onKeyDown={(event) => {
              const currentIndex = tabs.findIndex((tab) => tab.id === id);
              const nextIndex =
                event.key === "ArrowRight"
                  ? (currentIndex + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (currentIndex + tabs.length - 1) % tabs.length
                    : -1;
              if (nextIndex < 0) return;
              event.preventDefault();
              const nextTab = tabs[nextIndex].id;
              setActiveTab(nextTab);
              document.getElementById(`settings-tab-${nextTab}`)?.focus();
            }}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:px-4 ${
              activeTab === id
                ? "bg-teal-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <section
        id="settings-panel"
        role="tabpanel"
        aria-labelledby={`settings-tab-${activeTab}`}
        className="space-y-4"
      >
        {activeTab === "profile" && (
          <>
            <div>
              <h2 className="text-lg font-bold text-slate-950">My Profile</h2>
              <p className="mt-1 text-sm text-slate-600">Manage the clinic owner profile shown on the public website.</p>
            </div>
            <ProfileForm values={profile} />
          </>
        )}

        {activeTab === "clinic" && (
          <>
            <div>
              <h2 className="text-lg font-bold text-slate-950">Clinic Details</h2>
              <p className="mt-1 text-sm text-slate-600">These contact details are shared on the public website.</p>
            </div>
            <ClinicDetailsForm values={profile} />
          </>
        )}

        {activeTab === "locations" && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Locations</h2>
                <p className="mt-1 text-sm text-slate-600">Manage clinic addresses, Maps links, and public visibility.</p>
              </div>
              <span className="text-sm text-slate-500">{locations.length} {locations.length === 1 ? "location" : "locations"}</span>
            </div>
            {locations.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">No locations have been added.</p>
            ) : (
              <ul className="space-y-3">
                {locations.map((location) => (
                  <li key={location.id}>
                    <LocationEditForm location={location} />
                  </li>
                ))}
              </ul>
            )}
            <details className="group rounded-xl border border-slate-200 bg-white">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-teal-800 marker:content-none hover:bg-slate-50">
                <span>Add location</span>
                <span aria-hidden="true" className="text-lg leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="border-t border-slate-100 p-4 sm:p-5">
                <LocationForm />
              </div>
            </details>
          </>
        )}

        {activeTab === "system" && (
          <>
            <div>
              <h2 className="text-lg font-bold text-slate-950">System & Backups</h2>
              <p className="mt-1 text-sm text-slate-600">Important information about application and database backups.</p>
            </div>
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 sm:p-5">
              <h3 className="font-bold">Backups</h3>
              <p className="mt-2">Git preserves source code only. It is not a patient database backup. Use the documented encrypted database backup and restore procedure in README; no automatic backups are configured by this app.</p>
            </section>
          </>
        )}
      </section>
    </div>
  );
}
