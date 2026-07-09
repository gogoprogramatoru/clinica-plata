import type { Metadata } from "next";

import { getUsers, getSpecialtiesForSelect } from "@/features/admin/queries";
import { UsersManager, type UserRow } from "./UsersManager";

export const metadata: Metadata = { title: "Utilizatori" };

export default async function AdminUsersPage() {
  const [users, specialties] = await Promise.all([
    getUsers(),
    getSpecialtiesForSelect(),
  ]);

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    active: u.active,
    specialtyId: u.specialtyId,
    specialtyName: u.specialty?.name ?? null,
  }));

  return <UsersManager users={rows} specialties={specialties} />;
}
