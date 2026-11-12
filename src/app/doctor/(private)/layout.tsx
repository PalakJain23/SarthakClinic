import { DoctorShell } from "@/components/doctor-shell";
import { requireDoctor } from "@/lib/doctor-auth";

export default async function PrivateDoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDoctor();
  return <DoctorShell>{children}</DoctorShell>;
}
