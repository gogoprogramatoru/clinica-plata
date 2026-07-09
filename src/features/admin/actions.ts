"use server";

import { Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { hashPassword } from "@/lib/password";
import { ok, fail, toActionError, type ActionResult } from "@/lib/action-result";
import {
  createSpecialtySchema,
  updateSpecialtySchema,
  createDoctorSchema,
  updateDoctorSchema,
  createProcedureSchema,
  updateProcedureSchema,
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
} from "@/lib/validation/admin";

function revalidateAdmin() {
  revalidatePath("/admin", "layout");
}

/** Traduce erorile de unicitate Prisma (P2002) în mesaje prietenoase. */
function isUniqueError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

// ---------------------------------------------------------------------------
// Specialități
// ---------------------------------------------------------------------------
export async function createSpecialtyAction(input: unknown): Promise<ActionResult> {
  try {
    await requireRole(Role.ADMIN);
    const data = createSpecialtySchema.parse(input);
    await prisma.specialty.create({ data: { name: data.name } });
    revalidateAdmin();
    return ok(undefined);
  } catch (error) {
    if (isUniqueError(error)) return fail("Există deja o specialitate cu acest nume.");
    return toActionError(error);
  }
}

export async function updateSpecialtyAction(input: unknown): Promise<ActionResult> {
  try {
    await requireRole(Role.ADMIN);
    const data = updateSpecialtySchema.parse(input);
    await prisma.specialty.update({
      where: { id: data.id },
      data: { name: data.name, active: data.active },
    });
    revalidateAdmin();
    return ok(undefined);
  } catch (error) {
    if (isUniqueError(error)) return fail("Există deja o specialitate cu acest nume.");
    return toActionError(error);
  }
}

/** Ștergere sigură: dacă există entități legate, dezactivează în loc să șteargă. */
export async function deleteSpecialtyAction(input: unknown): Promise<ActionResult> {
  try {
    await requireRole(Role.ADMIN);
    const { id } = z_id(input);
    const [doctors, procedures, users, tickets] = await Promise.all([
      prisma.doctor.count({ where: { specialtyId: id } }),
      prisma.procedure.count({ where: { specialtyId: id } }),
      prisma.user.count({ where: { specialtyId: id } }),
      prisma.ticket.count({ where: { specialtyId: id } }),
    ]);
    if (doctors + procedures + users + tickets > 0) {
      await prisma.specialty.update({ where: { id }, data: { active: false } });
      revalidateAdmin();
      return fail(
        "Specialitatea are date asociate și a fost dezactivată în loc de ștearsă.",
      );
    }
    await prisma.specialty.delete({ where: { id } });
    revalidateAdmin();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

// ---------------------------------------------------------------------------
// Medici
// ---------------------------------------------------------------------------
export async function createDoctorAction(input: unknown): Promise<ActionResult> {
  try {
    await requireRole(Role.ADMIN);
    const data = createDoctorSchema.parse(input);
    await prisma.doctor.create({
      data: { name: data.name, specialtyId: data.specialtyId },
    });
    revalidateAdmin();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateDoctorAction(input: unknown): Promise<ActionResult> {
  try {
    await requireRole(Role.ADMIN);
    const data = updateDoctorSchema.parse(input);
    await prisma.doctor.update({
      where: { id: data.id },
      data: { name: data.name, specialtyId: data.specialtyId, active: data.active },
    });
    revalidateAdmin();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteDoctorAction(input: unknown): Promise<ActionResult> {
  try {
    await requireRole(Role.ADMIN);
    const { id } = z_id(input);
    const tickets = await prisma.ticket.count({ where: { doctorId: id } });
    if (tickets > 0) {
      await prisma.doctor.update({ where: { id }, data: { active: false } });
      revalidateAdmin();
      return fail(
        "Medicul apare pe tichete existente și a fost dezactivat în loc de șters.",
      );
    }
    await prisma.doctor.delete({ where: { id } });
    revalidateAdmin();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

// ---------------------------------------------------------------------------
// Proceduri
// ---------------------------------------------------------------------------
export async function createProcedureAction(input: unknown): Promise<ActionResult> {
  try {
    await requireRole(Role.ADMIN);
    const data = createProcedureSchema.parse(input);
    await prisma.procedure.create({
      data: {
        name: data.name,
        defaultPrice: new Prisma.Decimal(data.defaultPrice.toFixed(2)),
        specialtyId: data.specialtyId,
      },
    });
    revalidateAdmin();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateProcedureAction(input: unknown): Promise<ActionResult> {
  try {
    await requireRole(Role.ADMIN);
    const data = updateProcedureSchema.parse(input);
    await prisma.procedure.update({
      where: { id: data.id },
      data: {
        name: data.name,
        // Modificarea prețului implicit NU afectează tichetele istorice
        // (acelea au snapshot în TicketItem.price).
        defaultPrice:
          data.defaultPrice !== undefined
            ? new Prisma.Decimal(data.defaultPrice.toFixed(2))
            : undefined,
        specialtyId: data.specialtyId,
        active: data.active,
      },
    });
    revalidateAdmin();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteProcedureAction(input: unknown): Promise<ActionResult> {
  try {
    await requireRole(Role.ADMIN);
    const { id } = z_id(input);
    const used = await prisma.ticketItem.count({ where: { procedureId: id } });
    if (used > 0) {
      await prisma.procedure.update({ where: { id }, data: { active: false } });
      revalidateAdmin();
      return fail(
        "Procedura apare pe tichete existente și a fost dezactivată în loc de ștearsă.",
      );
    }
    await prisma.procedure.delete({ where: { id } });
    revalidateAdmin();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

// ---------------------------------------------------------------------------
// Utilizatori
// ---------------------------------------------------------------------------
export async function createUserAction(input: unknown): Promise<ActionResult> {
  try {
    await requireRole(Role.ADMIN);
    const data = createUserSchema.parse(input);
    const passwordHash = await hashPassword(data.password);
    await prisma.user.create({
      data: {
        username: data.username,
        passwordHash,
        role: data.role,
        specialtyId: data.role === Role.NURSE ? data.specialtyId ?? null : null,
      },
    });
    revalidateAdmin();
    return ok(undefined);
  } catch (error) {
    if (isUniqueError(error)) return fail("Există deja un utilizator cu acest nume.");
    return toActionError(error);
  }
}

export async function updateUserAction(input: unknown): Promise<ActionResult> {
  try {
    await requireRole(Role.ADMIN);
    const data = updateUserSchema.parse(input);
    await prisma.user.update({
      where: { id: data.id },
      data: { active: data.active, specialtyId: data.specialtyId },
    });
    revalidateAdmin();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  try {
    await requireRole(Role.ADMIN);
    const data = resetPasswordSchema.parse(input);
    const passwordHash = await hashPassword(data.password);
    await prisma.user.update({
      where: { id: data.id },
      data: { passwordHash },
    });
    revalidateAdmin();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

// Un mini-parser reutilizat pentru acțiunile care primesc doar un id.
function z_id(input: unknown): { id: string } {
  if (
    typeof input === "object" &&
    input !== null &&
    "id" in input &&
    typeof (input as { id: unknown }).id === "string" &&
    (input as { id: string }).id.length > 0 &&
    (input as { id: string }).id.length <= 64
  ) {
    return { id: (input as { id: string }).id };
  }
  throw new Error("Id invalid.");
}
