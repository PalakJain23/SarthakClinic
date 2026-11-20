"use server";

import { revalidatePath } from "next/cache";
import { requireDoctor } from "@/lib/doctor-auth";
import { doctorSchema, type Doctor } from "@/lib/doctor-directory-schema";

export async function saveAdditionalDoctor(formData: FormData): Promise<{ doctor?: Doctor; error?: string }> {
  const { supabase, user } = await requireDoctor();
  let input: unknown;
  try { input = JSON.parse(String(formData.get("doctor") ?? "")); }
  catch { return { error: "Invalid doctor details." }; }
  const parsed = doctorSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the name, specialty, fee and visiting schedule. Use valid dates and an end time after the start time." };
  const doctor = parsed.data;
  const existing = await supabase.from("clinic_doctors").select("details").eq("id", doctor.id).maybeSingle();
  if (existing.error) return { error: "Doctor directory is unavailable. Verify its database migration and try again." };
  // Do not accept arbitrary public image URLs from the client.
  doctor.photoUrl = existing.data?.details?.photoUrl ?? null;
  const photo = formData.get("photo");
  const bucket = "clinic-profile-images";
  let path: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 5 * 1024 * 1024) return { error: "Choose an image smaller than 5 MB." };
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const jpeg = photo.type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = photo.type === "image/png" && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
    const webp = photo.type === "image/webp" && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
    if (!jpeg && !png && !webp) return { error: "Choose a valid JPG, PNG or WebP image." };
    path = `${user.id}/doctor-${doctor.id}-${crypto.randomUUID()}.${jpeg ? "jpg" : png ? "png" : "webp"}`;
    const upload = await supabase.storage.from(bucket).upload(path, photo, { contentType: photo.type, upsert: false });
    if (upload.error) {
      console.error("Additional doctor image upload failed", {
        code: (upload.error as { statusCode?: string }).statusCode ?? upload.error.name,
      });
      return {
        error: "Image upload failed. Verify the clinic-profile-images bucket and doctor upload policy, then retry.",
      };
    }
    doctor.photoUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
  const { id, ...details } = doctor;
  const saved = await supabase.from("clinic_doctors").upsert({ id, details, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "id" }).select("id, details").single();
  if (saved.error) {
    if (path) await supabase.storage.from(bucket).remove([path]);
    console.error("Doctor save failed", { code: saved.error.code });
    return { error: "Doctor could not be saved. Please retry; do not close this form." };
  }
  revalidatePath("/doctor/doctors");
  revalidatePath("/");
  return { doctor: { ...saved.data.details, id: saved.data.id } as Doctor };
}
