import type { Metadata } from "next";

import { getDoctors, getSpecialtiesForSelect } from "@/features/admin/queries";
import { DoctorsManager, type DoctorRow } from "./DoctorsManager";

export const metadata: Metadata = { title: "Medici" };

export default async function AdminDoctorsPage() {
  const [doctors, specialties] = await Promise.all([
    getDoctors(),
    getSpecialtiesForSelect(),
  ]);

  const rows: DoctorRow[] = doctors.map((d) => ({
    id: d.id,
    name: d.name,
    active: d.active,
    specialtyId: d.specialtyId,
    specialtyName: d.specialty.name,
  }));

  return <DoctorsManager doctors={rows} specialties={specialties} />;
}
