import type { Metadata } from "next";

import { getSpecialtiesWithCounts } from "@/features/admin/queries";
import { SpecialtiesManager, type SpecialtyRow } from "./SpecialtiesManager";

export const metadata: Metadata = { title: "Specialități" };

export default async function AdminSpecialtiesPage() {
  const specialties = await getSpecialtiesWithCounts();
  const rows: SpecialtyRow[] = specialties.map((s) => ({
    id: s.id,
    name: s.name,
    active: s.active,
    counts: {
      doctors: s._count.doctors,
      procedures: s._count.procedures,
      nurses: s._count.nurses,
      tickets: s._count.tickets,
    },
  }));

  return <SpecialtiesManager specialties={rows} />;
}
