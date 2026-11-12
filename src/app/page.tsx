import { ClinicHome } from "@/components/clinic-home";
import { getPublicClinicData } from "@/lib/clinic-data";

export const revalidate = 60;

export default async function HomePage() {
  const clinic = await getPublicClinicData();
  return <ClinicHome clinic={clinic} />;
}
