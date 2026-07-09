import type { Metadata } from "next";

import { getProcedures, getSpecialtiesForSelect } from "@/features/admin/queries";
import { ProceduresManager } from "./ProceduresManager";

export const metadata: Metadata = { title: "Proceduri" };

export default async function AdminProceduresPage() {
  const [procedures, specialties] = await Promise.all([
    getProcedures(),
    getSpecialtiesForSelect(),
  ]);

  return <ProceduresManager procedures={procedures} specialties={specialties} />;
}
