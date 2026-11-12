import { LocationEditForm, LocationForm, ProfileForm, ServiceEditForm, ServiceForm } from "@/components/doctor-forms";
import { requireDoctor } from "@/lib/doctor-auth";
import { SAMPLE_PUBLIC_CONTENT } from "@/lib/sample-public-content";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase } = await requireDoctor();
  const [profileResult, locationResult, serviceResult] = await Promise.all([
    supabase.from("clinic_profile").select("*").eq("singleton", true).maybeSingle(),
    supabase.from("clinic_locations").select("id, name, public_address, directions_url, active").order("sort_order"),
    supabase.from("clinic_services").select("id, name, active").order("sort_order"),
  ]);
  for (const result of [profileResult, locationResult, serviceResult]) {
    if (result.error) throw new Error(`Could not load settings: ${result.error.message}`);
  }
  const profile = profileResult.data;

  return (
    <div className="space-y-7">
      <header><h1 className="text-2xl font-bold text-slate-950">Settings</h1><p className="mt-1 text-slate-600">Public profile, clinic locations, and services.</p></header>
      <section className="space-y-4">
        <h2 className="text-lg font-bold">Clinic and doctor profile</h2>
        <ProfileForm values={{
          clinicName: profile?.clinic_name ?? "Sarthak Clinic",
          doctorName: profile?.doctor_name ?? "",
          qualification: profile?.qualification ?? "",
          speciality: profile?.speciality ?? "",
          introduction: profile?.public_introduction ?? "",
          doctorPhotoUrl: profile?.doctor_photo_url ?? "",
          phone: profile?.public_phone ?? SAMPLE_PUBLIC_CONTENT.publicPhoneDisplay,
          whatsapp: profile?.public_whatsapp ?? SAMPLE_PUBLIC_CONTENT.publicPhoneDisplay,
        }} />
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div><h2 className="text-lg font-bold">Clinic locations</h2><p className="mt-1 text-sm text-slate-600">Only configured addresses are published.</p></div>
          {(locationResult.data ?? []).length === 0 ? <p className="text-sm text-slate-600">No locations added.</p> : <ul className="space-y-3">{(locationResult.data ?? []).map((location) => <li key={location.id}><LocationEditForm location={location} /></li>)}</ul>}
          <LocationForm />
        </div>
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div><h2 className="text-lg font-bold">Services</h2><p className="mt-1 text-sm text-slate-600">Only configured services are published.</p></div>
          {(serviceResult.data ?? []).length === 0 ? <p className="text-sm text-slate-600">No services added.</p> : <ul className="space-y-3">{(serviceResult.data ?? []).map((service) => <li key={service.id}><ServiceEditForm service={service} /></li>)}</ul>}
          <ServiceForm />
        </div>
      </section>
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <h2 className="font-bold">Backups</h2>
        <p className="mt-2">Git preserves source code only. It is not a patient database backup. Use the documented encrypted database backup and restore procedure in README; no automatic backups are configured by this app.</p>
      </section>
    </div>
  );
}
