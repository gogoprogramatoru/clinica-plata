import "server-only";

import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/tickets";

/** Listă de specialități pentru dropdown-uri (doar cele active + toate). */
export async function getSpecialtiesForSelect() {
  return prisma.specialty.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getSpecialtiesWithCounts() {
  const specialties = await prisma.specialty.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { doctors: true, procedures: true, nurses: true, tickets: true } },
    },
  });
  return specialties;
}

export async function getDoctors() {
  return prisma.doctor.findMany({
    orderBy: [{ specialty: { name: "asc" } }, { name: "asc" }],
    include: { specialty: { select: { name: true } } },
  });
}

export async function getProcedures() {
  const procedures = await prisma.procedure.findMany({
    orderBy: [{ specialty: { name: "asc" } }, { name: "asc" }],
    include: { specialty: { select: { name: true } } },
  });
  return procedures.map((p) => ({
    id: p.id,
    name: p.name,
    defaultPrice: decimalToNumber(p.defaultPrice),
    active: p.active,
    specialtyId: p.specialtyId,
    specialtyName: p.specialty.name,
  }));
}

export async function getUsers() {
  return prisma.user.findMany({
    // Nu selectăm niciodată passwordHash pentru UI.
    where: { role: { in: ["RECEPTION", "NURSE"] } },
    select: {
      id: true,
      username: true,
      role: true,
      active: true,
      specialtyId: true,
      specialty: { select: { name: true } },
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { username: "asc" }],
  });
}
