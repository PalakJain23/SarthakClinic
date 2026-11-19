import { SettingsWorkspace } from "@/components/settings-workspace";
import { getInitialOwnerPhotoUrl } from "@/lib/clinic-data";
import { requireDoctor } from "@/lib/doctor-auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase } = await requireDoctor();
  const [profileResult, locationResult] = await Promise.all([
    supabase.from("clinic_profile").select("*").eq("singleton", true).maybeSingle(),
    supabase
      .from("clinic_locations")
      .select("id, name, public_address, directions_url, active")
      .order("sort_order"),
  ]);
  if (profileResult.error) throw new Error(`Could not load clinic profile: ${profileResult.error.message}`);
  if (locationResult.error) throw new Error(`Could not load clinic locations: ${locationResult.error.message}`);
  const profile = profileResult.data;

  return (
    <SettingsWorkspace
      profile={{
        clinicName: profile?.clinic_name ?? "Sarthak Clinic",
        doctorName: profile?.doctor_name?.trim() || "Subhal Thakur",
        qualification: profile?.qualification ?? "",
        speciality: profile?.speciality ?? "",
        registrationInfo: profile?.registration_info ?? "",
        introduction: profile?.public_introduction ?? "",
        doctorPhotoUrl: profile?.doctor_photo_url?.trim() || getInitialOwnerPhotoUrl(),
        phone: profile?.public_phone ?? "",
        whatsapp: profile?.public_whatsapp ?? "",
      }}
      locations={locationResult.data ?? []}
    />
  );
}
