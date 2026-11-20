import { requireDoctor } from "@/lib/doctor-auth";
import DoctorsWorkspace from "@/components/doctors-workspace";
import { doctorSchema } from "@/lib/doctor-directory-schema";
import { getInitialOwnerPhotoUrl } from "@/lib/clinic-data";

export const dynamic = "force-dynamic";

export default async function DoctorsPage() {
  const { supabase } = await requireDoctor();
  const [profile, directory] = await Promise.all([
    supabase.from("clinic_profile").select("doctor_name, qualification, doctor_photo_url").eq("singleton", true).maybeSingle(),
    supabase.from("clinic_doctors").select("id, details").order("created_at"),
  ]);
  const parsed = doctorSchema.array().safeParse((directory.data ?? []).map((row) => ({ ...row.details, id: row.id })));
  const failed = profile.error || directory.error || !parsed.success;
  if (failed) console.error("Doctor directory unavailable", { profile: profile.error?.code, directory: directory.error?.code, invalidData: !parsed.success });
  return <DoctorsWorkspace
    initialDoctors={parsed.success ? parsed.data : []}
    owner={{
      name: profile.data?.doctor_name?.trim() || "Subhal Singh Thakur",
      qualification: profile.data?.qualification || "",
      photoUrl: profile.data?.doctor_photo_url || getInitialOwnerPhotoUrl(),
    }}
    loadError={failed ? "Doctor records could not be loaded. Ask the administrator to verify the doctor-directory migration and connection, then reload. Saving is disabled until records can be loaded." : undefined}
  />;
}
